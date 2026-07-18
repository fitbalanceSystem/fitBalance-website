-- ============================================================
--  FitBalance — Guest Orders Migration
--  מאפשר הזמנות אורח (customer_id = NULL)
--  הרץ ב-Supabase SQL Editor
-- ============================================================

-- 1. הפוך customer_id ל-nullable
alter table orders alter column customer_id drop not null;

-- 2. הוסף עמודות לפרטי אורח
alter table orders add column if not exists guest_name    text;
alter table orders add column if not exists guest_phone   text;
alter table orders add column if not exists guest_email   text;
alter table orders add column if not exists guest_address text;
alter table orders add column if not exists guest_notes   text;

-- 3. RLS — אפשר לאנונימי להכניס הזמנת אורח
drop policy if exists "orders_guest_insert" on orders;
create policy "orders_guest_insert" on orders
  for insert to anon
  with check (customer_id is null);

drop policy if exists "order_items_guest_insert" on order_items;
create policy "order_items_guest_insert" on order_items
  for insert to anon
  with check (true);
