-- Public storage bucket for gallery photos and other admin-uploaded images.
insert into storage.buckets (id, name, public)
values ('gallery', 'gallery', true)
on conflict (id) do nothing;

-- Public can read files (bucket is public, but keep policies explicit).
create policy "Public read gallery objects"
  on storage.objects for select
  using (bucket_id = 'gallery');

-- Authenticated admins can write/update/delete.
create policy "Admin insert gallery objects"
  on storage.objects for insert
  with check (bucket_id = 'gallery' and auth.role() = 'authenticated');

create policy "Admin update gallery objects"
  on storage.objects for update
  using (bucket_id = 'gallery' and auth.role() = 'authenticated');

create policy "Admin delete gallery objects"
  on storage.objects for delete
  using (bucket_id = 'gallery' and auth.role() = 'authenticated');
