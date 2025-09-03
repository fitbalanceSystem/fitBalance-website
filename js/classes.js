import { selectFromTable, selectFromTables } from '../utilities/dbservice.js';
import { getCurrentUser, formatTime, showSpinner, hideSpinner } from '../utilities/auth.js';

let currentStartYear = new Date().getMonth() >= 8 ? new Date().getFullYear() : new Date().getFullYear() - 1;
let enrollments;

document.addEventListener('DOMContentLoaded', () => init());

async function init() {
  const user = await getCurrentUser();
  if (!user) return;

  setupYearNavigation();
  await loadProgramsForYear(user.id, currentStartYear);
}

// 🔁 ניווט בין שנים
function setupYearNavigation() {
  document.querySelector('.prev-year')?.addEventListener('click', async () => {
    currentStartYear -= 1;
    const user = await getCurrentUser();
    await loadProgramsForYear(user.id, currentStartYear);
  });

  document.querySelector('.next-year')?.addEventListener('click', async () => {
    currentStartYear += 1;
    const user = await getCurrentUser();
    await loadProgramsForYear(user.id, currentStartYear);
  });
}

async function loadProgramsForYear(userId, year) {
  showSpinner();
  try {
    const container = document.querySelector('.grid');
    const summary = document.querySelector('.bg-gray-50.text-sm');
    const yearLabel = document.querySelector('.year-label');
    container.innerHTML = '';

    const fromDate = `${year}-09-01`;
    const toDate = `${year + 1}-08-31`;

    if (yearLabel) yearLabel.textContent = `${year} - ${year + 1}`;

    // שליפת כל ההרשמות של המשתמש
    const enrollments = await selectFromTable('program_enrollments', {
      customer_id: userId,
      start_date: { lte: new Date(toDate).toISOString() },
      end_date: { gte: new Date(fromDate).toISOString() }
    });

    if (!enrollments || enrollments.length === 0) {
      if (summary) {
        summary.innerHTML = `בשנת ${year}–${year + 1} לא נמצאו תוכניות פעילות עבורך.`;
      }
      container.innerHTML = `
        <div class="col-span-full text-center text-gray-600 py-8">
          <p>לא נמצאו תוכניות לחוגים עבורך בשנה זו.</p>
        </div>
      `;
      const makeupsBox = document.getElementById('makeups-box');
      if (makeupsBox) makeupsBox.style.display = 'none';
      return;
    }

    let totalSessions = 0;
    let totalAttendance = 0;
    let totalMakeups = 0;

    // שליפת כל הנוכחויות של המשתמש
    const attendanceRecords = await selectFromTable('attendance_with_session', { customer_id: userId });

    const now = new Date(); // הזמן הנוכחי

    for (const enr of enrollments) {
      // שליפה של פרטי התוכנית
      const [program] = await selectFromTable('programs', { id: enr.program_id });
      if (!program) continue;

      // שליפה של כל המפגשים של התוכנית
      const sessions = await selectFromTable('program_sessions', {
        program_id: program.id,
        date: { gte: enr.start_date, lte: enr.end_date }
      });

      // סינון המפגשים שהתקיימו בפועל עד עכשיו
      const pastSessions = sessions.filter(s => {
        const sessionDateTime = new Date(`${s.date}T${s.time}`);
        return sessionDateTime >= new Date(fromDate) && sessionDateTime <= now;
      });

      const sessionIds = pastSessions.map(s => s.id);

      // סינון נוכחות רלוונטית למפגשים שהתקיימו
      const relevantAttendance = attendanceRecords.filter(a => {
        const sessionTime = a.time || "00:00";
        const sessionDateTime = new Date(`${a.session_date}T${sessionTime}`);
        return sessionDateTime >= new Date(fromDate) && sessionDateTime <= now;
      });

      const attended = relevantAttendance.filter(a =>
        a.is_present && a.status_code === 1 && sessionIds.includes(a.session_id)
      ).length;

      const makeups = relevantAttendance.filter(a =>
        a.is_present && a.status_code === 2
      ).length;

      totalSessions += pastSessions.length;
      totalAttendance += attended;
      totalMakeups = makeups;

      const card = createProgramCard(program, enr, attended, pastSessions.length, "program");
      container.insertAdjacentHTML('beforeend', card);
    }

    // סיכום
    if (summary) {
      summary.innerHTML = `
        בשנת ${year}–${year + 1} נרשמת ל־${enrollments.length} חוגים.<br>
        התקיימו ${totalSessions} שיעורים עד כה, הגעת ל־${totalAttendance}, השלמת ${totalMakeups},<br>
        נותרו לך ${Math.max(0, totalSessions - totalAttendance - totalMakeups)} שיעורים להשלמה.
      `;
    }

    const makeupsBox = document.getElementById('makeups-box');
    if (makeupsBox) {
      makeupsBox.style.display = enrollments.length > 0 ? 'block' : 'none';
      if (enrollments.length > 0) {
        makeupsBox.querySelector('p').textContent = `סה"כ השלמות שבוצעו: ${totalMakeups}`;
      }
    }

    setupAttendanceButtons(fromDate, toDate, userId);

  } finally {
    hideSpinner();
  }
}



