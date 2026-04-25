alter table orders
  add column payment_reference text unique;

alter table registrations
  add column payment_reference text unique;

create index if not exists orders_payment_reference_idx on orders(payment_reference);
create index if not exists registrations_payment_reference_idx on registrations(payment_reference);
