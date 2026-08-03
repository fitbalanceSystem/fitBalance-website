-- ============================================================
-- articles — מאמרים / בלוג
-- ============================================================

create table if not exists public.articles (
  id            bigint generated always as identity primary key,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now(),
  title         text not null,
  slug          text not null unique,
  summary       text,
  content       text,
  image_url     text,
  author        text,
  category      text,
  status        text not null default 'draft' check (status in ('draft','published')),
  published_at  timestamptz,
  meta_title    text,
  meta_desc     text,
  show_public   boolean not null default true,
  show_customers boolean not null default false,
  show_employees boolean not null default false
);

-- אינדקס לחיפוש מהיר לפי slug
create index if not exists idx_articles_slug   on public.articles(slug);
create index if not exists idx_articles_status on public.articles(status);

-- עדכון updated_at אוטומטי (משתמש בפונקציה הקיימת מ-user_profiles.sql)
create trigger on_articles_updated
  before update on public.articles
  for each row execute procedure public.handle_updated_at();

-- RLS
alter table public.articles enable row level security;

-- קריאה ציבורית — רק מאמרים מפורסמים
create policy "public can read published articles"
  on public.articles for select
  to anon, authenticated
  using (status = 'published');

-- אדמין — קריאה מלאה (כולל טיוטות)
create policy "admin can read all articles"
  on public.articles for select
  to authenticated
  using (
    auth.uid() in (
      select auth_id from public.user_profiles where role = 'admin'
    )
  );

-- אדמין — כתיבה מלאה
create policy "admin can insert articles"
  on public.articles for insert
  to authenticated
  with check (
    auth.uid() in (
      select auth_id from public.user_profiles where role = 'admin'
    )
  );

create policy "admin can update articles"
  on public.articles for update
  to authenticated
  using (
    auth.uid() in (
      select auth_id from public.user_profiles where role = 'admin'
    )
  );

create policy "admin can delete articles"
  on public.articles for delete
  to authenticated
  using (
    auth.uid() in (
      select auth_id from public.user_profiles where role = 'admin'
    )
  );
