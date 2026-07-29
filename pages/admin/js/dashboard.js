const sb = window._sb;

const today = new Date();
today.setHours(0, 0, 0, 0);
const todayStr = today.toISOString().split('T')[0];

function fmt(d) {
  if (!d) return '—';
  const parts = d.split('-');
  if (parts.length !== 3) return d;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function daysUntilBirthday(dobStr) {
  if (!dobStr) return 999;
  // birthDate format: YYYY-MM-DD or DD/MM/YYYY
  let m, d;
  if (dobStr.includes('-')) {
    [, m, d] = dobStr.split('-');
  } else if (dobStr.includes('/')) {
    [d, m] = dobStr.split('/');
  } else return 999;
  const next = new Date(today.getFullYear(), +m - 1, +d);
  if (next < today) next.setFullYear(today.getFullYear() + 1);
  return Math.round((next - today) / 86400000);
}

function getBirthYear(dobStr) {
  if (!dobStr) return null;
  if (dobStr.includes('-')) return +dobStr.split('-')[0];
  if (dobStr.includes('/')) return +dobStr.split('/')[2];
  return null;
}

async function loadKPIs() {
  const [
    { count: members },
    { count: inquiries },
    { count: orders },
  ] = await Promise.all([
    sb.from('customers').select('*', { count: 'exact', head: true }),
    sb.from('inquiries').select('*', { count: 'exact', head: true }).eq('status', 'new'),
    sb.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
  ]);

  // חובות – מחושב מ-enrollments + payments
  const [{ data: enrollments }, { data: payments }] = await Promise.all([
    sb.from('program_enrollments').select('id, customer_id, start_date, end_date, programs!fk_enrollments_program(price)'),
    sb.from('payments').select('enrollment_id, amount, method'),
  ]);

  function calcMonths(s, e) {
    if (!s || !e) return 0;
    const start = new Date(s), end = new Date(e);
    return Math.max(0, (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1);
  }

  const debtors = new Set();
  (enrollments || []).forEach(en => {
    const price = en.programs?.price ?? 0;
    const totalDue = price * calcMonths(en.start_date, en.end_date);
    const enPay = (payments || []).filter(p => p.enrollment_id === en.id);
    if (enPay.some(p => p.method === 'standing_order')) return;
    const paid = enPay.reduce((s, p) => s + (p.amount || 0), 0);
    if (totalDue - paid > 0) debtors.add(en.customer_id);
  });

  document.getElementById('kpiMembers').textContent = members ?? 0;
  document.getElementById('kpiInquiries').textContent = inquiries ?? 0;
  document.getElementById('kpiDebts').textContent = debtors.size;
  document.getElementById('kpiOrders').textContent = orders ?? 0;
}

const DEFAULT_BIRTHDAY_SUBJECT = 'יום הולדת שמח {שם}! 🎂';
const DEFAULT_BIRTHDAY_BODY = 'שלום {שם},\nמאחלים לך יום הולדת שמח ומלא שמחה! 🎉\n\nבאהבה,\nצוות FitBalance';

function getSetting(id, def) {
  return localStorage.getItem('sys_' + id) ?? def;
}

const birthdayMailLinks = {};

function sendBirthdayMail(idx) {
  const href = birthdayMailLinks[idx];
  if (!href) return;
  location.href = href;
}

function openMailModal(idx) {
  const m = birthdayMailLinks[idx];
  if (!m) return;
  document.getElementById('mailTo').value = m.to;
  document.getElementById('mailSubject').value = m.subject;
  document.getElementById('mailBody').value = m.body;
  document.getElementById('mailModal').style.display = 'flex';
}

async function loadBirthdays() {
  const el = document.getElementById('birthdayList');
  const { data } = await sb.from('customers').select('id, firstName, lastName, birthDate, email').not('birthDate', 'is', null);
  if (!data?.length) { el.innerHTML = '<div class="empty-msg">אין נתוני ימי הולדת</div>'; return; }

  const sorted = data
    .map(c => ({ ...c, days: daysUntilBirthday(c.birthDate) }))
    .filter(c => c.days <= 30)
    .sort((a, b) => a.days - b.days)
    .slice(0, 8);

  if (!sorted.length) { el.innerHTML = '<div class="empty-msg">אין ימי הולדת ב-30 הימים הקרובים</div>'; return; }

  el.innerHTML = sorted.map((c, idx) => {
    const birthYear = getBirthYear(c.birthDate);
    const age = birthYear ? today.getFullYear() - birthYear + (c.days === 0 ? 1 : 0) : '';
    const badge = c.days === 0
      ? '<span class="badge-today">היום! 🎉</span>'
      : `<span class="badge-days">בעוד ${c.days} ימים</span>`;
    const mailSubject = getSetting('tmpl-birthday-subject', DEFAULT_BIRTHDAY_SUBJECT).replace('{שם}', c.firstName);
    const mailBody = getSetting('tmpl-birthday-body', DEFAULT_BIRTHDAY_BODY).replace(/{שם}/g, c.firstName);
    if (c.email) birthdayMailLinks[idx] = { to: c.email, subject: mailSubject, body: mailBody };
    const mailLink = c.email
      ? `<button onclick="openMailModal(${idx})" title="שלח מייל מזל טוב" style="background:none;border:none;cursor:pointer;font-size:16px;padding:0;">✉️</button>`
      : '<span style="font-size:11px;color:#ccc;">אין מייל</span>';
    return `<div class="widget-row">
      <span class="row-icon">🎂</span>
      <div class="row-info">
        <div class="row-name">${c.firstName} ${c.lastName}</div>
        <div class="row-sub">${c.birthDate}${age ? ` · גיל ${age}` : ''}</div>
      </div>
      <div style="display:flex;align-items:center;gap:8px;">${mailLink}${badge}</div>
    </div>`;
  }).join('');
}

async function loadInquiries() {
  const el = document.getElementById('inquiryList');
  const { data } = await sb.from('inquiries')
    .select('id, child_name, last_name, created_at, program_code')
    .eq('status', 'new')
    .order('created_at', { ascending: false })
    .limit(8);

  if (!data?.length) { el.innerHTML = '<div class="empty-msg">אין מתעניינות חדשות</div>'; return; }

  const programs = { 1: 'ילדות', 2: 'נערות', 3: 'נשים' };
  el.innerHTML = data.map(i => {
    const name = [i.child_name, i.last_name].filter(Boolean).join(' ') || '—';
    return `<div class="widget-row">
      <span class="row-icon">🎀</span>
      <div class="row-info">
        <div class="row-name">${name}</div>
        <div class="row-sub">${fmt(i.created_at?.split('T')[0])} · ${programs[i.program_code] || '—'}</div>
      </div>
      <span class="badge-new">חדשה</span>
    </div>`;
  }).join('');
}

async function loadDebts() {
  const el = document.getElementById('debtList');

  const [{ data: enrollments }, { data: payments }] = await Promise.all([
    sb.from('program_enrollments').select('id, customer_id, start_date, end_date, programs!fk_enrollments_program(price)'),
    sb.from('payments').select('enrollment_id, amount, method'),
  ]);

  function calcMonths(s, e) {
    if (!s || !e) return 0;
    const start = new Date(s), end = new Date(e);
    return Math.max(0, (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1);
  }

  const debtMap = {};
  (enrollments || []).forEach(en => {
    const price = en.programs?.price ?? 0;
    const totalDue = price * calcMonths(en.start_date, en.end_date);
    const enPay = (payments || []).filter(p => p.enrollment_id === en.id);
    if (enPay.some(p => p.method === 'standing_order')) return;
    const paid = enPay.reduce((s, p) => s + (p.amount || 0), 0);
    const debt = totalDue - paid;
    if (debt > 0) debtMap[en.customer_id] = (debtMap[en.customer_id] || 0) + debt;
  });

  const topDebtors = Object.entries(debtMap).sort((a, b) => b[1] - a[1]).slice(0, 8);
  if (!topDebtors.length) { el.innerHTML = '<div class="empty-msg">אין חובות פתוחים 🎉</div>'; return; }

  const custIds = topDebtors.map(([id]) => id);
  const { data: customers } = await sb.from('customers').select('id, firstName, lastName').in('id', custIds);
  const custMap = Object.fromEntries((customers || []).map(c => [c.id, c]));

  el.innerHTML = topDebtors.map(([id, debt]) => {
    const c = custMap[id];
    const name = c ? `${c.firstName} ${c.lastName}` : '—';
    return `<div class="widget-row">
      <span class="row-icon">💳</span>
      <div class="row-info"><div class="row-name">${name}</div></div>
      <span class="badge-overdue">₪${debt.toLocaleString()}</span>
    </div>`;
  }).join('');
}

async function loadOrders() {
  const el = document.getElementById('orderList');
  const { data: ordersData } = await sb.from('orders')
    .select('id, created_at, total, status, customer_id, guest_name')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(8);

  if (!ordersData?.length) { el.innerHTML = '<div class="empty-msg">אין הזמנות ממתינות</div>'; return; }

  const custIds = [...new Set(ordersData.map(o => o.customer_id).filter(Boolean))];
  let custMap = {};
  if (custIds.length) {
    const { data: custs } = await sb.from('customers').select('id, firstName, lastName').in('id', custIds);
    (custs || []).forEach(c => { custMap[c.id] = c; });
  }

  el.innerHTML = ordersData.map(o => {
    const c = o.customer_id ? custMap[o.customer_id] : null;
    const name = c ? `${c.firstName} ${c.lastName}` : (o.guest_name || 'אורח');
    return `<div class="widget-row">
      <span class="row-icon">📦</span>
      <div class="row-info">
        <div class="row-name">${name}</div>
        <div class="row-sub">${fmt(o.created_at?.split('T')[0])}</div>
      </div>
      <span class="badge-days">₪${Number(o.total || 0).toFixed(0)}</span>
    </div>`;
  }).join('');
}

async function loadUpdates() {
  const el = document.getElementById('updateList');
  const items = [];

  const [{ data: newCustomers }, { data: newInquiries }, { data: newOrders }] = await Promise.all([
    sb.from('customers').select('firstName, lastName, created_at').gte('created_at', todayStr + 'T00:00:00').order('created_at', { ascending: false }),
    sb.from('inquiries').select('child_name, last_name, created_at').gte('created_at', todayStr + 'T00:00:00').order('created_at', { ascending: false }),
    sb.from('orders').select('id, guest_name, customer_id, created_at, total').gte('created_at', todayStr + 'T00:00:00').order('created_at', { ascending: false }),
  ]);

  (newCustomers || []).forEach(c => items.push({ icon: '👤', text: `לקוחה חדשה: ${c.firstName} ${c.lastName}`, time: c.created_at }));
  (newInquiries || []).forEach(i => items.push({ icon: '🎀', text: `פנייה חדשה: ${[i.child_name, i.last_name].filter(Boolean).join(' ') || '—'}`, time: i.created_at }));
  (newOrders || []).forEach(o => items.push({ icon: '📦', text: `הזמנה חדשה${o.guest_name ? ': ' + o.guest_name : ''}`, time: o.created_at }));

  items.sort((a, b) => b.time.localeCompare(a.time));

  if (!items.length) { el.innerHTML = '<div class="empty-msg">אין עדכונים להיום</div>'; return; }

  el.innerHTML = items.map(i => {
    const t = i.time?.split('T')[1]?.slice(0, 5) || '';
    return `<div class="widget-row">
      <span class="row-icon">${i.icon}</span>
      <div class="row-info"><div class="row-name">${i.text}</div></div>
      <span class="badge-days">${t}</span>
    </div>`;
  }).join('');
}

loadKPIs();
loadUpdates();
loadBirthdays();
loadInquiries();
loadDebts();
loadOrders();
