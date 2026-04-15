# Product Pack Pricing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add per-product bulk pricing (pack_size + pack_price_cents) to the products table so admins can configure deals like "6 bottles for €50" while keeping €12 for singles.

**Architecture:** Two nullable columns on `products`. Shared pricing helper (`lib/pricing.ts`) consumed by Stripe checkout and anywhere totals are shown. Pack math derived from the live product record; order rows stay `{productId: qty}` so history isn't rewritten if prices change.

**Tech Stack:** Next.js 16 App Router, TypeScript strict, Supabase (Postgres + RLS), Stripe Checkout, Tailwind v4. No test runner is configured in this repo — verification is manual (dev server + Supabase SQL + Stripe test checkout).

**Spec:** `docs/superpowers/specs/2026-04-15-product-pack-pricing-design.md`

---

## Task 1: Schema migration

**Files:**
- Create: `supabase/migrations/012_products_pack_pricing.sql`

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/012_products_pack_pricing.sql`:

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

- [ ] **Step 2: Run it manually in Supabase dashboard**

Open Supabase project → SQL Editor → paste the migration → Run.

Verify by running:

```sql
select column_name, data_type, is_nullable
from information_schema.columns
where table_name = 'products' and column_name in ('pack_size', 'pack_price_cents');
```

Expected: two rows, both `integer`, both `YES` for nullable.

Also verify the CHECK rejects bad data — this should error:

```sql
update products set pack_size = 6 where id = (select id from products limit 1);
```

Expected: constraint violation on `products_pack_pricing_both_or_neither`. (Roll back if it didn't error.)

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/012_products_pack_pricing.sql
git -c commit.gpgsign=false commit -m "feat(db): add pack_size and pack_price_cents to products"
```

---

## Task 2: Extend Product type

**Files:**
- Modify: `lib/types.ts:95-104`

- [ ] **Step 1: Add the two fields**

Edit `lib/types.ts`, change the `Product` type to:

```ts
export type Product = {
  id: string;
  sale_id: string;
  sale_name?: string;
  name: string;
  price_cents: number;
  pack_size: number | null;
  pack_price_cents: number | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
};
```

- [ ] **Step 2: Verify typecheck**

Run: `npx tsc --noEmit`
Expected: no errors. (The new fields are optional-by-nullability; existing reads of `Product` won't break because they don't touch these fields yet.)

- [ ] **Step 3: Commit**

```bash
git add lib/types.ts
git -c commit.gpgsign=false commit -m "feat(types): add pack pricing fields to Product"
```

---

## Task 3: Pricing helper

**Files:**
- Create: `lib/pricing.ts`

- [ ] **Step 1: Write the helper**

Create `lib/pricing.ts`:

```ts
import { Product } from "@/lib/types";

export type StripeLine = {
  name: string;
  unitAmount: number;
  quantity: number;
};

export type PriceLine = {
  productId: string;
  productName: string;
  packs: number;
  singles: number;
  totalCents: number;
  stripeLines: StripeLine[];
};

export function calcLine(product: Product, qty: number): PriceLine {
  const hasPack =
    product.pack_size !== null &&
    product.pack_price_cents !== null &&
    product.pack_size > 1 &&
    product.pack_price_cents > 0;

  if (!hasPack) {
    return {
      productId: product.id,
      productName: product.name,
      packs: 0,
      singles: qty,
      totalCents: qty * product.price_cents,
      stripeLines:
        qty > 0
          ? [{ name: product.name, unitAmount: product.price_cents, quantity: qty }]
          : [],
    };
  }

  const packSize = product.pack_size!;
  const packPrice = product.pack_price_cents!;
  const packs = Math.floor(qty / packSize);
  const singles = qty % packSize;
  const totalCents = packs * packPrice + singles * product.price_cents;

  const stripeLines: StripeLine[] = [];
  if (packs > 0) {
    stripeLines.push({
      name: `${product.name} (doos van ${packSize})`,
      unitAmount: packPrice,
      quantity: packs,
    });
  }
  if (singles > 0) {
    stripeLines.push({
      name: product.name,
      unitAmount: product.price_cents,
      quantity: singles,
    });
  }

  return {
    productId: product.id,
    productName: product.name,
    packs,
    singles,
    totalCents,
    stripeLines,
  };
}
```

