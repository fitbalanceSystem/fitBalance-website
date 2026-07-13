import { supabase, fetchItems, updateItem, upsert } from '../utilities/db.js';
import * as methods from '../utilities/methods.js';
import '../utilities/main.js';
import { populateSelectFromCodeTable, loadAllCodeTables} from '../utilities/code-tables.js';

// import { supabase, fetchItems, insertItem, updateItem, deleteItem } from '../utilities/db.js';
// import '../utilities/main.js';
// import { populateSelectFromCodeTable } from '../utilities/code-tables.js';

let idCustomer;
let notesData = [];
let currentEnrollmentId = null;
let currentSchoolYearStart;
let allProgram = [];

// חשיפה גלובלית
window.markAttendance = markAttendance;
window.loadCustomerProgramsBySchoolYear = loadCustomerProgramsBySchoolYear;
window.loadCustomerPrograms = loadCustomerPrograms;
window.updateSchoolYearLabel = updateSchoolYearLabel;

// מיד בפתיחת הטופס - הצגת נתוני לקוח
document.addEventListener('DOMContentLoaded', async () => {
  
console.log("YYY1");

  const params = new URLSearchParams(window.location.search);
  const customerId = parseInt(params.get('id'), 10);
  idCustomer = customerId;

  const isPregnantCheckbox = document.getElementById("isPregnant");
  const dueDateInput = document.getElementById("dueDate");

  function toggleDueDate() {
    if (isPregnantCheckbox.checked) {
      dueDateInput.disabled = false;
    } else {
      dueDateInput.disabled = true;
      dueDateInput.value = ""; // איפוס ערך
    }
  }
  

  toggleDueDate();
  isPregnantCheckbox.addEventListener("change", toggleDueDate);
console.log("YYY");
  // לקוח קיים / עריכת פרטי לקוח
  if (customerId) {
 
    // מצב עריכה – טען נתונים
    const { data: dataCustomers, error } = await supabase
      .from('customers')
      .select('*')
      .eq('id', customerId)
      .single();

    if (error) {
      alert('שגיאה בטעינת נתוני לקוחה: ' + error.message);
      return;
    }



    // שדות טופס
    document.getElementById('idNumber').value = dataCustomers.idValue || '';
    document.getElementById('firstName').value = dataCustomers.firstName || '';
    document.getElementById('lastName').value = dataCustomers.lastName || '';
    document.getElementById('birthDate').value = dataCustomers.birthDate || '';
    document.getElementById('city').value = dataCustomers.city || '';
    document.getElementById('street').value = dataCustomers.street || '';
    document.getElementById('houseNumber').value = dataCustomers.houseNo || '';
    document.getElementById('mobile').value = dataCustomers.mobile || '';
    document.getElementById('email').value = dataCustomers.email || '';
    document.getElementById('arnonaId').value = dataCustomers.payerId || '';
    document.getElementById('arnonaFirstName').value = dataCustomers.payerFirstName || '';
    document.getElementById('arnonaLastName').value = dataCustomers.payerLastName || '';
    document.getElementById('arnonaMobile').value = dataCustomers.payerMobile || '';
    document.getElementById('arnonaEmail').value = dataCustomers.payerEmail || '';

    document.getElementById('checkbox1').checked = !!dataCustomers.isSignedHealthForm;
    document.getElementById('checkbox2').checked = !!dataCustomers.issignedRegisTrationPolicy;
    document.getElementById('checkbox3').checked = !!dataCustomers.inWhatsAppList;
    document.getElementById('checkbox4').checked = !!dataCustomers.inEmailList;
    document.getElementById('checkbox5').checked = !!dataCustomers.whatsapp_broadcast;
    document.getElementById('checkbox6').checked = !!dataCustomers.whatsapp_members_group;
    document.getElementById('isPregnant').checked = !!dataCustomers.isPregnant;
    document.getElementById('dueDate').value = dataCustomers.expectedDueDate || '';

    await loadStatusOptions(dataCustomers.status_code);

    if (customerId) {
      const { data: dataNotes, errorNotes } = await supabase
        .from('customer_notes')
        .select('*')
        .eq('customer_code', customerId);
    
      if (errorNotes) {
        console.error(errorNotes);
      } else {
        notesData = dataNotes || [];
        renderNotesTable(); // הצגת ההערות בדף
      }
    }
    


    toggleDueDate(); // להריץ שוב בהתאם לערך isPregnant
  }

  // שמירת הנתונים בטופס
  async function saveCustomer() {

    const saveStatus = document.getElementById('saveStatus');
    saveStatus.style.display = 'inline';
    saveStatus.textContent = '⏳ שומר...';

    const houseNoValue = document.getElementById('houseNumber').value.trim();
    const houseNo = houseNoValue ? parseInt(houseNoValue, 10) : null;

console.log(customerId);
  
    const data = {
      ...(customerId && { id: customerId }),
      expectedDueDate: document.getElementById('dueDate').value || null,
      idValue: document.getElementById('idNumber').value.trim() || null,
      firstName: document.getElementById('firstName').value.trim() || null,
      lastName: document.getElementById('lastName').value.trim() || null,
      birthDate: document.getElementById('birthDate').value || null,
      city: document.getElementById('city').value.trim() || null,
      street: document.getElementById('street').value.trim() || null,
      houseNo: houseNo || null,
      mobile: document.getElementById('mobile').value.trim() || null,
      email: document.getElementById('email').value.trim() || null,
      payerId: document.getElementById('arnonaId').value.trim() || null,
      payerFirstName: document.getElementById('arnonaFirstName').value.trim() || null,
      payerLastName: document.getElementById('arnonaLastName').value.trim() || null,
      payerMobile: document.getElementById('arnonaMobile').value.trim() || null,
      payerEmail: document.getElementById('arnonaEmail').value.trim() || null,
      isSignedHealthForm: document.getElementById('checkbox1').checked || null,
      issignedRegisTrationPolicy: document.getElementById('checkbox2').checked || null,
      inWhatsAppList: document.getElementById('checkbox3').checked || null,
      inEmailList: document.getElementById('checkbox4').checked || null,
      whatsapp_broadcast: document.getElementById('checkbox5').checked || null,
      whatsapp_members_group: document.getElementById('checkbox6').checked || null,
      isPregnant: document.getElementById('isPregnant').checked || null,
      status_code: document.getElementById("status").value || null,
    };
    console.log(data);
    const result = await upsert('customers', data);
    console.log('upsert result:', result);
    if (result && !result.error)
      {saveStatus.textContent = '✅ נשמר בהצלחה';
      setTimeout(() => (saveStatus.style.display = 'none'), 2000);}
    else
      {alert('אירעה שגיאה בשמירת הנתונים. נסה שנית.');
      saveStatus.style.display = 'none';}

    // try {
    //   // שימוש ב-upsert לשמירה מהירה (הוספה או עדכון)
    //   const { error } = await supabase
    //     .from('customers')
    //     .upsert([data]);

    //   if (error) throw error;

    //   saveStatus.textContent = '✅ נשמר בהצלחה';
    //   setTimeout(() => (saveStatus.style.display = 'none'), 2000);
    // } catch (err) {
    //   console.error('שגיאה בשמירת נתונים:', err);
    //   alert('אירעה שגיאה בשמירת הנתונים. נסה שנית.');
    //   saveStatus.style.display = 'none';
    // }
  }

  // מחבר את כפתור השמירה לאירוע
  document.querySelectorAll('.save-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      await saveCustomer();
      sessionStorage.setItem('reloadCustomers', 'true');
      close();
    });
  });
  

  // ביטול
  document.querySelector('.cancel-btn').addEventListener('click', (e) => {
    e.preventDefault();
    close();
  });
});

