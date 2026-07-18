(async () => {
  const profile = await window.authMiddleware.requireAuth();
  if (!profile) return;
  window.renderLayout('schedule');

  const user = window.storageUtil.load();
  const DAYS   = ['ראשון','שני','שלישי','רביעי','חמישי','שישי'];
  const MONTHS = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'];

  let allSessions = null;
  let instrMap = {}, branchMap = {};
  let enrolledProgramIds = new Set(); // שיבוץ קבוע
  let makeupSessionIds   = new Set(); // השלמות שנרשמה אליהן (status_code=2)

  const today = new Date(); today.setHours(0,0,0,0);
  const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
  let navDate = new Date(today);

  function fmt(t) { return t ? t.slice(0,5) : ''; }
  function dateStr(d) {
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }
  function parseDateLocal(ds) {
    const [y,m,d] = ds.split('-').map(Number);
    return new Date(y, m-1, d);
  }
  function getSundayOf(d) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate() - d.getDay());
  }
  function getWeekDates(d) {
    const sun = getSundayOf(d);
    return Array.from({length:6}, (_,i) => {
      const x = new Date(sun.getFullYear(), sun.getMonth(), sun.getDate()+i);
      return dateStr(x);
    });
  }

  async function loadData() {
    const [
      { data: sessions },
      { data: programs },
      { data: instructors },
      { data: codes },
      { data: enrollments },
      { data: makeups },
    ] = await Promise.all([
      window._sb.from('program_sessions').select('id, program_id, date, time, instructor_code, branch_code, status, notes'),
      window._sb.from('programs').select('id, name, alias, status_code').eq('status_code', 1),
      window._sb.from('instructors').select('id, firstName'),
      window._sb.from('codetables').select('name, code, descriptionCode').eq('name', 'branch'),
      window._sb.from('program_enrollments').select('program_id').eq('customer_id', user.id),
      window._sb.from('session_attendance').select('session_id').eq('customer_id', user.id).eq('status_code', 2),
    ]);

    const progMap = {};
    (programs ?? []).forEach(p => { progMap[p.id] = p.alias ?? p.name ?? ''; });
    (instructors ?? []).forEach(i => { instrMap[i.id] = i.firstName ?? ''; });
    (codes ?? []).forEach(r => { branchMap[r.code] = r.descriptionCode; });
    enrolledProgramIds = new Set((enrollments ?? []).map(e => e.program_id));
    makeupSessionIds   = new Set((makeups ?? []).map(m => m.session_id));

    allSessions = (sessions ?? [])
      .filter(s => progMap[s.program_id])
      .map(s => ({
        ...s,
        programName:    progMap[s.program_id] ?? '',
        instructorName: instrMap[s.instructor_code] ?? '',
        branchName:     branchMap[s.branch_code] ?? '',
      }));
  }

  function updateNavLabel() {
    const sun = getSundayOf(navDate);
    const fri = new Date(sun); fri.setDate(sun.getDate()+5);
    document.getElementById('nav-label').textContent =
      `${sun.getDate()} – ${fri.getDate()} ${MONTHS[fri.getMonth()]} ${fri.getFullYear()}`;
  }

  function render() {
    updateNavLabel();
    renderWeekly();
  }

  function renderWeekly() {
    const container = document.getElementById('schedule-grid');
    const weekDates = getWeekDates(navDate);

    const cols = weekDates.map(ds => {
      const d = parseDateLocal(ds);
      const isToday = ds === todayStr;
      const sessions = allSessions.filter(s => s.date === ds).sort((a,b) => a.time.localeCompare(b.time));

      return `
        <div class="min-w-0">
          <div class="text-center mb-2 py-1.5 rounded-xl text-xs font-bold ${isToday ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white' : 'bg-gray-100 text-gray-600'}">
            יום ${DAYS[d.getDay()]}<br/><span class="font-normal">${d.getDate()}/${d.getMonth()+1}</span>
          </div>
          <div class="space-y-2">
            ${sessions.length ? sessions.map(s => sessionCard(s, ds)).join('') : '<div class="text-center text-gray-300 text-xs py-4">—</div>'}
          </div>
        </div>`;
    });

    container.innerHTML = `<div class="grid grid-cols-6 gap-2">${cols.join('')}</div>`;

    container.querySelectorAll('.action-btn').forEach(btn => {
      btn.addEventListener('click', () => handleAction(btn));
    });
  }

  function sessionCard(s, ds) {
    const isCancelled = Number(s.status) === 2;
    const isEnrolled  = !isCancelled && enrolledProgramIds.has(s.program_id);
    const isMakeup    = !isCancelled && makeupSessionIds.has(s.id);
    const isPast      = ds < todayStr;

    if (isCancelled) {
      return `
        <div class="rounded-xl p-2 text-xs border border-gray-200 bg-gray-100 shadow-sm opacity-70">
          ${s.notes ? `<div class="text-gray-500 text-xs mb-1 italic">${s.notes}</div>` : ''}
          <div class="font-bold text-gray-400 truncate line-through">${s.programName}</div>
          <div class="text-gray-400 mt-0.5">${fmt(s.time)}</div>
          <div class="text-gray-400 font-semibold mt-1">❌ מבוטל</div>
        </div>`;
    }

    let actionBtn = '';
    if (!isPast) {
      if (isEnrolled) {
        // משובצת — אפשרות לבטל שיבוץ (מסיר רשומת נוכחות)
        actionBtn = `<button class="action-btn mt-1.5 w-full py-1 rounded-lg text-xs font-semibold bg-red-50 text-red-500 hover:bg-red-100 transition-all"
          data-sid="${s.id}" data-type="cancel-enrolled">ביטול שיבוץ</button>`;
      } else if (isMakeup) {
        // נרשמה להשלמה — אפשרות לבטל
        actionBtn = `<button class="action-btn mt-1.5 w-full py-1 rounded-lg text-xs font-semibold bg-red-50 text-red-500 hover:bg-red-100 transition-all"
          data-sid="${s.id}" data-type="cancel-makeup">ביטול השלמה</button>`;
      } else {
        // לא רשומה — אפשרות להירשם להשלמה
        actionBtn = `<button class="action-btn mt-1.5 w-full py-1 rounded-lg text-xs font-semibold bg-pink-100 text-pink-600 hover:bg-pink-200 transition-all"
          data-sid="${s.id}" data-type="add-makeup">הרשמה להשלמה</button>`;
      }
    }

    return `
      <div class="rounded-xl p-2 text-xs border ${isEnrolled ? 'border-pink-300 bg-pink-50' : isMakeup ? 'border-purple-300 bg-purple-50' : 'border-gray-100 bg-white'} shadow-sm">
        ${isEnrolled ? '<div class="text-pink-600 font-bold mb-1">✦ את משובצת כאן</div>' : ''}
        ${isMakeup   ? '<div class="text-purple-600 font-bold mb-1">🔄 השלמה</div>' : ''}
        <div class="font-bold text-gray-800 truncate">${s.programName}</div>
        <div class="text-gray-500 mt-0.5 flex items-center gap-1"><i class="fas fa-clock text-pink-400" style="font-size:9px"></i>${fmt(s.time)}</div>
        <div class="text-gray-500 truncate flex items-center gap-1"><i class="fas fa-map-marker-alt text-purple-400" style="font-size:9px"></i>${s.branchName}</div>
        <div class="text-gray-500 truncate flex items-center gap-1"><i class="fas fa-user text-pink-400" style="font-size:9px"></i>${s.instructorName}</div>
        ${actionBtn}
      </div>`;
  }

  async function handleAction(btn) {
    const sid  = +btn.dataset.sid;
    const type = btn.dataset.type;
    btn.disabled = true;
    btn.textContent = '...';

    try {
      if (type === 'add-makeup') {
        const ok = confirm('להירשם להשלמה בשיעור זה?');
        if (!ok) { renderWeekly(); return; }
        await window._sb.from('session_attendance').insert({
          customer_id: user.id,
          session_id:  sid,
          is_present:  false,
          status_code: 2,
        });
        makeupSessionIds.add(sid);
        window.popup?.toast('נרשמת להשלמה ✓');

      } else if (type === 'cancel-makeup') {
        const ok = confirm('לבטל את ההרשמה להשלמה?');
        if (!ok) { renderWeekly(); return; }
        await window._sb.from('session_attendance')
          .delete()
          .eq('customer_id', user.id)
          .eq('session_id', sid)
          .eq('status_code', 2);
        makeupSessionIds.delete(sid);
        window.popup?.toast('ההרשמה בוטלה');

      } else if (type === 'cancel-enrolled') {
        const ok = confirm('לבטל את השיבוץ לשיעור זה?');
        if (!ok) { renderWeekly(); return; }
        await window._sb.from('session_attendance')
          .delete()
          .eq('customer_id', user.id)
          .eq('session_id', sid);
        // מסיר מהסט המקומי כדי שהכרטיס יתעדכן
        enrolledProgramIds.forEach(pid => {
          if (allSessions.find(s => s.id === sid)?.program_id === pid) {
            enrolledProgramIds.delete(pid);
          }
        });
        window.popup?.toast('השיבוץ בוטל');
      }

      renderWeekly();
    } catch(e) {
      console.error(e);
      window.popup?.toast(e.message ?? 'שגיאה', 'error');
      renderWeekly();
    }
  }

  // טעינה
  document.getElementById('schedule-grid').innerHTML =
    `<div class="text-center py-16 text-gray-400 col-span-6"><div class="text-4xl mb-3">⏳</div><p>טוען...</p></div>`;
  await loadData();

  document.getElementById('prev-week').onclick    = () => { navDate.setDate(navDate.getDate()-7); render(); };
  document.getElementById('next-week').onclick    = () => { navDate.setDate(navDate.getDate()+7); render(); };
  document.getElementById('today-btn').onclick    = () => { navDate = new Date(today); render(); };
  document.getElementById('print-btn').onclick    = () => printSchedule();
  document.getElementById('download-btn').onclick = () => downloadSchedule();

  function buildPrintHTML() {
    const weekDates = getWeekDates(navDate);
    const label = document.getElementById('nav-label').textContent;

    const headerCols = weekDates.map(ds => {
      const d = parseDateLocal(ds);
      return `<th>יום ${DAYS[d.getDay()]}<br/><small>${d.getDate()}/${d.getMonth()+1}</small></th>`;
    }).join('');

    const allTimes = [...new Set(
      weekDates.flatMap(ds => allSessions.filter(s => s.date === ds).map(s => fmt(s.time)))
    )].sort();

    const bodyRows = allTimes.map(time => {
      const cells = weekDates.map(ds => {
        const sessions = allSessions.filter(s => s.date === ds && fmt(s.time) === time);
        return `<td>${sessions.map(s => {
          const isCancelled = Number(s.status) === 2;
          const enrolled = !isCancelled && enrolledProgramIds.has(s.program_id) ? ' ✦' : !isCancelled && makeupSessionIds.has(s.id) ? ' 🔄' : '';
          const cancelledStyle = isCancelled ? 'color:#9ca3af;text-decoration:line-through;' : '';
          const note = isCancelled && s.notes ? `<div style="font-size:.7rem;color:#ef4444;font-style:italic">${s.notes}</div>` : '';
          const cancelledLabel = isCancelled ? '<div style="color:#ef4444;font-size:.7rem">❌ מבוטל</div>' : '';
          return `<div>${note}<strong style="${cancelledStyle}">${s.programName}${enrolled}</strong><br/><small>${s.branchName} | ${s.instructorName}</small>${cancelledLabel}</div>`;
        }).join('') || ''}</td>`;
      }).join('');
      return `<tr><td class="time-col">${time}</td>${cells}</tr>`;
    }).join('');

    return `<!DOCTYPE html><html lang="he" dir="rtl"><head><meta charset="UTF-8"/>
      <title>מערכת שעות – FitBalance</title>
      <style>
        body{font-family:'Segoe UI',sans-serif;padding:24px;color:#1f2937;direction:rtl}
        h1{color:#ec4899;margin-bottom:4px}h2{color:#7c3aed;margin-bottom:16px;font-size:1rem;font-weight:normal}
        table{width:100%;border-collapse:collapse;font-size:.85rem}
        th{background:#f3f4f6;padding:8px;text-align:center;border:1px solid #e5e7eb}
        td{padding:8px;border:1px solid #e5e7eb;vertical-align:top;text-align:center}
        td.time-col{background:#f9fafb;font-weight:bold;color:#6b7280;width:60px}
        td div{margin-bottom:4px}td small{color:#9ca3af;font-size:.75rem}
        @media print{body{padding:0}}
      </style></head><body>
      <h1>📅 מערכת שעות – FitBalance</h1>
      <h2>${label}</h2>
      <table>
        <thead><tr><th>שעה</th>${headerCols}</tr></thead>
        <tbody>${bodyRows || '<tr><td colspan="7">אין שיעורים בשבוע זה</td></tr>'}</tbody>
      </table>
      <p style="font-size:11px;color:#9ca3af;margin-top:12px">✦ = שיעור שאת משובצת בו &nbsp;|&nbsp; 🔄 = השלמה</p>
    </body></html>`;
  }

  function printSchedule() {
    const w = window.open('', '_blank');
    w.document.write(buildPrintHTML());
    w.document.close();
    w.focus();
    w.print();
  }

  function downloadSchedule() {
    const blob = new Blob([buildPrintHTML()], { type: 'text/html;charset=utf-8' });
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(blob),
      download: `מערכת-שעות-${document.getElementById('nav-label').textContent}.html`
    });
    a.click();
  }

  render();
})();
