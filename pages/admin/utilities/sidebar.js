(async function loadSidebar() {
  const placeholder = document.getElementById('sidebar-placeholder');
  if (!placeholder) return;

  // נתיב יחסי לתיקיית הקובץ הנוכחי
  const base = document.currentScript
    ? document.currentScript.src.replace(/\/[^\/]+$/, '')
    : new URL('utilities', location.href).href;

  try {
    const res = await fetch(base + '/../component/sidebar.html');
    if (!res.ok) throw new Error(res.status);
    const html = await res.text();
    document.body.insertAdjacentHTML('afterbegin', html);
    placeholder.remove();

    // התנתקות – חייב להירשם אחרי שה-HTML הוכנס
    const logoutBtn = document.getElementById('_admin_logout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        sessionStorage.removeItem('fb_user');
        window.location.href = '/login.html';
      });
    }

    // פעמון תזכורות - רץ אחרי שה-HTML נטען ו-_sb מוכן
    async function checkReminders() {
      if (!window._sb) return;
      const { data } = await window._sb.from('tasks')
        .select('due_date,due_time,reminder,reminder_minutes,status')
        .neq('status', 'done');
      if (!data) return;

      const now = new Date();
      let nearCount = 0, overdueCount = 0;

      data.forEach(task => {
        if (!task.due_date) return;
        const [y, mo, d] = task.due_date.split('-').map(Number);
        const dt = new Date(y, mo - 1, d);
        if (task.due_time) {
          const [h, m] = task.due_time.split(':').map(Number);
          dt.setHours(h, m, 0, 0);
        } else {
          dt.setHours(23, 59, 0, 0);
        }
        const diffMin = (dt - now) / 60000;
        if (diffMin < 0) overdueCount++;
        else if (task.reminder && diffMin <= (task.reminder_minutes ?? 30)) nearCount++;
      });

      const nearBadge    = document.getElementById('_bell_near');
      const overdueBadge  = document.getElementById('_bell_overdue');
      if (!nearBadge || !overdueBadge) return;

      if (nearCount > 0) {
        nearBadge.textContent = nearCount;
        nearBadge.className = 'bell-badge near';
      } else {
        nearBadge.textContent = '';
        nearBadge.className = 'bell-badge';
      }
      if (overdueCount > 0) {
        overdueBadge.textContent = overdueCount;
        overdueBadge.className = 'bell-badge overdue';
      } else {
        overdueBadge.textContent = '';
        overdueBadge.className = 'bell-badge';
      }
    }

    // המתן ל-_sb ואז הפעל
    function waitAndCheck() {
      if (window._sb) { checkReminders(); setInterval(checkReminders, 60000); }
      else setTimeout(waitAndCheck, 200);
    }
    waitAndCheck();
  } catch (e) {
    console.error('sidebar load failed:', e);
    placeholder.remove();
  }
})();