// ?? 
document.addEventListener('DOMContentLoaded', async () => {
  const pageTitle = document.querySelector('title');
  const heading = document.querySelector('h1');

  // שליפת הפרמטר id מה-URL
  const params = new URLSearchParams(window.location.search);
  const customerId = params.get('id');

  if (customerId) {
    // עריכת לקוחה – נשלוף את שמה
    const { data, error } = await supabase
      .from('customers')
      .select('firstName, lastName')
      .eq('id', customerId)
      .single();

    if (data) {
      const fullName = `${data.firstName} ${data.lastName}`;
      pageTitle.textContent = fullName;
      heading.textContent =fullName;
    } else {
      // אם לא נמצאה לקוחה – טקסט ברירת מחדל
      pageTitle.textContent = 'עריכת לקוחה';
      heading.textContent = 'עריכת לקוחה';
    }
  } else {
    // טופס רישום לקוח חדש
    pageTitle.textContent = 'טופס רישום לקוח';
    heading.textContent = 'טופס רישום לקוח';
  }
});


// מריץ כשנטען הדף
document.addEventListener("DOMContentLoaded", () => loadStatusOptions());

// טעינת סטטוסים ידניים לבחירה בטופס
function loadStatusOptions(selectedCode = null) {
  const statusSelect = document.getElementById("status");
  statusSelect.innerHTML = "";

  const options = [
    { value: '', label: 'אוטומטי (לפי נתונים)' },
    { value: 'frozen', label: 'בהקפאה' },
    { value: 'left', label: 'פרשה' },
    { value: 'not_interested', label: 'לא מעוניינת' },
  ];

  options.forEach(opt => {
    const option = document.createElement("option");
    option.value = opt.value;
    option.textContent = opt.label;
    if (selectedCode === opt.value || (!selectedCode && opt.value === '')) {
      option.selected = true;
    }
    statusSelect.appendChild(option);
  });
}





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

// ======= עדכון לייבל השנה =======
function updateSchoolYearLabel(yearStart) {
  const label = document.getElementById('schoolYearLabel');
  if (label) label.textContent = `${yearStart}-${yearStart + 1}`;
}




// ======= טעינת תוכניות לפי שנה לימודית =======
async function loadCustomerProgramsBySchoolYear(customerId, schoolYearStart) {
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
        end_date,
        price
      )
    `)
    .eq('customer_id', customerId)
    .gte('start_date', startDateLimit)
    .lte('start_date', endDateLimit)
    .order('start_date', { ascending: true });

  if (error) {
    console.error('שגיאה בשליפת תוכניות הלקוחה:', error);
    return;
  }

  allProgram = data;

  if (!data || data.length === 0) {
    tbody.innerHTML = `<tr class="no-programs"><td colspan="7" class="text-center py-4">אין תוכניות לשנה זו</td></tr>`;
    return;
  }

  const noProgramsRow = tbody.querySelector('.no-programs');
  if (noProgramsRow) noProgramsRow.remove();

  data.forEach(enrollment => {
    const tr = document.createElement('tr');

    const startDate = enrollment.start_date ? enrollment.start_date.split('T')[0] : '';
    const endDate = enrollment.end_date ? enrollment.end_date.split('T')[0] : '';

    // חישוב חודשים מלאים
    const months = calcMonths(startDate, endDate);
    const price = enrollment.programs?.price ?? 0;
    const totalDue = months * price;

    // dataset לשימוש כללי, optional
    tr.dataset.enrollmentId = enrollment.id;
    tr.dataset.code = enrollment.programs?.id;

    tr.innerHTML = `
      <td>
        <input type="hidden" class="program-id" value="${enrollment.programs?.id || ''}">
        ${enrollment.programs?.type_code || ''}
      </td>
      <td>${enrollment.programs?.name || ''}</td>
      <td>${enrollment.programs?.branch || ''}</td>
      <td>${enrollment.programs?.day || ''}</td>
      <td>${enrollment.programs?.time || ''}</td>
      <td><input type="date" class="start-date" value="${startDate}"></td>
      <td><input type="date" class="end-date" value="${endDate}"></td>
      <td>${price > 0 ? price + ' ₪' : '-'}</td>
      <td class="total-due">${totalDue > 0 ? totalDue + ' ₪' : '-'}</td>
      <td class="paid-cell">...</td>
      <td class="debt-cell">...</td>
      <td class="flex gap-2 justify-center">
        <button class="action-btn attendance bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded-md shadow"
                title="סמן נוכחות"
                onclick="window.markAttendance(${enrollment.id})">
          🟢 נוכחות
        </button>
        <button class="action-btn delete bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded-md shadow"
                title="מחק"
                onclick="window.deleteCustomerProgram(${enrollment.id}, ${customerId}, ${enrollment.programs.id})">
          🗑️ מחק
        </button>
        <button class="action-btn bg-purple-500 hover:bg-purple-600 text-white px-2 py-1 rounded-md shadow"
                title="תשלום"
                onclick="window.openPaymentModal(${enrollment.id}, '${(enrollment.programs?.name || '').replace(/'/g, "\\'")}'  , ${enrollment.programs?.price ?? 'null'})">
          💳 תשלום
        </button>
        <button class="action-btn bg-yellow-500 hover:bg-yellow-600 text-white px-2 py-1 rounded-md shadow"
                title="היסטוריית תשלומים"
                onclick="window.openPaymentHistory(${enrollment.id}, '${(enrollment.programs?.name || '').replace(/'/g, "\\'")}'  )">
          📜 היסטוריה
        </button>
      </td>
      <input type="hidden" class="enrollment-id" value="${enrollment.id}">
    `;

    tbody.appendChild(tr);

    // שליפת סכום שולם וחישוב חוב באסינכ
    loadEnrollmentDebt(tr, enrollment.id, totalDue);
  });

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
      loadCustomerProgramsBySchoolYear(idCustomer, currentSchoolYearStart);
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      currentSchoolYearStart += 1;
      updateSchoolYearLabel(currentSchoolYearStart);
      loadCustomerProgramsBySchoolYear(idCustomer, currentSchoolYearStart);
    });
  }
}






// ??
async function loadDB1(nameTable) {
  const { data, error } = await supabaseClient
    .from(nameTable)
    .select("*");

  if (error) {
    console.error("שגיאה בטעינת טבלת ${nameTable}:", error.message);
    return [];
  }
  return data;
}



// ??
async function close() {
  sessionStorage.setItem('resetSearch', 'true');
    window.history.back();
}


// האזנה לפתיחת מודאל תוכניות
window.openClassesModal = async function () {
  document.getElementById('classesModal').style.display = 'flex';
  await loadModalPrograms();
};


// ======= טעינת תוכניות לפי שנה לימודית =======
// async function loadCustomerProgramsBySchoolYear(customerId, schoolYearStart) {
//   const tbody = document.getElementById('classesBody');
//   if (!tbody) return;

//   tbody.innerHTML = '';

//   const startDateLimit = `${schoolYearStart}-09-01`;
//   const endDateLimit = `${schoolYearStart + 1}-08-31`;

//   const { data, error } = await supabase
//     .from('program_enrollments')
//     .select(`
//       id,
//       start_date,
//       end_date,
//       status,
//       programs!fk_enrollments_program (
//         id,
//         type_code,
//         name,
//         day,
//         time,
//         start_date,
//         end_date
//       )
//     `)
//     .eq('customer_id', customerId)
//     .gte('start_date', startDateLimit)
//     .lte('start_date', endDateLimit)
//     .order('start_date', { ascending: true });

