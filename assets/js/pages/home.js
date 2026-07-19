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
const DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי'];

let schedulePrograms = null;
let branchMap = {};
let selectedIds = new Set();
let enrolledProgramIds = new Set(); // תוכניות שהלקוחה כבר משובצת אליהן
let foundCustomer = null;

function fmt(t) { return t ? t.slice(0, 5) : ''; }

// ── Load sessions data ───────────────────────────────────────────
let instructorMap = {};

async function loadAllData() {
  const [{ data: sessions, error: sErr }, { data: codes }, { data: instructors }] = await Promise.all([
    window._sb.from('program_sessions')
      .select('id, date, time, branch_code, instructor_code, status, programs(id, alias, name, day, time, branch_code, instructor_code, status_code)')
      .neq('status', 2)
      .not('programs', 'is', null),
    window._sb.from('codetables').select('code, descriptionCode').eq('name', 'branch'),
    window._sb.from('instructors').select('id, firstName, lastName'),
  ]);
  if (sErr) throw sErr;

  (codes ?? []).forEach(r => { branchMap[r.code] = r.descriptionCode; });
  (instructors ?? []).forEach(r => { instructorMap[r.id] = `${r.firstName || ''} ${r.lastName || ''}`.trim(); });

  schedulePrograms = {};
  (sessions ?? []).forEach(s => {
    const p = s.programs;
    if (!p || p.status_code !== 1) return;
    const pid = p.id;
    const instrName = instructorMap[s.instructor_code] || instructorMap[p.instructor_code] || '';
    const branch = branchMap[s.branch_code] || branchMap[p.branch_code] || '';
    if (!schedulePrograms[pid]) {
      schedulePrograms[pid] = {
        name: p.alias || p.name || '',
        day: p.day,
        time: p.time || '',
        branch: branchMap[p.branch_code] || '',
        instructor: instructorMap[p.instructor_code] || '',
        sessions: []
      };
    }
    schedulePrograms[pid].sessions.push({
      id: s.id,
      date: s.date,
      time: s.time || p.time || '',
      branch,
      instructor: instrName
    });
  });
}

// ── Load existing enrollments ────────────────────────────────────
async function loadEnrolledPrograms(customerId) {
  enrolledProgramIds.clear();
  const { data } = await window._sb.from('program_enrollments').select('program_id').eq('customer_id', customerId);
  (data || []).forEach(r => enrolledProgramIds.add(String(r.program_id)));
}

// ── Modal open / close ───────────────────────────────────────────
document.getElementById('close-modal').addEventListener('click', closeScheduleModal);
document.getElementById('modal-backdrop').addEventListener('click', closeScheduleModal);
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeScheduleModal(); });

window.openScheduleModal = async function () {
  selectedIds.clear();
  enrolledProgramIds.clear();
  foundCustomer = null;
  document.getElementById('schedule-modal').classList.remove('hidden');
  document.body.style.overflow = 'hidden';

  if (!schedulePrograms) {
    showStep('loading');
    try { await loadAllData(); }
    catch (e) { console.error(e); showStep('error'); return; }
  }
  showStep('id-lookup');
};

function closeScheduleModal() {
  document.getElementById('schedule-modal').classList.add('hidden');
  document.body.style.overflow = '';
  selectedIds.clear();
  enrolledProgramIds.clear();
  foundCustomer = null;
}

// ── Steps ────────────────────────────────────────────────────────
function showStep(step) {
  ['loading','error','id-lookup','sessions','register-form','success'].forEach(s => {
    const el = document.getElementById('step-' + s);
    if (el) el.classList.toggle('hidden', s !== step);
  });
}

