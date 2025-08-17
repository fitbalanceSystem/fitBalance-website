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
  

  
  
  