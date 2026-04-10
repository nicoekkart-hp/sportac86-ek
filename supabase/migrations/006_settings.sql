create table settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

-- Admin full access
create policy "Admin read settings" on settings for select using (auth.role() = 'authenticated');
create policy "Admin write settings" on settings for all using (auth.role() = 'authenticated');

alter table settings enable row level security;

-- Seed default empty value
insert into settings (key, value) values ('gofundme_url', '') on conflict do nothing;
