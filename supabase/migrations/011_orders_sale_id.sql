-- Add sale_id to orders
alter table orders add column sale_id uuid references sales(id) on delete set null;

-- Migrate existing orders: candy → snoep, wine → wijn
update orders set sale_id = (select id from sales where slug = 'snoep') where type = 'candy';
update orders set sale_id = (select id from sales where slug = 'wijn') where type = 'wine';

-- Drop old type column
alter table orders drop column type;
