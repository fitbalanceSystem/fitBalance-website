import * as utils from "../utilities/methods.js";
import * as supabaseMethods from "../utilities/supabase.js";
import { setInstructors, setCodeTables } from "../utilities/methods.js";

// import { supabase, fetchItems, insertItem, updateItem, deleteItem } from '../utilities/db.js';
// import '../utilities/main.js';
// import { populateSelectFromCodeTable } from '../utilities/code-tables.js';

let idCustomer;
let allProgram = [];

const supabaseUrl = 'https://bmrtobuvjuycnvvfmgvf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJtcnRvYnV2anV5Y252dmZtZ3ZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA1ODQ5MDUsImV4cCI6MjA2NjE2MDkwNX0.VhoKIR_nb6lyu_05CEsVT8G_c90chKTX8v__5QA-A-s';

const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

async function loadDB1(nameTable) {
  const { data, error } = await supabaseClient
    .from(nameTable)
    .select("*");

  if (error) {
    console.error("שגיאה בטעינת טבלת ${nameTable}:", error.message);
    return [];
  }
console.log(data);
  return data;
}

document.addEventListener('DOMContentLoaded', async () => {

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

  // לקוח קיים / עריכת פרטי לקוח
  if (customerId) {
 
    // מצב עריכה – טען נתונים
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('id', customerId)
      .single();

    if (error) {
      alert('שגיאה בטעינת נתוני לקוחה: ' + error.message);
      return;
    }

    // שדות טופס
    document.getElementById('idNumber').value = data.idValue || '';
    document.getElementById('firstName').value = data.firstName || '';
    document.getElementById('lastName').value = data.lastName || '';
    document.getElementById('birthDate').value = data.birthDate || '';
    document.getElementById('city').value = data.city || '';
    document.getElementById('street').value = data.street || '';
    document.getElementById('houseNumber').value = data.houseNo || '';
    document.getElementById('mobile').value = data.mobile || '';
    document.getElementById('email').value = data.email || '';
    document.getElementById('arnonaId').value = data.payerId || '';
    document.getElementById('arnonaFirstName').value = data.payerFirstName || '';
    document.getElementById('arnonaLastName').value = data.payerLastName || '';
    document.getElementById('arnonaMobile').value = data.payerMobile || '';
    document.getElementById('arnonaEmail').value = data.payerEmail || '';

    document.getElementById('checkbox1').checked = !!data.isSignedHealthForm;
    document.getElementById('checkbox2').checked = !!data.issignedRegisTrationPolicy;
    document.getElementById('checkbox3').checked = !!data.inWhatsAppList;
    document.getElementById('checkbox4').checked = !!data.inEmailList;
    document.getElementById('isPregnant').checked = !!data.isPregnant;
    document.getElementById('dueDate').value = data.expectedDueDate || '';

    toggleDueDate(); // להריץ שוב בהתאם לערך isPregnant
  }

  // שמירת הנתונים בטופס
  async function saveCustomer() {
    console.log("customerId: " + customerId);
    console.log("typeof customerId: " + typeof customerId);

    const saveStatus = document.getElementById('saveStatus');
    saveStatus.style.display = 'inline';
    saveStatus.textContent = '⏳ שומר...';

    const houseNoValue = document.getElementById('houseNumber').value.trim();
    const houseNo = houseNoValue ? parseInt(houseNoValue, 10) : null;

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
      isPregnant: document.getElementById('isPregnant').checked || null,
    };

    console.log("data in form:", JSON.stringify(data, null, 2));
    const result = await supabaseMethods.upsert('customers',data);
    if(result)
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
      close();
    });
  });
  

  // ביטול
  document.querySelector('.cancel-btn').addEventListener('click', (e) => {
    e.preventDefault();
    close();
  });
});

async function close() {
  sessionStorage.setItem('resetSearch', 'true');
    window.history.back();
}

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

window.openClassesModal = async function () {
  document.getElementById('classesModal').style.display = 'block';
  console.log("ttt");
  await loadModalPrograms();
};

function closeModal() {
  document.getElementById('classesModal').style.display = 'none';
}

document.addEventListener("DOMContentLoaded", function () {
  document.getElementById("closeModalBtn").addEventListener("click", function () {
    closeModal();
  });
});


document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("addSelectedBtn").addEventListener("click", addSelectedPrograms);

});
// טעינת התוכניות לטבלה עם צ'קבוקס
async function loadModalPrograms() {
  const tbody = document.querySelector("#modalClassesTable tbody");
  tbody.innerHTML = "";

  const { data, error } = await supabase.from("programs").select("*");

  if (error) {
    console.error("שגיאה בטעינת תוכניות:", error);
    return;
  }

  data.forEach(program => {
    const tr = document.createElement("tr");
  
    tr.dataset.code = program.code || program.id;  // ✅ שמירה על מזהה ייחודי לשימוש מאוחר יותר
  
    // עמודת צ'קבוקס
    const checkboxTd = document.createElement("td");
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "program-checkbox";
    checkbox.value = program.id;
    checkboxTd.appendChild(checkbox);
    tr.appendChild(checkboxTd);
  
    // עמודות נתונים
    const columns = [
      program.type,
      program.name,
      program.day,
      program.time,
      program.branch,
      program.start_date,
      program.end_date
    ];
  
    columns.forEach(text => {
      const td = document.createElement("td");
      td.textContent = text;
      tr.appendChild(td);
    });
  
    // סימון הצ'קבוקס בלחיצה על שורה
    tr.addEventListener("click", function (e) {
      if (e.target !== checkbox) {
        checkbox.checked = !checkbox.checked;
      }
    });
  
    tbody.appendChild(tr);
  });
  
}



