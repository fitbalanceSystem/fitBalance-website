import { selectFromTable, uploadFileToStorage } from '../utilities/dbservice.js';
import { getCurrentUser, checkAuth, logout, getAcademicYearRange } from '../utilities/auth.js';

// checkAuth();
const slides = document.querySelectorAll('.slide');
const sliderContainer = document.querySelector('.slider-container');
const prevBtn = document.getElementById('prev');
const nextBtn = document.getElementById('next');
let current = 0;
let intervalId;
const intervalTime = 4000; // 4 שניות בין תמונות

function showSlide(index) {
  slides.forEach((s,i)=> s.style.opacity = i===index ? '1' : '0');
}

function nextSlide() {
  current = (current + 1) % slides.length;
  showSlide(current);
}

function prevSlide() {
  current = (current - 1 + slides.length) % slides.length;
  showSlide(current);
}

function startSlider() {
  intervalId = setInterval(nextSlide, intervalTime);
}

function stopSlider() {
  clearInterval(intervalId);
}

// כפתורים
nextBtn.addEventListener('click', ()=>{ nextSlide(); });
prevBtn.addEventListener('click', ()=>{ prevSlide(); });

slides.forEach(slide => {
  slide.addEventListener('mouseenter', stopSlider);
  slide.addEventListener('mouseleave', startSlider);
});

// התחלת הסליידר
showSlide(current);
startSlider();

async function loadDashboard(userId) {
  try {
    const { fromDate, toDate } = getAcademicYearRange();
    
    const [goal, remainingLessons, closest, activeClasses ] = await Promise.all([
      getNextGoal(userId),
      getRemainingLessons(userId.id, fromDate, toDate),
      getClosestSession(userId.id, fromDate, toDate),
      getActiveClasses(userId.id)
    ]);
    // ✅ הכנסת הערכים לדף
    document.getElementById('next-class-goal').textContent = goal;
    document.getElementById('remaining-lessons').textContent = remainingLessons;
    document.getElementById('active-classes').textContent = activeClasses;


    if (closest) {
      // יש רשומה קרובה לעתיד
     // רושמים את התאריך בשורה הראשונה
     document.getElementById('attendance-percentage').textContent = formatDateSimple(closest.session_date);

     // מוסיפים שורה נוספת עם יום, שעה ושיעור
     const infoEl = document.createElement('div');
     infoEl.className = 'text-sm text-gray-500 mt-1'; // mt-1 מוסיף רווח קטן מעל השורה
     infoEl.textContent = `${getHebrewDayName((closest.day)-1)}, ${formatTimeHHMM(closest.time)}, ${closest.name}`;
     document.getElementById('attendance-percentage').appendChild(infoEl);
 
 
    } else {
      // אין רשומה
      document.getElementById('attendance-percentage').textContent = 'אין שיעורים קרובים';
    }
  } catch (err) {
    console.error('שגיאה בטעינת הדשבורד:', err.stack);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const user = getCurrentUser();
  loadDashboard(user);
});




//פונקציות גנריות
function formatDateSimple(dateStr) {
  const date = new Date(dateStr);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0'); // חודשים מ־0
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function getHebrewDayName(dayIndex) {
  const days = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
  return days[dayIndex];
}

function formatTimeHHMM(timeStr) {
  // מחלקים את המחרוזת לפי ':'
  const parts = timeStr.split(':');
  let hours = parseInt(parts[0], 10);
  let minutes = parseInt(parts[1], 10);

  // תיקון אם הערכים לא חוקיים
  if (isNaN(hours) || hours < 0 || hours > 23) hours = 0;
  if (isNaN(minutes) || minutes < 0 || minutes > 59) minutes = 0;

  return `${String(hours).padStart(2,'0')}:${String(minutes).padStart(2,'0')}`;
}





// ✅ פונקציה שמביאה את המטרה האישית (next_goal)
async function getNextGoal(userId) {

  const customerGoal = await selectFromTable('customers', {
    id: userId.id
  });
 


  return customerGoal[0].next_goal || 'לא הוגדרה מטרה';
}


// ✅ פונקציה שמחזירה כמה שיעורים נותרו להשלמה
async function getRemainingLessons(customerId, fromDate, toDate) {
  try {
    // 1️⃣ שיעורים עם status_code = 1
    const totalLessons = await selectFromTable('attendance_with_session', {
      customer_id: customerId,
      status_code: 1,
      session_date: { gte: fromDate, lte: toDate }
    });

    // 2️⃣ שיעורים שהלקוח היה נוכח בהם
    const attendedLessons = await selectFromTable('attendance_with_session', {
      customer_id: customerId,
      is_present: true,
      session_date: { gte: fromDate, lte: toDate }
    });

    // החישוב הסופי
    const remaining = totalLessons.length - attendedLessons.length;
    return remaining;

  } catch (err) {
    console.error('שגיאה ב־getRemainingLessons:', err.message);
    return 0;
  }
}

async function getClosestSession(customerId, fromDate, toDate) {
  
  const sessions = await selectFromTable('attendance_with_session', {
    customer_id: customerId
  });

  const today = new Date();

  if (!sessions || sessions.length === 0) return 0; // אין רשומות בכלל

  // ממירים לסוג Date ומסננים רק רשומות מהיום או לאחר מכן
  const futureSessions = sessions
    .map(s => ({ ...s, dateObj: new Date(s.session_date) }))
    .filter(s => s.dateObj >= today);

  if (futureSessions.length === 0) return 0; // אין רשומות מהיום/העתיד

  // ממיינים ומחזירים את הקרובה ביותר
  futureSessions.sort((a, b) => a.dateObj - b.dateObj);
  return futureSessions[0];
}

// מחזירה מספר חוגים פעילים ללקוח ספציפי
async function getActiveClasses(customerId) {
  const today = new Date().toISOString().split('T')[0]; // פורמט YYYY-MM-DD

  // שולפים את הרשומות שבהן היום בין start_date ל-end_date
  const enrollments = await selectFromTable('program_enrollments', {
    customer_id: customerId,
    start_date: { lte: today },
    end_date: { gte: today }
  });

  // אם אין רשומות מחזירים 0
  return enrollments?.length || 0;
}

