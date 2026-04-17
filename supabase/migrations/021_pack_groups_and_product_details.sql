-- 1. Drop the per-product pack pricing added in 020
alter table products
  drop constraint if exists products_pack_pricing_both_or_neither;

alter table products
  drop column if exists pack_size,
  drop column if exists pack_price_cents;

-- 2. Pack groups
create table pack_groups (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references sales(id) on delete cascade,
  name text not null,
  unit_price_cents integer not null check (unit_price_cents > 0),
  pack_size integer not null check (pack_size > 1),
  pack_price_cents integer not null check (pack_price_cents > 0),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table pack_groups enable row level security;

create policy "Public read pack groups" on pack_groups
  for select using (true);

create policy "Admin all pack groups" on pack_groups
  for all using (auth.role() = 'authenticated');

-- 3. Link products to an optional group
alter table products
  add column pack_group_id uuid references pack_groups(id) on delete set null;

-- 4. Info modal fields
alter table products
  add column image_url text,
  add column description text;
