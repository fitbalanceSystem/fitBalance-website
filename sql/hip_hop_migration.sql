-- הוספת שדה source להרשמות
ALTER TABLE program_registrations
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'direct';

-- טבלת מעקב ביקורים לדף נחיתה
CREATE TABLE IF NOT EXISTS landing_visits (
  id          BIGSERIAL PRIMARY KEY,
  source      TEXT NOT NULL DEFAULT 'direct',
  page        TEXT NOT NULL DEFAULT 'hip-hop',
  visited_at  TIMESTAMPTZ DEFAULT NOW()
);

GRANT INSERT ON landing_visits TO anon;
GRANT USAGE, SELECT ON SEQUENCE landing_visits_id_seq TO anon;

-- הרחבת טבלת programs ויצירת טבלת הרשמות לדף נחיתה

-- 1. הוספת שדות חסרים לטבלת programs (רק אם לא קיימים)
ALTER TABLE programs
  ADD COLUMN IF NOT EXISTS registration_open BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS level             TEXT CHECK (level IN ('beginner', 'advanced')) DEFAULT 'beginner',
  ADD COLUMN IF NOT EXISTS target_audience   TEXT;
-- target_audience: ערכים לדוגמה: 'ילדים', 'נוער', 'נשים', 'מתקדמות'

-- 2. טבלת הרשמות מדף הנחיתה
CREATE TABLE IF NOT EXISTS program_registrations (
  id          BIGSERIAL PRIMARY KEY,
  program_id  BIGINT REFERENCES programs(id) ON DELETE SET NULL,
  full_name   TEXT NOT NULL,
  phone       TEXT NOT NULL,
  email       TEXT,
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  -- בעתיד: ניתן לקשר ל-customer_id כשהמתעניינת הופכת למנויה
  customer_id BIGINT DEFAULT NULL
);

-- 3. הרשאות קריאה/כתיבה לאנונימי (anon) לדף הנחיתה הציבורי
GRANT SELECT ON programs TO anon;
GRANT INSERT ON program_registrations TO anon;
GRANT USAGE, SELECT ON SEQUENCE program_registrations_id_seq TO anon;
