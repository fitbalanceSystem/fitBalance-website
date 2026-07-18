-- ============================================================
--  FitBalance — Products & Shop
--  הרץ ב-Supabase SQL Editor
-- ============================================================

-- ===== 1. PRODUCTS ===========================================
-- הטבלה קיימת — רק מוסיפים עמודות חסרות
alter table products add column if not exists stock int;
alter table products add column if not exists emoji text;

alter table products enable row level security;

drop policy if exists "products_public_read" on products;
drop policy if exists "products_admin_all"   on products;

-- כולם יכולים לקרוא מוצרים פעילים
create policy "products_public_read" on products
  for select using (is_active = true);

-- רק מחוברים (מנהלים) יכולים לנהל
create policy "products_admin_all" on products
  for all to authenticated using (true) with check (true);


-- ===== 2. ORDERS =============================================
create table if not exists orders (
  id          bigint generated always as identity primary key,
  created_at  timestamptz default now(),
  customer_id bigint      not null references customers(id) on delete cascade,
  total       numeric(10,2) not null default 0,
  status      text        not null default 'pending'
                          check (status in ('pending','completed','cancelled'))
);

alter table orders enable row level security;

drop policy if exists "orders_customer_read"   on orders;
drop policy if exists "orders_customer_insert" on orders;
drop policy if exists "orders_admin_all"        on orders;

-- לקוח רואה רק את ההזמנות שלו
create policy "orders_customer_read" on orders
  for select to authenticated
  using (customer_id = (
    select id from customers where email = auth.jwt()->>'email' limit 1
  ));

-- לקוח יכול ליצור הזמנה לעצמו
create policy "orders_customer_insert" on orders
  for insert to authenticated
  with check (customer_id = (
    select id from customers where email = auth.jwt()->>'email' limit 1
  ));

-- מנהל רואה הכל
create policy "orders_admin_all" on orders
  for all to authenticated using (true) with check (true);


-- ===== 3. ORDER_ITEMS ========================================
create table if not exists order_items (
  id          bigint generated always as identity primary key,
  order_id    bigint not null references orders(id) on delete cascade,
  product_id  bigint not null references products(id) on delete restrict,
  quantity    int    not null default 1 check (quantity > 0),
  price       numeric(10,2) not null        -- מחיר בזמן הרכישה
);

alter table order_items enable row level security;

create policy "order_items_customer_read" on order_items
  for select to authenticated
  using (order_id in (
    select id from orders where customer_id = (
      select id from customers where email = auth.jwt()->>'email' limit 1
    )
  ));

create policy "order_items_customer_insert" on order_items
  for insert to authenticated
  with check (order_id in (
    select id from orders where customer_id = (
      select id from customers where email = auth.jwt()->>'email' limit 1
    )
  ));

create policy "order_items_admin_all" on order_items
  for all to authenticated using (true) with check (true);


-- ===== 4. STORAGE — bucket: products =========================
-- הרץ אחרי שיצרת את ה-bucket "products" ב-Dashboard

insert into storage.buckets (id, name, public)
values ('products', 'products', true)
on conflict (id) do nothing;

create policy "products_storage_public_read" on storage.objects
  for select using (bucket_id = 'products');

create policy "products_storage_admin_write" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'products');

create policy "products_storage_admin_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'products');

create policy "products_storage_admin_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'products');


-- ===== 5. SEED — מוצרים לדוגמה ==============================
insert into products (name, description, price, category, stock, emoji, is_active) values
  ('גרביים ספורט',    'גרביים איכותיות לאימון',        29.90, 'ביגוד',  50,  '🧦', true),
  ('בקבוק מים 750ml', 'בקבוק אלומיניום עם לוגו',       59.90, 'ציוד',   30,  '💧', true),
  ('גומיית התנגדות',  'סט 3 גומיות בעוצמות שונות',     89.90, 'ציוד',   20,  '🏋️', true),
  ('מגבת מיקרופייבר', 'מגבת קטנה לאימון',              49.90, 'ביגוד',  40,  '🏃', true),
  ('שייקר חלבון',     'כוס ערבוב 600ml',               39.90, 'תזונה',  25,  '🥤', true);
