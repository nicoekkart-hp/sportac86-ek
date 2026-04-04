create table products (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('candy', 'wine')),
  name text not null,
  price_cents integer not null,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table products enable row level security;

create policy "Public read active products" on products
  for select using (is_active = true);

create policy "Admin all products" on products
  for all using (auth.role() = 'authenticated');

-- Seed existing hardcoded products
insert into products (type, name, price_cents, sort_order) values
  ('candy', 'Mars (doos 24 stuks)', 1800, 1),
  ('candy', 'Snickers (doos 24 stuks)', 1800, 2),
  ('candy', 'Twix (doos 24 stuks)', 1800, 3),
  ('wine', 'Rode wijn — fles 75cl', 900, 1),
  ('wine', 'Witte wijn — fles 75cl', 900, 2),
  ('wine', 'Rosé — fles 75cl', 900, 3);
