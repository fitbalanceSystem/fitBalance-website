-- ============================================================
-- FitBalance — Forms Fix Migration
-- תאריך: 2026
-- תיאור: תיקון מערכת הטפסים הדיגיטליים
-- הרץ ב-Supabase SQL Editor
-- ============================================================

-- ============================================================
-- 1. הוספת injected_html לטבלת customer_forms
--    (snapshot של תוכן הטופס בזמן יצירה)
-- ============================================================
ALTER TABLE customer_forms
  ADD COLUMN IF NOT EXISTS injected_html text;


-- ============================================================
-- 2. עדכון customer_forms_view — הוספת cf.token
--    (נדרש לכפתור "העתק קישור" בממשק הניהול)
--    DROP + CREATE כי Postgres לא מאפשר שינוי סדר עמודות ב-OR REPLACE
-- ============================================================
DROP VIEW IF EXISTS customer_forms_view;

CREATE VIEW customer_forms_view AS
SELECT
  cf.id,
  cf.created_at,
  cf.customer_id,
  cf.form_id,
  df.name           AS form_name,
  df.form_key,
  cf.status,
  cf.full_name,
  cf.id_number,
  cf.signer_name,
  cf.activity_year,
  cf.sent_at,
  cf.signed_at,
  cf.token,
  cf.token_expires,
  cf.pdf_url,
  cf.signature_url,
  cf.ip_address,
  c."firstName"     AS customer_first_name,
  c."lastName"      AS customer_last_name,
  c.email           AS customer_email,
  c.mobile          AS customer_mobile
FROM customer_forms cf
JOIN digital_forms df ON df.id = cf.form_id
JOIN customers     c  ON c.id  = cf.customer_id;


-- ============================================================
-- 3. הוספת שדה health_notes לfields_json של registration_and_health
--    שומר על השדות הקיימים (fullName, idNumber) ומוסיף health_notes
-- ============================================================
UPDATE digital_forms
SET fields_json = '[
  {"id":"fullName",     "label":"שם מלא",                    "type":"text",     "required":true},
  {"id":"idNumber",     "label":"תעודת זהות",                "type":"text",     "required":false},
  {"id":"health_notes", "label":"הערת בריאות (אופציונלי)",   "type":"textarea", "required":false}
]'::jsonb
WHERE form_key = 'registration_and_health';


-- ============================================================
-- 4. הערה: אין policy נוספת נדרשת
--    UPDATE של injected_html מכוסה ע"י "anon sign by token" הקיימת.
--    INSERT ל-customer_notes מתבצע ב-Edge Function (service_role) בלבד —
--    אין policy לanon על customer_notes.
-- ============================================================
