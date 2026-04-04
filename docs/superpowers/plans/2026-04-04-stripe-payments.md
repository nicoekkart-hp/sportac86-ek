# Stripe Payments & Admin Products Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all manual order/registration/donation flows with Stripe Checkout, and make candy/wine products configurable in the admin.

**Architecture:** Each form POSTs to a Next.js API route that creates a Stripe Checkout Session and writes a `pending` record to Supabase, storing only the record ID in Stripe metadata. A webhook handler receives `checkout.session.completed`, looks up the record by ID, and flips it to `paid`. Free event registrations bypass Stripe entirely.

**Tech Stack:** Next.js 16 App Router, Supabase (PostgreSQL + RLS), Stripe Node SDK (`stripe` npm package), TypeScript strict mode, Tailwind CSS v4.

---

## File Map

### New files
- `supabase/migrations/007_products.sql` — products table + seed data
- `supabase/migrations/008_payment_columns.sql` — payment columns on orders, registrations, donations
- `supabase/migrations/009_remove_gofundme.sql` — remove gofundme_url from settings
- `lib/stripe.ts` — Stripe client singleton
- `app/api/checkout/donatie/route.ts` — Checkout session for donations
- `app/api/checkout/bestelling/route.ts` — Checkout session for candy/wine orders
- `app/api/checkout/inschrijving/route.ts` — Checkout session for event registrations
- `app/api/webhooks/stripe/route.ts` — Webhook handler
- `app/admin/producten/page.tsx` — Product list
- `app/admin/producten/nieuw/page.tsx` — New product form page
- `app/admin/producten/[id]/page.tsx` — Edit product form page
- `app/admin/producten/_ProductForm.tsx` — Shared product form component
- `app/admin/producten/actions.ts` — createProduct, updateProduct, deleteProduct, toggleActive

### Modified files
- `lib/types.ts` — add Product type, update Order/Registration/Donation with payment fields
- `app/steunen/page.tsx` — donation form with presets, products from DB, Stripe form actions
- `app/agenda/[slug]/page.tsx` — paid events POST to checkout route
- `components/admin/AdminSidebar.tsx` — add Producten nav item
- `app/admin/instellingen/page.tsx` — remove GoFundMe field
- `app/admin/instellingen/actions.ts` — remove gofundme_url handling
- `.env.local` — add STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET

---

## Task 1: Install Stripe and add environment variables

**Files:**
- Modify: `package.json` (via npm)
- Modify: `.env.local`

- [ ] **Step 1: Install stripe**

```bash
npm install stripe
```

Expected output: `added 1 package` (or similar)

- [ ] **Step 2: Add env vars to .env.local**

Add these lines to `.env.local` (use your Stripe test keys for now):

```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

Get `STRIPE_SECRET_KEY` from https://dashboard.stripe.com/test/apikeys  
Get `STRIPE_WEBHOOK_SECRET` after setting up the webhook in Task 9.  
For now set `STRIPE_WEBHOOK_SECRET=placeholder` — you'll update it in Task 9.

- [ ] **Step 3: Create Stripe client singleton**

Create `lib/stripe.ts`:

```typescript
import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("Missing STRIPE_SECRET_KEY");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-02-24.acacia",
});
```

- [ ] **Step 4: Commit**

```bash
git add lib/stripe.ts .env.local package.json package-lock.json
git -c commit.gpgsign=false commit -m "feat: install stripe and add client singleton"
```

---

## Task 2: Database migrations — products table

**Files:**
- Create: `supabase/migrations/007_products.sql`

- [ ] **Step 1: Write migration**

Create `supabase/migrations/007_products.sql`:

```sql
create table products (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('candy', 'wine')),
  name text not null,
  price_cents integer not null,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table products enable row level security;

create policy "Public read active products" on products
  for select using (is_active = true);

create policy "Admin all products" on products
  for all using (auth.role() = 'authenticated');

