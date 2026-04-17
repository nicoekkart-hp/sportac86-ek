# Pack groups, product images & info modal

## Goal

Replace the per-product pack pricing added earlier with **pack groups**: one deal (unit price + pack size + pack price) that applies across a set of products, so customers can mix 6 bottles from the same group (e.g. 2 wit + 2 rood + 2 rosé within "Instapwijnen") to unlock the pack price.

Also add per-product image + rich markdown description, surfaced via a small "info" modal on the public sale page.

## Motivation (data snapshot from the fundraiser)

Four wine groups, unit prices fully configurable by admin:

| Group | Products | Unit | Pack |
|---|---|---|---|
| Instapwijnen | 2 wit, 2 rood | ~€10 | 6 = ~€50 |
| Duurdere reeks | 1 wit, 1 rosé, 1 rood | ~€14-18 | 6 = ~€70-90 |
| Bubbels | 1 prosecco | ~€18 | 6 = ~€90 |
| Picon Vin Blanc | 1 picon | ~€19,50 | 6 = ~€97,50 |

Customers can mix within a group; they cannot combine different groups for a pack.

## Out of scope

- Multi-tier thresholds per group (only one pack size per group)
- Different unit prices within a single group
- Cross-sale groups
- Structured product metadata (grape, region, food-pairing as separate fields) — free-form markdown covers it
- Cost-price / margin fields
- Admin cart preview of pack totals

## Revert of prior work

The previous `012_products_pack_pricing.sql` / `020_products_pack_pricing.sql` migration added `pack_size` and `pack_price_cents` to `products`. No production data was entered using those columns. They're being replaced, not extended.

## Schema changes

New migration `supabase/migrations/021_pack_groups_and_product_details.sql`:

```sql
-- 1. Drop the per-product pack pricing we just added
alter table products
  drop constraint if exists products_pack_pricing_both_or_neither;

alter table products
  drop column if exists pack_size,
  drop column if exists pack_price_cents;

-- 2. New pack_groups table
create table pack_groups (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references sales(id) on delete cascade,
  name text not null,
  unit_price_cents integer not null check (unit_price_cents > 0),
  pack_size integer not null check (pack_size > 1),
  pack_price_cents integer not null check (pack_price_cents > 0),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table pack_groups enable row level security;

create policy "Public read pack groups" on pack_groups
  for select using (true);

create policy "Admin all pack groups" on pack_groups
  for all using (auth.role() = 'authenticated');

-- 3. Link products to an optional group
alter table products
  add column pack_group_id uuid references pack_groups(id) on delete set null;

-- 4. Product info modal fields
alter table products
  add column image_url text,
  add column description text;
```

Field semantics:

- `pack_group_id = null` → product behaves exactly as before: `price_cents × qty`, no pack discount.
- `pack_group_id` set → the group's `unit_price_cents` overrides the product's `price_cents` at checkout. The product's own `price_cents` is kept as a default/fallback (the admin form will pre-fill it from the group but products in a group won't use it for display or checkout).
- Packs are computed against the **sum of quantities** of all products sharing the group_id in a given order.

Run manually in Supabase SQL Editor per project convention.

## Types (`lib/types.ts`)

Remove the previously added fields:

```ts
// remove:
// pack_size: number | null;
// pack_price_cents: number | null;
```

Add to `Product`:

```ts
pack_group_id: string | null;
image_url: string | null;
description: string | null;
```

Add a new `PackGroup` type:

```ts
export type PackGroup = {
  id: string;
  sale_id: string;
  name: string;
  unit_price_cents: number;
  pack_size: number;
  pack_price_cents: number;
  sort_order: number;
  created_at: string;
};
```

## Pricing helper rewrite (`lib/pricing.ts`)

Replace the per-product `calcLine` with a cart-level function:

```ts
export type StripeLine = {
  name: string;
  unitAmount: number;
  quantity: number;
};

export function calcCart(
  products: Product[],
  groups: PackGroup[],
  items: Record<string, number>, // productId -> qty
): { stripeLines: StripeLine[]; totalCents: number };
```

Algorithm:

1. Partition `items` into grouped and ungrouped by each product's `pack_group_id`.
2. For each group that has at least one item:
   - `sumQty = sum of items[productId] for all products in this group`
   - `packs = floor(sumQty / group.pack_size)`
   - `singles = sumQty % group.pack_size`
   - Emit (if packs > 0): `{ name: "${group.name} (doos van ${group.pack_size})", unitAmount: group.pack_price_cents, quantity: packs }`
   - Emit (if singles > 0): `{ name: group.name, unitAmount: group.unit_price_cents, quantity: singles }`
3. For each ungrouped product with qty > 0: `{ name: product.name, unitAmount: product.price_cents, quantity: qty }`
4. Sum all line totals into `totalCents`.

Note: the Stripe line for a pack does not name individual products (since a pack can mix colours). The admin also gets a separate textual breakdown stored on the order (see Orders section).

## Orders / checkout (`app/api/checkout/bestelling/route.ts`)

- Fetch the products for the sale (already done) **and** the pack groups for the sale in the same handler.
- Pass both plus `items` into `calcCart`.
- Build Stripe line items from the result.
- `orders.items` JSON still stores `{productId: qty}` — unchanged. Pack math stays derived.

Existing historical orders remain correct: without any group link they fall back to per-product `price_cents` pricing, identical to today.

## Admin UI

### New route: `/admin/pack-groepen`

Standard list / new / edit pattern (mirrors `/admin/producten`):

