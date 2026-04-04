# Configurable Sales Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hardcoded `candy`/`wine` product types with a configurable `sales` table so admins can add, rename, and remove sale campaigns (e.g. "Snoep", "Wijn", "Koeken") without code changes.

**Architecture:** A new `sales` table holds named sale campaigns. `products.type` is replaced by `products.sale_id` (FK → sales). `orders.type` is replaced by `orders.sale_id`. The `/steunen` page renders one section per active sale dynamically. The `/api/checkout/bestelling` route looks up products by `sale_id`. Admin gets a new `/admin/verkopen` CRUD section and the product form's "Type" dropdown becomes a "Verkoop" dropdown.

**Tech Stack:** Next.js 16 App Router, Supabase PostgreSQL, TypeScript strict mode, Tailwind CSS v4.

---

## File Map

### New files
- `supabase/migrations/010_sales.sql` — create sales table, seed Snoep + Wijn, migrate products
- `supabase/migrations/011_orders_sale_id.sql` — migrate orders table
- `app/admin/verkopen/actions.ts` — createSale, updateSale, deleteSale, toggleSaleActive
- `app/admin/verkopen/_SaleForm.tsx` — shared sale form component
- `app/admin/verkopen/page.tsx` — sale list
- `app/admin/verkopen/nieuw/page.tsx` — new sale page
- `app/admin/verkopen/[id]/page.tsx` — edit sale page

### Modified files
- `lib/types.ts` — add `Sale` type, update `Product` (replace `type` with `sale_id`, add `sale_name`), update `Order` (replace `type` with `sale_id`, add `sale_name`)
- `app/admin/producten/actions.ts` — replace `type` with `sale_id`
- `app/admin/producten/_ProductForm.tsx` — replace type dropdown with sale dropdown (receives sales as prop)
- `app/admin/producten/nieuw/page.tsx` — fetch sales, pass to form
- `app/admin/producten/[id]/page.tsx` — fetch sales, pass to form
- `app/admin/producten/page.tsx` — show sale name instead of TYPE_LABELS
- `app/api/checkout/bestelling/route.ts` — replace `type` logic with `sale_id`
- `app/steunen/page.tsx` — fetch active sales + their products, render dynamic sections
- `app/admin/bestellingen/page.tsx` — show sale name instead of hardcoded type label
- `components/admin/AdminSidebar.tsx` — add Verkopen nav item

---

## Task 1: Database migrations

**Files:**
- Create: `supabase/migrations/010_sales.sql`
- Create: `supabase/migrations/011_orders_sale_id.sql`

- [ ] **Step 1: Write migration 010**

Create `supabase/migrations/010_sales.sql`:

```sql
-- Create sales table
create table sales (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text not null default '',
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table sales enable row level security;

create policy "Public read active sales" on sales
  for select using (is_active = true);

create policy "Admin all sales" on sales
  for all using (auth.role() = 'authenticated');

-- Seed existing sale types
insert into sales (name, slug, description, sort_order) values
  ('Snoep', 'snoep', 'Bestel een doos snoep via onze actie. Afhalen op een van de afhaaldata (zie agenda).', 1),
  ('Wijn', 'wijn', 'Kies uit onze selectie wijnen. Afhalen op een van de afhaaldata (zie agenda).', 2);

-- Add sale_id to products
alter table products add column sale_id uuid references sales(id) on delete cascade;

-- Link existing products to seeded sales
update products set sale_id = (select id from sales where slug = 'snoep') where type = 'candy';
update products set sale_id = (select id from sales where slug = 'wijn') where type = 'wine';

-- Make sale_id required now that it's populated
alter table products alter column sale_id set not null;

-- Drop old type column
alter table products drop column type;
```

- [ ] **Step 2: Write migration 011**

Create `supabase/migrations/011_orders_sale_id.sql`:

```sql
-- Add sale_id to orders
alter table orders add column sale_id uuid references sales(id) on delete set null;

-- Migrate existing orders: candy → snoep, wine → wijn
update orders set sale_id = (select id from sales where slug = 'snoep') where type = 'candy';
update orders set sale_id = (select id from sales where slug = 'wijn') where type = 'wine';

-- Drop old type column
alter table orders drop column type;
```

