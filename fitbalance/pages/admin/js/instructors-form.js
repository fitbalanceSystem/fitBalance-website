const { createClient } = supabase;
const supabaseUrl = 'https://bmrtobuvjuycnvvfmgvf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJtcnRvYnV2anV5Y252dmZtZ3ZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA1ODQ5MDUsImV4cCI6MjA2NjE2MDkwNX0.VhoKIR_nb6lyu_05CEsVT8G_c90chKTX8v__5QA-A-s';
const db = createClient(supabaseUrl, supabaseKey);

const params = new URLSearchParams(window.location.search);
const instructorId = parseInt(params.get('id'), 10) || null;

// ===== אתחול =====
document.addEventListener('DOMContentLoaded', async () => {
  const now = new Date();
  const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  document.getElementById('attendanceMonth').value = monthStr;
  document.getElementById('salaryMonth').value = monthStr;

  if (instructorId) {
    const { data, error } = await db.from('instructors').select('*').eq('id', instructorId).single();
    if (error) { alert('שגיאה בטעינה: ' + error.message); return; }
    fillForm(data);
    await Promise.all([loadPrograms(), loadInvoices()]);
  }

  document.getElementById('saveBtn').addEventListener('click', async e => {
    e.preventDefault();
    await saveInstructor();
  });
  document.getElementById('cancelBtn').addEventListener('click', e => {
    e.preventDefault();
    window.location.href = 'instructors.html';
  });
});

function fillForm(data) {
  document.getElementById('formTitle').textContent = `${data.firstName || ''} ${data.lastName || ''}`;
  document.getElementById('idNumber').value = data.idValue || '';
  document.getElementById('firstName').value = data.firstName || '';
  document.getElementById('lastName').value = data.lastName || '';
  document.getElementById('mobile').value = data.mobile || '';
  document.getElementById('email').value = data.email || '';
  document.getElementById('birthDate').value = data.birthDate || '';
  document.getElementById('address').value = data.address || '';
  document.getElementById('salaryPerSession').value = data.salary_per_session ?? '';
  document.getElementById('bankAccount').value = data.bank_account || '';
  document.getElementById('bankBranch').value = data.bank_branch || '';
  document.getElementById('bankName').value = data.bank_name || '';
  document.getElementById('isActive').checked = data.is_active !== false;
  document.getElementById('chkForm').checked = !!data.chk_form;
  document.getElementById('chkWhatsapp').checked = !!data.chk_whatsapp;
  document.getElementById('chkEmail').checked = !!data.chk_email;
}

// ===== שמירה =====
async function saveInstructor() {
  const saveStatus = document.getElementById('saveStatus');
  saveStatus.style.display = 'inline';
  saveStatus.textContent = '⏳ שומר...';

  const salary = document.getElementById('salaryPerSession').value;
  const record = {
    ...(instructorId ? { id: instructorId } : {}),
    idValue: document.getElementById('idNumber').value.trim() || null,
    firstName: document.getElementById('firstName').value.trim() || null,
    lastName: document.getElementById('lastName').value.trim() || null,
    mobile: document.getElementById('mobile').value.trim() || null,
    email: document.getElementById('email').value.trim() || null,
    birthDate: document.getElementById('birthDate').value || null,
    address: document.getElementById('address').value.trim() || null,
    salary_per_session: salary !== '' ? parseFloat(salary) : null,
    bank_account: document.getElementById('bankAccount').value.trim() || null,
    bank_branch: document.getElementById('bankBranch').value.trim() || null,
    bank_name: document.getElementById('bankName').value.trim() || null,
    is_active: document.getElementById('isActive').checked,
    chk_form: document.getElementById('chkForm').checked,
    chk_whatsapp: document.getElementById('chkWhatsapp').checked,
    chk_email: document.getElementById('chkEmail').checked,
  };

  const { error } = await db.from('instructors').upsert([record]);
  if (error) {
    alert('שגיאה בשמירה: ' + error.message);
    saveStatus.style.display = 'none';
    return;
  }
  saveStatus.textContent = '✅ נשמר בהצלחה';
  setTimeout(() => { window.location.href = 'instructors.html'; }, 900);
}

