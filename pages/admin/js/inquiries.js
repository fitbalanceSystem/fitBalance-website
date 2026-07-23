const PROGRAM_LABELS = { 1: "ילדות (ג'–ו')", 2: "נערות (ז'–י\"ב)", 3: 'נשים' };
const STATUS_LABELS  = { new: 'חדשה', contacted: 'טופלה', joined: 'הצטרפה', closed: 'סגורה' };
const STATUS_CLASS   = { new: 'status-new', contacted: 'status-contacted', joined: 'status-joined', closed: 'status-closed' };

const PAGE_SIZE = 20;
let allRows = [], filtered = [], page = 1, currentId = null;

async function load() {
  const { data, error } = await window._sb
    .from('inquiries')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) { console.error(error); return; }
  allRows = data || [];
  updateKPIs();
  applyFilters();
}

function getProgramName(r) {
  return r.program_name || PROGRAM_LABELS[r.program_code] || '—';
}

function updateKPIs() {
  document.getElementById('kpiTotal').textContent     = allRows.length;
  document.getElementById('kpiNew').textContent       = allRows.filter(r => !r.status || r.status === 'new').length;
  document.getElementById('kpiContacted').textContent = allRows.filter(r => r.status === 'contacted').length;
  document.getElementById('kpiJoined').textContent    = allRows.filter(r => r.status === 'joined').length;
}

function applyFilters() {
  const q  = document.getElementById('searchInput').value.trim().toLowerCase();
  const st = document.getElementById('statusFilter').value;
  const pr = document.getElementById('programFilter').value;

  filtered = allRows.filter(r => {
    const name = `${r.child_name || ''} ${r.last_name || ''} ${r.mother_name || ''}`.toLowerCase();
    const phone = (r.phone || '').toLowerCase();
    if (q && !name.includes(q) && !phone.includes(q)) return false;
    if (st && (r.status || 'new') !== st) return false;
    if (pr && String(r.program_code) !== pr) return false;
    return true;
  });

  page = 1;
  render();
}

function render() {
  const total = filtered.length;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  page = Math.min(page, pages);
  const slice = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  document.getElementById('countBadge').textContent = total;
  document.getElementById('pageInfo').textContent   = `עמוד ${page} מתוך ${pages}`;
  document.getElementById('prevPage').disabled      = page <= 1;
  document.getElementById('nextPage').disabled      = page >= pages;

  const tbody = document.getElementById('tableBody');
  tbody.innerHTML = slice.map(r => {
    const status   = r.status || 'new';
    const fullName = [r.child_name, r.last_name].filter(Boolean).join(' ') || '—';
    const date     = r.created_at ? new Date(r.created_at).toLocaleDateString('he-IL') : '—';
    const prog     = getProgramName(r);
    return `<tr style="border-bottom:1px solid #f3f0ff;transition:background .15s;" onmouseover="this.style.background='#faf9ff'" onmouseout="this.style.background=''">
      <td style="padding:12px 16px;color:#6b7280;font-size:12px;">${date}</td>
      <td style="padding:12px 16px;font-weight:600;">${fullName}</td>
      <td style="padding:12px 16px;color:#374151;">${r.mother_name || '—'}</td>
      <td style="padding:12px 16px;"><a href="tel:${r.phone}" style="color:#7c3aed;text-decoration:none;">${r.phone || '—'}</a></td>
      <td style="padding:12px 16px;color:#374151;">${r.grade || '—'}</td>
      <td style="padding:12px 16px;color:#374151;">${prog}</td>
      <td style="padding:12px 16px;"><span class="status-badge ${STATUS_CLASS[status]}">${STATUS_LABELS[status]}</span></td>
      <td style="padding:12px 16px;display:flex;gap:6px;">
        <button onclick="openView(${r.id})" style="background:#f3f0ff;color:#7c3aed;border:1px solid #ede9fe;border-radius:8px;padding:5px 12px;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;">צפייה</button>
        <button onclick="convertToCustomer(${r.id})" style="background:linear-gradient(135deg,#10b981,#059669);color:white;border:none;border-radius:8px;padding:5px 12px;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;">+ לקוחה</button>
      </td>
    </tr>`;
  }).join('');
}

