# Event slots & tickets — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow events to have multiple dates (slots, capacity per slot) and multiple ticket types (e.g. adult/kid), each with its own price, while keeping the existing single-date events working.

**Architecture:** Two new tables (`event_slots`, `event_tickets`); existing event columns `date/time/max_attendees/price_cents` move into them via a transactional data migration that backfills `registrations.slot_id`. Public detail page becomes a client cart-style form (slot picker + ticket quantities + live total), reusing the wine-order pattern. Admin event form gains two repeater sections.

**Tech Stack:** Next.js 16 (App Router, server components/actions, async params), Supabase (Postgres + RLS), Stripe Checkout, Tailwind v4.

---

## File Structure

**New:**
- `supabase/migrations/022_event_slots_and_tickets.sql` — schema + data migration in one transaction
- `lib/dates.ts` — `formatDateRange(slots)` helper used by agenda + EventRow
- `app/agenda/[slug]/_RegistrationForm.tsx` — client component, mirrors `_OrderForm.tsx`
- `app/admin/evenementen/_SlotsEditor.tsx` — client repeater for slots
- `app/admin/evenementen/_TicketsEditor.tsx` — client repeater for tickets

**Modified:**
- `lib/types.ts` — drop dropped event columns; add `EventSlot`, `EventTicket`; extend `Registration` with `slot_id` + `tickets`
- `lib/ics.ts` — iterate slots instead of `events.date/time`
- `app/page.tsx` — fetch slots for `featuredEvents`, sort by earliest slot
- `app/agenda/page.tsx` — fetch slots, group + sort by earliest slot, hide events whose latest slot is past
- `app/agenda/[slug]/page.tsx` — strip the inline form; load slots + tickets + per-slot taken counts; render `<RegistrationForm>`
- `components/EventRow.tsx` — accept `slots` prop, render date range
- `app/admin/evenementen/_EventForm.tsx` — convert to client component, drop `date/time/price_euros/max_attendees` inputs, embed `<SlotsEditor>` + `<TicketsEditor>`
- `app/admin/evenementen/page.tsx` — list rows show slot count + earliest slot date instead of `event.date`
- `app/admin/evenementen/nieuw/page.tsx` — pass empty arrays; no slot/ticket fetch
- `app/admin/evenementen/[id]/page.tsx` — fetch event + slots + tickets, pass all three
- `app/admin/evenementen/actions.ts` — `createEvent` and `updateEvent` parse + upsert slots and tickets; add `slot_in_use` guard
- `app/admin/inschrijvingen/page.tsx` — show slot date and ticket breakdown
- `app/api/checkout/inschrijving/route.ts` — full rewrite per spec (slot + tickets, capacity guard)
- `app/api/registrations/route.ts` — accept `slot_id` + `tickets` for the free-event fallback path

---

## Task 1: Migration — create tables, copy data, drop old columns

**Files:**
- Create: `supabase/migrations/022_event_slots_and_tickets.sql`

- [ ] **Step 1: Write the migration SQL**

Create `supabase/migrations/022_event_slots_and_tickets.sql` with:

```sql
begin;

-- 1. New tables
create table event_slots (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  date date not null,
  time time,
  location text,
  max_attendees integer check (max_attendees is null or max_attendees >= 1),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index event_slots_event_id_idx on event_slots(event_id);
create index event_slots_date_idx on event_slots(date);

create table event_tickets (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  name text not null,
  price_cents integer not null check (price_cents >= 0),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index event_tickets_event_id_idx on event_tickets(event_id);

alter table event_slots enable row level security;
alter table event_tickets enable row level security;

create policy "Public read event_slots" on event_slots for select using (true);
create policy "Admin all event_slots" on event_slots for all using (auth.role() = 'authenticated');

create policy "Public read event_tickets" on event_tickets for select using (true);
create policy "Admin all event_tickets" on event_tickets for all using (auth.role() = 'authenticated');

-- 2. Add new columns to registrations BEFORE backfilling
alter table registrations
  add column slot_id uuid references event_slots(id) on delete cascade,
  add column tickets jsonb;

-- 3. Backfill slots from each existing event
-- Only events that actually have a date can be migrated to a slot.
insert into event_slots (event_id, date, time, location, max_attendees, sort_order)
select e.id, e.date, e.time, nullif(e.location, ''), e.max_attendees, 0
from events e
where e.date is not null;

-- 4. Backfill tickets — only for paid events
insert into event_tickets (event_id, name, price_cents, sort_order)
select e.id, 'Standaard', e.price_cents, 0
from events e
where e.price_cents > 0;

-- 5. Backfill registrations.slot_id (each migrated event has exactly one slot)
update registrations r
set slot_id = s.id
from event_slots s
where r.event_id = s.event_id;

-- 6. Drop the moved columns
alter table events
  drop column date,
  drop column time,
  drop column max_attendees,
  drop column price_cents;

commit;
```

- [ ] **Step 2: Apply the migration in Supabase**

Run the SQL in Supabase dashboard → SQL Editor. Verify in the Table Editor:
- `event_slots` has rows for every event that had a `date`
- `event_tickets` has rows for every paid event
- `registrations.slot_id` populated for existing rows (where the matching event had a date)
- `events` no longer has `date`, `time`, `max_attendees`, `price_cents` columns

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/022_event_slots_and_tickets.sql
git -c commit.gpgsign=false commit -m "feat(db): event slots + tickets schema and data migration"
```

---

## Task 2: Update types

**Files:**
- Modify: `lib/types.ts`

- [ ] **Step 1: Replace EventRecord, add EventSlot/EventTicket, update Registration**

Edit `lib/types.ts`:

```ts
export type EventRecord = {
  id: string;
  slug: string;
  title: string;
  description: string;
  location: string;
  image_url: string | null;
  is_published: boolean;
  show_on_steunen: boolean;
  icon: string;
  coming_soon: boolean;
  created_at: string;
};

export type EventSlot = {
  id: string;
  event_id: string;
  date: string;            // YYYY-MM-DD
  time: string | null;     // HH:MM:SS
  location: string | null;
  max_attendees: number | null;
  sort_order: number;
  created_at: string;
};

export type EventTicket = {
  id: string;
  event_id: string;
  name: string;
  price_cents: number;
  sort_order: number;
  created_at: string;
};

export type Registration = {
  id: string;
  event_id: string;
  slot_id: string | null;
  name: string;
  email: string;
  num_persons: number;
  remarks: string | null;
  tickets: Record<string, number> | null;
  stripe_session_id: string | null;
  payment_status: "pending" | "paid" | "failed";
  created_at: string;
};
```

(Keep all other types untouched.)

- [ ] **Step 2: Compile to surface broken consumers**

Run: `npx tsc --noEmit 2>&1 | head -80`

Expected: errors in many files referencing `event.date`, `event.time`, `event.price_cents`, `event.max_attendees`. Note the list — the next tasks fix each one.

- [ ] **Step 3: Commit**

```bash
git add lib/types.ts
git -c commit.gpgsign=false commit -m "feat(types): event slots + tickets, registration tickets jsonb"
```

---

## Task 3: Date range helper

**Files:**
- Create: `lib/dates.ts`

- [ ] **Step 1: Write `formatDateRange`**

Create `lib/dates.ts`:

```ts
import { EventSlot } from "@/lib/types";

const FMT_FULL = new Intl.DateTimeFormat("nl-BE", { day: "numeric", month: "long", year: "numeric" });
const FMT_DAY_MONTH = new Intl.DateTimeFormat("nl-BE", { day: "numeric", month: "long" });
const FMT_DAY = new Intl.DateTimeFormat("nl-BE", { day: "numeric" });