// ===== טאב 2: תוכניות =====
async function loadPrograms() {
  const tbody = document.getElementById('instructorProgramsBody');
  if (!instructorId) { tbody.innerHTML = '<tr><td colspan="5" class="text-center p-4 text-gray-400">שמרי קודם</td></tr>'; return; }
  const { data } = await db.from('programs')
    .select('name, day, time, start_date, end_date')
    .eq('instructor_code', instructorId)
    .order('start_date', { ascending: false });
  if (!data?.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="text-center p-4 text-gray-400">אין תוכניות משויכות</td></tr>';
    return;
  }
  tbody.innerHTML = data.map(p => `
    <tr class="hover:bg-gray-50">
      <td class="p-3 border">${p.name || ''}</td>
      <td class="p-3 border">${p.day || ''}</td>
      <td class="p-3 border">${p.time || ''}</td>
      <td class="p-3 border">${p.start_date || ''}</td>
      <td class="p-3 border">${p.end_date || ''}</td>
    </tr>`).join('');
}

// ===== טאב 3: נוכחות =====
window.loadAttendance = async function () {
  if (!instructorId) return;
  const monthVal = document.getElementById('attendanceMonth').value;
  if (!monthVal) return;
  const [y, m] = monthVal.split('-');
  const fromDate = `${y}-${m}-01`;
  const toDate = `${y}-${m}-${new Date(y, m, 0).getDate()}`;
  const today = new Date().toISOString().split('T')[0];
  const effectiveTo = toDate < today ? toDate : today;
  const tbody = document.getElementById('attendanceBody');
  tbody.innerHTML = '<tr><td colspan="5" class="text-center p-4 text-gray-400">טוען...</td></tr>';

  const [{ data: sessions }, { data: instData }] = await Promise.all([
    db.from('program_sessions')
      .select('id, date, time, program_id, programs!inner(name)')
      .eq('instructor_code', instructorId)
      .gte('date', fromDate).lte('date', effectiveTo)
      .or('status.is.null,status.neq.2')
      .order('date'),
    db.from('instructors').select('salary_per_session').eq('id', instructorId).single(),
  ]);

  const rate = instData?.salary_per_session || 0;

  if (!sessions?.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="text-center p-4 text-gray-400">אין מפגשים בחודש זה</td></tr>';
    document.getElementById('attendanceKpi').innerHTML = '';
    return;
  }

  const sessionIds = sessions.map(s => s.id);
  let attendanceMap = {};
  const { data: att } = await db.from('session_attendance')
    .select('session_id, is_present').in('session_id', sessionIds);
  (att || []).forEach(a => {
    if (!attendanceMap[a.session_id]) attendanceMap[a.session_id] = { present: 0, total: 0 };
    attendanceMap[a.session_id].total++;
    if (a.is_present) attendanceMap[a.session_id].present++;
  });

  tbody.innerHTML = '';
  let totalSessions = sessions.length;
  let totalEarned = rate * totalSessions;

  sessions.forEach(s => {
    const att = attendanceMap[s.id] || { present: 0, total: 0 };
    tbody.innerHTML += `<tr class="hover:bg-gray-50">
      <td class="p-3 border">${s.date || ''}</td>
      <td class="p-3 border">${s.programs?.name || ''}</td>
      <td class="p-3 border">${(s.time || '').slice(0, 5)}</td>
      <td class="p-3 border text-center">
        <span class="text-green-600 font-bold">${att.present}</span>
        <span class="text-gray-400 text-xs"> / ${att.total}</span>
      </td>
      <td class="p-3 border font-bold text-green-700">${rate ? rate + ' ₪' : '—'}</td>
    </tr>`;
  });

  document.getElementById('attendanceKpi').innerHTML =
    kpiCard('מפגשים שהתקיימו', totalSessions, '#2563eb') +
    kpiCard('שכר מגיע', totalEarned.toLocaleString() + ' ₪', '#16a34a') +
    kpiCard('שכר למפגש', rate ? rate + ' ₪' : 'לא הוגדר', '#7c3aed');
};

