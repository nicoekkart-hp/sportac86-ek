alter table products
  add column pack_size integer,
  add column pack_price_cents integer;

alter table products
  add constraint products_pack_pricing_both_or_neither
  check (
    (pack_size is null and pack_price_cents is null)
    or (pack_size > 1 and pack_price_cents > 0)
  );
