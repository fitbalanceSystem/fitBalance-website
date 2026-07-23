-- ============================================================
-- דוח מיפוי עובדים לפני מיגרציה — לאישור בלבד
-- יש להריץ ב-Supabase Dashboard → SQL Editor
-- אין לבצע INSERT או שינוי כלשהו
-- ============================================================


-- ============================================================
-- שאילתה 1: דוח מיפוי מלא של כל העובדים
-- ============================================================
-- מציגה את כל העובדים עם mapped_role מוצע.
-- עמודת mapped_role מסומנת NEEDS_REVIEW עבור מקרים לא חד-משמעיים.

SELECT
  id,
  "firstName",
  "lastName",
  email,
  user_name,
  role_id,
  is_active,
  CASE
    WHEN user_name = 'attendance'              THEN 'attendance'
    WHEN role_id IS NULL AND user_name IS NULL THEN 'NEEDS_REVIEW'
    WHEN role_id IS NULL                       THEN 'NEEDS_REVIEW'
    WHEN role_id = 1                           THEN 'admin'
    WHEN role_id = 2                           THEN 'manager'
    WHEN role_id = 3                           THEN 'instructor'
    ELSE CONCAT('UNKNOWN_role_id_', role_id::text)
  END AS mapped_role,
  CASE
    WHEN email IS NULL OR email = ''           THEN 'חסר email'
    WHEN email NOT LIKE '%@%.%'                THEN 'email לא תקין'
    ELSE 'תקין'
  END AS email_status
FROM instructors
ORDER BY is_active DESC, role_id ASC NULLS FIRST, "firstName";


-- ============================================================
-- שאילתה 2: עובדים שדורשים אישור ידני לתפקיד
-- role_id IS NULL ו-user_name אינו 'attendance'
-- ============================================================

SELECT
  id,
  "firstName",
  "lastName",
  email,
  user_name,
  role_id,
  is_active
FROM instructors
WHERE role_id IS NULL
  AND (user_name IS NULL OR user_name != 'attendance')
ORDER BY is_active DESC, "firstName";


-- ============================================================
-- שאילתה 3: עובדים פעילים ללא email תקין
-- חייבים email לפני Invite by Email
-- ============================================================

SELECT
  id,
  "firstName",
  "lastName",
  email,
  user_name,
  is_active
FROM instructors
WHERE is_active = true
  AND (
    email IS NULL
    OR email = ''
    OR email NOT LIKE '%@%.%'
  )
ORDER BY "firstName";


-- ============================================================
-- שאילתה 4: סיכום לפי role_id — להבנת המבנה הקיים
-- ============================================================

SELECT
  role_id,
  COUNT(*)            AS total,
  COUNT(*) FILTER (WHERE is_active = true)  AS active,
  COUNT(*) FILTER (WHERE is_active = false) AS inactive,
  STRING_AGG("firstName" || ' ' || "lastName", ', ' ORDER BY "firstName") AS names
FROM instructors
GROUP BY role_id
ORDER BY role_id ASC NULLS FIRST;
