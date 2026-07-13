(async () => {
  const user = window.authMiddleware.requireAuth();
  if (!user) return;
  window.renderEmployeeLayout('profile');

  // Fill header
  const initials = window.helpers.getInitials(user.full_name);
  document.getElementById('avatar-initials').textContent = initials;

  function clearSkeleton(id, value) {
    const el = document.getElementById(id);
    el.classList.remove('skeleton', 'h-7', 'w-40', 'h-4', 'w-32', 'h-6', 'w-28', 'mb-2');
    el.textContent = value;
  }

  clearSkeleton('emp-name', user.full_name ?? '-');
  clearSkeleton('emp-role', user.role ?? 'מדריך/ה');
  clearSkeleton('emp-badge', user.user_name ? `@${user.user_name}` : '');

  // Fill details
  document.getElementById('f-fullname').textContent = user.full_name ?? '-';
  document.getElementById('f-username').textContent = user.user_name ?? '-';
  document.getElementById('f-email').textContent    = user.email ?? '-';
  document.getElementById('f-phone').textContent    = user.phone ?? '-';
  document.getElementById('f-role').textContent     = user.role ?? '-';

  // Load my classes from schedule
  const { data: classes, error } = await window._sb
    .from('schedule')
    .select('*, class_types(name, emoji)')
    .eq('instructor_id', user.id)
    .eq('active', true)
    .order('day_of_week')
    .order('start_time');

  const DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
  const list = document.getElementById('my-classes');

  if (error || !classes?.length) {
    list.innerHTML = '<p class="text-gray-400 text-sm text-center py-6">אין שיעורים משויכים</p>';
    return;
  }

  list.innerHTML = classes.map(c => `
    <div style="display:flex;align-items:center;gap:12px;padding:12px 16px;background:#f8f7ff;border-radius:12px;border:1px solid #ede9fe">
      <span style="font-size:22px">${c.class_types?.emoji ?? '🏃'}</span>
      <div style="flex:1">
        <div style="font-size:14px;font-weight:600;color:#1f2937">${c.class_types?.name ?? 'שיעור'}</div>
        <div style="font-size:12px;color:#9ca3af">יום ${DAYS[c.day_of_week] ?? ''} | ${window.fmt.time(c.start_time)} - ${window.fmt.time(c.end_time)}</div>
      </div>
    </div>`).join('');
})();
