// main.js
import { selectFromTable, uploadFileToStorage } from '../utilities/dbservice.js';
import { getCurrentUser, checkAuth, logout } from '../utilities/auth.js'

// ================================
// 1. הוספת Favicon קבוע
// ================================
function addFavicon() {
  console.log("LOAD IMAGE");
  const link = document.createElement('link');
  link.rel = 'icon';
  link.type = 'image/png';
  link.href = 'images/logomini.png'; // נתיב ללוגו שלך
  document.head.appendChild(link);
}

// ================================
// 2. סימון קישור פעיל ועדכון שם הטאב
// ================================
function highlightActiveLink() {
  console.log("LOAD highlightActiveLink");
  const currentPath = window.location.pathname.split("/").pop(); // שם הקובץ הנוכחי
  const links = document.querySelectorAll("nav a");
  let activeText = "FitBalance"; // ברירת מחדל במקרה שהקישור לא נמצא

  links.forEach(link => {
    const linkPath = link.getAttribute("href");
    if (linkPath === currentPath) {
      link.classList.add("text-pink-600", "font-bold"); // קישור פעיל
      link.classList.remove("text-gray-700");
      activeText = link.textContent.trim(); // שומר את הטקסט של הקישור הפעיל
    } else {
      link.classList.add("text-gray-700");
      link.classList.remove("text-pink-600", "font-bold");
    }
  });

  // מעדכן את שם הטאב בדפדפן
  document.title = `${activeText} | FitBalance`;
}

// ================================
// 3. טעינת כותרת עליונה דינמית
// ================================
function loadHeader() {
  fetch('partials/header.html')
    .then(res => res.text())
    .then(html => {
      const container = document.getElementById('header-container');
      if (!container) return;
      container.innerHTML = html;

      const user = getCurrentUser();
      const userGreeting = document.getElementById('user-greeting');
      if (userGreeting && user) {
        userGreeting.textContent = `שלום ${user.full_name}, מחוברת`;
      }

      const sidebarAvatar = document.getElementById('user-avatar-sidebar');
      if (sidebarAvatar && user) {
        if (user.imageProfile) {
          sidebarAvatar.style.backgroundImage = `url(${user.imageProfile})`;
          sidebarAvatar.style.backgroundSize = 'cover';
          sidebarAvatar.textContent = '';
        } else {
          sidebarAvatar.textContent = user.full_name.charAt(0);
        }
      }

      // גלובלי לצורך כפתור יציאה
      window.logout = logout;
    })
    .catch(err => console.error('שגיאה בטעינת הכותרת:', err));
}

// ================================
// 4. הפעלה ברגע שה-DOM מוכן
// ================================
document.addEventListener("DOMContentLoaded", () => {
  addFavicon();
  highlightActiveLink();
  loadHeader();
});
