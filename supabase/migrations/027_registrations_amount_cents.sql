-- Snapshot the registration total at signup time so historical registrations
-- are not affected by later price changes on event_tickets.

alter table registrations
  add column amount_cents integer;

-- Backfill from CURRENT ticket prices. Best-effort: we don't know what the
-- prices were at signup time. From here on, new registrations write
-- amount_cents at insert time and the value is frozen.
with line_totals as (
  select
    r.id as reg_id,
    coalesce(sum(t.price_cents * (item.qty)::int), 0)::int as total
  from registrations r
  cross join lateral jsonb_each_text(coalesce(r.tickets, '{}'::jsonb)) as item(ticket_id, qty)
  left join event_tickets t on t.id = item.ticket_id::uuid
  group by r.id
)
update registrations r
set amount_cents = lt.total
from line_totals lt
where r.id = lt.reg_id
  and r.amount_cents is null;

update registrations set amount_cents = 0 where amount_cents is null;

alter table registrations
  alter column amount_cents set not null;