- [ ] **Step 2: Verify by hand with an ad-hoc script**

Create a throwaway verification file `scratch-pricing.ts` at repo root:

```ts
import { calcLine } from "./lib/pricing";

const wine = {
  id: "x",
  sale_id: "s",
  name: "Rode wijn",
  price_cents: 1200,
  pack_size: 6,
  pack_price_cents: 5000,
  is_active: true,
  sort_order: 0,
  created_at: "",
};

const plain = { ...wine, pack_size: null, pack_price_cents: null };

const cases: Array<[string, number, number]> = [
  ["plain 1", 1, 1200],
  ["plain 5", 5, 6000],
  ["pack 1", 1, 1200],
  ["pack 5", 5, 6000],
  ["pack 6", 6, 5000],
  ["pack 7", 7, 6200],
  ["pack 12", 12, 10000],
  ["pack 13", 13, 11200],
  ["pack 0", 0, 0],
];

for (const [label, qty, expected] of cases) {
  const p = label.startsWith("plain") ? plain : wine;
  const got = calcLine(p, qty).totalCents;
  const ok = got === expected;
  console.log(`${ok ? "OK" : "FAIL"} ${label}: got ${got}, expected ${expected}`);
}
```

Run: `npx tsx scratch-pricing.ts`

Expected: every line prints `OK`. Also sanity-check that `calcLine(wine, 7).stripeLines` has two entries (1× doos + 1× single) — add `console.log(JSON.stringify(calcLine(wine, 7).stripeLines))` if needed.

- [ ] **Step 3: Delete the scratch file**

```bash
rm scratch-pricing.ts
```

- [ ] **Step 4: Commit**

```bash
git add lib/pricing.ts
git -c commit.gpgsign=false commit -m "feat(pricing): add calcLine helper for pack pricing"
```

---

## Task 4: Admin form fields

**Files:**
- Modify: `app/admin/producten/_ProductForm.tsx`

- [ ] **Step 1: Add the two inputs below the existing price row**

In `app/admin/producten/_ProductForm.tsx`, insert the following block after the closing `</div>` of the `grid sm:grid-cols-2 gap-4` block that contains "Verkoop" + "Prijs" (i.e. after line 42, before the "Naam" div on line 44):

```tsx
      <fieldset className="border border-[#e8e4df] rounded-sm p-4">
        <legend className="text-xs font-bold uppercase tracking-wider text-gray-sub px-2">
          Volumekorting (optioneel)
        </legend>
        <p className="text-xs text-gray-sub mb-3">
          Laat beide velden leeg voor geen kortingsprijs. Voorbeeld: 6 flessen voor €50,00.
        </p>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-1">Pakketgrootte</label>
            <input
              type="number"
              name="pack_size"
              min={2}
              defaultValue={product?.pack_size ?? ""}
              placeholder="6"
              className="w-full border border-[#e8e4df] rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-red-sportac"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Pakketprijs (€)</label>
            <input
              type="number"
              name="pack_price_euros"
              min={0}
              step={0.01}
              defaultValue={
                product?.pack_price_cents != null
                  ? (product.pack_price_cents / 100).toFixed(2)
                  : ""
              }
              placeholder="50.00"
              className="w-full border border-[#e8e4df] rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-red-sportac"
            />
          </div>
        </div>
      </fieldset>
```

- [ ] **Step 2: Verify typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/admin/producten/_ProductForm.tsx
git -c commit.gpgsign=false commit -m "feat(admin): add pack pricing fields to product form"
```

---

## Task 5: Admin server actions

**Files:**
- Modify: `app/admin/producten/actions.ts`

- [ ] **Step 1: Add a parser helper and wire both create + update actions**

Replace the full contents of `app/admin/producten/actions.ts` with:

```ts
"use server";

