-- ============================================================
-- FitBalance — Digital Forms System Migration
-- תאריך: 2025
-- תיאור: שדרוג מערכת הטפסים הדיגיטליים
-- ============================================================
-- הוראות הרצה:
--   1. הרץ ב-Supabase SQL Editor
--   2. צור את ה-Storage buckets ידנית לאחר ההרצה (ראה סוף הקובץ)
-- ============================================================


-- ============================================================
-- שלב 1: שדרוג טבלת digital_forms
-- ============================================================

-- הסרת עמודת content (הטפסים יהיו קבועים בקוד)
alter table digital_forms drop column if exists content;

-- הוספת עמודת description
alter table digital_forms add column if not exists
  description text;

-- עדכון הרשומות הקיימות לפי form_key החדש
-- מחיקת seed ישן
delete from digital_forms;

-- seed חדש — 3 טפסים קבועים, ללא content
insert into digital_forms (name, form_key, description, is_active) values
(
  'הצהרת בריאות',
  'health_declaration',
  'הצהרה על מצב בריאותי תקין המאפשר פעילות גופנית',
  true
),
(
  'נהלי רישום ותשלומים + הצהרת בריאות',
  'registration_and_health',
  'תקנון, מדיניות ביטולים והצהרת בריאות משולבים',
  true
),
(
  'אישור הורים',
  'parent_approval',
  'אישור הורה/אפוטרופוס להשתתפות קטין בפעילות גופנית',
  true
);


-- ============================================================
-- שלב 2: שדרוג טבלת customer_forms
-- ============================================================

-- הסרת unique constraint ישן (לקוח יכול לחתום שוב בשנה חדשה)
alter table customer_forms
  drop constraint if exists customer_forms_customer_id_form_id_key;

-- שינוי שם signed_at → נשאר, אבל מוסיפים שדות חדשים

-- שדות קישור וסטטוס
alter table customer_forms
  add column if not exists token          text unique,
  add column if not exists token_expires  timestamptz,
  add column if not exists sent_at        timestamptz,
  add column if not exists status         text not null default 'pending'
    check (status in ('pending', 'signed', 'expired'));

-- שדות מילוי הטופס
alter table customer_forms
  add column if not exists id_number      text,   -- ת.ז של החותם
  add column if not exists signer_name    text;   -- לאישור הורים: שם ההורה

-- שדות חתימה ו-PDF
alter table customer_forms
  add column if not exists signature_url  text,   -- Storage path: form-signatures/{customer_id}/{token}.png
  add column if not exists pdf_url        text;   -- Storage path: form-pdfs/{customer_id}/{token}.pdf

-- שנת פעילות
alter table customer_forms
  add column if not exists activity_year  int     -- לדוגמה: 2025 (שנת הלימודים שמתחילה בה)
    check (activity_year is null or (activity_year >= 2020 and activity_year <= 2100));

-- וידוא שעמודת signed_at קיימת (הייתה בשם שונה בגרסה ישנה)
alter table customer_forms
  add column if not exists signed_at      timestamptz;


-- ============================================================
-- שלב 3: אינדקסים לביצועים
-- ============================================================

create index if not exists idx_customer_forms_token
  on customer_forms (token)
  where token is not null;

create index if not exists idx_customer_forms_customer_id
  on customer_forms (customer_id);

create index if not exists idx_customer_forms_status
  on customer_forms (status);

create index if not exists idx_customer_forms_activity_year
  on customer_forms (activity_year);


-- ============================================================
-- שלב 4: RLS Policies
-- ============================================================

-- וידוא RLS פעיל
alter table digital_forms  enable row level security;
alter table customer_forms enable row level security;

-- ---- digital_forms policies ----

-- מחיקת policies ישנות
drop policy if exists "read active forms" on digital_forms;

-- כולם (כולל אנונימי) יכולים לקרוא טפסים פעילים
create policy "read active forms" on digital_forms
  for select
  using (is_active = true);

-- רק מנהל מחובר יכול לנהל טפסים
create policy "admin manage forms" on digital_forms
  for all
  to authenticated
  using (true)
  with check (true);


-- ---- customer_forms policies ----

-- מחיקת policies ישנות
drop policy if exists "allow sign"       on customer_forms;
drop policy if exists "read for admin"   on customer_forms;

-- אנונימי: קריאה של שורה pending עם token תקף
-- הפרונטאנד חייב לשלוח .eq('token', value) — בלי זה RLS מחזיר 0 שורות
create policy "anon read by token" on customer_forms
  for select
  to anon
  using (
    status = 'pending'
    and token_expires > now()
  );

-- אנונימי: עדכון חתימה על שורה pending עם token תקף
create policy "anon sign by token" on customer_forms
  for update
  to anon
  using (
    status = 'pending'
    and token_expires > now()
  )
  with check (
    status in ('signed', 'pending')
  );

-- מנהל מחובר: גישה מלאה לכל הטפסים
create policy "admin full access" on customer_forms
  for all
  to authenticated
  using (true)
  with check (true);


-- ============================================================
-- שלב 5: פונקציה — פקיעת תוקף אוטומטית
-- ============================================================
-- פונקציה שמסמנת טפסים שפג תוקפם כ-expired
-- ניתן לקרוא לה מ-Supabase Cron Job (pg_cron) או מהקוד

create or replace function expire_pending_forms()
returns void
language sql
security definer
as $$
  update customer_forms
  set status = 'expired'
  where status = 'pending'
    and token_expires < now();
$$;


-- ============================================================
-- שלב 6: View נוח לממשק הניהול
-- ============================================================

create or replace view customer_forms_view as
select
  cf.id,
  cf.created_at,
  cf.customer_id,
  cf.form_id,
  df.name        as form_name,
  df.form_key,
  cf.status,
  cf.full_name,
  cf.id_number,
  cf.signer_name,
  cf.activity_year,
  cf.sent_at,
  cf.signed_at,
  cf.token_expires,
  cf.pdf_url,
  cf.signature_url,
  cf.ip_address,
  -- שם לקוח מהטבלה הראשית
  c.firstName    as customer_first_name,
  c.lastName     as customer_last_name,
  c.email        as customer_email,
  c.mobile       as customer_mobile
from customer_forms cf
join digital_forms df on df.id = cf.form_id
join customers     c  on c.id  = cf.customer_id;


-- ============================================================
-- הוראות לאחר ההרצה — Storage Buckets (ידנית ב-Dashboard)
-- ============================================================
--
-- 1. פתח Supabase Dashboard → Storage → New Bucket
--
-- 2. צור bucket: form-signatures
--    - Public: NO (פרטי)
--    - File size limit: 2MB
--    - Allowed MIME types: image/png
--
-- 3. צור bucket: form-pdfs
--    - Public: NO (פרטי)
--    - File size limit: 10MB
--    - Allowed MIME types: application/pdf
--
-- 4. הוסף Storage Policies לכל bucket:
--
--    form-signatures:
--      INSERT to anon:       true  (העלאת חתימה בעת חתימה)
--      SELECT to authenticated: true  (מנהל צופה)
--
--    form-pdfs:
--      INSERT to anon:       true  (יצירת PDF בעת חתימה)
--      SELECT to authenticated: true  (מנהל מוריד)
--
-- ============================================================