//   if (error) {
//     console.error('שגיאה בשליפת תוכניות הלקוחה:', error);
//     return;
//   }

//   allProgram = data;

//   if (data.length === 0) {
//     tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4">אין תוכניות לשנה זו</td></tr>`;
//     return;
//   }

//   data.forEach(enrollment => {
//     const tr = document.createElement('tr');

//     const startDate = enrollment.start_date ? enrollment.start_date.split('T')[0] : '';
//     const endDate = enrollment.end_date ? enrollment.end_date.split('T')[0] : '';

//     tr.dataset.enrollmentId = enrollment.id;
//     tr.dataset.programId = enrollment.programs?.id;

//     tr.innerHTML = `
//       <td>${enrollment.programs?.type_code || ''}</td>
//       <td>${enrollment.programs?.name || ''}</td>
//       <td>${enrollment.programs?.day || ''}</td>
//       <td>${enrollment.programs?.time || ''}</td>
//       <td><input type="date" class="start-date" value="${startDate}"></td>
//       <td><input type="date" class="end-date" value="${endDate}"></td>
//       <td class="flex gap-2 justify-center">
//         <button class="action-btn attendance bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded-md shadow"
//                 title="סמן נוכחות"
//                 onclick="window.markAttendance(${enrollment.id})">
//           🟢 נוכחות
//         </button>
//         <button class="action-btn delete bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded-md shadow"
//                 title="מחק"
//                 onclick="window.deleteCustomerProgram(${enrollment.id}, ${customerId}, ${enrollment.programs.id})">
//           🗑️ מחק
//         </button>
//       </td>
//     `;

//     tbody.appendChild(tr);
//   });

//   window.deleteCustomerProgram = deleteCustomerProgram;
// }


// טעינת התוכניות לטבלה עם צ'קבוקס
window.loadModalPrograms = async function loadModalPrograms() {
  const tbody = document.querySelector("#modalClassesTable tbody");
  tbody.innerHTML = "";

  const showAll = document.getElementById('showAllProgramsCheckbox')?.checked;
  const today = new Date().toISOString().split('T')[0];
  const dayNames = ['ראשון','שני','שלישי','רביעי','חמישי','שישי','שבת'];

  let query = supabase.from("programs").select("*").order('start_date', { ascending: false });
  if (!showAll) {
    query = query.lte('start_date', today).gte('end_date', today);
  }

  const { data, error } = await query;

  if (error) {
    console.error("שגיאה בטעינת תוכניות:", error);
    return;
  }

  if (!data.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-gray-400">אין תוכניות להצגה</td></tr>`;
    return;
  }

  data.forEach(program => {
    const tr = document.createElement("tr");
    tr.dataset.code = program.id;

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "program-checkbox";
    checkbox.value = program.id;

    const checkboxTd = document.createElement("td");
    checkboxTd.appendChild(checkbox);
    tr.appendChild(checkboxTd);

    // המרת מספר יום לשם יום
    let dayDisplay = program.day || '';
    const dayNum = parseInt(program.day);
    if (!isNaN(dayNum) && dayNum >= 1 && dayNum <= 7) {
      dayDisplay = dayNames[dayNum - 1];
    }

    const columns = [
      program.type,
      program.name,
      dayDisplay,
      program.time,
      program.branch,
      program.start_date,
      program.end_date
    ];

    columns.forEach(text => {
      const td = document.createElement("td");
      td.textContent = text || '';
      tr.appendChild(td);
    });

    tr.addEventListener("click", function (e) {
      if (e.target !== checkbox) checkbox.checked = !checkbox.checked;
      tr.style.background = checkbox.checked ? '#f3f0ff' : '';
    });

    tbody.appendChild(tr);
  });
}

// סגירת מודאל תוכניות
function closeModal1() {
  document.getElementById('classesModal').style.display = 'none';
}

// האזנה ללחצן סגירה במודאל תוכניות
document.addEventListener("DOMContentLoaded", function () {
  document.getElementById("closeModalBtn").addEventListener("click", function () {
    closeModal1();
  });
});

// האזנה ללחצן הוסף נבחרים (במודאל תוכניות)
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("addSelectedBtn").addEventListener("click", addSelectedPrograms);
});

// כפתור הוספת כל הצ'קבוקסים המסומנים
async function addSelectedPrograms() {
  const selectedRows = document.querySelectorAll('#modalClassesTable tbody input[type="checkbox"]:checked');
  const classesBody = document.getElementById('classesBody');

  if (!selectedRows.length) {
    alert("לא נבחרו תוכניות להוספה.");
    return;
  }

  // ✅ הסרת הודעת "אין תוכניות" אם קיימת
  const emptyRow = classesBody.querySelector('tr td[colspan="7"].text-center');
  if (emptyRow) {
    emptyRow.parentElement.remove();
  }

  for (const cb of selectedRows) {
    const row = cb.closest('tr');
    console.log(row);
    const code = row.dataset.code || row.getAttribute('data-code');

    // דילוג אם כבר קיימת בתצוגה
    // if ([...classesBody.querySelectorAll('tr')].some(r => r.dataset.code === code)) continue;

    const startDate = row.cells[6].innerText.trim();
    const endDate = row.cells[7].innerText.trim();

    // הוספה ל־DB
    const { data: insertedEnrollment, error: insertError } = await supabase
      .from("program_enrollments")
      .insert([{
        customer_id: idCustomer,
        program_id: parseInt(code),
        start_date: startDate || null,
        end_date: endDate || null
      }])
      .select()
      .single();

    if (insertError) {
      console.error("שגיאה בהוספת תוכנית:", insertError);
      alert(`שגיאה בהוספת תוכנית "${row.cells[2].innerText}"`);
      continue;
    }
  }

  closeModal1();
  await loadCustomerPrograms(idCustomer);
  alert("התוכניות נוספו בהצלחה ✅");
}











// האזנה לשמירת תוכניות
document.addEventListener('DOMContentLoaded', () => {
  const saveBtn = document.getElementById('saveProgramsBtn');
  saveBtn.addEventListener('click', savePrograms);
});