// ── Step 1: ID lookup ────────────────────────────────────────────
window.lookupCustomer = async function () {
  const idVal = document.getElementById('lookup-id').value.trim();
  if (!idVal) { alert('נא להזין ת.ז'); return; }

  const btn = document.getElementById('lookup-btn');
  btn.disabled = true; btn.textContent = 'מחפשת...';

  try {
    const { data, error } = await window._sb.from('customers')
      .select('id, firstName, lastName, mobile, email').eq('idValue', idVal).maybeSingle();
    if (error) throw error;

    if (data) {
      foundCustomer = data;
      await loadEnrolledPrograms(data.id);
      renderScheduleTable('sessions-table-wrap', true);
      showStep('sessions');
    } else {
      document.getElementById('reg-id').value = idVal;
      renderScheduleTable('reg-table-wrap', false);
      showStep('register-form');
    }
  } catch (e) {
    console.error(e); alert('שגיאה בחיפוש, נסי שוב');
  } finally {
    btn.disabled = false; btn.textContent = 'אישור';
  }
};

// ── Build weekly schedule table ──────────────────────────────────
function renderScheduleTable(containerId, selectable) {
  const wrap = document.getElementById(containerId);
  if (!wrap) return;

  const progs = Object.entries(schedulePrograms || {});

  if (!progs.length) {
    wrap.innerHTML = `
      <div class="text-center py-10 text-gray-400">
        <div class="text-4xl mb-2">📅</div>
        <p class="font-medium">אין שיעורים מתוכננים מ-1.9.2026</p>
        <p class="text-xs mt-1">המערכת תתעדכן כשיתווספו שיעורים</p>
      </div>`;
    return;
  }

  const daySlots = {};
  for (let d = 1; d <= 6; d++) daySlots[d] = {};

  progs.forEach(([pid, prog]) => {
    const d = parseInt(prog.day);
    const t = fmt(prog.time);
    if (!d || d < 1 || d > 6) return;
    if (!daySlots[d][t]) daySlots[d][t] = [];
    daySlots[d][t].push({ pid, ...prog });
  });

  const allTimes = [...new Set(progs.map(([, p]) => fmt(p.time)))].sort();

  if (!allTimes.length) {
    wrap.innerHTML = `<div class="text-center py-10 text-gray-400"><p>אין שיעורים מתוכננים</p></div>`;
    return;
  }

  const headerCols = DAYS.map(d =>
    `<th class="px-2 py-2 text-center text-xs font-bold text-gray-600 bg-gray-50 border border-gray-200 min-w-[90px]">יום ${d}</th>`
  ).join('');

  const rows = allTimes.map(time => {
    const cells = [];
    for (let d = 1; d <= 6; d++) {
      const items = daySlots[d][time] || [];
      if (!items.length) {
        cells.push(`<td class="border border-gray-100 p-1 align-top"></td>`);
      } else {
        const inner = items.map(item => {
          const isEnrolled = enrolledProgramIds.has(String(item.pid));
          const isSelected = !isEnrolled && item.sessions.some(s => selectedIds.has(s.id));

          if (isEnrolled) {
            return `
              <div class="rounded-xl border-2 border-green-400 bg-green-50 p-2 mb-1 select-none">
                <div class="font-semibold text-gray-800 text-xs leading-tight">${item.name}</div>
                <div class="text-gray-400 text-xs mt-0.5">${item.branch}</div>
                <div class="flex justify-end mt-1">
                  <span class="w-4 h-4 rounded border-2 bg-green-500 border-green-500 text-white flex items-center justify-center text-xs">✓</span>
                </div>
              </div>`;
          }

          const selClass = isSelected ? 'border-pink-500 bg-pink-50' : 'border-gray-200 bg-white hover:border-pink-300';
          const checkClass = isSelected ? 'bg-pink-500 border-pink-500 text-white' : 'bg-white border-gray-300 text-transparent';
          const clickAttr = selectable ? `onclick="toggleProgramCell('${item.pid}', this)"` : '';
          const cursor = selectable ? 'cursor-pointer' : '';
          return `
            <div data-pid="${item.pid}" ${clickAttr}
                 class="${cursor} rounded-xl border-2 ${selClass} p-2 mb-1 transition-all select-none">
              <div class="font-semibold text-gray-800 text-xs leading-tight">${item.name}</div>
              <div class="text-gray-400 text-xs mt-0.5">${item.branch}</div>
              ${selectable ? `<div class="flex justify-end mt-1">
                <span class="w-4 h-4 rounded border-2 ${checkClass} flex items-center justify-center text-xs check-icon transition-all">✓</span>
              </div>` : ''}
            </div>`;
        }).join('');
        cells.push(`<td class="border border-gray-100 p-1 align-top">${inner}</td>`);
      }
    }
    return `
      <tr>
        <td class="border border-gray-200 px-2 py-2 text-center text-xs font-bold text-pink-600 bg-pink-50 whitespace-nowrap">${time}</td>
        ${cells.join('')}
      </tr>`;
  }).join('');

  wrap.innerHTML = `
    <div class="overflow-x-auto">
      <table class="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th class="px-2 py-2 text-center text-xs font-bold text-gray-600 bg-gray-50 border border-gray-200 w-14">שעה</th>
            ${headerCols}
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    ${selectable ? `<p class="text-center text-xs text-gray-400 mt-3 pb-1">לצורך ביטול שיבוץ יש ליצור קשר עם אפרת</p>` : ''}`;
}