-- Seed existing hardcoded products
insert into products (type, name, price_cents, sort_order) values
  ('candy', 'Mars (doos 24 stuks)', 1800, 1),
  ('candy', 'Snickers (doos 24 stuks)', 1800, 2),
  ('candy', 'Twix (doos 24 stuks)', 1800, 3),
  ('wine', 'Rode wijn — fles 75cl', 900, 1),
  ('wine', 'Witte wijn — fles 75cl', 900, 2),
  ('wine', 'Rosé — fles 75cl', 900, 3);
```

- [ ] **Step 2: Run migration in Supabase dashboard**

Go to Supabase Dashboard → SQL Editor → paste and run the contents of `007_products.sql`.

Verify: go to Table Editor → products → you should see 6 rows.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/007_products.sql
git -c commit.gpgsign=false commit -m "feat: add products table with candy/wine seed data"
```

---

## Task 3: Database migrations — payment columns

**Files:**
- Create: `supabase/migrations/008_payment_columns.sql`
- Create: `supabase/migrations/009_remove_gofundme.sql`

- [ ] **Step 1: Write migration 008**

Create `supabase/migrations/008_payment_columns.sql`:

```sql
alter table orders
  add column stripe_session_id text,
  add column payment_status text not null default 'pending'
    check (payment_status in ('pending', 'paid', 'failed'));

alter table registrations
  add column stripe_session_id text,
  add column payment_status text not null default 'pending'
    check (payment_status in ('pending', 'paid', 'failed'));

alter table donations
  add column stripe_session_id text,
  add column payment_status text not null default 'pending'
    check (payment_status in ('pending', 'paid', 'failed'));
```

- [ ] **Step 2: Write migration 009**

Create `supabase/migrations/009_remove_gofundme.sql`:

```sql
delete from settings where key = 'gofundme_url';
```

- [ ] **Step 3: Run both migrations in Supabase dashboard**

Run `008_payment_columns.sql` first, then `009_remove_gofundme.sql`.

Verify: check orders/registrations/donations tables have `stripe_session_id` and `payment_status` columns.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/008_payment_columns.sql supabase/migrations/009_remove_gofundme.sql
git -c commit.gpgsign=false commit -m "feat: add payment columns and remove gofundme setting"
```

---

## Task 4: Update TypeScript types

**Files:**
- Modify: `lib/types.ts`

- [ ] **Step 1: Add Product type and update existing types**

Replace the contents of `lib/types.ts` with:

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
  type: "candy" | "wine";
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
  type: "candy" | "wine";
  name: string;
  price_cents: number;
  is_active: boolean;
  sort_order: number;
  created_at: string;
};
```

- [ ] **Step 2: Verify no TypeScript errors**

```bash
npx tsc --noEmit
```

Fix any errors before continuing.

- [ ] **Step 3: Commit**

```bash
git add lib/types.ts
git -c commit.gpgsign=false commit -m "feat: add Product type, add payment fields to existing types"
```

---

## Task 5: Admin products CRUD

**Files:**
- Create: `app/admin/producten/actions.ts`
- Create: `app/admin/producten/_ProductForm.tsx`
- Create: `app/admin/producten/page.tsx`
- Create: `app/admin/producten/nieuw/page.tsx`
- Create: `app/admin/producten/[id]/page.tsx`
- Modify: `components/admin/AdminSidebar.tsx`

- [ ] **Step 1: Create actions.ts**

Create `app/admin/producten/actions.ts`:

```typescript
"use server";

import { createAdminClient } from "@/lib/supabase-admin";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createProduct(formData: FormData) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("products").insert({
    type: formData.get("type") as string,
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
    type: formData.get("type") as string,
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

- [ ] **Step 2: Create _ProductForm.tsx**

Create `app/admin/producten/_ProductForm.tsx`:

```typescript
import { Product } from "@/lib/types";

const types = [
  { value: "candy", label: "Snoep" },
  { value: "wine", label: "Wijn" },
];

