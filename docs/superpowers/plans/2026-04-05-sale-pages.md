# Sale Pages & Steunen Overview Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give each sale campaign a dedicated page at `/steunen/[slug]` with hero banner + Stripe order form, and redesign `/steunen` as a clean overview hub.

**Architecture:** `/steunen` becomes a hub with static tiles (Doneer, Spaghettiavond) plus dynamic sale tiles from DB, keeping the donation form at `#doneer`. `/steunen/[slug]` is a new server-rendered page per sale with hero + order form posting to the existing `/api/checkout/bestelling` endpoint. The checkout route's success/cancel URLs are updated to point to the dedicated sale page.

**Tech Stack:** Next.js 16.2 App Router, Supabase (createAdminClient), Tailwind CSS v4, TypeScript strict mode.

---

## File Structure

- **Modify:** `app/steunen/page.tsx` — rewrite as overview hub (remove inline order forms, add sale cards)
- **Create:** `app/steunen/[slug]/page.tsx` — new dedicated sale page
- **Modify:** `app/api/checkout/bestelling/route.ts` — update success_url and cancel_url to `/steunen/[slug]`

---

### Task 1: Update checkout success/cancel URLs

The bestelling checkout route currently redirects to `/steunen?betaald=${sale_slug}` on success and `/steunen#${sale_slug}` on cancel. These should point to the new dedicated sale page.

**Files:**
- Modify: `app/api/checkout/bestelling/route.ts:70-77`

- [ ] **Step 1: Open the file and find the Stripe session creation block**

Read `app/api/checkout/bestelling/route.ts`. The relevant lines are around 70-77:
```ts
const session = await stripe.checkout.sessions.create({
  ...
  success_url: `${origin}/steunen?betaald=${sale_slug}`,
  cancel_url: `${origin}/steunen#${sale_slug}`,
});
```

- [ ] **Step 2: Update the URLs**

Replace those two lines:
```ts
  success_url: `${origin}/steunen/${sale_slug}?betaald=1`,
  cancel_url: `${origin}/steunen/${sale_slug}`,