- `app/admin/pack-groepen/page.tsx` — list of groups across all sales, grouped by sale name
- `app/admin/pack-groepen/nieuw/page.tsx` — create form
- `app/admin/pack-groepen/[id]/page.tsx` — edit form
- `app/admin/pack-groepen/_PackGroupForm.tsx` — shared form
- `app/admin/pack-groepen/actions.ts` — `createPackGroup`, `updatePackGroup`, `deletePackGroup`

Form fields: Verkoop (required, select), Naam, Prijs per fles (€), Pakketgrootte (int ≥2), Pakketprijs (€), Volgorde.

Delete behaviour: `on delete set null` on `products.pack_group_id` means deleting a group un-links its products (they keep their individual `price_cents` and become ungrouped). Deletion is allowed; the admin list confirms with a JS `confirm()` as elsewhere.

### Sidebar (`components/admin/AdminSidebar.tsx`)

Add a new item under "Producten":

```ts
{ href: "/admin/pack-groepen", label: "Pack groepen", icon: "📦" },
```

### Product form (`app/admin/producten/_ProductForm.tsx`)

- Remove the "Volumekorting" fieldset added previously.
- Add a new **"Pack groep (optioneel)"** dropdown. Options are populated from the pack groups belonging to the currently selected sale. Since the sale dropdown is rendered server-side and the groups depend on it, the admin UX is: reload the page after changing sale if you want different group options. (A progressive-enhancement client component can come later.)
  - For the edit page, fetch pack groups for the product's `sale_id` server-side.
  - For the new-product page, the sale is unknown at render time; show an empty/disabled dropdown with helper text "Kies eerst een verkoop en kom terug om de pack groep in te stellen." Users can set the group after initial create via the edit page. This keeps implementation simple.
- Add **Foto** upload (copy the pattern from `app/admin/team/_TeamForm.tsx` — `image_file` + `image_url` fallback).
- Add **Beschrijving (Markdown)** textarea, 6-8 rows.

### Product actions (`app/admin/producten/actions.ts`)

- Remove the `parsePackPricing` helper.
- Add image upload resolution (copy `resolveImageUrl` from `app/admin/team/actions.ts`; new Supabase Storage bucket `product-photos`).
- `createProduct` and `updateProduct` persist `pack_group_id`, `image_url`, `description`.

### Product list (`app/admin/producten/page.tsx`)

- Replace the previously added "€X · €Y per N" hint with a "📦 {group.name}" tag when the product is in a group.
- Add a small thumbnail on the left of each row.

## Public UI (`app/steunen/[slug]/page.tsx`)

- Fetch products **and** pack groups for the sale in parallel.
- Render products grouped:
  - For each pack group (ordered by `sort_order` then name): a section header `{group.name} — €10,00 per fles · doos van 6: €50,00`, followed by the products in that group.
  - Ungrouped products render in their own untitled section at the end (or top; choose ungrouped-last so wine groups appear first).
- Each product row shows thumbnail (if `image_url`), name, "Meer info" button (only when `description` is set), and quantity input. No per-product unit price shown for grouped products (redundant — header carries it); ungrouped products keep their price.
- **Info modal**: a new client component `components/ProductInfoModal.tsx`. When the user clicks "Meer info", it opens a centered dialog using the native `<dialog>` element with the product's image, name, price hint, and markdown description.

### Info modal

- `components/ProductInfoModal.tsx` — client component. Props: `{ product: Product; group?: PackGroup | null }`. Renders a trigger button + a `<dialog>`. Close on backdrop click, close button, or Esc.
- Uses `react-markdown` (new dep) to render `description`. No custom components, just defaults + Tailwind `prose` / hand-styled.
- Price line in the modal:
  - If in a group: "€{group.unit_price_cents} per fles · doos van {pack_size}: €{group.pack_price_cents}"
  - If ungrouped: "€{product.price_cents}"

## Dependencies

Add to `package.json`:

- `react-markdown` (latest; ~30kb gzipped, tree-shakeable)

No plugins (no GFM tables etc needed for these descriptions).

## Storage

New Supabase Storage bucket: `product-photos` (public, same config as `team-photos`). This must exist before admins can upload. The migration cannot create storage buckets from SQL; admin needs to create it once in the Supabase dashboard → Storage → New bucket → "product-photos" → Public = yes.

## Testing (manual)

1. **Migration**: apply `021_...`, verify the old pack columns are gone and the three new columns on `products` plus the `pack_groups` table exist. Verify `pack_group_id` FK with `on delete set null` works.
2. **Pack groups admin**: create "Instapwijnen" (unit €10, pack 6, €50) and "Duurdere reeks" (unit €14, pack 6, €70). Edit, delete, re-create.
3. **Product form**: edit a wine product → assign to Instapwijnen → save → reopen → group still selected.
4. **Upload**: upload a product image, verify thumbnail on admin list and public page.
5. **Markdown description**: paste a few bullet-points, save, view the modal — bullets render.
6. **Checkout math** (Stripe test mode):
   - 3 Instapwijnen (wit) + 3 Instapwijnen (rood) = 1 doos × €50, no singles, total €50.
   - 4 Instap + 3 Duurdere = 0 packs each group, 4×€10 + 3×€14 = €82 (4 + 3 singles).
   - 7 Instap = 1 doos × €50 + 1 single × €10 = €60.
   - 6 Instap (wit) + 6 Duurdere (rood) = 1 doos Instap × €50 + 1 doos Duurdere × €70 = €120.
   - Ungrouped candy product behaves like before.
7. **Delete a group** while products reference it → products become ungrouped; their `price_cents` is used again.

## Migration / rollout order

1. Create Supabase Storage bucket `product-photos` in dashboard.
2. Apply the SQL migration in dashboard.
3. Deploy code.
4. In `/admin/pack-groepen`, create the four groups from the email.
5. In `/admin/producten`, create / edit wine products, assign images, descriptions, and groups.
