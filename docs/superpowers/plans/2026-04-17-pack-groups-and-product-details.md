# Pack Groups & Product Info Modal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace per-product pack pricing with shared `pack_groups` (one deal applies to a set of products that customers can mix to unlock) and add per-product image + markdown description shown via a "Meer info" modal.

**Architecture:** New `pack_groups` table per sale. `products` gains a nullable `pack_group_id` plus `image_url` and `description`. A new `calcCart` helper in `lib/pricing.ts` sums quantities per group and emits Stripe lines (one for packs, one for singles) + ungrouped product lines. Checkout, admin CRUD for groups, and a public info modal all use these primitives.

**Tech Stack:** Next.js 16 App Router, TypeScript strict, Supabase (Postgres + RLS + Storage), Stripe, Tailwind v4, `react-markdown` (new dep). No test runner in repo — verification is manual (throwaway tsx scripts + dev server + Stripe test checkout).

**Spec:** `docs/superpowers/specs/2026-04-17-pack-groups-and-product-details-design.md`

**Prior state (being replaced):** commits `4f6ebb1` through `11f5c33` added per-product `pack_size`/`pack_price_cents` columns, a `calcLine` helper, admin form fields, and a pack hint on the public page. This plan undoes those column additions and rewrites the helper.

---

## Task 1: Schema migration

**Files:**
- Create: `supabase/migrations/021_pack_groups_and_product_details.sql`

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/021_pack_groups_and_product_details.sql`:

```sql
-- 1. Drop the per-product pack pricing added in 020
alter table products
  drop constraint if exists products_pack_pricing_both_or_neither;

alter table products
  drop column if exists pack_size,
  drop column if exists pack_price_cents;

-- 2. Pack groups
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

-- 4. Info modal fields
alter table products
  add column image_url text,
  add column description text;
```

- [ ] **Step 2: Commit (migration is applied by human in Supabase dashboard)**

```bash
git add supabase/migrations/021_pack_groups_and_product_details.sql
git -c commit.gpgsign=false commit -m "feat(db): replace per-product pack pricing with pack_groups + add product image/description"
```

---

## Task 2: Types

**Files:**
- Modify: `lib/types.ts`

- [ ] **Step 1: Update `Product` and add `PackGroup`**

Open `lib/types.ts`. Replace the existing `Product` type with:

```ts
export type Product = {
  id: string;
  sale_id: string;
  sale_name?: string;
  name: string;
  price_cents: number;
  pack_group_id: string | null;
  image_url: string | null;
  description: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
};
```

(Removes `pack_size` and `pack_price_cents`; adds `pack_group_id`, `image_url`, `description`.)

Add a new exported type anywhere sensible in the file (next to `Product`):

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

- [ ] **Step 2: Verify typecheck (expected to fail — consumers of removed fields)**

Run: `npx tsc --noEmit`

Expected errors referencing the old pack fields in:
- `lib/pricing.ts` (reads `pack_size`, `pack_price_cents`)
- `app/admin/producten/_ProductForm.tsx` (reads `product?.pack_size`, `product?.pack_price_cents`)
- `app/admin/producten/page.tsx` (reads `p.pack_size`, `p.pack_price_cents`)
- `app/steunen/[slug]/page.tsx` (reads `p.pack_size`, `p.pack_price_cents`)

These will be fixed by later tasks. Do not commit yet — a broken build shouldn't land. Move straight to Task 3.

- [ ] **Step 3: Do NOT commit; continue to Task 3**

---

## Task 3: Rewrite `lib/pricing.ts` as `calcCart`

**Files:**
- Modify: `lib/pricing.ts`

- [ ] **Step 1: Replace contents of `lib/pricing.ts`**

Replace the entire file with:

```ts
import { Product, PackGroup } from "@/lib/types";

export type StripeLine = {
  name: string;
  unitAmount: number;
  quantity: number;
};

export type CartResult = {
  stripeLines: StripeLine[];
  totalCents: number;
};

export function calcCart(
  products: Product[],
  groups: PackGroup[],
  items: Record<string, number>,
): CartResult {
  const productById = new Map(products.map((p) => [p.id, p]));
  const groupById = new Map(groups.map((g) => [g.id, g]));

  // Sum quantities per group; track ungrouped separately.
  const qtyByGroup = new Map<string, number>();
  const ungrouped: Array<{ product: Product; qty: number }> = [];

  for (const [productId, qty] of Object.entries(items)) {
    if (!qty || qty <= 0) continue;
    const product = productById.get(productId);
    if (!product) continue;

    if (product.pack_group_id && groupById.has(product.pack_group_id)) {
      qtyByGroup.set(
        product.pack_group_id,
        (qtyByGroup.get(product.pack_group_id) ?? 0) + qty,
      );
    } else {
      ungrouped.push({ product, qty });
    }
  }

  const stripeLines: StripeLine[] = [];
  let totalCents = 0;

  // Emit group lines in the group's sort_order, then by name for determinism.
  const orderedGroupIds = Array.from(qtyByGroup.keys()).sort((a, b) => {
    const ga = groupById.get(a)!;
    const gb = groupById.get(b)!;
    if (ga.sort_order !== gb.sort_order) return ga.sort_order - gb.sort_order;
    return ga.name.localeCompare(gb.name);
  });

  for (const groupId of orderedGroupIds) {
    const group = groupById.get(groupId)!;
    const totalQty = qtyByGroup.get(groupId)!;
    const packs = Math.floor(totalQty / group.pack_size);
    const singles = totalQty % group.pack_size;

    if (packs > 0) {
      stripeLines.push({
        name: `${group.name} (doos van ${group.pack_size})`,
        unitAmount: group.pack_price_cents,
        quantity: packs,
      });
      totalCents += packs * group.pack_price_cents;
    }
    if (singles > 0) {
      stripeLines.push({
        name: group.name,
        unitAmount: group.unit_price_cents,
        quantity: singles,
      });
      totalCents += singles * group.unit_price_cents;
    }
  }

  // Ungrouped products keep their own per-product price.
  for (const { product, qty } of ungrouped) {
    stripeLines.push({
      name: product.name,
      unitAmount: product.price_cents,
      quantity: qty,
    });
    totalCents += qty * product.price_cents;
  }

  return { stripeLines, totalCents };
}
```

- [ ] **Step 2: Verify with a throwaway script**

Create `scratch-pricing.ts` at repo root:

```ts
import { calcCart } from "./lib/pricing";
import type { Product, PackGroup } from "./lib/types";

