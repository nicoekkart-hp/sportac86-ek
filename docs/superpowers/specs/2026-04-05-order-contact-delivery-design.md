# Order Contact Member, Delivery Tracking & Manual Payment Override — Design Spec

**Date:** 2026-04-05
**Project:** Sportac 86 EK fundraising site
**Status:** Approved

---

## Overview

Three focused additions to the orders system. Buyers can optionally tag a team member who will deliver their order. Admins can mark orders as delivered independently of payment. Admins can manually override payment status on any order regardless of Stripe webhook state.

---

## Scope

**In scope:**
- `contact_member_id` nullable FK on `orders` → `team_members.id`
- Optional "Wie brengt jouw bestelling?" dropdown on the sale detail page (`/steunen/[slug]`)
- `contact_member_name` denormalised display name joined in admin view
- `is_delivered boolean default false` on `orders`
- Admin toggle: "Afgeleverd / Nog niet afgeleverd" per order
- Admin toggle: "Betaald / In afwachting" per order (manual payment override)

**Out of scope:**
- Notifications to the contact member
- Delivery history or audit log
- Bulk status actions
- Filtering/sorting orders by delivery or payment status

---

## Architecture

### Database

One migration: `013_orders_contact_delivery.sql`

```sql
alter table orders
  add column contact_member_id uuid references team_members(id) on delete set null,
  add column is_delivered boolean not null default false;
```

No RLS changes needed — existing admin policies already cover `orders` (full access for authenticated). The public insert policy does not restrict columns so inserting `contact_member_id` from the checkout route works without changes.

### Data Flow: Buyer selects contact member

```
/steunen/[slug]
  → fetch active team_members ordered by sort_order (createAdminClient)
  → render optional <select name="contact_member_id"> before submit button
  → POST /api/checkout/bestelling
    → reads contact_member_id from formData (empty string → null)
    → inserts order with contact_member_id
```

### Data Flow: Admin delivery + payment toggles

```
/admin/bestellingen
  → select "*, sales(name), team_members!contact_member_id(name)" from orders
  → render contact name badge if present
  → render "Betaald/In afwachting" toggle form → togglePaymentStatus(id, current)
  → render "Afgeleverd/Nog te leveren" toggle form → toggleDelivered(id, current)
```

Server actions are `"use server"` functions bound with `.bind(null, id, current)` in the form action prop, following the existing `toggleOrderStatus` pattern.

---

## Database Changes

### Migration: `supabase/migrations/013_orders_contact_delivery.sql`

```sql
alter table orders
  add column contact_member_id uuid references team_members(id) on delete set null,
  add column is_delivered boolean not null default false;
```

No seed data needed. Existing orders get `contact_member_id = null` and `is_delivered = false` automatically.

---

## Type Changes

### `lib/types.ts` — `Order` type

Add three fields:

```ts
contact_member_id: string | null;
contact_member_name?: string;   // populated from join, not stored on orders
is_delivered: boolean;
```

---

## Frontend: `/steunen/[slug]`

After the phone field and before the submit button, add:

```
<label>Wie brengt jouw bestelling? (optioneel)</label>
<select name="contact_member_id">
  <option value="">— Geen voorkeur —</option>
  {members.map(m => <option value={m.id}>{m.name}</option>)}
</select>
```

Team members are fetched server-side: `select("id, name").order("sort_order")` on `team_members`.

The select is optional — submitting with value `""` is treated as null in the checkout route.

---

## Checkout Route: `/api/checkout/bestelling`

Read `contact_member_id` from formData. Treat empty string as `null`. Include in the Supabase insert.

```ts
const contact_member_id = (formData.get("contact_member_id") as string)?.trim() || null;
// insert: { sale_id, name, email, phone, items, status: "new", payment_status: "pending", contact_member_id }
```

---

## Admin: `/admin/bestellingen/page.tsx`

### Query

```ts
.select("*, sales(name), team_members!contact_member_id(name)")
```

### Contact name badge

```tsx
{o.team_members && (
  <span className="text-[10px] font-bold bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded-sm">
    📦 {o.team_members.name}
  </span>
)}
```

### Payment toggle

- `paid` → green button "✓ Betaald" (clicking sets to `pending`)
- `pending` → yellow button "In afwachting" (clicking sets to `paid`)
- `failed` → red badge, no toggle

### Delivery toggle

- `is_delivered = false` → blue button "✓ Afgeleverd"
- `is_delivered = true` → gray button "↩ Nog te leveren" + green "Afgeleverd" badge in header

---

## Admin Actions: `/admin/bestellingen/actions.ts`

### `togglePaymentStatus(id: string, current: "pending" | "paid" | "failed")`

Toggles between `"paid"` and `"pending"`. If current is `"failed"`, does nothing.

### `toggleDelivered(id: string, current: boolean)`

Flips `is_delivered` to `!current`.

---

## What Changes

| File | Change |
|---|---|
| `supabase/migrations/013_orders_contact_delivery.sql` | New: add `contact_member_id` FK + `is_delivered` boolean |
| `lib/types.ts` | Add `contact_member_id`, `contact_member_name?`, `is_delivered` to `Order` |
| `app/steunen/[slug]/page.tsx` | Fetch team members, add optional contact member dropdown |
| `app/api/checkout/bestelling/route.ts` | Read `contact_member_id` from formData, include in insert |
| `app/admin/bestellingen/page.tsx` | Join team_members, show contact badge, add payment + delivery toggles |
| `app/admin/bestellingen/actions.ts` | Add `togglePaymentStatus` and `toggleDelivered` server actions |

## What Stays the Same

- Stripe webhook — no changes; `payment_status` is still set to `paid` on `checkout.session.completed`
- `toggleOrderStatus` server action — unchanged
- All other admin pages — unchanged
- `team_members` table — no schema changes
- RLS policies — no changes needed
