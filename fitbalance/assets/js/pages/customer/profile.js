(async () => {
  const authUser = await window.authMiddleware.requireAuth();
  if (!authUser) return;
  window.renderLayout('profile');

  const user = window.storageUtil.load();

  const [data, plan, stats, recent] = await Promise.all([
    window.customerService.getProfile(user.email),
    window.customerService.getActivePlan(user.id),
    window.attendanceService.getAttendanceStats(user.id),
    window.attendanceService.getMyAttendance(user.id, 5),
  ]);

  // Avatar – customers table has no avatar, use initials
  const fullName = `${data.firstName} ${data.lastName}`;
  document.getElementById('avatar-initials').textContent = window.helpers.getInitials(fullName);

  clearSkeleton('profile-name', fullName);
  clearSkeleton('profile-email', data.email);

  const planBadge = document.getElementById('plan-badge');
  planBadge.classList.remove('skeleton', 'h-6', 'w-24');
  planBadge.textContent = plan ? `✦ ${plan.plans.name}` : 'אין תוכנית פעילה';

  const since = document.getElementById('member-since');
  since.classList.remove('skeleton', 'h-6', 'w-28');
  since.textContent = `חברה מ-${window.fmt.date(data.created_at)}`;

  clearSkeleton('stat-total', stats.total);
  clearSkeleton('stat-month', stats.thisMonth);
  clearSkeleton('stat-left', plan ? (plan.sessions_left ?? '∞') : '-');

  // Fill display fields
  document.getElementById('f-firstName').textContent = data.firstName ?? '-';
  document.getElementById('f-lastName').textContent  = data.lastName ?? '-';
  document.getElementById('f-mobile').textContent    = data.mobile ?? '-';
  document.getElementById('f-email').textContent     = data.email ?? '-';
  document.getElementById('f-birthDate').textContent = data.birthDate ? window.fmt.date(data.birthDate) : '-';
  document.getElementById('f-city').textContent      = data.city ?? '-';
  document.getElementById('f-street').textContent    = data.street ?? '-';
  document.getElementById('f-houseNo').textContent   = data.houseNo ?? '-';

  const list = document.getElementById('recent-list');
  list.innerHTML = recent.length
    ? recent.map(r => `
        <div class="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
          <span class="text-2xl">${r.schedule?.class_types?.emoji ?? '🏃'}</span>
          <div class="flex-1">
            <div class="font-medium text-gray-800 text-sm">${r.schedule?.class_types?.name ?? 'שיעור'}</div>
            <div class="text-xs text-gray-400">${window.fmt.dateTime(r.attended_at)}</div>
          </div>
          <span class="badge bg-green-100 text-green-700">✓ נכחתי</span>
        </div>`).join('')
    : '<p class="text-gray-400 text-sm text-center py-6">עדיין לא השתתפת בשיעורים</p>';

  function clearSkeleton(id, value) {
    const el = document.getElementById(id);
    el.classList.remove('skeleton', 'h-7', 'w-40', 'h-4', 'w-52', 'h-9', 'w-12', 'mb-2');
    el.textContent = value;
  }

})();