- [ ] **Step 3: Run migrations in Supabase dashboard**

Go to Supabase Dashboard → SQL Editor. Run `010_sales.sql` first, then `011_orders_sale_id.sql`.

Verify: 
- Table Editor → sales → 2 rows (Snoep, Wijn)
- Table Editor → products → `sale_id` column populated, no `type` column
- Table Editor → orders → `sale_id` column, no `type` column

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/010_sales.sql supabase/migrations/011_orders_sale_id.sql
git -c commit.gpgsign=false commit -m "feat: add sales table, migrate products and orders from type to sale_id"
```

---

## Task 2: Update TypeScript types

**Files:**
- Modify: `lib/types.ts`

- [ ] **Step 1: Update types**

Replace the contents of `lib/types.ts`:

```typescript
export type EventRecord = {
  id: string;
  slug: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  image_url: string | null;
  max_attendees: number | null;
  price_cents: number;
  is_published: boolean;
  created_at: string;
};

export type Registration = {
  id: string;
  event_id: string;
  name: string;
  email: string;
  num_persons: number;
  remarks: string | null;
  stripe_session_id: string | null;
  payment_status: "pending" | "paid" | "failed";
  created_at: string;
};

export type Donation = {
  id: string;
  name: string;
  email: string;
  amount_cents: number;
  message: string | null;
  stripe_session_id: string | null;
  payment_status: "pending" | "paid" | "failed";
  created_at: string;
};

export type Order = {
  id: string;
  sale_id: string | null;
  sale_name?: string;        // joined from sales table in admin views
  name: string;
  email: string;
  phone: string;
  items: Record<string, number>;
  pickup_event_id: string | null;
  status: "new" | "handled";
  stripe_session_id: string | null;
  payment_status: "pending" | "paid" | "failed";
  created_at: string;
};

export type TeamMember = {
  id: string;
  name: string;
  role: string;
  discipline: string[] | null;
  bio: {
    age?: string;
    why?: string;
    favorite_discipline?: string;
    years?: string;
  } | null;
  image_url: string | null;
  sort_order: number;
  created_at: string;
};

export type Sponsor = {
  id: string;
  name: string;
  logo_url: string | null;
  website_url: string | null;
  level: "gold" | "silver" | "bronze" | "partner";
  sort_order: number;
  created_at: string;
};

export type Product = {
  id: string;
  sale_id: string;
  sale_name?: string;        // joined from sales table when needed
  name: string;
  price_cents: number;
  is_active: boolean;
  sort_order: number;
  created_at: string;
};

export type Sale = {
  id: string;
  name: string;
  slug: string;
  description: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
};
```

- [ ] **Step 2: Check for TypeScript errors**

```bash
npx tsc --noEmit 2>&1
```

You will see errors — that's expected since files still reference `product.type` and `order.type`. They will be fixed in subsequent tasks. Note them and continue.

- [ ] **Step 3: Commit**

```bash
git add lib/types.ts
git -c commit.gpgsign=false commit -m "feat: add Sale type, replace type field with sale_id in Product and Order"
```

---

## Task 3: Admin sales CRUD

**Files:**
- Create: `app/admin/verkopen/actions.ts`
- Create: `app/admin/verkopen/_SaleForm.tsx`
- Create: `app/admin/verkopen/page.tsx`
- Create: `app/admin/verkopen/nieuw/page.tsx`
- Create: `app/admin/verkopen/[id]/page.tsx`
- Modify: `components/admin/AdminSidebar.tsx`

- [ ] **Step 1: Create actions.ts**

Create `app/admin/verkopen/actions.ts`:

```typescript
"use server";

import { createAdminClient } from "@/lib/supabase-admin";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createSale(formData: FormData) {
  const supabase = createAdminClient();
  const name = (formData.get("name") as string).trim();
  const slug = (formData.get("slug") as string).trim();
  const { error } = await supabase.from("sales").insert({
    name,
    slug,
    description: (formData.get("description") as string).trim(),
    is_active: formData.get("is_active") === "on",
    sort_order: parseInt(formData.get("sort_order") as string, 10) || 0,
  });
  if (error) redirect("/admin/verkopen?error=1");
  revalidatePath("/admin/verkopen");
  revalidatePath("/steunen");
  redirect("/admin/verkopen");
}

