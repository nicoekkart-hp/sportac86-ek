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
