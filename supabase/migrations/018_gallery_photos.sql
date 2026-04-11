create table gallery_photos (
  id uuid primary key default gen_random_uuid(),
  image_url text not null,
  alt text not null default '',
  sort_order integer not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now()
);

alter table gallery_photos enable row level security;

create policy "Public read published gallery photos" on gallery_photos
  for select using (is_published = true);

create policy "Admin all gallery photos" on gallery_photos
  for all using (auth.role() = 'authenticated');

-- Seed with the current hardcoded photos so the homepage keeps rendering.
insert into gallery_photos (image_url, alt, sort_order) values
  ('/groepsfotos/IMG_6011.jpeg', 'Sportac 86 Deinze — groepsfoto', 1),
  ('/groepsfotos/IMG_6015.jpeg', 'Sportac 86 Deinze — groepsfoto', 2),
  ('/groepsfotos/IMG_6016.jpeg', 'Sportac 86 Deinze — groepsfoto', 3),
  ('/groepsfotos/IMG_6017.jpeg', 'Sportac 86 Deinze — groepsfoto', 4);
