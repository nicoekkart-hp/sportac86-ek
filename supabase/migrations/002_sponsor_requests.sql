create table sponsor_requests (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  message text,
  created_at timestamptz default now()
);

alter table sponsor_requests enable row level security;

create policy "Public insert" on sponsor_requests
  for insert to anon with check (true);
