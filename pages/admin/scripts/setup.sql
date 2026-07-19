-- טבלת לוג הרצות jobs
create table job_runs (
  id bigint generated always as identity primary key,
  job_name text not null,
  status text check (status in ('running', 'success', 'failed')) not null,
  started_at timestamptz not null,
  finished_at timestamptz,
  result jsonb,
  error_message text
);
create index on job_runs (job_name, status);
create index on job_runs (started_at desc);

-- טבלת דוחות חודשיים
create table monthly_reports (
  month text primary key,
  total_income numeric default 0,
  total_sessions int default 0,
  avg_attendance_pct int default 0,
  generated_at timestamptz
);

-- טבלת לוג אוטומציות (כבר קיימת — רק אם לא יצרת קודם)
create table if not exists automation_logs (
  id bigint generated always as identity primary key,
  automation_type text not null,
  month text,
  instructor_id bigint references instructors(id),
  sessions_count int default 0,
  total_amount numeric default 0,
  status text check (status in ('sent', 'error')),
  error_message text,
  created_at timestamptz default now()
);