export function ProductForm({ product, action }: { product?: Product; action: (formData: FormData) => Promise<void> }) {
  return (
    <form action={action} className="flex flex-col gap-5 max-w-xl">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold mb-1">Type *</label>
          <select name="type" required defaultValue={product?.type ?? "candy"} className="w-full border border-[#e8e4df] rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-red-sportac bg-white">
            {types.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
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
        <input type="text" name="name" required defaultValue={product?.name} className="w-full border border-[#e8e4df] rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-red-sportac" placeholder="Mars (doos 24 stuks)" />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold mb-1">Volgorde</label>
          <input type="number" name="sort_order" min={0} defaultValue={product?.sort_order ?? 0} className="w-full border border-[#e8e4df] rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-red-sportac" />
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

- [ ] **Step 3: Create list page**

Create `app/admin/producten/page.tsx`:

```typescript
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase-admin";
import { Product } from "@/lib/types";
import { deleteProduct, toggleProductActive } from "./actions";
import { formatPrice } from "@/lib/format";

const TYPE_LABELS: Record<string, string> = { candy: "Snoep", wine: "Wijn" };

export default async function ProductenPage() {
  const supabase = createAdminClient();
  const { data } = await supabase.from("products").select("*").order("type").order("sort_order");
  const products: Product[] = data ?? [];

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
                <span className="text-[10px] font-bold bg-gray-100 text-gray-sub px-1.5 py-0.5 rounded-sm">{TYPE_LABELS[p.type]}</span>
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

- [ ] **Step 4: Create nieuw page**

Create `app/admin/producten/nieuw/page.tsx`:

```typescript
import { ProductForm } from "../_ProductForm";
import { createProduct } from "../actions";

export default function NieuwProductPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="font-condensed font-black italic text-4xl text-gray-dark">Product toevoegen</h1>
      </div>
      <ProductForm action={createProduct} />
    </div>
  );
}
```

- [ ] **Step 5: Create edit page**

Create `app/admin/producten/[id]/page.tsx`:

```typescript
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase-admin";
import { Product } from "@/lib/types";
import { ProductForm } from "../_ProductForm";
import { updateProduct } from "../actions";

export default async function BewerkenProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createAdminClient();
  const { data } = await supabase.from("products").select("*").eq("id", id).single();
  if (!data) notFound();
  const product = data as Product;
  const action = updateProduct.bind(null, id);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="font-condensed font-black italic text-4xl text-gray-dark">Product bewerken</h1>
        <p className="text-gray-sub text-sm mt-1">{product.name}</p>
      </div>
      <ProductForm product={product} action={action} />
    </div>
  );
}
```

- [ ] **Step 6: Add Producten to admin sidebar**

In `components/admin/AdminSidebar.tsx`, update the `navItems` array:

```typescript
const navItems = [
  { href: "/admin", label: "Dashboard", icon: "⊞", exact: true },
  { href: "/admin/evenementen", label: "Evenementen", icon: "📅" },
  { href: "/admin/team", label: "Team", icon: "👥" },
  { href: "/admin/producten", label: "Producten", icon: "🛍️" },
  { href: "/admin/inschrijvingen", label: "Inschrijvingen", icon: "📋" },
  { href: "/admin/bestellingen", label: "Bestellingen", icon: "🛒" },
  { href: "/admin/donaties", label: "Donaties", icon: "💶" },
  { href: "/admin/sponsors", label: "Sponsors", icon: "🏢" },
  { href: "/admin/sponsor-aanvragen", label: "Sponsor-aanvragen", icon: "📨" },
  { href: "/admin/instellingen", label: "Instellingen", icon: "⚙️" },
];
```

- [ ] **Step 7: Update instellingen page — remove GoFundMe**

Replace `app/admin/instellingen/page.tsx` with:

```typescript
import { createAdminClient } from "@/lib/supabase-admin";