function parseLocalDate(yyyyMmDd: string): Date {
  const [y, m, d] = yyyyMmDd.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function formatDateRange(slots: Pick<EventSlot, "date">[]): string {
  if (slots.length === 0) return "Datum nog te bepalen";

  const sorted = [...slots].sort((a, b) => a.date.localeCompare(b.date));
  const first = parseLocalDate(sorted[0].date);
  const last = parseLocalDate(sorted[sorted.length - 1].date);

  if (sorted.length === 1 || first.getTime() === last.getTime()) {
    return FMT_FULL.format(first);
  }

  const sameYear = first.getFullYear() === last.getFullYear();
  const sameMonth = sameYear && first.getMonth() === last.getMonth();

  if (sameMonth) {
    return `${FMT_DAY.format(first)}–${FMT_DAY_MONTH.format(last)} ${last.getFullYear()}`;
  }
  if (sameYear) {
    return `${FMT_DAY_MONTH.format(first)} – ${FMT_DAY_MONTH.format(last)} ${last.getFullYear()}`;
  }
  return `${FMT_FULL.format(first)} – ${FMT_FULL.format(last)}`;
}

export function earliestSlotDate(slots: Pick<EventSlot, "date">[]): string | null {
  if (slots.length === 0) return null;
  return [...slots].sort((a, b) => a.date.localeCompare(b.date))[0].date;
}

export function latestSlotDate(slots: Pick<EventSlot, "date">[]): string | null {
  if (slots.length === 0) return null;
  return [...slots].sort((a, b) => b.date.localeCompare(a.date))[0].date;
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit lib/dates.ts 2>&1`
Expected: no output (clean).

- [ ] **Step 3: Commit**

```bash
git add lib/dates.ts
git -c commit.gpgsign=false commit -m "feat(dates): formatDateRange + earliest/latest slot helpers"
```

---

## Task 4: ICS export — iterate slots

**Files:**
- Modify: `lib/ics.ts`

- [ ] **Step 1: Update generateICS to take slots**

Replace `lib/ics.ts`:

```ts
import { EventRecord, EventSlot } from "@/lib/types";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function toICSLocal(dateStr: string, timeStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const [hour, minute] = timeStr.split(":").map(Number);
  return `${year}${pad(month)}${pad(day)}T${pad(hour)}${pad(minute)}00`;
}

export type EventWithSlots = EventRecord & { slots: EventSlot[] };

export function generateICS(events: EventWithSlots[]): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Sportac86//EK Ropeskipping//NL",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];

  for (const ev of events) {
    for (const slot of ev.slots) {
      const time = slot.time ?? "00:00";
      const start = toICSLocal(slot.date, time);
      const [hour, minute] = time.split(":").map(Number);
      const endHour = hour + 2;
      const [year, month, day] = slot.date.split("-").map(Number);
      const end = `${year}${pad(month)}${pad(day)}T${pad(endHour)}${pad(minute)}00`;

      const description = ev.description
        .replace(/\\/g, "\\\\")
        .replace(/;/g, "\\;")
        .replace(/,/g, "\\,")
        .replace(/\n/g, "\\n");

      const location = slot.location ?? ev.location;

      lines.push(
        "BEGIN:VEVENT",
        `UID:${slot.id}@sportac86-ek`,
        `SUMMARY:${ev.title}`,
        `LOCATION:${location}`,
        `DESCRIPTION:${description}`,
        `DTSTART;TZID=Europe/Brussels:${start}`,
        `DTEND;TZID=Europe/Brussels:${end}`,
        "END:VEVENT"
      );
    }
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}
```

- [ ] **Step 2: Update the .ics route to fetch slots**

Read `app/api/agenda.ics/route.ts` and modify to fetch slots alongside events, then pass `EventWithSlots[]`:

```ts
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { generateICS, EventWithSlots } from "@/lib/ics";
import { EventSlot } from "@/lib/types";

export async function GET() {
  const supabase = createServerClient();
  const { data: events } = await supabase
    .from("events")
    .select("*")
    .eq("is_published", true);
  const { data: slots } = await supabase.from("event_slots").select("*");

  const slotsByEvent = new Map<string, EventSlot[]>();
  for (const s of (slots ?? []) as EventSlot[]) {
    const list = slotsByEvent.get(s.event_id) ?? [];
    list.push(s);
    slotsByEvent.set(s.event_id, list);
  }

  const withSlots: EventWithSlots[] = (events ?? []).map((e) => ({
    ...(e as EventWithSlots),
    slots: slotsByEvent.get(e.id) ?? [],
  }));

  return new NextResponse(generateICS(withSlots), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="sportac86.ics"',
    },
  });
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit 2>&1 | grep -E "lib/ics|agenda.ics"`
Expected: no output for these two files.

- [ ] **Step 4: Commit**

```bash
git add lib/ics.ts app/api/agenda.ics/route.ts
git -c commit.gpgsign=false commit -m "feat(ics): emit one VEVENT per slot"
```

---

## Task 5: Admin slots editor

**Files:**
- Create: `app/admin/evenementen/_SlotsEditor.tsx`

- [ ] **Step 1: Build the client repeater**

Create `app/admin/evenementen/_SlotsEditor.tsx`:

```tsx
"use client";

import { useState } from "react";
import { EventSlot } from "@/lib/types";

type Row = {
  id: string;            // either real DB id or local "new-N"
  date: string;
  time: string;
  location: string;
  max_attendees: string;
};

let nextLocal = 0;
function localId() {
  nextLocal += 1;
  return `new-${nextLocal}`;
}

function toRow(s: EventSlot): Row {
  return {
    id: s.id,
    date: s.date,
    time: s.time?.slice(0, 5) ?? "",
    location: s.location ?? "",
    max_attendees: s.max_attendees?.toString() ?? "",
  };
}

export function SlotsEditor({ initial }: { initial: EventSlot[] }) {
  const [rows, setRows] = useState<Row[]>(
    initial.length > 0
      ? initial.map(toRow)
      : [{ id: localId(), date: "", time: "", location: "", max_attendees: "" }],
  );

  const update = (id: string, patch: Partial<Row>) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const remove = (id: string) => setRows((prev) => prev.filter((r) => r.id !== id));
  const add = () =>
    setRows((prev) => [...prev, { id: localId(), date: "", time: "", location: "", max_attendees: "" }]);

  return (
    <div className="flex flex-col gap-2">
      <label className="block text-sm font-semibold">Datums *</label>
      {rows.map((r, i) => (
        <div key={r.id} className="grid grid-cols-[140px_110px_1fr_120px_auto] gap-2 items-start">
          <input type="hidden" name={`slots[${i}].id`} value={r.id.startsWith("new-") ? "" : r.id} />
          <input
            type="date"
            required
            name={`slots[${i}].date`}
            value={r.date}
            onChange={(e) => update(r.id, { date: e.target.value })}
            className="border border-[#e8e4df] rounded-sm px-2 py-1.5 text-sm focus:outline-none focus:border-red-sportac"
          />
          <input
            type="time"
            name={`slots[${i}].time`}
            value={r.time}
            onChange={(e) => update(r.id, { time: e.target.value })}
            className="border border-[#e8e4df] rounded-sm px-2 py-1.5 text-sm focus:outline-none focus:border-red-sportac"
          />
          <input
            type="text"
            name={`slots[${i}].location`}
            placeholder="Locatie (optioneel — anders die van het event)"
            value={r.location}
            onChange={(e) => update(r.id, { location: e.target.value })}
            className="border border-[#e8e4df] rounded-sm px-2 py-1.5 text-sm focus:outline-none focus:border-red-sportac"
          />
          <input
            type="number"
            min={1}
            name={`slots[${i}].max_attendees`}
            placeholder="Max"
            value={r.max_attendees}
            onChange={(e) => update(r.id, { max_attendees: e.target.value })}
            className="border border-[#e8e4df] rounded-sm px-2 py-1.5 text-sm focus:outline-none focus:border-red-sportac"
          />
          <button
            type="button"
            onClick={() => remove(r.id)}
            disabled={rows.length === 1}
            className="text-red-sportac text-xs font-bold border border-red-sportac/30 px-2 py-1.5 rounded-sm hover:bg-red-sportac/10 disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Verwijder datum"
          >
            ✕
          </button>
        </div>
      ))}
      <input type="hidden" name="slots_count" value={rows.length} />
      <button
        type="button"
        onClick={add}
        className="self-start text-xs font-semibold text-red-sportac border border-red-sportac/30 px-3 py-1.5 rounded-sm hover:bg-red-sportac/10"
      >
        + Datum toevoegen
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit 2>&1 | grep _SlotsEditor`
Expected: no output (clean).

- [ ] **Step 3: Commit (defer until form integrated)**

Hold the commit until Task 7. Move on.

---

## Task 6: Admin tickets editor

**Files:**
- Create: `app/admin/evenementen/_TicketsEditor.tsx`

- [ ] **Step 1: Build the client repeater**

Create `app/admin/evenementen/_TicketsEditor.tsx`:

```tsx
"use client";

import { useState } from "react";
import { EventTicket } from "@/lib/types";

type Row = {
  id: string;
  name: string;
  price_euros: string;
};

let nextLocal = 0;
function localId() {
  nextLocal += 1;
  return `new-t-${nextLocal}`;
}

function toRow(t: EventTicket): Row {
  return {
    id: t.id,
    name: t.name,
    price_euros: (t.price_cents / 100).toFixed(2),
  };
}

export function TicketsEditor({ initial }: { initial: EventTicket[] }) {
  const [rows, setRows] = useState<Row[]>(
    initial.length > 0 ? initial.map(toRow) : [],
  );

  const update = (id: string, patch: Partial<Row>) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const remove = (id: string) => setRows((prev) => prev.filter((r) => r.id !== id));
  const add = () =>
    setRows((prev) => [...prev, { id: localId(), name: "", price_euros: "" }]);

  return (
    <div className="flex flex-col gap-2">
      <label className="block text-sm font-semibold">Tickets</label>
      <p className="text-xs text-gray-sub">
        Laat leeg voor een gratis evenement. Voorbeelden: Volwassene €20, Kind €15.
      </p>
      {rows.map((r, i) => (
        <div key={r.id} className="grid grid-cols-[1fr_120px_auto] gap-2 items-start">
          <input type="hidden" name={`tickets[${i}].id`} value={r.id.startsWith("new-t-") ? "" : r.id} />
          <input
            type="text"
            required
            name={`tickets[${i}].name`}
            placeholder="Volwassene"
            value={r.name}
            onChange={(e) => update(r.id, { name: e.target.value })}
            className="border border-[#e8e4df] rounded-sm px-2 py-1.5 text-sm focus:outline-none focus:border-red-sportac"
          />
          <input
            type="number"
            required
            min={0}
            step={0.01}
            name={`tickets[${i}].price_euros`}
            placeholder="€"
            value={r.price_euros}
            onChange={(e) => update(r.id, { price_euros: e.target.value })}
            className="border border-[#e8e4df] rounded-sm px-2 py-1.5 text-sm focus:outline-none focus:border-red-sportac"
          />
          <button
            type="button"
            onClick={() => remove(r.id)}
            className="text-red-sportac text-xs font-bold border border-red-sportac/30 px-2 py-1.5 rounded-sm hover:bg-red-sportac/10"
            aria-label="Verwijder ticket"
          >
            ✕
          </button>
        </div>
      ))}
      <input type="hidden" name="tickets_count" value={rows.length} />
      <button
        type="button"
        onClick={add}
        className="self-start text-xs font-semibold text-red-sportac border border-red-sportac/30 px-3 py-1.5 rounded-sm hover:bg-red-sportac/10"
      >
        + Ticket toevoegen
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit 2>&1 | grep _TicketsEditor`
Expected: no output.

- [ ] **Step 3: Hold the commit (Task 7 commits all editor changes together)**

---

## Task 7: Convert `_EventForm` to a client component using the editors

**Files:**
- Modify: `app/admin/evenementen/_EventForm.tsx`

- [ ] **Step 1: Rewrite the form**

Replace the file contents:

```tsx
"use client";

import { EventRecord, EventSlot, EventTicket } from "@/lib/types";
import { SlotsEditor } from "./_SlotsEditor";
import { TicketsEditor } from "./_TicketsEditor";

export function EventForm({
  event,
  slots,
  tickets,
  action,
}: {
  event?: EventRecord;
  slots: EventSlot[];
  tickets: EventTicket[];
  action: (formData: FormData) => Promise<void>;
}) {
  return (
    <form action={action} className="flex flex-col gap-5 max-w-2xl">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold mb-1">Titel *</label>
          <input type="text" name="title" required defaultValue={event?.title} className="w-full border border-[#e8e4df] rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-red-sportac" />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1">Slug *</label>
          <input type="text" name="slug" required defaultValue={event?.slug} placeholder="spaghettiavond-2025" className="w-full border border-[#e8e4df] rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-red-sportac font-mono" />
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold mb-1">Beschrijving *</label>
        <textarea name="description" required rows={4} defaultValue={event?.description} className="w-full border border-[#e8e4df] rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-red-sportac resize-y" />
      </div>

      <div>
        <label className="block text-sm font-semibold mb-1">Locatie</label>
        <input type="text" name="location" defaultValue={event?.location} className="w-full border border-[#e8e4df] rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-red-sportac" />
        <p className="text-xs text-gray-sub mt-1">Standaardlocatie. Per datum kan je optioneel een andere locatie zetten.</p>
      </div>

      <SlotsEditor initial={slots} />

      <TicketsEditor initial={tickets} />

      <div>
        <label className="block text-sm font-semibold mb-1">Afbeelding URL</label>
        <input type="url" name="image_url" defaultValue={event?.image_url ?? ""} placeholder="https://..." className="w-full border border-[#e8e4df] rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-red-sportac" />
      </div>

      <div className="flex items-center gap-2">
        <input type="checkbox" name="is_published" id="is_published" defaultChecked={event?.is_published} className="w-4 h-4 accent-red-500" />
        <label htmlFor="is_published" className="text-sm font-semibold">Gepubliceerd (zichtbaar op de site)</label>
      </div>

      <div className="flex items-center gap-2">
        <input type="checkbox" name="coming_soon" id="coming_soon" defaultChecked={event?.coming_soon ?? false} className="w-4 h-4 accent-red-500" />
        <label htmlFor="coming_soon" className="text-sm font-semibold">Binnenkort beschikbaar (inschrijven uitgeschakeld)</label>
      </div>

      <div className="flex items-center gap-2">
        <input type="checkbox" name="show_on_steunen" id="show_on_steunen" defaultChecked={event?.show_on_steunen} className="w-4 h-4 accent-red-500" />
        <label htmlFor="show_on_steunen" className="text-sm font-semibold">Tonen als tegel op steunen-pagina</label>
      </div>

      <div>
        <label className="block text-sm font-semibold mb-1">Icoon (emoji)</label>
        <input
          type="text"
          name="icon"
          defaultValue={event?.icon ?? "📅"}
          placeholder="🍝"
          className="w-32 border border-[#e8e4df] rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-red-sportac"
        />
        <p className="text-xs text-gray-sub mt-1">Gebruikt voor de tegel op de steunen-pagina.</p>
      </div>

      <div className="flex gap-3 pt-2">
        <button type="submit" className="bg-red-sportac text-white font-bold text-sm px-6 py-2.5 rounded-sm hover:bg-red-600 transition-colors">
          Opslaan
        </button>
        <a href="/admin/evenementen" className="text-sm text-gray-sub px-4 py-2.5 hover:text-gray-dark transition-colors">
          Annuleren
        </a>
      </div>
    </form>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit 2>&1 | grep -E "_EventForm|_SlotsEditor|_TicketsEditor"`
Expected: no output for these.

- [ ] **Step 3: Commit Tasks 5–7 together**

```bash
git add app/admin/evenementen/_SlotsEditor.tsx app/admin/evenementen/_TicketsEditor.tsx app/admin/evenementen/_EventForm.tsx
git -c commit.gpgsign=false commit -m "feat(admin): event form with slots + tickets editors"
```

---

## Task 8: Admin server actions — parse + upsert slots and tickets

**Files:**
- Modify: `app/admin/evenementen/actions.ts`

- [ ] **Step 1: Replace the file**

```ts
"use server";

import { createAdminClient } from "@/lib/supabase-admin";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

type ParsedSlot = {
  id: string | null;
  date: string;
  time: string | null;
  location: string | null;
  max_attendees: number | null;
  sort_order: number;
};

type ParsedTicket = {
  id: string | null;
  name: string;
  price_cents: number;
  sort_order: number;
};

function parseSlots(formData: FormData): ParsedSlot[] {
  const count = parseInt((formData.get("slots_count") as string) ?? "0", 10) || 0;
  const out: ParsedSlot[] = [];
  for (let i = 0; i < count; i += 1) {
    const date = ((formData.get(`slots[${i}].date`) as string) ?? "").trim();
    if (!date) continue;
    const time = ((formData.get(`slots[${i}].time`) as string) ?? "").trim() || null;
    const location = ((formData.get(`slots[${i}].location`) as string) ?? "").trim() || null;
    const maxRaw = ((formData.get(`slots[${i}].max_attendees`) as string) ?? "").trim();
    const max_attendees = maxRaw ? parseInt(maxRaw, 10) : null;
    const idRaw = ((formData.get(`slots[${i}].id`) as string) ?? "").trim();
    out.push({
      id: idRaw || null,
      date,
      time,
      location,
      max_attendees,
      sort_order: i,
    });
  }
  return out;
}

function parseTickets(formData: FormData): ParsedTicket[] {
  const count = parseInt((formData.get("tickets_count") as string) ?? "0", 10) || 0;
  const out: ParsedTicket[] = [];
  for (let i = 0; i < count; i += 1) {
    const name = ((formData.get(`tickets[${i}].name`) as string) ?? "").trim();
    if (!name) continue;
    const price_euros = parseFloat((formData.get(`tickets[${i}].price_euros`) as string) ?? "0") || 0;
    const idRaw = ((formData.get(`tickets[${i}].id`) as string) ?? "").trim();
    out.push({
      id: idRaw || null,
      name,
      price_cents: Math.round(price_euros * 100),
      sort_order: i,
    });
  }
  return out;
}

function readEventFields(formData: FormData) {
  const title = (formData.get("title") as string).trim();
  const slug = (formData.get("slug") as string).toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  const description = (formData.get("description") as string).trim();
  const location = ((formData.get("location") as string) || "").trim();
  const image_url = (formData.get("image_url") as string) || null;
  const is_published = formData.get("is_published") === "on";
  const show_on_steunen = formData.get("show_on_steunen") === "on";
  const coming_soon = formData.get("coming_soon") === "on";
  const icon = ((formData.get("icon") as string) || "📅").trim();
  return { title, slug, description, location, image_url, is_published, show_on_steunen, coming_soon, icon };
}

async function upsertChildren(eventId: string, slots: ParsedSlot[], tickets: ParsedTicket[]) {
  const supabase = createAdminClient();

  const { data: existingSlots } = await supabase.from("event_slots").select("id").eq("event_id", eventId);
  const { data: existingTickets } = await supabase.from("event_tickets").select("id").eq("event_id", eventId);

  const submittedSlotIds = new Set(slots.map((s) => s.id).filter(Boolean) as string[]);
  const submittedTicketIds = new Set(tickets.map((t) => t.id).filter(Boolean) as string[]);

  const slotsToDelete = (existingSlots ?? []).map((s) => s.id).filter((id) => !submittedSlotIds.has(id));
  const ticketsToDelete = (existingTickets ?? []).map((t) => t.id).filter((id) => !submittedTicketIds.has(id));

  if (slotsToDelete.length > 0) {
    const { count } = await supabase
      .from("registrations")
      .select("id", { count: "exact", head: true })
      .in("slot_id", slotsToDelete);
    if ((count ?? 0) > 0) {
      return { error: "slot_in_use" as const };
    }
    const { error } = await supabase.from("event_slots").delete().in("id", slotsToDelete);
    if (error) return { error: "delete_slots" as const, message: error.message };
  }

  if (ticketsToDelete.length > 0) {
    const { error } = await supabase.from("event_tickets").delete().in("id", ticketsToDelete);
    if (error) return { error: "delete_tickets" as const, message: error.message };
  }

  // Updates
  for (const s of slots.filter((s) => s.id)) {
    const { error } = await supabase
      .from("event_slots")
      .update({ date: s.date, time: s.time, location: s.location, max_attendees: s.max_attendees, sort_order: s.sort_order })
      .eq("id", s.id!);
    if (error) return { error: "update_slot" as const, message: error.message };
  }
  for (const t of tickets.filter((t) => t.id)) {
    const { error } = await supabase
      .from("event_tickets")
      .update({ name: t.name, price_cents: t.price_cents, sort_order: t.sort_order })
      .eq("id", t.id!);
    if (error) return { error: "update_ticket" as const, message: error.message };
  }

  // Inserts
  const newSlots = slots.filter((s) => !s.id).map((s) => ({
    event_id: eventId,
    date: s.date,
    time: s.time,
    location: s.location,
    max_attendees: s.max_attendees,
    sort_order: s.sort_order,
  }));
  if (newSlots.length > 0) {
    const { error } = await supabase.from("event_slots").insert(newSlots);
    if (error) return { error: "insert_slots" as const, message: error.message };
  }
  const newTickets = tickets.filter((t) => !t.id).map((t) => ({
    event_id: eventId,
    name: t.name,
    price_cents: t.price_cents,
    sort_order: t.sort_order,
  }));
  if (newTickets.length > 0) {
    const { error } = await supabase.from("event_tickets").insert(newTickets);
    if (error) return { error: "insert_tickets" as const, message: error.message };
  }

  return { error: null as const };
}

export async function createEvent(formData: FormData) {
  const supabase = createAdminClient();
  const fields = readEventFields(formData);
  const slots = parseSlots(formData);
  const tickets = parseTickets(formData);

  if (!fields.title || !fields.slug || !fields.description) {
    redirect("/admin/evenementen?error=invalid");
  }
  if (slots.length === 0) {
    redirect("/admin/evenementen?error=no_slots");
  }

  const { data: created, error } = await supabase
    .from("events")
    .insert(fields)
    .select("id, slug")
    .single();

  if (error || !created) {
    console.error("Create event error:", error);
    redirect("/admin/evenementen?error=db");
  }

  const result = await upsertChildren(created.id, slots, tickets);
  if (result.error) {
    console.error("Upsert children error:", result);
    redirect(`/admin/evenementen?error=${result.error}`);
  }

  revalidatePath("/admin/evenementen");
  revalidatePath("/agenda");
  revalidatePath(`/agenda/${created.slug}`);
  revalidatePath("/steunen");
  revalidatePath("/");
  redirect("/admin/evenementen");
}

export async function updateEvent(id: string, formData: FormData) {
  const supabase = createAdminClient();
  const fields = readEventFields(formData);
  const slots = parseSlots(formData);
  const tickets = parseTickets(formData);

  if (!fields.title || !fields.slug || !fields.description) {
    redirect(`/admin/evenementen/${id}?error=invalid`);
  }
  if (slots.length === 0) {
    redirect(`/admin/evenementen/${id}?error=no_slots`);
  }

  const { error } = await supabase.from("events").update(fields).eq("id", id);
  if (error) {
    console.error("Update event error:", error);
    redirect(`/admin/evenementen/${id}?error=db`);
  }

  const result = await upsertChildren(id, slots, tickets);
  if (result.error) {
    console.error("Upsert children error:", result);
    redirect(`/admin/evenementen/${id}?error=${result.error}`);
  }

  revalidatePath("/admin/evenementen");
  revalidatePath("/agenda");
  revalidatePath(`/agenda/${fields.slug}`);
  revalidatePath("/steunen");
  revalidatePath("/");
  redirect("/admin/evenementen");
}

export async function deleteEvent(id: string) {
  const supabase = createAdminClient();
  await supabase.from("events").delete().eq("id", id);
  revalidatePath("/admin/evenementen");
  revalidatePath("/agenda");
  revalidatePath("/steunen");
  revalidatePath("/");
  redirect("/admin/evenementen");
}

export async function togglePublish(id: string, current: boolean) {
  const supabase = createAdminClient();
  await supabase.from("events").update({ is_published: !current }).eq("id", id);
  revalidatePath("/admin/evenementen");
  revalidatePath("/agenda");
  revalidatePath("/steunen");
  revalidatePath("/");
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit 2>&1 | grep "evenementen/actions"`
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add app/admin/evenementen/actions.ts
git -c commit.gpgsign=false commit -m "feat(admin): server actions parse + upsert event slots/tickets"
```

---

## Task 9: Admin event pages (list / new / edit)

**Files:**
- Modify: `app/admin/evenementen/page.tsx`
- Modify: `app/admin/evenementen/nieuw/page.tsx`
- Modify: `app/admin/evenementen/[id]/page.tsx`

- [ ] **Step 1: Update the list page**

Read the current `app/admin/evenementen/page.tsx` (use Read tool) and modify it to:
- Stop selecting `date`/`price_cents`.
- Fetch slots in a separate query, group in JS.
- Show **slot count** (e.g. `2 datums`) and **earliest slot date** instead of `event.date`.
- Drop any "Gratis"/price badge derived from `event.price_cents`.

If unsure of exact display tweaks, keep the existing structure but replace each `event.date` reference with `formatDateRange(slotsByEvent.get(event.id) ?? [])` from `lib/dates.ts`. Use this query:

```ts
const [{ data: events }, { data: slots }] = await Promise.all([
  supabase.from("events").select("*").order("created_at", { ascending: false }),
  supabase.from("event_slots").select("event_id, date").order("date"),
]);
```

- [ ] **Step 2: Update the new-event page**

Replace `app/admin/evenementen/nieuw/page.tsx`:

```tsx
import { EventForm } from "../_EventForm";
import { createEvent } from "../actions";

export default function NieuwEventPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="font-condensed font-black italic text-4xl text-gray-dark">Nieuw evenement</h1>
      </div>
      <EventForm slots={[]} tickets={[]} action={createEvent} />
    </div>
  );
}
```

- [ ] **Step 3: Update the edit page**

Replace `app/admin/evenementen/[id]/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase-admin";
import { EventRecord, EventSlot, EventTicket } from "@/lib/types";
import { EventForm } from "../_EventForm";
import { updateEvent } from "../actions";

export default async function BewerkenEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createAdminClient();

  const [{ data: eventData }, { data: slotsData }, { data: ticketsData }] = await Promise.all([
    supabase.from("events").select("*").eq("id", id).single(),
    supabase.from("event_slots").select("*").eq("event_id", id).order("sort_order").order("date"),
    supabase.from("event_tickets").select("*").eq("event_id", id).order("sort_order"),
  ]);

  if (!eventData) notFound();

  const event = eventData as EventRecord;
  const slots: EventSlot[] = slotsData ?? [];
  const tickets: EventTicket[] = ticketsData ?? [];

  const action = updateEvent.bind(null, id);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="font-condensed font-black italic text-4xl text-gray-dark">Evenement bewerken</h1>
        <p className="text-gray-sub text-sm mt-1">{event.title}</p>
      </div>
      <EventForm event={event} slots={slots} tickets={tickets} action={action} />
    </div>
  );
}
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit 2>&1 | grep "admin/evenementen"`
Expected: no output.

- [ ] **Step 5: Commit**

```bash
git add app/admin/evenementen/page.tsx app/admin/evenementen/nieuw/page.tsx app/admin/evenementen/[id]/page.tsx
git -c commit.gpgsign=false commit -m "feat(admin): event list/new/edit pages use slots + tickets"
```

---

## Task 10: Public registration form

**Files:**
- Create: `app/agenda/[slug]/_RegistrationForm.tsx`

- [ ] **Step 1: Build the client form**

Create `app/agenda/[slug]/_RegistrationForm.tsx`:

```tsx
"use client";

import { useMemo, useState } from "react";
import { EventSlot, EventTicket } from "@/lib/types";
import { formatPrice } from "@/lib/format";

type SlotWithTaken = EventSlot & { taken: number };

const FMT_DATE = new Intl.DateTimeFormat("nl-BE", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

function parseLocalDate(yyyyMmDd: string): Date {
  const [y, m, d] = yyyyMmDd.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function RegistrationForm({
  eventId,
  eventSlug,
  slots,
  tickets,
  defaultLocation,
}: {
  eventId: string;
  eventSlug: string;
  slots: SlotWithTaken[];
  tickets: EventTicket[];
  defaultLocation: string;
}) {
  const isFree = tickets.length === 0;

  const availableSlots = slots.filter(
    (s) => s.max_attendees === null || s.taken < s.max_attendees,
  );

  const [slotId, setSlotId] = useState<string>(availableSlots[0]?.id ?? "");
  const [qty, setQty] = useState<Record<string, number>>({});

  const totalCents = useMemo(() => {
    if (isFree) return 0;
    return tickets.reduce((sum, t) => sum + (qty[t.id] ?? 0) * t.price_cents, 0);
  }, [qty, tickets, isFree]);

  const totalPersons = useMemo(() => {
    if (isFree) return 1;
    return Object.values(qty).reduce((s, n) => s + n, 0);
  }, [qty, isFree]);

  const allFull = availableSlots.length === 0;
  const canSubmit = !allFull && slotId !== "" && (isFree || totalPersons > 0);

  if (allFull) {
    return (
      <p className="text-sm text-red-sportac font-semibold py-4">
        Volzet — geen plaatsen meer beschikbaar.
      </p>
    );
  }

  const setTicketQty = (id: string, value: number) => {
    setQty((prev) => {
      const next = { ...prev };
      if (!value || value <= 0) delete next[id];
      else next[id] = value;
      return next;
    });
  };

  const action = isFree ? "/api/registrations" : "/api/checkout/inschrijving";

  return (
    <form action={action} method="POST" className="flex flex-col gap-4">
      <input type="hidden" name="event_id" value={eventId} />
      <input type="hidden" name="event_slug" value={eventSlug} />

      <div>
        <label className="block text-sm font-semibold mb-2">Datum *</label>
        <div className="flex flex-col gap-2">
          {slots.map((s) => {
            const full = s.max_attendees !== null && s.taken >= s.max_attendees;
            const left = s.max_attendees !== null ? Math.max(0, s.max_attendees - s.taken) : null;
            return (
              <label
                key={s.id}
                className={`flex items-center gap-3 border rounded-sm px-3 py-2 text-sm cursor-pointer ${full ? "border-[#e8e4df] bg-gray-50 cursor-not-allowed opacity-60" : "border-[#e8e4df] hover:border-red-sportac"} ${slotId === s.id ? "border-red-sportac" : ""}`}
              >
                <input
                  type="radio"
                  name="slot_id"
                  value={s.id}
                  checked={slotId === s.id}
                  disabled={full}
                  onChange={() => setSlotId(s.id)}
                  className="accent-red-500"
                />
                <span className="flex-1">
                  <strong className="text-gray-dark">{FMT_DATE.format(parseLocalDate(s.date))}</strong>
                  {s.time && <span className="text-gray-sub"> · {s.time.slice(0, 5)}</span>}
                  {(s.location ?? defaultLocation) && (
                    <span className="text-gray-sub"> · {s.location ?? defaultLocation}</span>
                  )}
                </span>
                {full && (
                  <span className="text-[10px] font-bold bg-red-sportac/10 text-red-sportac px-2 py-0.5 rounded-sm">Volzet</span>
                )}
                {!full && left !== null && (
                  <span className="text-xs text-gray-sub">{left} vrij</span>
                )}
              </label>
            );
          })}
        </div>
      </div>

      {!isFree && (
        <div>
          <label className="block text-sm font-semibold mb-2">Tickets *</label>
          <div className="flex flex-col gap-2">
            {tickets.map((t) => (
              <div key={t.id} className="flex items-center gap-3">
                <div className="flex-1 text-sm">
                  <span className="font-semibold">{t.name}</span>
                  <span className="text-gray-sub"> — {formatPrice(t.price_cents)}</span>
                </div>
                <input
                  type="number"
                  min={0}
                  max={20}
                  name={`tickets.${t.id}`}
                  value={qty[t.id] || ""}
                  onChange={(e) => setTicketQty(t.id, Number(e.target.value) || 0)}
                  placeholder="0"
                  className="w-16 border border-[#e8e4df] rounded-sm px-2 py-1 text-sm text-center focus:outline-none focus:border-red-sportac"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-semibold mb-1">Naam *</label>
        <input type="text" name="name" required className="w-full border border-[#e8e4df] rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-red-sportac" placeholder="Voor- en achternaam" />
      </div>
      <div>
        <label className="block text-sm font-semibold mb-1">E-mailadres *</label>
        <input type="email" name="email" required className="w-full border border-[#e8e4df] rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-red-sportac" placeholder="jouw@email.be" />
      </div>
      <div>
        <label className="block text-sm font-semibold mb-1">Opmerkingen</label>
        <textarea name="remarks" rows={3} className="w-full border border-[#e8e4df] rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-red-sportac resize-none" placeholder="Dieetwensen, vragen, ..." />
      </div>

      {/* Free events still need num_persons for the existing /api/registrations route */}
      {isFree && <input type="hidden" name="num_persons" value={1} />}

      <button
        type="submit"
        disabled={!canSubmit}
        className="bg-red-sportac text-white font-bold py-3 rounded-sm hover:bg-red-600 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isFree
          ? "Inschrijven"
          : totalCents === 0
            ? "Selecteer minstens één ticket"
            : `Inschrijven & betalen · €${(totalCents / 100).toFixed(2).replace(".", ",")}`}
      </button>
      {!isFree && (
        <p className="text-xs text-gray-sub">
          Je wordt doorgestuurd naar de beveiligde betaalpagina van Stripe.
        </p>
      )}
    </form>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit 2>&1 | grep _RegistrationForm`
Expected: no output.

- [ ] **Step 3: Commit (held until detail page wired in Task 11)**

---

## Task 11: Public event detail page

**Files:**
- Modify: `app/agenda/[slug]/page.tsx`

- [ ] **Step 1: Replace the page**

```tsx
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createServerClient } from "@/lib/supabase";
import { EventRecord, EventSlot, EventTicket } from "@/lib/types";
import { formatDateRange, latestSlotDate } from "@/lib/dates";
import { RegistrationForm } from "./_RegistrationForm";

export default async function EventDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ betaald?: string; ingeschreven?: string; error?: string }>;
}) {
  const { slug } = await params;
  const { betaald, ingeschreven, error } = await searchParams;
  const supabase = createServerClient();

  const { data: event } = await supabase
    .from("events")
    .select("*")
    .eq("slug", slug)
    .eq("is_published", true)
    .single();

  if (!event) notFound();
  const ev = event as EventRecord;

  const [{ data: slotsData }, { data: ticketsData }, { data: regsData }] = await Promise.all([
    supabase.from("event_slots").select("*").eq("event_id", ev.id).order("sort_order").order("date"),
    supabase.from("event_tickets").select("*").eq("event_id", ev.id).order("sort_order"),
    supabase.from("registrations").select("slot_id, num_persons").eq("event_id", ev.id),
  ]);

  const slots: EventSlot[] = slotsData ?? [];
  const tickets: EventTicket[] = ticketsData ?? [];

  const takenBySlot = new Map<string, number>();
  for (const r of regsData ?? []) {
    if (!r.slot_id) continue;
    takenBySlot.set(r.slot_id, (takenBySlot.get(r.slot_id) ?? 0) + (r.num_persons ?? 1));
  }
  const slotsWithTaken = slots.map((s) => ({ ...s, taken: takenBySlot.get(s.id) ?? 0 }));

  const latest = latestSlotDate(slots);
  const today = new Date().toISOString().split("T")[0];
  const isPast = latest !== null && latest < today;

  return (
    <div className="pt-16">
      {betaald && (
        <div className="bg-green-50 border-b border-green-200 px-6 py-3 text-center text-sm font-semibold text-green-800">
          Inschrijving bevestigd! Je ontvangt een bevestiging per e-mail.
        </div>
      )}
      {ingeschreven && (
        <div className="bg-green-50 border-b border-green-200 px-6 py-3 text-center text-sm font-semibold text-green-800">
          Inschrijving ontvangen! Je ontvangt een bevestiging per e-mail.
        </div>
      )}
      {error === "volzet" && (
        <div className="bg-red-50 border-b border-red-200 px-6 py-3 text-center text-sm font-semibold text-red-800">
          Sorry, deze datum is intussen volzet. Kies een andere datum.
        </div>
      )}

      <div className="bg-gray-dark py-14 px-6 relative overflow-hidden">
        <div className="max-w-5xl mx-auto relative">
          <div className="text-sm text-gray-sub mb-4">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            {" / "}
            <Link href="/agenda" className="hover:text-white transition-colors">Agenda</Link>
            {" / "}
            <span className="text-red-sportac">{ev.title}</span>
          </div>
          <h1 className="font-condensed font-black italic text-5xl leading-none text-white mb-4 max-w-2xl">{ev.title}</h1>
          <div className="flex gap-6 flex-wrap">
            <span className="text-gray-sub text-sm flex items-center gap-1.5">
              📅 <strong className="text-white">{formatDateRange(slots)}</strong>
            </span>
            {ev.location && (
              <span className="text-gray-sub text-sm flex items-center gap-1.5">
                📍 <strong className="text-white">{ev.location}</strong>
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-14 grid md:grid-cols-[1fr_380px] gap-12 items-start">
        <div>
          {ev.image_url && (
            <div className="relative h-64 rounded-sm overflow-hidden mb-8 bg-[#c8c0b8]">
              <Image src={ev.image_url} alt={ev.title} fill className="object-cover" sizes="(max-width: 768px) 100vw, 60vw" />
            </div>
          )}
          <h2 className="font-bold text-xl mb-4">Over dit evenement</h2>
          <div className="text-gray-body text-[15px] leading-relaxed whitespace-pre-line">{ev.description}</div>
        </div>

        <div id="inschrijven" className="bg-white border border-[#e8e4df] rounded-sm p-7 sticky top-24">
          {isPast ? (
            <p className="text-gray-sub text-sm text-center py-4">Dit evenement is voorbij.</p>
          ) : ev.coming_soon ? (
            <div className="text-center py-4">
              <div className="text-4xl mb-3">⏳</div>
              <p className="text-xs font-bold tracking-[0.2em] uppercase text-red-sportac mb-2">Binnenkort beschikbaar</p>
              <p className="text-sm text-gray-body leading-relaxed">
                De details voor dit evenement worden nog uitgewerkt. Kom later terug voor meer info en inschrijvingen.
              </p>
            </div>
          ) : slots.length === 0 ? (
            <p className="text-gray-sub text-sm text-center py-4">Inschrijven nog niet beschikbaar.</p>
          ) : (
            <>
              <h3 className="font-bold text-lg mb-4">Inschrijven</h3>
              <RegistrationForm
                eventId={ev.id}
                eventSlug={ev.slug}
                slots={slotsWithTaken}
                tickets={tickets}
                defaultLocation={ev.location}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit 2>&1 | grep "agenda/\[slug\]"`
Expected: no output.

- [ ] **Step 3: Commit (Task 10 + 11)**

```bash
git add app/agenda/[slug]/_RegistrationForm.tsx app/agenda/[slug]/page.tsx
git -c commit.gpgsign=false commit -m "feat(agenda): slot picker + ticket cart on event detail"
```

---

## Task 12: Agenda list page

**Files:**
- Modify: `app/agenda/page.tsx`
- Modify: `components/EventRow.tsx`

- [ ] **Step 1: Update `EventRow` to accept slots**

Replace `components/EventRow.tsx`:

```tsx
import Link from "next/link";
import { EventRecord, EventSlot } from "@/lib/types";
import { formatDateRange, earliestSlotDate } from "@/lib/dates";

function parseLocalDate(yyyyMmDd: string): Date {
  const [y, m, d] = yyyyMmDd.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function EventRow({
  event,
  slots,
  past = false,
}: {
  event: EventRecord;
  slots: EventSlot[];
  past?: boolean;
}) {
  const earliest = earliestSlotDate(slots);
  const day = earliest ? String(parseLocalDate(earliest).getDate()) : "—";
  const month = earliest
    ? parseLocalDate(earliest).toLocaleString("nl-BE", { month: "short" })
    : "TBD";
  const sortedSlots = [...slots].sort((a, b) => a.date.localeCompare(b.date));
  const firstSlot = sortedSlots[0];
  const subtitle =
    [event.location, firstSlot?.time?.slice(0, 5)].filter(Boolean).join(" · ") ||
    "Details volgen";

  return (
    <Link
      href={`/agenda/${event.slug}`}
      className={`group bg-white border border-[#e8e4df] rounded-sm grid gap-6 p-5 items-center relative overflow-hidden hover:border-red-sportac hover:shadow-sm transition-all ${past ? "opacity-55 hover:opacity-75" : ""}`}
      style={{ gridTemplateColumns: "80px 1fr auto" }}
    >
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-sportac scale-y-0 group-hover:scale-y-100 transition-transform origin-bottom" />
      <div className="text-center border-r border-gray-200 pr-6">
        <div className="font-condensed font-black italic text-[36px] text-red-sportac leading-none">{day}</div>
        <div className="text-xs font-bold uppercase tracking-wider text-gray-sub">{month}</div>
      </div>
      <div>
        <h3 className="font-bold text-[15px] text-gray-dark mb-1">{event.title}</h3>
        <p className="text-sm text-gray-sub">{subtitle}</p>
        <div className="flex gap-1.5 mt-2 flex-wrap items-center">
          <span className="text-xs text-gray-sub">{formatDateRange(slots)}</span>
          {slots.length > 1 && (
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-sm bg-red-sportac/10 text-red-sportac">
              {slots.length} datums
            </span>
          )}
          {event.coming_soon && (
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-sm bg-amber-100 text-amber-700">Binnenkort</span>
          )}
        </div>
      </div>
      <div className="flex flex-col items-end gap-2">
        {!past && (
          <span className="text-xs font-bold bg-gray-dark text-white px-4 py-2 rounded-sm">
            {event.coming_soon ? "Meer info" : "Inschrijven"}
          </span>
        )}
        {past && (
          <span className="text-xs font-bold bg-[#e8e4df] text-gray-sub px-4 py-2 rounded-sm">Voorbij</span>
        )}
      </div>
    </Link>
  );
}
```

- [ ] **Step 2: Update the agenda page**

Replace `app/agenda/page.tsx`:

```tsx
import Image from "next/image";
import Link from "next/link";
import { EventRow } from "@/components/EventRow";
import { createServerClient } from "@/lib/supabase";
import { EventRecord, EventSlot } from "@/lib/types";
import { formatDateRange, earliestSlotDate, latestSlotDate } from "@/lib/dates";

export default async function AgendaPage() {
  const supabase = createServerClient();
  const today = new Date().toISOString().split("T")[0];

  const [{ data: eventsData }, { data: slotsData }] = await Promise.all([
    supabase.from("events").select("*").eq("is_published", true),
    supabase.from("event_slots").select("*").order("date"),
  ]);

  const events: EventRecord[] = eventsData ?? [];
  const allSlots: EventSlot[] = slotsData ?? [];
  const slotsByEvent = new Map<string, EventSlot[]>();
  for (const s of allSlots) {
    const list = slotsByEvent.get(s.event_id) ?? [];
    list.push(s);
    slotsByEvent.set(s.event_id, list);
  }

  type Annotated = { event: EventRecord; slots: EventSlot[]; earliest: string | null; latest: string | null };
  const annotated: Annotated[] = events.map((e) => {
    const slots = slotsByEvent.get(e.id) ?? [];
    return { event: e, slots, earliest: earliestSlotDate(slots), latest: latestSlotDate(slots) };
  });

  const upcoming = annotated
    .filter((a) => a.latest === null || a.latest >= today)
    .sort((a, b) => (a.earliest ?? "9999").localeCompare(b.earliest ?? "9999"));
  const pastEvents = annotated
    .filter((a) => a.latest !== null && a.latest < today)
    .sort((a, b) => (b.earliest ?? "").localeCompare(a.earliest ?? ""))
    .slice(0, 5);

  const featured = upcoming[0];
  const rest = upcoming.slice(1);

  return (
    <div className="pt-16">
      <div className="bg-gray-dark py-14 px-6 relative overflow-hidden">
        <div className="absolute right-10 bottom-[-20px] font-condensed font-black italic text-[140px] text-white/[0.04] leading-none pointer-events-none select-none">Agenda</div>
        <div className="max-w-5xl mx-auto relative">
          <div className="text-sm text-gray-sub mb-4">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            {" / "}
            <span className="text-red-sportac">Agenda</span>
          </div>
          <h1 className="font-condensed font-black italic text-6xl leading-none text-white mb-3">
            Agenda &{" "}
            <em className="not-italic text-red-sportac">evenementen</em>
          </h1>
          <p className="text-gray-sub text-[15px] max-w-lg leading-relaxed">
            Kom langs, steun ons live en maak deel uit van onze reis naar Noorwegen.
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-14">
        {featured && (
          <div className="bg-white border border-[#e8e4df] rounded-sm overflow-hidden grid md:grid-cols-[340px_1fr] mb-10 relative">
            <div className="absolute top-4 left-4 bg-red-sportac text-white text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-sm z-10">
              Eerstvolgende
            </div>
            <div className="relative min-h-[240px] bg-[#c8c0b8]">
              {featured.event.image_url ? (
                <Image src={featured.event.image_url} alt={featured.event.title} fill className="object-cover" sizes="(max-width: 768px) 100vw, 340px" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-6xl opacity-20">📅</div>
              )}
            </div>
            <div className="p-9 flex flex-col justify-between">
              <div>
                <div className="flex gap-5 mb-4 flex-wrap">
                  <span className="text-sm text-gray-sub flex items-center gap-1.5">
                    📅 <strong className="text-gray-dark">{formatDateRange(featured.slots)}</strong>
                  </span>
                  {featured.event.location && (
                    <span className="text-sm text-gray-sub flex items-center gap-1.5">
                      📍 <strong className="text-gray-dark">{featured.event.location}</strong>
                    </span>
                  )}
                </div>
                <h2 className="font-condensed font-black italic text-[38px] leading-tight text-gray-dark mb-3">
                  {featured.event.title}
                </h2>
                <p className="text-sm text-gray-body leading-relaxed mb-6 line-clamp-3">
                  {featured.event.description}
                </p>
              </div>
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex gap-4 items-center">
                  <Link href={`/agenda/${featured.event.slug}`} className="text-[15px] font-semibold text-gray-dark border-b-2 border-gray-dark pb-0.5">
                    Meer info
                  </Link>
                  {!featured.event.coming_soon && (
                    <Link href={`/agenda/${featured.event.slug}#inschrijven`} className="bg-red-sportac text-white font-bold text-sm px-7 py-3 rounded-sm hover:bg-red-600 transition-colors">
                      Inschrijven
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {rest.length > 0 && (
          <>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-xs font-bold tracking-[0.2em] uppercase text-gray-sub">Komende evenementen</span>
              <div className="flex-1 h-px bg-[#e8e4df]" />
            </div>
            <div className="flex flex-col gap-3 mb-12">
              {rest.map((a) => (
                <EventRow key={a.event.id} event={a.event} slots={a.slots} />
              ))}
            </div>
          </>
        )}

        {upcoming.length === 0 && (
          <p className="text-gray-sub text-sm text-center py-12">
            Momenteel zijn er geen geplande evenementen. Kom later terug.
          </p>
        )}

        {pastEvents.length > 0 && (
          <>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-xs font-bold tracking-[0.2em] uppercase text-gray-sub">Voorbije evenementen</span>
              <div className="flex-1 h-px bg-[#e8e4df]" />
            </div>
            <div className="flex flex-col gap-3 mb-12">
              {pastEvents.map((a) => (
                <EventRow key={a.event.id} event={a.event} slots={a.slots} past />
              ))}
            </div>
          </>
        )}

        <div className="bg-gray-dark rounded-sm p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
          <div>
            <p className="font-bold text-white mb-1">Blijf op de hoogte</p>
            <p className="text-gray-sub text-sm leading-relaxed">
              Voeg onze evenementen toe aan je eigen agenda zodat je niets mist.
            </p>
          </div>
          <a href="/api/agenda.ics" className="text-sm font-bold text-white border border-white/20 px-5 py-2.5 rounded-sm hover:bg-white/10 transition-colors whitespace-nowrap">
            Agenda exporteren (.ics)
          </a>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit 2>&1 | grep -E "agenda/page|EventRow"`
Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add app/agenda/page.tsx components/EventRow.tsx
git -c commit.gpgsign=false commit -m "feat(agenda): list page with date ranges and slot-aware sort"
```

---

## Task 13: Homepage tile fetch

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Drop the date sort, no behavior change beyond removing dropped column**

Open `app/page.tsx`. Find the events fetch (around line 23–28):

```ts
.from("events")
.select("*")
.eq("is_published", true)
.eq("show_on_steunen", true)
.order("date", { ascending: true, nullsFirst: false }),
```

Replace the `.order("date", ...)` line with `.order("created_at", { ascending: true })`. The homepage tiles don't render dates; they just show the title/icon, so we don't need slots here.

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit 2>&1 | grep "app/page"`
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add app/page.tsx
git -c commit.gpgsign=false commit -m "fix(home): event tile query no longer references dropped date column"
```

---

## Task 14: Checkout route — slots + tickets + capacity guard

**Files:**
- Modify: `app/api/checkout/inschrijving/route.ts`

- [ ] **Step 1: Replace the file**

```ts
import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase-admin";
import { createServerClient } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const event_id = (formData.get("event_id") as string)?.trim();
  const slot_id = (formData.get("slot_id") as string)?.trim();
  const name = (formData.get("name") as string)?.trim();
  const email = (formData.get("email") as string)?.trim();
  const remarks = (formData.get("remarks") as string) || null;

  if (!event_id || !slot_id || !name || !email) {
    return NextResponse.json({ error: "Ongeldige invoer" }, { status: 400 });
  }

  const supabase = createServerClient();
  const { data: event } = await supabase
    .from("events")
    .select("id, title, slug, location")
    .eq("id", event_id)
    .eq("is_published", true)
    .single();
  if (!event) {
    return NextResponse.json({ error: "Evenement niet gevonden" }, { status: 404 });
  }

  const { data: slot } = await supabase
    .from("event_slots")
    .select("id, event_id, date, max_attendees")
    .eq("id", slot_id)
    .single();
  if (!slot || slot.event_id !== event.id) {
    return NextResponse.json({ error: "Datum niet gevonden" }, { status: 400 });
  }

  const { data: tickets } = await supabase
    .from("event_tickets")
    .select("id, name, price_cents")
    .eq("event_id", event.id);
  const ticketById = new Map((tickets ?? []).map((t) => [t.id, t]));

  // Parse tickets.{id}=qty
  const requested: { ticket_id: string; qty: number }[] = [];
  for (const [key, value] of formData.entries()) {
    const m = key.match(/^tickets\.([^.]+)$/);
    if (!m) continue;
    const ticket_id = m[1];
    const qty = parseInt(value as string, 10);
    if (!ticket_id || !ticketById.has(ticket_id) || isNaN(qty) || qty <= 0) continue;
    requested.push({ ticket_id, qty });
  }

  if (requested.length === 0) {
    return NextResponse.redirect(new URL(`/agenda/${event.slug}?error=geen_tickets#inschrijven`, req.url), 303);
  }

  const totalPersons = requested.reduce((s, r) => s + r.qty, 0);

  // Capacity guard
  if (slot.max_attendees !== null) {
    const { data: existing } = await supabase
      .from("registrations")
      .select("num_persons")
      .eq("slot_id", slot.id);
    const taken = (existing ?? []).reduce((s, r) => s + (r.num_persons ?? 0), 0);
    if (taken + totalPersons > slot.max_attendees) {
      return NextResponse.redirect(new URL(`/agenda/${event.slug}?error=volzet#inschrijven`, req.url), 303);
    }
  }

  const ticketsJson: Record<string, number> = {};
  for (const r of requested) ticketsJson[r.ticket_id] = r.qty;

  const adminSupabase = createAdminClient();
  const { data: registration, error: dbError } = await adminSupabase
    .from("registrations")
    .insert({
      event_id: event.id,
      slot_id: slot.id,
      name,
      email,
      num_persons: totalPersons,
      remarks,
      tickets: ticketsJson,
      payment_status: "pending",
    })
    .select("id")
    .single();
  if (dbError || !registration) {
    return NextResponse.json({ error: "Database fout" }, { status: 500 });
  }

  const origin = req.headers.get("origin") ?? new URL(req.url).origin;

  const session = await stripe.checkout.sessions.create({
    line_items: requested.map((r) => {
      const t = ticketById.get(r.ticket_id)!;
      return {
        price_data: {
          currency: "eur",
          product_data: { name: `${event.title} — ${t.name}` },
          unit_amount: t.price_cents,
        },
        quantity: r.qty,
      };
    }),
    mode: "payment",
    customer_email: email,
    metadata: { type: "inschrijving", record_id: registration.id },
    success_url: `${origin}/agenda/${event.slug}?betaald=1`,
    cancel_url: `${origin}/agenda/${event.slug}#inschrijven`,
  });

  return NextResponse.redirect(session.url!, 303);
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit 2>&1 | grep checkout/inschrijving`
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add app/api/checkout/inschrijving/route.ts
git -c commit.gpgsign=false commit -m "feat(checkout): inschrijving handles slot + multiple tickets"
```

---

## Task 15: Free-event registration route

**Files:**
- Modify: `app/api/registrations/route.ts`

- [ ] **Step 1: Add slot/tickets handling for free path**

Read `app/api/registrations/route.ts`. The existing route handles free events. Update it to:
- Read `slot_id` and `event_slug` from the form.
- Insert with `slot_id`, `tickets: null` (free events have no tickets).
- Redirect back to `/agenda/${event_slug}?ingeschreven=1` rather than the previous response.

If the route currently returns JSON, switch its success path to `NextResponse.redirect(new URL(\`/agenda/\${event_slug}?ingeschreven=1\`, req.url), 303)`. Keep validation of `event_id`, `name`, `email`, `num_persons`. Add `slot_id` to the insert payload.

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit 2>&1 | grep "api/registrations"`
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add app/api/registrations/route.ts
git -c commit.gpgsign=false commit -m "feat(api): free-event registration writes slot_id + redirects to detail"
```

---

## Task 16: Admin registrations list — show slot date + ticket breakdown

**Files:**
- Modify: `app/admin/inschrijvingen/page.tsx`

- [ ] **Step 1: Replace the page**

```tsx
import { createAdminClient } from "@/lib/supabase-admin";
import { EventRecord, EventSlot, EventTicket, Registration } from "@/lib/types";

const FMT_DATE = new Intl.DateTimeFormat("nl-BE", { day: "numeric", month: "short", year: "numeric" });

function parseLocalDate(d: string) {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(y, m - 1, day);
}

export default async function InschrijvingenPage() {
  const supabase = createAdminClient();
  const [{ data: events }, { data: slots }, { data: tickets }, { data: registrations }] = await Promise.all([
    supabase.from("events").select("*"),
    supabase.from("event_slots").select("*"),
    supabase.from("event_tickets").select("*"),
    supabase.from("registrations").select("*").order("created_at", { ascending: false }),
  ]);

  const eventsMap = new Map((events ?? []).map((e: EventRecord) => [e.id, e]));
  const slotsMap = new Map((slots ?? []).map((s: EventSlot) => [s.id, s]));
  const ticketsMap = new Map((tickets ?? []).map((t: EventTicket) => [t.id, t]));
  const allRegs: Registration[] = registrations ?? [];

  const grouped = new Map<string, Registration[]>();
  for (const reg of allRegs) {
    const list = grouped.get(reg.event_id) ?? [];
    list.push(reg);
    grouped.set(reg.event_id, list);
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="font-condensed font-black italic text-4xl text-gray-dark">Inschrijvingen</h1>
        <p className="text-gray-sub text-sm mt-1">{allRegs.length} totaal</p>
      </div>

      {allRegs.length === 0 && <p className="text-gray-sub text-sm">Nog geen inschrijvingen.</p>}

      {Array.from(grouped.entries()).map(([eventId, regs]) => {
        const ev = eventsMap.get(eventId);
        const totalPersons = regs.reduce((sum, r) => sum + r.num_persons, 0);
        return (
          <div key={eventId} className="mb-8">
            <div className="flex items-center gap-3 mb-3">
              <h2 className="font-bold text-base text-gray-dark">{ev?.title ?? "Onbekend evenement"}</h2>
              <span className="text-xs text-gray-sub">{regs.length} inschrijvingen · {totalPersons} personen</span>
            </div>
            <div className="bg-white border border-[#e8e4df] rounded-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#e8e4df] text-xs text-gray-sub">
                    <th className="text-left px-4 py-2.5 font-semibold">Naam</th>
                    <th className="text-left px-4 py-2.5 font-semibold">E-mail</th>
                    <th className="text-left px-4 py-2.5 font-semibold">Datum</th>
                    <th className="text-left px-4 py-2.5 font-semibold">Tickets</th>
                    <th className="text-left px-4 py-2.5 font-semibold">Personen</th>
                    <th className="text-left px-4 py-2.5 font-semibold">Opmerkingen</th>
                    <th className="text-left px-4 py-2.5 font-semibold">Betaling</th>
                    <th className="text-left px-4 py-2.5 font-semibold">Aangemaakt</th>
                  </tr>
                </thead>
                <tbody>
                  {regs.map((r) => {
                    const slot = r.slot_id ? slotsMap.get(r.slot_id) : null;
                    const breakdown = r.tickets
                      ? Object.entries(r.tickets)
                          .filter(([, qty]) => qty > 0)
                          .map(([id, qty]) => `${qty}× ${ticketsMap.get(id)?.name ?? "(verwijderd)"}`)
                          .join(", ")
                      : "—";
                    return (
                      <tr key={r.id} className="border-b border-[#e8e4df] last:border-0 hover:bg-gray-50">
                        <td className="px-4 py-2.5 font-medium">{r.name}</td>
                        <td className="px-4 py-2.5 text-gray-sub">{r.email}</td>
                        <td className="px-4 py-2.5 text-gray-sub">{slot ? FMT_DATE.format(parseLocalDate(slot.date)) : "—"}</td>
                        <td className="px-4 py-2.5 text-gray-sub text-xs">{breakdown}</td>
                        <td className="px-4 py-2.5">{r.num_persons}</td>
                        <td className="px-4 py-2.5 text-gray-sub text-xs">{r.remarks ?? "—"}</td>
                        <td className="px-4 py-2.5">
                          {r.payment_status === "paid" && <span className="text-[10px] font-bold bg-green-100 text-green-700 px-1.5 py-0.5 rounded-sm">Betaald</span>}
                          {r.payment_status === "pending" && <span className="text-[10px] font-bold bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-sm">In afwachting</span>}
                          {r.payment_status === "failed" && <span className="text-[10px] text-gray-sub">—</span>}
                        </td>
                        <td className="px-4 py-2.5 text-gray-sub text-xs">{new Date(r.created_at).toLocaleDateString("nl-BE")}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit 2>&1 | grep inschrijvingen`
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add app/admin/inschrijvingen/page.tsx
git -c commit.gpgsign=false commit -m "feat(admin): inschrijvingen list shows slot date + ticket breakdown"
```

---

## Task 17: Final type check + smoke

**Files:** none

- [ ] **Step 1: Full type check**

Run: `npx tsc --noEmit 2>&1 | head -100`

Expected: clean. If any errors, fix them inline (likely leftover references to `event.date`/`event.price_cents` in components I missed — search and update).

- [ ] **Step 2: Boot the dev server**

Run: `npm run dev` in another terminal (or background it). Visit:
- `/agenda` — featured event renders with date range; clicking goes to detail.
- `/agenda/[some-existing-event-slug]` — slot picker shows the migrated single slot, ticket panel shows the migrated "Standaard" ticket (or no panel if free), totals update on input.
- `/admin/evenementen/[id]` — slots + tickets editors show existing rows; can add/remove and save.
- Submit a paid registration — Stripe checkout shows correct line items.
- After webhook confirmation, check `/admin/inschrijvingen` for slot date + ticket breakdown.

- [ ] **Step 3: Commit anything fixed in step 1**

If you fixed leftover compile errors:

```bash
git add -A
git -c commit.gpgsign=false commit -m "chore: clean up leftover references to dropped event columns"
```

- [ ] **Step 4: Push**

```bash
git push
```

---

## Self-review

**Spec coverage:**
- Schema (slots, tickets, registrations.slot_id/tickets, drop columns) → Task 1 ✓
- Migration of existing events → Task 1 ✓
- Agenda list with date range + sort by earliest, hide-past-by-latest → Task 12 ✓
- Event detail: slot picker, "Volzet" badge, ticket cart, live total → Tasks 10–11 ✓
- Free events still work → Task 10 (`isFree` branch) + Task 15 ✓
- Sold-out fallback → Task 10 (`allFull`) ✓
- Checkout route with capacity guard, race-window note → Task 14 ✓
- Admin form gains slots + tickets repeaters → Tasks 5–7 ✓
- Admin actions parse + upsert with `slot_in_use` guard → Task 8 ✓
- Admin list shows slot count/earliest date → Task 9 ✓
- Admin registrations list shows slot date + ticket breakdown → Task 16 ✓
- ICS export emits one VEVENT per slot → Task 4 ✓

**Placeholder scan:** no TODO / TBD / "implement later" left.

**Type consistency:** `EventRecord` no longer has date/time/price_cents/max_attendees; every consumer has been updated to read from slots/tickets. `Registration.tickets` is `Record<string, number> | null` consistently.