// שמור תוכניות
async function savePrograms() {
  try {
    methods.showLoader();

    const rows = document.querySelectorAll('#classesBody tr');
    if (!rows.length) {
      Swal.fire('אין תוכניות', 'לא נמצאו תוכניות לשמירה.', 'info');
      methods.hideLoader();
      return;
    }

    const programsToSave = [];
    const errors = [];
    console.log("rows");
    console.log(rows);
    // 🔹 1️⃣ קריאת ערכים מהטבלה ובדיקת תאריכים חוקיים
    rows.forEach(row => {
      console.log("row.dataset.code");
      console.log(row.dataset.code);
      const programId = parseInt(row.dataset.code, 10);
      const enrollmentId = parseInt(row.dataset.enrollmentId, 10) || undefined;

      const startDate = row.querySelector('.start-date')?.value;
      const endDate = row.querySelector('.end-date')?.value;
      console.log("programId");
console.log(programId);
      if (!programId) return; // דילוג על שורה בלי תוכנית
      if (!startDate || !endDate) {
        errors.push(`תוכנית ${programId} חסרה תאריך התחלה או סיום`);
        return;
      }

      if (new Date(startDate) > new Date(endDate)) {
        errors.push(`תוכנית ${programId}: תאריך התחלה גדול מתאריך סיום`);
        return;
      }

      const programObj = {
        customer_id: idCustomer,
        program_id: programId,
        start_date: startDate,
        end_date: endDate
      };
      console.log("programObj");
      console.log(programObj);
      if (enrollmentId) programObj.id = enrollmentId;

      

      programsToSave.push(programObj);
    });
    if (errors.length) {
      Swal.fire('שגיאות בתאריכים', errors.join('<br>'), 'error');
      methods.hideLoader();
      return;
    }

    // 🔹 2️⃣ בדיקה מול תוכניות מקור
    const { data: programsMeta, error: metaError } = await supabase
      .from('programs')
      .select('id, start_date, end_date');
    if (metaError) throw metaError;

    const programsMetaMap = new Map(programsMeta.map(p => [p.id, p]));

    const metaErrors = [];
    programsToSave.forEach(p => {
      const progInfo = programsMetaMap.get(p.program_id);
      if (!progInfo) return;
      if (new Date(p.start_date) < new Date(progInfo.start_date)) {
        metaErrors.push(`תוכנית ${p.program_id}: תאריך התחלה קטן מהתחלת התוכנית`);
      }
      if (new Date(p.end_date) > new Date(progInfo.end_date)) {
        metaErrors.push(`תוכנית ${p.program_id}: תאריך סיום גדול מסיום התוכנית`);
      }
    });

    if (metaErrors.length) {
      Swal.fire('שגיאת תאריכים מול תוכניות', metaErrors.join('<br>'), 'error');
      methods.hideLoader();
      return;
    }
    console.log("programsToSave");
console.log(programsToSave);
    // 🔹 3️⃣ זיהוי תוכניות חדשות ושינויים
    const added = programsToSave.filter(p => !allProgram.some(a => a.program_id === p.program_id));
    const updated = programsToSave.filter(p => {
      const old = allProgram.find(a => a.program_id === p.program_id);
      if (!old) return false;
    
      const oldStart = old.start_date ? new Date(old.start_date).toISOString().split('T')[0] : null;
      const oldEnd = old.end_date ? new Date(old.end_date).toISOString().split('T')[0] : null;
    
      return oldStart !== p.start_date || oldEnd !== p.end_date;
    });

    if (added.length === 0 && updated.length === 0) {
      Swal.fire('אין שינויים', 'לא בוצעו שינויים בתוכניות.', 'info');
      methods.hideLoader();
      return;
    }

    const allChanges = [...added, ...updated];

    // 🔹 4️⃣ טיפול במפגשים ונוכחות
    for (const p of allChanges) {
      const { data: allSessions, error: sessionsError } = await supabase
        .from('program_sessions')
        .select('id, date')
        .eq('program_id', p.program_id);

      if (sessionsError) throw sessionsError;

      if (!allSessions || allSessions.length === 0) continue;

      // רשומות קיימות עבור הלקוחה
      const { data: existingAttendance } = await supabase
        .from('session_attendance')
        .select('session_id')
        .eq('customer_id', p.customer_id)
        .in('session_id', allSessions.map(s => s.id));

      const existingSessionIds = new Set(existingAttendance.map(a => a.session_id));

      // 🔹 יצירת רשומות חדשות עבור מפגשים שלא קיימים
      const newAttendanceRecords = allSessions
        .filter(s => !existingSessionIds.has(s.id))
        .map(s => ({
          customer_id: p.customer_id,
          session_id: s.id,
          is_present: false,
          status_code: 1
        }));

      if (newAttendanceRecords.length > 0) {
        await supabase.from('session_attendance').insert(newAttendanceRecords);
      }

      // 🔹 מחיקה של מפגשים שהחוצה מתאריכי התוכנית החדשה (קיצור)
      const sessionsToDelete = allSessions
        .filter(s => new Date(s.date) < new Date(p.start_date) || new Date(s.date) > new Date(p.end_date))
        .map(s => s.id);

      if (sessionsToDelete.length > 0) {
        await supabase
          .from('session_attendance')
          .delete()
          .eq('customer_id', p.customer_id)
          .in('session_id', sessionsToDelete);
      }
    }

    console.log("allChanges");
    console.log(allChanges);
    // 🔹 5️⃣ שמירה ב־DB עם upsert

    // 🔹 5️⃣ שמירה ב־DB – הפרדה בין חדשות לקיימות
const newPrograms = allChanges.filter(p => !p.id);
const existingPrograms = allChanges.filter(p => p.id);

if (newPrograms.length > 0) {
  const { data: inserted, error: insertError } = await supabase
    .from('program_enrollments')
    .insert(newPrograms)
    .select(); // כדי לקבל id חדש בחזרה

  if (insertError) throw insertError;
  console.log("נוספו תוכניות חדשות:", inserted);
}

if (existingPrograms.length > 0) {
  for (const p of existingPrograms) {
    const { error: updateError } = await supabase
      .from('program_enrollments')
      .update({
        start_date: p.start_date,
        end_date: p.end_date
      })
      .eq('id', p.id);

    if (updateError) throw updateError;
  }
  console.log("עודכנו תוכניות קיימות:", existingPrograms);
}

    
    // עדכון בזיכרון
    allProgram = programsToSave;

    Swal.fire('השינויים נשמרו', 'התוכניות עודכנו בהצלחה ✅', 'success');
    methods.hideLoader();

  } catch (err) {
    console.error('שגיאה בשמירת תוכניות:', err);
    Swal.fire('שגיאה', 'אירעה שגיאה בשמירת התוכניות: ' + err.message, 'error');
    methods.hideLoader();
  }
}





// פונקציה עזר שמחזירה את כל session_id של תוכנית
async function getAllSessionIdsForProgram(programId) {
  const { data, error } = await supabase
    .from('program_sessions')
    .select('id');
  if (error) throw error;
  return data.map(s => s.id);
}




