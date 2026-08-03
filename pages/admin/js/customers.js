const supabaseClient = window._sb;

let customerData = [];
let currentPage = 1;
const rowsPerPage = 10;
let currentFilteredData = null;
let statusMap = {};
let debtMapGlobal = {};
let sortField = 'firstName';
let sortDir = 1;
let customersList = [];

async function loadCustomers() {
  const { data, error } = await supabaseClient.from('customers').select('*');
  if (error) { alert('שגיאה בטעינת לקוחות'); return; }
  customersList = data;
  customerData = data.sort((a, b) => (a.firstName||'').localeCompare(b.firstName||'', 'he'));
  await buildStatusMap();
  await buildDebtMap();
  currentFilteredData = customerData;
  renderTable();
}

let futureStatusSet = new Set();

async function buildStatusMap() {
  const allIds = customerData.map(c => c.id);
  if (!allIds.length) return;
  futureStatusSet = new Set();
  const [{ data: enrollments }, { data: trials, error: te }] = await Promise.all([
    supabaseClient.from('program_enrollments').select('id, customer_id, start_date, end_date').in('customer_id', allIds),
    supabaseClient.from('trial_sessions').select('customer_id, session_id').in('customer_id', allIds),
  ]);
  const sessionIds = te ? [] : (trials||[]).map(t => t.session_id);
  let ta = [];
  if (sessionIds.length) {
    const { data } = await supabaseClient.from('session_attendance').select('customer_id, is_present').in('session_id', sessionIds).eq('is_present', true);
    ta = data || [];
  }
  const today = new Date(); today.setHours(0,0,0,0);
  const activeSet = new Set(), futureSet = new Set();
  (enrollments||[]).forEach(en => {
    const s = en.start_date ? new Date(en.start_date) : null;
    const e = en.end_date ? new Date(en.end_date) : null;
    if (s && e && s <= today && e >= today) activeSet.add(en.customer_id);
    else if (s && s > today) futureSet.add(en.customer_id);
  });
  futureSet.forEach(id => futureStatusSet.add(id));
  const manual = ['frozen','left','not_interested'];
  customerData.forEach(cust => {
    if (manual.includes(cust.status_code)) { statusMap[cust.id] = cust.status_code; return; }
    if (activeSet.has(cust.id)) { statusMap[cust.id] = 'active'; return; }
    if (futureSet.has(cust.id)) { statusMap[cust.id] = 'future'; return; }
    const custTrials = te ? [] : (trials||[]).filter(t => t.customer_id === cust.id);
    if (custTrials.length) {
      statusMap[cust.id] = ta.some(a => a.customer_id === cust.id) ? 'missing_assignment' : 'trial_set';
    } else {
      statusMap[cust.id] = (enrollments||[]).some(e => e.customer_id === cust.id && e.end_date && new Date(e.end_date) < today) ? 'expired' : 'interested';
    }
  });
}

let activeDebtMap = {};
let futureDebtMap = {};

async function buildDebtMap() {
  const allIds = customerData.map(c => c.id);
  if (!allIds.length) return;
  debtMapGlobal = {};
  activeDebtMap = {};
  futureDebtMap = {};
  const today = new Date().toISOString().split('T')[0];
  const [{ data: enrollments }, { data: payments }] = await Promise.all([
    supabaseClient.from('program_enrollments').select('id, customer_id, start_date, end_date, programs!fk_enrollments_program(price)').in('customer_id', allIds).gte('end_date', today),
    supabaseClient.from('payments').select('enrollment_id, amount, method'),
  ]);
  function calcMonths(s, e) {
    if (!s || !e) return 0;
    const start = new Date(s), end = new Date(e);
    return Math.max(0, (end.getFullYear()-start.getFullYear())*12 + (end.getMonth()-start.getMonth()) + 1);
  }
  (enrollments||[]).forEach(en => {
    const price = en.programs?.price ?? 0;
    const totalDue = price * calcMonths(en.start_date, en.end_date);
    const enPay = (payments||[]).filter(p => p.enrollment_id === en.id);
    if (enPay.some(p => p.method === 'standing_order')) return;
    const paid = enPay.reduce((s,p) => s+(p.amount||0), 0);
    const debt = totalDue - paid;
    if (debt <= 0) return;
    const isFuture = en.start_date > today;
    if (isFuture) futureDebtMap[en.customer_id] = (futureDebtMap[en.customer_id]||0) + debt;
    else activeDebtMap[en.customer_id] = (activeDebtMap[en.customer_id]||0) + debt;
    debtMapGlobal[en.customer_id] = (debtMapGlobal[en.customer_id]||0) + debt;
  });
}

