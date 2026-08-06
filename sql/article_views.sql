-- מעקב צפיות מאמרים
create table if not exists article_views (
  id         bigserial primary key,
  article_id bigint not null references articles(id) on delete cascade,
  ip_address text,
  viewed_at  timestamptz default now()
);

create index if not exists article_views_article_id_idx on article_views(article_id);

-- RLS — תואם למבנה הקיים:
-- anon: אין גישה (בשלב זה אין רישום מהאתר הציבורי)
-- authenticated (מנהל): גישה מלאה
alter table article_views enable row level security;

create policy "views_admin_all" on article_views
  for all to authenticated using (true) with check (true);