export async function updateSale(id: string, formData: FormData) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("sales").update({
    name: (formData.get("name") as string).trim(),
    slug: (formData.get("slug") as string).trim(),
    description: (formData.get("description") as string).trim(),
    is_active: formData.get("is_active") === "on",
    sort_order: parseInt(formData.get("sort_order") as string, 10) || 0,
  }).eq("id", id);
  if (error) redirect("/admin/verkopen?error=1");
  revalidatePath("/admin/verkopen");
  revalidatePath("/steunen");
  redirect("/admin/verkopen");
}

export async function deleteSale(id: string) {
  const supabase = createAdminClient();
  await supabase.from("sales").delete().eq("id", id);
  revalidatePath("/admin/verkopen");
  revalidatePath("/admin/producten");
  revalidatePath("/steunen");
  redirect("/admin/verkopen");
}

export async function toggleSaleActive(id: string, currentValue: boolean) {
  const supabase = createAdminClient();
  await supabase.from("sales").update({ is_active: !currentValue }).eq("id", id);
  revalidatePath("/admin/verkopen");
  revalidatePath("/steunen");
}
```

- [ ] **Step 2: Create _SaleForm.tsx**

Create `app/admin/verkopen/_SaleForm.tsx`:

```typescript
import { Sale } from "@/lib/types";

export function SaleForm({ sale, action }: { sale?: Sale; action: (formData: FormData) => Promise<void> }) {
  return (
    <form action={action} className="flex flex-col gap-5 max-w-xl">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold mb-1">Naam *</label>
          <input
            type="text"
            name="name"
            required
            defaultValue={sale?.name}
            placeholder="Snoep"
            className="w-full border border-[#e8e4df] rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-red-sportac"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1">Slug *</label>
          <input
            type="text"
            name="slug"
            required
            defaultValue={sale?.slug}
            placeholder="snoep"
            pattern="[a-z0-9-]+"
            className="w-full border border-[#e8e4df] rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-red-sportac"
          />
          <p className="text-xs text-gray-sub mt-1">Alleen kleine letters, cijfers en koppeltekens. Wordt gebruikt in de succes-URL.</p>
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold mb-1">Beschrijving</label>
        <textarea
          name="description"
          rows={3}
          defaultValue={sale?.description}
          placeholder="Bestel een doos snoep via onze actie..."
          className="w-full border border-[#e8e4df] rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-red-sportac resize-none"
        />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold mb-1">Volgorde</label>
          <input
            type="number"
            name="sort_order"
            min={0}
            defaultValue={sale?.sort_order ?? 0}
            className="w-full border border-[#e8e4df] rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-red-sportac"
          />
        </div>
        <div className="flex items-end pb-2">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" name="is_active" defaultChecked={sale?.is_active ?? true} className="accent-red-sportac" />
            Actief (zichtbaar op site)
          </label>
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button type="submit" className="bg-red-sportac text-white font-bold text-sm px-6 py-2.5 rounded-sm hover:bg-red-600 transition-colors">
          Opslaan
        </button>
        <a href="/admin/verkopen" className="text-sm text-gray-sub px-4 py-2.5 hover:text-gray-dark transition-colors">
          Annuleren
        </a>
      </div>
    </form>
  );
}
```

- [ ] **Step 3: Create list page**

Create `app/admin/verkopen/page.tsx`:

```typescript
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase-admin";
import { Sale } from "@/lib/types";
import { deleteSale, toggleSaleActive } from "./actions";