```

- [ ] **Step 3: Verify the file compiles**

```bash
cd /home/nicoekkart/play/sportac86-ek && npx tsc --noEmit 2>&1 | head -20
```
Expected: no errors (or only pre-existing unrelated errors).

- [ ] **Step 4: Commit**

```bash
git add app/api/checkout/bestelling/route.ts
git -c commit.gpgsign=false commit -m "fix(checkout): redirect to dedicated sale page after payment"
```

---

### Task 2: Create `/steunen/[slug]` dedicated sale page

New server component. Fetches sale by slug (404 if not found/inactive), fetches its active products, renders hero + order form. Shows success banner when `?betaald=1` is in searchParams.

**Files:**
- Create: `app/steunen/[slug]/page.tsx`

**Context to know:**
- `params` and `searchParams` are Promises in Next.js 16 — must be awaited
- Use `createAdminClient()` from `@/lib/supabase-admin` for all DB reads (sales table has no public RLS read policy)
- `notFound()` is imported from `next/navigation`
- Design tokens: `bg-gray-dark` for hero, `font-condensed font-black italic` for headings, `text-red-sportac` for brand accents, `text-gray-sub` for muted text, `border-[#e8e4df]` for borders
- The `Sale` and `Product` types are in `lib/types.ts`:
  ```ts
  type Sale = { id: string; name: string; slug: string; description: string; icon: string; is_active: boolean; sort_order: number; created_at: string; }
  type Product = { id: string; sale_id: string; name: string; price_cents: number; is_active: boolean; sort_order: number; created_at: string; }
  ```
- The order form posts to `/api/checkout/bestelling` with: `sale_id` (hidden), `sale_slug` (hidden), `items.{productId}` (number inputs), `name`, `email`, `phone`

- [ ] **Step 1: Create the file**

Create `app/steunen/[slug]/page.tsx` with this full content:

```tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase-admin";
import { Sale, Product } from "@/lib/types";

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

  const { data: productsData } = await supabase
    .from("products")
    .select("*")
    .eq("sale_id", sale.id)
    .eq("is_active", true)
    .order("sort_order");

  const products: Product[] = productsData ?? [];

  return (
    <div className="pt-16">
      {betaald && (
        <div className="bg-green-50 border-b border-green-200 px-6 py-3 text-center text-sm font-semibold text-green-800">
          Bestelling ontvangen! Je ontvangt een bevestiging per e-mail.
        </div>
      )}

      {/* Hero */}
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

      {/* Order form */}
      <div className="max-w-5xl mx-auto px-6 py-14">
        <div className="bg-white border border-[#e8e4df] rounded-sm p-8 max-w-lg">
          <form action="/api/checkout/bestelling" method="POST" className="flex flex-col gap-4">
            <input type="hidden" name="sale_id" value={sale.id} />
            <input type="hidden" name="sale_slug" value={sale.slug} />

            {products.map((p: Product) => (
              <div key={p.id} className="flex items-center justify-between">
                <label className="text-sm font-semibold">{p.name}</label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-sub">
                    €{(p.price_cents / 100).toFixed(2)}
                  </span>
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

            <button
              type="submit"
              className="bg-red-sportac text-white font-bold py-3 rounded-sm hover:bg-red-600 transition-colors text-sm"
            >
              Bestelling plaatsen &amp; betalen
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /home/nicoekkart/play/sportac86-ek && npx tsc --noEmit 2>&1 | head -20
```
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add app/steunen/[slug]/page.tsx
git -c commit.gpgsign=false commit -m "feat(steunen): add dedicated sale page /steunen/[slug]"
```

---

### Task 3: Rewrite `/steunen` as overview hub

Remove all inline order forms. Keep the donation section (`#doneer`) with `<DonatieForm />`. Add an overview section at the top with `<SupportTile>` cards: static tiles for Doneer + Spaghettiavond, dynamic tiles per active sale linking to `/steunen/[slug]`.

**Files:**
- Modify: `app/steunen/page.tsx`

**Context to know:**
- `SupportTile` is at `components/SupportTile.tsx`, accepts: `{ icon, title, description, actionLabel, href }`
- `DonatieForm` is at `app/steunen/_DonatieForm.tsx` — keep as-is
- `createAdminClient()` from `@/lib/supabase-admin` for sales fetch
- The current page has `searchParams: Promise<{ betaald?: string }>` — the `betaald` param was previously `sale_slug`, now it will be `"1"` (from the updated checkout route). Remove the betaald banner from this page since it now lives on the dedicated sale page.
- Design tokens same as above. The overview section uses `bg-white` with a max-w-5xl container.
- `Sale` type from `lib/types.ts` (shown in Task 2 context)

- [ ] **Step 1: Rewrite `app/steunen/page.tsx`**

Replace the entire file with:

```tsx
import Link from "next/link";
import { Suspense } from "react";
import { ScrollToSection } from "@/components/ScrollToSection";
import { SupportTile } from "@/components/SupportTile";
import { createAdminClient } from "@/lib/supabase-admin";
import { Sale } from "@/lib/types";
import { DonatieForm } from "./_DonatieForm";

export default async function SteunenPage() {
  const supabase = createAdminClient();

  const { data: salesData } = await supabase
    .from("sales")
    .select("*")
    .eq("is_active", true)
    .order("sort_order");

  const sales: Sale[] = salesData ?? [];

  const staticTiles = [
    {
      icon: "❤️",
      title: "Doneer",
      description: "Stort een vrij bedrag rechtstreeks ten voordele van het team.",
      actionLabel: "Doneer nu",
      href: "/steunen#doneer",
    },
    {
      icon: "🍝",
      title: "Spaghettiavond",
      description: "Schrijf je in voor onze gezellige spaghettiavond en steun ons tegelijk.",
      actionLabel: "Inschrijven",
      href: "/agenda",
    },
  ];

  const saleTiles = sales.map((sale) => ({
    icon: sale.icon,
    title: `${sale.name} bestellen`,
    description: sale.description,
    actionLabel: "Meer info & bestellen",
    href: `/steunen/${sale.slug}`,
  }));

  const allTiles = [...staticTiles, ...saleTiles];

  return (
    <div className="pt-16">
      <Suspense fallback={null}>
        <ScrollToSection />
      </Suspense>

      {/* Hero */}
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

      {/* Support tiles overview */}
      <div className="bg-white py-14 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-2 mb-8">
            <div className="w-5 h-0.5 bg-red-sportac" />
            <span className="text-xs font-bold tracking-[0.2em] uppercase text-red-sportac">
              Kies hoe je steunt
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-0.5 bg-[#2a2a2a] rounded-sm overflow-hidden">
            {allTiles.map((tile) => (
              <SupportTile key={tile.title} {...tile} />
            ))}
          </div>
        </div>
      </div>

      {/* Donate section */}
      <div className="max-w-5xl mx-auto px-6 py-14">
        <section id="doneer">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-5 h-0.5 bg-red-sportac" />
            <span className="text-xs font-bold tracking-[0.2em] uppercase text-red-sportac">Doneer</span>
          </div>
          <h2 className="font-condensed font-black italic text-4xl text-gray-dark mb-5">
            Rechtstreeks steunen
          </h2>
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
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /home/nicoekkart/play/sportac86-ek && npx tsc --noEmit 2>&1 | head -20
```
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add app/steunen/page.tsx
git -c commit.gpgsign=false commit -m "feat(steunen): rewrite overview page as support hub"
```

---

### Task 4: Push and verify

- [ ] **Step 1: Push to remote**

```bash
git push
```

- [ ] **Step 2: Manual smoke test**

Visit `/steunen` — should show hero, tiles grid (Doneer, Spaghettiavond, + any active sales), and donation form at bottom.

Visit `/steunen/snoep` (or any active sale slug) — should show hero with icon + name, order form with products, no errors.

Visit `/steunen/nonexistent` — should show Next.js 404 page.

After a test Stripe checkout on a sale page, you should be redirected back to `/steunen/[slug]?betaald=1` and see the green success banner.
