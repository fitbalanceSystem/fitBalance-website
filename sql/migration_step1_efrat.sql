-- ============================================================
-- מיגרציה שלב ראשון — אפרת חוברה בלבד
-- יש להריץ לאחר קבלת auth_id מ-Supabase Dashboard
-- ============================================================

-- הוראות:
-- 1. בצע Invite ב-Supabase Dashboard → Authentication → Users → Invite User
--    Email: efrathugim@gmail.com
-- 2. לאחר שאפרת מאשרת את ההזמנה ומגדירה סיסמה:
--    Authentication → Users → מצא את אפרת → העתק את ה-UUID
-- 3. החלף את '<auth_id של אפרת>' ב-UUID שהעתקת
-- 4. הרץ את ה-INSERT הבא

INSERT INTO public.user_profiles (auth_id, role, linked_table, linked_id)
VALUES (
  '<auth_id של אפרת>',  -- UUID מ-auth.users — להחליף לפני הרצה
  'admin',
  'instructors',         -- הערה: linked_table='instructors' עבור admin/manager
                         -- הוא פתרון מעבר לתאימות עם המבנה הקיים.
                         -- בעתיד, לאחר מיגרציה מלאה, ניתן לשקול
                         -- linked_table='user_profiles' או טבלת staff נפרדת.
  5                      -- instructors.id של אפרת חוברה
);

-- ============================================================
-- בדיקת תקינות לאחר INSERT
-- ============================================================

SELECT
  up.auth_id,
  up.role,
  up.linked_table,
  up.linked_id,
  i."firstName",
  i."lastName",
  i.email,
  up.created_at
FROM public.user_profiles up
JOIN instructors i ON i.id = up.linked_id
WHERE up.linked_id = 5
  AND up.linked_table = 'instructors';
