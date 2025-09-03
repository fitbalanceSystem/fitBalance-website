import { selectFromTable, uploadFileToStorage } from '../utilities/dbservice.js';
import { getCurrentUser, checkAuth, logout, getAcademicYearRange } from '../utilities/auth.js';

// checkAuth();

document.addEventListener('DOMContentLoaded', () => {

  // --- סליידר ---
  const slides = document.querySelectorAll('.slide');
  const prevBtn = document.getElementById('prev');
  const nextBtn = document.getElementById('next');
  let current = 0;
  let intervalId;
  const intervalTime = 4000; // 4 שניות בין תמונות

  function showSlide(index) {
    slides.forEach((s, i) => s.style.opacity = i === index ? '1' : '0');
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
  nextBtn.addEventListener('click', nextSlide);
  prevBtn.addEventListener('click', prevSlide);

  // hover
  slides.forEach(slide => {
    slide.addEventListener('mouseenter', stopSlider);
    slide.addEventListener('mouseleave', startSlider);
  });

  // התחלת הסליידר
  showSlide(current);
  startSlider();

  // --- טעינת דשבורד ---
  const user = getCurrentUser();
  loadDashboard(user);

});

// ====================== פונקציות דשבורד ======================

async function loadDashboard(userId) {
  try {
    const { fromDate, toDate } = getAcademicYearRange();
    const [goal, remainingLessons, closest, activeClasses] = await Promise.all([
      getNextGoal(userId),
      getRemainingLessons(userId.id, fromDate, toDate),
      getClosestUpcomingSession(userId.id),
      getActiveClasses(userId.id)
    ]);

    document.getElementById('next-class-goal').textContent = goal;
    document.getElementById('remaining-lessons').textContent = remainingLessons;
    document.getElementById('active-classes').textContent = activeClasses;

    const attendanceEl = document.getElementById('attendance-percentage');
    attendanceEl.textContent = '';
    
    if (closest) {
      const sessionDate = new Date(closest.date);
      const today = new Date();
      const isToday =
        sessionDate.getFullYear() === today.getFullYear() &&
        sessionDate.getMonth() === today.getMonth() &&
        sessionDate.getDate() === today.getDate();
    
      attendanceEl.textContent = isToday ? 'היום' : formatDateSimple(closest.date);
    
      const infoEl = document.createElement('div');
      infoEl.className = 'text-sm text-gray-500 mt-1';
      infoEl.textContent = `${getHebrewDayName(sessionDate.getDay())}, ${formatTimeHHMM(closest.time)}, ${closest.name}`;
      attendanceEl.appendChild(infoEl);
    } else {
      attendanceEl.textContent = 'אין שיעורים קרובים';
    }

  } catch (err) {
    console.error('שגיאה בטעינת הדשבורד:', err.stack);
  }
}

// ====================== פונקציות עזר ======================

function formatDateSimple(dateStr) {
  const date = new Date(dateStr);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function getHebrewDayName(dayIndex) {
  const days = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
  return days[dayIndex];
}

function formatTimeHHMM(timeStr) {
  const parts = timeStr.split(':');
  let hours = parseInt(parts[0], 10);
  let minutes = parseInt(parts[1], 10);
  if (isNaN(hours) || hours < 0 || hours > 23) hours = 0;
  if (isNaN(minutes) || minutes < 0 || minutes > 59) minutes = 0;
  return `${String(hours).padStart(2,'0')}:${String(minutes).padStart(2,'0')}`;
}

// ====================== פונקציות DB ======================

async function getNextGoal(userId) {
  const customerGoal = await selectFromTable('customers', { id: userId.id });
  return customerGoal[0]?.next_goal || 'לא הוגדרה מטרה';
}

async function getRemainingLessons(customerId, fromDate, toDate) {
  try {
    const now = new Date();

    // 1️⃣ שליפת כל ההרשמות של המשתמש לשנה
    const enrollments = await selectFromTable('program_enrollments', {
      customer_id: customerId,
      start_date: { lte: toDate },
      end_date: { gte: fromDate }
    });

    if (!enrollments.length) return 0;

    // 2️⃣ שליפת כל המפגשים של כל התוכניות שהמשתמש רשום אליהן
    const allSessionsPromises = enrollments.map(enr =>
      selectFromTable('program_sessions', {
        program_id: enr.program_id
      })
    );

    const sessionsArrays = await Promise.all(allSessionsPromises);
    const allSessions = sessionsArrays.flat();

    // 3️⃣ סינון רק מפגשים שהתקיימו עד עכשיו (כולל שעה)
    const pastSessions = allSessions.filter(s => {
      const sessionDateTime = new Date(`${s.date}T${s.time}`);
      return sessionDateTime <= now;
    });

    const sessionIds = pastSessions.map(s => s.id);

    if (sessionIds.length === 0) return 0;

    // 4️⃣ שליפת כל הנוכחויות של המשתמש לשיעורים אלו
    const attendanceRecordsAll = await selectFromTable('session_attendance', {
      customer_id: customerId,
      is_present: true
    });

    // 5️⃣ סינון ב־JS לפי sessionIds ו־status_code (1 = נוכחות רגילה, 2 = השלמה)
    const attendedSessions = attendanceRecordsAll.filter(a =>
      sessionIds.includes(a.session_id) && (a.status_code === 1 || a.status_code === 2)
    );

    // 6️⃣ חישוב מספר השיעורים שנותרו להשלמה
    const remainingLessons = pastSessions.length - attendedSessions.length;

    return remainingLessons;

  } catch (err) {
    console.error('שגיאה ב־getRemainingLessons:', err.message);
    return 0;
  }
}

async function getClosestUpcomingSession(customerId) {
  const now = new Date();

  // 1️⃣ שנה אקדמית
  const { fromDate, toDate } = getAcademicYearRange();

  // 2️⃣ שליפת כל ההרשמות של המשתמש
  const enrollments = await selectFromTable('program_enrollments', {
    customer_id: customerId,
    start_date: { lte: toDate },
    end_date: { gte: fromDate }
  });

  if (!enrollments || enrollments.length === 0) return null;

  // 3️⃣ שליפת כל המפגשים של כל התוכניות
  const allSessionsPromises = enrollments.map(async enr => {
    const sessions = await selectFromTable('program_sessions', { program_id: enr.program_id });
    // 4️⃣ מצרפים גם את program_id לשיעורים
    return sessions.map(s => ({ ...s, program_id: enr.program_id }));
  });

  const sessionsArrays = await Promise.all(allSessionsPromises);
  const allSessions = sessionsArrays.flat();

  // 5️⃣ סינון שיעורים שהעתידיים לעכשיו
  const futureSessions = allSessions.filter(s => {
    const sessionDateTime = new Date(`${s.date}T${s.time}`);
    return sessionDateTime >= now;
  });

  if (futureSessions.length === 0) return null;

  // 6️⃣ מיון לפי הקרוב ביותר
  futureSessions.sort((a, b) => {
    const aTime = new Date(`${a.date}T${a.time}`);
    const bTime = new Date(`${b.date}T${b.time}`);
    return aTime - bTime;
  });

  // 7️⃣ שליפת שם השיעור מהטבלה programs
  const closestSession = futureSessions[0];
  const [program] = await selectFromTable('programs', { id: closestSession.program_id });
  if (program) {
    closestSession.name = program.name;
  } else {
    closestSession.name = 'לא ידוע';
  }

  return closestSession;
}



async function getActiveClasses(customerId) {
  const today = new Date().toISOString().split('T')[0];
  const enrollments = await selectFromTable('program_enrollments', {
    customer_id: customerId,
    start_date: { lte: today },
    end_date: { gte: today }
  });
  return enrollments?.length || 0;
}
