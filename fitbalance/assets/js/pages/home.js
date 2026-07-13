// ── Mobile menu ──────────────────────────────────────────────────
document.getElementById('menu-btn').addEventListener('click', () => {
  const m = document.getElementById('mobile-menu');
  m.classList.toggle('hidden');
  m.classList.toggle('flex');
});

// ── Header shadow ────────────────────────────────────────────────
window.addEventListener('scroll', () => {
  document.getElementById('main-header').classList.toggle('scrolled', window.scrollY > 10);
});

// ── Fade in ──────────────────────────────────────────────────────
const observer = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
}, { threshold: 0.15 });
document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));

// ── Counters ─────────────────────────────────────────────────────
const counterObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    const target = +entry.target.dataset.target;
    let cur = 0;
    const step = Math.ceil(target / 60);
    const t = setInterval(() => {
      cur += step;
      if (cur >= target) { entry.target.textContent = target + '+'; clearInterval(t); }
      else entry.target.textContent = cur;
    }, 30);
    counterObserver.unobserve(entry.target);
  });
}, { threshold: 0.5 });
document.querySelectorAll('.counter').forEach(c => counterObserver.observe(c));

// ── Schedule Modal ───────────────────────────────────────────────
const DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
const MONTHS = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'];

let allSessions = null;   // כל הנתונים שנטענו
let instrMap = {}, branchMap = {};

const today = new Date();
today.setHours(0,0,0,0);
const todayStr = today.toISOString().split('T')[0];

// מצב תצוגה
let currentView = 'weekly';   // 'daily' | 'weekly' | 'monthly'
let navDate = new Date(today); // תאריך ניווט

// ── עזר תאריכים ─────────────────────────────────────────────────
function fmt(t) { return t ? t.slice(0, 5) : ''; }
function dateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function parseDateLocal(ds) {
  const [y, m, d] = ds.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function getSundayOf(d) {
  const s = new Date(d.getFullYear(), d.getMonth(), d.getDate() - d.getDay());
  return s;
}

function getWeekDates(d) {
  const sun = getSundayOf(d);
  return Array.from({length: 6}, (_, i) => {
    const x = new Date(sun.getFullYear(), sun.getMonth(), sun.getDate() + i);
    return dateStr(x);
  });
}

// ── טעינת נתונים ─────────────────────────────────────────────────
async function loadAllData() {
  // שולפים את כל המפגשים (ללא סינון תאריך) כדי לתמוך בניווט
  const [{ data: sessions, error }, { data: programs }, { data: instructors }, { data: codes }] = await Promise.all([
    window._sb.from('program_sessions')
      .select('id, program_id, date, time, instructor_code, branch_code, status'),
    window._sb.from('programs').select('id, alias, status_code').eq('status_code', 1),
    window._sb.from('instructors').select('id, firstName'),
    window._sb.from('codetables').select('name, code, descriptionCode').eq('name', 'branch'),
  ]);
  if (error) throw error;

  const progMap = {};
  (programs ?? []).forEach(p => { progMap[p.id] = p.alias ?? p.name ?? ''; });
  (instructors ?? []).forEach(i => { instrMap[i.id] = i.firstName ?? ''; });
  (codes ?? []).forEach(r => { branchMap[r.code] = r.descriptionCode; });

  allSessions = (sessions ?? [])
    .filter(s => progMap[s.program_id] && s.status != 2)
    .map(s => ({
      ...s,
      programName:    progMap[s.program_id] ?? '',
      instructorName: instrMap[s.instructor_code] ?? '',
      branchName:     branchMap[s.branch_code] ?? '',
    }));
}

// ── פתיחה/סגירה ──────────────────────────────────────────────────
document.getElementById('close-modal').addEventListener('click', closeScheduleModal);
document.getElementById('modal-backdrop').addEventListener('click', closeScheduleModal);
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeScheduleModal(); });

window.openScheduleModal = async function () {
  document.getElementById('schedule-modal').classList.remove('hidden');
  document.body.style.overflow = 'hidden';

  if (!allSessions) {
    document.getElementById('modal-classes').innerHTML =
      `<div class="text-center py-12 text-gray-400"><div class="text-4xl mb-3">⏳</div><p>טוען שיעורים...</p></div>`;
    try { await loadAllData(); }
    catch (e) {
      console.error(e);
      document.getElementById('modal-classes').innerHTML =
        `<div class="text-center py-12 text-red-400"><div class="text-4xl mb-3">⚠️</div><p>שגיאה בטעינת השיעורים</p></div>`;
      return;
    }
  }
  updateViewButtons();
  render();
};

function closeScheduleModal() {
  document.getElementById('schedule-modal').classList.add('hidden');
  document.body.style.overflow = '';
}

// ── בחירת תצוגה ──────────────────────────────────────────────────
window.setView = function (v) {
  currentView = v;
  updateViewButtons();
  render();
};