// מחיקת תוכנית של לקוחה (כולל טיפול בנוכחויות)
async function deleteCustomerProgram(programEnrollmentId, customerId, programId) {
  try {
    // 1️⃣ שליפת כל המפגשים של התוכנית
    const { data: sessions, error: sessionsError } = await supabase
      .from('program_sessions')
      .select('id')
      .eq('program_id', programId);

    if (sessionsError) throw sessionsError;

    // אין מפגשים כלל → מחיקה ישירה של ההרשמה בלבד
    if (!sessions || sessions.length === 0) {
      await supabase.from('program_enrollments').delete().eq('id', programEnrollmentId);
      Swal.fire('נמחק', 'התוכנית הוסרה (לא נמצאו מפגשים)', 'success');
      
    loadCustomerPrograms(idCustomer);
      return;
    }

    const sessionIds = sessions.map(s => s.id);

    // 2️⃣ שליפת נוכחויות של הלקוחה בתוכנית זו
    const { data: attendanceData, error: attendanceError } = await supabase
      .from('session_attendance')
      .select('id, is_present')
      .in('session_id', sessionIds)
      .eq('customer_id', customerId);

    if (attendanceError) throw attendanceError;

    // 3️⃣ אין כלל רשומות נוכחות → מחיקה פשוטה של ההרשמה
    if (!attendanceData || attendanceData.length === 0) {
      await supabase.from('program_enrollments').delete().eq('id', programEnrollmentId);
      Swal.fire('נמחק', 'התוכנית הוסרה (לא נמצאו נוכחויות)', 'success');
      return;
    }

    // 4️⃣ יש רשומות נוכחות, נבדוק אם קיימת לפחות אחת TRUE
    const hasTrue = attendanceData.some(a => a.is_present === true);

    if (hasTrue) {
      // יש TRUE — שואלים את המשתמשת מה לעשות
      const result = await Swal.fire({
        title: 'נמצאו נוכחויות פעילות',
        text: 'בחרי מה לעשות עם הנוכחויות של תוכנית זו:',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'הפוך נוכחויות TRUE להשלמות',
        cancelButtonText: 'ביטול',
        showDenyButton: true,
        denyButtonText: 'מחק הכול לגמרי',
      });

      if (result.isConfirmed) {
        // ✅ הפוך TRUE להשלמות, מחק את כל השאר
        await supabase
          .from('session_attendance')
          .update({ status_code: 2 })
          .in('session_id', sessionIds)
          .eq('customer_id', customerId)
          .eq('is_present', true);

        await supabase
          .from('session_attendance')
          .delete()
          .in('session_id', sessionIds)
          .eq('customer_id', customerId)
          .eq('is_present', false);

        await supabase.from('program_enrollments').delete().eq('id', programEnrollmentId);
        Swal.fire('עודכן', 'נוכחויות TRUE הוסבו להשלמות, והשאר נמחקו.', 'success');
      } 
      else if (result.isDenied) {
        // ✅ מחיקה מוחלטת של הכול
        await supabase
          .from('session_attendance')
          .delete()
          .in('session_id', sessionIds)
          .eq('customer_id', customerId);

        await supabase.from('program_enrollments').delete().eq('id', programEnrollmentId);
        Swal.fire('נמחק', 'כל הנוכחויות והתוכנית נמחקו.', 'success');
      } 
      else {
        Swal.fire('בוטל', 'לא בוצעה פעולה.', 'info');
      }
    } 
    else {
      // ✅ אין אף TRUE — כל הרשומות FALSE או NULL ⇒ מוחקים הכול אוטומטית
      await supabase
        .from('session_attendance')
        .delete()
        .in('session_id', sessionIds)
        .eq('customer_id', customerId);

      await supabase
        .from('program_enrollments')
        .delete()
        .eq('id', programEnrollmentId);

      Swal.fire('נמחק בהצלחה', 'כל רשומות הנוכחות של התוכנית נמחקו (לא נמצאו TRUE).', 'success');
    }

  } catch (error) {
    console.error('❌ שגיאה במחיקת תוכנית:', error);
    Swal.fire('שגיאה', 'אירעה שגיאה בעת המחיקה: ' + error.message, 'error');
  }
}






// ======= פתיחת מודאל נוכחות / השלמות =======
function markAttendance(enrollmentId) {
  // כאן נוכל לפתוח את מודאל הנוכחות עם enrollmentId מתאים
  console.log('סימון נוכחות עבור enrollment:', enrollmentId);

  // לדוגמה, נשמור את ה-enrollmentId כדי לטעון מפגשים ספציפיים
  currentEnrollmentId = enrollmentId;

  // פותחים את מודאל הנוכחות
  openAttendanceModal('attendance');
}

