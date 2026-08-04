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
  author         text,
  category       text,
  video_url      text,
  thumbnail_url  text,
  tags           text[],
  is_published   boolean not null default false,
  published_at   timestamptz,
  show_home        boolean not null default false,
  show_customers   boolean not null default false,
  show_instructors boolean not null default false,
  sort_order     int default 0
);

-- הוספת עמודות חסרות לטבלה קיימת
alter table articles add column if not exists slug           text unique;
alter table articles add column if not exists summary        text;
alter table articles add column if not exists author         text;
alter table articles add column if not exists category       text;
alter table articles add column if not exists published_at   timestamptz;

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
