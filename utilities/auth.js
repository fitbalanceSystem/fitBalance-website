// utilities/auth.js
// הערה: קובץ זה משמש דפים כלליים (לא attendance).
// TODO — רפקטור נפרד נדרש עבור pages/attendance:
//   1. להעביר את getCurrentUser לשימוש ב-authService המרכזי
//   2. להסיר את localStorage העצמאי מ-app.js ו-auth.js של attendance
//   3. להוסיף בדיקת הרשאות (role === 'attendance') לפני כניסה למסך

export function getCurrentUser() {
  return window.storageUtil?.load() ?? null;
}

export function logout() {
  window.authMiddleware?.logout();
}

export function checkAuth() {
  const user = getCurrentUser();
  if (!user) window.location.href = '/login.html';
}

  export function formatTime(timeStr) {
    if (!timeStr) return '';
    // אם timeStr הוא מחרוזת ISO או "HH:mm:ss"
    // ננסה להמיר ל-Date ואז להציג HH:mm
    const date = new Date(timeStr);
    if (isNaN(date)) return timeStr.slice(0,5); // fallback ל-5 תווים ראשונים אם לא תאריך תקין
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  export function showSpinner() {
    document.getElementById('globalSpinner')?.classList.remove('hidden');
  }
  
  export function hideSpinner() {
    document.getElementById('globalSpinner')?.classList.add('hidden');
  }
  

/**
 * מחזיר את טווח השנה האקדמית הנוכחית (מ-1/9 ועד 31/8),
 * כולל שעות התחלה וסיום, כדי שניתן יהיה להשתמש ב־Date+Time.
 * @param {Date} today – התאריך הנוכחי (ברירת מחדל: היום)
 * @returns {{fromDate: string, toDate: string}}
 */
export function getAcademicYearRange(today = new Date()) {
  const year = today.getFullYear();
  const month = today.getMonth() + 1; // חודשים מ־0 → +1

  let startYear, endYear;

  if (month >= 9) {
    // ספטמבר–דצמבר → שנה נוכחית היא שנת התחלה
    startYear = year;
    endYear = year + 1;
  } else {
    // ינואר–אוגוסט → שנה קודמת היא שנת התחלה
    startYear = year - 1;
    endYear = year;
  }

  // מה-1 בספטמבר 00:00:00 עד 31 באוגוסט 23:59:59
  const fromDate = `${startYear}-09-01T00:00:00`;
  const toDate = `${endYear}-06-30T23:59:59`;

  return { fromDate, toDate };
}

  

  
  
  