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

    // המרת תאריכים לפורמט ISO מלא
    const from = new Date(fromDate);
    const to = new Date(toDate);
    if (isNaN(from) || isNaN(to)) {
      console.warn('fromDate או toDate אינם תקינים');
      return 0;
    }

    // 1️⃣ שליפת ההרשמות של המשתמש
    const enrollments = await selectFromTable('program_enrollments', {
      customer_id: customerId,
      start_date: { lte: to.toISOString() },
      end_date: { gte: from.toISOString() }
    });
    if (!enrollments.length) return 0;

    // 2️⃣ שליפת כל המפגשים של כל התוכניות
    const allSessionsPromises = enrollments.map(async enr => {
      const sessions = await selectFromTable('program_sessions', { program_id: enr.program_id });
      // מסננים מפגשים שהסטטוס שלהם שונה מ-2
      const filteredSessions = sessions.filter(s => s.status !== 2);
      return filteredSessions.map(s => ({ ...s, program_id: enr.program_id }));
    });
    
    const sessionsArrays = await Promise.all(allSessionsPromises);
    const allSessions = sessionsArrays.flat();

    // 3️⃣ סינון מפגשים שהתקיימו עד עכשיו ובטווח התאריכים
    const pastSessions = allSessions.filter(s => {
      const sessionDateTime = new Date(`${s.date}T${s.time}`);
      return sessionDateTime >= from && sessionDateTime <= now && sessionDateTime <= to;
    });
    if (!pastSessions.length) return 0;

    const pastSessionIds = pastSessions.map(s => s.id);

    // 4️⃣ שליפת נוכחויות של המשתמש
    const attendanceRecords = await selectFromTable('attendance_with_session', {
      customer_id: customerId,
      is_present: true
    });

    // 5️⃣ נוכחויות רגילות למפגשים שלה
    const attendedRegular = attendanceRecords.filter(a =>
      a.is_present === true &&
      a.status_code === 1 &&
      pastSessionIds.includes(a.session_id)
    );

    // 6️⃣ השלמות לפי תאריכים בלבד
    const makeups = attendanceRecords.filter(a => {
      const sessionDateTime = new Date(a.session_date);
      return a.is_present === true && a.status_code === 2 && sessionDateTime >= from && sessionDateTime <= to;
    });

    // 7️⃣ חישוב סך המפגשים שנותרו
    const totalAttended = attendedRegular.length + makeups.length;
    const remainingLessons = pastSessions.length - totalAttended;

    return Math.max(0, remainingLessons);

  } catch (err) {
    console.error('שגיאה ב־getRemainingLessons:', err.message);
    return 0;
  }
}


// פונקציה לעיבוד מחרוזת תאריך yyyy-mm-dd ל-UTC
function parseDateOnly(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function formatDateForDB(ts) {
  const d = new Date(ts);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

async function getClosestUpcomingSession(customerId) {
  const now = new Date();

  // 1️⃣ קבלת טווח השנה האקדמית
  const { fromDate, toDate } = getAcademicYearRange();

  // 2️⃣ שליפת כל ההרשמות של המשתמש בטווח השנה האקדמית
  const enrollments = await selectFromTable('program_enrollments', {
    customer_id: customerId,
    start_date: { lte: toDate },
    end_date: { gte: fromDate }
  });

  if (!enrollments || enrollments.length === 0) return null;

  // 3️⃣ חישוב התאריך המינימלי לפי ההרשמות שלה
  const minEnrollmentDate = enrollments.reduce((minDate, enr) => {
    const start = new Date(enr.start_date);
    return start < minDate ? start : minDate;
  }, new Date(enrollments[0].start_date));

  // 4️⃣ שליפת כל המפגשים של כל ההרשמות והוספת program_id
  const allSessionsPromises = enrollments.map(async (enr) => {
    const sessions = await selectFromTable('program_sessions', { program_id: enr.program_id });
    // סינון רק פעילים ומעבר למפגשים שהתחילו אחרי minEnrollmentDate
    const filtered = sessions
      .filter(s => s.status !== 2 && new Date(s.date) >= minEnrollmentDate)
      .map(s => ({ ...s, program_id: enr.program_id }));
    return filtered;
  });

  const sessionsArrays = await Promise.all(allSessionsPromises);
  const allSessions = sessionsArrays.flat();

  // 5️⃣ סינון שיעורים עתידיים בלבד
  const futureSessions = allSessions.filter(s => new Date(`${s.date}T${s.time}`) >= now);
  if (futureSessions.length === 0) return null;

  // 6️⃣ מיון לפי הקרוב ביותר
  futureSessions.sort((a, b) => {
    return new Date(`${a.date}T${a.time}`) - new Date(`${b.date}T${b.time}`);
  });

  // 7️⃣ הוספת שם השיעור מהטבלה programs
  const closestSession = futureSessions[0];
  const [program] = await selectFromTable('programs', { id: closestSession.program_id });
  closestSession.name = program ? program.name : 'לא ידוע';

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
