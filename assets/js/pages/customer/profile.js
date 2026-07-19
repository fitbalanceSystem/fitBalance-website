(async () => {
  const authUser = await window.authMiddleware.requireAuth();
  if (!authUser) return;
  window.renderLayout('profile');

  function clearSkeleton(id, value) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove('skeleton','h-7','w-40','h-6','w-36','h-4','w-48','h-8','w-10','mb-1','mb-2');
    el.textContent = value ?? '—';
  }

  const user = window.storageUtil.load();
  if (!user) return;

  try {
    const [data, enrollments, nextSession] = await Promise.all([
      window.customerService.getProfile(user.email),
      (async () => {
        const today = new Date().toISOString().split('T')[0];
        const yr = (new Date().getMonth() + 1) >= 9 ? new Date().getFullYear() : new Date().getFullYear() - 1;
        const rangeStart = `${yr}-09-01`;
        const rangeEnd   = `${yr + 1}-08-31`;
        const capEnd     = today < rangeEnd ? today : rangeEnd;
        const { data: enr } = await window._sb
          .from('program_enrollments')
          .select('id, start_date, end_date, programs!fk_enrollments_program(id)')
          .eq('customer_id', user.id)
          .lte('start_date', rangeEnd)
          .or(`end_date.gte.${rangeStart},end_date.is.null`)
          .order('start_date', { ascending: true });
        console.log('[profile] enrollments:', enr);
        if (!enr?.length) return { attended: 0, total: 0, completions: 0 };
        let total = 0, attended = 0;
        const allSIds = [];
        await Promise.all(enr.map(async e => {
          const pid = e.programs?.id;
          if (!pid) return;
          const sessEnd = capEnd < (e.end_date ?? capEnd) ? capEnd : (e.end_date ?? capEnd);
          console.log(`[enroll ${e.id}] pid=${pid} start=${e.start_date} end=${e.end_date} sessEnd=${sessEnd}`);
          if (sessEnd < e.start_date) { console.log(`[enroll ${e.id}] SKIPPED`); return; }
          const { data: sessions } = await window._sb
            .from('program_sessions').select('id, status')
            .eq('program_id', pid).gte('date', e.start_date).lte('date', sessEnd);
          const sIds = (sessions || []).filter(s => s.status !== 2).map(s => s.id);
          console.log(`[enroll ${e.id}] sessions total=${sessions?.length} active=${sIds.length}`);
          total += sIds.length;
          allSIds.push(...sIds);
          if (!sIds.length) return;
          const { data: att } = await window._sb
            .from('session_attendance').select('id, is_present')
            .eq('customer_id', user.id).in('session_id', sIds);
          const presentCount = (att || []).filter(a => a.is_present == 1).length;
          console.log(`[enroll ${e.id}] att=${att?.length} present=${presentCount}`);
          attended += presentCount;
        }));
        let completions = 0;
        const { data: compSessions } = await window._sb
          .from('program_sessions').select('id')
          .gte('date', rangeStart).lte('date', capEnd);
        const compSIds = (compSessions || []).map(s => s.id);
        console.log(`[completions] rangeStart=${rangeStart} capEnd=${capEnd} compSessions=${compSIds.length}`);
        if (compSIds.length) {
          const { data: compData } = await window._sb
            .from('session_attendance').select('id')
            .eq('customer_id', user.id).eq('status_code', '2').in('session_id', compSIds);
          completions = (compData || []).length;
        }
        console.log(`[profile] FINAL total=${total} attended=${attended} completions=${completions} left=${total-attended-completions}`);
        return { attended, total, completions };
      })(),
      (async () => {
        const today = new Date().toISOString().split('T')[0];
        const { data: enr } = await window._sb
          .from('program_enrollments')
          .select('programs!fk_enrollments_program(id, name, time)')
          .eq('customer_id', user.id)
          .lte('start_date', today)
          .or(`end_date.gte.${today},end_date.is.null`);
        if (!enr?.length) return null;
        const pIds = enr.map(e => e.programs?.id).filter(Boolean);
        const { data: sessions } = await window._sb
          .from('program_sessions').select('id, date, time, program_id, programs(name)')
          .in('program_id', pIds)
          .gte('date', today)
          .neq('status', 2)
          .order('date').order('time').limit(1);
        const s = sessions?.[0];
        if (!s) return null;
        const DAY_NAMES = ['ראשון','שני','שלישי','רביעי','חמישי','שישי','שבת'];
        const dayName = DAY_NAMES[new Date(s.date).getDay()];
        return `${s.programs?.name ?? ''}\nיום ${dayName} ${s.date}\n${s.time ? s.time.slice(0,5) : ''}`;
      })(),
    ]);

    const sessLeft = Math.max(0, enrollments.total - enrollments.attended - enrollments.completions);

    const fullName = `${data.firstName ?? ''} ${data.lastName ?? ''}`.trim();
    document.getElementById('avatar-initials').textContent = window.helpers.getInitials(fullName);

    clearSkeleton('profile-name', fullName);
    clearSkeleton('profile-email', data.email);

    const planBadge = document.getElementById('plan-badge');
    planBadge.classList.remove('skeleton','h-6','w-24');
    planBadge.textContent = data.next_goal ? `🎯 ${data.next_goal}` : 'אין מטרה מוגדרת';

    const since = document.getElementById('member-since');
    since.classList.remove('skeleton','h-6','w-28');
    since.textContent = `חברה מ-${window.fmt.date(data.created_at)}`;

    clearSkeleton('stat-left', sessLeft);

    const nextEl = document.getElementById('stat-next');
    nextEl.classList.remove('skeleton','h-8','w-16');
    nextEl.style.whiteSpace = 'pre-line';
    nextEl.textContent = nextSession ?? 'אין שיעור קרוב';

    const goalEl = document.getElementById('stat-goal');
    goalEl.classList.remove('skeleton','h-8','w-16');
    goalEl.textContent = data.next_goal ?? '—';

    document.getElementById('f-firstName').textContent = data.firstName ?? '—';
    document.getElementById('f-lastName').textContent  = data.lastName  ?? '—';
    document.getElementById('f-mobile').textContent    = data.mobile    ?? '—';
    document.getElementById('f-email').textContent     = data.email     ?? '—';
    document.getElementById('f-birthDate').textContent = data.birthDate ? window.fmt.date(data.birthDate) : '—';
    document.getElementById('f-city').textContent      = data.city      ?? '—';
    document.getElementById('f-street').textContent    = data.street    ?? '—';
    document.getElementById('f-houseNo').textContent   = data.houseNo   ?? '—';

    const recent = await window.attendanceService.getMyAttendance(user.id, 5);
    const list = document.getElementById('recent-list');
    list.innerHTML = recent.length
      ? recent.map(r => `
          <div class="attendance-row">
            <span style="font-size:22px;flex-shrink:0">${r.schedule?.class_types?.emoji ?? '🏃'}</span>
            <div style="flex:1;min-width:0">
              <div style="font-size:13px;font-weight:600;color:#1f2937">${r.schedule?.class_types?.name ?? 'שיעור'}</div>
              <div style="font-size:11px;color:#9ca3af;margin-top:2px">${window.fmt.date(r.attended_at)}${r.attended_time ? ' · ' + r.attended_time : ''}</div>
            </div>
            <span class="badge" style="background:#dcfce7;color:#16a34a;flex-shrink:0">✓ נכחתי</span>
          </div>`).join('')
      : '<p style="text-align:center;color:#9ca3af;font-size:13px;padding:24px 0">עדיין לא השתתפת בשיעורים</p>';

  } catch (err) {
    console.error('Profile load error:', err);
  }
})();
