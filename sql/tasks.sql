create table if not exists tasks (
  id               uuid primary key default gen_random_uuid(),
  title            text not null,
  description      text,
  status           text not null default 'todo' check (status in ('todo','in_progress','done')),
  priority         text not null default 'medium' check (priority in ('low','medium','high')),
  due_date         date,
  due_time         time,
  reminder         boolean default false,
  reminder_minutes int default 30,
  created_at       timestamptz default now()
);

-- אם הטבלה כבר קיימת, הוסף את העמודות החסרות:
alter table tasks add column if not exists due_time         time;
alter table tasks add column if not exists reminder         boolean default false;
alter table tasks add column if not exists reminder_minutes int default 30;