function getStatusHtml(status) {
  const map = {
    active: ['✓ פעילה','green'], future: ['📅 שיבוץ עתידי','#0077cc'],
    trial_set: ['נקבע ניסיון','blue'], missing_assignment: ['חסר שיבוץ','purple'],
    expired: ['פג תוקף','orange'], interested: ['מתעניינת','#888'],
    frozen: ['בהקפאה','gray'], left: ['פרשה','gray'], not_interested: ['לא מעוניינת','gray'],
  };
  const [label, color] = map[status] || ['?','#888'];
  return `<span style="color:${color};font-weight:bold">${label}</span>`;
}

async function renderTable() {
  const tbody = document.querySelector('#customersTable tbody');
  tbody.innerHTML = '';
  const dataToShow = currentFilteredData || customerData;
  document.getElementById('countBadge').textContent = dataToShow.length;
  const start = (currentPage - 1) * rowsPerPage;
  const pageData = dataToShow.slice(start, start + rowsPerPage);

  pageData.forEach(customer => {
    const tr = document.createElement('tr');
    tr.style.cursor = 'pointer';
    const activeDebt = activeDebtMap[customer.id] || 0;
    const futureDebt = futureDebtMap[customer.id] || 0;
    const hasFuture = futureStatusSet.has(customer.id);
    const isManual = ['frozen','left','not_interested'].includes(customer.status_code);
    let displayStatus = statusMap[customer.id];
    let debtBadge = '';
    if (!isManual) {
      if (activeDebt > 0) {
        displayStatus = 'active';
        debtBadge = ` <span style="color:red;font-size:0.75em;font-weight:bold">+חוב</span>`;
      } else if (hasFuture) {
        displayStatus = 'future';
        if (futureDebt > 0) debtBadge = ` <span style="color:red;font-size:0.75em;font-weight:bold">+חוב</span>`;
      }
    }
    tr.innerHTML = `
      <td>${customer.idValue||''}</td>
      <td>${customer.firstName||''}</td>
      <td>${customer.lastName||''}</td>
      <td>${customer.birthDate||''}</td>
      <td>${customer.email||''}</td>
      <td>${customer.mobile||''}</td>
      <td>${getStatusHtml(displayStatus)}${debtBadge}</td>
      <td class="action-icons" onclick="event.stopPropagation()">
        <button class="action-btn" title="צפייה" onclick="openViewModal(${customer.id})"><i class="fas fa-eye" style="color:#8b5cf6"></i></button>
        <button class="action-btn edit" title="עריכה" onclick="editCustomer(${customer.id})"><i class="fas fa-edit"></i></button>
        <button class="action-btn delete" title="מחיקה" onclick="deleteCustomer(${customer.id})"><i class="fas fa-trash-alt"></i></button>
      </td>
    `;
    tr.addEventListener('click', () => openViewModal(customer.id));
    tbody.appendChild(tr);
  });
  renderPagination(dataToShow.length);
}

function renderPagination(totalRows) {
  const totalPages = Math.max(1, Math.ceil(totalRows / rowsPerPage));
  document.getElementById('pageInfo').textContent = `עמוד ${currentPage} מתוך ${totalPages}`;
  document.getElementById('prevPage').disabled = currentPage === 1;
  document.getElementById('nextPage').disabled = currentPage === totalPages;
  document.getElementById('firstPage').disabled = currentPage === 1;
  document.getElementById('lastPage').disabled = currentPage === totalPages;
  document.getElementById('prevPage').onclick = () => { if (currentPage > 1) { currentPage--; renderTable(); } };
  document.getElementById('nextPage').onclick = () => { if (currentPage < totalPages) { currentPage++; renderTable(); } };
  document.getElementById('firstPage').onclick = () => { if (currentPage !== 1) { currentPage = 1; renderTable(); } };
  document.getElementById('lastPage').onclick = () => { if (currentPage !== totalPages) { currentPage = totalPages; renderTable(); } };
  const goInput = document.getElementById('goToPageInput');
  goInput.max = totalPages;
  goInput.onkeydown = (e) => {
    if (e.key !== 'Enter') return;
    const p = parseInt(goInput.value);
    if (p >= 1 && p <= totalPages) { currentPage = p; goInput.value = ''; renderTable(); }
  };
}

