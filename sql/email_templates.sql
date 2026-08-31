-- טבלת תבניות מיילים
create table if not exists email_templates (
  id           bigint generated always as identity primary key,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now(),
  template_key text not null unique,   -- welcome / birthday / debt / assignment
  name         text not null,          -- שם תצוגה
  subject      text,                   -- נושא המייל
  body_html    text,                   -- גוף HTML (Quill output)
  params       jsonb default '[]'      -- פרמטרים זמינים לתיעוד
);

alter table email_templates enable row level security;
create policy "admin rw" on email_templates for all to authenticated using (true) with check (true);

-- ערכי ברירת מחדל
insert into email_templates (template_key, name, subject, body_html, params) values
(
  'welcome',
  'ברוכה הבאה',
  'ברוכה הבאה ל-FitBalance! 🎀',
  '<h2 style="text-align:right">שלום {{firstName}}! 🎀</h2><p style="text-align:right">שמחים לקבל אותך אלינו ל-<strong>FitBalance</strong>!</p><p style="text-align:right">מחכים לראותך בשיעורים 💪</p><p style="text-align:right">באהבה,<br>צוות FitBalance</p>',
  '["firstName"]'
),
(
  'birthday',
  'יום הולדת',
  'יום הולדת שמח {{firstName}}! 🎂',
  '<h2 style="text-align:right">יום הולדת שמח {{firstName}}! 🎂🎉</h2><p style="text-align:right">מאחלים לך יום מלא שמחה, בריאות ואנרגיה!</p><p style="text-align:right">באהבה,<br>צוות FitBalance</p>',
  '["firstName"]'
),
(
  'debt',
  'תזכורת חוב',
  'תזכורת תשלום – {{firstName}}',
  '<p style="text-align:right">שלום {{firstName}},</p><p style="text-align:right">רצינו להזכיר שיש יתרת חוב בסך <strong>{{amount}} ₪</strong>.</p><p style="text-align:right">נשמח לסדר זאת בהקדם 🙏</p><p style="text-align:right">בברכה,<br>צוות FitBalance</p>',
  '["firstName","amount"]'
),
(
  'assignment',
  'הודעת שיבוץ',
  'שיבוצך לשנת {{activityYear}} 🎉',
  '<h2 style="text-align:right">שלום {{firstName}}! 🎉</h2><p style="text-align:right">שמחים לבשר לך על שיבוצך לשנת <strong>{{activityYear}}</strong>:</p><p style="text-align:right">{{programs}}</p><p style="text-align:right">לחתימה על נהלי הרישום לחצי כאן:<br><a href="{{formLink}}">{{formLink}}</a></p><p style="text-align:right">בברכה,<br>צוות FitBalance</p>',
  '["firstName","activityYear","programs","formLink"]'
)
on conflict (template_key) do nothing;
