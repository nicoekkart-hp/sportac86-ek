# Event slots & tickets — design

**Date:** 2026-04-18
**Status:** Approved

## Problem

Today, an `events` row carries one `date`, one `time`, one `price_cents`, and one `max_attendees`. Real events break this assumption:

- The eetfestijn runs on **two consecutive evenings** but is one promoted event. Showing it as two rows on the agenda confuses people and dilutes the listing.
- Tickets are not one-size-fits-all: an eetfestijn typically has **adult €20 / kid €15**, sometimes more variants.

We need to model events that have multiple **dates (slots)** and multiple **ticket types**, while keeping the public agenda clean and online payment intact.

## Goals

1. One event can have N slots, each with its own date/time/optional location/optional capacity.
2. One event can have N ticket types, each with its own name and price.
3. Capacity is enforced **per slot** (sum of all tickets across all registrations).
4. Public registration: pick a slot, pick quantities per ticket type, pay online via Stripe.
5. Existing events keep working — automatic data migration to one slot + one ticket each.

## Non-goals (YAGNI)

- Per-ticket capacity caps (only slot-level).
- Waitlist.
- Editing or cancelling registrations from the admin.
- Refunds.

## Schema

### New tables

```sql
create table event_slots (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  date date not null,
  time time,
  location text,             -- optional override; null = use events.location
  max_attendees integer,     -- per slot; null = unlimited
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table event_tickets (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  name text not null,        -- "Volwassene", "Kind"
  price_cents integer not null check (price_cents >= 0),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
```

RLS for both tables: public `select`, admin (`auth.role() = 'authenticated'`) `all`.

### `events` — columns dropped after data migration

`date`, `time`, `max_attendees`, `price_cents` move to slots/tickets and are dropped.

`events` keeps: `id`, `slug`, `title`, `description`, `location`, `image_url`, `is_published`, `created_at`.

### `registrations` — new columns

```sql
alter table registrations
  add column slot_id uuid references event_slots(id) on delete cascade,
  add column tickets jsonb;  -- {ticketId: qty}
```

`event_id` stays (denormalised back-ref convenient for the dashboard). `num_persons` stays — it's the cached sum of all ticket quantities, used by the existing dashboard and admin list. `name`, `email`, `remarks` unchanged.

### Data migration (single SQL file)

For each existing `events` row:

1. Insert one `event_slots` row mirroring `(date, time, location, max_attendees)`, `sort_order=0`.
2. If `price_cents > 0`: insert one `event_tickets` row `("Standaard", price_cents)`, `sort_order=0`. (Free events get no ticket — registration form will show "Gratis" and skip Stripe; see Free events below.)
3. Backfill `registrations.slot_id` to that event's lone slot.
4. Drop `events.date`, `events.time`, `events.max_attendees`, `events.price_cents`.

The migration runs in one transaction so existing data is never in a half-migrated state.

## Public flow

### Agenda list (`/agenda`)

Query: `events` joined to `event_slots`, group by event in JS.

For each event, compute earliest and latest slot date. Show:

- **Single slot:** the date as today (e.g. `13 maart 2026`).
- **Multiple slots:** date range (`13–14 maart 2026`, or `13 maart – 4 april 2026` across months/years).

Sort by **earliest slot date ascending**. Hide events whose **latest** slot date is in the past.

The agenda row no longer renders a price — events with multiple ticket types don't have a single price. (We could show "vanaf €X" but YAGNI; user didn't ask.)

### Event detail (`/agenda/[slug]`)

One form, structured like the order form:

1. **Slot picker** — radio group, one per `event_slots` row sorted by date then `sort_order`.
   - Renders date + time + location override (if any).
   - For each slot, server pre-computes `taken = sum(num_persons of registrations where slot_id = slot.id)`.
   - If `max_attendees != null && taken >= max_attendees`: render "Volzet" badge, disable the radio.
   - Otherwise show "X van Y plaatsen vrij" if `max_attendees != null`, else nothing.
2. **Ticket quantity inputs** — one per `event_tickets` row, same UX as the order page:
   - Image not needed (no `image_url` on tickets).
   - Live total panel reuses the `_OrderForm.tsx` pattern.
3. Standard contact fields: name, email, phone (optional), remarks (optional, kept).
4. Submit button: `Inschrijven & betalen · €X,XX`, disabled while no slot or no tickets.

### Free events

If the event has zero ticket rows (e.g. migrated from a free event), the form skips ticket inputs and the submit button reads `Inschrijven`. The route still inserts a registration with `tickets = null` and skips Stripe. (This preserves current free-event behaviour.)

### Sold-out edge case

If **all** slots are at capacity, render the form with everything disabled and a "Dit evenement is volzet" notice.

## Checkout route — `/api/checkout/inschrijving`

