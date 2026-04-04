-- Change bio from free text to structured jsonb
-- Existing text bios are discarded (set to null) since they don't match the new structure
alter table team_members
  alter column bio type jsonb
  using null;