export default async function InstellingenPage() {
  const supabase = createAdminClient();
  const { data } = await supabase.from("settings").select("key, value");
  const settings = Object.fromEntries((data ?? []).map((r: { key: string; value: string }) => [r.key, r.value]));

  return (
    <div className="p-8 max-w-xl">
      <div className="mb-8">
        <h1 className="font-condensed font-black italic text-4xl text-gray-dark">Instellingen</h1>
        <p className="text-gray-sub text-sm mt-1">Configuratie</p>
      </div>
      <div className="bg-white border border-[#e8e4df] rounded-sm p-6">
        <h2 className="font-bold text-sm text-gray-dark mb-2">Stripe</h2>
        <p className="text-xs text-gray-sub leading-relaxed">
          Stripe sleutels worden beheerd via omgevingsvariabelen (<code>STRIPE_SECRET_KEY</code>, <code>STRIPE_WEBHOOK_SECRET</code>) in Vercel of <code>.env.local</code>. Ze worden hier niet getoond.
        </p>
      </div>
    </div>
  );
}
```

Replace `app/admin/instellingen/actions.ts` with:

```typescript
"use server";
// Settings are now managed via environment variables.
// This file is kept as a placeholder.
export async function saveSettings(_formData: FormData) {}
```

- [ ] **Step 8: Verify admin products section works**

Start dev server (`npm run dev`), log in to admin, navigate to `/admin/producten`.
Verify: products list shows the 6 seeded products with toggle/edit/delete buttons.
Test: edit a product price, save, verify it updates.

- [ ] **Step 9: Commit**

```bash
git add app/admin/producten/ components/admin/AdminSidebar.tsx app/admin/instellingen/
git -c commit.gpgsign=false commit -m "feat: admin products CRUD with candy/wine management"
```

---

## Task 6: Stripe checkout — donations

**Files:**
- Create: `app/api/checkout/donatie/route.ts`
- Modify: `app/steunen/page.tsx` (donations section only)

- [ ] **Step 1: Create donation checkout route**

Create `app/api/checkout/donatie/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase-admin";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const name = (formData.get("name") as string)?.trim();
  const email = (formData.get("email") as string)?.trim();
  const amountEuros = parseFloat(formData.get("amount_euros") as string);

  if (!name || !email || isNaN(amountEuros) || amountEuros < 1) {
    return NextResponse.json({ error: "Ongeldige invoer" }, { status: 400 });
  }

  const amount_cents = Math.round(amountEuros * 100);
  const origin = req.headers.get("origin") ?? "http://localhost:3000";

  // Write pending record first
  const supabase = createAdminClient();
  const { data: donation, error: dbError } = await supabase
    .from("donations")
    .insert({ name, email, amount_cents, payment_status: "pending" })
    .select("id")
    .single();

  if (dbError || !donation) {
    return NextResponse.json({ error: "Database fout" }, { status: 500 });
  }

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card", "bancontact", "ideal"],
    line_items: [
      {
        price_data: {
          currency: "eur",
          product_data: { name: "Donatie Sportac 86 EK Noorwegen 2026" },
          unit_amount: amount_cents,
        },
        quantity: 1,
      },
    ],
    mode: "payment",
    customer_email: email,
    metadata: { type: "donatie", record_id: donation.id },
    success_url: `${origin}/steunen?betaald=donatie`,
    cancel_url: `${origin}/steunen#doneer`,
  });

  return NextResponse.redirect(session.url!, 303);
}
```

- [ ] **Step 2: Update steunen page — donations section**

In `app/steunen/page.tsx`:

1. Remove the `gofundmeUrl` logic and the `createAdminClient` import for settings (keep it for products).
2. Replace the entire `{/* Donate */}` section with:

```tsx
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
    <form action="/api/checkout/donatie" method="POST" className="flex flex-col gap-4">
      <div>
        <label className="block text-sm font-semibold mb-2">Bedrag</label>
        <div className="flex gap-2 flex-wrap mb-2">
          {[5, 10, 25, 50].map((amount) => (
            <button
              key={amount}
              type="button"
              className="preset-amount border border-[#e8e4df] rounded-sm px-4 py-2 text-sm font-semibold hover:border-red-sportac hover:text-red-sportac transition-colors"
              onClick={(e) => {
                const form = e.currentTarget.closest("form")!;
                (form.querySelector('input[name="amount_euros"]') as HTMLInputElement).value = String(amount);
              }}
            >
              €{amount}
            </button>
          ))}
        </div>
        <input
          type="number"
          name="amount_euros"
          required
          min={1}
          step={1}
          className="w-full border border-[#e8e4df] rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-red-sportac"
          placeholder="Of vul zelf een bedrag in (€)"
        />
      </div>
      <div>
        <label className="block text-sm font-semibold mb-1">Naam</label>
        <input type="text" name="name" required className="w-full border border-[#e8e4df] rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-red-sportac" placeholder="Jouw naam" />
      </div>
      <div>
        <label className="block text-sm font-semibold mb-1">E-mailadres</label>
        <input type="email" name="email" required className="w-full border border-[#e8e4df] rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-red-sportac" placeholder="jouw@email.be" />
      </div>
      <button type="submit" className="bg-red-sportac text-white font-bold py-3 rounded-sm hover:bg-red-600 transition-colors text-sm">
        Betaal veilig via Stripe
      </button>
    </form>
    <div className="mt-6 bg-gray-warm rounded-sm p-4 font-mono text-sm">
      <p className="text-xs font-sans text-gray-sub mb-2 not-italic">Of via overschrijving:</p>
      <p><strong>BE89 0689 4858 8285</strong></p>
      <p className="text-gray-sub">Sportac 86 Deinze</p>
      <p className="text-gray-sub">Mededeling: EK Ropeskipping Noorwegen 2026</p>
    </div>
  </div>