Form fields: `event_id`, `slot_id`, `name`, `email`, `phone`, `remarks`, `tickets.{ticketId}`.

Server logic:

1. Load event by id; 404 if missing or unpublished.
2. Load slot by id; 400 if `slot.event_id !== event.id`.
3. Load tickets for the event; reject any submitted ticket id not in the list.
4. Compute `requestedQty = sum(tickets values)`. If 0 and event has tickets: reject "Selecteer minstens één ticket".
5. Capacity guard: `taken + requestedQty <= slot.max_attendees` (if max set). If fails, redirect back with `?error=volzet`.
6. Build Stripe line items: one per ticket where qty > 0, `name = "<event.title> — <ticket.name>"`, `unit_amount = ticket.price_cents`.
7. Insert `registrations` row with `event_id`, `slot_id`, `tickets`, `num_persons = requestedQty`, `name`, `email`, `phone`, `remarks`. Status starts as pending in the existing pattern.
8. Free path (no tickets): skip Stripe, mark paid immediately (existing free-event behaviour), redirect to `/agenda/[slug]?ingeschreven=1`.
9. Paid path: redirect to Stripe checkout; webhook marks paid on success.

The race window between step 5 and the Stripe webhook flipping the row to paid is acceptable for our scale — a second registration finishing first will simply trip the capacity check on its own attempt. Pending rows count toward `taken` so the window is small.

## Admin

### `/admin/evenementen/nieuw` and `/admin/evenementen/[id]`

The existing `_EventForm` becomes a client component. It keeps the title/description/image/etc. fields and adds two repeater sections:

**Datums** — `useState<{id?, date, time, location, max_attendees, sort_order}[]>`
Each row: date input, time input, location override input, max_attendees number, ✕ remove button. "+ Datum toevoegen" appends a blank row.

**Tickets** — `useState<{id?, name, price_cents, sort_order}[]>`
Each row: name input, price input (euros UX, parsed to cents server-side), ✕ remove. "+ Ticket toevoegen" appends.

Validation: at least one slot required; price ≥ 0; max_attendees ≥ 1 if set.

Submit → server action receives `FormData` with `slots[i].date`, `tickets[i].name`, etc., parses them into arrays, then for each:

- **Slot ids in form** = update; **slot ids in DB but not form** = delete; **slots without id** = insert. Same for tickets.
- Cascade: deleting a slot cascades to registrations referencing it. Pre-flight: if any slot being deleted has registrations, reject with `?error=slot_in_use`.
- Cascade: deleting a ticket — registrations have `tickets jsonb` referencing it by id, but it's denormalised history; we don't enforce. Existing registrations keep their stored ticket id and `num_persons`. The admin won't try to display a deleted ticket name (fall back to `"(verwijderd ticket)"`).

### `/admin/inschrijvingen`

Add columns: **Datum** (slot date) and a small **Tickets** breakdown like `2× Volwassene · 1× Kind`. Sort default by slot date desc.

### `/admin` dashboard

Counts unchanged.

## Component breakdown

- `app/agenda/page.tsx` — server component, fetches events + slots, computes ranges.
- `app/agenda/[slug]/page.tsx` — server component, fetches event + slots + tickets + per-slot taken counts; renders `<RegistrationForm>`.
- `app/agenda/[slug]/_RegistrationForm.tsx` — client component, mirrors `_OrderForm.tsx` shape.
- `app/admin/evenementen/_EventForm.tsx` — converted to client component, gains repeaters for slots + tickets.
- `app/admin/evenementen/actions.ts` — `createEvent` and `updateEvent` parse + upsert slots and tickets.
- `app/api/checkout/inschrijving/route.ts` — refactored per "Checkout route" above.
- `lib/types.ts` — add `EventSlot`, `EventTicket`; update `EventRecord` to drop the moved columns; update `Registration` to add `slot_id`, `tickets`.
- `lib/dates.ts` (new) — `formatDateRange(slots)` helper used by agenda.

## Migration files

`supabase/migrations/022_event_slots_and_tickets.sql` — all schema changes + data migration in one transaction.

## Testing checklist

After deploy, smoke test in this order:

1. Existing single-slot event still renders on `/agenda` and detail page; an existing registration loads in admin.
2. Create a new event with 2 slots + 2 tickets in admin.
3. `/agenda` shows it as a date range.
4. Detail page shows both slots; selecting one + two adult tickets + one kid ticket → live total → Stripe checkout. Stripe shows three line items.
5. Webhook callback marks registration paid.
6. Admin `/inschrijvingen` shows the new registration with correct slot + ticket breakdown.
7. Set slot capacity to 2; register 2 persons; reload detail page → "Volzet" badge on that slot. Try submitting anyway → redirected with `?error=volzet`.