function updateViewButtons() {
  ['daily','weekly','monthly'].forEach(v => {
    const btn = document.getElementById('view-' + v);
    if (!btn) return;
    btn.classList.toggle('bg-gradient-to-r', v === currentView);
    btn.classList.toggle('from-pink-600',    v === currentView);
    btn.classList.toggle('to-purple-600',    v === currentView);
    btn.classList.toggle('text-white',       v === currentView);
    btn.classList.toggle('text-gray-600',    v !== currentView);
  });
}

// ── ניווט ────────────────────────────────────────────────────────
window.navPrev = function () {
  if (currentView === 'daily')   navDate.setDate(navDate.getDate() - 1);
  if (currentView === 'weekly')  navDate.setDate(navDate.getDate() - 7);
  if (currentView === 'monthly') navDate.setMonth(navDate.getMonth() - 1);
  render();
};
window.navNext = function () {
  if (currentView === 'daily')   navDate.setDate(navDate.getDate() + 1);
  if (currentView === 'weekly')  navDate.setDate(navDate.getDate() + 7);
  if (currentView === 'monthly') navDate.setMonth(navDate.getMonth() + 1);
  render();
};
window.navToday = function () {
  navDate = new Date(today);
  render();
};

// ── רינדור ראשי ──────────────────────────────────────────────────
function render() {
  updateNavLabel();
  if (currentView === 'daily')   renderDaily();
  if (currentView === 'weekly')  renderWeekly();
  if (currentView === 'monthly') renderMonthly();
}

function updateNavLabel() {
  const el = document.getElementById('nav-label');
  if (!el) return;
  if (currentView === 'daily') {
    el.textContent = navDate.toLocaleDateString('he-IL', { weekday:'long', day:'numeric', month:'long' });
  } else if (currentView === 'weekly') {
    const sun = getSundayOf(navDate);
    const fri = new Date(sun); fri.setDate(sun.getDate() + 5);
    el.textContent = `${sun.getDate()} – ${fri.getDate()} ${MONTHS[fri.getMonth()]} ${fri.getFullYear()}`;
  } else {
    el.textContent = `${MONTHS[navDate.getMonth()]} ${navDate.getFullYear()}`;
  }
}

// ── תצוגה יומית ──────────────────────────────────────────────────
function renderDaily() {
  const container = document.getElementById('modal-classes');
  const ds = dateStr(navDate);
  const sessions = allSessions.filter(s => s.date === ds).sort((a,b) => a.time.localeCompare(b.time));

  if (!sessions.length) {
    container.innerHTML = `<div class="text-center py-16 text-gray-400"><div class="text-5xl mb-3">📅</div><p class="font-medium">אין שיעורים ביום זה</p></div>`;
    return;
  }
  container.innerHTML = `<div class="space-y-3">${sessions.map(s => sessionCard(s)).join('')}</div>`;
}

// ── תצוגה שבועית ─────────────────────────────────────────────────
function renderWeekly() {
  const container = document.getElementById('modal-classes');
  const weekDates = getWeekDates(navDate);

  const cols = weekDates.map(ds => {
    const d = parseDateLocal(ds);
    const sessions = allSessions.filter(s => s.date === ds).sort((a,b) => a.time.localeCompare(b.time));
    return `
      <div class="min-w-0">
        <div class="text-center mb-2 py-1 rounded-xl text-xs font-bold bg-gray-100 text-gray-600">
          יום ${DAYS[d.getDay()]}<br/><span class="font-normal">${d.getDate()}/${d.getMonth()+1}</span>
        </div>
        <div class="space-y-2">
          ${sessions.length
            ? sessions.map(s => `
              <div class="rounded-xl p-2 text-xs border border-gray-100 bg-white shadow-sm">
                <div class="font-bold text-gray-800 truncate">${s.programName}</div>
                <div class="text-gray-500 mt-0.5 flex items-center gap-1"><i class="fas fa-clock text-pink-400" style="font-size:9px"></i>${fmt(s.time)}</div>
                <div class="text-gray-500 truncate flex items-center gap-1"><i class="fas fa-map-marker-alt text-purple-400" style="font-size:9px"></i>${s.branchName}</div>
                <div class="text-gray-500 truncate flex items-center gap-1"><i class="fas fa-user text-pink-400" style="font-size:9px"></i>${s.instructorName}</div>
              </div>`).join('')
            : '<div class="text-center text-gray-300 text-xs py-4">—</div>'}
        </div>
      </div>`;
  });

  container.innerHTML = `<div class="grid grid-cols-6 gap-2">${cols.join('')}</div>`;
}