function openView(id) {
  const r = allRows.find(x => x.id === id);
  if (!r) return;
  currentId = id;
  const fullName = [r.child_name, r.last_name].filter(Boolean).join(' ') || '—';
  document.getElementById('vmAvatar').textContent  = (r.child_name || '?')[0];
  document.getElementById('vmName').textContent    = fullName;
  document.getElementById('vmSub').textContent     = getProgramName(r);
  document.getElementById('vmParent').textContent  = r.mother_name || '—';
  document.getElementById('vmPhone').textContent   = r.phone || '—';
  document.getElementById('vmEmail').textContent   = r.email || '—';
  document.getElementById('vmGrade').textContent   = r.grade || '—';
  document.getElementById('vmProgram').textContent = getProgramName(r);
  document.getElementById('vmNote').textContent    = r.note || '—';
  document.getElementById('vmNotes').textContent   = r.notes || '—';
  document.getElementById('vmDate').textContent    = r.created_at ? new Date(r.created_at).toLocaleString('he-IL') : '—';
  document.getElementById('vmStatusSelect').value  = r.status || 'new';
  document.getElementById('viewModal').classList.add('open');
}

function closeView() {
  document.getElementById('viewModal').classList.remove('open');
  currentId = null;
}

async function saveStatus() {
  if (!currentId) return;
  const status = document.getElementById('vmStatusSelect').value;
  const { error } = await window._sb.from('inquiries').update({ status }).eq('id', currentId);
  if (error) { alert('שגיאה בשמירה'); return; }
  const row = allRows.find(r => r.id === currentId);
  if (row) row.status = status;
  updateKPIs();
  applyFilters();
  closeView();
}

function convertToCustomer(id) {
  const r = allRows.find(x => x.id === id);
  if (!r) return;
  const prefill = JSON.stringify({
    firstName:  r.child_name  || '',
    lastName:   r.last_name   || '',
    mobile:     r.phone       || '',
    email:      r.email       || '',
    inquiry_id: r.id
  });
  window.location.href = `customer-form.html?prefill=${encodeURIComponent(prefill)}`;
}
window.convertToCustomer = convertToCustomer;

function exportCSV() {
  const headers = ['תאריך','שם ילדה','שם משפחה','שם הורה','טלפון','מייל','כיתה','תוכנית','סטטוס','הערה','הערות'];
  const rows = filtered.map(r => [
    r.created_at ? new Date(r.created_at).toLocaleDateString('he-IL') : '',
    r.child_name || '', r.last_name || '', r.mother_name || '',
    r.phone || '', r.email || '', r.grade || '',
    getProgramName(r),
    STATUS_LABELS[r.status || 'new'] || '',
    r.note || '', r.notes || ''
  ]);
  const csv = '\uFEFF' + [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
  a.download = 'מתעניינות.csv';
  a.click();
}

document.addEventListener('DOMContentLoaded', () => {
  load();
  document.getElementById('searchInput').addEventListener('input', applyFilters);
  document.getElementById('statusFilter').addEventListener('change', applyFilters);
  document.getElementById('programFilter').addEventListener('change', applyFilters);
  document.getElementById('prevPage').addEventListener('click', () => { page--; render(); });
  document.getElementById('nextPage').addEventListener('click', () => { page++; render(); });
  document.getElementById('vmSaveBtn').addEventListener('click', saveStatus);
  document.getElementById('vmConvertBtn').addEventListener('click', () => { if (currentId) convertToCustomer(currentId); });
  document.getElementById('exportBtn').addEventListener('click', exportCSV);
  document.getElementById('viewModal').addEventListener('click', e => { if (e.target === document.getElementById('viewModal')) closeView(); });
});
