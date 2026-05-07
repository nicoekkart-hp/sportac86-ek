-- Public storage bucket for sponsor logos uploaded via the admin form.
insert into storage.buckets (id, name, public)
values ('sponsor-logos', 'sponsor-logos', true)
on conflict (id) do nothing;

create policy "Public read sponsor-logos objects"
  on storage.objects for select
  using (bucket_id = 'sponsor-logos');

create policy "Admin insert sponsor-logos objects"
  on storage.objects for insert
  with check (bucket_id = 'sponsor-logos' and auth.role() = 'authenticated');

create policy "Admin update sponsor-logos objects"
  on storage.objects for update
  using (bucket_id = 'sponsor-logos' and auth.role() = 'authenticated');

create policy "Admin delete sponsor-logos objects"
  on storage.objects for delete
  using (bucket_id = 'sponsor-logos' and auth.role() = 'authenticated');
