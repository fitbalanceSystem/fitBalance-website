const db = window._sb;

// ===== Toast =====
function showToast(msg, color = '#1f2937') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.style.background = color;
  t.style.display = 'block';
  setTimeout(() => t.style.display = 'none', 3500);
}

function kpiCard(label, value, color) {
  return `<div style="background:white;border:1px solid #f3f0ff;border-right:4px solid ${color};border-radius:12px;padding:14px 18px;box-shadow:0 2px 8px rgba(139,92,246,.06);">
    <div style="font-size:11px;color:#9ca3af;margin-bottom:4px;">${label}</div>
    <div style="font-size:22px;font-weight:800;color:${color};">${value}</div>
  </div>`;
}

// ===== אוטומציה 1: שכר מדריכות =====
async function loadSalaryLogs() {
  const tbody = document.getElementById('logsBody');
  tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:20px;color:#9ca3af;">טוען...</td></tr>';

  const monthVal = document.getElementById('filterMonth').value;
  let query = db.from('automation_logs')
    .select('*, instructors(firstName, lastName)')
    .eq('automation_type', 'salary_summary')
    .order('created_at', { ascending: false })
    .limit(100);
  if (monthVal) query = query.eq('month', monthVal);

  const { data, error } = await query;

  if (error) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:20px;color:#ef4444;">הטבלה לא קיימת עדיין — הרץ את האוטומציה פעם ראשונה</td></tr>`;
    document.getElementById('salaryKpi').innerHTML = '';
    return;
  }

  if (!data?.length) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:20px;color:#9ca3af;">אין הרצות עדיין</td></tr>';
    document.getElementById('salaryKpi').innerHTML = '';
    return;
  }

  const sent   = data.filter(r => r.status === 'sent').length;
  const errors = data.filter(r => r.status === 'error').length;
  const total  = data.filter(r => r.status === 'sent').reduce((s, r) => s + (r.total_amount || 0), 0);

  document.getElementById('salaryKpi').innerHTML =
    kpiCard('מיילים שנשלחו', sent, '#16a34a') +
    kpiCard('שגיאות', errors, errors > 0 ? '#dc2626' : '#9ca3af') +
    kpiCard('סה"כ שכר', total.toLocaleString() + ' ₪', '#7c3aed');

  tbody.innerHTML = data.map(r => `
    <tr style="border-bottom:1px solid #f3f0ff;">
      <td style="padding:10px 16px;color:#6b7280;font-size:12px;">${r.created_at ? new Date(r.created_at).toLocaleString('he-IL') : ''}</td>
      <td style="padding:10px 16px;">${r.month || ''}</td>
      <td style="padding:10px 16px;">${r.instructors ? r.instructors.firstName + ' ' + r.instructors.lastName : '—'}</td>
      <td style="padding:10px 16px;text-align:center;font-weight:700;">${r.sessions_count || 0}</td>
      <td style="padding:10px 16px;color:#16a34a;font-weight:700;">${r.total_amount ? r.total_amount.toLocaleString() + ' ₪' : '—'}</td>
      <td style="padding:10px 16px;text-align:center;">
        ${r.status === 'sent'
          ? '<span style="background:#d1fae5;color:#065f46;padding:3px 10px;border-radius:999px;font-size:11px;font-weight:700;">✓ נשלח</span>'
          : `<span style="background:#fee2e2;color:#dc2626;padding:3px 10px;border-radius:999px;font-size:11px;font-weight:700;" title="${r.error_message || ''}">✗ שגיאה</span>`}
      </td>
    </tr>`).join('');
}

function triggerSalary() {
  if (!confirm('להריץ את אוטומציית השכר עכשיו?')) return;
  window.open('https://github.com/YOUR_USERNAME/YOUR_REPO/actions/workflows/salary-summary.yml', '_blank');
  showToast('נפתח GitHub Actions — לחצי על "Run workflow"', '#2563eb');
}

// ===== אוטומציה 2: לקוחה לא מגיעה 3 שבועות =====
async function runAbsenceCheck() {
  const btn = document.getElementById('btnAbsence');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> בודק...';

  try {
    const results = await findAbsentCustomers();
    await renderAbsenceResults(results);
    showToast(`נמצאו ${results.length} לקוחות להתראה`, results.length > 0 ? '#d97706' : '#16a34a');
  } catch(e) {
    console.error(e);
    showToast('שגיאה בהרצת האוטומציה: ' + e.message, '#dc2626');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-play"></i> הרץ עכשיו';
  }
}