// ===== טאב 4: משכורות =====
window.loadSalary = async function () {
  if (!instructorId) return;
  const monthVal = document.getElementById('salaryMonth').value;
  if (!monthVal) return;
  const [y, m] = monthVal.split('-');
  const fromDate = `${y}-${m}-01`;
  const toDate = `${y}-${m}-${new Date(y, m, 0).getDate()}`;
  const today = new Date().toISOString().split('T')[0];
  const effectiveTo = toDate < today ? toDate : today;
  const tbody = document.getElementById('salaryBody');
  tbody.innerHTML = '<tr><td colspan="7" class="text-center p-4 text-gray-400">טוען...</td></tr>';

  const [{ data: sessions }, { data: instData }, { data: payments }] = await Promise.all([
    db.from('program_sessions')
      .select('id')
      .eq('instructor_code', instructorId)
      .gte('date', fromDate)
      .lte('date', effectiveTo)
      .or('status.is.null,status.neq.2'),
    db.from('instructors').select('salary_per_session').eq('id', instructorId).single(),
    db.from('instructor_payments')
      .select('*')
      .eq('instructor_id', instructorId)
      .eq('salary_month', monthVal),
  ]);

  const rate = instData?.salary_per_session || 0;
  const sessionCount = sessions?.length || 0;

  const due = rate * sessionCount;
  const paid = (payments || []).reduce((s, p) => s + (p.amount || 0), 0);
  const balance = due - paid;

  tbody.innerHTML = `<tr class="hover:bg-gray-50">
    <td class="p-3 border font-medium">${monthVal}</td>
    <td class="p-3 border text-center">${sessionCount}</td>
    <td class="p-3 border font-bold text-blue-700">${due.toLocaleString()} ₪</td>
    <td class="p-3 border font-bold text-green-700">${paid.toLocaleString()} ₪</td>
    <td class="p-3 border font-bold ${balance > 0 ? 'text-red-600' : 'text-gray-400'}">${balance > 0 ? balance.toLocaleString() + ' ₪' : '✓ שולם'}</td>
    <td class="p-3 border">${(payments || []).map(p => p.payment_date || '').join(', ') || '—'}</td>
    <td class="p-3 border text-gray-500">${(payments || []).map(p => p.note || '').filter(Boolean).join(', ') || ''}</td>
  </tr>`;

  document.getElementById('salaryKpi').innerHTML =
    kpiCard('מפגשים שהתקיימו', sessionCount, '#2563eb') +
    kpiCard('שכר מגיע', due.toLocaleString() + ' ₪', '#16a34a') +
    kpiCard('יתרה לתשלום', balance > 0 ? balance.toLocaleString() + ' ₪' : '✓ שולם', balance > 0 ? '#dc2626' : '#16a34a');
};

window.addSalaryPayment = function () {
  const monthVal = document.getElementById('salaryMonth').value;
  document.getElementById('spMonth').value = monthVal;
  document.getElementById('spDate').value = new Date().toISOString().split('T')[0];
  document.getElementById('spAmount').value = '';
  document.getElementById('spNote').value = '';
  document.getElementById('salaryPayModal').classList.remove('hidden');
};

window.closeSalaryModal = function () {
  document.getElementById('salaryPayModal').classList.add('hidden');
};

window.confirmSalaryPayment = async function () {
  const amount = parseFloat(document.getElementById('spAmount').value);
  if (!amount || amount <= 0) { alert('הכניסי סכום תקין'); return; }
  const { error } = await db.from('instructor_payments').insert([{
    instructor_id: instructorId,
    salary_month: document.getElementById('spMonth').value,
    amount,
    payment_date: document.getElementById('spDate').value || null,
    note: document.getElementById('spNote').value.trim() || null,
  }]);
  if (error) { alert('שגיאה: ' + error.message); return; }
  closeSalaryModal();
  await loadSalary();
};