// ── Toggle cell ──────────────────────────────────────────────────
window.toggleProgramCell = function (pid, cell) {
  const prog = schedulePrograms[pid];
  if (!prog) return;
  if (enrolledProgramIds.has(String(pid))) return; // נעול

  const sessionIds = prog.sessions.map(s => s.id);
  const isSelected = sessionIds.some(id => selectedIds.has(id));

  if (isSelected) {
    sessionIds.forEach(id => selectedIds.delete(id));
    cell.classList.remove('border-pink-500', 'bg-pink-50');
    cell.classList.add('border-gray-200', 'bg-white');
    const icon = cell.querySelector('.check-icon');
    if (icon) icon.className = 'w-4 h-4 rounded border-2 bg-white border-gray-300 text-transparent flex items-center justify-center text-xs check-icon transition-all';
  } else {
    sessionIds.forEach(id => selectedIds.add(id));
    cell.classList.add('border-pink-500', 'bg-pink-50');
    cell.classList.remove('border-gray-200', 'bg-white');
    const icon = cell.querySelector('.check-icon');
    if (icon) icon.className = 'w-4 h-4 rounded border-2 bg-pink-500 border-pink-500 text-white flex items-center justify-center text-xs check-icon transition-all';
  }
  updateAssignBar();
};

function updateAssignBar() {
  const bar = document.getElementById('assign-bar');
  const countEl = document.getElementById('assign-count');
  if (!bar || !countEl) return;
  const progCount = new Set(
    Object.entries(schedulePrograms || {})
      .filter(([pid, p]) => !enrolledProgramIds.has(String(pid)) && p.sessions.some(s => selectedIds.has(s.id)))
      .map(([pid]) => pid)
  ).size;
  bar.classList.toggle('hidden', progCount === 0);
  countEl.textContent = progCount;
}

// ── Assign (full enrollment) ────────────────────────────────────
window.assignSelected = async function () {
  if (!selectedIds.size || !foundCustomer) return;
  const btn = document.getElementById('assign-btn');
  btn.disabled = true; btn.textContent = 'שומרת...';
  try {
    await enrollCustomerInPrograms(foundCustomer.id);
    showSuccessMessage(foundCustomer.firstName + ' ' + foundCustomer.lastName, false);
  } catch (e) {
    console.error(e);
    alert('שגיאה בשיבוץ: ' + (e.message || e));
    btn.disabled = false; btn.textContent = 'שבצי אותי ✓';
  }
};