// ✨ קובייה אחת לתוכנית
function createProgramCard(program, enr, attended, total, type = "program") {
  const isPink = program.name.includes('פילאטיס');
  const bg = isPink ? 'bg-pink-50 border-pink-200 text-pink-600' : 'bg-green-50 border-green-200 text-green-600';

  return `
    <div class="${bg} border rounded-xl p-4 shadow hover:shadow-md transition">
      <div class="flex justify-between items-center mb-2">
        <h2 class="text-lg font-bold">${program.name}</h2>
        <span class="text-sm text-gray-500">${program.instructor || ''}</span>
      </div>
      <p class="text-sm text-gray-600 mb-1">${getHebrewDayName(program.day - 1) || ''} | ${formatTime(program.time) || ''}</p>
      <p class="text-xs text-gray-500 mb-1">${formatDate(enr.start_date)} - ${formatDate(enr.end_date)}</p>
      <p class="text-sm text-gray-700 mt-2">נוכחת ב־${attended} מתוך ${total} מפגשים</p>
      <button class="mt-3 text-sm underline show-attendance" data-type="${type}" data-program-id="${program.id}" data-program-name="${program.name}">הצג נוכחות</button>
    </div>
  `;
}

function createMakeupsCard(count) {
  return `
    <div class="bg-blue-50 border border-blue-200 rounded-xl p-4 shadow hover:shadow-md transition">
      <div class="flex justify-between items-center">
        <h2 class="text-lg font-bold text-blue-600">השלמות שבוצעו</h2>
        <button class="text-sm text-blue-600 underline show-attendance" data-type="makeups">הצג נוכחות</button>
      </div>
      <p class="text-sm text-gray-700 mt-2">סה"כ השלמות שבוצעו: ${count}</p>
    </div>
  `;
}

function formatDate(dateStr) {
  const [y, m, d] = dateStr.split('-');
  return `${d}.${m}.${y}`;
}

