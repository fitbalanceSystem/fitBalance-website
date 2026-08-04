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
  const useHebrew = (localStorage.getItem('sys_dash-birthday-calendar') ?? 'gregorian') === 'hebrew';
  let m, d;
  if (dobStr.includes('-')) { [, m, d] = dobStr.split('-'); }
  else if (dobStr.includes('/')) { [d, m] = dobStr.split('/'); }
  else return 999;

  if (!useHebrew) {
    const next = new Date(today.getFullYear(), +m - 1, +d);
    if (next < today) next.setFullYear(today.getFullYear() + 1);
    return Math.round((next - today) / 86400000);
  }

  // לוח עברי — מחשב את התאריך העברי של יום ההולדת ומוצא את הפעם הבאה שלו
  const year = dobStr.includes('-') ? +dobStr.split('-')[0] : +dobStr.split('/')[2];
  const birthHeb = new Intl.DateTimeFormat('he-IL-u-ca-hebrew', { day: 'numeric', month: 'long' }).format(new Date(year, +m - 1, +d));
  // מחפש את התאריך הלועזי הקרוב שמתאים לאותו תאריך עברי
  for (let i = 0; i <= 400; i++) {
    const candidate = new Date(today.getTime() + i * 86400000);
    const candHeb = new Intl.DateTimeFormat('he-IL-u-ca-hebrew', { day: 'numeric', month: 'long' }).format(candidate);
    if (candHeb === birthHeb) return i;
  }
  return 999;
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

function toHebrewGematria(n) {
  const ones  = ['','א','ב','ג','ד','ה','ו','ז','ח','ט','י','יא','יב','יג','יד','טו','טז','יז','יח','יט','כ','כא','כב','כג','כד','כה','כו','כז','כח','כט','ל'];
  if (n >= 1 && n <= 30) return ones[n];
  return String(n);
}

function toHebrewDate(dobStr) {
  try {
    let year, month, day;
    if (dobStr.includes('-')) { [year, month, day] = dobStr.split('-').map(Number); }
    else if (dobStr.includes('/')) { [day, month, year] = dobStr.split('/').map(Number); }
    else return '';
    const fmt = new Intl.DateTimeFormat('he-IL-u-ca-hebrew', { day: 'numeric', month: 'long' }).format(new Date(year, month - 1, day));
    // fmt מחזיר למשל "22 באב" — מחליפים את המספר בגימטריה
    return fmt.replace(/^(\d+)/, (_, d) => toHebrewGematria(+d));
  } catch { return ''; }
}

const birthdayMailLinks = {};

function openMailModal(id) {
  console.log('openMailModal id:', id);
  console.log('birthdayMailLinks:', JSON.stringify(birthdayMailLinks));
  const m = birthdayMailLinks[id];
  console.log('found entry:', m);
  if (!m) return;
  document.getElementById('mailTo').value = m.to;
  document.getElementById('mailFirstName').value = m.firstName;
  document.getElementById('mailGiftLink').value = `https://fitbalance.co.il/pages/customer/birthday-gift.html?id=${m.id}`;
  document.getElementById('mailCustomerId').value = m.id;
  document.getElementById('mailModal').style.display = 'flex';
}