// ── Assign (trial) ───────────────────────────────────────────────
window.assignTrial = async function () {
  if (!selectedIds.size || !foundCustomer) return;
  const btn = document.getElementById('trial-btn');
  btn.disabled = true; btn.textContent = 'שומרת...';
  try {
    await enrollCustomerAsTrial(foundCustomer.id);
    showSuccessMessage(foundCustomer.firstName + ' ' + foundCustomer.lastName, true);
  } catch (e) {
    console.error(e);
    alert('שגיאה בשיבוץ ניסיון: ' + (e.message || e));
    btn.disabled = false; btn.textContent = 'שיבוץ ניסיון';
  }
};

// ── Trial enrollment: session_attendance only, status_code=3 ─────
async function enrollCustomerAsTrial(customerId) {
  // כל ה-session ids שנבחרו (לא משובצים כבר)
  const sessionIds = [...selectedIds];
  if (!sessionIds.length) return;

  // שלוף נוכחויות קיימות
  const { data: existingAtt } = await window._sb
    .from('session_attendance')
    .select('session_id')
    .eq('customer_id', customerId)
    .in('session_id', sessionIds);

  const existingSet = new Set((existingAtt || []).map(a => a.session_id));

  const toInsert = sessionIds
    .filter(id => !existingSet.has(id))
    .map(id => ({ customer_id: customerId, session_id: id, is_present: false, status_code: 3 }));

  if (toInsert.length) {
    const { error } = await window._sb.from('session_attendance').insert(toInsert);
    if (error) throw error;
  }
}

async function enrollCustomerInPrograms(customerId) {
  const programIds = [...new Set(
    Object.entries(schedulePrograms)
      .filter(([, p]) => p.sessions.some(s => selectedIds.has(s.id)))
      .map(([pid]) => parseInt(pid))
  )];

  for (const programId of programIds) {
    const { data: progMeta } = await window._sb.from('programs').select('start_date, end_date').eq('id', programId).maybeSingle();
    const startDate = progMeta?.start_date || '2026-09-01';
    const endDate   = progMeta?.end_date   || '2027-08-31';

    const { data: existing } = await window._sb.from('program_enrollments')
      .select('id').eq('customer_id', customerId).eq('program_id', programId).maybeSingle();

    if (!existing) {
      const { error: enrollErr } = await window._sb.from('program_enrollments')
        .insert({ customer_id: customerId, program_id: programId, start_date: startDate, end_date: endDate });
      if (enrollErr) throw enrollErr;
    }

    const { data: allProgSessions, error: sessErr } = await window._sb.from('program_sessions')
      .select('id, date').eq('program_id', programId).gte('date', '2026-09-01');
    if (sessErr) throw sessErr;
    if (!allProgSessions?.length) continue;

    const { data: existingAtt } = await window._sb.from('session_attendance')
      .select('session_id').eq('customer_id', customerId).in('session_id', allProgSessions.map(s => s.id));

    const existingSet = new Set((existingAtt || []).map(a => a.session_id));
    const toInsert = allProgSessions
      .filter(s => !existingSet.has(s.id))
      .map(s => ({ customer_id: customerId, session_id: s.id, is_present: false, status_code: 1 }));

    if (toInsert.length) {
      const { error: attErr } = await window._sb.from('session_attendance').insert(toInsert);
      if (attErr) throw attErr;
    }
  }
}

function showSuccessMessage(fullName, isTrial) {
  const selected = Object.entries(schedulePrograms || {})
    .filter(([pid, p]) => !enrolledProgramIds.has(String(pid)) && p.sessions.some(s => selectedIds.has(s.id)))
    .map(([, p]) => `${p.name} – יום ${DAYS[parseInt(p.day) - 1] || ''} ${fmt(p.time)} | ${p.branch}`);

  document.getElementById('success-name').textContent = fullName;
  document.getElementById('success-classes').innerHTML = selected.map(n => `<li>${n}</li>`).join('');
  document.getElementById('success-type').textContent = isTrial ? 'שובצת לניסיון בהצלחה!' : 'שובצת בהצלחה!';
  selectedIds.clear();
  showStep('success');
}

