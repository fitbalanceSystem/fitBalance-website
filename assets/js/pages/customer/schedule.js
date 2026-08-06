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
      window._sb.from('program_sessions').select('id, program_id, date, time, instructor_code, branch_code, status, notes').gte('date', new Date(today.getFullYear(), today.getMonth() - 1, 1).toISOString().split('T')[0]).lte('date', new Date(today.getFullYear() + 2, 11, 31).toISOString().split('T')[0]),
      window._sb.from('programs').select('id, name, alias, status_code').eq('status_code', 1),
      window._sb.from('instructors').select('id, firstName'),
      window._sb.from('codetables').select('name, code, descriptionCode').eq('name', 'branch'),
      window._sb.from('program_enrollments').select('program_id').eq('customer_id', user.id),
      window._sb.from('session_attendance').select('session_id').eq('customer_id', user.id).eq('status_code', 2),
    ]);

    const progMap = {};
    (programs ?? []).forEach(p => { progMap[p.id] = (p.alias && p.alias.trim()) ? p.alias : (p.name ?? ''); });
    (instructors ?? []).forEach(i => { instrMap[i.id] = i.firstName ?? ''; });
    (codes ?? []).forEach(r => { branchMap[r.code] = r.descriptionCode; });
    enrolledProgramIds = new Set((enrollments ?? []).map(e => e.program_id));
    makeupSessionIds   = new Set((makeups ?? []).map(m => m.session_id));

    allSessions = (sessions ?? [])
      .filter(s => progMap[s.program_id] != null)
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
    const isMobile = window.innerWidth <= 768;

    if (isMobile) {
      // במובייל — יום אחד בכל פעם
      const todayIdx = weekDates.indexOf(todayStr);
      if (!container.dataset.dayIdx) container.dataset.dayIdx = todayIdx >= 0 ? todayIdx : 0;
      const dayIdx = Number(container.dataset.dayIdx);
      const ds = weekDates[dayIdx];
      const d = parseDateLocal(ds);
      const isToday = ds === todayStr;
      const sessions = allSessions.filter(s => s.date === ds).sort((a,b) => a.time.localeCompare(b.time));

      container.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;gap:8px">
          <button id="day-prev" style="width:40px;height:40px;border-radius:50%;border:none;background:linear-gradient(135deg,#fce7f3,#ede9fe);font-size:18px;cursor:pointer;color:#9333ea;box-shadow:0 2px 8px rgba(236,72,153,.15);transition:all .2s" ${dayIdx===0?'disabled style="opacity:.3"':''}>›</button>
          <div style="text-align:center;flex:1">
            <div style="font-size:16px;font-weight:800;color:${isToday?'#ec4899':'#1f2937'};letter-spacing:.3px">יום ${DAYS[d.getDay()]}</div>
            <div style="font-size:12px;color:#a78bfa;font-weight:600">${d.getDate()}/${d.getMonth()+1}</div>
          </div>
          <button id="day-next" style="width:40px;height:40px;border-radius:50%;border:none;background:linear-gradient(135deg,#fce7f3,#ede9fe);font-size:18px;cursor:pointer;color:#9333ea;box-shadow:0 2px 8px rgba(236,72,153,.15);transition:all .2s" ${dayIdx===5?'disabled style="opacity:.3"':''}>‹</button>
        </div>
        <div style="display:flex;flex-direction:column;gap:12px">
          ${sessions.length ? sessions.map(s => sessionCard(s, ds)).join('') : '<div style="text-align:center;color:#d1d5db;padding:48px 0;font-size:13px">🌙 אין שיעורים ביום זה</div>'}
        </div>`;

      container.querySelector('#day-prev')?.addEventListener('click', () => {
        if (dayIdx > 0) { container.dataset.dayIdx = dayIdx - 1; renderWeekly(); }
      });
      container.querySelector('#day-next')?.addEventListener('click', () => {
        if (dayIdx < 5) { container.dataset.dayIdx = Number(dayIdx) + 1; renderWeekly(); }
      });
    } else {
      // דסקטופ — גריד שבועי
      const cols = weekDates.map(ds => {
        const d = parseDateLocal(ds);
        const isToday = ds === todayStr;
        const sessions = allSessions.filter(s => s.date === ds).sort((a,b) => a.time.localeCompare(b.time));
        return `
          <div style="min-width:0">
            <div style="text-align:center;margin-bottom:10px;padding:8px 4px;border-radius:14px;font-size:11px;font-weight:800;letter-spacing:.3px;
              ${isToday
                ? 'background:linear-gradient(135deg,#ec4899,#9333ea);color:white;box-shadow:0 4px 14px rgba(236,72,153,.35)'
                : 'background:linear-gradient(135deg,#f9fafb,#f3f4f6);color:#6b7280;border:1px solid #e5e7eb'}">
              יום ${DAYS[d.getDay()]}<br/><span style="font-weight:500;opacity:.85">${d.getDate()}/${d.getMonth()+1}</span>
            </div>
            <div style="display:flex;flex-direction:column;gap:8px">
              ${sessions.length ? sessions.map(s => sessionCard(s, ds)).join('') : '<div style="text-align:center;color:#e5e7eb;font-size:11px;padding:20px 0">—</div>'}
            </div>
          </div>`;
      });
      container.innerHTML = `<div style="display:grid;grid-template-columns:repeat(6,1fr);gap:10px">${cols.join('')}</div>`;
    }

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
        <div style="border-radius:14px;padding:10px;font-size:11px;background:white;border:1.5px solid #fecaca;box-shadow:0 2px 8px rgba(0,0,0,.05);opacity:.8">
          <div style="display:flex;align-items:center;gap:5px;margin-bottom:5px">
            <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#f87171;flex-shrink:0"></span>
            <span style="font-size:10px;font-weight:700;color:#ef4444">מבוטל</span>
          </div>
          <div style="font-weight:800;color:#9ca3af;text-decoration:line-through;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:12px">${s.programName}</div>
          <div style="display:flex;align-items:center;gap:4px;color:#d1d5db;margin-top:4px"><i class="fas fa-clock" style="font-size:9px"></i>${fmt(s.time)}</div>
          ${s.notes ? `<div style="margin-top:5px;font-size:10px;color:#f87171;background:#fef2f2;border-radius:8px;padding:4px 7px;font-style:italic">${s.notes}</div>` : ''}
        </div>`;
    }

    const cardBg = isEnrolled
      ? 'background:linear-gradient(135deg,#fdf2f8,#fce7f3);border:1.5px solid #f9a8d4'
      : isMakeup
      ? 'background:linear-gradient(135deg,#faf5ff,#ede9fe);border:1.5px solid #c4b5fd'
      : 'background:white;border:1.5px solid #f3f4f6';

    let actionBtn = '';
    if (!isPast) {
      if (isEnrolled) {
        actionBtn = `<button class="action-btn" style="margin-top:8px;width:100%;padding:5px 0;border-radius:10px;font-size:10px;font-weight:700;border:none;background:#fee2e2;color:#ef4444;cursor:pointer;transition:all .2s"
          data-sid="${s.id}" data-type="cancel-enrolled">ביטול שיבוץ</button>`;
      } else if (isMakeup) {
        actionBtn = `<button class="action-btn" style="margin-top:8px;width:100%;padding:5px 0;border-radius:10px;font-size:10px;font-weight:700;border:none;background:#fee2e2;color:#ef4444;cursor:pointer;transition:all .2s"
          data-sid="${s.id}" data-type="cancel-makeup">ביטול השלמה</button>`;
      } else {
        actionBtn = `<button class="action-btn" style="margin-top:8px;width:100%;padding:5px 0;border-radius:10px;font-size:10px;font-weight:700;border:none;background:linear-gradient(135deg,#fce7f3,#ede9fe);color:#9333ea;cursor:pointer;transition:all .2s"
          data-sid="${s.id}" data-type="add-makeup">+ הרשמה להשלמה</button>`;
      }
    }

    return `
      <div style="border-radius:14px;padding:10px 10px 8px;font-size:11px;${cardBg};box-shadow:0 2px 10px rgba(0,0,0,.06);transition:box-shadow .2s">
        ${isEnrolled ? '<div style="font-size:10px;font-weight:800;color:#ec4899;margin-bottom:5px;letter-spacing:.2px">✦ את משובצת כאן</div>' : ''}
        ${isMakeup   ? '<div style="font-size:10px;font-weight:800;color:#9333ea;margin-bottom:5px">🔄 השלמה</div>' : ''}
        <div style="font-weight:800;color:#1f2937;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:12px">${s.programName}</div>
        <div style="display:flex;align-items:center;gap:4px;color:#6b7280;margin-top:4px"><i class="fas fa-clock" style="color:#f472b6;font-size:9px"></i>${fmt(s.time)}</div>
        ${s.branchName ? `<div style="display:flex;align-items:center;gap:4px;color:#6b7280;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis"><i class="fas fa-map-marker-alt" style="color:#a78bfa;font-size:9px"></i>${s.branchName}</div>` : ''}
        ${s.instructorName ? `<div style="display:flex;align-items:center;gap:4px;color:#6b7280;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis"><i class="fas fa-user" style="color:#f472b6;font-size:9px"></i>${s.instructorName}</div>` : ''}
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

  document.getElementById('prev-week').onclick    = () => { navDate.setDate(navDate.getDate()-7); document.getElementById('schedule-grid').dataset.dayIdx=''; render(); };
  document.getElementById('next-week').onclick    = () => { navDate.setDate(navDate.getDate()+7); document.getElementById('schedule-grid').dataset.dayIdx=''; render(); };
  document.getElementById('today-btn').onclick    = () => { navDate = new Date(today); document.getElementById('schedule-grid').dataset.dayIdx=''; render(); };
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
