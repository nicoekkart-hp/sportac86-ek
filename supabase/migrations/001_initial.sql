-- Events
create table events (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  description text not null default '',
  date date not null,
  time time not null,
  location text not null default '',
  image_url text,
  max_attendees integer,
  price_cents integer not null default 0,
  is_published boolean not null default false,
  created_at timestamptz not null default now()
);

-- Registrations
create table registrations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  name text not null,
  email text not null,
  num_persons integer not null default 1,
  remarks text,
  created_at timestamptz not null default now()
);

-- Donations
create table donations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  amount_cents integer not null,
  message text,
  created_at timestamptz not null default now()
);

-- Orders (snoep & wijn)
create table orders (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('candy', 'wine')),
  name text not null,
  email text not null,
  phone text not null default '',
  items jsonb not null default '{}',
  pickup_event_id uuid references events(id) on delete set null,
  status text not null default 'new' check (status in ('new', 'handled')),
  created_at timestamptz not null default now()
);

-- Team members
create table team_members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text not null default 'Atleet',
  discipline text,
  bio text,
  image_url text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- Sponsors
create table sponsors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  logo_url text,
  website_url text,
  level text not null default 'partner' check (level in ('gold', 'silver', 'bronze', 'partner')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- Enable RLS
alter table events enable row level security;
alter table registrations enable row level security;
alter table donations enable row level security;
alter table orders enable row level security;
alter table team_members enable row level security;
alter table sponsors enable row level security;

-- Public read access for published events, team, sponsors
create policy "Public read events" on events for select using (is_published = true);
create policy "Public read team" on team_members for select using (true);
create policy "Public read sponsors" on sponsors for select using (true);

-- Public insert for registrations, donations, orders (forms)
create policy "Public insert registrations" on registrations for insert with check (true);
create policy "Public insert donations" on donations for insert with check (true);
create policy "Public insert orders" on orders for insert with check (true);