// ── Register new customer ────────────────────────────────────────
window.submitRegistration = async function () {
  const firstName = document.getElementById('reg-first').value.trim();
  const lastName  = document.getElementById('reg-last').value.trim();
  const mobile    = document.getElementById('reg-mobile').value.trim();
  const email     = document.getElementById('reg-email').value.trim();
  const idVal     = document.getElementById('reg-id').value.trim();

  if (!firstName || !lastName || !mobile) { alert('נא למלא שם פרטי, שם משפחה וטלפון'); return; }

  const btn = document.getElementById('reg-submit-btn');
  btn.disabled = true; btn.textContent = 'שומרת...';

  try {
    const { data: newCustomer, error: custErr } = await window._sb.from('customers')
      .insert({ idValue: idVal || null, firstName, lastName, mobile, email: email || null })
      .select('id, firstName, lastName').single();
    if (custErr) throw custErr;

    foundCustomer = newCustomer;

    if (selectedIds.size) {
      await enrollCustomerInPrograms(newCustomer.id);
      showSuccessMessage(newCustomer.firstName + ' ' + newCustomer.lastName, false);
    } else {
      await loadEnrolledPrograms(newCustomer.id);
      renderScheduleTable('sessions-table-wrap', true);
      document.getElementById('customer-greeting').textContent =
        `שלום ${newCustomer.firstName} ${newCustomer.lastName} 👋 בחרי את השיעורים שתרצי להירשם אליהם:`;
      showStep('sessions');
    }
  } catch (e) {
    console.error(e);
    alert('שגיאה ביצירת לקוחה: ' + (e.message || e));
    btn.disabled = false; btn.textContent = 'אישור ושיבוץ';
  }
};

window.backToLookup = function () {
  selectedIds.clear();
  enrolledProgramIds.clear();
  foundCustomer = null;
  document.getElementById('lookup-id').value = '';
  showStep('id-lookup');
};

// ── View Schedule Modal ───────────────────────────────────────────
let vsView = 'weekly';
let vsDate = new Date();

const VS_MONTHS_HE = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'];

window.openViewScheduleModal = async function () {
  document.getElementById('view-schedule-modal').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  vsView = 'weekly';
  vsDate = new Date();
  vsUpdateViewBtns();
  if (!schedulePrograms) {
    document.getElementById('vs-content').innerHTML = '<div class="text-center py-10 text-gray-400">⏳ טוענת...</div>';
    try { await loadAllData(); } catch (e) { console.error(e); document.getElementById('vs-content').innerHTML = '<div class="text-center py-10 text-red-400">שגיאה בטעינה</div>'; return; }
  }
  vsRender();
};

window.closeViewScheduleModal = function () {
  document.getElementById('view-schedule-modal').classList.add('hidden');
  document.body.style.overflow = '';
};

window.vsSetView = function (v) {
  vsView = v;
  vsUpdateViewBtns();
  vsRender();
};

window.vsNav = function (dir) {
  if (vsView === 'weekly') vsDate.setDate(vsDate.getDate() + dir * 7);
  else if (vsView === 'daily') vsDate.setDate(vsDate.getDate() + dir);
  else vsDate.setMonth(vsDate.getMonth() + dir);
  vsRender();
};

window.vsGoToday = function () {
  vsDate = new Date();
  vsRender();
};

function vsUpdateViewBtns() {
  ['weekly','daily','monthly'].forEach(v => {
    const btn = document.getElementById('vs-btn-' + v);
    if (!btn) return;
    btn.className = v === vsView
      ? 'vs-view-btn px-4 py-1.5 rounded-lg text-sm font-semibold transition-all bg-white shadow text-pink-600'
      : 'vs-view-btn px-4 py-1.5 rounded-lg text-sm font-semibold transition-all text-gray-500';
  });
}

