-- Snapshot the order total at purchase time so historical orders are not
-- affected by later price changes on products / pack_groups.

alter table orders
  add column amount_cents integer;

-- Backfill existing rows from CURRENT prices. This is best-effort: we don't
-- know what the prices were when these orders were placed. From here on,
-- new orders write amount_cents at insert time and the value is frozen.
with line_totals as (
  select
    o.id as order_id,
    coalesce(sum(
      case
        -- Pack-grouped product: pack pricing applies once we know the
        -- group total. We can't compute mixed pack/single split per row
        -- in pure SQL easily, so fall back to unit price * qty here and
        -- correct grouped orders below.
        when p.pack_group_id is not null then pg.unit_price_cents * (item.qty)::int
        else p.price_cents * (item.qty)::int
      end
    ), 0) as fallback_total
  from orders o
  cross join lateral jsonb_each_text(coalesce(o.items, '{}'::jsonb)) as item(product_id, qty)
  left join products p on p.id = item.product_id::uuid
  left join pack_groups pg on pg.id = p.pack_group_id
  group by o.id
),
group_totals as (
  -- For each (order, pack_group), apply pack pricing: floor(total_qty/pack_size) packs + remainder singles.
  select
    o.id as order_id,
    pg.id as group_id,
    sum((item.qty)::int) as total_qty,
    pg.pack_size,
    pg.pack_price_cents,
    pg.unit_price_cents
  from orders o
  cross join lateral jsonb_each_text(coalesce(o.items, '{}'::jsonb)) as item(product_id, qty)
  join products p on p.id = item.product_id::uuid
  join pack_groups pg on pg.id = p.pack_group_id
  group by o.id, pg.id, pg.pack_size, pg.pack_price_cents, pg.unit_price_cents
),
group_priced as (
  select
    order_id,
    sum(
      (total_qty / pack_size) * pack_price_cents
      + (total_qty % pack_size) * unit_price_cents
    )::int as group_total
  from group_totals
  group by order_id
),
ungrouped_priced as (
  select
    o.id as order_id,
    coalesce(sum(p.price_cents * (item.qty)::int), 0)::int as ungrouped_total
  from orders o
  cross join lateral jsonb_each_text(coalesce(o.items, '{}'::jsonb)) as item(product_id, qty)
  join products p on p.id = item.product_id::uuid
  where p.pack_group_id is null
  group by o.id
)
update orders o
set amount_cents = coalesce(gp.group_total, 0) + coalesce(up.ungrouped_total, 0)
from line_totals lt
left join group_priced gp on gp.order_id = lt.order_id
left join ungrouped_priced up on up.order_id = lt.order_id
where o.id = lt.order_id
  and o.amount_cents is null;

-- Anything still null (e.g. legacy orders with no sale_id / unknown product ids)
-- defaults to 0 rather than blocking the NOT NULL constraint.
update orders set amount_cents = 0 where amount_cents is null;

alter table orders
  alter column amount_cents set not null;