import { createAdminClient } from "@/lib/supabase-admin";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function parsePackPricing(formData: FormData): {
  pack_size: number | null;
  pack_price_cents: number | null;
  error: string | null;
} {
  const rawSize = (formData.get("pack_size") as string | null)?.trim() ?? "";
  const rawPrice = (formData.get("pack_price_euros") as string | null)?.trim() ?? "";

  if (rawSize === "" && rawPrice === "") {
    return { pack_size: null, pack_price_cents: null, error: null };
  }
  if (rawSize === "" || rawPrice === "") {
    return {
      pack_size: null,
      pack_price_cents: null,
      error: "pack_incomplete",
    };
  }

  const size = parseInt(rawSize, 10);
  const priceCents = Math.round(parseFloat(rawPrice) * 100);

  if (!Number.isFinite(size) || size < 2 || !Number.isFinite(priceCents) || priceCents <= 0) {
    return {
      pack_size: null,
      pack_price_cents: null,
      error: "pack_invalid",
    };
  }

  return { pack_size: size, pack_price_cents: priceCents, error: null };
}

export async function createProduct(formData: FormData) {
  const pack = parsePackPricing(formData);
  if (pack.error) redirect(`/admin/producten?error=${pack.error}`);

  const supabase = createAdminClient();
  const { error } = await supabase.from("products").insert({
    sale_id: formData.get("sale_id") as string,
    name: formData.get("name") as string,
    price_cents: Math.round(parseFloat(formData.get("price_euros") as string) * 100),
    pack_size: pack.pack_size,
    pack_price_cents: pack.pack_price_cents,
    is_active: formData.get("is_active") === "on",
    sort_order: parseInt(formData.get("sort_order") as string, 10) || 0,
  });
  if (error) redirect("/admin/producten?error=1");
  revalidatePath("/admin/producten");
  revalidatePath("/steunen");
  redirect("/admin/producten");
}

export async function updateProduct(id: string, formData: FormData) {
  const pack = parsePackPricing(formData);
  if (pack.error) redirect(`/admin/producten?error=${pack.error}`);

  const supabase = createAdminClient();
  const { error } = await supabase.from("products").update({
    sale_id: formData.get("sale_id") as string,
    name: formData.get("name") as string,
    price_cents: Math.round(parseFloat(formData.get("price_euros") as string) * 100),
    pack_size: pack.pack_size,
    pack_price_cents: pack.pack_price_cents,
    is_active: formData.get("is_active") === "on",
    sort_order: parseInt(formData.get("sort_order") as string, 10) || 0,
  }).eq("id", id);
  if (error) redirect("/admin/producten?error=1");
  revalidatePath("/admin/producten");
  revalidatePath("/steunen");
  redirect("/admin/producten");
}

export async function deleteProduct(id: string) {
  const supabase = createAdminClient();
  await supabase.from("products").delete().eq("id", id);
  revalidatePath("/admin/producten");
  revalidatePath("/steunen");
  redirect("/admin/producten");
}

export async function toggleProductActive(id: string, currentValue: boolean) {
  const supabase = createAdminClient();
  await supabase.from("products").update({ is_active: !currentValue }).eq("id", id);
  revalidatePath("/admin/producten");
  revalidatePath("/steunen");
}
```

- [ ] **Step 2: Verify typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Manual smoke test in dev**

Run: `npm run dev`, log into `/admin`, go to `/admin/producten`, edit a wine product:
1. Fill pack_size = 6, pack_price = 50.00 → Save. Reopen the product. Fields should still show 6 and 50,00.
2. Clear both fields → Save. Reopen. Both fields empty.
3. Fill only pack_size → Save. Should redirect back with `?error=pack_incomplete` in the URL.

Stop the dev server once confirmed.

- [ ] **Step 4: Commit**

```bash
git add app/admin/producten/actions.ts
git -c commit.gpgsign=false commit -m "feat(admin): persist pack pricing on product create/update"
```

---

## Task 6: Public sale page — show pack price hint

**Files:**
- Modify: `app/steunen/[slug]/page.tsx:102-120`

- [ ] **Step 1: Import `formatPrice` and render the pack hint**

At the top of `app/steunen/[slug]/page.tsx`, add the import:

```tsx
import { formatPrice } from "@/lib/format";
```

Replace the product mapping block (the `products.map((p: Product) => ( ... ))` JSX, currently lines 102-120) with:

```tsx
            {products.map((p: Product) => (
              <div key={p.id} className="flex items-center justify-between">
                <label htmlFor={p.id} className="text-sm font-semibold">{p.name}</label>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-sm text-gray-sub">
                      {formatPrice(p.price_cents)}
                    </div>
                    {p.pack_size != null && p.pack_price_cents != null && (
                      <div className="text-xs text-gray-sub italic">
                        of {formatPrice(p.pack_price_cents)} per {p.pack_size}
                      </div>
                    )}
                  </div>
                  <input
                    id={p.id}
                    type="number"
                    name={`items.${p.id}`}
                    min={0}
                    max={99}
                    defaultValue={0}
                    className="w-16 border border-[#e8e4df] rounded-sm px-2 py-1 text-sm text-center focus:outline-none focus:border-red-sportac"
                  />
                </div>
              </div>
            ))}
