-- ============================================================
-- FitBalance — Community Content System (v2)
-- ============================================================

-- סוגי תוכן (ניתן להרחבה)
create table if not exists content_types (
  id          text primary key,  -- 'event','workshop','announcement','promotion','launch','activity','special'
  label       text not null,
  icon        text not null,
  color       text not null default '#8b5cf6',
  bg_color    text not null default '#f3f0ff',
  sort_order  int  default 0
);

insert into content_types (id, label, icon, color, bg_color, sort_order) values
  ('event',        'אירוע',           'fa-calendar-star',  '#8b5cf6', '#f3f0ff', 1),
  ('workshop',     'סדנה',            'fa-chalkboard',     '#ec4899', '#fdf2f8', 2),
  ('announcement', 'מודעה',           'fa-bullhorn',       '#f59e0b', '#fffbeb', 3),
  ('promotion',    'מבצע',            'fa-tag',            '#10b981', '#ecfdf5', 4),
  ('launch',       'השקה',            'fa-rocket',         '#6366f1', '#eef2ff', 5),
  ('activity',     'פעילות מיוחדת',  'fa-star',           '#f43f5e', '#fff1f2', 6),
  ('general',      'כללי',            'fa-circle-info',    '#64748b', '#f8fafc', 7)
on conflict (id) do nothing;

-- טבלה ראשית
drop table if exists community_events cascade;
create table community_events (
  id               bigint generated always as identity primary key,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now(),

  -- סוג ומזהה
  type             text not null default 'event' references content_types(id),
  slug             text unique,

  -- תוכן
  title            text not null,
  subtitle         text,
  description      text,
  content          text,
  excerpt          text,

  -- מדיה
  thumbnail_url    text,
  cover_url        text,
  gallery          jsonb default '[]',   -- [{url, caption, sort}]
  videos           jsonb default '[]',   -- [{url, type:'youtube'|'upload', title}]
  attachments      jsonb default '[]',   -- [{url, name, size, type}]

  -- תאריכים ומיקום
  event_date       timestamptz,
  event_end        timestamptz,
  location         text,
  location_url     text,

  -- מחיר
  is_free          boolean default true,
  price            numeric(10,2),
  price_label      text,

  -- קיבולת
  max_spots        int,
  spots_taken      int default 0,

  -- מטא
  category         text,
  tags             text[] default '{}',
  badge            text,   -- 'new','featured','free','sold_out','coming_soon','ended'

  -- SEO
  seo_title        text,
  seo_description  text,
  og_image_url     text,

  -- תזמון
  is_published     boolean not null default false,
  publish_at       timestamptz,
  unpublish_at     timestamptz,
  status           text not null default 'draft',  -- 'draft','published','archived'

  -- תצוגה
  is_pinned        boolean default false,
  is_featured      boolean default false,
  show_home        boolean default false,
  sort_order       int default 0,

  -- סטטיסטיקות
  views_count      int default 0,
  likes_count      int default 0,
  saves_count      int default 0,
  shares_count     int default 0,
  registrations_count int default 0
);

-- הרשמות
create table if not exists event_registrations (
  id           bigint generated always as identity primary key,
  created_at   timestamptz default now(),
  event_id     bigint not null references community_events(id) on delete cascade,
  user_id      uuid references auth.users(id) on delete set null,
  full_name    text,
  phone        text,
  email        text,
  notes        text,
  status       text default 'confirmed',  -- 'confirmed','waitlist','cancelled'
  paid         boolean default false,
  payment_ref  text
);

-- אינטראקציות משתמשים
create table if not exists event_interactions (
  id         bigint generated always as identity primary key,
  created_at timestamptz default now(),
  event_id   bigint not null references community_events(id) on delete cascade,
  user_id    uuid references auth.users(id) on delete cascade,
  type       text not null,  -- 'like','save','pin','follow','share'
  unique(event_id, user_id, type)
);

-- שאלות ותשובות
create table if not exists event_faq (
  id         bigint generated always as identity primary key,
  event_id   bigint not null references community_events(id) on delete cascade,
  question   text not null,
  answer     text not null,
  sort_order int default 0
);

-- לו"ז
create table if not exists event_schedule (
  id         bigint generated always as identity primary key,
  event_id   bigint not null references community_events(id) on delete cascade,
  time_label text,
  title      text not null,
  description text,
  sort_order int default 0
);

-- RLS
alter table community_events      enable row level security;
alter table event_registrations   enable row level security;
alter table event_interactions    enable row level security;
alter table event_faq             enable row level security;
alter table event_schedule        enable row level security;
alter table content_types         enable row level security;

-- Policies — community_events
create policy "ce_public_read"  on community_events for select using (is_published = true and status = 'published');
create policy "ce_admin_all"    on community_events for all to authenticated using (true) with check (true);

-- Policies — registrations
create policy "reg_user_insert" on event_registrations for insert with check (true);
create policy "reg_user_select" on event_registrations for select using (user_id = auth.uid());
create policy "reg_admin_all"   on event_registrations for all to authenticated using (true) with check (true);

-- Policies — interactions
create policy "int_user_all"    on event_interactions for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "int_admin_all"   on event_interactions for all to authenticated using (true) with check (true);

-- Policies — faq / schedule / content_types
create policy "faq_public"      on event_faq      for select using (true);
create policy "faq_admin"       on event_faq      for all to authenticated using (true) with check (true);
create policy "sched_public"    on event_schedule for select using (true);
create policy "sched_admin"     on event_schedule for all to authenticated using (true) with check (true);
create policy "ct_public"       on content_types  for select using (true);
create policy "ct_admin"        on content_types  for all to authenticated using (true) with check (true);

-- Indexes
create index if not exists ce_status_idx      on community_events(status, is_published);
create index if not exists ce_type_idx        on community_events(type);
create index if not exists ce_event_date_idx  on community_events(event_date);
create index if not exists ce_pinned_idx      on community_events(is_pinned, sort_order);
create index if not exists reg_event_idx      on event_registrations(event_id);
create index if not exists int_event_idx      on event_interactions(event_id, type);

-- updated_at trigger
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger ce_updated_at
  before update on community_events
  for each row execute function set_updated_at();

-- view: spots_available
create or replace view community_events_view as
select
  ce.*,
  coalesce(ce.max_spots - ce.spots_taken, null) as spots_available,
  case
    when ce.event_end   is not null and ce.event_end   < now() then 'ended'
    when ce.event_date  is not null and ce.event_date  < now() then 'ongoing'
    when ce.event_date  is not null and ce.event_date  > now() then 'upcoming'
    else 'open'
  end as time_status
from community_events ce;