const SALE = "sale1";

const instap: PackGroup = {
  id: "g-instap",
  sale_id: SALE,
  name: "Instapwijnen",
  unit_price_cents: 1000,
  pack_size: 6,
  pack_price_cents: 5000,
  sort_order: 0,
  created_at: "",
};

const duur: PackGroup = {
  id: "g-duur",
  sale_id: SALE,
  name: "Duurdere reeks",
  unit_price_cents: 1400,
  pack_size: 6,
  pack_price_cents: 7000,
  sort_order: 1,
  created_at: "",
};

const base = {
  sale_id: SALE,
  price_cents: 0,
  image_url: null,
  description: null,
  is_active: true,
  sort_order: 0,
  created_at: "",
};

const instapWit: Product = { id: "p-iw", name: "Instap wit", pack_group_id: instap.id, ...base, price_cents: 1000 };
const instapRood: Product = { id: "p-ir", name: "Instap rood", pack_group_id: instap.id, ...base, price_cents: 1000 };
const duurRood: Product = { id: "p-dr", name: "Duurder rood", pack_group_id: duur.id, ...base, price_cents: 1400 };
const candy: Product = { id: "p-c", name: "Mars doos", pack_group_id: null, ...base, price_cents: 1800 };

const products = [instapWit, instapRood, duurRood, candy];
const groups = [instap, duur];

type Case = [label: string, items: Record<string, number>, expected: number];

const cases: Case[] = [
  ["3 wit + 3 rood (1 pack)", { "p-iw": 3, "p-ir": 3 }, 5000],
  ["4 instap + 3 duur (singles)", { "p-iw": 4, "p-dr": 3 }, 4000 + 4200],
  ["7 instap (1 pack + 1 single)", { "p-iw": 7 }, 5000 + 1000],
  ["6 instap + 6 duur (2 packs)", { "p-iw": 6, "p-dr": 6 }, 5000 + 7000],
  ["mix + candy", { "p-iw": 6, "p-c": 2 }, 5000 + 3600],
  ["empty", {}, 0],
  ["only candy", { "p-c": 2 }, 3600],
];

for (const [label, items, expected] of cases) {
  const { totalCents, stripeLines } = calcCart(products, groups, items);
  const ok = totalCents === expected;
  console.log(`${ok ? "OK" : "FAIL"} ${label}: got ${totalCents} expected ${expected}`);
  console.log("  lines:", JSON.stringify(stripeLines));
}
```

Run: `npx tsx scratch-pricing.ts`

Expected: all 7 rows print `OK`. The "6 instap + 6 duur" case should produce two separate pack lines (one Instapwijnen, one Duurdere reeks). The "7 instap" case should produce one pack line (qty=1) + one singles line (qty=1).

Include the raw output in your report.

- [ ] **Step 3: Delete the scratch file**

```bash
rm scratch-pricing.ts
```

- [ ] **Step 4: Verify typecheck (still expected to fail on unrelated files)**

Run: `npx tsc --noEmit`

Expected: errors only in `_ProductForm.tsx`, `app/admin/producten/page.tsx`, `app/steunen/[slug]/page.tsx`, and `app/api/checkout/bestelling/route.ts`. No errors inside `lib/pricing.ts` itself.

- [ ] **Step 5: Do NOT commit; continue to Task 4**

---

## Task 4: Pack groups — admin actions

**Files:**
- Create: `app/admin/pack-groepen/actions.ts`

- [ ] **Step 1: Write the actions**

Create `app/admin/pack-groepen/actions.ts`:

```ts
"use server";

import { createAdminClient } from "@/lib/supabase-admin";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function parseEuros(raw: FormDataEntryValue | null): number {
  const str = typeof raw === "string" ? raw.trim() : "";
  const n = parseFloat(str);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.round(n * 100);
}

function parsePackSize(raw: FormDataEntryValue | null): number {
  const str = typeof raw === "string" ? raw.trim() : "";
  const n = parseInt(str, 10);
  if (!Number.isFinite(n) || n < 2) return 0;
  return n;
}

