const { createClient } = supabase;
const supabaseUrl = 'https://bmrtobuvjuycnvvfmgvf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJtcnRvYnV2anV5Y252dmZtZ3ZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA1ODQ5MDUsImV4cCI6MjA2NjE2MDkwNX0.VhoKIR_nb6lyu_05CEsVT8G_c90chKTX8v__5QA-A-s';
const supabaseClient = createClient(supabaseUrl, supabaseKey);

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

async function buildStatusMap() {
  const allIds = customerData.map(c => c.id);
  if (!allIds.length) return;
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

async function buildDebtMap() {
  const allIds = customerData.map(c => c.id);
  if (!allIds.length) return;
  debtMapGlobal = {};
  const [{ data: enrollments }, { data: payments }] = await Promise.all([
    supabaseClient.from('program_enrollments').select('id, customer_id, start_date, end_date, programs!fk_enrollments_program(price)').in('customer_id', allIds),
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
    if (debt > 0) debtMapGlobal[en.customer_id] = (debtMapGlobal[en.customer_id]||0) + debt;
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
    const debt = debtMapGlobal[customer.id] || 0;
    const status = statusMap[customer.id];
    const isManual = ['frozen','left','not_interested'].includes(customer.status_code);
    const debtBadge = (!isManual && debt > 0) ? ` <span style="color:red;font-size:0.75em;font-weight:bold">+חוב</span>` : '';
    tr.innerHTML = `
      <td>${customer.idValue||''}</td>
      <td>${customer.firstName||''}</td>
      <td>${customer.lastName||''}</td>
      <td>${customer.birthDate||''}</td>
      <td>${customer.email||''}</td>
      <td>${customer.mobile||''}</td>
      <td>${getStatusHtml(status)}${debtBadge}</td>
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
  document.getElementById('prevPage').onclick = () => { if (currentPage > 1) { currentPage--; renderTable(); } };
  document.getElementById('nextPage').onclick = () => { if (currentPage < totalPages) { currentPage++; renderTable(); } };
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
  document.getElementById('viewModal').classList.add('open');
}

function closeViewModal() {
  document.getElementById('viewModal').classList.remove('open');
}

function editCustomer(id) {
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
  document.getElementById('newCustomerBtn')?.addEventListener('click', () => { window.location.href = 'customer-form.html'; });
  document.getElementById('exportCustomersBtn')?.addEventListener('click', () => exportToCSV(currentFilteredData || customerData));
  document.getElementById('searchInput')?.addEventListener('input', filterCustomers);
  document.getElementById('statusFilter')?.addEventListener('change', filterCustomers);
  document.getElementById('viewModal')?.addEventListener('click', e => {
    if (e.target === document.getElementById('viewModal')) closeViewModal();
  });
});

window.addEventListener('pageshow', () => {
  if (sessionStorage.getItem('resetSearch') === 'true') {
    document.getElementById('searchInput').value = '';
    sessionStorage.removeItem('resetSearch');
  }
  if (sessionStorage.getItem('reloadCustomers') === 'true') {
    sessionStorage.removeItem('reloadCustomers');
    loadCustomers();
  }
});

window.openViewModal = openViewModal;
window.closeViewModal = closeViewModal;
window.editCustomer = editCustomer;
window.deleteCustomer = deleteCustomer;
window.sortBy = sortBy;
