const { createClient } = supabase;
const supabaseUrl = 'https://bmrtobuvjuycnvvfmgvf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJtcnRvYnV2anV5Y252dmZtZ3ZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA1ODQ5MDUsImV4cCI6MjA2NjE2MDkwNX0.VhoKIR_nb6lyu_05CEsVT8G_c90chKTX8v__5QA-A-s';
const db = createClient(supabaseUrl, supabaseKey);

const STATUS_LABELS = {
  active: '✓ פעילה', future: '📅 שיבוץ עתידי', trial_set: 'נקבע ניסיון',
  missing_assignment: 'חסר שיבוץ', expired: 'פג תוקף', interested: 'מתעניינת',
  frozen: 'בהקפאה', left: 'פרשה', not_interested: 'לא מעוניינת',
};
const METHOD_LABELS = {
  cash: 'מזומן', transfer: 'העברה בנקאית', bit: 'ביט',
  paybox: 'פייבוקס', standing_order: 'הוראת קבע עירייה',
};

function showReport(name, btn) {
  document.querySelectorAll('.report-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('report-' + name).classList.add('active');
  btn.classList.add('active');
}

function kpiCard(label, value, color) {
  return `<div class="kpi-card bg-white border rounded-xl p-4" style="border-right-color:${color}">
    <p class="text-gray-500 text-sm">${label}</p>
    <p class="text-2xl font-bold mt-1" style="color:${color}">${value}</p>
  </div>`;
}

function calcMonths(s, e) {
  if (!s || !e) return 0;
  const start = new Date(s), end = new Date(e);
  return Math.max(0, (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1);
}

function calcStatus(cust, enrollments, trials, trialAttendance) {
  const today = new Date(); today.setHours(0,0,0,0);
  if (['frozen','left','not_interested'].includes(cust.status_code)) return cust.status_code;
  const custEn = enrollments.filter(e => e.customer_id === cust.id);
  if (custEn.some(e => { const s=new Date(e.start_date),en=new Date(e.end_date); return s<=today&&en>=today; })) return 'active';
  if (custEn.some(e => e.start_date && new Date(e.start_date) > today)) return 'future';
  // trials = רשומות session_attendance עם status_code=3
  const custTrials = trials.filter(t => t.customer_id === cust.id);
  if (custTrials.length) return trialAttendance.some(a => a.customer_id === cust.id) ? 'missing_assignment' : 'trial_set';
  return custEn.some(e => e.end_date && new Date(e.end_date) < today) ? 'expired' : 'interested';
}

function exportExcel(tableId, fileName) {
  const table = document.getElementById(tableId);
  if (!table) return;
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.table_to_sheet(table);
  XLSX.utils.book_append_sheet(wb, ws, fileName);
  XLSX.writeFile(wb, `${fileName}_${new Date().toISOString().split('T')[0]}.xlsx`);
}

// ===== דוח 1: סטטוס =====
async function loadStatusReport() {
  const tbody = document.getElementById('statusBody');
  const [{ data: customers }, { data: enrollments }, { data: trials }] = await Promise.all([
    db.from('customers').select('id, status_code'),
    db.from('program_enrollments').select('customer_id, start_date, end_date'),
    db.from('session_attendance').select('customer_id, session_id, is_present').eq('status_code', 3),
  ]);
  // trialAttendance = ניסיונות שהגיעו בפועל
  const ta = (trials||[]).filter(t => t.is_present === true);
  const counts = {};
  (customers||[]).forEach(c => { const s = calcStatus(c, enrollments||[], trials||[], ta); counts[s]=(counts[s]||0)+1; });
  const total = customers?.length || 0;
  tbody.innerHTML = '';
  ['active','future','trial_set','missing_assignment','expired','interested','frozen','left','not_interested'].forEach(key => {
    if (!counts[key]) return;
    tbody.innerHTML += `<tr class="hover:bg-gray-50">
      <td class="p-3 border">${STATUS_LABELS[key]}</td>
      <td class="p-3 border font-bold">${counts[key]}</td>
      <td class="p-3 border">${total ? Math.round(counts[key]/total*100) : 0}%</td>
    </tr>`;
  });
  document.getElementById('statusKpi').innerHTML =
    kpiCard('סה"כ לקוחות', total, '#374151') +
    kpiCard('פעילות', counts['active']||0, '#16a34a') +
    kpiCard('שיבוץ עתידי', counts['future']||0, '#0077cc') +
    kpiCard('פג תוקף', counts['expired']||0, '#f97316');
}

// ===== דוח 2: חובות =====
async function loadDebtReport() {
  const tbody = document.getElementById('debtBody');
  const [{ data: customers }, { data: enrollments }, { data: payments }] = await Promise.all([
    db.from('customers').select('id, firstName, lastName, mobile'),
    db.from('program_enrollments').select('id, customer_id, start_date, end_date, programs!fk_enrollments_program(name, price)'),
    db.from('payments').select('enrollment_id, amount, method'),
  ]);
  const rows = [];
  (enrollments||[]).forEach(en => {
    const price = en.programs?.price ?? 0;
    const totalDue = price * calcMonths(en.start_date, en.end_date);
    const enPay = (payments||[]).filter(p => p.enrollment_id === en.id);
    if (enPay.some(p => p.method === 'standing_order')) return;
    const paid = enPay.reduce((s,p) => s+(p.amount||0), 0);
    const debt = totalDue - paid;
    if (debt <= 0) return;
    const cust = (customers||[]).find(c => c.id === en.customer_id);
    if (cust) rows.push({ cust, en, totalDue, paid, debt });
  });
  rows.sort((a,b) => b.debt - a.debt);
  tbody.innerHTML = '';
  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center p-4 text-green-600 font-bold">🎉 אין חובות!</td></tr>';
  } else {
    rows.forEach(r => {
      tbody.innerHTML += `<tr class="hover:bg-gray-50">
        <td class="p-3 border"><a href="customer-form.html?id=${r.cust.id}" class="text-blue-600 hover:underline">${r.cust.firstName} ${r.cust.lastName}</a></td>
        <td class="p-3 border">${r.cust.mobile||''}</td>
        <td class="p-3 border">${r.en.programs?.name||''}</td>
        <td class="p-3 border">${r.totalDue} ₪</td>
        <td class="p-3 border">${r.paid} ₪</td>
        <td class="p-3 border font-bold text-red-600">${r.debt} ₪</td>
      </tr>`;
    });
  }
  const totalDebt = rows.reduce((s,r) => s+r.debt, 0);
  document.getElementById('debtKpi').innerHTML =
    kpiCard('לקוחות עם חוב', rows.length, '#dc2626') +
    kpiCard('סה"כ חוב', totalDebt.toLocaleString()+' ₪', '#dc2626') +
    kpiCard('ממוצע חוב', rows.length ? Math.round(totalDebt/rows.length).toLocaleString()+' ₪' : '0 ₪', '#f97316');
}

// ===== דוח 3: תוכניות =====
async function loadProgramsReport() {
  const tbody = document.getElementById('programsBody');
  const [{ data: programs }, { data: enrollments }] = await Promise.all([
    db.from('programs').select('id, name, day, time, start_date, end_date, price').order('start_date', { ascending: false }),
    db.from('program_enrollments').select('program_id'),
  ]);
  tbody.innerHTML = '';
  (programs||[]).forEach(p => {
    const count = (enrollments||[]).filter(e => e.program_id === p.id).length;
    const expected = (p.price||0) * count;
    tbody.innerHTML += `<tr class="hover:bg-gray-50">
      <td class="p-3 border font-medium">${p.name||''}</td>
      <td class="p-3 border">${p.day||''}</td>
      <td class="p-3 border">${p.time||''}</td>
      <td class="p-3 border">${p.start_date||''}</td>
      <td class="p-3 border">${p.end_date||''}</td>
      <td class="p-3 border">${p.price ? p.price+' ₪' : '-'}</td>
      <td class="p-3 border font-bold text-blue-700">${count}</td>
      <td class="p-3 border font-bold text-green-700">${expected ? expected.toLocaleString()+' ₪' : '-'}</td>
    </tr>`;
  });
}

// ===== דוח 4: תשלומים =====
async function loadPaymentsReport() {
  const tbody = document.getElementById('paymentsBody');
  tbody.innerHTML = '<tr><td colspan="6" class="text-center p-4 text-gray-400">טוען...</td></tr>';
  const monthVal = document.getElementById('paymentMonth').value;
  let query = db.from('payments').select(`
    payment_date, amount, method, note,
    program_enrollments!inner(
      customers!inner(firstName, lastName),
      programs!fk_enrollments_program(name)
    )
  `).order('payment_date', { ascending: false });
  if (monthVal) {
    const [y,m] = monthVal.split('-');
    query = query.gte('payment_date', `${y}-${m}-01`).lte('payment_date', `${y}-${m}-${new Date(y,m,0).getDate()}`);
  }
  const { data: payments, error } = await query;
  if (error) { tbody.innerHTML = `<tr><td colspan="6" class="text-center p-4 text-red-500">שגיאה</td></tr>`; return; }
  tbody.innerHTML = '';
  if (!payments?.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center p-4 text-gray-400">אין תשלומים</td></tr>';
    document.getElementById('paymentsKpi').innerHTML = '';
    return;
  }
  payments.forEach(p => {
    const en = p.program_enrollments;
    tbody.innerHTML += `<tr class="hover:bg-gray-50">
      <td class="p-3 border">${p.payment_date||''}</td>
      <td class="p-3 border">${en?.customers ? en.customers.firstName+' '+en.customers.lastName : ''}</td>
      <td class="p-3 border">${en?.programs?.name||''}</td>
      <td class="p-3 border font-bold text-green-700">${p.amount} ₪</td>
      <td class="p-3 border">${METHOD_LABELS[p.method]||p.method||''}</td>
      <td class="p-3 border text-gray-500">${p.note||''}</td>
    </tr>`;
  });
  const total = payments.reduce((s,p) => s+(p.amount||0), 0);
  const byMethod = {};
  payments.forEach(p => { byMethod[p.method] = (byMethod[p.method]||0)+(p.amount||0); });
  let kpi = kpiCard('סה"כ', total.toLocaleString()+' ₪', '#16a34a') + kpiCard('עסקאות', payments.length, '#2563eb');
  Object.entries(byMethod).forEach(([m,v]) => { kpi += kpiCard(METHOD_LABELS[m]||m, v.toLocaleString()+' ₪', '#7c3aed'); });
  document.getElementById('paymentsKpi').innerHTML = kpi;
}

// ===== דוח 5: ניסיונות =====
async function loadTrialsReport() {
  const tbody = document.getElementById('trialsBody');
  const { data: trials, error } = await db.from('session_attendance')
    .select(`
      customer_id, session_id, is_present,
      customers!inner(id, firstName, lastName, mobile, status_code),
      program_sessions!inner(date, time, programs(name))
    `)
    .eq('status_code', 3)
    .order('session_id', { ascending: false });
  if (error) { tbody.innerHTML = '<tr><td colspan="6" class="text-center p-4 text-red-500">שגיאה בטעינת ניסיונות</td></tr>'; return; }
  const custIds = [...new Set((trials||[]).map(t => t.customer_id))];
  let enrollments = [];
  if (custIds.length) {
    const { data } = await db.from('program_enrollments').select('customer_id, start_date, end_date').in('customer_id', custIds);
    enrollments = data || [];
  }
  tbody.innerHTML = '';
  let came=0, notCame=0, registered=0;
  (trials||[]).forEach(t => {
    const cust = t.customers, sess = t.program_sessions;
    const didCome = t.is_present === true;
    if (didCome) came++; else notCame++;
    const today = new Date(); today.setHours(0,0,0,0);
    const isActive = enrollments.some(e => e.customer_id===t.customer_id && new Date(e.start_date)<=today && new Date(e.end_date)>=today);
    if (isActive) registered++;
    const statusHtml = ['frozen','left','not_interested'].includes(cust?.status_code)
      ? STATUS_LABELS[cust.status_code]
      : isActive ? '<span class="text-green-600 font-bold">✓ נרשמה</span>'
      : '<span class="text-orange-500">לא נרשמה</span>';
    tbody.innerHTML += `<tr class="hover:bg-gray-50">
      <td class="p-3 border"><a href="customer-form.html?id=${cust?.id}" class="text-blue-600 hover:underline">${cust?.firstName||''} ${cust?.lastName||''}</a></td>
      <td class="p-3 border">${cust?.mobile||''}</td>
      <td class="p-3 border">${sess?.programs?.name||''}</td>
      <td class="p-3 border">${sess?.date||''}</td>
      <td class="p-3 border">${didCome ? '<span class="text-green-600 font-bold">✓ הגיעה</span>' : '<span class="text-red-500">לא הגיעה</span>'}</td>
      <td class="p-3 border">${statusHtml}</td>
    </tr>`;
  });
  document.getElementById('trialsKpi').innerHTML =
    kpiCard('סה"כ ניסיונות', (trials||[]).length, '#2563eb') +
    kpiCard('הגיעו', came, '#16a34a') +
    kpiCard('נרשמו אחרי', registered, '#7c3aed');
}

// ===== דוח 6: שכר מדריכה =====
async function loadSalaryReport() {
  const tbody = document.getElementById('salaryBody');
  const COLS = 5;
  tbody.innerHTML = `<tr><td colspan="${COLS}" class="text-center p-4 text-gray-400">טוען...</td></tr>`;

  const monthVal = document.getElementById('salaryMonth').value;
  const filterInstructorId = document.getElementById('salaryInstructor').value;

  if (!monthVal) {
    tbody.innerHTML = `<tr><td colspan="${COLS}" class="text-center p-4 text-gray-400">בחרי חודש</td></tr>`;
    return;
  }

  const [y, m] = monthVal.split('-');
  const fromDate = `${y}-${m}-01`;
  const toDate   = `${y}-${m}-${new Date(y, m, 0).getDate()}`;
  const today    = new Date().toISOString().split('T')[0];
  const effectiveTo = toDate < today ? toDate : today;

  // שולפים רק מפגשים פעילים (status != 2) בטווח התאריכים
  const [{ data: sessions, error }, { data: instructors }] = await Promise.all([
    db.from('program_sessions')
  .select('id, date, instructor_code')
  .gte('date', fromDate)
  .lte('date', effectiveTo)
  .or('status.is.null,status.neq.2'),
    db.from('instructors')
      .select('id, firstName, lastName, salary_per_session'),
  ]);

  console.log("sessions");
  console.log(sessions);
  if (error) {
    tbody.innerHTML = `<tr><td colspan="${COLS}" class="text-center p-4 text-red-500">שגיאה: ${error.message}</td></tr>`;
    return;
  }

  const instMap = {};
  (instructors || []).forEach(i => { instMap[i.id] = i; });

  // קיבוץ לפי מדריכה
  const grouped = {};
  (sessions || []).forEach(s => {
    if (!s.instructor_code) return;
    if (filterInstructorId && String(s.instructor_code) !== filterInstructorId) return;
    const inst = instMap[s.instructor_code];
    if (!inst) return;
    if (!grouped[inst.id]) grouped[inst.id] = { inst, count: 0 };
    grouped[inst.id].count++;
  });

  tbody.innerHTML = '';
  const rows = Object.values(grouped);

  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="${COLS}" class="text-center p-4 text-gray-400">אין נתונים לחודש זה</td></tr>`;
    document.getElementById('salaryKpi').innerHTML = '';
    return;
  }

  rows.sort((a, b) => (a.inst.lastName || '').localeCompare(b.inst.lastName || '', 'he'));

  let totalSalary = 0, totalSessions = 0;

  rows.forEach(r => {
    const rate  = r.inst.salary_per_session || 0;
    const total = rate * r.count;
    totalSalary  += total;
    totalSessions += r.count;
    tbody.innerHTML += `<tr class="hover:bg-gray-50">
      <td class="p-3 border font-medium">${r.inst.firstName || ''} ${r.inst.lastName || ''}</td>
      <td class="p-3 border text-center font-bold">${r.count}</td>
      <td class="p-3 border">${rate ? rate + ' ₪' : '<span class="text-gray-400">לא הוגדר</span>'}</td>
      <td class="p-3 border font-bold text-green-700">${total ? total.toLocaleString() + ' ₪' : '-'}</td>
      <td class="p-3 border"><a href="instructor-form.html?id=${r.inst.id}" class="text-blue-600 hover:underline text-sm">פירוט</a></td>
    </tr>`;
  });

  tbody.innerHTML += `<tr class="bg-gray-100 font-bold">
    <td class="p-3 border">סה"כ</td>
    <td class="p-3 border text-center">${totalSessions}</td>
    <td class="p-3 border"></td>
    <td class="p-3 border text-green-700">${totalSalary.toLocaleString()} ₪</td>
    <td class="p-3 border"></td>
  </tr>`;

  document.getElementById('salaryKpi').innerHTML =
    kpiCard('סה"כ שכר', totalSalary.toLocaleString() + ' ₪', '#16a34a') +
    kpiCard('סה"כ מפגשים', totalSessions, '#2563eb') +
    kpiCard('מדריכות', rows.length, '#7c3aed');
}

// ===== דוח 7: נוכחות מפגשים =====
async function loadAttendanceReport() {
  const tbody = document.getElementById('attendanceBody');
  tbody.innerHTML = '<tr><td colspan="6" class="text-center p-4 text-gray-400">טוען...</td></tr>';
  const monthVal = document.getElementById('attendanceMonth').value;
  const instructorId = document.getElementById('attendanceInstructor').value;
  if (!monthVal) { tbody.innerHTML = '<tr><td colspan="6" class="text-center p-4 text-gray-400">בחרי חודש</td></tr>'; return; }
  const [y, m] = monthVal.split('-');
  const fromDate = `${y}-${m}-01`;
  const toDate = `${y}-${m}-${new Date(y, m, 0).getDate()}`;
  const today = new Date().toISOString().split('T')[0];
  const effectiveTo = toDate < today ? toDate : today;

  const [{ data: sessions, error }, { data: instructors }] = await Promise.all([
    db.from('program_sessions')
      .select('id, date, time, program_id, programs!inner(name, instructor_code)')
      .gte('date', fromDate).lte('date', effectiveTo)
      .order('date', { ascending: true }),
    db.from('instructors').select('id, firstName, lastName'),
  ]);
  if (error) { tbody.innerHTML = `<tr><td colspan="6" class="text-center p-4 text-red-500">שגיאה</td></tr>`; return; }

  const sessionIds = (sessions||[]).map(s => s.id);
  let attendance = [];
  if (sessionIds.length) {
    const { data } = await db.from('session_attendance')
      .select('session_id, is_present')
      .in('session_id', sessionIds);
    attendance = data || [];
  }

  const instMap = {};
  (instructors||[]).forEach(i => { instMap[i.id] = i; });

  tbody.innerHTML = '';
  let totalSessions = 0, totalPresent = 0, totalRegistered = 0;

  const filtered = (sessions||[]).filter(s => {
    if (!instructorId) return true;
    return String(s.programs?.instructor_code) === instructorId;
  });

  if (!filtered.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center p-4 text-gray-400">אין מפגשים</td></tr>';
    document.getElementById('attendanceKpi').innerHTML = '';
    return;
  }

  filtered.forEach(s => {
    const inst = s.programs?.instructor_code ? instMap[s.programs.instructor_code] : null;
    const instName = inst ? `${inst.firstName||''} ${inst.lastName||''}` : '-';
    const sessAtt = attendance.filter(a => a.session_id === s.id);
    const registered = sessAtt.length;
    const present = sessAtt.filter(a => a.is_present).length;
    const pct = registered ? Math.round(present/registered*100) : 0;
    totalSessions++;
    totalPresent += present;
    totalRegistered += registered;
    tbody.innerHTML += `<tr class="hover:bg-gray-50">
      <td class="p-3 border">${s.date}</td>
      <td class="p-3 border font-medium">${s.programs?.name||''}</td>
      <td class="p-3 border">${instName}</td>
      <td class="p-3 border text-center">${registered}</td>
      <td class="p-3 border text-center font-bold text-green-700">${present}</td>
      <td class="p-3 border text-center ${ pct < 50 ? 'text-red-500' : pct < 75 ? 'text-orange-500' : 'text-green-600'} font-bold">${registered ? pct+'%' : '-'}</td>
    </tr>`;
  });

  const avgPct = totalRegistered ? Math.round(totalPresent/totalRegistered*100) : 0;
  document.getElementById('attendanceKpi').innerHTML =
    kpiCard('מפגשים', totalSessions, '#2563eb') +
    kpiCard('סה"כ הגיעו', totalPresent, '#16a34a') +
    kpiCard('ממוצע נוכחות', avgPct+'%', avgPct < 60 ? '#dc2626' : '#16a34a');
}

// ===== דוח 8: הנהלה =====
async function loadManagementReport() {
  const tbody = document.getElementById('mgmtBody');
  tbody.innerHTML = '<tr><td colspan="7" class="text-center p-4 text-gray-400">טוען...</td></tr>';
  const monthVal = document.getElementById('mgmtMonth').value;
  if (!monthVal) { tbody.innerHTML = '<tr><td colspan="7" class="text-center p-4 text-gray-400">בחרי חודש</td></tr>'; return; }
  const [y, m] = monthVal.split('-');
  const fromDate = `${y}-${m}-01`;
  const toDate = `${y}-${m}-${new Date(y, m, 0).getDate()}`;

  const [{ data: enrollments }, { data: payments }] = await Promise.all([
    db.from('program_enrollments').select(`
      id, customer_id, start_date, end_date,
      customers!inner(id, firstName, lastName, mobile),
      programs!fk_enrollments_program(name, price)
    `),
    db.from('payments').select('enrollment_id, amount, method'),
  ]);

  // לקוחות פעילות בחודש זה = enrollment חופף לחודש
  const activeEnrollments = (enrollments||[]).filter(en => {
    if (!en.start_date || !en.end_date) return false;
    const s = new Date(en.start_date), e = new Date(en.end_date);
    const mFrom = new Date(fromDate), mTo = new Date(toDate);
    return s <= mTo && e >= mFrom;
  });

  tbody.innerHTML = '';
  let totalIncome = 0, totalDebt = 0;
  const activeCustomerIds = new Set();

  activeEnrollments.forEach(en => {
    activeCustomerIds.add(en.customer_id);
    const price = en.programs?.price ?? 0;
    const months = calcMonths(en.start_date, en.end_date);
    const totalDue = price * months;
    const enPay = (payments||[]).filter(p => p.enrollment_id === en.id);
    const hasStanding = enPay.some(p => p.method === 'standing_order');
    const paid = enPay.reduce((s,p) => s+(p.amount||0), 0);
    const debt = hasStanding ? 0 : Math.max(0, totalDue - paid);
    totalIncome += paid;
    totalDebt += debt;
    const cust = en.customers;
    tbody.innerHTML += `<tr class="hover:bg-gray-50">
      <td class="p-3 border"><a href="customer-form.html?id=${cust?.id}" class="text-blue-600 hover:underline">${cust?.firstName||''} ${cust?.lastName||''}</a></td>
      <td class="p-3 border">${cust?.mobile||''}</td>
      <td class="p-3 border">${en.programs?.name||''}</td>
      <td class="p-3 border">${en.start_date||''}</td>
      <td class="p-3 border">${en.end_date||''}</td>
      <td class="p-3 border text-green-700 font-bold">${paid ? paid+' ₪' : '-'}</td>
      <td class="p-3 border ${debt>0?'text-red-600 font-bold':'text-gray-400'}">${debt>0 ? debt+' ₪' : '✓'}</td>
    </tr>`;
  });

  // תשלומים שנכנסו בחודש זה
  const { data: monthPayments } = await db.from('payments')
    .select('amount, method').gte('payment_date', fromDate).lte('payment_date', toDate);
  const monthIncome = (monthPayments||[]).reduce((s,p) => s+(p.amount||0), 0);

  document.getElementById('mgmtKpi').innerHTML =
    kpiCard('לקוחות פעילות', activeCustomerIds.size, '#16a34a') +
    kpiCard('הכנסות החודש', monthIncome.toLocaleString()+' ₪', '#2563eb') +
    kpiCard('סה"כ חובות', totalDebt.toLocaleString()+' ₪', '#dc2626') +
    kpiCard('הרשמות פעילות', activeEnrollments.length, '#7c3aed');
}

// ===== דוח 9: השוואת CSV =====
function parseCsv(text) {
  text = text.replace(/^\uFEFF/, '');
  const lines = text.trim().split(/\r?\n/).filter(l => l.trim());
  if (!lines.length) return [];
  const sep = lines[0].includes('\t') ? '\t' : ',';
  const firstCols = lines[0].split(sep).map(c => c.trim().replace(/^"|"$/g, ''));
  const hasHeader = firstCols.some(c => /שם|חוג|טלפון|טל/.test(c));
  let dataLines, idxName, idxProgram, idxPhone;
  if (hasHeader) {
    idxProgram = firstCols.findIndex(h => h.includes('חוג'));
    idxName    = firstCols.findIndex(h => h.includes('שם'));
    idxPhone   = firstCols.findIndex(h => h.includes('טלפון') || h.includes('טל'));
    dataLines  = lines.slice(1);
  } else {
    const sample = lines[0].split(sep).map(c => c.trim().replace(/^"|"$/g, ''));
    idxPhone   = sample.findIndex(c => /^0\d[\d\-]{7,}$/.test(c.replace(/\s/g, '')));
    idxName    = 1;
    idxProgram = -1;
    dataLines  = lines;
  }
  return dataLines.filter(l => l.trim()).map(line => {
    const cols = line.split(sep).map(c => c.trim().replace(/^"|"$/g, ''));
    return {
      name:    (cols[idxName] || '').replace(/^\(|\)$/g, '').trim(),
      program: idxProgram >= 0 ? (cols[idxProgram] || '') : '',
      phone:   idxPhone   >= 0 ? (cols[idxPhone]   || '').replace(/\D/g, '') : '',
    };
  }).filter(r => r.name);
}

function nameMatchesKey(csvName, systemKey) {
  const csvParts = csvName.trim().split(/\s+/);
  const sysName  = systemKey.split('|')[0].trim();
  const sysParts = sysName.split(/\s+/);
  if (csvParts.length !== sysParts.length) return false;
  const csvSet = new Set(csvParts);
  return sysParts.every(p => csvSet.has(p));
}

async function runCsvCompare() {
  const fileInput   = document.getElementById('csvFileInput');
  const compareDate = document.getElementById('csvCompareDate').value;
  const tbody  = document.getElementById('csvGapsBody');
  const kpiEl  = document.getElementById('csvCompareKpi');
  const infoEl = document.getElementById('csvCompareInfo');

  if (!fileInput.files.length) { alert('בחרי קובץ CSV'); return; }
  if (!compareDate) { alert('בחרי תאריך'); return; }

  tbody.innerHTML = '<tr><td colspan="5" class="text-center p-4 text-gray-400">טוען...</td></tr>';
  kpiEl.innerHTML = '';
  infoEl.textContent = '';

  const text = await fileInput.files[0].text();
  const csvRows = parseCsv(text);

  const manualProgram = document.getElementById('csvProgramName').value.trim();
  if (manualProgram) csvRows.forEach(r => { if (!r.program) r.program = manualProgram; });

  if (!csvRows.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="text-center p-4 text-red-500">לא נמצאו שורות בקובץ</td></tr>';
    return;
  }

  const toDate = compareDate;
  infoEl.textContent = `מציג מי פעילה בתאריך ${toDate} | שורות ב-CSV: ${csvRows.length}`;

  const { data: enrollments } = await db.from('program_enrollments').select(`
    customer_id, start_date, end_date,
    customers!inner(id, firstName, lastName, mobile),
    programs!fk_enrollments_program(name)
  `);

  // activeMap: key = "שם|חוג" - בחורה יכולה להופיע בכמה חוגים, כל אחד key נפרד
  const activeMap = {};
  (enrollments || []).forEach(en => {
    if (!en.start_date || !en.end_date) return;
    const s = new Date(en.start_date), e = new Date(en.end_date), t = new Date(toDate);
    if (s > t || e < t) return;
    const cust = en.customers;
    const fullName = `${cust.firstName||''} ${cust.lastName||''}`.trim();
    const key = `${fullName}|${en.programs?.name||''}`;
    if (!activeMap[key]) activeMap[key] = { cust };
  });
  const activeKeys = Object.keys(activeMap);

  let inSystem = 0, notInSystem = 0, phoneGap = 0;
  tbody.innerHTML = '';

  csvRows.forEach(row => {
    const csvName = row.name.trim();
    const csvProg = row.program.trim();
    const matchedKey = activeKeys.find(k => k.split('|')[1] === csvProg && nameMatchesKey(csvName, k)) || null;

    if (matchedKey) {
      inSystem++;
      const sysPhone = (activeMap[matchedKey].cust.mobile || '').replace(/\D/g, '');
      if (row.phone && sysPhone && row.phone !== sysPhone) {
        phoneGap++;
        tbody.innerHTML += `<tr class="bg-yellow-50">
          <td class="p-3 border">${csvName}</td>
          <td class="p-3 border">${csvProg}</td>
          <td class="p-3 border">${row.phone}</td>
          <td class="p-3 border text-yellow-700 font-medium">✅ קיימת – טלפון שונה (${activeMap[matchedKey].cust.mobile})</td>
          <td class="p-3 border"><a href="customer-form.html?id=${activeMap[matchedKey].cust.id}" class="text-blue-600 hover:underline text-sm">ערוך</a></td>
        </tr>`;
      }
    } else {
      notInSystem++;
      const otherChug = activeKeys.find(k => nameMatchesKey(csvName, k));
      const hint = otherChug ? `קיימת בחוג אחר: ${otherChug.split('|')[1]}` : 'לא נמצאת במערכת';
      tbody.innerHTML += `<tr class="bg-red-50">
        <td class="p-3 border font-medium text-red-700">${csvName}</td>
        <td class="p-3 border">${csvProg}</td>
        <td class="p-3 border">${row.phone}</td>
        <td class="p-3 border text-red-600 font-bold">❌ ${hint}</td>
        <td class="p-3 border"></td>
      </tr>`;
    }
  });

  // בחורות שמשובצות במערכת לחוג שמופיע ב-CSV, אבל לא מופיעות בקובץ באותו חוג
  // גם אם החוג עצמו לא מופיע ב-CSV - אם השם מופיע ב-CSV בחוג אחר, זה פער
  const csvNames = new Set(csvRows.map(r => r.name.trim()));
  let onlyInSystem = 0;
  activeKeys.forEach(key => {
    const [sysName, prog] = key.split('|');
    // הצג רק אם השם מופיע ב-CSV (בכל חוג שהוא) - אחרת היא פשוט לא בקובץ הזה
    const nameInCsv = csvRows.some(r => nameMatchesKey(r.name.trim(), key));
    if (!nameInCsv) return;
    // בדיקה: האם יש שורה ב-CSV עם אותו שם ואותו חוג בדיוק
    const inCsv = csvRows.some(r => r.program.trim() === prog && nameMatchesKey(r.name.trim(), key));
    if (!inCsv) {
      onlyInSystem++;
      const d = activeMap[key];
      const name = key.split('|')[0];
      tbody.innerHTML += `<tr class="bg-blue-50">
        <td class="p-3 border text-blue-700 font-medium">${name}</td>
        <td class="p-3 border">${prog}</td>
        <td class="p-3 border">${d.cust.mobile || ''}</td>
        <td class="p-3 border text-blue-600 font-bold">🟦 משובצת במערכת – לא מופיעה בקובץ</td>
        <td class="p-3 border"><a href="customer-form.html?id=${d.cust.id}" class="text-blue-600 hover:underline text-sm">צפייה</a></td>
      </tr>`;
    }
  });

  if (!tbody.innerHTML) {
    tbody.innerHTML = '<tr><td colspan="5" class="text-center p-4 text-green-600 font-bold">🎉 אין פערים!</td></tr>';
  }

  kpiEl.innerHTML =
    kpiCard('שורות CSV', csvRows.length, '#374151') +
    kpiCard('תואמות', inSystem - phoneGap, '#16a34a') +
    kpiCard('חסרות במערכת', notInSystem, '#dc2626') +
    kpiCard('חסרות ב-CSV', onlyInSystem, '#2563eb');
}

// ===== אתחול =====
document.addEventListener('DOMContentLoaded', async () => {
  const now = new Date();
  const monthStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  document.getElementById('paymentMonth').value = monthStr;
  document.getElementById('salaryMonth').value = monthStr;
  document.getElementById('mgmtMonth').value = monthStr;
  document.getElementById('attendanceMonth').value = monthStr;
  document.getElementById('csvCompareDate').value = now.toISOString().split('T')[0];
  document.getElementById('pdfMonth').value = monthStr;

  // טעינת מדריכות לסלקט
  const { data: instructors } = await db.from('instructors').select('id, firstName, lastName').order('firstName');
  const sel = document.getElementById('salaryInstructor');
  const selAtt = document.getElementById('attendanceInstructor');
  (instructors||[]).forEach(i => {
    const opt = `<option value="${i.id}">${i.firstName} ${i.lastName}</option>`;
    sel.innerHTML += opt;
    selAtt.innerHTML += opt;
  });

  loadStatusReport();
  loadDebtReport();
  loadProgramsReport();
  loadTrialsReport();
});



// ===== דוח 10: נוכחות PDF =====
// במסד: day 1=ראשון, 2=שני, ... 7=שבת | JS getDay: 0=ראשון, 1=שני, ... 6=שבת
const DAY_NAMES = {1:'ראשון',2:'שני',3:'שלישי',4:'רביעי',5:'חמישי',6:'שישי',7:'שבת'};
const DB_DAY_TO_JS = {1:0,2:1,3:2,4:3,5:4,6:5,7:6};

function getDatesForDayInMonth(year, month, dbDay) {
  const jsDay = DB_DAY_TO_JS[dbDay];
  if (jsDay === undefined) return [];
  const dates = [];
  for (let d = 1; d <= new Date(year, month, 0).getDate(); d++) {
    if (new Date(year, month - 1, d).getDay() === jsDay) dates.push(d);
  }
  return dates;
}

async function generateAttendancePdf() {
  const monthVal = document.getElementById('pdfMonth').value;
  const statusEl = document.getElementById('pdfStatus');
  if (!monthVal) { alert('בחרי חודש'); return; }

  const [y, m] = monthVal.split('-').map(Number);
  const pad = n => String(n).padStart(2,'0');
  const fromDate = `${y}-${pad(m)}-01`;
  const toDate   = `${y}-${pad(m)}-${new Date(y, m, 0).getDate()}`;
  statusEl.textContent = 'טוען נתונים...';

  const { data: programs, error: progErr } = await db.from('programs').select('id, name, day, time').order('day');
  if (progErr) { statusEl.textContent = 'שגיאה: ' + progErr.message; return; }

  const { data: sessions } = await db.from('program_sessions')
    .select('id, date, program_id').gte('date', fromDate).lte('date', toDate);
  const sessionsByKey = {};
  (sessions || []).forEach(s => { sessionsByKey[`${s.program_id}|${s.date}`] = s.id; });

  const sessionIds = (sessions || []).map(s => s.id);
  let attendance = [];
  if (sessionIds.length) {
    const { data } = await db.from('session_attendance')
      .select('session_id, customer_id, is_present').in('session_id', sessionIds);
    attendance = data || [];
  }

  const { data: enrollments } = await db.from('program_enrollments')
    .select('customer_id, program_id, start_date, end_date');

  const allCustIds = [...new Set([
    ...(enrollments || []).map(e => e.customer_id),
    ...(attendance || []).map(a => a.customer_id)
  ])];
  let customers = [];
  if (allCustIds.length) {
    const { data } = await db.from('customers').select('id, firstName, lastName, mobile').in('id', allCustIds);
    customers = data || [];
  }
  const custMap = Object.fromEntries(customers.map(c => [c.id, { name: `${c.firstName} ${c.lastName}`, mobile: c.mobile || '' }]));

  let html = `<html dir="rtl" lang="he"><head><meta charset="UTF-8">
  <link href="https://fonts.googleapis.com/css2?family=Heebo:wght@400;700&display=swap" rel="stylesheet">
  <style>
    body{font-family:'Heebo',Arial,sans-serif;direction:rtl;margin:0;font-size:12px;}
    .page{padding:16px 20px;page-break-after:always;}
    .page:last-child{page-break-after:auto;}
    h2{font-size:14px;font-weight:bold;margin:0 0 10px;color:#1e3a5f;border-bottom:2px solid #ec4899;padding-bottom:4px;}
    table{width:100%;border-collapse:collapse;}
    th{background:#ec4899;color:white;padding:5px 6px;text-align:center;font-size:10px;border:1px solid #d1d5db;}
    th.col-name{text-align:right;min-width:100px;}
    td{border:1px solid #d1d5db;padding:4px 6px;text-align:center;font-size:10px;}
    td.col-name{text-align:right;}
    tr:nth-child(even){background:#fdf2f8;}
    tr.extra{background:#fffbeb;}
    .v{color:#16a34a;font-weight:bold;}
    .date-d{font-weight:bold;display:block;}
    .date-t{font-size:9px;color:#9ca3af;display:block;}
  </style></head><body>`;

  (programs || []).forEach(prog => {
    if (!prog.day) return;
    const progDays = getDatesForDayInMonth(y, m, prog.day);
    if (!progDays.length) return;

    const enrolled = (enrollments || []).filter(e =>
      e.program_id === prog.id &&
      new Date(e.start_date) <= new Date(toDate) &&
      new Date(e.end_date) >= new Date(fromDate)
    );
    if (!enrolled.length) return;

    const enrolledIds = new Set(enrolled.map(e => e.customer_id).filter(id => custMap[id]));

    const extraIds = new Set();
    progDays.forEach(day => {
      const sid = sessionsByKey[`${prog.id}|${y}-${pad(m)}-${pad(day)}`];
      if (!sid) return;
      attendance.filter(a => a.session_id === sid && !enrolledIds.has(a.customer_id) && custMap[a.customer_id])
        .forEach(a => extraIds.add(a.customer_id));
    });

    const sortedEnrolled = [...enrolledIds].sort((a,b) => custMap[a].name.localeCompare(custMap[b].name,'he'));
    const sortedExtra   = [...extraIds].sort((a,b) => custMap[a].name.localeCompare(custMap[b].name,'he'));

    html += `<div class="page"><h2>יום ${DAY_NAMES[prog.day]} - ${prog.name} ${prog.time||''}</h2><table><thead><tr>`;
    html += `<th style="width:28px">#</th><th style="width:88px">טלפון</th><th class="col-name">שם מלא</th>`;
    progDays.forEach(day => {
      html += `<th><span class="date-d">${day}/${m}</span><span class="date-t">${(prog.time||'').substring(0,5)}</span></th>`;
    });
    html += `</tr></thead><tbody>`;

    let rowNum = 1;
    sortedEnrolled.forEach(cid => {
      const cust = custMap[cid];
      html += `<tr><td>${rowNum++}</td><td>${cust.mobile}</td><td class="col-name">${cust.name}</td>`;
      progDays.forEach(day => {
        const sid = sessionsByKey[`${prog.id}|${y}-${pad(m)}-${pad(day)}`];
        const att = sid ? attendance.find(a => a.session_id === sid && a.customer_id === cid) : null;
        html += `<td>${att?.is_present ? '<span class="v">V</span>' : ''}</td>`;
      });
      html += `</tr>`;
    });

    sortedExtra.forEach(cid => {
      const cust = custMap[cid];
      html += `<tr class="extra"><td>${rowNum++}</td><td>${cust.mobile}</td><td class="col-name">${cust.name} השלמה</td>`;
      progDays.forEach(day => {
        const sid = sessionsByKey[`${prog.id}|${y}-${pad(m)}-${pad(day)}`];
        const att = sid ? attendance.find(a => a.session_id === sid && a.customer_id === cid) : null;
        html += `<td>${att?.is_present ? '<span class="v">V</span>' : ''}</td>`;
      });
      html += `</tr>`;
    });

    html += `</tbody></table></div>`;
  });

  html += `</body></html>`;

  const win = window.open('', '_blank', 'width=1100,height=800');
  win.document.write(html);
  win.document.close();
  win.onload = () => { win.focus(); win.print(); };
  statusEl.textContent = 'הדוח נפתח להדפסה ✓';
}
