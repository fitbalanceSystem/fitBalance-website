import { supabase } from '../utilities/db.js';

// ── קבועים ──────────────────────────────────────────────────────────────────
const BASE_URL   = window.location.origin;
const SIGN_PATH  = '/pages/public/sign.html';

const STATUS_LABELS = {
  pending : { text: 'ממתין',   color: '#f59e0b', bg: '#fef3c7' },
  signed  : { text: 'נחתם',    color: '#10b981', bg: '#d1fae5' },
  expired : { text: 'פג תוקף', color: '#ef4444', bg: '#fee2e2' },
};

// ── state ────────────────────────────────────────────────────────────────────
let allRows      = [];
let activeForms  = [];
let selectedCustomer = null;

// ── init ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  await loadActiveForms();
  await loadAllFormRequests();
  bindEvents();
  setDefaultYear();
});

// ── טעינת טפסים פעילים לפילטר ───────────────────────────────────────────────
async function loadActiveForms() {
  activeForms = await window.formsService.getActiveForms();

  const filterSel = document.getElementById('formFilter');
  const typeSel   = document.getElementById('formTypeSelect');

  activeForms.forEach(f => {
    filterSel.innerHTML += `<option value="${f.form_key}">${f.name}</option>`;
    typeSel.innerHTML   += `<option value="${f.id}" data-key="${f.form_key}">${f.name}</option>`;
  });
}

// ── טעינת כל בקשות הטפסים ───────────────────────────────────────────────────
async function loadAllFormRequests() {
  const { data, error } = await supabase
    .from('customer_forms_view')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) { console.error(error); return; }
  allRows = data || [];
  renderTable(allRows);
}

// ── רינדור טבלה ─────────────────────────────────────────────────────────────
function renderTable(rows) {
  const tbody = document.getElementById('formsBody');

  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:32px;color:#9ca3af">אין נתונים להצגה</td></tr>`;
    return;
  }

  tbody.innerHTML = rows.map(r => {
    const st     = STATUS_LABELS[r.status] || STATUS_LABELS.pending;
    const sentAt = r.sent_at   ? new Date(r.sent_at).toLocaleDateString('he-IL')   : '—';
    const signAt = r.signed_at ? new Date(r.signed_at).toLocaleDateString('he-IL') : '—';
    const name   = `${r.customer_first_name || ''} ${r.customer_last_name || ''}`.trim() || '—';

    return `<tr>
      <td>
        <div style="font-weight:600">${name}</div>
        <div style="font-size:11px;color:#9ca3af">${r.customer_mobile || r.customer_email || ''}</div>
      </td>
      <td>${r.form_name || '—'}</td>
      <td>${r.activity_year ? `${r.activity_year}-${r.activity_year + 1}` : '—'}</td>
      <td>
        <span style="background:${st.bg};color:${st.color};padding:3px 10px;border-radius:999px;font-size:12px;font-weight:700">
          ${st.text}
        </span>
      </td>
      <td>${sentAt}</td>
      <td>${signAt}</td>
      <td>
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          ${r.status === 'pending' ? `
            <button onclick="copyLink('${r.token}')"
              style="background:#f3f0ff;color:#7c3aed;border:none;border-radius:8px;padding:5px 10px;font-size:12px;font-weight:600;cursor:pointer">
              <i class="fas fa-copy"></i> העתק קישור
            </button>` : ''}
          ${r.pdf_url ? `
            <button onclick="viewPdf('${r.pdf_url}')"
              style="background:#d1fae5;color:#065f46;border:none;border-radius:8px;padding:5px 10px;font-size:12px;font-weight:600;cursor:pointer">
              <i class="fas fa-file-pdf"></i> PDF
            </button>` : ''}
        </div>
      </td>
    </tr>`;
  }).join('');
}

// ── פילטור ───────────────────────────────────────────────────────────────────
function applyFilters() {
  const q      = document.getElementById('searchInput').value.trim().toLowerCase();
  const status = document.getElementById('statusFilter').value;
  const fKey   = document.getElementById('formFilter').value;

  const filtered = allRows.filter(r => {
    const name = `${r.customer_first_name || ''} ${r.customer_last_name || ''}`.toLowerCase();
    const matchQ = !q || name.includes(q) || (r.customer_mobile || '').includes(q);
    const matchS = !status || r.status === status;
    const matchF = !fKey   || r.form_key === fKey;
    return matchQ && matchS && matchF;
  });

  renderTable(filtered);
}

// ── יצירת קישור ──────────────────────────────────────────────────────────────
async function createLink() {
  const customerId   = document.getElementById('selectedCustomerId').value;
  const formId       = document.getElementById('formTypeSelect').value;
  const activityYear = parseInt(document.getElementById('activityYear').value) || null;

  if (!customerId) { alert('יש לבחור לקוח'); return; }
  if (!formId)     { alert('יש לבחור סוג טופס'); return; }

  const btn = document.getElementById('createLinkBtn');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> יוצר...';

  try {
    const result = await window.formsService.createFormRequest(
      parseInt(customerId), parseInt(formId), activityYear
    );
    const link = `${BASE_URL}${SIGN_PATH}?token=${result.token}`;
    document.getElementById('linkInput').value = link;
    document.getElementById('linkWrap').style.display = 'block';
    btn.innerHTML = '<i class="fas fa-check"></i> נוצר!';
    await loadAllFormRequests();
  } catch (e) {
    console.error(e);
    alert('שגיאה ביצירת הקישור: ' + e.message);
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-link"></i> צור קישור';
  }
}