async function findAbsentCustomers() {
  // שלוף את כל המפגשים מ-3 השבועות האחרונים
  const today = new Date();
  const threeWeeksAgo = new Date(today);
  threeWeeksAgo.setDate(today.getDate() - 21);
  const dateFrom = threeWeeksAgo.toISOString().split('T')[0];
  const dateTo   = today.toISOString().split('T')[0];

  // שלוף מפגשים בטווח
  const { data: sessions, error: sErr } = await db
    .from('program_sessions')
    .select('id, date, program_id, programs(name)')
    .gte('date', dateFrom)
    .lte('date', dateTo);
  if (sErr) throw sErr;
  if (!sessions?.length) return [];

  const sessionIds = sessions.map(s => s.id);

  // שלוף נוכחויות של כל הלקוחות במפגשים האלה
  const { data: attendance, error: aErr } = await db
    .from('session_attendance')
    .select('customer_id, session_id, is_present')
    .in('session_id', sessionIds);
  if (aErr) throw aErr;

  // קבץ לפי לקוחה + תוכנית
  const map = {}; // key: customer_id|program_id
  for (const att of (attendance || [])) {
    const session = sessions.find(s => s.id === att.session_id);
    if (!session) continue;
    const key = `${att.customer_id}|${session.program_id}`;
    if (!map[key]) map[key] = { customer_id: att.customer_id, program_id: session.program_id, programName: session.programs?.name || '', sessions: [] };
    map[key].sessions.push({ date: session.date, is_present: att.is_present });
  }

  // סנן: רק מי שיש לו לפחות 3 מפגשים ו-0 נוכחויות
  const absentKeys = Object.values(map).filter(entry => {
    if (entry.sessions.length < 3) return false;
    return entry.sessions.every(s => !s.is_present);
  });

  if (!absentKeys.length) return [];

  // שלוף פרטי לקוחות
  const customerIds = [...new Set(absentKeys.map(e => e.customer_id))];
  const { data: customers, error: cErr } = await db
    .from('customers')
    .select('id, firstName, lastName, email, mobile')
    .in('id', customerIds);
  if (cErr) throw cErr;

  const custMap = Object.fromEntries((customers || []).map(c => [c.id, c]));

  return absentKeys.map(entry => ({
    ...entry,
    customer: custMap[entry.customer_id] || {},
    weeksAbsent: Math.floor(entry.sessions.length)
  }));
}

async function renderAbsenceResults(results) {
  document.getElementById('absenceResult').style.display = 'block';

  const withEmail    = results.filter(r => r.customer.email);
  const withoutEmail = results.filter(r => !r.customer.email);

  document.getElementById('absenceKpi').innerHTML =
    kpiCard('לקוחות נעדרות', results.length, '#d97706') +
    kpiCard('עם מייל (יישלח)', withEmail.length, '#7c3aed') +
    kpiCard('ללא מייל', withoutEmail.length, '#9ca3af');

  const tbody = document.getElementById('absenceBody');

  if (!results.length) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:20px;color:#9ca3af;">אין לקוחות נעדרות — הכל תקין ✓</td></tr>';
    return;
  }

  tbody.innerHTML = results.map((r, i) => {
    const c = r.customer;
    const name = [c.firstName, c.lastName].filter(Boolean).join(' ') || '—';
    const hasEmail = !!c.email;
    return `<tr style="border-bottom:1px solid #f3f0ff;">
      <td style="padding:10px 16px;font-weight:600;">${name}</td>
      <td style="padding:10px 16px;color:#7c3aed;">${c.mobile || '—'}</td>
      <td style="padding:10px 16px;color:#374151;">${r.programName}</td>
      <td style="padding:10px 16px;text-align:center;">
        <span style="background:#fef3c7;color:#d97706;padding:3px 10px;border-radius:999px;font-size:11px;font-weight:700;">${r.weeksAbsent} מפגשים</span>
      </td>
      <td style="padding:10px 16px;font-size:12px;color:#6b7280;">${c.email || '<span style="color:#ef4444;">אין מייל</span>'}</td>
      <td style="padding:10px 16px;text-align:center;">
        ${hasEmail
          ? `<button onclick="sendAbsenceEmail(${i})" data-idx="${i}"
               style="background:linear-gradient(135deg,#ec4899,#8b5cf6);color:white;border:none;border-radius:8px;padding:5px 12px;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;">
               <i class="fas fa-envelope"></i> שלח מייל
             </button>`
          : '<span style="color:#9ca3af;font-size:12px;">—</span>'}
      </td>
    </tr>`;
  }).join('');

  // שמור תוצאות גלובלית לשימוש בשליחה
  window._absenceResults = results;
}

async function sendAbsenceEmail(idx) {
  const r = window._absenceResults?.[idx];
  if (!r?.customer?.email) return;

  const c = r.customer;
  const name = c.firstName || 'לקוחה יקרה';

  // שמירת לוג ב-Supabase
  const { error } = await db.from('automation_logs').insert([{
    automation_type: 'absence_alert',
    customer_id:     c.id,
    status:          'sent',
    meta:            JSON.stringify({ program: r.programName, weeks: r.weeksAbsent }),
    created_at:      new Date().toISOString()
  }]);

  if (error) {
    // אם הטבלה לא תומכת בשדות — עדיין נמשיך
    console.warn('log error:', error);
  }

  // פתיחת mailto (בסביבת production יש להחליף ב-Edge Function / EmailJS)
  const subject = encodeURIComponent('מתגעגעים אלייך בחוג! 💗');
  const body = encodeURIComponent(
    `שלום ${name},\n\nשמנו לב שלא ראינו אותך בחוג "${r.programName}" כבר כמה שבועות.\n` +
    `אנחנו מתגעגעים ורוצים לוודא שהכל בסדר 💗\n\n` +
    `אם יש משהו שנוכל לעזור בו, אנחנו כאן!\n\nבאהבה,\nצוות FitBalance`
  );
  window.open(`mailto:${c.email}?subject=${subject}&body=${body}`, '_blank');

  // עדכון כפתור
  const btn = document.querySelector(`button[data-idx="${idx}"]`);
  if (btn) {
    btn.textContent = '✓ נשלח';
    btn.style.background = '#d1fae5';
    btn.style.color = '#065f46';
    btn.disabled = true;
  }

  showToast(`מייל נשלח ל-${name}`, '#16a34a');
}
window.sendAbsenceEmail = sendAbsenceEmail;

// ===== אתחול =====
document.addEventListener('DOMContentLoaded', () => {
  const now = new Date();
  document.getElementById('filterMonth').value =
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  loadSalaryLogs();
});
