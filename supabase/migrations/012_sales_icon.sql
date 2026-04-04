alter table sales add column icon text not null default '🛍️';

-- Set emoji for existing seeded sales
update sales set icon = '🍬' where slug = 'snoep';
update sales set icon = '🍷' where slug = 'wijn';
