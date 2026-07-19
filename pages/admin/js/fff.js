// customer-programs.js

let currentSchoolYearStart;
let allProgram = [];

// ======= חישוב השנה הנוכחית לפי תאריך =======
function getCurrentSchoolYear() {
  const today = new Date();
  let year = today.getFullYear();
  const month = today.getMonth() + 1; // 0-11

  if (month < 9) { // לפני ספטמבר
    year -= 1;
  }

  return year;
}

// ======= עדכון לייבל =======
function updateSchoolYearLabel(yearStart) {
  const label = document.getElementById('schoolYearLabel');
  if (label) label.textContent = `${yearStart}-${yearStart + 1}`;
}

// ======= טעינת תוכניות לפי שנה לימודית =======
async function loadCustomerProgramsBySchoolYear(custId, schoolYearStart) {
  const tbody = document.getElementById('classesBody');
  if (!tbody) return;

  tbody.innerHTML = '';

  const startDateLimit = `${schoolYearStart}-09-01`;
  const endDateLimit = `${schoolYearStart + 1}-08-31`;

  const { data, error } = await supabase
    .from('program_enrollments')
    .select(`
      id,
      start_date,
      end_date,
      status,
      programs!fk_enrollments_program (
        id,
        type_code,
        name,
        day,
        time,
        start_date,
        end_date
      )
    `)
    .eq('customer_id', custId)
    .gte('start_date', startDateLimit)
    .lte('start_date', endDateLimit)
    .order('start_date', { ascending: true });

  if (error) {
    console.error('שגיאה בשליפת תוכניות הלקוחה:', error);
    return;
  }

  allProgram = data;

  data.forEach(enrollment => {
    const tr = document.createElement('tr');

    const startDate = enrollment.start_date ? enrollment.start_date.split('T')[0] : '';
    const endDate = enrollment.end_date ? enrollment.end_date.split('T')[0] : '';

    tr.dataset.enrollmentId = enrollment.id;
    tr.dataset.programId = enrollment.programs?.id;

    tr.innerHTML = `
      <td>${enrollment.programs?.type_code || ''}</td>
      <td>${enrollment.programs?.name || ''}</td>
      <td>${enrollment.programs?.day || ''}</td>
      <td>${enrollment.programs?.time || ''}</td>
      <td><input type="date" class="start-date" value="${startDate}"></td>
      <td><input type="date" class="end-date" value="${endDate}"></td>
      <td class="flex gap-2 justify-center">
        <button class="action-btn attendance bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded-md shadow"
                title="סמן נוכחות"
                onclick="window.markAttendance(${enrollment.id})">
          🟢 נוכחות
        </button>
        <button class="action-btn delete bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded-md shadow"
                title="מחק"
                onclick="window.deleteCustomerProgram(${enrollment.id}, ${custId}, ${enrollment.programs.id})">
          🗑️ מחק
        </button>
      </td>
    `;

    tbody.appendChild(tr);
  });

  // חשיפת פונקציות למחיקה גלובלית
  window.deleteCustomerProgram = deleteCustomerProgram;
}

// ======= דפדוף שנים =======
function setupSchoolYearNavigation() {
  const prevBtn = document.getElementById('prevYearBtn');
  const nextBtn = document.getElementById('nextYearBtn');

  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      currentSchoolYearStart -= 1;
      updateSchoolYearLabel(currentSchoolYearStart);
      loadCustomerProgramsBySchoolYear(customerId, currentSchoolYearStart);
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      currentSchoolYearStart += 1;
      updateSchoolYearLabel(currentSchoolYearStart);
      loadCustomerProgramsBySchoolYear(customerId, currentSchoolYearStart);
    });
  }
}

// ======= אתחול אוטומטי =======
if (typeof customerId !== 'undefined' && customerId) {
  currentSchoolYearStart = getCurrentSchoolYear();
  updateSchoolYearLabel(currentSchoolYearStart);
  setupSchoolYearNavigation();
  loadCustomerProgramsBySchoolYear(customerId, currentSchoolYearStart);
}

// לחשיפת פונקציות גלובליות אם צריך מה-HTML
window.loadCustomerProgramsBySchoolYear = loadCustomerProgramsBySchoolYear;
window.updateSchoolYearLabel = updateSchoolYearLabel;