function openAttendanceModal(type) {
  const modal = document.getElementById('modal');
  const title = document.getElementById('modal-title');
  const tbody = document.getElementById('attendance-table-body');

  if (!modal || !title || !tbody) return;

  // ניקוי תוכן קודם
  tbody.innerHTML = '';

  // סוג המודאל: 'attendance' או 'completion'
  const yearLabel = document.getElementById('schoolYearLabel')?.textContent || '';
  title.textContent = type === 'attendance' 
    ? `נוכחות לשנת ${yearLabel}` 
    : `השלמות לשנת ${yearLabel}`;

  // כאן אפשר לטעון את המפגשים או השיעורים המתאימים
  // לדוגמא, נניח שיש לך את כלProgram מהטבלה
  if (type === 'attendance') {
    allProgram.forEach(enrollment => {
      const startDate = enrollment.start_date ? enrollment.start_date.split('T')[0] : '';
      const endDate = enrollment.end_date ? enrollment.end_date.split('T')[0] : '';
      const day = enrollment.programs?.day || '';
      const time = enrollment.programs?.time || '';
      const name = enrollment.programs?.name || '';

      // לדוגמא נכניס שורה לכל מפגש
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="p-2 text-right">${startDate} - ${endDate}</td>
        <td class="p-2 text-right">${day}</td>
        <td class="p-2 text-right">${time}</td>
        <td class="p-2 text-right">${name}</td>
      `;
      tbody.appendChild(tr);
    });
  } else if (type === 'completion') {
    // אם רוצים תיעוד השלמות, ניתן למלא אחרת לפי הצורך
    allProgram.forEach(enrollment => {
      const name = enrollment.programs?.name || '';
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="p-2 text-right">-</td>
        <td class="p-2 text-right">-</td>
        <td class="p-2 text-right">-</td>
        <td class="p-2 text-right">${name}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  // הצגת המודאל
  modal.classList.remove('hidden');
}

// ======= סגירת מודאל =======
function closeModal() {
  const modal = document.getElementById('modal');
  if (modal) modal.classList.add('hidden');
}

// ======= מאזינים לכפתורי סגירה =======
document.getElementById('close-modal')?.addEventListener('click', closeModal);
document.querySelectorAll('#modal .close').forEach(btn => {
  btn.addEventListener('click', closeModal);
});

// ======= הפעלת המודאל מכל כפתור =======
// נניח שכבר יש לך בלחצנים:
document.querySelectorAll('.action-btn.attendance').forEach(btn => {
  btn.addEventListener('click', () => openAttendanceModal('attendance'));
});

document.getElementById('logCompletionBtn')?.addEventListener('click', () => {
  openAttendanceModal('completion');
});



// async function loadCustomerPrograms(customerId) {
//   const tbody = document.getElementById('classesBody');
//   tbody.innerHTML = '';

//   const { data, error } = await supabase
//     .from('program_enrollments')
//     .select(`
//       id,
//       start_date,
//       end_date,
//       status,
//       programs!fk_enrollments_program (
//         id,
//         type_code,
//         name,
//         day,
//         time,
//         start_date,
//         end_date
//       )
//     `)
//     .eq('customer_id', customerId)
//     .order('start_date', { ascending: true });

//   if (error) {
//     console.error('שגיאה בשליפת תוכניות הלקוחה:', error);
//     return;
//   }

//   allProgram = data;

//   data.forEach(enrollment => {
//     const tr = document.createElement('tr');

//     const startDate = enrollment.start_date ? enrollment.start_date.split('T')[0] : '';
//     const endDate = enrollment.end_date ? enrollment.end_date.split('T')[0] : '';

//     tr.dataset.enrollmentId = enrollment.id;
//     tr.dataset.programId = enrollment.programs?.id;

//     tr.innerHTML = `
//   <td>${enrollment.programs?.type_code || ''}</td>
//   <td>${enrollment.programs?.name || ''}</td>
//   <td>${enrollment.programs?.day || ''}</td>
//   <td>${enrollment.programs?.time || ''}</td>
//   <td><input type="date" class="start-date" value="${startDate}"></td>
//   <td><input type="date" class="end-date" value="${endDate}"></td>
//   <td class="flex gap-2 justify-center">
//     <!-- לחצן נוכחות -->
//     <button class="action-btn attendance bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded-md shadow"
//             title="סמן נוכחות"
//             onclick="markAttendance(${enrollment.id})">
//       🟢 נוכחות
//     </button>

//     <!-- לחצן מחיקה -->
//     <button class="action-btn delete bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded-md shadow"
//             title="מחק"
//             onclick="deleteCustomerProgram(${enrollment.id}, ${customerId}, ${enrollment.programs.id})">
//       <i class="fas fa-trash-alt"></i>
//     </button>
//   </td>
// `;

//     tbody.appendChild(tr);
//   });
//   window.deleteCustomerProgram = deleteCustomerProgram;
// }


links.forEach(link => {
  link.addEventListener("click", (e) => {
    e.preventDefault();

    // מסירים את המחלקה 'active' מכל הקישורים
    links.forEach(l => l.classList.remove("active"));

    // מוסיפים את המחלקה 'active' לקישור שנלחץ
    link.classList.add("active");

    // מסתירים את כל התכנים של הטאבים
    tabs.forEach(tab => tab.style.display = "none");

    // מוצאים את האלמנט שמתאים לכתובת ה-HREF של הקישור שנלחץ
    const target = document.querySelector(link.getAttribute("href"));

    // אם האלמנט קיים, מציגים אותו
    if (target) target.style.display = "block";

    // אם הקישור שנלחץ הוא לטאב מספר 4 (href="#tab4")
    if (link.getAttribute("href") === "#tab4") {
      // קוראים לפונקציה loadCustomerPrograms עם מזהה הלקוח
      // כאן חשוב שהמשתנה idCustomer יהיה מוגדר (למשל כגלובלי)
      loadCustomerPrograms(parseInt(idCustomer, 10));
    }
  });
});

// ======= פונקציה מרכזית לטעינת תוכניות לפי idCustomer =======
async function loadCustomerPrograms(customerId) {
  if (!customerId) return;

  currentSchoolYearStart = getCurrentSchoolYear();
  updateSchoolYearLabel(currentSchoolYearStart);
  setupSchoolYearNavigation();
  await loadCustomerProgramsBySchoolYear(customerId, currentSchoolYearStart);
}


// document.querySelector('#tab4').addEventListener('click', () => {
//   console.log("eeeeee");
//   loadCustomerEnrollments(parseInt(idCustomer,10));
// });


// function renderNotesTable() {
//   const tbody = document.querySelector('#notesTable tbody');
//   tbody.innerHTML = '';

//   // מיון הערות לפי תאריך בסדר עולה
//   notesData.sort((a, b) => {
//     const dateA = a.dateNote ? new Date(a.dateNote) : new Date(0);
//     const dateB = b.dateNote ? new Date(b.dateNote) : new Date(0);
//     return dateA - dateB;
//   });

//   notesData.forEach((note, index) => {
//     const date = note.dateNote ? new Date(note.dateNote).toISOString().split('T')[0] : '';
//     const row = document.createElement('tr');

//     row.innerHTML = `
//       <td><input type="date" value="${date}" data-index="${index}" class="note-date"></td>
//       <td><textarea data-index="${index}" class="note-text">${note.noteText || ''}</textarea></td>
//       <td style="text-align:center;">
//         <button class="delete-note-btn" data-index="${index}">🗑️</button>
//       </td>
//     `;
//     tbody.appendChild(row);
//   });
// }

function renderNotesTable() {
  const tbody = document.querySelector('#notesTable tbody');
  tbody.innerHTML = '';

    // מיון הערות לפי תאריך בסדר עולה
    notesData.sort((a, b) => {
      const dateA = a.dateNote ? new Date(a.dateNote) : new Date(0);
      const dateB = b.dateNote ? new Date(b.dateNote) : new Date(0);
      return dateA - dateB;
    });

  notesData.forEach((note, index) => {
    const date = note.dateNote ? new Date(note.dateNote).toISOString().split('T')[0] : '';
    const row = document.createElement('tr');

    row.innerHTML = `
      <td><input type="date" value="${date}" data-index="${index}" class="note-date"></td>
      <td><textarea data-index="${index}" class="note-text">${note.noteText || ''}</textarea></td>
      <td style="text-align:center;">
        <button class="delete-note-btn" data-index="${index}">🗑️</button>
      </td>
    `;
    tbody.appendChild(row);
  });
}



// ======= הערות =======
// האזנה להוספת הערה
document.getElementById("addNoteBtn").addEventListener("click", () => {
  addNoteRow(); // או בגרסה הגלובלית: notesData.push(...) + renderNotesTable()
});

// הוספת שורת הערה חדשה
function addNoteRow() {
  const today = new Date().toISOString().split('T')[0]; // פורמט YYYY-MM-DD
  notesData.push({ dateNote: today, noteText: '', customer_code: idCustomer });
  renderNotesTable();
}

// מחיקה
document.querySelector('#notesTable tbody').addEventListener('click', (e) => {
  const btn = e.target.closest('.delete-note-btn');
  if (!btn) return;
  const index = parseInt(btn.dataset.index, 10);
  if (!confirm("האם אתה בטוח שברצונך למחוק את ההערה הזו?")) return;

  notesData.splice(index, 1); // הסרה מהמשתנה הגלובלי
  renderNotesTable();
});

// עדכון הערות בלחיצה על עריכה בטקסט/תאריך
document.querySelector('#notesTable tbody').addEventListener('input', (e) => {
  const index = parseInt(e.target.dataset.index, 10);
  if (e.target.classList.contains('note-date')) {
    notesData[index].dateNote = e.target.value;
  }
  if (e.target.classList.contains('note-text')) {
    notesData[index].noteText = e.target.value;
  }
});

// האזנה לשמירת הערות
document.getElementById("saveNotesBtn").addEventListener("click", async () => {
  await saveNotes();
});

// שמירת הערות
async function saveNotes() {
  try {
    // 1️⃣ כל השורות שיש להן id ב-DB
    const existingIds = notesData.filter(n => n.id).map(n => n.id);

    // 2️⃣ מחיקת שורות מה-DB שלא נמצאות ב-notesData
    const { error: deleteError } = await supabase
      .from('customer_notes')
      .delete()
      .not('id', 'in', `(${existingIds.join(',')})`)
      .eq('customer_code', idCustomer); // רק הערות של הלקוחה הזו
    if (deleteError) throw deleteError;

    // 3️⃣ שמירה של הערות חדשות (שאין להן id)
    const newNotes = notesData.filter(note => !note.id);
    let insertedNotes = [];
    if (newNotes.length > 0) {
      const { data, error } = await supabase
        .from('customer_notes')
        .insert(newNotes)
        .select();
      if (error) throw error;
      insertedNotes = data;
    }

    // 4️⃣ שמירה / עדכון הערות קיימות (שיש להן id)
    const existingNotes = notesData.filter(note => note.id);
    let updatedNotes = [];
    if (existingNotes.length > 0) {
      const { data, error } = await supabase
        .from('customer_notes')
        .upsert(existingNotes, { onConflict: ['id'] })
        .select();
      if (error) throw error;
      updatedNotes = data;
    }

    // 5️⃣ עדכון המשתנה הגלובלי עם הערכים האמיתיים מה-DB
    notesData = [...updatedNotes, ...insertedNotes];

    renderNotesTable();
    alert("כל ההערות נשמרו בהצלחה ✅");
  } catch (err) {
    console.error(err);
    alert("שגיאה בשמירה: " + err.message);
  }
}
// ======================

// ======= חישוב חודשים מלאים =======
function calcMonths(startStr, endStr) {
  if (!startStr || !endStr) return 0;
  const start = new Date(startStr);
  const end = new Date(endStr);
  return Math.max(0,
    (end.getFullYear() - start.getFullYear()) * 12 +
    (end.getMonth() - start.getMonth()) + 1
  );
}

// שליפת סכום שולם ועדכון תא תאי חוב בשורה
async function loadEnrollmentDebt(tr, enrollmentId, totalDue) {
  const { data, error } = await supabase
    .from('payments')
    .select('amount, method')
    .eq('enrollment_id', enrollmentId);

  const payments = error ? [] : (data || []);

  // אם יש תשלום בהוראת קבע עירייה → אין חוב
  const hasStandingOrder = payments.some(p => p.method === 'standing_order');

  const paid = payments.reduce((s, p) => s + (p.amount || 0), 0);
  const debtCell = tr.querySelector('.debt-cell');
  const paidCell = tr.querySelector('.paid-cell');

  paidCell.textContent = paid > 0 ? paid + ' ₪' : '0 ₪';

  if (hasStandingOrder) {
    debtCell.textContent = 'הוראת קבע';
    debtCell.style.color = 'blue';
    debtCell.style.fontWeight = 'bold';
    return;
  }

  const debt = totalDue - paid;
  if (debt > 0) {
    debtCell.textContent = debt + ' ₪';
    debtCell.style.color = 'red';
    debtCell.style.fontWeight = 'bold';
  } else {
    debtCell.textContent = 'אין חוב';
    debtCell.style.color = 'green';
  }
}

// ======= מודאל תשלום =======
const paymentMethodLabels = {
  cash: 'מזומן',
  transfer: 'העברה בנקאית',
  bit: 'ביט',
  paybox: 'פייבוקס',
  standing_order: 'הוראת קבע עירייה'
};

let currentPaymentEnrollmentId = null;

window.openPaymentModal = function(enrollmentId, programName, programPrice) {
  currentPaymentEnrollmentId = enrollmentId;
  document.getElementById('paymentProgramName').textContent = programName;
  document.getElementById('paymentProgramPrice').textContent = programPrice != null ? programPrice + ' ₪' : 'לא הוגדר';
  document.getElementById('paymentAmount').value = programPrice ?? '';
  document.getElementById('paymentNote').value = '';
  document.getElementById('paymentModal').classList.remove('hidden');
};

document.getElementById('closePaymentModal')?.addEventListener('click', () => {
  document.getElementById('paymentModal').classList.add('hidden');
});
document.getElementById('cancelPaymentBtn')?.addEventListener('click', () => {
  document.getElementById('paymentModal').classList.add('hidden');
});

document.getElementById('confirmPaymentBtn')?.addEventListener('click', async () => {
  const amount = parseFloat(document.getElementById('paymentAmount').value);
  const method = document.getElementById('paymentMethod').value;
  const note = document.getElementById('paymentNote').value.trim();

  if (!amount || amount <= 0) {
    alert('יש להזין סכום תקין');
    return;
  }

  const { error } = await supabase.from('payments').insert([{
    customer_id: idCustomer,
    enrollment_id: currentPaymentEnrollmentId,
    amount,
    method,
    note: note || null,
    payment_date: new Date().toISOString().split('T')[0]
  }]);

  if (error) {
    alert('שגיאה בשמירת התשלום: ' + error.message);
    return;
  }

  document.getElementById('paymentModal').classList.add('hidden');
  Swal.fire('תשלום נשמר', 'התשלום נרשם בהצלחה ✅', 'success');
});

// ======= היסטוריית תשלומים =======
window.openPaymentHistory = async function(enrollmentId, programName) {
  document.getElementById('historyProgramName').textContent = programName;
  const tbody = document.getElementById('paymentHistoryBody');
  tbody.innerHTML = '<tr><td colspan="5" class="text-center py-2">טוען...</td></tr>';
  document.getElementById('paymentHistoryModal').classList.remove('hidden');

  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('enrollment_id', enrollmentId)
    .order('payment_date', { ascending: false });

  if (error) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center text-red-500">שגיאה בטעינה</td></tr>`;
    return;
  }

  tbody.innerHTML = '';
  if (!data.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="text-center py-2">אין תשלומים רשומים</td></tr>';
    document.getElementById('paymentHistoryTotal').textContent = '';
    return;
  }

  let total = 0;
  data.forEach(p => {
    total += p.amount || 0;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="border px-2 py-1">${p.payment_date || ''}</td>
      <td class="border px-2 py-1">${p.amount} ₪</td>
      <td class="border px-2 py-1">${paymentMethodLabels[p.method] || p.method || ''}</td>
      <td class="border px-2 py-1">${p.note || ''}</td>
      <td class="border px-2 py-1 text-center">
        <button class="text-red-500 hover:text-red-700" onclick="window.deletePayment(${p.id}, this)">מחק</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
  document.getElementById('paymentHistoryTotal').textContent = total.toFixed(2) + ' ₪';
};

window.deletePayment = async function(paymentId, btn) {
  if (!confirm('למחוק תשלום זה?')) return;
  const { error } = await supabase.from('payments').delete().eq('id', paymentId);
  if (error) { alert('שגיאה במחיקה'); return; }
  const row = btn.closest('tr');
  const amount = parseFloat(row.cells[1].textContent);
  row.remove();
  const totalEl = document.getElementById('paymentHistoryTotal');
  const current = parseFloat(totalEl.textContent) || 0;
  totalEl.textContent = (current - amount).toFixed(2) + ' ₪';
};

document.getElementById('closeHistoryModal')?.addEventListener('click', () => {
  document.getElementById('paymentHistoryModal').classList.add('hidden');
});

// ======= ניסיון =======
document.getElementById('addTrialBtn')?.addEventListener('click', () => openTrialModal());
document.getElementById('closeTrialModal')?.addEventListener('click', () => document.getElementById('trialModal').classList.add('hidden'));
document.getElementById('cancelTrialBtn')?.addEventListener('click', () => document.getElementById('trialModal').classList.add('hidden'));

async function openTrialModal() {
  document.getElementById('trialModal').classList.remove('hidden');
  const today = new Date().toISOString().split('T')[0];
  const dayNames = ['ראשון','שני','שלישי','רביעי','חמישי','שישי','שבת'];
  const { data: programs } = await supabase
    .from('programs')
    .select('id, name, day, time, branch_code')
    .lte('start_date', today)
    .gte('end_date', today)
    .order('name');
  const progSelect = document.getElementById('trialProgramSelect');
  progSelect.innerHTML = '<option value="">בחרי תוכנית...</option>';
  (programs || []).forEach(p => {
    const dayNum = parseInt(p.day);
    const dayStr = (!isNaN(dayNum) && dayNum >= 1 && dayNum <= 7) ? dayNames[dayNum - 1] : (p.day || '');
    const time = p.time ? p.time.slice(0, 5) : '';
    const branch = p.branch_code || '';
    const label = [p.name, dayStr, time, branch].filter(Boolean).join(' | ');
    progSelect.innerHTML += `<option value="${p.id}">${label}</option>`;
  });
  document.getElementById('trialSessionSelect').innerHTML = '<option value="">קודם בחרי תוכנית...</option>';
  document.getElementById('trialSessionSelect').disabled = true;
  await loadTrialList();
}

document.getElementById('trialProgramSelect')?.addEventListener('change', async function() {
  const programId = this.value;
  const sessionSelect = document.getElementById('trialSessionSelect');
  sessionSelect.innerHTML = '<option value="">טוען...</option>';
  sessionSelect.disabled = true;
  if (!programId) return;

  const today = new Date().toISOString().split('T')[0];
  const dayNames = ['ראשון','שני','שלישי','רביעי','חמישי','שישי','שבת'];
  const { data: sessions } = await supabase
    .from('program_sessions')
    .select('id, date, time')
    .eq('program_id', programId)
    .gte('date', today)
    .order('date', { ascending: true })
    .limit(20);

  sessionSelect.innerHTML = '<option value="">בחרי מפגש...</option>';
  (sessions || []).forEach(s => {
    const dateObj = new Date(s.date);
    const dayName = dayNames[dateObj.getDay()];
    const time = s.time ? s.time.slice(0, 5) : '';
    sessionSelect.innerHTML += `<option value="${s.id}">${s.date} ${dayName} ${time}</option>`;
  });
  sessionSelect.disabled = false;
});

document.getElementById('confirmTrialBtn')?.addEventListener('click', async () => {
  const sessionId = document.getElementById('trialSessionSelect').value;
  if (!sessionId) { alert('בחרי מפגש'); return; }

  const { error: attError } = await supabase.from('session_attendance').upsert([{
    customer_id: idCustomer,
    session_id: parseInt(sessionId),
    is_present: false,
    status_code: 3
  }], { onConflict: 'customer_id,session_id' });

  if (attError) { alert('שגיאה: ' + attError.message); return; }

  Swal.fire('ניסיון נקבע', 'הלקוחה שובצה לניסיון ✅', 'success');
  await loadTrialList();
});

async function loadTrialList() {
  const tbody = document.getElementById('trialListBody');
  tbody.innerHTML = '<tr><td colspan="5" class="text-center py-2">טוען...</td></tr>';

  const { data, error } = await supabase
    .from('session_attendance')
    .select(`
      session_id,
      program_sessions!inner (
        date, time,
        programs ( name )
      )
    `)
    .eq('customer_id', idCustomer)
    .eq('status_code', 3)
    .order('session_id', { ascending: false });

  tbody.innerHTML = '';
  if (error || !data?.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="text-center py-2">אין ניסיונות</td></tr>';
    return;
  }

  data.forEach(t => {
    const s = t.program_sessions;
    const dateObj = s?.date ? new Date(s.date) : null;
    const dayName = dateObj ? ['ראשון','שני','שלישי','רביעי','חמישי','שישי','שבת'][dateObj.getDay()] : '';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="border px-2 py-1">${s?.programs?.name || ''}</td>
      <td class="border px-2 py-1">${s?.date || ''}</td>
      <td class="border px-2 py-1">${dayName}</td>
      <td class="border px-2 py-1">${s?.time || ''}</td>
      <td class="border px-2 py-1 text-center">
        <button class="text-red-500 hover:text-red-700 text-xs" onclick="window.deleteTrial(${t.session_id}, this)">מחק</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

window.deleteTrial = async function(sessionId, btn) {
  if (!confirm('למחוק ניסיון זה?')) return;

  const { error } = await supabase.from('session_attendance')
    .delete()
    .eq('customer_id', idCustomer)
    .eq('session_id', sessionId)
    .eq('status_code', 3);

  if (error) { alert('שגיאה במחיקה'); return; }

  btn.closest('tr').remove();
};

// ======= חישוב סטטוס אוטומטי =======
async function calcAutoStatus(customerId) {
  const today = new Date();
  today.setHours(0,0,0,0);

  // בדוק תוכניות פעילות
  const { data: enrollments } = await supabase
    .from('program_enrollments')
    .select('start_date, end_date')
    .eq('customer_id', customerId);

  const hasActive = (enrollments || []).some(e => {
    const s = e.start_date ? new Date(e.start_date) : null;
    const en = e.end_date ? new Date(e.end_date) : null;
    return s && en && s <= today && en >= today;
  });

  if (hasActive) return null; // פעילה - אין צורך לשנות

  // בדוק ניסיונות
  const { data: trials } = await supabase
    .from('trial_sessions')
    .select('session_id, program_sessions!inner(date)')
    .eq('customer_id', customerId);

  if (trials && trials.length > 0) {
    // בדוק אם דווחה נוכחות באחד מהניסיונות
    const sessionIds = trials.map(t => t.session_id);
    const { data: attendance } = await supabase
      .from('session_attendance')
      .select('is_present')
      .eq('customer_id', customerId)
      .in('session_id', sessionIds)
      .eq('is_present', true);

    if (attendance && attendance.length > 0) return 'missing_placement'; // חסר שיבוץ
    return 'trial_scheduled'; // נקבע ניסיון
  }

  // אין תוכניות ואין ניסיונות
  const hasExpired = (enrollments || []).some(e => e.end_date && new Date(e.end_date) < today);
  if (hasExpired) return 'expired';

  return 'interested'; // מתעניינת
}