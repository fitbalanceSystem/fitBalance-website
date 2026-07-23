-- ============================================================
-- תוכנית מיגרציה — עובדים ל-Supabase Auth
-- סביבה: staging בלבד
-- תאריך הכנה: לפי ביצוע בפועל
-- סטטוס: ממתין לאישור — אין לבצע עד אישור מפורש
-- ============================================================

-- ============================================================
-- שלב 0: הנחות יסוד
-- ============================================================
-- 1. טבלת instructors קיימת עם עמודות:
--    id, firstName, lastName, email, mobile, idValue,
--    user_name, password, role_id, is_active, ...
-- 2. טבלת user_profiles קיימת (נוצרה בשלב 1)
-- 3. אין מחיקת עמודות — user_name, password, role_id נשארים
-- 4. לקוחות לא נכללים במיגרציה זו

-- ============================================================
-- שלב 1: מיפוי עובדים ו-roles
-- ============================================================
-- יש לבצע שאילתה זו ב-Supabase Dashboard (SQL Editor)
-- כדי לראות את רשימת העובדים לפני המיגרציה:

/*
SELECT
  id,
  firstName,
  lastName,
  email,
  user_name,
  role_id,
  is_active,
  CASE
    WHEN user_name = 'attendance'  THEN 'attendance'
    WHEN role_id IS NULL           THEN 'admin'
    ELSE                                'instructor'
  END AS mapped_role
FROM instructors
ORDER BY id;
*/

-- ============================================================
-- מיפוי role_id → role חדש
-- ============================================================
-- role_id IS NULL   → 'admin'
-- user_name = 'attendance' → 'attendance'
-- כל השאר          → 'instructor'
-- (אם קיים role_id לmanager — יש לעדכן ידנית לפי הנתונים)

-- ============================================================
-- שלב 2: יצירת משתמשים ב-Supabase Auth — Invite by Email
-- ============================================================
-- לכל עובד פעיל (is_active = true) עם email תקין:
-- בצע דרך Supabase Dashboard:
--   Authentication → Users → Invite User
--   הכנס: email של העובד
--   Supabase שולח מייל הזמנה אוטומטית
--   העובד בוחר סיסמה בעצמו

-- סדר ביצוע מומלץ:
-- 1. admin ראשון (לבדיקת תהליך)
-- 2. attendance
-- 3. שאר המדריכות

-- ============================================================
-- שלב 3: INSERT ל-user_profiles
-- ============================================================
-- לאחר שכל עובד קיבל auth_id מ-Supabase Auth,
-- מריצים את ה-INSERT הבא (auth_id מגיע מ-auth.users):

/*
-- דוגמה לעובד בודד — יש להריץ לכל עובד בנפרד
INSERT INTO public.user_profiles (auth_id, role, linked_table, linked_id)
VALUES (
  '<uuid מ-auth.users>',   -- מועתק מ-Supabase Dashboard → Authentication → Users
  '<role>',                -- 'admin' | 'instructor' | 'attendance' | 'manager'
  'instructors',
  <instructor.id>          -- id מטבלת instructors
);
*/

-- ============================================================
-- שלב 4: בדיקת תקינות לאחר כל INSERT
-- ============================================================

/*
-- ודא שהמיפוי נכון:
SELECT
  up.auth_id,
  up.role,
  up.linked_id,
  i.firstName,
  i.lastName,
  i.email
FROM user_profiles up
JOIN instructors i ON i.id = up.linked_id
WHERE up.linked_table = 'instructors'
ORDER BY up.role, i.firstName;
*/

-- ============================================================
-- שלב 5: בדיקות קצה-לקצה לאחר מיגרציה
-- ============================================================
-- [ ] עובד מתחבר עם email + סיסמה חדשה → מגיע לדף הנכון לפי role
-- [ ] admin → /pages/admin/
-- [ ] instructor → /pages/employee/profile.html
-- [ ] attendance → /pages/attendance/
-- [ ] getSession() מחזיר session פעיל לאחר כניסה
-- [ ] logout מנקה session ב-Supabase Auth + storageUtil
-- [ ] עובד שלא עבר מיגרציה עדיין — מקבל "לא נמצא פרופיל משתמש"
-- [ ] לקוח — כניסה רגילה ללא שינוי

-- ============================================================
-- ROLLBACK — שחזור מלא במקרה תקלה
-- ============================================================

-- צעד 1: מחיקת רשומות מ-user_profiles
/*
DELETE FROM public.user_profiles
WHERE linked_table = 'instructors';
*/

-- צעד 2: מחיקת משתמשים מ-auth.users
-- דרך Supabase Dashboard → Authentication → Users → Delete
-- (או דרך Admin API אם יש גישה)

-- צעד 3: שחזור authService.js לגרסה הישנה
-- git checkout HEAD~3 -- services/authService.js
-- (3 commits אחורה — לפני שלב 2)

-- צעד 4: שחזור login.js
-- git checkout HEAD~3 -- assets/js/pages/login.js

-- צעד 5: וידוא — הלוגיקה הישנה (user_name + password) עדיין קיימת ב-instructors
-- אין צורך בשחזור DB — העמודות לא נמחקו

-- ============================================================
-- הערות חשובות לביצוע ב-staging
-- ============================================================
-- 1. לבצע על DB של staging — לא production
-- 2. לוודא ש-Redirect URL מוגדר ב-Supabase:
--    Authentication → URL Configuration → Redirect URLs
--    https://staging.fitbalance.co.il/pages/employee/reset-password.html
-- 3. לבדוק שמייל ה-invite מגיע (לבדוק spam)
-- 4. לתעד את ה-auth_id של כל עובד לפני INSERT ל-user_profiles
-- 5. לא לבצע production עד שכל הבדיקות עוברות ב-staging
