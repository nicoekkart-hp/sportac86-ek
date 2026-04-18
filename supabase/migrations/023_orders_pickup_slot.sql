begin;

alter table orders
  add column pickup_slot_id uuid references event_slots(id) on delete set null;

create index orders_pickup_slot_id_idx on orders(pickup_slot_id);

commit;
