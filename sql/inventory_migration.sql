-- ============================================================
--  FitBalance — Inventory Migration
--  הרץ ב-Supabase SQL Editor
-- ============================================================

-- עמודות חסרות בטבלת products
alter table products add column if not exists sku                 text;
alter table products add column if not exists low_stock_threshold int default 5;
alter table products add column if not exists brand               text;
alter table products add column if not exists full_desc           text;
alter table products add column if not exists sale_price          numeric(10,2);
alter table products add column if not exists discount_pct        numeric(5,2);
alter table products add column if not exists sale_start          date;
alter table products add column if not exists sale_end            date;
alter table products add column if not exists category_id         bigint references shop_categories(id) on delete set null;
alter table products add column if not exists tags                text[] default '{}';
alter table products add column if not exists variant_required    boolean default false;

-- עמודות חסרות בטבלת product_variants
alter table product_variants add column if not exists sku        text;
alter table product_variants add column if not exists image_url  text;
alter table product_variants add column if not exists color_hex  text;
alter table product_variants add column if not exists is_required boolean default false;
