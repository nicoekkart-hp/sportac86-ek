# Product pack pricing (bulk discount)

## Goal

Allow admins to configure a bulk deal per product: buy N of this product for a fixed pack price. Example: 1 fles wijn = €12, maar een doos van 6 = €50.

## Out of scope

- Multi-tier discounts (more than one threshold per product)
- Cross-product packs (mixing wine colours in one pack)
- Live cart total preview on the public sale page (page currently has none)
- Coupon codes or time-limited promotions

## Schema

Migration `supabase/migrations/012_products_pack_pricing.sql`:

```sql
alter table products
  add column pack_size integer,
  add column pack_price_cents integer;

alter table products
  add constraint products_pack_pricing_both_or_neither
  check (
    (pack_size is null and pack_price_cents is null)
    or (pack_size > 1 and pack_price_cents > 0)
  );
```

Both columns nullable. Both null → no pack pricing (current behaviour preserved). Both set → pack pricing active. `pack_size > 1` because a "pack of 1" is just the unit price.

Run manually in Supabase SQL Editor per project convention.

## Types (`lib/types.ts`)

Extend `Product`:

```ts
pack_size: number | null;
pack_price_cents: number | null;
```

## Pricing helper (`lib/pricing.ts`, new file)

```ts
export type PriceLine = {
  productId: string;
  productName: string;
  packs: number;
  singles: number;
  totalCents: number;
  // Stripe line-item friendly breakdown
  stripeLines: Array<{ name: string; unitAmount: number; quantity: number }>;
};

export function calcLine(product: Product, qty: number): PriceLine;
```

Behaviour:
- If `pack_size` and `pack_price_cents` set: `packs = floor(qty / pack_size)`, `singles = qty % pack_size`, total = `packs * pack_price_cents + singles * price_cents`. Produces up to 2 Stripe lines per product: `"<name> (doos van N)"` at `pack_price_cents × packs`, plus `"<name>"` at `price_cents × singles` (skip either if its quantity is 0).
- Otherwise: one Stripe line `"<name>"` at `price_cents × qty`.

## Admin UI (`app/admin/producten/_ProductForm.tsx`)

Add a "Volumekorting" block below the existing price field with two optional inputs:

- `pack_size` (number, min 2)
- `pack_price_cents` (euro input, same pattern as existing `price_cents`)

Help text: *"Laat leeg voor geen kortingsprijs. Voorbeeld: 6 flessen voor €50,00."*

Server action in `app/admin/producten/actions.ts` reads both fields. If either is empty, save both as `null`. If both present, save as integers. If only one is filled in, return a validation error.

## Public UI (`app/steunen/[slug]/page.tsx`)

Below each product's unit price, when pack pricing is set, show a small muted line:

> *of €50,00 per 6*

Rendered with existing `formatPrice` helper. No cart-side totals.

## Checkout (`app/api/checkout/bestelling/route.ts`)

Replace the current `Object.entries(items).map(...)` line-items build with a flat-map over `calcLine(product, qty)`:

```ts
const lineItems = Object.entries(items).flatMap(([productId, qty]) => {
  const product = productMap.get(productId)!;
  return calcLine(product, qty).stripeLines.map((l) => ({
    price_data: {
      currency: "eur",
      product_data: { name: l.name },
      unit_amount: l.unitAmount,
    },
    quantity: l.quantity,
  }));
});
```

The `orders.items` JSON stays unchanged — still `{productId: qty}`. The pack math is derived on demand from the product record, so historical orders stay correct even if pack pricing is later changed.

## Admin order views

Order detail/list pages that show a total should use `calcLine` to compute the line totals (same helper used at checkout) so admin and Stripe agree.

## Testing

Manual checks before merging:

1. Product with no pack pricing — single bottle, multiple bottles → total matches `qty × unit`.
2. Product with pack_size 6, pack_price 5000, unit 1200:
   - qty 1 → €12,00
   - qty 5 → €60,00
   - qty 6 → €50,00
   - qty 7 → €62,00
   - qty 12 → €100,00
   - qty 13 → €112,00
3. Admin form rejects `pack_size` filled without `pack_price_cents` (and vice versa).
4. Stripe checkout receipt shows the pack line and singles line separately.