// כפתור הוספת כל הצ'קבוקסים המסומנים
function addSelectedPrograms() {
  const selectedRows = document.querySelectorAll('#modalClassesTable tbody input[type="checkbox"]:checked');
  const classesBody = document.getElementById('classesBody');

  selectedRows.forEach(cb => {
    const row = cb.closest('tr');
    const code = row.dataset.code || row.getAttribute('data-code');

    if ([...classesBody.querySelectorAll('tr')].some(r => r.dataset.code === code)) return;

    const startDate = row.cells[6].innerText.trim();
    const endDate = row.cells[7].innerText.trim();

    const newRow = document.createElement('tr');
    newRow.dataset.code = code;

    newRow.innerHTML = `
      <td>${row.cells[1].innerText}</td>
      <td>${row.cells[2].innerText}</td>
      <td>${row.cells[3].innerText}</td>
      <td>${row.cells[4].innerText}</td>
      <td><input type="date" class="start-date" value="${startDate}"></td>
      <td><input type="date" class="end-date" value="${endDate}"></td>
      <td>✔️</td>
    `;

    classesBody.appendChild(newRow);
  });

  closeModal();
}



// document.getElementById('saveProgramsBtn').addEventListener('click', async () => {
  
// });


document.addEventListener('DOMContentLoaded', () => {
  console.log("saveProgramsBtn");
  const saveBtn = document.getElementById('saveProgramsBtn');
  saveBtn.addEventListener('click', savePrograms);
});

async function savePrograms() {
  console.log("save");
  const startDates = document.querySelectorAll('.start-date');
  const endDates = document.querySelectorAll('.end-date');
  const statusSelects = document.querySelectorAll('.status-select');

  const updates = [];
  const inserts = [];

  startDates.forEach(input => {
    const id = input.getAttribute('data-enrollment-id'); // id ההרשמה
    const program_id = input.getAttribute('data-program-id');
    const start_date = input.value;

    const endInput = Array.from(endDates).find(e => e.getAttribute('data-enrollment-id') === id);
    const statusSelect = Array.from(statusSelects).find(s => s.getAttribute('data-enrollment-id') === id);

    const end_date = endInput ? endInput.value : null;
    const status = statusSelect ? statusSelect.value : null;

    if (id) {
      // שורה קיימת - בדוק אם יש שינוי
      const original = originalEnrollments.find(e => e.id == id);
      if (
        !original ||
        original.start_date !== start_date ||
        original.end_date !== end_date ||
        original.status !== status
      ) {
        updates.push({
          id: parseInt(id),
          start_date: start_date || null,
          end_date: end_date || null,
          status: status
        });
      }
    } else if (program_id) {
      // שורה חדשה - עם program_id אבל ללא id
      inserts.push({
        customer_id: idCustomer, // משתנה גלובלי
        program_id: parseInt(program_id),
        start_date: start_date || null,
        end_date: end_date || null,
        status: status || 'active'
      });
    }
  });

  try {
    // עדכון
    for (const upd of updates) {
      const { error } = await supabase
        .from('program_enrollments')
        .update({
          start_date: upd.start_date,
          end_date: upd.end_date,
          status: upd.status
        })
        .eq('id', upd.id);

      if (error) throw error;
    }

    // הוספה
    if (inserts.length > 0) {
      const { error } = await supabase
        .from('program_enrollments')
        .insert(inserts);

      if (error) throw error;
    }

    alert('השינויים נשמרו בהצלחה!');
    await loadCustomerPrograms(idCustomer); // מרענן את הטבלה לאחר שמירה
  } catch (error) {
    console.error('שגיאה בשמירת תוכניות:', error);
    alert('אירעה שגיאה בשמירה.');
  }
}



let originalEnrollments = [];

async function loadCustomerPrograms(customerId) {
  console.log("load program");
  const tbody = document.getElementById('classesBody');
  tbody.innerHTML = '';

  const { data, error } = await supabase
    .from('program_enrollments')
    .select(`
      id,
      program_id,
      start_date,
      end_date,
      status,
      programs (
        type_code,
        name,
        day,
        time
      )
    `)
    .eq('customer_id', customerId)
    .order('start_date', { ascending: true });

  if (error) {
    console.error('שגיאה בשליפת תוכניות הלקוחה:', error);
    return;
  }

  originalEnrollments = data; // שומר את המידע המקורי להשוואה

  data.forEach(enrollment => {
    const tr = document.createElement('tr');

    tr.innerHTML = `
      <td>${enrollment.programs?.type_code || ''}</td>
      <td>${enrollment.programs?.name || ''}</td>
      <td>${enrollment.programs?.day || ''}</td>
      <td>${enrollment.programs?.time || ''}</td>
      <td>
        <input type="date" 
               class="start-date" 
               data-enrollment-id="${enrollment.id}" 
               data-program-id="${enrollment.program_id}" 
               value="${enrollment.start_date || ''}">
      </td>
      <td>
        <input type="date" 
               class="end-date" 
               data-enrollment-id="${enrollment.id}" 
               value="${enrollment.end_date || ''}">
      </td>
      <td>
        <select class="status-select" data-enrollment-id="${enrollment.id}">
          <option value="active" ${enrollment.status === 'active' ? 'selected' : ''}>פעיל</option>
          <option value="paused" ${enrollment.status === 'paused' ? 'selected' : ''}>מוקפא</option>
          <option value="cancelled" ${enrollment.status === 'cancelled' ? 'selected' : ''}>בוטל</option>
        </select>
      </td>
    `;
console.log(tr);
    tbody.appendChild(tr);
  });
}


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



// document.querySelector('#tab4').addEventListener('click', () => {
//   console.log("eeeeee");
//   loadCustomerEnrollments(parseInt(idCustomer,10));
// });