function sortBy(field) {
  if (sortField === field) sortDir *= -1;
  else { sortField = field; sortDir = 1; }
  document.querySelectorAll('.sort-icon').forEach(el => el.textContent = '');
  const icon = document.getElementById('sort-' + field);
  if (icon) icon.textContent = sortDir === 1 ? '▲' : '▼';
  const data = currentFilteredData || customerData;
  data.sort((a, b) => (a[field]||'').toString().localeCompare((b[field]||'').toString(), 'he') * sortDir);
  currentPage = 1;
  renderTable();
}

async function openViewModal(id) {
  const customer = customersList.find(c => c.id === id);
  if (!customer) return;
  const initials = ((customer.firstName||'?')[0] + (customer.lastName||'?')[0]).toUpperCase();
  document.getElementById('vmAvatar').textContent = initials;
  document.getElementById('vmFullName').textContent = `${customer.firstName||''} ${customer.lastName||''}`;
  document.getElementById('vmId').textContent = customer.idValue || '-';
  document.getElementById('vmMobile').textContent = customer.mobile || '-';
  document.getElementById('vmEmail').textContent = customer.email || '-';
  document.getElementById('vmBirth').textContent = customer.birthDate || '-';
  const addr = [customer.street, customer.houseNo, customer.city].filter(Boolean).join(' ');
  document.getElementById('vmAddress').textContent = addr || '-';
  const debt = debtMapGlobal[id] || 0;
  const debtEl = document.getElementById('vmDebt');
  debtEl.textContent = debt > 0 ? debt + ' ₪' : 'אין חוב';
  debtEl.style.color = debt > 0 ? '#dc2626' : '#16a34a';
  const statusLabels = {
    active: '✓ פעילה', future: '📅 שיבוץ עתידי', trial_set: 'נקבע ניסיון',
    missing_assignment: 'חסר שיבוץ', expired: 'פג תוקף', interested: 'מתעניינת',
    frozen: 'בהקפאה', left: 'פרשה', not_interested: 'לא מעוניינת',
  };
  document.getElementById('vmStatusBadgeHeader').innerHTML =
    `<span style="background:rgba(255,255,255,0.25);padding:3px 12px;border-radius:999px;">${statusLabels[statusMap[id]]||''}</span>`;
  document.getElementById('vmEditBtn').onclick = () => editCustomer(id);

  // טען הזמנות חנות
  document.getElementById('vmShopTotal').textContent = 'טוען...';
  document.getElementById('vmOrders').innerHTML = '<div style="font-size:12px;color:#9ca3af;padding:4px 0;">טוען...</div>';
  document.getElementById('viewModal').classList.add('open');

  const { data: orders } = await supabaseClient
    .from('orders')
    .select('id, created_at, total, status, order_items(quantity, products(name))')
    .eq('customer_id', id)
    .order('created_at', { ascending: false });

  const shopOrders = orders ?? [];
  const shopTotal = shopOrders.filter(o => o.status !== 'cancelled').reduce((s, o) => s + Number(o.total), 0);
  document.getElementById('vmShopTotal').textContent = shopTotal > 0 ? '₪' + shopTotal.toFixed(2) : 'אין רכישות';
  document.getElementById('vmShopTotal').style.color = shopTotal > 0 ? '#7c3aed' : '#9ca3af';

  const STATUS_LABELS = { pending:'ממתין', processing:'בטיפול', packed:'ארוז', shipped:'נשלח', completed:'הושלם', cancelled:'בוטל' };
  const STATUS_COLORS = { pending:'#d97706', processing:'#2563eb', packed:'#7c3aed', shipped:'#0891b2', completed:'#059669', cancelled:'#dc2626' };
  document.getElementById('vmOrders').innerHTML = shopOrders.length
    ? shopOrders.map(o => {
        const date = new Date(o.created_at).toLocaleDateString('he-IL');
        const items = (o.order_items ?? []).map(i => i.products?.name).filter(Boolean).join(', ') || 'פריטים';
        const sc = STATUS_COLORS[o.status] || '#6b7280';
        return `<div style="border:1px solid #f3f0ff;border-radius:10px;padding:8px 12px;margin-bottom:6px;font-size:12px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px;">
            <span style="font-weight:700;color:#1f2937;">#${o.id} — ${date}</span>
            <span style="font-weight:800;color:#7c3aed;">₪${Number(o.total).toFixed(2)}</span>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <span style="color:#6b7280;font-size:11px;">${items}</span>
            <span style="font-size:10px;font-weight:700;color:${sc};background:${sc}18;padding:2px 8px;border-radius:999px;">${STATUS_LABELS[o.status]||o.status}</span>
          </div>
        </div>`;
      }).join('')
    : '<div style="font-size:12px;color:#9ca3af;padding:4px 0;">אין הזמנות</div>';
}

