-- ============================================================
--  FitBalance — Shop Upgrade Migration
--  הרץ ב-Supabase SQL Editor
-- ============================================================

-- ===== 1. עדכון קטגוריות חנות לחנות ליפסטייל מלאה ==========
truncate table shop_categories restart identity cascade;

insert into shop_categories (name, parent_id, sort_order) values
  ('FOREVER',          null, 1),
  ('תזונה ובריאות',    null, 2),
  ('יופי וטיפוח',      null, 3),
  ('ביגוד',            null, 4),
  ('ביגוד ספורט',      null, 5),
  ('אביזרים',          null, 6),
  ('ציוד ספורט',       null, 7),
  ('לייפסטייל',        null, 8);

-- תת-קטגוריות FOREVER
insert into shop_categories (name, parent_id, sort_order)
select s.name, p.id, s.ord from (values
  ('תוספי תזונה',1),('מוצרי אלוורה',2),('טיפוח עור',3),('ניהול משקל',4),('חיסון ואנרגיה',5)
) as s(name,ord), shop_categories p where p.name='FOREVER' and p.parent_id is null;

-- תת-קטגוריות תזונה ובריאות
insert into shop_categories (name, parent_id, sort_order)
select s.name, p.id, s.ord from (values
  ('חלבונים',1),('ויטמינים',2),('שייקים',3),('חטיפי בריאות',4),('שמנים ואומגה',5)
) as s(name,ord), shop_categories p where p.name='תזונה ובריאות' and p.parent_id is null;

-- תת-קטגוריות יופי וטיפוח
insert into shop_categories (name, parent_id, sort_order)
select s.name, p.id, s.ord from (values
  ('קרמים ולחות',1),('סרום ופנים',2),('שיער',3),('גוף',4),('ניחוחות',5)
) as s(name,ord), shop_categories p where p.name='יופי וטיפוח' and p.parent_id is null;

-- תת-קטגוריות ביגוד
insert into shop_categories (name, parent_id, sort_order)
select s.name, p.id, s.ord from (values
  ('חולצות',1),('מכנסיים',2),('שמלות',3),('אביזרי לבוש',4)
) as s(name,ord), shop_categories p where p.name='ביגוד' and p.parent_id is null;

-- תת-קטגוריות ביגוד ספורט
insert into shop_categories (name, parent_id, sort_order)
select s.name, p.id, s.ord from (values
  ('חולצות ספורט',1),('מכנסי ספורט',2),('חזיות ספורט',3),('גרביים',4),('נעלי ספורט',5)
) as s(name,ord), shop_categories p where p.name='ביגוד ספורט' and p.parent_id is null;

-- תת-קטגוריות אביזרים
insert into shop_categories (name, parent_id, sort_order)
select s.name, p.id, s.ord from (values
  ('תיקים',1),('כובעים',2),('תכשיטי ספורט',3),('שעונים',4)
) as s(name,ord), shop_categories p where p.name='אביזרים' and p.parent_id is null;

-- תת-קטגוריות ציוד ספורט
insert into shop_categories (name, parent_id, sort_order)
select s.name, p.id, s.ord from (values
  ('גומיות התנגדות',1),('משקולות',2),('מזרנים',3),('כדורים',4),('בקבוקים',5),('ציוד פילאטיס',6)
) as s(name,ord), shop_categories p where p.name='ציוד ספורט' and p.parent_id is null;

-- תת-קטגוריות לייפסטייל
insert into shop_categories (name, parent_id, sort_order)
select s.name, p.id, s.ord from (values
  ('בית וסביבה',1),('מדיטציה ויוגה',2),('מתנות',3),('ספרים',4)
) as s(name,ord), shop_categories p where p.name='לייפסטייל' and p.parent_id is null;


-- ===== 2. שדות נוספים לטבלת מוצרים ===========================
alter table products add column if not exists original_price numeric(10,2);
alter table products add column if not exists is_featured    boolean default false;
alter table products add column if not exists is_new         boolean default false;
alter table products add column if not exists is_bestseller  boolean default false;
alter table products add column if not exists badge_text     text;
alter table products add column if not exists sort_order     int default 0;
alter table products add column if not exists images         jsonb default '[]';
alter table products add column if not exists videos         jsonb default '[]';