</section>
```

Note: the preset amount buttons use `onClick` — the steunen page must become a client component OR extract just the donation section into a `"use client"` component. Extract it:

Create `app/steunen/_DonatieForm.tsx`:

```tsx
"use client";

export function DonatieForm() {
  return (
    <form action="/api/checkout/donatie" method="POST" className="flex flex-col gap-4">
      <div>
        <label className="block text-sm font-semibold mb-2">Bedrag</label>
        <div className="flex gap-2 flex-wrap mb-2">
          {[5, 10, 25, 50].map((amount) => (
            <button
              key={amount}
              type="button"
              className="border border-[#e8e4df] rounded-sm px-4 py-2 text-sm font-semibold hover:border-red-sportac hover:text-red-sportac transition-colors"
              onClick={(e) => {
                const form = (e.currentTarget as HTMLElement).closest("form")!;
                (form.querySelector('input[name="amount_euros"]') as HTMLInputElement).value = String(amount);
              }}
            >
              €{amount}
            </button>
          ))}
        </div>
        <input
          type="number"
          name="amount_euros"
          required
          min={1}
          step={1}
          className="w-full border border-[#e8e4df] rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-red-sportac"
          placeholder="Of vul zelf een bedrag in (€)"
        />
      </div>
      <div>
        <label className="block text-sm font-semibold mb-1">Naam</label>
        <input type="text" name="name" required className="w-full border border-[#e8e4df] rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-red-sportac" placeholder="Jouw naam" />
      </div>
      <div>
        <label className="block text-sm font-semibold mb-1">E-mailadres</label>
        <input type="email" name="email" required className="w-full border border-[#e8e4df] rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-red-sportac" placeholder="jouw@email.be" />
      </div>
      <button type="submit" className="bg-red-sportac text-white font-bold py-3 rounded-sm hover:bg-red-600 transition-colors text-sm">
        Betaal veilig via Stripe
      </button>
    </form>
  );
}
```

Then in `app/steunen/page.tsx` replace the donate form with `<DonatieForm />` and import it.

- [ ] **Step 3: Add success banner to steunen page**

In `app/steunen/page.tsx`, read `searchParams` and show a banner. Add to the page component params and near the top of the JSX:

```tsx
// Add to page component signature:
export default async function SteunenPage({
  searchParams,
}: {
  searchParams: Promise<{ betaald?: string }>;
}) {
  const { betaald } = await searchParams;
  // ... existing code ...

  // Add near top of JSX, before the header div:
  // {betaald && (
  //   <div className="bg-green-50 border-b border-green-200 px-6 py-3 text-center text-sm font-semibold text-green-800">
  //     {betaald === "donatie" && "Bedankt voor je donatie! Je ontvangt een bevestiging per e-mail."}
  //     {betaald === "snoep" && "Bestelling ontvangen! Je ontvangt een bevestiging per e-mail."}
  //     {betaald === "wijn" && "Bestelling ontvangen! Je ontvangt een bevestiging per e-mail."}
  //   </div>
  // )}
```

- [ ] **Step 4: Commit**

```bash
git add app/api/checkout/donatie/ app/steunen/
git -c commit.gpgsign=false commit -m "feat: Stripe Checkout for donations with preset amounts"
```

---

## Task 7: Stripe checkout — candy & wine orders

**Files:**
- Create: `app/api/checkout/bestelling/route.ts`
- Modify: `app/steunen/page.tsx` (candy & wine sections)

- [ ] **Step 1: Create order checkout route**

Create `app/api/checkout/bestelling/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase-admin";
import { Product } from "@/lib/types";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const type = formData.get("type") as string;
  const name = (formData.get("name") as string)?.trim();
  const email = (formData.get("email") as string)?.trim();
  const phone = (formData.get("phone") as string)?.trim() ?? "";

  if (!name || !email || (type !== "candy" && type !== "wine")) {
    return NextResponse.json({ error: "Ongeldige invoer" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Fetch active products of this type
  const { data: products } = await supabase
    .from("products")
    .select("*")
    .eq("type", type)
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

  if (Object.keys(items).length === 0) {
    return NextResponse.redirect(new URL(`/steunen?error=leeg#${type === "candy" ? "snoep" : "wijn"}`, req.url));
  }

  const origin = req.headers.get("origin") ?? "http://localhost:3000";
  const sectionType = type === "candy" ? "snoep" : "wijn";

  // Write pending order
  const { data: order, error: dbError } = await supabase
    .from("orders")
    .insert({ type, name, email, phone, items, status: "new", payment_status: "pending" })
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
    payment_method_types: ["card", "bancontact", "ideal"],
    line_items: lineItems,
    mode: "payment",
    customer_email: email,
    metadata: { type: "bestelling", record_id: order.id },
    success_url: `${origin}/steunen?betaald=${sectionType}`,
    cancel_url: `${origin}/steunen#${sectionType}`,
  });

  return NextResponse.redirect(session.url!, 303);
}
```

- [ ] **Step 2: Update steunen page — fetch products from DB**

In `app/steunen/page.tsx`:

1. Remove the hardcoded `CANDY_PRODUCTS` and `WINE_PRODUCTS` constants at the top of the file.
2. In the `SteunenPage` component, fetch products from DB (already fetching settings — replace with products):

```typescript
const supabase = createAdminClient();
const { data: productsData } = await supabase
  .from("products")
  .select("*")
  .eq("is_active", true)
  .order("sort_order");

const candyProducts = (productsData ?? []).filter((p: Product) => p.type === "candy");
const wineProducts = (productsData ?? []).filter((p: Product) => p.type === "wine");
```

3. Add `import { Product } from "@/lib/types";`

4. Update the snoep form to use `candyProducts` and POST to `/api/checkout/bestelling`:

```tsx
<form action="/api/checkout/bestelling" method="POST" className="flex flex-col gap-4">
  <input type="hidden" name="type" value="candy" />
  {candyProducts.map((p: Product) => (
    <div key={p.id} className="flex items-center justify-between">
      <label className="text-sm font-semibold">{p.name}</label>
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-sub">€{(p.price_cents / 100).toFixed(2)}</span>
        <input type="number" name={`items.${p.id}`} min={0} defaultValue={0} className="w-16 border border-[#e8e4df] rounded-sm px-2 py-1 text-sm text-center focus:outline-none focus:border-red-sportac" />
      </div>
    </div>
  ))}
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
    Bestelling plaatsen & betalen
  </button>
</form>
```

5. Apply the same pattern for the wijn form, using `wineProducts` and `value="wine"`.

- [ ] **Step 3: Commit**

```bash
git add app/api/checkout/bestelling/ app/steunen/
git -c commit.gpgsign=false commit -m "feat: Stripe Checkout for candy and wine orders from DB products"
```

---

## Task 8: Stripe checkout — event registrations

**Files:**
- Create: `app/api/checkout/inschrijving/route.ts`
- Modify: `app/agenda/[slug]/page.tsx`

- [ ] **Step 1: Create registration checkout route**

Create `app/api/checkout/inschrijving/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase-admin";
import { createServerClient } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const event_id = (formData.get("event_id") as string)?.trim();
  const name = (formData.get("name") as string)?.trim();
  const email = (formData.get("email") as string)?.trim();
  const num_persons = parseInt(formData.get("num_persons") as string, 10);
  const remarks = (formData.get("remarks") as string) || null;

  if (!event_id || !name || !email || isNaN(num_persons) || num_persons < 1) {
    return NextResponse.json({ error: "Ongeldige invoer" }, { status: 400 });
  }

  const supabase = createServerClient();
  const { data: event } = await supabase
    .from("events")
    .select("id, title, slug, price_cents, max_attendees")
    .eq("id", event_id)
    .eq("is_published", true)
    .single();

  if (!event) {
    return NextResponse.json({ error: "Evenement niet gevonden" }, { status: 404 });
  }

  const origin = req.headers.get("origin") ?? "http://localhost:3000";

  // Write pending registration
  const adminSupabase = createAdminClient();
  const { data: registration, error: dbError } = await adminSupabase
    .from("registrations")
    .insert({ event_id, name, email, num_persons, remarks, payment_status: "pending" })
    .select("id")
    .single();

  if (dbError || !registration) {
    return NextResponse.json({ error: "Database fout" }, { status: 500 });
  }

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card", "bancontact", "ideal"],
    line_items: [
      {
        price_data: {
          currency: "eur",
          product_data: { name: event.title },
          unit_amount: event.price_cents,
        },
        quantity: num_persons,
      },
    ],
    mode: "payment",
    customer_email: email,
    metadata: { type: "inschrijving", record_id: registration.id },
    success_url: `${origin}/agenda/${event.slug}?betaald=1`,
    cancel_url: `${origin}/agenda/${event.slug}#inschrijven`,
  });

  return NextResponse.redirect(session.url!, 303);
}
```

- [ ] **Step 2: Update agenda/[slug]/page.tsx — paid events**

In `app/agenda/[slug]/page.tsx`, update the registration form to conditionally use the checkout route for paid events:

```tsx
<form
  action={ev.price_cents > 0 ? "/api/checkout/inschrijving" : "/api/registrations"}
  method="POST"
  className="flex flex-col gap-4"