function vsGetWeekStart(d) {
  const day = d.getDay();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - day);
}

function vsFmtDate(d) {
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`;
}

function vsGetProgsByDate(dateStr) {
  const result = [];
  Object.values(schedulePrograms || {}).forEach(p => {
    const session = p.sessions.find(s => s.date === dateStr);
    if (session) result.push({ ...p, session });
  });
  return result.sort((a, b) => fmt(a.session?.time || a.time).localeCompare(fmt(b.session?.time || b.time)));
}

function vsProgCard(p) {
  const instr = p.session?.instructor || p.instructor || '';
  const branch = p.session?.branch || p.branch || '';
  const time = fmt(p.session?.time || p.time);
  return `
    <div class="bg-white border border-pink-100 rounded-xl p-2 mb-1 shadow-sm">
      <div class="font-bold text-xs text-gray-800">${p.name}</div>
      <div class="text-xs text-gray-500 mt-0.5 flex flex-wrap gap-x-2">
        <span><i class="fas fa-map-marker-alt text-pink-400"></i> ${branch}</span>
        <span><i class="fas fa-clock text-purple-400"></i> ${time}</span>
        ${instr ? `<span><i class="fas fa-user text-pink-400"></i> ${instr}</span>` : ''}
      </div>
    </div>`;
}

function vsRender() {
  const content = document.getElementById('vs-content');
  const label = document.getElementById('vs-period-label');
  if (!content) return;

  if (vsView === 'weekly') {
    const ws = vsGetWeekStart(vsDate);
    const we = new Date(ws); we.setDate(we.getDate() + 5); // ראשון-שישי
    label.textContent = `${vsFmtDate(ws)} – ${vsFmtDate(we)}`;

    const cols = [];
    for (let i = 0; i < 6; i++) {
      const d = new Date(ws); d.setDate(d.getDate() + i);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      const progs = vsGetProgsByDate(dateStr);
      const isToday = d.toDateString() === new Date().toDateString();
      cols.push(`
        <div class="min-w-[130px] flex-1">
          <div class="text-center py-1.5 mb-2 rounded-lg text-xs font-bold ${isToday ? 'bg-pink-600 text-white' : 'bg-gray-100 text-gray-600'}">
            יום ${DAYS[i]}<br><span class="font-normal">${vsFmtDate(d)}</span>
          </div>
          ${progs.length ? progs.map(vsProgCard).join('') : '<div class="text-center text-gray-300 text-xs py-4">—</div>'}
        </div>`);
    }
    content.innerHTML = `<div class="flex gap-2 overflow-x-auto pb-2">${cols.join('')}</div>`;

  } else if (vsView === 'daily') {
    const dateStr = `${vsDate.getFullYear()}-${String(vsDate.getMonth()+1).padStart(2,'0')}-${String(vsDate.getDate()).padStart(2,'0')}`;
    label.textContent = `${vsFmtDate(vsDate)} – יום ${DAYS[vsDate.getDay()] || ''}`;
    const progs = vsGetProgsByDate(dateStr).sort((a,b) => fmt(a.time).localeCompare(fmt(b.time)));
    if (!progs.length) {
      content.innerHTML = '<div class="text-center py-16 text-gray-400">אין שיעורים ביום זה</div>';
      return;
    }
    content.innerHTML = `
      <table class="w-full border-collapse text-sm">
        <thead><tr class="bg-gray-50">
          <th class="border border-gray-200 px-3 py-2 text-right font-bold text-gray-600">שעה</th>
          <th class="border border-gray-200 px-3 py-2 text-right font-bold text-gray-600">שיעור</th>
          <th class="border border-gray-200 px-3 py-2 text-right font-bold text-gray-600">סניף</th>
          <th class="border border-gray-200 px-3 py-2 text-right font-bold text-gray-600">מדריכה</th>
        </tr></thead>
        <tbody>${progs.map(p => `
          <tr class="hover:bg-pink-50 transition-colors">
            <td class="border border-gray-100 px-3 py-2 text-pink-600 font-bold text-center">${fmt(p.session?.time || p.time)}</td>
            <td class="border border-gray-100 px-3 py-2 font-semibold">${p.name}</td>
            <td class="border border-gray-100 px-3 py-2 text-gray-500">${p.session?.branch || p.branch}</td>
            <td class="border border-gray-100 px-3 py-2 text-gray-500">${p.session?.instructor || p.instructor || '—'}</td>
          </tr>`).join('')}
        </tbody>
      </table>`;

  } else { // monthly
    label.textContent = `${VS_MONTHS_HE[vsDate.getMonth()]} ${vsDate.getFullYear()}`;
    const year = vsDate.getFullYear(), month = vsDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    let cells = Array(firstDay).fill('<td class="border border-gray-100 p-1 align-top h-20"></td>');
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const progs = vsGetProgsByDate(dateStr);
      const isToday = new Date(year, month, d).toDateString() === new Date().toDateString();
      cells.push(`
        <td class="border border-gray-100 p-1 align-top h-20 ${isToday ? 'bg-pink-50' : ''}">
          <div class="text-xs font-bold mb-1 ${isToday ? 'text-pink-600' : 'text-gray-400'}">${d}</div>
          ${progs.map(p => `<div class="text-xs bg-pink-100 text-pink-700 rounded px-1 mb-0.5 truncate" title="${p.name} | ${p.branch} | ${fmt(p.time)}">${p.name}</div>`).join('')}
        </td>`);
    }
    while (cells.length % 7 !== 0) cells.push('<td class="border border-gray-100 p-1 h-20"></td>');

    const rows = [];
    for (let i = 0; i < cells.length; i += 7) rows.push(`<tr>${cells.slice(i, i+7).join('')}</tr>`);

    content.innerHTML = `
      <table class="w-full border-collapse text-sm">
        <thead><tr>${['א','ב','ג','ד','ה','ו','ש'].map(d => `<th class="border border-gray-200 py-2 text-center text-xs font-bold text-gray-500 bg-gray-50">${d}</th>`).join('')}</tr></thead>
        <tbody>${rows.join('')}</tbody>
      </table>`;
  }
}

// ── Print / Download ──────────────────────────────────────────────
window.vsPrint = function () {
  const content = document.getElementById('vs-content')?.innerHTML || '';
  const label = document.getElementById('vs-period-label')?.textContent || '';
  const w = window.open('', '_blank');
  w.document.write(`<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8">
    <title>מערכת שעות – ${label}</title>
    <style>
      body { font-family: Arial, sans-serif; direction: rtl; padding: 20px; }
      table { width: 100%; border-collapse: collapse; }
      th, td { border: 1px solid #ddd; padding: 6px 10px; text-align: right; font-size: 12px; }
      th { background: #f9f9f9; font-weight: bold; }
      h2 { color: #db2777; }
    </style></head><body>
    <h2>מערכת שעות FitBalance – ${label}</h2>
    ${content}
    </body></html>`);
  w.document.close();
  w.print();
};

window.vsDownload = function () {
  const label = document.getElementById('vs-period-label')?.textContent || 'schedule';
  const progs = Object.values(schedulePrograms || {});
  if (!progs.length) return;

  let csv = '\uFEFFשיעור,יום,שעה,סניף,מדריכה\n';
  progs.forEach(p => {
    const instr = p.instructor || '';
    csv += `"${p.name}","${DAYS[(parseInt(p.day)||1)-1]||''}","${fmt(p.time)}","${p.branch}","${instr}"\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `מערכת_שעות_${label.replace(/\s/g,'_')}.csv`;
  a.click();
};
