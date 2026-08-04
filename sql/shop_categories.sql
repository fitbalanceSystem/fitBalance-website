-- ============================================================
--  FitBalance — קטגוריות חנות היררכיות (עץ אין-סופי)
--  הרץ ב-Supabase SQL Editor
-- ============================================================

drop table if exists shop_categories cascade;

create table shop_categories (
  id         bigint generated always as identity primary key,
  name       text   not null,
  parent_id  bigint references shop_categories(id) on delete cascade,
  sort_order int    not null default 0,
  unique (name, parent_id)
);

alter table shop_categories enable row level security;

create policy "shop_cat_public_read" on shop_categories for select using (true);
create policy "shop_cat_admin_write" on shop_categories for all to authenticated using (true) with check (true);

-- נתוני ברירת מחדל
insert into shop_categories (name, parent_id, sort_order) values
  ('FOREVER', null, 1),
  ('ביגוד',   null, 2),
  ('ציוד',    null, 3);

-- תת-קטגוריות FOREVER
insert into shop_categories (name, parent_id, sort_order)
select s.name, p.id, s.ord from (values
  ('חולצות',1),('מכנסיים',2),('חזיות ספורט',3),('אביזרים',4)
) as s(name,ord), shop_categories p where p.name='FOREVER' and p.parent_id is null;

-- תת-קטגוריות ביגוד
insert into shop_categories (name, parent_id, sort_order)
select s.name, p.id, s.ord from (values
  ('חולצות',1),('מכנסיים',2),('גרביים',3),('אביזרים',4)
) as s(name,ord), shop_categories p where p.name='ביגוד' and p.parent_id is null;

-- תת-קטגוריות ציוד
insert into shop_categories (name, parent_id, sort_order)
select s.name, p.id, s.ord from (values
  ('כלי אימון',1),('בקבוקים',2),('מזרנים',3),('גומיות',4)
) as s(name,ord), shop_categories p where p.name='ציוד' and p.parent_id is null;