function setupAttendanceButtons(fromDate, toDate, userId) {
  document.querySelectorAll('.show-attendance').forEach(button => {
    button.addEventListener('click', async () => {
      showSpinner();

      await new Promise(resolve => setTimeout(resolve, 50));

      const type = button.dataset.type;
      const fromDateTime = new Date(fromDate);
      const toDateTime = new Date(toDate);

      if (type === 'program') {
        // -----------------------
        // הצגת נוכחות לפי תוכנית
        // -----------------------
        const programId = button.dataset.programId;
        const programName = button.dataset.programName;

        const sessions = await selectFromTable('program_sessions', {
          program_id: programId
        });

        // סינון לפי תאריך + שעה
        const filteredSessions = sessions.filter(s => {
          const sessionDateTime = new Date(`${s.date}T${s.time}`);
          return sessionDateTime >= fromDateTime && sessionDateTime <= toDateTime;
        });

        if (!filteredSessions.length) return;

        const sessionIds = filteredSessions.map(s => s.id);

        const attendance = await selectFromTable('session_attendance', {
          customer_id: userId
        });

        const attended = attendance.filter(a =>
          sessionIds.includes(a.session_id) && a.is_present
        );

        // ממיינים את הרשומות לפי התאריך המלא
        const sortedAttended = attended.sort((a, b) => {
          const sessionA = sessions.find(s => s.id === a.session_id);
          const sessionB = sessions.find(s => s.id === b.session_id);
          return new Date(`${sessionA.date}T${sessionA.time}`) - new Date(`${sessionB.date}T${sessionB.time}`);
        });

        // מייצרים את השורות
        const tableRows = sortedAttended.map(a => {
          const session = sessions.find(s => s.id === a.session_id);
          const date = session.date;
          const day = getHebrewDayName(new Date(date).getDay());
          const time = session.time;

          return `<tr>
            <td class="border px-2 py-1 text-right">${formatDate(date)}</td>
            <td class="border px-2 py-1 text-right">${day}</td>
            <td class="border px-2 py-1 text-right">${formatTime(time)}</td>
            <td class="border px-2 py-1 text-right">${programName}</td>
          </tr>`;
        }).join('');

        const modalBody = `
          <div class="bg-white rounded-lg p-4 max-w-xl mx-auto mt-10 shadow-lg">
            <h2 class="text-xl font-bold mb-4">רשימת שיעורים שנכחת בהם</h2>
            <table class="w-full border border-gray-300 text-sm">
              <thead class="bg-gray-100">
                <tr>
                  <th class="border px-2 py-1">תאריך</th>
                  <th class="border px-2 py-1">יום</th>
                  <th class="border px-2 py-1">שעה</th>
                  <th class="border px-2 py-1">שיעור</th>
                </tr>
              </thead>
              <tbody>${tableRows}</tbody>
            </table>
            <div class="text-center mt-4">
              <button id="closeModal" class="bg-blue-500 text-white px-4 py-1 rounded">סגור</button>
            </div>
          </div>
        `;
        openModal(modalBody);

      } else if (type === 'makeups') {
        // -----------------------
        // הצגת כל ההשלמות בשנה
        // -----------------------
        const attendance = await selectFromTable('attendance_with_session', {
          customer_id: userId
        });

        // רק השלמות בשנה הנוכחית
        const makeups = attendance.filter(a => {
          const sessionDateTime = new Date(`${a.session_date}T${a.time}`);
          return (
            a.is_present &&
            a.status_code === 2 &&
            sessionDateTime >= fromDateTime &&
            sessionDateTime <= toDateTime
          );
        });

        if (!makeups.length) {
          openModal(`
            <div class="bg-white rounded-lg p-4 max-w-xl mx-auto mt-10 shadow-lg">
              <h2 class="text-xl font-bold mb-4">השלמות שבוצעו</h2>
              <p class="text-gray-600">לא נמצאו השלמות בשנה זו.</p>
              <div class="text-center mt-4">
                <button id="closeModal" class="bg-blue-500 text-white px-4 py-1 rounded">סגור</button>
              </div>
            </div>
          `);
          hideSpinner();
          return;
        }

        // מיון ההשלמות לפי תאריך מלא
        const sortedMakeups = makeups.sort((a, b) =>
          new Date(`${a.session_date}T${a.time}`) - new Date(`${b.session_date}T${b.time}`)
        );

        // יצירת השורות
        const tableRows = sortedMakeups.map(a => {
          const date = a.session_date;
          const day = getHebrewDayName((a.day) - 1);
          const time = a.time;
          const programName = a.name || 'לא ידוע';

          return `<tr>
            <td class="border px-2 py-1 text-right">${formatDate(date)}</td>
            <td class="border px-2 py-1 text-right">${day}</td>
            <td class="border px-2 py-1 text-right">${formatTime(time)}</td>
            <td class="border px-2 py-1 text-right">${programName}</td>
          </tr>`;
        }).join('');

        const modalBody = `
          <div class="bg-white rounded-lg p-4 max-w-xl mx-auto mt-10 shadow-lg">
            <h2 class="text-xl font-bold mb-4">השלמות שבוצעו</h2>
            <table class="w-full border border-gray-300 text-sm">
              <thead class="bg-gray-100">
                <tr>
                  <th class="border px-2 py-1">תאריך</th>
                  <th class="border px-2 py-1">יום</th>
                  <th class="border px-2 py-1">שעה</th>
                  <th class="border px-2 py-1">שיעור</th>
                </tr>
              </thead>
              <tbody>${tableRows}</tbody>
            </table>
            <div class="text-center mt-4">
              <button id="closeModal" class="bg-blue-500 text-white px-4 py-1 rounded">סגור</button>
            </div>
          </div>
        `;
        openModal(modalBody);
      }

      hideSpinner();
    });
  });
}



function openModal(content) {
  showSpinner();
  try {
    // מחיקת מודאל קודם אם קיים
    const existing = document.getElementById('dynamicModal');
    if (existing) existing.remove();

    // יצירת שכבת רקע
    const overlay = document.createElement('div');
    overlay.id = 'dynamicModal';
    overlay.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';

    // הכנסת התוכן שקיבלת
    overlay.innerHTML = `
    <div class="relative bg-white p-6 rounded-lg shadow-lg max-h-[90vh] overflow-auto">
      ${content}
      <button id="modalCloseButton" class="absolute top-2 left-2 text-gray-500 hover:text-gray-800 text-2xl">&times;</button>
    </div>
  `;

    document.body.appendChild(overlay);

    // סגירה בלחיצה על הכפתור או מחוץ לחלון
    overlay.querySelector('#modalCloseButton')?.addEventListener('click', () => overlay.remove());
    overlay.querySelector('#closeModal')?.addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove();
    });
  } finally {
    hideSpinner();
  }
}

function getHebrewDayName(dayIndex) {
  const days = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
  return days[dayIndex];
}
