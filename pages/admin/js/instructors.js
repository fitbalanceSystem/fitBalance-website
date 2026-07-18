const supabaseClient = window._sb;

let allInstructors = [];
let programsMap = {}; // instructor_id → [programs]

document.addEventListener('DOMContentLoaded', async () => {
  document.getElementById('newInstructorBtn')?.addEventListener('click', () => {
    window.location.href = 'instructor-form.html';
  });
  document.getElementById('exportInstructorsBtn')?.addEventListener('click', () => exportInstructorsCSV());
  document.getElementById('searchInput').addEventListener('input', renderTable);
  document.getElementById('activeFilter').addEventListener('change', renderTable);
  document.getElementById('viewModal').addEventListener('click', e => {
    if (e.target === document.getElementById('viewModal')) closeViewModal();
  });
  await loadInstructors();
});

function exportInstructorsCSV() {
  const headers = ['שם פרטי','שם משפחה','טלפון','אימייל','שכר למפגש'];
  const rows = allInstructors.map(i => [i.firstName,i.lastName,i.mobile,i.email,i.salary_per_session].map(v => `"${v||''}"`).join(','));
  const csv = '\uFEFF' + [headers.join(','), ...rows].join('\n');
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([csv],{type:'text/csv'})), download: 'מדריכות.csv' });
  a.click();
}

async function loadInstructors() {
  const [{ data: instructors }, { data: programs }] = await Promise.all([
    supabaseClient.from('instructors').select('*').order('firstName'),
    supabaseClient.from('programs').select('id, name, instructor_id').not('instructor_id', 'is', null),
  ]);
  allInstructors = instructors || [];
  programsMap = {};
  (programs || []).forEach(p => {
    if (!programsMap[p.instructor_id]) programsMap[p.instructor_id] = [];
    programsMap[p.instructor_id].push(p.name);
  });
  renderTable();
}

function renderTable() {
  const q = document.getElementById('searchInput').value.toLowerCase();
  const activeVal = document.getElementById('activeFilter').value;

  const filtered = allInstructors.filter(i => {
    const matchText =
      (i.firstName || '').toLowerCase().includes(q) ||
      (i.lastName || '').toLowerCase().includes(q) ||
      (i.mobile || '').includes(q);
    const isActive = i.is_active !== false; // ברירת מחדל: פעיל
    const matchActive =
      activeVal === 'all' ||
      (activeVal === 'active' && isActive) ||
      (activeVal === 'inactive' && !isActive);
    return matchText && matchActive;
  });

  document.getElementById('countBadge').textContent = filtered.length;
  const tbody = document.querySelector('#instructorsTable tbody');
  tbody.innerHTML = '';

  if (!filtered.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="text-center p-4 text-gray-400">אין מדריכות</td></tr>';
    return;
  }

  filtered.forEach(i => {
    const isActive = i.is_active !== false;
    const tr = document.createElement('tr');
    tr.style.cursor = 'pointer';
    tr.innerHTML = `
      <td>${i.firstName || ''}</td>
      <td>${i.lastName || ''}</td>
      <td>${i.mobile || ''}</td>
      <td>${i.email || ''}</td>
      <td>${i.salary_per_session != null ? i.salary_per_session + ' ₪' : '<span class="text-gray-400">—</span>'}</td>
      <td onclick="event.stopPropagation()">
        <label class="toggle-active">
          <input type="checkbox" ${isActive ? 'checked' : ''} onchange="toggleActive(${i.id}, this.checked)" />
          <span class="toggle-slider"></span>
        </label>
      </td>
      <td class="action-icons" onclick="event.stopPropagation()">
        <button class="action-btn" title="צפייה" onclick="openViewModal(${i.id})"><i class="fas fa-eye" style="color:#8b5cf6"></i></button>
        <button class="action-btn edit" title="עריכה" onclick="editInstructor(${i.id})"><i class="fas fa-edit"></i></button>
        <button class="action-btn delete" title="מחיקה" onclick="deleteInstructor(${i.id})"><i class="fas fa-trash-alt"></i></button>
      </td>`;
    tr.addEventListener('click', () => openViewModal(i.id));
    tbody.appendChild(tr);
  });
}

window.toggleActive = async (id, checked) => {
  await supabaseClient.from('instructors').update({ is_active: checked }).eq('id', id);
  const inst = allInstructors.find(i => i.id === id);
  if (inst) inst.is_active = checked;
};

window.openViewModal = (id) => {
  const i = allInstructors.find(x => x.id === id);
  if (!i) return;
  document.getElementById('vmAvatar').textContent = ((i.firstName||'?')[0] + (i.lastName||'?')[0]).toUpperCase();
  document.getElementById('vmFullName').textContent = `${i.firstName || ''} ${i.lastName || ''}`;
  const isActive = i.is_active !== false;
  document.getElementById('vmStatusBadge').innerHTML =
    `<span style="background:rgba(255,255,255,0.25);padding:3px 12px;border-radius:999px;">${isActive ? '✓ פעילה' : '✗ לא פעילה'}</span>`;
  document.getElementById('vmId').textContent = i.idValue || '-';
  document.getElementById('vmMobile').textContent = i.mobile || '-';
  document.getElementById('vmEmail').textContent = i.email || '-';
  document.getElementById('vmBirth').textContent = i.birthDate || '-';
  document.getElementById('vmAddress').textContent = i.address || '-';
  document.getElementById('vmSalary').textContent = i.salary_per_session != null ? i.salary_per_session + ' ₪' : 'לא הוגדר';
  const progs = programsMap[id];
  document.getElementById('vmPrograms').textContent = progs?.length ? progs.join(', ') : 'אין תוכניות';
  document.getElementById('vmEditBtn').onclick = () => editInstructor(id);
  document.getElementById('viewModal').classList.add('open');
};

window.closeViewModal = () => {
  document.getElementById('viewModal').classList.remove('open');
};

window.editInstructor = id => {
  window.location.href = `instructor-form.html?id=${id}`;
};

window.deleteInstructor = async id => {
  const i = allInstructors.find(x => x.id === id);
  if (!confirm(`האם למחוק את ${i?.firstName || ''} ${i?.lastName || ''}?`)) return;
  const { error } = await supabaseClient.from('instructors').delete().eq('id', id);
  if (error) { alert('שגיאה במחיקה: ' + error.message); return; }
  await loadInstructors();
};
