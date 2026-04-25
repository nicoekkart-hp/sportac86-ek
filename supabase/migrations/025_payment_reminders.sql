alter table orders
  add column last_reminder_at timestamptz,
  add column reminder_count integer not null default 0;

alter table registrations
  add column last_reminder_at timestamptz,
  add column reminder_count integer not null default 0;