// ===== טאב 5: חשבוניות =====
async function loadInvoices() {
  if (!instructorId) return;
  const tbody = document.getElementById('invoicesBody');
  const { data, error } = await db.from('instructor_invoices')
    .select('*')
    .eq('instructor_id', instructorId)
    .order('invoice_date', { ascending: false });
  if (error) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center p-4 text-gray-400">הטבלה לא קיימת עדיין</td></tr>';
    return;
  }
  if (!data?.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center p-4 text-gray-400">אין חשבוניות</td></tr>';
    return;
  }
  tbody.innerHTML = data.map(inv => `
    <tr class="hover:bg-gray-50">
      <td class="p-3 border">${inv.invoice_date || ''}</td>
      <td class="p-3 border">${inv.invoice_number || ''}</td>
      <td class="p-3 border font-bold text-purple-700">${inv.amount ? inv.amount + ' ₪' : '—'}</td>
      <td class="p-3 border">${inv.salary_month || ''}</td>
      <td class="p-3 border text-gray-500">${inv.note || ''}</td>
      <td class="p-3 border">
        <button onclick="deleteInvoice(${inv.id})" class="text-red-500 hover:text-red-700">
          <i class="fas fa-trash-alt"></i>
        </button>
      </td>
    </tr>`).join('');
}

window.addInvoice = function () {
  document.getElementById('invDate').value = new Date().toISOString().split('T')[0];
  document.getElementById('invNumber').value = '';
  document.getElementById('invAmount').value = '';
  document.getElementById('invMonth').value = document.getElementById('salaryMonth')?.value || '';
  document.getElementById('invNote').value = '';
  document.getElementById('invoiceModal').classList.remove('hidden');
};

window.closeInvoiceModal = function () {
  document.getElementById('invoiceModal').classList.add('hidden');
};

window.confirmInvoice = async function () {
  const amount = parseFloat(document.getElementById('invAmount').value);
  if (!amount || amount <= 0) { alert('הכניסי סכום תקין'); return; }
  const { error } = await db.from('instructor_invoices').insert([{
    instructor_id: instructorId,
    invoice_date: document.getElementById('invDate').value || null,
    invoice_number: document.getElementById('invNumber').value.trim() || null,
    amount,
    salary_month: document.getElementById('invMonth').value || null,
    note: document.getElementById('invNote').value.trim() || null,
  }]);
  if (error) { alert('שגיאה: ' + error.message); return; }
  closeInvoiceModal();
  await loadInvoices();
};

window.deleteInvoice = async function (id) {
  if (!confirm('למחוק חשבונית זו?')) return;
  const { error } = await db.from('instructor_invoices').delete().eq('id', id);
  if (error) { alert('שגיאה: ' + error.message); return; }
  await loadInvoices();
};

// ===== ייצוא נוכחות לתמונה =====
window.exportAttendanceImage = async function () {
  const monthVal = document.getElementById('attendanceMonth').value;
  const instructorName = document.getElementById('formTitle').textContent.trim();
  const kpi = document.getElementById('attendanceKpi');
  const table = document.getElementById('attendanceBody').closest('table');

  if (!kpi.innerHTML) { alert('טעני נתונים קודם'); return; }

  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'background:#fff;padding:24px 28px;font-family:Heebo,sans-serif;direction:rtl;width:700px;';
  wrapper.innerHTML = `
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;border-bottom:2px solid #e5e7eb;padding-bottom:12px;">
      <img src="images/logo.png" style="height:48px;" />
      <div>
        <div style="font-size:20px;font-weight:700;color:#1e293b;">${instructorName}</div>
        <div style="font-size:14px;color:#64748b;">דוח נוכחות – ${monthVal}</div>
      </div>
    </div>
    ${kpi.outerHTML}
    <div style="margin-top:16px;">${table.outerHTML}</div>
  `;

  document.body.appendChild(wrapper);
  const canvas = await html2canvas(wrapper, { scale: 2, useCORS: true });
  document.body.removeChild(wrapper);

  const link = document.createElement('a');
  link.download = `נוכחות_${instructorName}_${monthVal}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
};

// ===== עזר =====
function kpiCard(label, value, color) {
  return `<div class="bg-white border rounded-xl p-4" style="border-right:4px solid ${color}">
    <p class="text-gray-500 text-sm">${label}</p>
    <p class="text-2xl font-bold mt-1" style="color:${color}">${value}</p>
  </div>`;
}