function closeViewModal() {
  document.getElementById('viewModal').classList.remove('open');
}

function saveTableState() {
  sessionStorage.setItem('customersState', JSON.stringify({
    search: document.getElementById('searchInput').value,
    status: document.getElementById('statusFilter').value,
    page: currentPage
  }));
}

function editCustomer(id) {
  saveTableState();
  window.location.href = `customer-form.html?id=${id}`;
}

async function deleteCustomer(id) {
  const customer = customersList.find(c => c.id === id);
  if (!customer) return;
  if (!confirm(`האם למחוק את ${customer.firstName} ${customer.lastName}?`)) return;
  const { error } = await supabaseClient.from('customers').delete().eq('id', id);
  if (error) alert('שגיאה במחיקה: ' + error.message);
  else { alert('נמחק בהצלחה'); loadCustomers(); }
}

function filterCustomers() {
  const searchTerm = document.getElementById('searchInput').value.trim().toLowerCase();
  const selectedStatus = document.getElementById('statusFilter').value;
  currentFilteredData = customerData.filter(cust => {
    const matchText =
      (cust.firstName||'').toLowerCase().includes(searchTerm) ||
      (cust.lastName||'').toLowerCase().includes(searchTerm) ||
      (cust.mobile||'').includes(searchTerm) ||
      (cust.email||'').toLowerCase().includes(searchTerm) ||
      (cust.idValue||'').includes(searchTerm);
    const matchStatus = !selectedStatus || selectedStatus === 'all' || statusMap[cust.id] === selectedStatus;
    return matchText && matchStatus;
  });
  currentPage = 1;
  renderTable();
}

function loadStatusOptions() {
  document.getElementById('statusFilter').innerHTML = `
    <option value="all">כולם</option>
    <option value="active">✓ פעילה</option>
    <option value="future">📅 שיבוץ עתידי</option>
    <option value="trial_set">נקבע ניסיון</option>
    <option value="missing_assignment">חסר שיבוץ</option>
    <option value="expired">פג תוקף</option>
    <option value="interested">מתעניינת</option>
    <option value="frozen">בהקפאה</option>
    <option value="left">פרשה</option>
    <option value="not_interested">לא מעוניינת</option>
  `;
}

function exportToCSV(data) {
  const headers = ['שם פרטי','שם משפחה','טלפון','אימייל','ת.ז','ת.לידה'];
  const rows = data.map(c => [c.firstName,c.lastName,c.mobile,c.email,c.idValue,c.birthDate].map(v => `"${v||''}"`).join(','));
  const csv = '\uFEFF' + [headers.join(','), ...rows].join('\n');
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([csv],{type:'text/csv'})), download: 'לקוחות.csv' });
  a.click();
}

document.addEventListener('DOMContentLoaded', () => {
  loadStatusOptions();
  loadCustomers();
  document.getElementById('newCustomerBtn')?.addEventListener('click', () => { saveTableState(); window.location.href = 'customer-form.html'; });
  document.getElementById('exportCustomersBtn')?.addEventListener('click', () => exportToCSV(currentFilteredData || customerData));
  document.getElementById('searchInput')?.addEventListener('input', filterCustomers);
  document.getElementById('statusFilter')?.addEventListener('change', filterCustomers);
  document.getElementById('viewModal')?.addEventListener('click', e => {
    if (e.target === document.getElementById('viewModal')) closeViewModal();
  });
});

window.addEventListener('pageshow', async () => {
  const needReload = sessionStorage.getItem('reloadCustomers') === 'true';
  const savedState = sessionStorage.getItem('customersState');

  if (sessionStorage.getItem('resetSearch') === 'true') {
    document.getElementById('searchInput').value = '';
    sessionStorage.removeItem('resetSearch');
  }

  sessionStorage.removeItem('reloadCustomers');
  sessionStorage.removeItem('customersState');

  if (needReload || savedState) {
    await loadCustomers();
    if (savedState) {
      const { search, status, page } = JSON.parse(savedState);
      document.getElementById('searchInput').value = search || '';
      document.getElementById('statusFilter').value = status || 'all';
      if (search || (status && status !== 'all')) filterCustomers();
      currentPage = page || 1;
      renderTable();
    }
  }
});

window.openViewModal = openViewModal;
window.closeViewModal = closeViewModal;
window.editCustomer = editCustomer;
window.deleteCustomer = deleteCustomer;
window.sortBy = sortBy;


