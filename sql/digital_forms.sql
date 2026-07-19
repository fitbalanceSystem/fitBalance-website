-- טבלת הגדרת טפסים דיגיטליים
create table if not exists digital_forms (
  id          bigint generated always as identity primary key,
  created_at  timestamptz default now(),
  name        text not null,          -- שם הטופס (לתצוגה)
  form_key    text not null unique,   -- מזהה קוד: 'health_declaration', 'registration_policy'
  content     text not null,          -- תוכן HTML של הטופס
  is_active   boolean default true
);

-- טבלת חתימות לקוחות על טפסים
create table if not exists customer_forms (
  id           bigint generated always as identity primary key,
  signed_at    timestamptz default now(),
  customer_id  bigint references customers(id) on delete cascade,
  form_id      bigint references digital_forms(id),
  full_name    text,                  -- שם מלא כפי שהוזן בחתימה
  ip_address   text,
  unique(customer_id, form_id)
);

alter table digital_forms  enable row level security;
alter table customer_forms enable row level security;

-- כל אחד יכול לקרוא טפסים פעילים
create policy "read active forms" on digital_forms
  for select using (is_active = true);

-- הוספת חתימה לאנונימי (בהרשמה)
create policy "allow sign" on customer_forms
  for insert to anon with check (true);

-- קריאה רק למחובר
create policy "read for admin" on customer_forms
  for select to authenticated using (true);

-- נתוני seed — תוכן הטפסים
insert into digital_forms (name, form_key, content) values
(
  'הצהרת בריאות',
  'health_declaration',
  '<h2>הצהרת בריאות</h2>
  <p>אני החתומה מטה מצהירה בזאת כי:</p>
  <ol>
    <li>מצב בריאותי תקין ומאפשר פעילות גופנית.</li>
    <li>אין לי מגבלה רפואית המונעת ממני להשתתף בפעילות גופנית.</li>
    <li>אני מתחייבת להודיע למדריכה על כל שינוי במצב בריאותי.</li>
    <li>ידוע לי כי עלי להתייעץ עם רופא לפני תחילת פעילות גופנית אם יש לי ספק לגבי מצב בריאותי.</li>
    <li>אני לוקחת אחריות מלאה על השתתפותי בפעילות.</li>
  </ol>
  <p>FitBalance לא תישא באחריות לנזק שייגרם כתוצאה ממידע רפואי שלא נמסר.</p>'
),
(
  'תקנון ומדיניות ביטולים',
  'registration_policy',
  '<h2>תקנון ומדיניות ביטולים</h2>
  <h3>השתתפות</h3>
  <ul>
    <li>ההרשמה מתבצעת לשנת לימודים מלאה.</li>
    <li>יש להגיע בלבוש ספורטיבי הולם בהתאם לתקנון הצניעות.</li>
    <li>אין להיכנס לשיעור באיחור של יותר מ-10 דקות.</li>
  </ul>
  <h3>תשלום</h3>
  <ul>
    <li>התשלום מתבצע מראש לכל חודש עד ה-5 בחודש.</li>
    <li>איחור בתשלום עלול לגרור השעיה זמנית.</li>
  </ul>
  <h3>ביטולים והחזרים</h3>
  <ul>
    <li>ביטול עד 14 יום מתחילת הפעילות — החזר מלא.</li>
    <li>ביטול לאחר 14 יום — החזר יחסי בניכוי דמי ביטול.</li>
    <li>היעדרות מהשיעורים אינה מזכה בהחזר כספי.</li>
    <li>הקפאת מנוי אפשרית בהודעה מראש של 7 ימים.</li>
  </ul>
  <h3>צילום ופרסום</h3>
  <ul>
    <li>אין לצלם בשיעורים ללא אישור מפורש.</li>
  </ul>'
);
