# Sale Pages & Steunen Overview Redesign

## Goal

Give each sale campaign a dedicated page with a hero banner, description, and Stripe checkout. Redesign `/steunen` as a clean overview hub linking to all support options.

## Architecture

- `/steunen` becomes an overview page: static cards for Doneer + Spaghettiavond, plus one dynamic card per active sale from the DB. The donation form stays on this page at `#doneer`.
- `/steunen/[slug]` is a new dynamic route — one page per sale, rendered server-side using the sale's slug. It fetches the sale and its products from Supabase, renders a hero + order form, and posts to the existing `/api/checkout/bestelling` endpoint.
- No new DB tables or columns needed. No admin changes needed.

## Pages

### `/steunen` (rewritten)

**Sections:**
1. Dark hero banner (matches site style — `bg-gray-dark`, condensed italic heading)
2. Donation section (`id="doneer"`) with `<DonatieForm />` — unchanged from current
3. Support options grid: cards for each way to contribute
   - "Doneer" card → `#doneer` anchor
   - "Spaghettiavond" card → `/agenda`
   - One card per active sale → `/steunen/[slug]`
   - Cards show: `icon`, `name`, short `description`, "Meer info & bestellen →" CTA
4. Cards use the existing `<SupportTile>` component (already handles icon/title/description/href)

**Data:** Fetches active sales ordered by `sort_order` from `sales` table.

### `/steunen/[slug]` (new)

**Route:** `app/steunen/[slug]/page.tsx`
- `params: Promise<{ slug: string }>` (Next.js 16 async params)
- Fetches sale by slug; 404 (notFound()) if not found or not active
- Fetches active products for that sale ordered by `sort_order`

**Sections:**
1. Breadcrumb: Home / Steunen / [Sale name]
2. Hero banner: dark background (`bg-gray-dark`), large condensed italic heading with sale icon + name, description paragraph
3. Order form (same structure as current inline forms on `/steunen`):
   - Product rows: name, price, quantity input
   - Name, email, phone fields
   - Hidden inputs: `sale_id`, `sale_slug`
   - Submit → POST `/api/checkout/bestelling`
4. Success banner when `searchParams.betaald` is present (same pattern as `/agenda/[slug]`)

**File:** `app/steunen/[slug]/page.tsx` — self-contained server component, no shared form component needed (form is simple enough inline).

## Data Flow

```
/steunen/[slug]
  → fetch sale by slug (createAdminClient)
  → fetch products by sale_id (createAdminClient)
  → render form
  → POST /api/checkout/bestelling (existing, unchanged)
  → Stripe checkout
  → redirect back to /steunen/[slug]?betaald=1
  → show success banner
```

The checkout route already accepts `sale_id` and `sale_slug` as hidden form inputs and redirects to `/steunen/${sale_slug}?betaald=1` on success — this already works correctly for the new dedicated page URL.

## What Changes

| File | Change |
|---|---|
| `app/steunen/page.tsx` | Rewrite: remove inline order forms, add sale cards grid |
| `app/steunen/[slug]/page.tsx` | New: dedicated sale page |
| `app/api/checkout/bestelling/route.ts` | Change `success_url` from `/steunen?betaald=${sale_slug}` to `/steunen/${sale_slug}?betaald=1`; change `cancel_url` from `/steunen#${sale_slug}` to `/steunen/${sale_slug}` |

## What Stays the Same

- `app/steunen/_DonatieForm.tsx` — unchanged
- `/api/checkout/bestelling` — unchanged
- `sales` + `products` DB tables — unchanged
- Admin CRUD — unchanged
- `SupportTile` component — unchanged
