# Stripe Payments & Admin Product Configuration — Design Spec

**Date:** 2026-04-04  
**Project:** Sportac 86 EK fundraising site  
**Status:** Approved

---

## Overview

Replace all manual order/registration/donation flows with Stripe Checkout. Add an admin products section so candy and wine products are configurable, not hardcoded. Stripe sends receipt emails to customers automatically — no custom email infrastructure needed.

---

## Scope

**In scope:**
- Stripe Checkout for: donations (pay-what-you-want), candy orders, wine orders, event registrations (paid events only)
- Webhook handler to write records to Supabase only after confirmed payment
- Admin products CRUD (candy & wine)
- Admin settings: Stripe secret key, Stripe webhook secret
- Remove GoFundMe URL setting (replaced by donation Checkout)
- Free events (price_cents = 0) continue to register directly without payment

**Out of scope:**
- Custom confirmation emails (Stripe sends receipt automatically)
- Admin notification emails
- Refunds (handled manually in Stripe dashboard)
- Subscription/recurring donations

---

## Architecture

### Payment flow

```
1. User fills form on /steunen or /agenda/[slug]
2. Form POSTs to /api/checkout/[type]
3. API route creates Stripe Checkout Session with line items
4. API route returns { url } → browser redirects to Stripe
5. User completes payment on Stripe hosted page
6. Stripe redirects to /steunen?betaald=1 (or /agenda/[slug]?betaald=1)
7. Stripe sends webhook POST to /api/webhooks/stripe
8. Webhook verifies signature, handles checkout.session.completed
9. Webhook writes record to Supabase with payment_status = 'paid'
```

### Checkout session types

| Route | Type | Line items |
|---|---|---|
| `POST /api/checkout/donatie` | Donation | Single line item: "Donatie Sportac 86", amount from body |
| `POST /api/checkout/bestelling` | Order (candy/wine) | One line item per product × quantity, prices from DB |
| `POST /api/checkout/inschrijving` | Registration | Single line item: event name × num_persons, price from event |

### Webhook

`POST /api/webhooks/stripe`
- Verify signature with `STRIPE_WEBHOOK_SECRET`
- Handle `checkout.session.completed`:
  - Read `metadata.type` from session (`donatie` | `bestelling` | `inschrijving`)
  - Read `metadata.payload` (JSON-encoded form data stored at session creation)
  - Write to Supabase: orders / registrations / donations with `payment_status = 'paid'`
- Return 200 immediately; all errors logged but not re-thrown (Stripe retries on non-200)

---

## Database Changes

### New table: `products`

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
```

RLS: admin read/write, public read (active only).

### Modified: `orders`

```sql
alter table orders add column stripe_session_id text;
alter table orders add column payment_status text not null default 'pending'
  check (payment_status in ('pending', 'paid', 'failed'));
```

Orders are now only written by the webhook (not by the existing `/api/orders` route). The existing route is replaced by the Checkout flow.

### Modified: `registrations`

```sql
alter table registrations add column stripe_session_id text;
alter table registrations add column payment_status text not null default 'pending'
  check (payment_status in ('pending', 'paid', 'failed'));
```

Free event registrations bypass Stripe entirely and write directly (existing behavior preserved).

### Modified: `donations`

```sql
alter table donations add column stripe_session_id text;
alter table donations add column payment_status text not null default 'pending'
  check (payment_status in ('pending', 'paid', 'failed'));
```

### Modified: `settings`

Remove `gofundme_url`. Add no new keys — Stripe secret key goes in `.env.local` only (never in DB). Stripe publishable key goes in `.env.local` as `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`.

---

## Environment Variables

```
STRIPE_SECRET_KEY=sk_live_...          # Server only
STRIPE_WEBHOOK_SECRET=whsec_...        # Server only
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...  # Public (not currently needed for Checkout)
```

---

## Frontend Changes

### `/steunen` — Donations section

Replace GoFundMe button and bank-only form with:
- Preset amount buttons: €5, €10, €25, €50
- Custom amount input (number field, min €1)
- Name + email fields
- "Betaal via Stripe" button → POSTs to `/api/checkout/donatie`

Bank account info stays as a secondary option below ("Of via overschrijving").

### `/steunen` — Snoep & Wijn sections

- Products fetched from `products` table (filtered by type, is_active = true)
- Same quantity-picker UI as now, but products come from DB
- Form POSTs to `/api/checkout/bestelling` instead of `/api/orders`

### `/agenda/[slug]` — Registration

- If `event.price_cents > 0`: form POSTs to `/api/checkout/inschrijving`
- If `event.price_cents === 0`: existing direct registration flow unchanged

### Success states

- `/steunen?betaald=donatie` → show "Bedankt voor je donatie!" banner
- `/steunen?betaald=snoep` → show "Bestelling ontvangen!" banner
- `/steunen?betaald=wijn` → show "Bestelling ontvangen!" banner
- `/agenda/[slug]?betaald=1` → show "Inschrijving bevestigd!" banner

---

## Admin Changes

### New: `/admin/producten`

CRUD for products table. Fields: type (candy/wine), name, price (€), active toggle, sort order.

List view shows all products grouped by type with inline active toggle.

### New: `/admin/producten/nieuw` and `/admin/producten/[id]`

Standard form following existing admin patterns (`_ProductForm.tsx` + `actions.ts`).

### Modified: `/admin/instellingen`

Remove GoFundMe URL field. No Stripe keys shown here (they live in `.env.local` / Vercel env vars only — never stored in DB or shown in admin UI).

### Admin sidebar

Add "Producten" nav item between "Team" and "Inschrijvingen".

---

## Migration Files

- `007_products.sql` — create products table + seed existing candy/wine products
- `008_payment_columns.sql` — add stripe_session_id + payment_status to orders, registrations, donations
- `009_remove_gofundme.sql` — delete gofundme_url from settings

---

## Key Implementation Notes

- Stripe metadata values are strings with a 500-char limit. To avoid overflow for large orders, write a `pending` record to Supabase at session creation time and store only `{ type, record_id }` in Stripe metadata. The webhook then updates that record to `paid` using the `record_id`.
- This means all three tables get records inserted at checkout creation (status `pending`), and the webhook flips them to `paid`.
- Webhook must use `stripe.webhooks.constructEvent()` with raw body — use `req.text()` not `req.json()`
- Install: `npm install stripe`
- The existing `/api/orders`, `/api/donations`, `/api/registrations` routes stay in place but are no longer linked from the UI (kept as fallback, can be removed later)