>
  {/* ... existing fields unchanged ... */}
  <button
    type="submit"
    className="bg-red-sportac text-white font-bold py-3 rounded-sm hover:bg-red-600 transition-colors text-sm"
  >
    {ev.price_cents > 0
      ? `Inschrijven & betalen — ${formatPrice(ev.price_cents)}/pers`
      : `Inschrijven — ${formatPrice(ev.price_cents)}`}
  </button>
</form>
```

Also add a success banner — read `searchParams`:

```tsx
export default async function EventDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ betaald?: string }>;
}) {
  const { slug } = await params;
  const { betaald } = await searchParams;
  // ...existing code...

  // Add before <div className="pt-16">:
  // {betaald && (
  //   <div className="bg-green-50 border-b border-green-200 px-6 py-3 text-center text-sm font-semibold text-green-800">
  //     Inschrijving bevestigd! Je ontvangt een bevestiging per e-mail.
  //   </div>
  // )}
```

- [ ] **Step 3: Commit**

```bash
git add app/api/checkout/inschrijving/ app/agenda/
git -c commit.gpgsign=false commit -m "feat: Stripe Checkout for paid event registrations"
```

---

## Task 9: Stripe webhook handler

**Files:**
- Create: `app/api/webhooks/stripe/route.ts`

- [ ] **Step 1: Create webhook route**

Create `app/api/webhooks/stripe/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase-admin";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "No signature" }, { status: 400 });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const { type, record_id } = session.metadata ?? {};

    if (!type || !record_id) {
      console.error("Missing metadata in session:", session.id);
      return NextResponse.json({ ok: true });
    }

    const supabase = createAdminClient();

    if (type === "donatie") {
      await supabase
        .from("donations")
        .update({ payment_status: "paid", stripe_session_id: session.id })
        .eq("id", record_id);
    } else if (type === "bestelling") {
      await supabase
        .from("orders")
        .update({ payment_status: "paid", stripe_session_id: session.id })
        .eq("id", record_id);
    } else if (type === "inschrijving") {
      await supabase
        .from("registrations")
        .update({ payment_status: "paid", stripe_session_id: session.id })
        .eq("id", record_id);
    }
  }

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Register webhook in Stripe dashboard**

