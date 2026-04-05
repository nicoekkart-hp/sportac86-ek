alter table orders
  add column contact_member_id uuid references team_members(id) on delete set null,
  add column is_delivered boolean not null default false;