```

- [ ] **Step 2: Verify typecheck and view**

Run: `npx tsc --noEmit` → expect no errors.

Run: `npm run dev`, visit `/steunen/<wine-sale-slug>` (use whatever slug the wine sale has in `sales`). Confirm the wine rows show both the unit price and the muted "of €50,00 per 6" line. Products without pack pricing show only the unit price.

Stop the dev server.

- [ ] **Step 3: Commit**

```bash
git add app/steunen/[slug]/page.tsx
git -c commit.gpgsign=false commit -m "feat(steunen): show pack price hint on sale page"
```

---

## Task 7: Checkout uses calcLine

**Files:**
- Modify: `app/api/checkout/bestelling/route.ts:58-69`

- [ ] **Step 1: Replace the line-items build with calcLine**

Add the import at the top of `app/api/checkout/bestelling/route.ts`:

```ts
import { calcLine } from "@/lib/pricing";
```

Replace the `lineItems` block (currently lines 58-69, the `Object.entries(items).map(...)` call) with:

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

- [ ] **Step 2: Verify typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: End-to-end smoke test via Stripe test mode**

Run: `npm run dev`. On `/steunen/<wine-slug>`, order 7 bottles of a wine product that has `pack_size=6, pack_price=5000, price=1200`. Submit with a test email.

On the Stripe Checkout page (test mode), verify the line items read:
- `Rode wijn — fles 75cl (doos van 6)` × 1 @ €50,00
- `Rode wijn — fles 75cl` × 1 @ €12,00
- Total: €62,00

Repeat with qty=12 → expect only the doos line, ×2, €100,00. Repeat with qty=3 → expect only the singles line, ×3, €36,00.

Stop the dev server.

- [ ] **Step 4: Commit**

```bash
git add app/api/checkout/bestelling/route.ts
git -c commit.gpgsign=false commit -m "feat(checkout): apply pack pricing via calcLine"
```

---

## Task 8: Admin product list shows pack hint

**Files:**
- Modify: `app/admin/producten/page.tsx:37`

- [ ] **Step 1: Append the pack hint to the price line**

Replace the `<p>` on line 37 (currently `<p className="text-xs text-gray-sub mt-0.5">{formatPrice(p.price_cents)}</p>`) with:

```tsx
              <p className="text-xs text-gray-sub mt-0.5">
                {formatPrice(p.price_cents)}
                {p.pack_size != null && p.pack_price_cents != null && (
                  <span className="ml-2 text-gray-sub/80">
                    · {formatPrice(p.pack_price_cents)} per {p.pack_size}
                  </span>
                )}
              </p>
```

- [ ] **Step 2: Verify typecheck and view**

Run: `npx tsc --noEmit` → no errors.

Run: `npm run dev`, go to `/admin/producten`. The configured wine product row should show `€12,00 · €50,00 per 6`. Products without pack pricing show only the unit price.

Stop the dev server.

- [ ] **Step 3: Commit**

```bash
git add app/admin/producten/page.tsx
git -c commit.gpgsign=false commit -m "feat(admin): show pack pricing on product list"
```

---

## Task 9: Configure the real wine deal

**Files:**
- No code changes; data-entry step in the admin UI.

- [ ] **Step 1: Set the live values**

Run: `npm run dev`, log into `/admin/producten`. For each wine product the customer can buy in bulk, edit and set:
- Pakketgrootte: `6`
- Pakketprijs (€): `50.00`

Save. Confirm on `/steunen/<wine-slug>` that the "of €50,00 per 6" hint renders under each wine row.

- [ ] **Step 2: No commit — this is live data**

Close the dev server. No git changes.

---

## Final build check

- [ ] **Step 1: Build**

Run: `npm run build`
Expected: clean build, no type errors, no new warnings.

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: no new errors.
