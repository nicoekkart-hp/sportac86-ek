-- Change discipline from text to text[] to support multiple disciplines per athlete
alter table team_members
  alter column discipline type text[]
  using case
    when discipline is null then null
    else array[discipline]
  end;
