-- הוספת עמודות מדיה לטבלת מוצרים
alter table products add column if not exists images jsonb default '[]'::jsonb;
alter table products add column if not exists videos jsonb default '[]'::jsonb;
alter table products add column if not exists category_id bigint references shop_categories(id) on delete set null;
