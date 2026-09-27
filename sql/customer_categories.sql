-- =====================================================
-- קטגוריות מתאמנות — נשים / ילדות / נערות
-- =====================================================

-- 1. טבלת קטגוריות עם צבע
create table if not exists customer_categories (
  id          serial primary key,
  code        text not null unique,          -- מזהה קצר: women / girls / teens
  label       text not null,                 -- תווית בעברית
  color       text not null default '#8b5cf6', -- צבע HEX
  sort_order  int  not null default 0,
  is_active   boolean not null default true
);

-- 2. ערכי ברירת מחדל
insert into customer_categories (code, label, color, sort_order) values
  ('women', 'נשים',   '#ec4899', 1),
  ('girls', 'ילדות',  '#8b5cf6', 2),
  ('teens', 'נערות',  '#06b6d4', 3)
on conflict (code) do nothing;

-- 3. הוספת עמודה לטבלת לקוחות
alter table customers
  add column if not exists category_code text references customer_categories(code);

-- 4. RLS — אדמין/מנהל יכולים לקרוא ולכתוב
alter table customer_categories enable row level security;

create policy "read categories" on customer_categories
  for select to authenticated using (true);

create policy "manage categories" on customer_categories
  for all to authenticated
  using (
    auth.uid() in (
      select auth_id from user_profiles where role in ('admin','manager')
    )
  );