-- ===== 3. עדכון סטטוסי הזמנות ================================
-- הוסף עמודות חסרות להזמנות
alter table orders add column if not exists guest_name    text;
alter table orders add column if not exists guest_phone   text;
alter table orders add column if not exists guest_email   text;
alter table orders add column if not exists guest_address text;
alter table orders add column if not exists guest_notes   text;
alter table orders add column if not exists notes         text;
alter table orders add column if not exists coupon_code   text;
alter table orders add column if not exists discount      numeric(10,2) default 0;

-- עדכן constraint סטטוס להכיל את כל הסטטוסים החדשים
alter table orders drop constraint if exists orders_status_check;
alter table orders add constraint orders_status_check
  check (status in ('new','processing','waiting_for_payment','shipped','completed','cancelled'));

-- עדכן ברירת מחדל ל-new
alter table orders alter column status set default 'new';

-- העבר הזמנות ישנות עם סטטוסים שהוסרו
update orders set status = 'waiting_for_payment' where status = 'pending';
update orders set status = 'shipped'             where status = 'packed';
update orders set status = 'new'                 where status not in ('new','processing','waiting_for_payment','shipped','completed','cancelled');


-- ===== 4. טבלת קופונים ========================================
create table if not exists coupons (
  id           bigint generated always as identity primary key,
  created_at   timestamptz default now(),
  code         text not null unique,
  type         text not null check (type in ('percent','fixed')),
  value        numeric(10,2) not null,
  min_order    numeric(10,2) default 0,
  max_uses     int,
  uses_count   int default 0,
  expires_at   timestamptz,
  is_active    boolean default true,
  description  text
);

alter table coupons enable row level security;
create policy "coupons_public_read"  on coupons for select using (is_active = true);
create policy "coupons_admin_all"    on coupons for all to authenticated using (true) with check (true);

-- קופונים לדוגמה
insert into coupons (code, type, value, description, is_active) values
  ('FIT10',  'percent', 10,  '10% הנחה על כל הזמנה', true),
  ('FIT20',  'percent', 20,  '20% הנחה על כל הזמנה', true),
  ('SAVE30', 'fixed',   30,  '₪30 הנחה על הזמנה מעל ₪150', true),
  ('WELCOME','percent', 15,  '15% הנחה ללקוחות חדשים', true)
on conflict (code) do nothing;


-- ===== 5. טבלת ביקורות ========================================
create table if not exists product_reviews (
  id          bigint generated always as identity primary key,
  created_at  timestamptz default now(),
  product_id  bigint not null references products(id) on delete cascade,
  customer_id bigint references customers(id) on delete set null,
  guest_name  text,
  rating      int not null check (rating between 1 and 5),
  title       text,
  body        text,
  is_approved boolean default false
);

alter table product_reviews enable row level security;
create policy "reviews_public_read"   on product_reviews for select using (is_approved = true);
create policy "reviews_insert_anon"   on product_reviews for insert with check (true);
create policy "reviews_admin_all"     on product_reviews for all to authenticated using (true) with check (true);


-- ===== 6. טבלת מועדפים ========================================
create table if not exists favorites (
  id          bigint generated always as identity primary key,
  created_at  timestamptz default now(),
  customer_id bigint not null references customers(id) on delete cascade,
  product_id  bigint not null references products(id) on delete cascade,
  unique (customer_id, product_id)
);

alter table favorites enable row level security;
create policy "favorites_customer_all" on favorites
  for all to authenticated
  using (customer_id = (select id from customers where email = auth.jwt()->>'email' limit 1))
  with check (customer_id = (select id from customers where email = auth.jwt()->>'email' limit 1));
create policy "favorites_admin_all" on favorites for all to authenticated using (true) with check (true);


-- ===== 7. order_items — עמודות חסרות ==========================
alter table order_items add column if not exists variant_id    bigint;
alter table order_items add column if not exists variant_label text;


-- ===== 8. פונקציות עזר ========================================
create or replace function decrement_stock(p_product_id bigint, p_qty int)
returns void language plpgsql as $$
begin
  update products set stock = greatest(0, stock - p_qty)
  where id = p_product_id and stock is not null;
end;
$$;

create or replace function decrement_variant_stock(p_variant_id bigint, p_qty int)
returns void language plpgsql as $$
begin
  update product_variants set stock = greatest(0, stock - p_qty)
  where id = p_variant_id and stock is not null;
end;
$$;
