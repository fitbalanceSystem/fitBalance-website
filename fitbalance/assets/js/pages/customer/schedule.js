(async () => {
  const profile = await window.authMiddleware.requireAuth();
  if (!profile) return;
  window.renderLayout('schedule');

  const user = window.storageUtil.load();
  const DAYS = ['ראשון','שני','שלישי','רביעי','חמישי','שישי'];
  let allClasses = [], myRegs = new Set();
  let activeDay = new Date().getDay();
  if (activeDay === 6) activeDay = 0;

  [allClasses, myRegs] = await Promise.all([
    window.attendanceService.getWeeklySchedule(),
    window.attendanceService.getMyRegistrations(user.id),
  ]);

  renderDayTabs();
  renderClasses(activeDay);

  function renderDayTabs() {
    const tabs = document.getElementById('day-tabs');
    tabs.innerHTML = DAYS.map((d, i) => `
      <button class="day-tab whitespace-nowrap px-5 py-2.5 rounded-xl text-sm font-semibold bg-white border-2 border-gray-100 text-gray-600 transition-all ${i === activeDay ? 'active' : ''}"
        data-day="${i}">יום ${d}</button>`).join('');
    tabs.querySelectorAll('.day-tab').forEach(btn =>
      btn.addEventListener('click', () => {
        activeDay = +btn.dataset.day;
        tabs.querySelectorAll('.day-tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderClasses(activeDay);
      })
    );
  }

  function renderClasses(day) {
    const grid  = document.getElementById('classes-grid');
    const empty = document.getElementById('empty-state');
    const filtered = allClasses.filter(c => c.day_of_week === day);

    if (!filtered.length) {
      grid.classList.add('hidden');
      empty.classList.remove('hidden');
      return;
    }
    grid.classList.remove('hidden');
    empty.classList.add('hidden');

    grid.innerHTML = filtered.map(c => {
      const reg = myRegs.has(c.id);
      return `
        <div class="class-card card p-5 ${reg ? 'registered' : ''}" data-id="${c.id}">
          <div class="flex items-start justify-between mb-3">
            <span class="text-3xl">${c.class_types?.emoji ?? '🏃'}</span>
            ${reg ? '<span class="badge bg-pink-100 text-pink-700 text-xs">רשומה ✓</span>' : ''}
          </div>
          <h3 class="font-bold text-gray-800 mb-1">${c.class_types?.name ?? 'שיעור'}</h3>
          <div class="text-sm text-gray-500 space-y-1 mb-4">
            <div><i class="fas fa-clock ml-1 text-xs"></i>${window.fmt.time(c.start_time)} – ${window.fmt.time(c.end_time)}</div>
            <div><i class="fas fa-user ml-1 text-xs"></i>${c.profiles?.full_name ?? 'מדריכה'}</div>
            <div><i class="fas fa-users ml-1 text-xs"></i>עד ${c.max_participants ?? '∞'} משתתפות</div>
          </div>
          <button class="reg-btn w-full py-2 rounded-xl text-sm font-semibold transition-all
            ${reg ? 'bg-red-50 text-red-500 hover:bg-red-100' : 'btn-primary'}">
            ${reg ? 'ביטול רישום' : 'הרשמה לשיעור'}
          </button>
        </div>`;
    }).join('');

    grid.querySelectorAll('.reg-btn').forEach(btn => {
      const card = btn.closest('[data-id]');
      btn.addEventListener('click', () => toggleReg(card.dataset.id, myRegs.has(card.dataset.id), btn));
    });
  }

  async function toggleReg(scheduleId, isReg, btn) {
    if (isReg) {
      const ok = await window.popup.confirm('לבטל את הרישום לשיעור?');
      if (!ok) return;
    }
    btn.disabled = true;
    btn.textContent = '...';
    try {
      if (isReg) {
        await window.attendanceService.cancelRegistration(user.id, scheduleId);
        myRegs.delete(scheduleId);
        window.popup.toast('הרישום בוטל');
      } else {
        await window.attendanceService.registerToClass(user.id, scheduleId);
        myRegs.add(scheduleId);
        window.popup.toast('נרשמת בהצלחה ✓');
      }
      renderClasses(activeDay);
    } catch (e) {
      window.popup.toast(e.message ?? 'שגיאה', 'error');
      btn.disabled = false;
      btn.textContent = isReg ? 'ביטול רישום' : 'הרשמה לשיעור';
    }
  }
})();
