
-- טבלת מתעניינות חוגי היפ הופ
create table if not exists inquiries (
  id           bigint generated always as identity primary key,
  created_at   timestamptz default now(),
  child_name   text not null,
  last_name    text,
  mother_name  text,
  phone        text not null,
  email        text,
  group_code    int,          -- 1=נשים, 2=ילדות ונערות
  program_code  int,          -- 1=היפ הופ (ילדות), 2=היפ הופ (נערות), 3=היפ הופ (נשים)
  grade         text,
  source        int default 1 -- 1=אתר
);

-- הרשאות קריאה/כתיבה לאנונימי (טופס ציבורי)
alter table inquiries enable row level security;

create policy "allow insert" on inquiries
  for insert to anon with check (true);

create policy "allow read for admin" on inquiries
  for select to authenticated using (true);
