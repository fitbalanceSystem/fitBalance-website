import { selectFromTable } from '../utilities/dbservice.js';
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
    try{
  const container = document.querySelector('.grid');
  const summary = document.querySelector('.bg-gray-50.text-sm');
  const yearLabel = document.querySelector('.year-label');
  container.innerHTML = '';

  const fromDate = `${year}-09-01`;
  const toDate = `${year + 1}-08-31`;

  if (yearLabel) yearLabel.textContent = `${year} - ${year + 1}`;

  enrollments = await selectFromTable('program_enrollments', {
    customer_id: userId,
    start_date: { lte: new Date(toDate).toISOString() },
    end_date: { gte: new Date(fromDate).toISOString() }
  });

  let totalSessions = 0;
  let totalAttendance = 0;
  let totalMakeups = 0;
  let program;

  for (const enr of enrollments) {
    [program] = await selectFromTable('programs', { id: enr.program_id });
    if (!program) continue;

    const sessions = await selectFromTable('program_sessions', { program_id: program.id });
    const filteredSessions = sessions.filter(s => s.date >= fromDate && s.date <= toDate);
    const now = new Date().toISOString().split('T')[0];
    const pastSessions = filteredSessions.filter(s => s.date <= now);

    const sessionIds = pastSessions.map(s => s.id);
    if (!sessionIds.length) continue;

    const attendanceRecords = await selectFromTable('session_attendance', {
      customer_id: userId
    });

    const relevantAttendance = attendanceRecords.filter(a => sessionIds.includes(a.session_id));
    const attended = relevantAttendance.filter(a => a.is_present && a.status_code === 1).length;
    const makeups = relevantAttendance.filter(a => a.is_present && a.status_code === 2).length;

    totalSessions += pastSessions.length;
    totalAttendance += attended;
    totalMakeups += makeups;

    const card = createProgramCard(program, attended, pastSessions.length);
    container.insertAdjacentHTML('beforeend', card);
  }

  if (summary) {
    summary.innerHTML = `
      בשנת ${year}–${year + 1} נרשמת ל־${enrollments.length} חוגים.<br>
      התקיימו ${totalSessions} שיעורים עד כה, הגעת ל־${totalAttendance}, השלמת ${totalMakeups},<br>
      נותרו לך ${Math.max(0, totalSessions - totalAttendance - totalMakeups)} שיעורים להשלמה.
    `;
  }

  const makeupsBox = document.getElementById('makeups-box');
  if (makeupsBox) {
    makeupsBox.querySelector('p').textContent = `סה"כ השלמות שבוצעו: ${totalMakeups}`;
  }

  setupAttendanceButtons(fromDate, toDate, userId);

  // הצגת כרטיס השלמות אם קיימות
  if (totalMakeups > 0) {
    const makeupCard = createMakeupsCard(totalMakeups);
    container.insertAdjacentHTML('beforeend', makeupCard);
  }
}
finally{
    hideSpinner();
}
}

// ✨ קובייה אחת לתוכנית
function createProgramCard(program, attended, total) {
  const isPink = program.name.includes('פילאטיס');
  const bg = isPink ? 'bg-pink-50 border-pink-200 text-pink-600' : 'bg-green-50 border-green-200 text-green-600';

  return `
    <div class="${bg} border rounded-xl p-4 shadow hover:shadow-md transition">
      <div class="flex justify-between items-center mb-2">
        <h2 class="text-lg font-bold">${program.name}</h2>
        <span class="text-sm text-gray-500">${program.instructor || ''}</span>
      </div>
      <p class="text-sm text-gray-600 mb-1">${program.days || ''} | ${formatTime(program.time) || ''}</p>
      <p class="text-xs text-gray-500 mb-1">${formatDate(program.start_date)} - ${formatDate(program.end_date)}</p>
      <p class="text-sm text-gray-700 mt-2">נוכחת ב־${attended} מתוך ${total} מפגשים</p>
      <button class="mt-3 text-sm underline show-attendance" data-type="program" data-program-id="${program.id}" data-program-name="${program.name}">הצג נוכחות</button>
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

        // מחכים לרינדור ה-UI להציג את הספינר
        await new Promise(resolve => setTimeout(resolve, 50));
      
      const type = button.dataset.type;

      if (type === 'program') {
        const programId = button.dataset.programId;
        const programName = button.dataset.programName;

        // שליפת כל המפגשים של התוכנית
        const sessions = await selectFromTable('program_sessions', {
          program_id: programId
        });

        const filteredSessions = sessions.filter(s => s.date >= fromDate && s.date <= toDate);
        if (!filteredSessions.length) return;

        const sessionIds = filteredSessions.map(s => s.id);

        // שליפת רשומות נוכחות רק למפגשים האלה
        const attendance = await selectFromTable('session_attendance', {
          customer_id: userId
        });

        // סינון רק נוכח (is_present === true)
        const attended = attendance.filter(a =>
          sessionIds.includes(a.session_id) && a.is_present
        );

        // יצירת טבלה
        const tableRows = attended.map(a => {
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
          // כאן ניתן להוסיף לוגיקה להצגת כרטיסיות השלמות אם צריך
        const modalBody = `
          <div class="bg-white rounded-lg p-4 max-w-xl mx-auto mt-10 shadow-lg">
            <h2 class="text-xl font-bold mb-4">השלמות שבוצעו</h2>
            <p>כאן יוצגו הפרטים על ההשלמות שבוצעו.</p>
            <div class="text-center mt-4">
              <button id="closeModal" class="bg-blue-500 text-white px-4 py-1 rounded">סגור</button>
            </div>
          </div>
        `;
        openModal(modalBody);
      }
    });
  });
}

function openModal(content) {
    showSpinner();
    try{
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
} finally{
    hideSpinner();
}
}

function getHebrewDayName(dayIndex) {
  const days = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
  return days[dayIndex];
}
