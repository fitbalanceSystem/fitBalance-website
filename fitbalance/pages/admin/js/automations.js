const { createClient } = supabase;
const db = createClient(
  'https://bmrtobuvjuycnvvfmgvf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJtcnRvYnV2anV5Y252dmZtZ3ZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA1ODQ5MDUsImV4cCI6MjA2NjE2MDkwNX0.VhoKIR_nb6lyu_05CEsVT8G_c90chKTX8v__5QA-A-s'
);

// הצגת toast
function showToast(msg, color = '#1f2937') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.style.background = color;
  t.classList.remove('hidden');
  setTimeout(() => t.classList.add('hidden'), 3500);
}

// טעינת לוגים
async function loadLogs() {
  const tbody = document.getElementById('logsBody');
  tbody.innerHTML = '<tr><td colspan="6" class="text-center p-4 text-gray-400">טוען...</td></tr>';

  const monthVal = document.getElementById('filterMonth').value;

  let query = db.from('automation_logs')
    .select('*, instructors(firstName, lastName)')
    .eq('automation_type', 'salary_summary')
    .order('created_at', { ascending: false })
    .limit(100);

  if (monthVal) query = query.eq('month', monthVal);

  const { data, error } = await query;

  if (error) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center p-4 text-red-500">הטבלה לא קיימת עדיין — הרץ את האוטומציה פעם ראשונה</td></tr>`;
    document.getElementById('logsKpi').innerHTML = '';
    return;
  }

  if (!data?.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center p-4 text-gray-400">אין הרצות עדיין</td></tr>';
    document.getElementById('logsKpi').innerHTML = '';
    return;
  }

  const sent = data.filter(r => r.status === 'sent').length;
  const errors = data.filter(r => r.status === 'error').length;
  const totalAmount = data.filter(r => r.status === 'sent').reduce((s, r) => s + (r.total_amount || 0), 0);

  document.getElementById('logsKpi').innerHTML =
    kpiCard('מיילים שנשלחו', sent, '#16a34a') +
    kpiCard('שגיאות', errors, errors > 0 ? '#dc2626' : '#9ca3af') +
    kpiCard('סה"כ שכר שנשלח', totalAmount.toLocaleString() + ' ₪', '#7c3aed');

  tbody.innerHTML = data.map(r => `
    <tr class="hover:bg-gray-50">
      <td class="p-3 border text-gray-500 text-xs">${r.created_at ? new Date(r.created_at).toLocaleString('he-IL') : ''}</td>
      <td class="p-3 border">${r.month || ''}</td>
      <td class="p-3 border">${r.instructors ? r.instructors.firstName + ' ' + r.instructors.lastName : '—'}</td>
      <td class="p-3 border text-center font-bold">${r.sessions_count || 0}</td>
      <td class="p-3 border text-green-700 font-bold">${r.total_amount ? r.total_amount.toLocaleString() + ' ₪' : '—'}</td>
      <td class="p-3 border text-center">
        ${r.status === 'sent'
          ? '<span class="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-medium">✓ נשלח</span>'
          : `<span class="bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs font-medium" title="${r.error_message || ''}">✗ שגיאה</span>`}
      </td>
    </tr>`).join('');
}

// הרצה ידנית — פותחת GitHub Actions
function triggerManual() {
  const confirmed = confirm('להריץ את האוטומציה עכשיו?\n\nהפעולה תפתח את GitHub Actions להרצה ידנית.');
  if (!confirmed) return;
  window.open('https://github.com/YOUR_USERNAME/YOUR_REPO/actions/workflows/salary-summary.yml', '_blank');
  showToast('נפתח GitHub Actions — לחצי על "Run workflow"', '#2563eb');
}

function kpiCard(label, value, color) {
  return `<div class="bg-white border rounded-xl p-4" style="border-right:4px solid ${color}">
    <p class="text-gray-500 text-sm">${label}</p>
    <p class="text-2xl font-bold mt-1" style="color:${color}">${value}</p>
  </div>`;
}

// אתחול
document.addEventListener('DOMContentLoaded', () => {
  const now = new Date();
  document.getElementById('filterMonth').value =
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  loadLogs();
});
