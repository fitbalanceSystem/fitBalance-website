-- ============================================================
--  FitBalance — Store CMS Migration
--  הרץ ב-Supabase SQL Editor
-- ============================================================

-- ===== 1. PRODUCTS — עמודות חסרות =====
alter table products add column if not exists sku              text;
alter table products add column if not exists brand            text;
alter table products add column if not exists tags             text[];
alter table products add column if not exists short_desc       text;
alter table products add column if not exists full_desc        text;
alter table products add column if not exists sale_price       numeric(10,2);
alter table products add column if not exists discount_pct     numeric(5,2);
alter table products add column if not exists sale_start       date;
alter table products add column if not exists sale_end         date;
alter table products add column if not exists low_stock_threshold int default 5;
alter table products add column if not exists subcategory_id   bigint references shop_categories(id);

-- ===== 2. PROMOTIONS =====
create table if not exists promotions (
  id           bigint generated always as identity primary key,
  created_at   timestamptz default now(),
  name         text not null,
  type         text not null check (type in ('percent','fixed','coupon','category','product')),
  value        numeric(10,2) not null default 0,
  coupon_code  text,
  category_id  bigint references shop_categories(id),
  product_id   bigint references products(id),
  min_order    numeric(10,2),
  start_date   date,
  end_date     date,
  is_active    boolean not null default true,
  description  text
);

alter table promotions enable row level security;
create policy "promotions_public_read" on promotions for select using (is_active = true);
create policy "promotions_admin_all"   on promotions for all to authenticated using (true) with check (true);

-- ===== 3. STORE SETTINGS =====
create table if not exists store_settings (
  key   text primary key,
  value jsonb
);

alter table store_settings enable row level security;
create policy "store_settings_public_read" on store_settings for select using (true);
create policy "store_settings_admin_write" on store_settings for all to authenticated using (true) with check (true);

-- ברירות מחדל
insert into store_settings (key, value) values
  ('logo_url',       'null'),
  ('primary_color',  '"#ec4899"'),
  ('secondary_color','"#8b5cf6"'),
  ('store_name',     '"FitBalance"'),
  ('contact_phone',  '""'),
  ('contact_email',  '""'),
  ('contact_address','""'),
  ('social_instagram','""'),
  ('social_facebook', '""'),
  ('social_whatsapp', '""'),
  ('shipping_free_above', '200'),
  ('shipping_price',      '30'),
  ('shipping_note',       '""'),
  ('payment_methods',     '["bit","cash","transfer"]'),
  ('homepage_hero',       '{"title":"","subtitle":"","image_url":"","cta_text":"","cta_link":""}'),
  ('homepage_featured_ids','[]'),
  ('homepage_recommended_ids','[]'),
  ('homepage_show_categories','[]')
on conflict (key) do nothing;

-- ===== 4. SHOP CATEGORIES — עמודות חסרות =====
alter table shop_categories add column if not exists image_url text;
alter table shop_categories add column if not exists is_visible boolean not null default true;