async function loadBirthdays() {
  const el = document.getElementById('birthdayList');
  const { data } = await sb.from('customers').select('id, firstName, lastName, birthDate, email, birthday_email_sent_at').not('birthDate', 'is', null);
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
    if (c.email) birthdayMailLinks[c.id] = { to: c.email, firstName: c.firstName, id: c.id };
    const sentAt = c.birthday_email_sent_at ? new Date(c.birthday_email_sent_at).toLocaleDateString('he-IL') : null;
    const mailLink = c.email
      ? `<button onclick="openMailModal('${c.id}')" title="${sentAt ? 'נשלח ב-' + sentAt + ' — לחץ לשליחה חוזרת' : 'שלח מייל מזל טוב'}" style="background:none;border:none;cursor:pointer;font-size:16px;padding:0;">${sentAt ? '✅' : '✉️'}</button>`
      : '<span style="font-size:11px;color:#ccc;">אין מייל</span>';
    const useHebrew = (localStorage.getItem('sys_dash-birthday-calendar') ?? 'gregorian') === 'hebrew';
    const dateDisplay = useHebrew
      ? toHebrewDate(c.birthDate)
      : c.birthDate;
    return `<div class="widget-row">
      <span class="row-icon">🎂</span>
      <div class="row-info">
        <div class="row-name">${c.firstName} ${c.lastName}</div>
        <div class="row-sub">${dateDisplay}${age ? ` · גיל ${age}` : ''}</div>
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

async function loadShopAnalytics() {
  // הכנסות החודש ל-KPI
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
  const { data: monthOrders } = await sb.from('orders')
    .select('total')
    .neq('status', 'cancelled')
    .gte('created_at', monthStart);
  const monthRev = (monthOrders || []).reduce((s, o) => s + Number(o.total), 0);
  document.getElementById('kpiShopRevenue').textContent = '₪' + monthRev.toFixed(0);

  // 6 חודשים אחרונים
  const sixMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 5, 1).toISOString();
  const { data: orders6 } = await sb.from('orders')
    .select('created_at, total, order_items(quantity, price, products(name))')
    .neq('status', 'cancelled')
    .gte('created_at', sixMonthsAgo);

  // גרף לפי חודש
  const monthLabels = [];
  const monthRevMap = {};
  for (let i = 5; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('he-IL', { month: 'short', year: '2-digit' });
    monthLabels.push(label);
    monthRevMap[key] = 0;
  }
  (orders6 || []).forEach(o => {
    const key = o.created_at?.slice(0, 7);
    if (key in monthRevMap) monthRevMap[key] += Number(o.total);
  });
  const chartData = Object.values(monthRevMap);

  const ctx = document.getElementById('shopChart')?.getContext('2d');
  if (ctx) {
    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: monthLabels,
        datasets: [{
          label: 'הכנסות ₪',
          data: chartData,
          backgroundColor: chartData.map((_, i) => i === 5
            ? 'rgba(139,92,246,.85)'
            : 'rgba(236,72,153,.35)'),
          borderRadius: 8,
          borderSkipped: false,
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          y: { ticks: { callback: v => '₪' + v }, grid: { color: '#f3f0ff' } },
          x: { grid: { display: false } }
        }
      }
    });
  }

  // מוצרים מובילים
  const productMap = {};
  (orders6 || []).forEach(o => {
    (o.order_items || []).forEach(item => {
      const name = item.products?.name || 'מוצר';
      if (!productMap[name]) productMap[name] = { qty: 0, rev: 0 };
      productMap[name].qty += item.quantity;
      productMap[name].rev += item.price * item.quantity;
    });
  });
  const topProducts = Object.entries(productMap)
    .sort((a, b) => b[1].rev - a[1].rev)
    .slice(0, 6);

  const el = document.getElementById('topProductsList');
  if (!topProducts.length) { el.innerHTML = '<div class="empty-msg">אין נתוני מכירות</div>'; return; }
  const maxRev = topProducts[0][1].rev || 1;
  el.innerHTML = topProducts.map(([name, { qty, rev }]) => `
    <div class="widget-row" style="flex-direction:column;align-items:stretch;gap:4px;">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <span class="row-name">${name}</span>
        <span style="font-size:11px;font-weight:700;color:#7c3aed;">₪${rev.toFixed(0)} · ${qty} יח'</span>
      </div>
      <div style="height:5px;border-radius:3px;background:#f3f0ff;overflow:hidden;">
        <div style="height:100%;width:${(rev/maxRev*100).toFixed(1)}%;background:linear-gradient(90deg,#ec4899,#8b5cf6);border-radius:3px;"></div>
      </div>
    </div>`).join('');
}

loadKPIs();
loadUpdates();
loadBirthdays();
loadInquiries();
loadDebts();
loadOrders();
loadShopAnalytics();
