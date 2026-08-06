-- FitBalance — Articles / Content
create table if not exists articles (
  id             bigint generated always as identity primary key,
  created_at     timestamptz default now(),
  updated_at     timestamptz default now(),
  type           text not null default 'video' check (type in ('video','post','tip')),
  title          text not null,
  slug           text unique,
  description    text,
  summary        text,
  content        text,
  author         text,
  category       text,
  video_url      text,
  thumbnail_url  text,
  cover_image_url text,
  tags           text[],
  is_published   boolean not null default false,
  published_at   timestamptz,
  show_home        boolean not null default false,
  show_customers   boolean not null default false,
  show_instructors boolean not null default false,
  sort_order     int default 0
);

-- הוספת עמודות חסרות לטבלה קיימת
alter table articles add column if not exists slug            text unique;
alter table articles add column if not exists summary         text;
alter table articles add column if not exists content         text;
alter table articles add column if not exists author          text;
alter table articles add column if not exists category        text;
alter table articles add column if not exists published_at    timestamptz;
alter table articles add column if not exists cover_image_url text;
alter table articles add column if not exists hero_type       text default 'image'; -- 'image' | 'video' | 'none'

-- הסר check נוקשה על type והחלף בגמיש חופשי
alter table articles drop constraint if exists articles_type_check;

-- טבלת מדיה נפרדת לכל פריטי מדיה של כתבה
create table if not exists article_media (
  id          bigint generated always as identity primary key,
  article_id  bigint not null references articles(id) on delete cascade,
  created_at  timestamptz default now(),
  type        text not null default 'image', -- 'image' | 'video'
  url         text not null,
  caption     text,
  placement   text not null default 'gallery', -- 'hero' | 'body' | 'gallery'
  position    int  not null default 0,
  meta        jsonb default '{}'
);

alter table article_media enable row level security;
create policy "media_public_read" on article_media for select using (
  exists (select 1 from articles where id = article_id and is_published = true)
);
create policy "media_admin_all" on article_media for all to authenticated using (true) with check (true);

create index if not exists article_media_article_id_idx on article_media(article_id);
create index if not exists article_media_position_idx   on article_media(article_id, position);

alter table articles enable row level security;
create policy "articles_public_read"  on articles for select using (is_published = true);
create policy "articles_admin_all"    on articles for all to authenticated using (true) with check (true);

-- עדכון updated_at אוטומטי
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger articles_updated_at
  before update on articles
  for each row execute function set_updated_at();
