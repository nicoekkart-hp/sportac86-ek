-- Allow authenticated users (admins) to read all rows (including unpublished)
create policy "Admin read events" on events
  for select to authenticated using (true);

create policy "Admin write events" on events
  for all to authenticated using (true) with check (true);

create policy "Admin read registrations" on registrations
  for select to authenticated using (true);

create policy "Admin delete registrations" on registrations
  for delete to authenticated using (true);

create policy "Admin read donations" on donations
  for select to authenticated using (true);

create policy "Admin read orders" on orders
  for select to authenticated using (true);

create policy "Admin write orders" on orders
  for update to authenticated using (true) with check (true);

create policy "Admin write team" on team_members
  for all to authenticated using (true) with check (true);

create policy "Admin write sponsors" on sponsors
  for all to authenticated using (true) with check (true);

create policy "Admin read sponsor_requests" on sponsor_requests
  for select to authenticated using (true);