export default async function VerkopenPage() {
  const supabase = createAdminClient();
  const { data } = await supabase.from("sales").select("*").order("sort_order");
  const sales: Sale[] = data ?? [];

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-condensed font-black italic text-4xl text-gray-dark">Verkopen</h1>
          <p className="text-gray-sub text-sm mt-1">{sales.length} verkopen</p>
        </div>
        <Link href="/admin/verkopen/nieuw" className="bg-red-sportac text-white font-bold text-sm px-5 py-2.5 rounded-sm hover:bg-red-600 transition-colors">
          + Verkoop toevoegen
        </Link>
      </div>

      <div className="flex flex-col gap-3">
        {sales.length === 0 && <p className="text-gray-sub text-sm">Nog geen verkopen.</p>}
        {sales.map((s) => (
          <div key={s.id} className="bg-white border border-[#e8e4df] rounded-sm p-4 flex items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm">{s.name}</span>
                <span className="text-[10px] font-mono text-gray-sub bg-gray-100 px-1.5 py-0.5 rounded-sm">{s.slug}</span>
                {!s.is_active && <span className="text-[10px] font-bold bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-sm">Inactief</span>}
              </div>
              {s.description && <p className="text-xs text-gray-sub mt-0.5 max-w-lg truncate">{s.description}</p>}
            </div>
            <div className="flex items-center gap-2">
              <form action={toggleSaleActive.bind(null, s.id, s.is_active)}>
                <button type="submit" className="text-xs font-semibold text-gray-dark border border-[#e8e4df] px-3 py-1.5 rounded-sm hover:border-gray-400 transition-colors">
                  {s.is_active ? "Deactiveren" : "Activeren"}
                </button>
              </form>
              <Link href={`/admin/verkopen/${s.id}`} className="text-xs font-semibold text-gray-dark border border-[#e8e4df] px-3 py-1.5 rounded-sm hover:border-gray-400 transition-colors">
                Bewerken
              </Link>
              <form action={deleteSale.bind(null, s.id)}>
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

- [ ] **Step 4: Create nieuw page**

Create `app/admin/verkopen/nieuw/page.tsx`:

```typescript
import { SaleForm } from "../_SaleForm";
import { createSale } from "../actions";

export default function NieuwVerkoopPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="font-condensed font-black italic text-4xl text-gray-dark">Verkoop toevoegen</h1>
      </div>
      <SaleForm action={createSale} />
    </div>
  );
}
```

- [ ] **Step 5: Create edit page**

Create `app/admin/verkopen/[id]/page.tsx`:

```typescript
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase-admin";
import { Sale } from "@/lib/types";
import { SaleForm } from "../_SaleForm";
import { updateSale } from "../actions";

export default async function BewerkenVerkoopPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createAdminClient();
  const { data } = await supabase.from("sales").select("*").eq("id", id).single();
  if (!data) notFound();
  const sale = data as Sale;
  const action = updateSale.bind(null, id);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="font-condensed font-black italic text-4xl text-gray-dark">Verkoop bewerken</h1>
        <p className="text-gray-sub text-sm mt-1">{sale.name}</p>
      </div>
      <SaleForm sale={sale} action={action} />
    </div>
  );
}
```

- [ ] **Step 6: Add Verkopen to admin sidebar**

In `components/admin/AdminSidebar.tsx`, update the `navItems` array (add between Team and Producten):

```typescript
const navItems = [
  { href: "/admin", label: "Dashboard", icon: "⊞", exact: true },
  { href: "/admin/evenementen", label: "Evenementen", icon: "📅" },
  { href: "/admin/team", label: "Team", icon: "👥" },
  { href: "/admin/verkopen", label: "Verkopen", icon: "🏷️" },
  { href: "/admin/producten", label: "Producten", icon: "🛍️" },
  { href: "/admin/inschrijvingen", label: "Inschrijvingen", icon: "📋" },
  { href: "/admin/bestellingen", label: "Bestellingen", icon: "🛒" },
  { href: "/admin/donaties", label: "Donaties", icon: "💶" },
  { href: "/admin/sponsors", label: "Sponsors", icon: "🏢" },
  { href: "/admin/sponsor-aanvragen", label: "Sponsor-aanvragen", icon: "📨" },
  { href: "/admin/instellingen", label: "Instellingen", icon: "⚙️" },
];
```

- [ ] **Step 7: Commit**

```bash
git add app/admin/verkopen/ components/admin/AdminSidebar.tsx
git -c commit.gpgsign=false commit -m "feat: admin verkopen CRUD for configurable sale campaigns"
```

---

## Task 4: Update admin products — replace type with sale

**Files:**
- Modify: `app/admin/producten/actions.ts`
- Modify: `app/admin/producten/_ProductForm.tsx`
- Modify: `app/admin/producten/nieuw/page.tsx`
- Modify: `app/admin/producten/[id]/page.tsx`
- Modify: `app/admin/producten/page.tsx`

- [ ] **Step 1: Update actions.ts**

Replace `app/admin/producten/actions.ts` with:

```typescript
"use server";

import { createAdminClient } from "@/lib/supabase-admin";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createProduct(formData: FormData) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("products").insert({
    sale_id: formData.get("sale_id") as string,
    name: formData.get("name") as string,
    price_cents: Math.round(parseFloat(formData.get("price_euros") as string) * 100),
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

- [ ] **Step 2: Update _ProductForm.tsx**

Replace `app/admin/producten/_ProductForm.tsx` with:

```typescript
import { Product, Sale } from "@/lib/types";

export function ProductForm({
  product,
  sales,
  action,
}: {
  product?: Product;
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
          placeholder="Mars (doos 24 stuks)"
        />
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

- [ ] **Step 3: Update nieuw/page.tsx**

Replace `app/admin/producten/nieuw/page.tsx` with:

```typescript
import { createAdminClient } from "@/lib/supabase-admin";
import { Sale } from "@/lib/types";
import { ProductForm } from "../_ProductForm";
import { createProduct } from "../actions";

export default async function NieuwProductPage() {
  const supabase = createAdminClient();
  const { data } = await supabase.from("sales").select("*").order("sort_order");
  const sales: Sale[] = data ?? [];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="font-condensed font-black italic text-4xl text-gray-dark">Product toevoegen</h1>
      </div>
      <ProductForm sales={sales} action={createProduct} />
    </div>
  );
}
```

- [ ] **Step 4: Update [id]/page.tsx**

Replace `app/admin/producten/[id]/page.tsx` with:

```typescript
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase-admin";
import { Product, Sale } from "@/lib/types";
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
  const action = updateProduct.bind(null, id);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="font-condensed font-black italic text-4xl text-gray-dark">Product bewerken</h1>
        <p className="text-gray-sub text-sm mt-1">{product.name}</p>
      </div>
      <ProductForm product={product} sales={sales} action={action} />
    </div>
  );
}
```

- [ ] **Step 5: Update list page**

Replace `app/admin/producten/page.tsx` with:

```typescript
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase-admin";
import { Product } from "@/lib/types";
import { deleteProduct, toggleProductActive } from "./actions";
import { formatPrice } from "@/lib/format";

export default async function ProductenPage() {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("products")
    .select("*, sales(name)")
    .order("sort_order");
  const products: (Product & { sales: { name: string } | null })[] = data ?? [];

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
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm">{p.name}</span>
                {p.sales && <span className="text-[10px] font-bold bg-gray-100 text-gray-sub px-1.5 py-0.5 rounded-sm">{p.sales.name}</span>}
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

- [ ] **Step 6: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1
```

Expected: errors only in `app/api/checkout/bestelling/route.ts`, `app/steunen/page.tsx`, and `app/admin/bestellingen/page.tsx` — those are fixed in the next tasks.

- [ ] **Step 7: Commit**

```bash
git add app/admin/producten/ components/admin/AdminSidebar.tsx
git -c commit.gpgsign=false commit -m "feat: admin products use sale_id instead of hardcoded type"
```

---

## Task 5: Update checkout route and steunen page

**Files:**
- Modify: `app/api/checkout/bestelling/route.ts`
- Modify: `app/steunen/page.tsx`

- [ ] **Step 1: Update bestelling checkout route**

Replace `app/api/checkout/bestelling/route.ts` with:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase-admin";
import { Product } from "@/lib/types";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const sale_id = (formData.get("sale_id") as string)?.trim();
  const sale_slug = (formData.get("sale_slug") as string)?.trim();
  const name = (formData.get("name") as string)?.trim();
  const email = (formData.get("email") as string)?.trim();
  const phone = (formData.get("phone") as string)?.trim() ?? "";

  if (!sale_id || !sale_slug || !name || !email) {
    return NextResponse.json({ error: "Ongeldige invoer" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Fetch active products of this sale
  const { data: products } = await supabase
    .from("products")
    .select("*")
    .eq("sale_id", sale_id)
    .eq("is_active", true);

  const productMap = new Map((products ?? []).map((p: Product) => [p.id, p]));

  // Build items map from form data
  const items: Record<string, number> = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("items.")) {
      const productId = key.slice("items.".length);
      if (!productMap.has(productId)) continue;
      const qty = parseInt(value as string, 10);
      if (!isNaN(qty) && qty > 0) items[productId] = qty;
    }
  }

  const origin = req.headers.get("origin") ?? "http://localhost:3000";

  if (Object.keys(items).length === 0) {
    return NextResponse.redirect(new URL(`/steunen#${sale_slug}`, req.url));
  }

  // Write pending order
  const { data: order, error: dbError } = await supabase
    .from("orders")
    .insert({ sale_id, name, email, phone, items, status: "new", payment_status: "pending" })
    .select("id")
    .single();

  if (dbError || !order) {
    return NextResponse.json({ error: "Database fout" }, { status: 500 });
  }

  // Build line items for Stripe
  const lineItems = Object.entries(items).map(([productId, qty]) => {
    const product = productMap.get(productId)!;
    return {
      price_data: {
        currency: "eur",
        product_data: { name: product.name },
        unit_amount: product.price_cents,
      },
      quantity: qty,
    };
  });

  const session = await stripe.checkout.sessions.create({
    line_items: lineItems,
    mode: "payment",
    customer_email: email,
    metadata: { type: "bestelling", record_id: order.id },
    success_url: `${origin}/steunen?betaald=${sale_slug}`,
    cancel_url: `${origin}/steunen#${sale_slug}`,
  });

  return NextResponse.redirect(session.url!, 303);
}
```

- [ ] **Step 2: Update steunen page**

Replace `app/steunen/page.tsx` with:

```typescript
import Link from "next/link";
import { Suspense } from "react";
import { ScrollToSection } from "@/components/ScrollToSection";
import { createAdminClient } from "@/lib/supabase-admin";
import { Product, Sale } from "@/lib/types";
import { DonatieForm } from "./_DonatieForm";

export default async function SteunenPage({
  searchParams,
}: {
  searchParams: Promise<{ betaald?: string }>;
}) {
  const { betaald } = await searchParams;
  const supabase = createAdminClient();

  const { data: salesData } = await supabase
    .from("sales")
    .select("*")
    .eq("is_active", true)
    .order("sort_order");

  const sales: Sale[] = salesData ?? [];

  // Fetch all active products for active sales in one query
  const { data: productsData } = await supabase
    .from("products")
    .select("*")
    .eq("is_active", true)
    .order("sort_order");

  const productsBySale = new Map<string, Product[]>();
  for (const p of (productsData ?? []) as Product[]) {
    const list = productsBySale.get(p.sale_id) ?? [];
    list.push(p);
    productsBySale.set(p.sale_id, list);
  }

  return (
    <div className="pt-16">
      <Suspense fallback={null}>
        <ScrollToSection />
      </Suspense>

      {betaald && (
        <div className="bg-green-50 border-b border-green-200 px-6 py-3 text-center text-sm font-semibold text-green-800">
          {betaald === "donatie"
            ? "Bedankt voor je donatie! Je ontvangt een bevestiging per e-mail."
            : "Bestelling ontvangen! Je ontvangt een bevestiging per e-mail."}
        </div>
      )}

      <div className="bg-gray-dark py-14 px-6 relative overflow-hidden">
        <div className="max-w-5xl mx-auto relative">
          <div className="text-sm text-gray-sub mb-4">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            {" / "}
            <span className="text-red-sportac">Steunen</span>
          </div>
          <h1 className="font-condensed font-black italic text-6xl leading-none text-white mb-3">
            Steun <em className="not-italic text-red-sportac">Sportac 86</em>
          </h1>
          <p className="text-gray-sub text-[15px] max-w-lg leading-relaxed">
            De reis, het verblijf en de deelname voor onze delegatie van 9 personen kosten
            ongeveer <strong className="text-white">€ 15.000</strong>. Elke euro helpt ons
            dichter bij Noorwegen. Kies hoe je wil bijdragen.
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-14 flex flex-col gap-16">

        {/* Donate */}
        <section id="doneer">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-5 h-0.5 bg-red-sportac" />
            <span className="text-xs font-bold tracking-[0.2em] uppercase text-red-sportac">Doneer</span>
          </div>
          <h2 className="font-condensed font-black italic text-4xl text-gray-dark mb-5">Rechtstreeks steunen</h2>
          <div className="bg-white border border-[#e8e4df] rounded-sm p-8 max-w-lg">
            <p className="text-gray-body text-sm leading-relaxed mb-6">
              Steun ons rechtstreeks via een veilige online betaling. Kies een bedrag of vul zelf in.
            </p>
            <DonatieForm />
            <div className="mt-6 bg-gray-warm rounded-sm p-4 font-mono text-sm">
              <p className="text-xs font-sans text-gray-sub mb-2 not-italic">Of via overschrijving:</p>
              <p><strong>BE89 0689 4858 8285</strong></p>
              <p className="text-gray-sub">Sportac 86 Deinze</p>
              <p className="text-gray-sub">Mededeling: EK Ropeskipping Noorwegen 2026</p>
            </div>
          </div>
        </section>

        {/* Dynamic sale sections */}
        {sales.map((sale) => {
          const products = productsBySale.get(sale.id) ?? [];
          return (
            <section key={sale.id} id={sale.slug}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-5 h-0.5 bg-red-sportac" />
                <span className="text-xs font-bold tracking-[0.2em] uppercase text-red-sportac">{sale.name}</span>
              </div>
              <h2 className="font-condensed font-black italic text-4xl text-gray-dark mb-5">{sale.name} bestellen</h2>
              <div className="bg-white border border-[#e8e4df] rounded-sm p-8 max-w-lg">
                {sale.description && (
                  <p className="text-gray-body text-sm leading-relaxed mb-6">{sale.description}</p>
                )}
                <form action="/api/checkout/bestelling" method="POST" className="flex flex-col gap-4">
                  <input type="hidden" name="sale_id" value={sale.id} />
                  <input type="hidden" name="sale_slug" value={sale.slug} />
                  {products.map((p: Product) => (
                    <div key={p.id} className="flex items-center justify-between">
                      <label className="text-sm font-semibold">{p.name}</label>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-sub">€{(p.price_cents / 100).toFixed(2)}</span>
                        <input
                          type="number"
                          name={`items.${p.id}`}
                          min={0}
                          defaultValue={0}
                          className="w-16 border border-[#e8e4df] rounded-sm px-2 py-1 text-sm text-center focus:outline-none focus:border-red-sportac"
                        />
                      </div>
                    </div>
                  ))}
                  {products.length === 0 && (
                    <p className="text-sm text-gray-sub">Geen producten beschikbaar.</p>
                  )}
                  <hr className="border-[#e8e4df]" />
                  <div>
                    <label className="block text-sm font-semibold mb-1">Naam *</label>
                    <input type="text" name="name" required className="w-full border border-[#e8e4df] rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-red-sportac" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1">E-mailadres *</label>
                    <input type="email" name="email" required className="w-full border border-[#e8e4df] rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-red-sportac" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1">Telefoonnummer</label>
                    <input type="tel" name="phone" className="w-full border border-[#e8e4df] rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-red-sportac" />
                  </div>
                  <button type="submit" className="bg-red-sportac text-white font-bold py-3 rounded-sm hover:bg-red-600 transition-colors text-sm">
                    Bestelling plaatsen &amp; betalen
                  </button>
                </form>
              </div>
            </section>
          );
        })}

      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1
```

Expected: errors only in `app/admin/bestellingen/page.tsx` — fixed in next task.

- [ ] **Step 4: Commit**

```bash
git add app/api/checkout/bestelling/ app/steunen/
git -c commit.gpgsign=false commit -m "feat: steunen page and checkout use dynamic sales from DB"
```

---

## Task 6: Update admin bestellingen page

**Files:**
- Modify: `app/admin/bestellingen/page.tsx`

- [ ] **Step 1: Update bestellingen page**

Replace `app/admin/bestellingen/page.tsx` with:

```typescript
import { createAdminClient } from "@/lib/supabase-admin";
import { Order } from "@/lib/types";
import { toggleOrderStatus } from "./actions";

export default async function BestellingenPage() {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("orders")
    .select("*, sales(name)")
    .order("created_at", { ascending: false });
  const orders: (Order & { sales: { name: string } | null })[] = data ?? [];

  const newOrders = orders.filter((o) => o.status === "new");
  const handledOrders = orders.filter((o) => o.status === "handled");

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="font-condensed font-black italic text-4xl text-gray-dark">Bestellingen</h1>
        <p className="text-gray-sub text-sm mt-1">{newOrders.length} nieuw · {handledOrders.length} afgehandeld</p>
      </div>

      {orders.length === 0 && <p className="text-gray-sub text-sm">Nog geen bestellingen.</p>}

      <div className="flex flex-col gap-3">
        {orders.map((o) => (
          <div key={o.id} className={`bg-white border rounded-sm p-4 flex items-start gap-4 ${o.status === "new" ? "border-red-sportac/40" : "border-[#e8e4df]"}`}>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-sm">{o.name}</span>
                {o.sales && <span className="text-[10px] font-bold bg-gray-100 text-gray-sub px-1.5 py-0.5 rounded-sm uppercase">{o.sales.name}</span>}
                {o.status === "new" && <span className="text-[10px] font-bold bg-red-sportac/10 text-red-sportac px-1.5 py-0.5 rounded-sm">Nieuw</span>}
                {o.payment_status === "paid" && <span className="text-[10px] font-bold bg-green-100 text-green-700 px-1.5 py-0.5 rounded-sm">Betaald</span>}
                {o.payment_status === "pending" && <span className="text-[10px] font-bold bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-sm">In afwachting</span>}
              </div>
              <p className="text-xs text-gray-sub mb-1">{o.email}{o.phone ? ` · ${o.phone}` : ""}</p>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {Object.entries(o.items).map(([productId, qty]) => (
                  <span key={productId} className="text-[11px] bg-gray-100 px-2 py-0.5 rounded-sm">
                    {productId} ×{qty}
                  </span>
                ))}
              </div>
              <p className="text-[11px] text-gray-sub mt-1.5">{new Date(o.created_at).toLocaleDateString("nl-BE", { day: "numeric", month: "long", year: "numeric" })}</p>
            </div>
            <form action={toggleOrderStatus.bind(null, o.id, o.status)}>
              <button type="submit" className={`text-xs font-semibold px-3 py-1.5 rounded-sm border transition-colors ${o.status === "new" ? "border-green-500 text-green-700 hover:bg-green-50" : "border-[#e8e4df] text-gray-sub hover:border-gray-400"}`}>
                {o.status === "new" ? "✓ Afgehandeld" : "↩ Opnieuw openen"}
              </button>
            </form>
          </div>
        ))}
      </div>
    </div>
  );
}
```

Note: product names in order items are stored as UUIDs (product IDs) in the `items` jsonb. They display as raw IDs here — this is acceptable since the admin can cross-reference with the products list. A future improvement could join product names, but YAGNI.

- [ ] **Step 2: Verify TypeScript — no errors**

```bash
npx tsc --noEmit 2>&1
```

Expected: no errors.

- [ ] **Step 3: Commit and push**

```bash
git add app/admin/bestellingen/
git -c commit.gpgsign=false commit -m "feat: bestellingen page uses sale name from join instead of hardcoded type"
git push
```

---

## Self-Review

**Spec coverage:**
- ✅ `sales` table with name, slug, description, is_active, sort_order
- ✅ `products.type` replaced by `products.sale_id`
- ✅ `orders.type` replaced by `orders.sale_id`
- ✅ Seeded Snoep + Wijn sales, linked existing products
- ✅ Admin CRUD for sales at `/admin/verkopen`
- ✅ Product form uses sale dropdown
- ✅ `/steunen` renders dynamic sections per active sale
- ✅ Checkout route uses `sale_id` + `sale_slug`
- ✅ Admin bestellingen shows sale name via join
- ✅ Cascade delete: deleting a sale deletes its products

**Placeholder scan:** None found.

**Type consistency:** `Sale`, `Product.sale_id`, `Order.sale_id` used consistently across all tasks.
