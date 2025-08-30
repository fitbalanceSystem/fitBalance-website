// js/auth.js


export function getCurrentUser() {
    return JSON.parse(localStorage.getItem("user"));
  }
  
  export function logout() {
    localStorage.removeItem("user");
    window.location.href = "index.html";
  }
  
  export function checkAuth() {
    const user = getCurrentUser();
    if (!user) {
      window.location.href = "index.html";
    }
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
  

  export function getAcademicYearRange(today = new Date()) {
    const year = today.getFullYear();
    const month = today.getMonth() + 1; // חודשים מ־0
    let startYear, endYear;
  
    if (month >= 9) { // ספטמבר או אחרי → שנה נוכחית היא שנת התחלה
      startYear = year;
      endYear = year + 1;
    } else { // ינואר–אוגוסט → שנה קודמת היא שנת התחלה
      startYear = year - 1;
      endYear = year;
    }
  
    const fromDate = `${startYear}-09-01`;
    const toDate = `${endYear}-08-31`;
  
    return { fromDate, toDate };
  }
  

  
  
  