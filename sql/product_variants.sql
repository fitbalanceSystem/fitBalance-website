-- ============================================================
--  FitBalance — Product Variants
-- ============================================================

create table if not exists product_variants (
  id             bigint generated always as identity primary key,
  product_id     bigint not null references products(id) on delete cascade,
  option_type    text   not null,   -- 'size' | 'color' | 'pack' | 'custom'
  option_value   text   not null,   -- 'S','M','L' | '#ff0000,אדום' | 'זוג' | ...
  price_modifier numeric(10,2) not null default 0,
  stock          int,
  sku            text,
  sort_order     int not null default 0,
  is_active      boolean not null default true
);

alter table product_variants enable row level security;

create policy "variants_public_read" on product_variants
  for select using (is_active = true);

create policy "variants_admin_all" on product_variants
  for all to authenticated using (true) with check (true);

-- פונקציה להורדת מלאי לפי וריאנט
create or replace function decrement_variant_stock(p_variant_id bigint, p_qty int)
returns void language plpgsql as $$
begin
  update product_variants
  set stock = greatest(0, stock - p_qty)
  where id = p_variant_id and stock is not null;
end;
$$;

-- פונקציה להורדת מלאי מוצר (ללא וריאנט)
create or replace function decrement_stock(p_product_id bigint, p_qty int)
returns void language plpgsql as $$
begin
  update products
  set stock = greatest(0, stock - p_qty)
  where id = p_product_id and stock is not null;
end;
$$;

-- עמודת variant_id ב-order_items
alter table order_items add column if not exists variant_id bigint references product_variants(id) on delete set null;
alter table order_items add column if not exists variant_label text;