export async function createPackGroup(formData: FormData) {
  const sale_id = (formData.get("sale_id") as string)?.trim();
  const name = (formData.get("name") as string)?.trim();
  const unit_price_cents = parseEuros(formData.get("unit_price_euros"));
  const pack_size = parsePackSize(formData.get("pack_size"));
  const pack_price_cents = parseEuros(formData.get("pack_price_euros"));
  const sort_order = parseInt(formData.get("sort_order") as string, 10) || 0;

  if (!sale_id || !name || !unit_price_cents || !pack_size || !pack_price_cents) {
    redirect("/admin/pack-groepen?error=invalid");
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from("pack_groups").insert({
    sale_id,
    name,
    unit_price_cents,
    pack_size,
    pack_price_cents,
    sort_order,
  });
  if (error) redirect("/admin/pack-groepen?error=1");
  revalidatePath("/admin/pack-groepen");
  revalidatePath("/admin/producten");
  revalidatePath("/steunen");
  redirect("/admin/pack-groepen");
}

export async function updatePackGroup(id: string, formData: FormData) {
  const sale_id = (formData.get("sale_id") as string)?.trim();
  const name = (formData.get("name") as string)?.trim();
  const unit_price_cents = parseEuros(formData.get("unit_price_euros"));
  const pack_size = parsePackSize(formData.get("pack_size"));
  const pack_price_cents = parseEuros(formData.get("pack_price_euros"));
  const sort_order = parseInt(formData.get("sort_order") as string, 10) || 0;

  if (!sale_id || !name || !unit_price_cents || !pack_size || !pack_price_cents) {
    redirect(`/admin/pack-groepen/${id}?error=invalid`);
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from("pack_groups").update({
    sale_id,
    name,
    unit_price_cents,
    pack_size,
    pack_price_cents,
    sort_order,
  }).eq("id", id);
  if (error) redirect("/admin/pack-groepen?error=1");
  revalidatePath("/admin/pack-groepen");
  revalidatePath("/admin/producten");
  revalidatePath("/steunen");
  redirect("/admin/pack-groepen");
}

export async function deletePackGroup(id: string) {
  const supabase = createAdminClient();
  await supabase.from("pack_groups").delete().eq("id", id);
  revalidatePath("/admin/pack-groepen");
  revalidatePath("/admin/producten");
  revalidatePath("/steunen");
  redirect("/admin/pack-groepen");
}
```

- [ ] **Step 2: Do NOT commit yet; continue to Task 5**

---

## Task 5: Pack groups — shared form

**Files:**
- Create: `app/admin/pack-groepen/_PackGroupForm.tsx`

- [ ] **Step 1: Write the form**

Create `app/admin/pack-groepen/_PackGroupForm.tsx`:

```tsx
import { PackGroup, Sale } from "@/lib/types";

export function PackGroupForm({
  group,
  sales,
  action,
}: {
  group?: PackGroup;
  sales: Sale[];
  action: (formData: FormData) => Promise<void>;
}) {
  return (
    <form action={action} className="flex flex-col gap-5 max-w-xl">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold mb-1">Verkoop *</label>
          <select
            name="sale_id"
            required
            defaultValue={group?.sale_id ?? ""}
            className="w-full border border-[#e8e4df] rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-red-sportac bg-white"
          >
            <option value="" disabled>Kies een verkoop...</option>
            {sales.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1">Naam *</label>
          <input
            type="text"
            name="name"
            required
            defaultValue={group?.name ?? ""}
            placeholder="Instapwijnen"
            className="w-full border border-[#e8e4df] rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-red-sportac"
          />
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-semibold mb-1">Prijs per fles (€) *</label>
          <input
            type="number"
            name="unit_price_euros"
            required
            min={0.01}
            step={0.01}
            defaultValue={group ? (group.unit_price_cents / 100).toFixed(2) : ""}
            placeholder="10.00"
            className="w-full border border-[#e8e4df] rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-red-sportac"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1">Pakketgrootte *</label>
          <input
            type="number"
            name="pack_size"
            required
            min={2}
            defaultValue={group?.pack_size ?? 6}
            className="w-full border border-[#e8e4df] rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-red-sportac"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1">Pakketprijs (€) *</label>
          <input
            type="number"
            name="pack_price_euros"
            required
            min={0.01}
            step={0.01}
            defaultValue={group ? (group.pack_price_cents / 100).toFixed(2) : ""}
            placeholder="50.00"
            className="w-full border border-[#e8e4df] rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-red-sportac"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold mb-1">Volgorde</label>
        <input
          type="number"
          name="sort_order"
          min={0}
          defaultValue={group?.sort_order ?? 0}
          className="w-full border border-[#e8e4df] rounded-sm px-3 py-2 text-sm w-32 focus:outline-none focus:border-red-sportac"
        />
      </div>

      <div className="flex gap-3 pt-2">
        <button type="submit" className="bg-red-sportac text-white font-bold text-sm px-6 py-2.5 rounded-sm hover:bg-red-600 transition-colors">
          Opslaan
        </button>
        <a href="/admin/pack-groepen" className="text-sm text-gray-sub px-4 py-2.5 hover:text-gray-dark transition-colors">
          Annuleren
        </a>
      </div>
    </form>
  );
}
```

- [ ] **Step 2: Do NOT commit; continue to Task 6**

---

## Task 6: Pack groups — list, new, edit pages

**Files:**
- Create: `app/admin/pack-groepen/page.tsx`
- Create: `app/admin/pack-groepen/nieuw/page.tsx`
- Create: `app/admin/pack-groepen/[id]/page.tsx`

- [ ] **Step 1: List page**

Create `app/admin/pack-groepen/page.tsx`:

```tsx
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase-admin";
import { PackGroup } from "@/lib/types";
import { deletePackGroup } from "./actions";
import { formatPrice } from "@/lib/format";

export default async function PackGroepenPage() {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("pack_groups")
    .select("*, sales(name)")
    .order("sort_order");
  const groups: (PackGroup & { sales: { name: string } | null })[] = data ?? [];

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-condensed font-black italic text-4xl text-gray-dark">Pack groepen</h1>
          <p className="text-gray-sub text-sm mt-1">{groups.length} groepen</p>
        </div>
        <Link href="/admin/pack-groepen/nieuw" className="bg-red-sportac text-white font-bold text-sm px-5 py-2.5 rounded-sm hover:bg-red-600 transition-colors">
          + Pack groep toevoegen
        </Link>
      </div>

      <div className="flex flex-col gap-3">
        {groups.length === 0 && <p className="text-gray-sub text-sm">Nog geen pack groepen.</p>}
        {groups.map((g) => (
          <div key={g.id} className="bg-white border border-[#e8e4df] rounded-sm p-4 flex items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm">{g.name}</span>
                {g.sales && <span className="text-[10px] font-bold bg-gray-100 text-gray-sub px-1.5 py-0.5 rounded-sm">{g.sales.name}</span>}
              </div>
              <p className="text-xs text-gray-sub mt-0.5">
                {formatPrice(g.unit_price_cents)} per fles · doos van {g.pack_size}: {formatPrice(g.pack_price_cents)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link href={`/admin/pack-groepen/${g.id}`} className="text-xs font-semibold text-gray-dark border border-[#e8e4df] px-3 py-1.5 rounded-sm hover:border-gray-400 transition-colors">
                Bewerken
              </Link>
              <form action={deletePackGroup.bind(null, g.id)}>
                <button type="submit" className="text-xs text-red-sportac border border-red-sportac/30 px-3 py-1.5 rounded-sm hover:bg-red-sportac/10 transition-colors">
                  Verwijderen
                </button>
              </form>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: New page**

Create `app/admin/pack-groepen/nieuw/page.tsx`:

```tsx
import { createAdminClient } from "@/lib/supabase-admin";
import { Sale } from "@/lib/types";
import { PackGroupForm } from "../_PackGroupForm";
import { createPackGroup } from "../actions";

export default async function NieuwPackGroepPage() {
  const supabase = createAdminClient();
  const { data } = await supabase.from("sales").select("*").order("sort_order");
  const sales: Sale[] = data ?? [];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="font-condensed font-black italic text-4xl text-gray-dark">Pack groep toevoegen</h1>
      </div>
      <PackGroupForm sales={sales} action={createPackGroup} />
    </div>
  );
}
```

- [ ] **Step 3: Edit page**

Create `app/admin/pack-groepen/[id]/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase-admin";
import { PackGroup, Sale } from "@/lib/types";
import { PackGroupForm } from "../_PackGroupForm";
import { updatePackGroup } from "../actions";

export default async function BewerkenPackGroepPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createAdminClient();
  const [{ data: groupData }, { data: salesData }] = await Promise.all([
    supabase.from("pack_groups").select("*").eq("id", id).single(),
    supabase.from("sales").select("*").order("sort_order"),
  ]);
  if (!groupData) notFound();
  const group = groupData as PackGroup;
  const sales: Sale[] = salesData ?? [];
  const action = updatePackGroup.bind(null, id);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="font-condensed font-black italic text-4xl text-gray-dark">Pack groep bewerken</h1>
        <p className="text-gray-sub text-sm mt-1">{group.name}</p>
      </div>
      <PackGroupForm group={group} sales={sales} action={action} />
    </div>
  );
}
```

- [ ] **Step 4: Verify typecheck**

Run: `npx tsc --noEmit`

Expected errors remain only in `app/admin/producten/_ProductForm.tsx`, `app/admin/producten/page.tsx`, `app/steunen/[slug]/page.tsx`, and `app/api/checkout/bestelling/route.ts`. No new errors in the pack-groepen files.

- [ ] **Step 5: Do NOT commit; continue to Task 7**

---

## Task 7: Admin sidebar — link to Pack groepen

**Files:**
- Modify: `components/admin/AdminSidebar.tsx:7-20`

- [ ] **Step 1: Insert a new nav item below Producten**

In `components/admin/AdminSidebar.tsx`, change the `navItems` array so that after the `"/admin/producten"` entry (line 13), a new entry is inserted:

```ts
  { href: "/admin/producten", label: "Producten", icon: "🛍️" },
  { href: "/admin/pack-groepen", label: "Pack groepen", icon: "📦" },
  { href: "/admin/inschrijvingen", label: "Inschrijvingen", icon: "📋" },
```

- [ ] **Step 2: Do NOT commit; continue to Task 8**

---

## Task 8: Product form — remove old pack fields, add group select / image / description

**Files:**
- Modify: `app/admin/producten/_ProductForm.tsx`
- Modify: `app/admin/producten/nieuw/page.tsx`
- Modify: `app/admin/producten/[id]/page.tsx`

- [ ] **Step 1: Rewrite `_ProductForm.tsx` as a client component with image preview**

Replace the full contents of `app/admin/producten/_ProductForm.tsx` with:

```tsx
"use client";

import Image from "next/image";
import { useState } from "react";
import { PackGroup, Product, Sale } from "@/lib/types";

export function ProductForm({
  product,
  sales,
  packGroups,
  action,
}: {
  product?: Product;
  sales: Sale[];
  packGroups: PackGroup[];
  action: (formData: FormData) => Promise<void>;
}) {
  const [preview, setPreview] = useState<string | null>(product?.image_url ?? null);

  return (
    <form action={action} className="flex flex-col gap-5 max-w-xl" encType="multipart/form-data">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold mb-1">Verkoop *</label>
          <select
            name="sale_id"
            required
            defaultValue={product?.sale_id ?? ""}
            className="w-full border border-[#e8e4df] rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-red-sportac bg-white"
          >
            <option value="" disabled>Kies een verkoop...</option>
            {sales.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1">Prijs (€) *</label>
          <input
            type="number"
            name="price_euros"
            required
            min={0}
            step={0.01}
            defaultValue={product ? (product.price_cents / 100).toFixed(2) : ""}
            placeholder="18.00"
            className="w-full border border-[#e8e4df] rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-red-sportac"
          />
          <p className="text-xs text-gray-sub mt-1">Gebruikt als de pack groep leeg is.</p>
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold mb-1">Naam *</label>
        <input
          type="text"
          name="name"
          required
          defaultValue={product?.name}
          className="w-full border border-[#e8e4df] rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-red-sportac"
          placeholder="Barrel Selection Chenin Blanc 2025"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold mb-1">Pack groep (optioneel)</label>
        <select
          name="pack_group_id"
          defaultValue={product?.pack_group_id ?? ""}
          className="w-full border border-[#e8e4df] rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-red-sportac bg-white"
        >
          <option value="">— Geen pack groep —</option>
          {packGroups.map((g) => (
            <option key={g.id} value={g.id}>{g.name}</option>
          ))}
        </select>
        {packGroups.length === 0 && (
          <p className="text-xs text-gray-sub mt-1">
            Nog geen pack groepen voor deze verkoop. Maak er eerst een aan onder Pack groepen.
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-semibold mb-2">Foto</label>
        <div className="flex items-start gap-4">
          {preview && (
            <div className="relative w-20 h-24 rounded-sm overflow-hidden bg-[#ddd8d0] flex-shrink-0">
              <Image src={preview} alt="Preview" fill className="object-cover" sizes="80px" />
            </div>
          )}
          <div className="flex-1 flex flex-col gap-2">
            <input
              type="file"
              name="image_file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) setPreview(URL.createObjectURL(file));
              }}
              className="w-full text-sm text-gray-body file:mr-3 file:py-1.5 file:px-3 file:rounded-sm file:border-0 file:text-sm file:font-semibold file:bg-red-sportac file:text-white hover:file:bg-red-600 file:cursor-pointer"
            />
            <p className="text-xs text-gray-sub">Of gebruik een externe URL:</p>
            <input
              type="url"
              name="image_url"
              defaultValue={product?.image_url ?? ""}
              placeholder="https://..."
              className="w-full border border-[#e8e4df] rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-red-sportac"
              onChange={(e) => { if (e.target.value) setPreview(e.target.value); }}
            />
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold mb-1">Beschrijving (Markdown)</label>
        <textarea
          name="description"
          rows={8}
          defaultValue={product?.description ?? ""}
          placeholder="- Zuid-Afrika — Western Cape&#10;- Druif: chenin blanc&#10;- Fris, mineraal, past bij vis en tapas"
          className="w-full border border-[#e8e4df] rounded-sm px-3 py-2 text-sm font-mono focus:outline-none focus:border-red-sportac resize-y"
        />
        <p className="text-xs text-gray-sub mt-1">
          Zichtbaar als klanten op &ldquo;Meer info&rdquo; klikken op de verkooppagina. Ondersteunt Markdown.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold mb-1">Volgorde</label>
          <input
            type="number"
            name="sort_order"
            min={0}
            defaultValue={product?.sort_order ?? 0}
            className="w-full border border-[#e8e4df] rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-red-sportac"
          />
        </div>
        <div className="flex items-end pb-2">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" name="is_active" defaultChecked={product?.is_active ?? true} className="accent-red-sportac" />
            Actief (zichtbaar op site)
          </label>
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button type="submit" className="bg-red-sportac text-white font-bold text-sm px-6 py-2.5 rounded-sm hover:bg-red-600 transition-colors">
          Opslaan
        </button>
        <a href="/admin/producten" className="text-sm text-gray-sub px-4 py-2.5 hover:text-gray-dark transition-colors">
          Annuleren
        </a>
      </div>
    </form>
  );
}
```

- [ ] **Step 2: Update `nieuw/page.tsx` to pass packGroups**

Replace the contents of `app/admin/producten/nieuw/page.tsx` with:

```tsx
import { createAdminClient } from "@/lib/supabase-admin";
import { PackGroup, Sale } from "@/lib/types";
import { ProductForm } from "../_ProductForm";
import { createProduct } from "../actions";

export default async function NieuwProductPage() {
  const supabase = createAdminClient();
  const [{ data: salesData }, { data: groupsData }] = await Promise.all([
    supabase.from("sales").select("*").order("sort_order"),
    supabase.from("pack_groups").select("*").order("sort_order"),
  ]);
  const sales: Sale[] = salesData ?? [];
  const packGroups: PackGroup[] = groupsData ?? [];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="font-condensed font-black italic text-4xl text-gray-dark">Product toevoegen</h1>
      </div>
      <ProductForm sales={sales} packGroups={packGroups} action={createProduct} />
    </div>
  );
}
```

(Note: the "new" page loads ALL pack groups across sales. The admin picks a sale and a group; if they mismatch, the server action will still save it, but the public page simply won't attach pack pricing because the group's `sale_id` filters it out on checkout. Acceptable tradeoff for v1.)

- [ ] **Step 3: Update `[id]/page.tsx` to pass packGroups filtered by sale**

Replace the contents of `app/admin/producten/[id]/page.tsx` with:

```tsx
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase-admin";
import { PackGroup, Product, Sale } from "@/lib/types";
import { ProductForm } from "../_ProductForm";
import { updateProduct } from "../actions";

export default async function BewerkenProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createAdminClient();
  const [{ data: productData }, { data: salesData }] = await Promise.all([
    supabase.from("products").select("*").eq("id", id).single(),
    supabase.from("sales").select("*").order("sort_order"),
  ]);
  if (!productData) notFound();
  const product = productData as Product;
  const sales: Sale[] = salesData ?? [];

  const { data: groupsData } = await supabase
    .from("pack_groups")
    .select("*")
    .eq("sale_id", product.sale_id)
    .order("sort_order");
  const packGroups: PackGroup[] = groupsData ?? [];

  const action = updateProduct.bind(null, id);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="font-condensed font-black italic text-4xl text-gray-dark">Product bewerken</h1>
        <p className="text-gray-sub text-sm mt-1">{product.name}</p>
      </div>
      <ProductForm product={product} sales={sales} packGroups={packGroups} action={action} />
    </div>
  );
}
```

- [ ] **Step 4: Do NOT commit; continue to Task 9**

---

## Task 9: Product actions — image upload + new fields

**Files:**
- Modify: `app/admin/producten/actions.ts`

- [ ] **Step 1: Replace actions with image upload helper + group/image/description handling**

Replace the full contents of `app/admin/producten/actions.ts` with:

```ts
"use server";

import { createAdminClient } from "@/lib/supabase-admin";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const PRODUCT_PHOTO_BUCKET = "product-photos";

async function resolveImageUrl(formData: FormData): Promise<string | null> {
  const file = formData.get("image_file") as File | null;
  if (file && file.size > 0) {
    const supabase = createAdminClient();
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from(PRODUCT_PHOTO_BUCKET)
      .upload(path, file, { upsert: true, contentType: file.type });
    if (!error) {
      const { data } = supabase.storage.from(PRODUCT_PHOTO_BUCKET).getPublicUrl(path);
      return data.publicUrl;
    }
  }
  const url = (formData.get("image_url") as string)?.trim();
  return url ? url : null;
}

function optionalString(raw: FormDataEntryValue | null): string | null {
  const s = typeof raw === "string" ? raw.trim() : "";
  return s ? s : null;
}

export async function createProduct(formData: FormData) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("products").insert({
    sale_id: formData.get("sale_id") as string,
    name: formData.get("name") as string,
    price_cents: Math.round(parseFloat(formData.get("price_euros") as string) * 100),
    pack_group_id: optionalString(formData.get("pack_group_id")),
    image_url: await resolveImageUrl(formData),
    description: optionalString(formData.get("description")),
    is_active: formData.get("is_active") === "on",
    sort_order: parseInt(formData.get("sort_order") as string, 10) || 0,
  });
  if (error) redirect("/admin/producten?error=1");
  revalidatePath("/admin/producten");
  revalidatePath("/steunen");
  redirect("/admin/producten");
}

export async function updateProduct(id: string, formData: FormData) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("products").update({
    sale_id: formData.get("sale_id") as string,
    name: formData.get("name") as string,
    price_cents: Math.round(parseFloat(formData.get("price_euros") as string) * 100),
    pack_group_id: optionalString(formData.get("pack_group_id")),
    image_url: await resolveImageUrl(formData),
    description: optionalString(formData.get("description")),
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

- [ ] **Step 2: Do NOT commit; continue to Task 10**

---

## Task 10: Admin product list — thumbnail + group tag

**Files:**
- Modify: `app/admin/producten/page.tsx`

- [ ] **Step 1: Replace the page**

Replace the full contents of `app/admin/producten/page.tsx` with:

```tsx
import Link from "next/link";
import Image from "next/image";
import { createAdminClient } from "@/lib/supabase-admin";
import { Product } from "@/lib/types";
import { deleteProduct, toggleProductActive } from "./actions";
import { formatPrice } from "@/lib/format";

type Row = Product & {
  sales: { name: string } | null;
  pack_groups: { name: string } | null;
};

export default async function ProductenPage() {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("products")
    .select("*, sales(name), pack_groups(name)")
    .order("sort_order");
  const products: Row[] = data ?? [];

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-condensed font-black italic text-4xl text-gray-dark">Producten</h1>
          <p className="text-gray-sub text-sm mt-1">{products.length} producten</p>
        </div>
        <Link href="/admin/producten/nieuw" className="bg-red-sportac text-white font-bold text-sm px-5 py-2.5 rounded-sm hover:bg-red-600 transition-colors">
          + Product toevoegen
        </Link>
      </div>

      <div className="flex flex-col gap-3">
        {products.length === 0 && <p className="text-gray-sub text-sm">Nog geen producten.</p>}
        {products.map((p) => (
          <div key={p.id} className="bg-white border border-[#e8e4df] rounded-sm p-4 flex items-center gap-4">
            <div className="relative w-12 h-12 rounded-sm overflow-hidden bg-[#f5f3f0] flex-shrink-0">
              {p.image_url && (
                <Image src={p.image_url} alt="" fill className="object-cover" sizes="48px" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-sm">{p.name}</span>
                {p.sales && <span className="text-[10px] font-bold bg-gray-100 text-gray-sub px-1.5 py-0.5 rounded-sm">{p.sales.name}</span>}
                {p.pack_groups && <span className="text-[10px] font-bold bg-red-sportac/10 text-red-sportac px-1.5 py-0.5 rounded-sm">📦 {p.pack_groups.name}</span>}
                {!p.is_active && <span className="text-[10px] font-bold bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-sm">Inactief</span>}
              </div>
              <p className="text-xs text-gray-sub mt-0.5">{formatPrice(p.price_cents)}</p>
            </div>
            <div className="flex items-center gap-2">
              <form action={toggleProductActive.bind(null, p.id, p.is_active)}>
                <button type="submit" className="text-xs font-semibold text-gray-dark border border-[#e8e4df] px-3 py-1.5 rounded-sm hover:border-gray-400 transition-colors">
                  {p.is_active ? "Deactiveren" : "Activeren"}
                </button>
              </form>
              <Link href={`/admin/producten/${p.id}`} className="text-xs font-semibold text-gray-dark border border-[#e8e4df] px-3 py-1.5 rounded-sm hover:border-gray-400 transition-colors">
                Bewerken
              </Link>
              <form action={deleteProduct.bind(null, p.id)}>
                <button type="submit" className="text-xs text-red-sportac border border-red-sportac/30 px-3 py-1.5 rounded-sm hover:bg-red-sportac/10 transition-colors">
                  Verwijderen
                </button>
              </form>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify typecheck**

Run: `npx tsc --noEmit`

Expected: errors remain only in `app/steunen/[slug]/page.tsx` and `app/api/checkout/bestelling/route.ts`.

- [ ] **Step 3: Do NOT commit; continue to Task 11**

---

## Task 11: Install react-markdown

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`

- [ ] **Step 1: Install dependency**

Run: `npm install react-markdown`

Expected: `package.json` `dependencies` now contains `"react-markdown"` at a 9.x version. `package-lock.json` updated.

- [ ] **Step 2: Do NOT commit; continue to Task 12**

---

## Task 12: ProductInfoModal component

**Files:**
- Create: `components/ProductInfoModal.tsx`

- [ ] **Step 1: Write the modal**

Create `components/ProductInfoModal.tsx`:

```tsx
"use client";

import Image from "next/image";
import { useRef } from "react";
import ReactMarkdown from "react-markdown";
import { PackGroup, Product } from "@/lib/types";
import { formatPrice } from "@/lib/format";

export function ProductInfoModal({
  product,
  group,
}: {
  product: Product;
  group: PackGroup | null;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  const priceLine = group
    ? `${formatPrice(group.unit_price_cents)} per fles · doos van ${group.pack_size}: ${formatPrice(group.pack_price_cents)}`
    : formatPrice(product.price_cents);

  return (
    <>
      <button
        type="button"
        onClick={() => ref.current?.showModal()}
        className="text-xs font-semibold text-red-sportac hover:underline"
      >
        Meer info
      </button>
      <dialog
        ref={ref}
        onClick={(e) => {
          if (e.target === ref.current) ref.current?.close();
        }}
        className="backdrop:bg-black/40 rounded-sm max-w-lg w-[calc(100%-2rem)] p-0"
      >
        <div className="flex flex-col">
          {product.image_url && (
            <div className="relative w-full aspect-[4/3] bg-[#f5f3f0]">
              <Image src={product.image_url} alt={product.name} fill className="object-cover" sizes="(max-width: 640px) 100vw, 512px" />
            </div>
          )}
          <div className="p-6 flex flex-col gap-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-condensed font-black italic text-2xl text-gray-dark">{product.name}</h2>
                <p className="text-sm text-gray-sub mt-1">{priceLine}</p>
              </div>
              <button
                type="button"
                onClick={() => ref.current?.close()}
                aria-label="Sluiten"
                className="text-gray-sub hover:text-gray-dark text-2xl leading-none"
              >
                ×
              </button>
            </div>
            {product.description && (
              <div className="prose prose-sm max-w-none text-gray-body [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-2 [&_strong]:font-semibold">
                <ReactMarkdown>{product.description}</ReactMarkdown>
              </div>
            )}
          </div>
        </div>
      </dialog>
    </>
  );
}
```

- [ ] **Step 2: Verify typecheck**

Run: `npx tsc --noEmit`

Expected: modal compiles. Errors only remain in `app/steunen/[slug]/page.tsx` and `app/api/checkout/bestelling/route.ts`.

- [ ] **Step 3: Do NOT commit; continue to Task 13**

---

## Task 13: Public sale page — grouped rendering + modal

**Files:**
- Modify: `app/steunen/[slug]/page.tsx`

- [ ] **Step 1: Replace the file**

Replace the full contents of `app/steunen/[slug]/page.tsx` with:

```tsx
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase-admin";
import { PackGroup, Product, Sale, TeamMember } from "@/lib/types";
import { formatPrice } from "@/lib/format";
import { ProductInfoModal } from "@/components/ProductInfoModal";

export default async function SaleDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ betaald?: string }>;
}) {
  const { slug } = await params;
  const { betaald } = await searchParams;

  const supabase = createAdminClient();

  const { data: saleData } = await supabase
    .from("sales")
    .select("*")
    .eq("slug", slug)
    .eq("is_active", true)
    .single();

  if (!saleData) notFound();

  const sale = saleData as Sale;

  const [{ data: productsData }, { data: groupsData }, { data: membersData }] = await Promise.all([
    supabase
      .from("products")
      .select("*")
      .eq("sale_id", sale.id)
      .eq("is_active", true)
      .order("sort_order"),
    supabase
      .from("pack_groups")
      .select("*")
      .eq("sale_id", sale.id)
      .order("sort_order"),
    supabase.from("team_members").select("id, name").order("sort_order"),
  ]);

  const products: Product[] = productsData ?? [];
  const packGroups: PackGroup[] = groupsData ?? [];
  const members: Pick<TeamMember, "id" | "name">[] = membersData ?? [];

  const groupById = new Map(packGroups.map((g) => [g.id, g]));

  const productsByGroup = new Map<string, Product[]>();
  const ungrouped: Product[] = [];
  for (const p of products) {
    if (p.pack_group_id && groupById.has(p.pack_group_id)) {
      const list = productsByGroup.get(p.pack_group_id) ?? [];
      list.push(p);
      productsByGroup.set(p.pack_group_id, list);
    } else {
      ungrouped.push(p);
    }
  }

  return (
    <div className="pt-16">
      {betaald && (
        <div className="bg-green-50 border-b border-green-200 px-6 py-3 text-center text-sm font-semibold text-green-800">
          Bestelling ontvangen! Je ontvangt een bevestiging per e-mail.
        </div>
      )}

      <div className="bg-gray-dark py-14 px-6 relative overflow-hidden">
        <div className="max-w-5xl mx-auto relative">
          <div className="text-sm text-gray-sub mb-4">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            {" / "}
            <Link href="/steunen" className="hover:text-white transition-colors">Steunen</Link>
            {" / "}
            <span className="text-red-sportac">{sale.name}</span>
          </div>
          <div className="text-5xl mb-4">{sale.icon}</div>
          <h1 className="font-condensed font-black italic text-6xl leading-none text-white mb-3">
            <em className="not-italic text-red-sportac">{sale.name}</em> bestellen
          </h1>
          {sale.description && (
            <p className="text-gray-sub text-[15px] max-w-lg leading-relaxed mt-4">
              {sale.description}
            </p>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-14">
        {sale.coming_soon ? (
          <div className="bg-white border border-[#e8e4df] rounded-sm p-8 max-w-lg text-center">
            <div className="text-5xl mb-4">⏳</div>
            <p className="text-xs font-bold tracking-[0.2em] uppercase text-red-sportac mb-3">
              Binnenkort beschikbaar
            </p>
            <h2 className="font-condensed font-black italic text-3xl text-gray-dark mb-3">
              Nog even geduld
            </h2>
            <p className="text-gray-body text-sm leading-relaxed">
              Onze {sale.name.toLowerCase()}-actie wordt nog voorbereid. Hou deze pagina in de gaten — binnenkort kan je hier bestellen.
            </p>
            <Link
              href="/steunen"
              className="inline-block mt-6 text-sm font-bold text-red-sportac hover:underline"
            >
              ← Terug naar steunen
            </Link>
          </div>
        ) : (
        <div className="bg-white border border-[#e8e4df] rounded-sm p-8 max-w-2xl">
          <form action="/api/checkout/bestelling" method="POST" className="flex flex-col gap-6">
            <input type="hidden" name="sale_id" value={sale.id} />
            <input type="hidden" name="sale_slug" value={sale.slug} />

            {packGroups.map((g) => {
              const groupProducts = productsByGroup.get(g.id) ?? [];
              if (groupProducts.length === 0) return null;
              return (
                <section key={g.id} className="flex flex-col gap-3">
                  <header className="border-b border-[#e8e4df] pb-2">
                    <h3 className="font-condensed font-black italic text-xl text-gray-dark">{g.name}</h3>
                    <p className="text-xs text-gray-sub">
                      {formatPrice(g.unit_price_cents)} per fles · doos van {g.pack_size}: {formatPrice(g.pack_price_cents)} (mag mengen)
                    </p>
                  </header>
                  {groupProducts.map((p) => (
                    <ProductRow key={p.id} product={p} group={g} />
                  ))}
                </section>
              );
            })}

            {ungrouped.length > 0 && (
              <section className="flex flex-col gap-3">
                {packGroups.length > 0 && (
                  <header className="border-b border-[#e8e4df] pb-2">
                    <h3 className="font-condensed font-black italic text-xl text-gray-dark">Overige producten</h3>
                  </header>
                )}
                {ungrouped.map((p) => (
                  <ProductRow key={p.id} product={p} group={null} />
                ))}
              </section>
            )}

            {products.length === 0 && (
              <p className="text-sm text-gray-sub">Geen producten beschikbaar.</p>
            )}

            <hr className="border-[#e8e4df]" />

            <div>
              <label className="block text-sm font-semibold mb-1">Naam *</label>
              <input
                type="text"
                name="name"
                required
                className="w-full border border-[#e8e4df] rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-red-sportac"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">E-mailadres *</label>
              <input
                type="email"
                name="email"
                required
                className="w-full border border-[#e8e4df] rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-red-sportac"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Telefoonnummer</label>
              <input
                type="tel"
                name="phone"
                className="w-full border border-[#e8e4df] rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-red-sportac"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">
                Wie brengt jouw bestelling?{" "}
                <span className="text-gray-sub font-normal">(optioneel)</span>
              </label>
              <select
                name="contact_member_id"
                defaultValue=""
                className="w-full border border-[#e8e4df] rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-red-sportac bg-white"
              >
                <option value="">— Geen voorkeur —</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              className="bg-red-sportac text-white font-bold py-3 rounded-sm hover:bg-red-600 transition-colors text-sm"
            >
              Bestelling plaatsen &amp; betalen
            </button>
          </form>
        </div>
        )}
      </div>
    </div>
  );
}

function ProductRow({ product, group }: { product: Product; group: PackGroup | null }) {
  const unitLabel = group ? formatPrice(group.unit_price_cents) : formatPrice(product.price_cents);
  return (
    <div className="flex items-center gap-3">
      <div className="relative w-12 h-12 rounded-sm overflow-hidden bg-[#f5f3f0] flex-shrink-0">
        {product.image_url && (
          <Image src={product.image_url} alt="" fill className="object-cover" sizes="48px" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <label htmlFor={product.id} className="text-sm font-semibold block truncate">
          {product.name}
        </label>
        <div className="flex items-center gap-2 text-xs text-gray-sub">
          <span>{unitLabel}</span>
          {product.description && <ProductInfoModal product={product} group={group} />}
        </div>
      </div>
      <input
        id={product.id}
        type="number"
        name={`items.${product.id}`}
        min={0}
        max={99}
        defaultValue={0}
        className="w-16 border border-[#e8e4df] rounded-sm px-2 py-1 text-sm text-center focus:outline-none focus:border-red-sportac"
      />
    </div>
  );
}
```

- [ ] **Step 2: Verify typecheck**

Run: `npx tsc --noEmit`

Expected: errors remain only in `app/api/checkout/bestelling/route.ts`.

- [ ] **Step 3: Do NOT commit; continue to Task 14**

---

## Task 14: Checkout route — call `calcCart`

**Files:**
- Modify: `app/api/checkout/bestelling/route.ts`

- [ ] **Step 1: Replace the file**

Replace the full contents of `app/api/checkout/bestelling/route.ts` with:

```ts
import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase-admin";
import { PackGroup, Product } from "@/lib/types";
import { calcCart } from "@/lib/pricing";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const sale_id = (formData.get("sale_id") as string)?.trim();
  const sale_slug = (formData.get("sale_slug") as string)?.trim();
  const name = (formData.get("name") as string)?.trim();
  const email = (formData.get("email") as string)?.trim();
  const phone = (formData.get("phone") as string)?.trim() ?? "";
  const contact_member_id = (formData.get("contact_member_id") as string)?.trim() || null;

  if (!sale_id || !sale_slug || !name || !email) {
    return NextResponse.json({ error: "Ongeldige invoer" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const [{ data: productsData }, { data: groupsData }] = await Promise.all([
    supabase.from("products").select("*").eq("sale_id", sale_id).eq("is_active", true),
    supabase.from("pack_groups").select("*").eq("sale_id", sale_id),
  ]);

  const products: Product[] = productsData ?? [];
  const groups: PackGroup[] = groupsData ?? [];
  const productIds = new Set(products.map((p) => p.id));

  const items: Record<string, number> = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("items.")) {
      const productId = key.slice("items.".length);
      if (!productIds.has(productId)) continue;
      const qty = parseInt(value as string, 10);
      if (!isNaN(qty) && qty > 0) items[productId] = qty;
    }
  }

  const origin = req.headers.get("origin") ?? "http://localhost:3000";

  if (Object.keys(items).length === 0) {
    return NextResponse.redirect(new URL(`/steunen/${sale_slug}`, req.url));
  }

  const { stripeLines } = calcCart(products, groups, items);

  if (stripeLines.length === 0) {
    return NextResponse.redirect(new URL(`/steunen/${sale_slug}`, req.url));
  }

  const { data: order, error: dbError } = await supabase
    .from("orders")
    .insert({ sale_id, name, email, phone, items, status: "new", payment_status: "pending", contact_member_id })
    .select("id")
    .single();

  if (dbError || !order) {
    return NextResponse.json({ error: "Database fout" }, { status: 500 });
  }

  const lineItems = stripeLines.map((l) => ({
    price_data: {
      currency: "eur",
      product_data: { name: l.name },
      unit_amount: l.unitAmount,
    },
    quantity: l.quantity,
  }));

  const session = await stripe.checkout.sessions.create({
    line_items: lineItems,
    mode: "payment",
    customer_email: email,
    metadata: { type: "bestelling", record_id: order.id },
    success_url: `${origin}/steunen/${sale_slug}?betaald=1`,
    cancel_url: `${origin}/steunen/${sale_slug}`,
  });

  return NextResponse.redirect(session.url!, 303);
}
```

- [ ] **Step 2: Verify typecheck**

Run: `npx tsc --noEmit`

Expected: zero errors.

- [ ] **Step 3: Verify production build**

Run: `npm run build`

Expected: clean build, no type errors, no new warnings.

- [ ] **Step 4: Commit all the interdependent changes**

Tasks 2-14 all depend on each other; commit as one atomic change:

```bash
git add lib/types.ts lib/pricing.ts \
  app/admin/pack-groepen/ \
  components/admin/AdminSidebar.tsx \
  app/admin/producten/_ProductForm.tsx \
  app/admin/producten/nieuw/page.tsx \
  app/admin/producten/[id]/page.tsx \
  app/admin/producten/actions.ts \
  app/admin/producten/page.tsx \
  components/ProductInfoModal.tsx \
  app/steunen/[slug]/page.tsx \
  app/api/checkout/bestelling/route.ts \
  package.json package-lock.json
git -c commit.gpgsign=false commit -m "feat: pack groups, product images + markdown info modal"
```

---

## Task 15: Human-gated manual verification

Skip if the human hasn't yet created the `product-photos` Supabase Storage bucket and applied migration `021_...`. Both are prerequisites for end-to-end testing.

- [ ] **Step 1: Confirm bucket and migration exist**

In Supabase dashboard:
- Storage → confirm `product-photos` bucket exists and is Public.
- SQL Editor → run `select column_name from information_schema.columns where table_name = 'products';` and confirm `pack_group_id`, `image_url`, `description` are present; `pack_size` and `pack_price_cents` are gone.
- `select * from pack_groups limit 1;` runs without error.

If any fail, STOP and ask the human to apply them.

- [ ] **Step 2: Create the four real groups**

In `/admin/pack-groepen`, create the four groups from the fundraiser spec:
- Instapwijnen — 6 flessen — unit €10,00, pack €50,00
- Duurdere reeks — 6 flessen — unit €14,00, pack €70,00
- Bubbels — 6 flessen — unit €18,00, pack €90,00
- Picon Vin Blanc — 6 flessen — unit €19,50, pack €97,50

(The actual wine prices can be adjusted by the admin later — these are sensible defaults.)

- [ ] **Step 3: Edit wine products**

In `/admin/producten`, for each wine product: assign a pack group, upload an image, paste a markdown description. Save. Reopen to confirm persistence.

- [ ] **Step 4: Stripe test checkout — mixed group**

`npm run dev`. On `/steunen/<wine-slug>`, order:
- 3 Instap wit + 3 Instap rood → expect Stripe line `"Instapwijnen (doos van 6) × 1 @ €50,00"`, total €50.
- 7 Instap wit → expect `"Instapwijnen (doos van 6) × 1"` + `"Instapwijnen × 1"` = €60.
- 6 Instap + 6 Duurder → expect two separate pack lines, total €120.

- [ ] **Step 5: Info modal**

On the wine sale page, click "Meer info" on a wine with a description. Confirm the modal opens, the image renders, markdown bullets render, Esc closes it, backdrop click closes it.

- [ ] **Step 6: No commit — data only**

Stop the dev server. No git changes.

---

## Final build check

- [ ] **Step 1: Build**

Run: `npm run build`
Expected: clean build.

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: no new errors beyond the pre-existing ones (`Countdown.tsx`, unused `_ProductForm.tsx` anchor, etc.).
