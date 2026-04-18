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
