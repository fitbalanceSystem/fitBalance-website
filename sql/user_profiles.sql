-- ============================================================
-- user_profiles
-- גשר בין Supabase Auth (auth.users) לנתונים העסקיים
-- role אפשרי: customer | instructor | attendance | manager | admin
-- linked_table + linked_id מצביעים על הרשומה העסקית המתאימה
-- ============================================================

create table if not exists public.user_profiles (
  id            uuid primary key default gen_random_uuid(),
  auth_id       uuid not null unique references auth.users(id) on delete cascade,
  role          text not null check (role in ('customer','instructor','attendance','manager','admin')),
  linked_table  text,         -- 'customers' | 'instructors' | null
  linked_id     bigint,       -- id ברשומה העסקית
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- אינדקס לחיפוש מהיר לפי auth_id
create index if not exists idx_user_profiles_auth_id on public.user_profiles(auth_id);

-- RLS
alter table public.user_profiles enable row level security;

-- משתמש מחובר יכול לקרוא רק את הפרופיל שלו
create policy "user can read own profile"
  on public.user_profiles for select
  to authenticated
  using (auth_id = auth.uid());

-- רק service_role יכול לכתוב (מיגרציה, ניהול)
create policy "service role can manage profiles"
  on public.user_profiles for all
  to service_role
  using (true)
  with check (true);

-- פונקציה לעדכון updated_at אוטומטי
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger on_user_profiles_updated
  before update on public.user_profiles
  for each row execute procedure public.handle_updated_at();