// ── העתקת קישור ──────────────────────────────────────────────────────────────
window.copyLink = function(token) {
  const link = `${BASE_URL}${SIGN_PATH}?token=${token}`;
  navigator.clipboard.writeText(link).then(() => {
    alert('הקישור הועתק ✅');
  }).catch(() => {
    prompt('העתק את הקישור:', link);
  });
};

// ── צפייה ב-PDF — path הוא Storage path, לא URL ישיר ────────────────────────
window.viewPdf = async function(path) {
  if (!path) {
    alert('קובץ ה-PDF אינו זמין.');
    return;
  }
  try {
    const url = await window.pdfService.getSignedUrl(path);
    window.open(url, '_blank');
  } catch (e) {
    alert('שגיאה בפתיחת ה-PDF: ' + e.message);
  }
};

// ── חיפוש לקוחות ─────────────────────────────────────────────────────────────
async function searchCustomers(q) {
  if (q.length < 2) {
    document.getElementById('customerResults').style.display = 'none';
    return;
  }
  const { data } = await supabase
    .from('customers')
    .select('id, firstName, lastName, mobile, email')
    .or(`firstName.ilike.%${q}%,lastName.ilike.%${q}%,mobile.ilike.%${q}%`)
    .limit(8);

  const results = document.getElementById('customerResults');
  if (!data?.length) { results.style.display = 'none'; return; }

  results.innerHTML = (data || []).map(c => `
    <div onclick="selectCustomer(${c.id}, '${c.firstName} ${c.lastName}')"
      style="padding:10px 14px;cursor:pointer;font-size:13px;border-bottom:1px solid #f3f0ff;transition:background .15s"
      onmouseover="this.style.background='#f3f0ff'" onmouseout="this.style.background='white'">
      <div style="font-weight:600">${c.firstName} ${c.lastName}</div>
      <div style="font-size:11px;color:#9ca3af">${c.mobile || c.email || ''}</div>
    </div>`).join('');
  results.style.display = 'block';
}

window.selectCustomer = function(id, name) {
  document.getElementById('selectedCustomerId').value = id;
  document.getElementById('customerSearch').value     = name;
  document.getElementById('selectedCustomerName').textContent = `✓ ${name}`;
  document.getElementById('selectedCustomerName').style.display = 'block';
  document.getElementById('customerResults').style.display = 'none';
};

// ── שנת ברירת מחדל ────────────────────────────────────────────────────────────
function setDefaultYear() {
  const m = new Date().getMonth() + 1;
  const y = new Date().getFullYear();
  document.getElementById('activityYear').value = m >= 9 ? y : y - 1;
}

// ── bind events ───────────────────────────────────────────────────────────────
function bindEvents() {
  document.getElementById('searchInput').addEventListener('input', applyFilters);
  document.getElementById('statusFilter').addEventListener('change', applyFilters);
  document.getElementById('formFilter').addEventListener('change', applyFilters);

  document.getElementById('openSendModalBtn').addEventListener('click', () => {
    document.getElementById('sendModal').style.display = 'flex';
    document.getElementById('linkWrap').style.display  = 'none';
    document.getElementById('selectedCustomerId').value = '';
    document.getElementById('selectedCustomerName').style.display = 'none';
    document.getElementById('customerSearch').value = '';
    document.getElementById('createLinkBtn').disabled = false;
    document.getElementById('createLinkBtn').innerHTML = '<i class="fas fa-link"></i> צור קישור';
  });

  document.getElementById('closeSendModal').addEventListener('click',  closeModal);
  document.getElementById('cancelSendBtn').addEventListener('click',   closeModal);
  document.getElementById('createLinkBtn').addEventListener('click',   createLink);

  document.getElementById('copyLinkBtn').addEventListener('click', () => {
    const val = document.getElementById('linkInput').value;
    navigator.clipboard.writeText(val).then(() => {
      document.getElementById('copyLinkBtn').innerHTML = '<i class="fas fa-check"></i> הועתק!';
      setTimeout(() => {
        document.getElementById('copyLinkBtn').innerHTML = '<i class="fas fa-copy"></i> העתק';
      }, 2000);
    });
  });

  let searchTimer;
  document.getElementById('customerSearch').addEventListener('input', e => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => searchCustomers(e.target.value.trim()), 300);
  });

  // סגירה בלחיצה על הרקע
  document.getElementById('sendModal').addEventListener('click', e => {
    if (e.target === document.getElementById('sendModal')) closeModal();
  });
}

function closeModal() {
  document.getElementById('sendModal').style.display = 'none';
}
