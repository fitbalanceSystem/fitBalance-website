(async () => {
  const profile = await window.authMiddleware.requireAuth();
  if (!profile) return;
  window.renderLayout('plans');

  const user = window.storageUtil.load();
  const DAY_NAMES = ['ראשון','שני','שלישי','רביעי','חמישי','שישי','שבת'];

  // שם מלא לכותרת הדפסה
  const customerData = await window.customerService.getProfile(user.email).catch(() => null);
  const fullName = customerData ? `${customerData.firstName ?? ''} ${customerData.lastName ?? ''}`.trim() : '';

  function getSchoolYear(date = new Date()) {
    return (date.getMonth() + 1) >= 9 ? date.getFullYear() : date.getFullYear() - 1;
  }
  function schoolYearRange(year) {
    return { start: `${year}-09-01`, end: `${year + 1}-08-31` };
  }

  let currentYear = getSchoolYear();
  let showAll = false;

  // --- מודאל ---
  function createModal() {
    const el = document.createElement('div');
    el.id = 'attendance-modal';
    el.style.cssText = 'display:none;position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:1000;align-items:center;justify-content:center;';
    el.innerHTML = `
      <div style="background:#fff;border-radius:16px;width:90%;max-width:560px;max-height:80vh;display:flex;flex-direction:column;overflow:hidden;">
        <div style="padding:16px 20px;border-bottom:1px solid #f3f4f6;display:flex;align-items:center;justify-content:space-between;">
          <span id="modal-title" style="font-weight:700;font-size:15px;color:#1f2937;"></span>
          <button id="modal-close" style="font-size:20px;color:#9ca3af;background:none;border:none;cursor:pointer;">✕</button>
        </div>
        <div style="overflow-y:auto;flex:1;padding:16px 20px;">
          <div id="modal-body"></div>
        </div>
      </div>`;
    document.body.appendChild(el);
    el.addEventListener('click', e => { if (e.target === el) closeModal(); });
    document.getElementById('modal-close').onclick = closeModal;
  }

  function closeModal() {
    document.getElementById('attendance-modal').style.display = 'none';
  }

  function buildTableHTML(tableId, rows) {
    return `
      <table id="${tableId}" style="width:100%;border-collapse:collapse;">
        <thead>
          <tr style="border-bottom:2px solid #f3f4f6;">
            <th style="padding:8px 4px;text-align:right;font-size:12px;color:#9ca3af;font-weight:600;">תאריך</th>
            <th style="padding:8px 4px;text-align:right;font-size:12px;color:#9ca3af;font-weight:600;">יום</th>
            <th style="padding:8px 4px;text-align:right;font-size:12px;color:#9ca3af;font-weight:600;">שעה</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>`;
  }

  function buildActionButtons(tableId, title, period, type) {
    const label = type === 'completions' ? 'השלמות' : `חוג: ${title}`;
    return `
      <div style="display:flex;gap:8px;margin-bottom:12px;justify-content:flex-end;">
        <button onclick="window._printAtt('${tableId}','${fullName}','${period}','${label}')"
          style="font-size:12px;padding:5px 12px;border-radius:8px;border:1px solid #e5e7eb;cursor:pointer;background:#f9fafb;">🖨️ הדפסה</button>
        <button onclick="window._downloadAtt('${tableId}','${fullName}','${period}','${label}')"
          style="font-size:12px;padding:5px 12px;border-radius:8px;border:1px solid #e5e7eb;cursor:pointer;background:#f9fafb;">⬇️ הורדה CSV</button>
      </div>`;
  }

  async function openAttendanceModal(programId, enrollmentId, programName, enrollStart, enrollEnd) {
    const modal = document.getElementById('attendance-modal');
    const body  = document.getElementById('modal-body');
    document.getElementById('modal-title').textContent = `נוכחות — ${programName}`;
    body.innerHTML = '<p style="text-align:center;color:#9ca3af;padding:24px 0;">טוען...</p>';
    modal.style.display = 'flex';

    const yearRange = showAll ? null : schoolYearRange(currentYear);
    const rangeStart = yearRange?.start ?? '2000-01-01';
    const rangeEnd   = yearRange?.end   ?? '2099-12-31';
    const today = new Date().toISOString().split('T')[0];
    const capEnd = today < rangeEnd ? today : rangeEnd;
    const startDate = enrollStart > rangeStart ? enrollStart : rangeStart;
    const endDate   = capEnd < (enrollEnd ?? rangeEnd) ? capEnd : (enrollEnd ?? rangeEnd);
    if (endDate < startDate) {
      body.innerHTML = '<p style="text-align:center;color:#9ca3af;padding:24px 0;">אין מפגשים לתקופה זו</p>';
      return;
    }

    const { data: sessions, error: sErr } = await window._sb
      .from('program_sessions')
      .select('id, date, time, status')
      .eq('program_id', programId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true });

    if (sErr || !sessions?.length) {
      body.innerHTML = '<p style="text-align:center;color:#9ca3af;padding:24px 0;">אין מפגשים לתקופה זו</p>';
      return;
    }

    const sIds = sessions.filter(s => s.status !== 2).map(s => s.id);
    const { data: att } = await window._sb
      .from('session_attendance')
      .select('session_id')
      .eq('customer_id', user.id)
      .in('session_id', sIds)
      .eq('is_present', 1);

    const attSet = new Set((att || []).map(a => a.session_id));
    const presentSessions = sessions.filter(s => s.status !== 2 && attSet.has(s.id));

    if (!presentSessions.length) {
      body.innerHTML = '<p style="text-align:center;color:#9ca3af;padding:24px 0;">לא נמצאו שיעורים שנכחת בהם</p>';
      return;
    }

    const rows = presentSessions.map(s => {
      const dayName = DAY_NAMES[new Date(s.date).getDay()];
      const time = s.time ? s.time.slice(0, 5) : '';
      return `<tr style="border-bottom:1px solid #f3f4f6;">
        <td style="padding:8px 4px;font-size:13px;color:#374151;">${s.date}</td>
        <td style="padding:8px 4px;font-size:13px;color:#6b7280;">${dayName}</td>
        <td style="padding:8px 4px;font-size:13px;color:#6b7280;">${time}</td>
      </tr>`;
    }).join('');

    const tableId = 'att-print-table';
    const period = `${startDate} – ${endDate}`;
    body.innerHTML = buildActionButtons(tableId, programName, period, 'attendance') + buildTableHTML(tableId, rows);
  }

  async function openCompletionsModal() {
    const modal = document.getElementById('attendance-modal');
    const body  = document.getElementById('modal-body');
    const yearRange = showAll ? null : schoolYearRange(currentYear);
    const rangeStart = yearRange?.start ?? '2000-01-01';
    const rangeEnd   = yearRange?.end   ?? '2099-12-31';
    const today = new Date().toISOString().split('T')[0];
    const capEnd = today < rangeEnd ? today : rangeEnd;
    const periodLabel = showAll ? 'כל השנים' : `${currentYear}–${currentYear + 1}`;
    document.getElementById('modal-title').textContent = `השלמות — ${periodLabel}`;
    body.innerHTML = '<p style="text-align:center;color:#9ca3af;padding:24px 0;">טוען...</p>';
    modal.style.display = 'flex';

    const { data: att, error } = await window._sb
      .from('session_attendance')
      .select('session_id, program_sessions(date, time, programs(name))')
      .eq('customer_id', user.id)
      .eq('status_code', '2')
      .order('session_id', { ascending: false });

    const filteredAtt = (att || []).filter(a => {
      const d = a.program_sessions?.date;
      return d && d >= rangeStart && d <= capEnd;
    });
    if (error || !filteredAtt.length) {
      body.innerHTML = '<p style="text-align:center;color:#9ca3af;padding:24px 0;">אין השלמות</p>';
      return;
    }

    const rows = filteredAtt.map(a => {
      const s = a.program_sessions;
      const dayName = s?.date ? DAY_NAMES[new Date(s.date).getDay()] : '';
      const time = s?.time ? s.time.slice(0, 5) : '';
      return `<tr style="border-bottom:1px solid #f3f4f6;">
        <td style="padding:8px 4px;font-size:13px;color:#374151;">${s?.date ?? ''}</td>
        <td style="padding:8px 4px;font-size:13px;color:#6b7280;">${dayName}</td>
        <td style="padding:8px 4px;font-size:13px;color:#6b7280;">${time}</td>
      </tr>`;
    }).join('');

    const tableId = 'comp-print-table';
    body.innerHTML = buildActionButtons(tableId, '', periodLabel, 'completions') + buildTableHTML(tableId, rows);
  }

  createModal();

  // --- טעינת נתונים ---
  async function loadData() {
    const today = new Date().toISOString().split('T')[0];
    const yearRange = showAll ? null : schoolYearRange(currentYear);
    const rangeStart = yearRange?.start ?? '2000-01-01';
    const rangeEnd   = yearRange?.end   ?? '2099-12-31';
    const capEnd     = today < rangeEnd ? today : rangeEnd;

    let enrollQuery = window._sb
      .from('program_enrollments')
      .select('id, start_date, end_date, programs!fk_enrollments_program(id, name, day, time)')
      .eq('customer_id', user.id)
      .lte('start_date', rangeEnd)
      .or(`end_date.gte.${rangeStart},end_date.is.null`)
      .order('start_date', { ascending: false });

    const { data: enrollments, error: eErr } = await enrollQuery;
    if (eErr) { console.error(eErr); return { enrollments: [], sessionsByEnrollment: {}, attendanceByEnrollment: {}, totalCompletions: 0 }; }
    if (!enrollments?.length) return { enrollments: [], sessionsByEnrollment: {}, attendanceByEnrollment: {}, totalCompletions: 0 };

    const sessionsByEnrollment = {};
    const attendanceByEnrollment = {};

    await Promise.all(enrollments.map(async e => {
      const pid = e.programs?.id;
      if (!pid) return;

      const sessStart = e.start_date;
      const sessEnd   = e.end_date ? (today < e.end_date ? today : e.end_date) : today;
      if (sessEnd < sessStart) { sessionsByEnrollment[e.id] = 0; attendanceByEnrollment[e.id] = 0; return; }

      const { data: sessions } = await window._sb
        .from('program_sessions')
        .select('id, status')
        .eq('program_id', pid)
        .gte('date', sessStart)
        .lte('date', sessEnd);

      const sIds = (sessions || []).filter(s => s.status !== 2).map(s => s.id);
      sessionsByEnrollment[e.id] = sIds.length;

      if (!sIds.length) { attendanceByEnrollment[e.id] = 0; return; }

      const { data: att } = await window._sb
        .from('session_attendance')
        .select('id, is_present')
        .eq('customer_id', user.id)
        .in('session_id', sIds);

      attendanceByEnrollment[e.id] = (att || []).filter(a => a.is_present == 1).length;
    }));

    // completions filtered to school year range (up to today)
    const { data: allCompSessions } = await window._sb
      .from('program_sessions')
      .select('id')
      .gte('date', rangeStart)
      .lte('date', capEnd);

    const compSIds = (allCompSessions || []).map(s => s.id);
    let totalCompletions = 0;
    if (compSIds.length) {
      const { data: completionsData } = await window._sb
        .from('session_attendance')
        .select('id')
        .eq('customer_id', user.id)
        .eq('status_code', '2')
        .in('session_id', compSIds);
      totalCompletions = (completionsData || []).length;
    }

    return { enrollments, sessionsByEnrollment, attendanceByEnrollment, totalCompletions };
  }

  async function refresh() {
    renderYearSelector();
    document.getElementById('enrollments-grid').innerHTML = '<div class="skeleton h-40 rounded-2xl"></div><div class="skeleton h-40 rounded-2xl"></div>';
    document.getElementById('summary-section').innerHTML = '';

    const { enrollments, sessionsByEnrollment, attendanceByEnrollment, totalCompletions } = await loadData();
    renderEnrollments(enrollments, sessionsByEnrollment, attendanceByEnrollment);
    renderSummary(enrollments, sessionsByEnrollment, attendanceByEnrollment, totalCompletions);
  }

  function renderYearSelector() {
    const el = document.getElementById('year-selector');
    if (!el) return;
    const y = currentYear;
    el.innerHTML = `
      <button id="prev-year" class="px-3 py-1 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 text-sm">‹</button>
      <span class="font-semibold text-gray-700 text-sm">${showAll ? 'כל השנים' : `${y}–${y + 1}`}</span>
      <button id="next-year" class="px-3 py-1 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 text-sm">›</button>
      <button id="toggle-all" class="px-3 py-1 rounded-lg text-sm ${showAll ? 'bg-pink-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}">הכל</button>
    `;
    document.getElementById('prev-year').onclick = () => { currentYear--; showAll = false; refresh(); };
    document.getElementById('next-year').onclick = () => { currentYear++; showAll = false; refresh(); };
    document.getElementById('toggle-all').onclick = () => { showAll = !showAll; refresh(); };
  }

  function renderEnrollments(enrollments, sessionsByEnrollment, attendanceByEnrollment) {
    const grid = document.getElementById('enrollments-grid');
    if (!enrollments.length) {
      grid.innerHTML = '<p class="text-gray-400 text-sm text-center py-6 col-span-2">אין תוכניות לתקופה זו</p>';
      return;
    }

    grid.innerHTML = enrollments.map(e => {
      const p = e.programs;
      const pid = p?.id;
      const dayNum = parseInt(p?.day);
      const day = (!isNaN(dayNum) && dayNum >= 1 && dayNum <= 7) ? DAY_NAMES[dayNum - 1] : (p?.day ?? '');
      const time = p?.time ? p.time.slice(0, 5) : '';
      const attended = attendanceByEnrollment[e.id] ?? 0;
      const total    = sessionsByEnrollment[e.id] ?? 0;
      const name     = p?.name ?? '—';

      return `
        <div class="card p-5 space-y-3">
          <div class="flex items-start justify-between gap-2">
            <div>
              <div class="font-bold text-gray-800" style="font-size:1.1rem">${name}</div>
              <div class="text-gray-400 mt-0.5" style="font-size:.95rem">${day ? `יום ${day}` : ''}${time ? ` · ${time}` : ''}</div>
            </div>
            <button onclick="window._openAttModal(${pid}, ${e.id}, '${name.replace(/'/g,"\\'")}', '${e.start_date}', '${e.end_date}')"
              style="font-size:.95rem" class="text-pink-500 hover:underline whitespace-nowrap bg-none border-none cursor-pointer">צפייה בשיעורים ←</button>
          </div>
          <div class="text-gray-400" style="font-size:.95rem">${e.start_date ?? ''} – ${e.end_date ?? ''}</div>
          <div class="bg-pink-50 rounded-xl p-3">
            <div class="text-pink-600 font-semibold mb-1" style="font-size:.95rem">✅ נוכחות</div>
            <div class="text-gray-700" style="font-size:1rem">השתתפת ב־<strong>${attended}</strong> שיעורים מתוך <strong>${total}</strong></div>
          </div>
        </div>`;
    }).join('');
  }

  function renderSummary(enrollments, sessionsByEnrollment, attendanceByEnrollment, totalCompletions) {
    const el = document.getElementById('summary-section');
    if (!enrollments.length) { el.innerHTML = ''; return; }

    const T = Object.values(attendanceByEnrollment).reduce((a, b) => a + b, 0);
    const U = Object.values(sessionsByEnrollment).reduce((a, b) => a + b, 0);
    const Z = totalCompletions;
    const P = Math.max(0, U - T - Z);

    el.innerHTML = `
      <div class="card p-5">
        <div class="bg-purple-50 rounded-xl p-4 mb-4 flex items-center justify-between">
          <div>
            <div class="text-purple-600 font-semibold mb-1" style="font-size:.95rem">🔄 השלמות (כל התקופה)</div>
            <div class="text-gray-700" style="font-size:1rem">השלמת <strong>${Z}</strong> שיעורים</div>
          </div>
          <button onclick="window._openCompModal()"
            style="font-size:.95rem" class="text-purple-500 hover:underline whitespace-nowrap bg-none border-none cursor-pointer">צפייה ←</button>
        </div>
        <h2 class="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
          <i class="fas fa-chart-bar text-pink-500"></i> סיכום
        </h2>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          <div class="bg-pink-50 rounded-xl p-3">
            <div class="text-2xl font-bold text-pink-600">${T}</div>
            <div class="text-xs text-gray-500 mt-1">שיעורים שהיית בהם</div>
          </div>
          <div class="bg-gray-50 rounded-xl p-3">
            <div class="text-2xl font-bold text-gray-600">${U}</div>
            <div class="text-xs text-gray-500 mt-1">סה"כ שיעורים</div>
          </div>
          <div class="bg-purple-50 rounded-xl p-3">
            <div class="text-2xl font-bold text-purple-600">${Z}</div>
            <div class="text-xs text-gray-500 mt-1">השלמות</div>
          </div>
          <div class="bg-orange-50 rounded-xl p-3">
            <div class="text-2xl font-bold text-orange-500">${P}</div>
            <div class="text-xs text-gray-500 mt-1">נותרו להשלמה</div>
          </div>
        </div>
      </div>`;
  }

  window._printAtt = function(tableId, name, period, label) {
    const content = document.getElementById(tableId)?.outerHTML ?? '';
    const w = window.open('', '_blank');
    w.document.write(`<html dir="rtl"><head><title>${name}</title><style>body{font-family:Arial;direction:rtl;padding:20px;}h2,h3,p{margin:4px 0;}table{width:100%;border-collapse:collapse;margin-top:12px;}th,td{padding:8px;border-bottom:1px solid #eee;text-align:right;font-size:13px;}th{font-weight:600;color:#555;}</style></head><body><h2>${name}</h2><p>${label}</p><p>תקופה: ${period}</p>${content}</body></html>`);
    w.document.close();
    w.print();
  };

  window._downloadAtt = function(tableId, name, period, label) {
    const rows = document.querySelectorAll(`#${tableId} tbody tr`);
    const lines = [`"שם","${name}"`, `"${label}"`, `"תקופה","${period}"`, '', 'תאריך,יום,שעה'];
    rows.forEach(r => {
      const cells = [...r.querySelectorAll('td')].map(td => `"${td.textContent.trim()}"`);
      lines.push(cells.join(','));
    });
    const csv = '\uFEFF' + lines.join('\n');
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([csv], {type:'text/csv'})), download: `${name}-${label}.csv` });
    a.click();
  };

  window._openAttModal = openAttendanceModal;
  window._openCompModal = openCompletionsModal;

  await refresh();
})();
