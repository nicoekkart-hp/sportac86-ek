-- Create sales table
create table sales (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text not null default '',
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table sales enable row level security;

create policy "Public read active sales" on sales
  for select using (is_active = true);

create policy "Admin all sales" on sales
  for all using (auth.role() = 'authenticated');

-- Seed existing sale types
insert into sales (name, slug, description, sort_order) values
  ('Snoep', 'snoep', 'Bestel een doos snoep via onze actie. Afhalen op een van de afhaaldata (zie agenda).', 1),
  ('Wijn', 'wijn', 'Kies uit onze selectie wijnen. Afhalen op een van de afhaaldata (zie agenda).', 2);

-- Add sale_id to products
alter table products add column sale_id uuid references sales(id) on delete cascade;

-- Link existing products to seeded sales
update products set sale_id = (select id from sales where slug = 'snoep') where type = 'candy';
update products set sale_id = (select id from sales where slug = 'wijn') where type = 'wine';

-- Make sale_id required now that it's populated
alter table products alter column sale_id set not null;

-- Drop old type column
alter table products drop column type;