1. Go to https://dashboard.stripe.com/test/webhooks
2. Click "Add endpoint"
3. URL: `https://your-vercel-domain.vercel.app/api/webhooks/stripe`  
   For local testing use Stripe CLI: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
4. Select event: `checkout.session.completed`
5. Copy the webhook signing secret
6. Add to `.env.local`: `STRIPE_WEBHOOK_SECRET=whsec_...`
7. Add to Vercel environment variables as well

- [ ] **Step 3: Test webhook locally with Stripe CLI**

```bash
# In a separate terminal:
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Make a test payment (use card `4242 4242 4242 4242`, any future expiry, any CVC).
Expected in Stripe CLI terminal: `checkout.session.completed` → `200 OK`
Expected in Supabase: record's `payment_status` updated to `paid`.

- [ ] **Step 4: Commit**

```bash
git add app/api/webhooks/
git -c commit.gpgsign=false commit -m "feat: Stripe webhook handler updates payment status on completion"
```

---

## Task 10: Admin views — filter by payment status

**Files:**
- Modify: `app/admin/bestellingen/page.tsx`
- Modify: `app/admin/donaties/page.tsx`
- Modify: `app/admin/inschrijvingen/page.tsx`

- [ ] **Step 1: Update bestellingen page — show payment status**

In `app/admin/bestellingen/page.tsx`, read the current file and add a `payment_status` badge next to each order. Find the order list rendering and add:

```tsx
{o.payment_status === "paid" && (
  <span className="text-[10px] font-bold bg-green-100 text-green-700 px-1.5 py-0.5 rounded-sm">Betaald</span>
)}
{o.payment_status === "pending" && (
  <span className="text-[10px] font-bold bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-sm">In afwachting</span>
)}
```

- [ ] **Step 2: Update donaties page — show payment status**

Same pattern as bestellingen: add `payment_status` badge to each donation row.

- [ ] **Step 3: Update inschrijvingen page — show payment status**

Same pattern: add `payment_status` badge to each registration row.

- [ ] **Step 4: Commit**

```bash
git add app/admin/bestellingen/ app/admin/donaties/ app/admin/inschrijvingen/
git -c commit.gpgsign=false commit -m "feat: show payment status badges in admin views"
```

---

## Task 11: Final verification & push

- [ ] **Step 1: Run TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 2: End-to-end test — donation**

1. Go to `/steunen#doneer`
2. Click €10 preset → verify amount field fills with 10
3. Fill name + email → submit
4. Verify redirect to Stripe Checkout page
5. Pay with test card `4242 4242 4242 4242`, exp `12/26`, CVC `123`
6. Verify redirect to `/steunen?betaald=donatie` with success banner
7. Verify Supabase `donations` table shows `payment_status = 'paid'`

- [ ] **Step 3: End-to-end test — order**

1. Go to `/steunen#snoep`
2. Set qty 1 for one product → fill name + email → submit
3. Complete test payment
4. Verify `/steunen?betaald=snoep` success banner
5. Verify Supabase `orders` table shows `payment_status = 'paid'`

- [ ] **Step 4: End-to-end test — registration (paid event)**

1. Create a paid event in admin (price > 0)
2. Go to `/agenda/[slug]#inschrijven`
3. Fill form → submit → verify Stripe redirect
4. Complete payment → verify success banner
5. Verify Supabase `registrations` shows `payment_status = 'paid'`

- [ ] **Step 5: Commit and push**

```bash
git -c commit.gpgsign=false commit --allow-empty -m "feat: complete Stripe payments integration"
git push
```

- [ ] **Step 6: Add env vars to Vercel**

In Vercel dashboard → Settings → Environment Variables, add:
- `STRIPE_SECRET_KEY` = `sk_live_...` (use live key for production)
- `STRIPE_WEBHOOK_SECRET` = `whsec_...` (from Stripe dashboard webhook)

Update Stripe webhook URL to the production domain.
