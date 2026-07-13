(async () => {
  const profile = await window.authMiddleware.requireAuth();
  if (!profile) return;
  window.renderLayout('plans');

  const user = window.storageUtil.load();

  const [activePlan, attendance, plans] = await Promise.all([
    window.customerService.getActivePlan(user.id),
    window.attendanceService.getMyAttendance(user.id, 60),
    window.customerService.getAvailablePlans(),
  ]);

  renderActivePlan(activePlan);
  renderHeatmap(attendance);
  renderAttendanceList(attendance);
  renderPlans(plans, activePlan);

  function renderActivePlan(plan) {
    const el = document.getElementById('active-plan');
    if (!plan) {
      el.innerHTML = `<div class="text-center py-8 text-gray-400"><div class="text-4xl mb-2">📋</div><p>אין תוכנית פעילה כרגע</p></div>`;
      return;
    }
    const p = plan.plans;
    const used = p.sessions_total - (plan.sessions_left ?? 0);
    const pct  = p.sessions_total ? Math.round((used / p.sessions_total) * 100) : 0;
    el.innerHTML = `
      <div class="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div class="flex-1">
          <div class="flex items-center gap-2 mb-1">
            <span class="text-xl font-bold text-gray-800">${p.name}</span>
            <span class="badge bg-green-100 text-green-700">פעילה</span>
          </div>
          <div class="text-sm text-gray-500 mb-3">
            תוקף עד: <strong>${window.fmt.date(plan.expires_at)}</strong>
            ${p.sessions_total ? ` · שיעורים: <strong>${used}/${p.sessions_total}</strong>` : ' · ללא הגבלה'}
          </div>
          ${p.sessions_total ? `<div class="progress-bar w-full max-w-xs"><div class="progress-fill" style="width:${pct}%"></div></div><div class="text-xs text-gray-400 mt-1">${pct}% נוצל</div>` : ''}
        </div>
        <div class="text-left">
          <div class="text-3xl font-bold gradient-text">${plan.sessions_left ?? '∞'}</div>
          <div class="text-xs text-gray-400">שיעורים נותרו</div>
        </div>
      </div>`;
  }

  function renderHeatmap(attendance) {
    const now   = new Date();
    const year  = now.getFullYear();
    const month = now.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay    = new Date(year, month, 1).getDay();

    const attended = new Set(
      attendance
        .filter(r => { const d = new Date(r.attended_at); return d.getMonth() === month && d.getFullYear() === year; })
        .map(r => new Date(r.attended_at).getDate())
    );

    const labels = ['א','ב','ג','ד','ה','ו'].map(d => `<div class="text-center text-xs text-gray-400 font-medium">${d}</div>`).join('');
    const blanks = Array(firstDay).fill('<div></div>').join('');
    const cells  = Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      const isToday  = day === now.getDate();
      const wasHere  = attended.has(day);
      return `<div class="aspect-square rounded-lg flex items-center justify-center text-xs font-medium
        ${wasHere ? 'bg-pink-500 text-white' : isToday ? 'bg-purple-100 text-purple-700 font-bold' : 'bg-gray-100 text-gray-400'}">${day}</div>`;
    }).join('');

    document.getElementById('heatmap').innerHTML = labels + blanks + cells;
  }

  function renderAttendanceList(attendance) {
    document.getElementById('attendance-count').textContent = `${attendance.length} שיעורים`;
    const list = document.getElementById('attendance-list');
    list.innerHTML = attendance.length
      ? attendance.slice(0, 20).map(r => `
          <div class="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
            <span class="text-2xl">${r.schedule?.class_types?.emoji ?? '🏃'}</span>
            <div class="flex-1">
              <div class="font-medium text-gray-800 text-sm">${r.schedule?.class_types?.name ?? 'שיעור'}</div>
              <div class="text-xs text-gray-400">${window.fmt.dateTime(r.attended_at)}</div>
            </div>
            <span class="badge bg-green-100 text-green-700">✓</span>
          </div>`).join('')
      : '<p class="text-gray-400 text-sm text-center py-6">אין היסטוריית נוכחות</p>';
  }

  function renderPlans(plans, activePlan) {
    const grid = document.getElementById('plans-grid');
    grid.innerHTML = plans.map((p, i) => `
      <div class="plan-card card p-5 text-center ${i === 1 ? 'recommended' : ''}">
        <div class="text-3xl mb-2">${p.emoji ?? '💪'}</div>
        <h3 class="font-bold text-gray-800 text-lg mb-1">${p.name}</h3>
        <div class="text-3xl font-bold gradient-text mb-1">${window.fmt.currency(p.price)}</div>
        <div class="text-xs text-gray-400 mb-3">${p.sessions_total ? `${p.sessions_total} שיעורים` : 'ללא הגבלה'} · ${p.duration_days} ימים</div>
        <ul class="text-sm text-gray-500 space-y-1 mb-4 text-right">
          ${(p.features ?? []).map(f => `<li class="flex items-center gap-1"><i class="fas fa-check text-pink-500 text-xs"></i>${f}</li>`).join('')}
        </ul>
        <button class="btn-primary w-full text-sm ${activePlan?.plans?.id === p.id ? 'opacity-50 cursor-not-allowed' : ''}"
          ${activePlan?.plans?.id === p.id ? 'disabled' : ''}>
          ${activePlan?.plans?.id === p.id ? 'תוכנית נוכחית' : 'בחירה'}
        </button>
      </div>`).join('');

    grid.querySelectorAll('button:not([disabled])').forEach(btn =>
      btn.addEventListener('click', () => window.popup.toast('ליצירת קשר לרכישת תוכנית: 052-717-3841', 'info'))
    );
  }
})();