// ── תצוגה חודשית ─────────────────────────────────────────────────
function renderMonthly() {
  const container = document.getElementById('modal-classes');
  const year = navDate.getFullYear(), month = navDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();  // 0=ראשון
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // כותרות ימים
  const headers = DAYS.slice(0,6).reverse().map(d =>
    `<div class="text-center text-xs font-bold text-gray-500 py-1">${d}</div>`).join('');

  // תאים ריקים לפני היום הראשון
  const blanks = Array.from({length: firstDay}, () => '<div></div>').join('');

  const cells = Array.from({length: daysInMonth}, (_, i) => {
    const day = i + 1;
    const ds = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    const count = allSessions.filter(s => s.date === ds).length;
    return `
      <div onclick="drillDay('${ds}')" class="cursor-pointer rounded-xl p-1 text-center border border-transparent hover:border-gray-200 hover:bg-gray-50 transition-all">
        <div class="text-sm font-semibold text-gray-700">${day}</div>
        ${count ? `<div class="mt-0.5 mx-auto w-5 h-5 rounded-full bg-pink-500 text-white text-xs flex items-center justify-center">${count}</div>` : '<div class="h-5"></div>'}
      </div>`;
  }).join('');

  container.innerHTML = `
    <div class="grid grid-cols-6 gap-1 mb-2">${headers}</div>
    <div class="grid grid-cols-6 gap-1">${blanks}${cells}</div>
    <p class="text-center text-xs text-gray-400 mt-4">לחצי על יום לצפייה בשיעורים</p>`;
}

// לחיצה על יום בתצוגה חודשית → מעבר לתצוגה יומית
window.drillDay = function (ds) {
  navDate = parseDateLocal(ds);
  currentView = 'daily';
  updateViewButtons();
  render();
};

// ── כרטיס שיעור ──────────────────────────────────────────────────
function sessionCard(s) {
  return `
    <div class="flex items-center gap-4 bg-white border border-gray-100 rounded-2xl p-4 hover:shadow-lg transition-shadow">
      <div class="text-3xl flex-shrink-0">🏃‍♀️</div>
      <div class="flex-1 min-w-0">
        <div class="font-bold text-gray-800">${s.programName}</div>
        <div class="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-gray-500">
          <span class="flex items-center gap-1"><i class="fas fa-clock text-pink-400 text-xs"></i>${fmt(s.time)}</span>
          <span class="flex items-center gap-1"><i class="fas fa-map-marker-alt text-purple-400 text-xs"></i>${s.branchName}</span>
          <span class="flex items-center gap-1"><i class="fas fa-user text-pink-400 text-xs"></i>${s.instructorName}</span>
        </div>
      </div>
    </div>`;
}

// ── הדפסה / הורדה ────────────────────────────────────────────────
window.printSchedule = function () {
  const win = window.open('', '_blank');
  win.document.write(buildPrintHTML());
  win.document.close();
  win.focus();
  win.print();
  win.close();
};

window.downloadSchedule = function () {
  const blob = new Blob([buildPrintHTML()], { type: 'text/html;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'מערכת-שעות-FitBalance.html';
  a.click();
};

function buildPrintHTML() {
  if (!allSessions) return '<p>אין נתונים</p>';
  const weekDates = getWeekDates(navDate);
  const sun = getSundayOf(navDate);
  const fri = new Date(sun); fri.setDate(sun.getDate() + 5);
  const weekLabel = `${sun.getDate()}/${sun.getMonth()+1} – ${fri.getDate()}/${fri.getMonth()+1}/${fri.getFullYear()}`;

  // עמודות: שיעורים ייחודיים לפי שעה
  const allTimes = [...new Set(
    weekDates.flatMap(ds => allSessions.filter(s => s.date === ds).map(s => fmt(s.time)))
  )].sort();

  const headerCols = weekDates.map(ds => {
    const d = parseDateLocal(ds);
    return `<th>יום ${DAYS[d.getDay()]}<br/><small>${d.getDate()}/${d.getMonth()+1}</small></th>`;
  }).join('');

  const bodyRows = allTimes.map(time => {
    const cells = weekDates.map(ds => {
      const sessions = allSessions.filter(s => s.date === ds && fmt(s.time) === time);
      return `<td>${
        sessions.map(s => `<div><strong>${s.programName}</strong><br/><small>${s.branchName} | ${s.instructorName}</small></div>`).join('') || ''
      }</td>`;
    }).join('');
    return `<tr><td class="time-col">${time}</td>${cells}</tr>`;
  }).join('');

  return `<!DOCTYPE html><html lang="he" dir="rtl"><head><meta charset="UTF-8"/>
    <title>מערכת שעות – FitBalance</title>
    <style>
      body{font-family:'Segoe UI',sans-serif;padding:24px;color:#1f2937;direction:rtl}
      h1{color:#ec4899;margin-bottom:4px}
      h2{color:#7c3aed;margin-bottom:16px;font-size:1rem;font-weight:normal}
      table{width:100%;border-collapse:collapse;font-size:.85rem}
      th{background:#f3f4f6;padding:8px;text-align:center;border:1px solid #e5e7eb}
      td{padding:8px;border:1px solid #e5e7eb;vertical-align:top;text-align:center}
      td.time-col{background:#f9fafb;font-weight:bold;color:#6b7280;width:60px;text-align:center}
      td div{margin-bottom:4px}
      td small{color:#9ca3af;font-size:.75rem}
      @media print{body{padding:0}}
    </style></head><body>
    <h1>📅 מערכת שעות – FitBalance</h1>
    <h2>${weekLabel}</h2>
    <table>
      <thead><tr><th>שעה</th>${headerCols}</tr></thead>
      <tbody>${bodyRows || '<tr><td colspan="7">אין שיעורים בשבוע זה</td></tr>'}</tbody>
    </table>
  </body></html>`;
}
