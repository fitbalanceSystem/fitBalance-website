import { supabase, fetchItems, updateItem, upsert } from '../utilities/db.js';
import * as methods from '../utilities/methods.js';
import '../utilities/main.js';
import { loadDB } from "../utilities/supabase.js";
import { populateSelectFromCodeTable, loadAllCodeTables, getinstructor, getDescription, getNameFromCodeTable, getNameInstructor } from '../utilities/code-tables.js';

let availableCustomers = [];
let allPrograms = [];
let allRegistrations = [];
let allCustomers = [];
let program_sessions = [];
let allAttendance = [];
let allTrials = [];
let currentAttendance = []; // רשימת נוכחות נוכחית

let sessionId = null;

const headerHeight = 30;
const slotHeight = 8;
const startHour = 17;
const endHour = 22;

window.changeWeek = changeWeek;
window.openParticipantsList = openParticipantsList;
window.closeModal = closeModal;
window.updateAttendance = updateAttendance;
window.addCustomerRow = addCustomerRow;
window.closeAddCustomerModal = closeAddCustomerModal;

let currentWeekStart = getStartOfWeek(new Date());


///////  בטעינה ראשונית של העמוד  ///////
// טעינת כל טבלאות הנוכחות וכו'...
// טעינת כל טבלאות הקוד הרלוונטיות
// טעינת כל קוביות המפגשים
// טעינת כל הקישורים לנוכחויות בכל מפגש ומפגש
document.addEventListener("DOMContentLoaded", async () => {
  const newSessionBtn = document.getElementById("newCustomerBtn");
  const programSelectModal = document.getElementById("programSelectModal");
  const programSelect = document.getElementById("programSelect");
  const programSelectCancel = document.getElementById("programSelectCancel");
  const programSelectOk = document.getElementById("programSelectOk");


  const instructors = await loadDB("instructors");
  methods.setInstructors(instructors);

  const codeTables = await loadDB("codetables");
  methods.setCodeTables(codeTables);

  // טען את הנתונים הראשוניים
  allPrograms = await fetchItems("programs");
  program_sessions = await fetchItems("program_sessions");
  allRegistrations = await fetchItems("program_enrollments");
  allAttendance = await fetchItems("session_attendance");
  allCustomers = await fetchItems("customers");
  allTrials = allAttendance.filter(a => a.status_code === 3);
  await loadAllCodeTables();

  renderCalendar();
  // attachParticipantsLinks();

  // עכשיו מאזין ללחצן "הוסף מפגש"
  newSessionBtn.addEventListener("click", async () => {
    // בדיקה אם יש תוכניות
    if (!allPrograms || allPrograms.length === 0) {
      alert("אין תוכניות זמינות.");
      return;
    }

    const tbody = document.getElementById("programTableBody");
    const okBtn = document.getElementById("programSelectOk");
    let selectedProgramId = null;

    const sortedPrograms = [...allPrograms].sort((a, b) => new Date(b.start_date) - new Date(a.start_date));
    // טען את כל התוכניות
    tbody.innerHTML = "";
    sortedPrograms.forEach(p => {
      const tr = document.createElement("tr");
      tr.classList.add("cursor-pointer", "hover:bg-gray-100");
      tr.innerHTML = `
        <td class="p-2 border">${p.name}</td>
        <td class="p-2 border">${p.day}</td>
        <td class="p-2 border">${p.time}</td>
        <td class="p-2 border">${getinstructor(p.instructor_code)}</td>
        <td class="p-2 border">${getDescription('branch', p.branch_code)}</td>
        <td class="p-2 border">${p.start_date}</td>
        <td class="p-2 border">${p.end_date}</td>
      `;

      tr.addEventListener("click", () => {
        // הסרת בחירה קודמת
        tbody.querySelectorAll("tr").forEach(r => r.classList.remove("bg-pink-100"));
        tr.classList.add("bg-pink-100");

        selectedProgramId = p.id;

        okBtn.disabled = false;
      });

      tbody.appendChild(tr);
    });

    programSelectModal.style.display = "flex"; // להציג מודאל
    // לחיצה על אישור
    okBtn.addEventListener("click", () => {
      if (!selectedProgramId) return;
      programSelectModal.style.display = "none"; // להסתיר מודאל
      openSessionModal(selectedProgramId, '', '', '', null);
    });

  });
});


// החזרת התאריך הראשון בשבוע הנוכחי ושמירה במשתנה גלובלי
function getStartOfWeek(date) {
  const day = date.getDay(); // 0-6, ראשון עד שבת
  const diff = date.getDate() - day;
  return new Date(date.getFullYear(), date.getMonth(), diff);
}

// פונקציה לפורמט תקין של תאריך
function formatDate(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// פונקציה בדפדוף בין השבועות
function changeWeek(offset) {
  currentWeekStart.setDate(currentWeekStart.getDate() + offset * 7);
  renderCalendar();
  // attachParticipantsLinks();
}




// הצגת תוכן מערכת השעות
function renderCalendar() {
  try {
    const daysGrid = document.getElementById("days-grid");
    const weekRange = document.getElementById("week-range");

    daysGrid.innerHTML = "";

    const dayNames = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "מוצ\"ש"];
    const weekDates = [];

    for (let i = 0; i < 7; i++) {
      const date = new Date(currentWeekStart);
      date.setDate(date.getDate() + i);
      weekDates.push(date);
    }

    weekRange.textContent = `${formatDate(weekDates[0])} - ${formatDate(weekDates[6])}`;

    // עבור כל יום בשבוע
    weekDates.forEach((date, index) => {
      const col = document.createElement("div");
      col.className = "day-column-simple";

      const today = new Date();
      if (date.toDateString() === today.toDateString()) col.classList.add("today");

      // כותרת היום
      const header = document.createElement("div");
      header.className = "day-header";
      header.innerHTML = `
        <div class="date-line">${formatDate(date)}</div>
        <div class="day-line">${dayNames[index]}</div>
      `;
      col.appendChild(header);

      const dayDateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      // בחר את כל המפגשים של אותו יום
      const sessionsForDay = program_sessions
        .filter(session => {
          const sessionDate = new Date(session.date);
          return sessionDate.toDateString() === dayDateOnly.toDateString();
        })
        .sort((a, b) => a.time.localeCompare(b.time)); // לפי שעה

      // עבור כל מפגש ביום
      sessionsForDay.forEach(session => {
        const program = allPrograms.find(p => p.id === session.program_id && p.status_code === 1);
        if (!program) return;

        const countPresent = allAttendance.filter(att => att.session_id === session.id && att.is_present).length;
        const countTotal = allAttendance.filter(att => att.session_id === session.id).length;

        // ספירת ניסיונות למפגש זה
        const trialCount = allTrials.filter(t => t.session_id === session.id).length;

        const instructorName = getinstructor(session.instructor_code);
        const isCanceled = Number(session.status) === 2;

        const event = document.createElement("div");
        event.className = "event-simple";
        if (isCanceled) event.classList.add("canceled-event");

        event.innerHTML = `
          <strong>${program.name}</strong>
          <div><i class="fas fa-clock" style="color:#ec4899"></i> ${session.time.slice(0, 5)}</div>
          <div><i class="fas fa-user" style="color:#8b5cf6"></i> ${instructorName}</div>
          <div><i class="fas fa-check-circle" style="color:#10b981"></i> ${countPresent} / ${countTotal}${
            trialCount > 0 ? ` &nbsp;<i class="fas fa-search" style="color:#f59e0b"></i> ${trialCount}` : ''
          }</div>
        `;

        if (isCanceled) {
          const overlay = document.createElement("div");
          overlay.className = "canceled-overlay";
          overlay.textContent = "מבוטל";
          event.appendChild(overlay);
        }

        event.addEventListener("click", () => {
          if (isCanceled) return;
          openSessionModal(program.id, dayDateOnly, session.time.slice(0, 5), formatDate(dayDateOnly), session);
        });

        col.appendChild(event);
      });

      daysGrid.appendChild(col);
    });

  } catch (err) {
    console.error(`[Exception]: ${err.stack}`);
  }
}






// פונקציה להגדרת פעולה לחיצה על לינקים של נוכחות בכל קוביית מפגש
// function attachParticipantsLinks() {
//   const links = document.querySelectorAll(".participants-link");
//   links.forEach(link => {
//     link.onclick = (e) => {
//       e.preventDefault();
//       const programId = Number(link.dataset.programId);
//       const dateStr = link.dataset.date;
//       openParticipantsList(programId, dateStr, link.dataset.time);
//     };
//   });
// }




// פתיחת מודאל נוכחות
async function openParticipantsList(programId, dateStr, time) {
  const modal = document.getElementById("attendanceModal");
  const tbody = document.getElementById("attendanceTableBody");
  tbody.innerHTML = "";

  // שמירת מזהי חוג ותאריך במודאל
  modal.dataset.programId = programId;
  modal.dataset.date = dateStr;

  const normalizeTime = t => t.slice(0, 5);

  // חיפוש המפגש המתאים
  const session = program_sessions.find(s =>
    s.program_id === programId &&
    s.date === dateStr &&
    normalizeTime(s.time) === time
  );

  if (!session) {
    console.warn("לא נמצא מפגש עבור התאריך והשעה שנבחרו");
    return;
  }

  const sessionId = session.id;
  modal.dataset.sessionId = sessionId;

  // שליפה מה-DB
  const { data: filteredAttendance, error } = await supabase
    .from('session_attendance')
    .select('*')
    .eq('session_id', sessionId);

  if (error) {
    console.error("שגיאה בטעינת נוכחות:", error);
    alert("אירעה שגיאה בטעינת נוכחות");
    return;
  }

  // יצירת שורות
  filteredAttendance.forEach(record => {
    const customer = allCustomers.find(c => c.id === record.customer_id);
    if (!customer) return;

    const tr = createAttendanceRow(customer, sessionId, {
      isPresent: record.is_present,
      statusCode: record.status_code
    });

    tbody.appendChild(tr); // ← ⬅️ זה היה חסר!
  });

  // כותרת
  document.getElementById("modalTitle").textContent =
    `נוכחות ל-${methods.formatDateToHebrew(dateStr)} ${time}`;

  // ספירת שורות
  document.getElementById("attendanceRowCount").textContent = `${filteredAttendance.length} משתתפות`;

  // צ'קבוקס סמן הכל
  const selectAll = document.getElementById("selectAllAttendance");
  selectAll.checked = false;
  selectAll.onchange = () => {
    tbody.querySelectorAll("input[type='checkbox']").forEach(cb => cb.checked = selectAll.checked);
  };

  modal.style.display = "flex";
}

// יצירת שורה ושורה בטבלת הלקוחות במודאל נוכחות
function createAttendanceRow(customer, sessionId, options = {}) {


  const {
    isPresent = false,
    statusCode = "",
    onDelete = null
  } = options;

  const tr = document.createElement("tr");
  tr.dataset.sessionId = sessionId;
  tr.dataset.customerId = customer.id;

  // תא צ'קבוקס
  const checkboxTd = document.createElement("td");
  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = isPresent;
  checkbox.dataset.customerId = customer.id;
  checkboxTd.appendChild(checkbox);

  // שם מלא
  const nameTd = document.createElement("td");
  nameTd.textContent = `${customer.firstName || ""} ${customer.lastName || ""}`;

  // נייד
  const phoneTd = document.createElement("td");
  phoneTd.textContent = customer.mobile || "";

  // סטטוס (select)
  const statusTd = document.createElement("td");
  const select = document.createElement("select");
  populateSelectFromCodeTable(select, "attendanceStatus");
  select.value = statusCode || "";
  statusTd.appendChild(select);

  // כפתור מחיקה
  const deleteTd = document.createElement("td");
  const deleteBtn = document.createElement("button");
  deleteBtn.className = "delete-btn";
  deleteBtn.title = "מחיקה";
  deleteBtn.innerHTML = `<i class="fas fa-trash-alt"></i>`;
  deleteBtn.addEventListener("click", () => {
    tr.remove();
    if (onDelete) onDelete(customer.id);
  });
  deleteTd.appendChild(deleteBtn);

  // הוספת כל התאים לשורה
  tr.appendChild(checkboxTd);
  tr.appendChild(nameTd);
  tr.appendChild(phoneTd);
  tr.appendChild(statusTd);
  tr.appendChild(deleteTd);

  return tr;
}

// פעולת הוספת לקוח במודאל נוכחות
async function openAddCustomerModal() {
  const input = document.getElementById("customerSearchInput");
  const list = document.getElementById("autocompleteResults");

  // שלב 1: טען את כל הלקוחות מה-DB אם לא נטענו
  if (allCustomers.length === 0) {
    const { data, error } = await supabase.from("customers").select("*");
    if (error) return alert("שגיאה בטעינת לקוחות");
    allCustomers = data;
  }

  // שלב 2: סנן את הלקוחות שאינם בטבלת הנוכחות
  const existingIds = currentAttendance;
  // .map((a) => a.customer_id);

  availableCustomers = allCustomers.filter((c) => !existingIds.includes(c.id));

  // נקה והצג את המודאל
  input.value = "";
  list.innerHTML = "";
  document.getElementById("addParticipantModalOverlay").style.display = "block";
  document.getElementById("addParticipantModal").style.display = "block";
  input.focus();
}

// פעולות על מקש חיפוש לקוחה במודאל נוכחות
document.getElementById("customerSearchInput").addEventListener("input", function () {
  const val = this.value.trim().toLowerCase();
  const list = document.getElementById("autocompleteResults");

  list.innerHTML = "";

  if (val.length < 1) return;

  const matches = availableCustomers.filter(c =>
    (`${c.firstName} ${c.lastName}`.toLowerCase().includes(val))
  );

  matches.forEach(c => {
    const li = document.createElement("li");
    li.textContent = `${c.firstName} ${c.lastName} - ${c.mobile}`;
    li.addEventListener("click", () => selectCustomerFromMiniModal(c));
    list.appendChild(li);
  });
});
// פעולות על מקש חיפוש לקוחה במודאל נוכחות
document.getElementById("customerSearchInput").addEventListener("keydown", function (e) {
  if (e.key === "Enter") {
    e.preventDefault();
    const val = this.value.trim().toLowerCase();
    const match = availableCustomers.find(c =>
      (`${c.firstName} ${c.lastName}`.toLowerCase().includes(val))
    );
    if (match) selectCustomerFromMiniModal(match);
  }
});

// בחירת לקוח בפועל במיני מודאל בתוך מודאל נוכחות
function selectCustomerFromMiniModal(customer) {

  const modal = document.getElementById("attendanceModal");
  const sessionId = Number(modal.dataset.sessionId);
  const tbody = document.getElementById("attendanceTableBody");

  // בדיקה אם הלקוחה כבר קיימת בטבלה
  const exists = [...tbody.querySelectorAll("input[type='checkbox']")]
    .some(cb => Number(cb.dataset.customerId) === customer.id);
  if (exists) {
    alert("הלקוחה כבר קיימת ברשימת הנוכחות");
    return;
  }

  // יצירת שורת HTML חדשה עם נתוני הלקוחה
  const record = {
    customer_id: customer.id,
    status_code: "1", // ברירת מחדל - השלמה
    is_present: false
  };

  const tr = createAttendanceRow(customer, sessionId, {
    statusCode: 2
  });

  tbody.appendChild(tr);

  // שמירה במערך הנוכחות בזיכרון
  currentAttendance.push({
    customer_id: customer.id,
    status: "1"
  });

  closeAddCustomerModal();
}

// אופציות לסגירת מיני מודאל הוספת לקוחה במודאל נוכחות
function closeAddCustomerModal() {
  document.getElementById("addParticipantModalOverlay").style.display = "none";
  document.getElementById("addParticipantModal").style.display = "none";
  document.getElementById("customerSearchInput").value = "";
  document.getElementById("autocompleteResults").innerHTML = "";
}

// לחיצה על רקע סוגרת גם כן
document.getElementById("addParticipantModalOverlay").addEventListener("click", closeAddCustomerModal);

// לחצן עדכון נוכחות
async function updateAttendance() {
  const tbody = document.getElementById("attendanceTableBody");
  const sessionId = Number(document.getElementById("attendanceModal").dataset.sessionId);
  const rows = tbody.querySelectorAll("tr");

  const currentRecords = [];

  rows.forEach(row => {
    const checkbox = row.querySelector("input[type='checkbox']");
    const select = row.querySelector("select");

    const customerId = Number(checkbox.dataset.customerId);
    const isPresent = checkbox.checked;
    const status = select?.value || null;

    currentRecords.push({
      session_id: sessionId,
      customer_id: customerId,
      is_present: isPresent,
      status_code: parseInt(status, 10)
    });
  });

  if (currentRecords.length === 0) {
    alert("אין נתונים לשמירה");
    return;
  }

  // 🔎 מציאת ה-customer_id של כל שורה קיימת ב-DB (allAttendance) לאותו session
  const existingRecords = allAttendance.filter(r => r.session_id === sessionId);
  const existingCustomerIds = existingRecords.map(r => r.customer_id);

  // 🔎 מציאת ה-customer_id של כל שורה שהשתמשת בחרה לשמור עכשיו
  const currentCustomerIds = currentRecords.map(r => r.customer_id);

  // 🗑️ מחיקת רשומות שכבר קיימות ב-DB, אבל לא נמצאות יותר בטופס
  const customerIdsToDelete = existingCustomerIds.filter(
    id => !currentCustomerIds.includes(id)
  );

  // 🔁 שלב 1: מחיקות
  if (customerIdsToDelete.length > 0) {
    const { error: deleteError } = await supabase
      .from("session_attendance")
      .delete()
      .in("customer_id", customerIdsToDelete)
      .eq("session_id", sessionId);

    if (deleteError) {
      console.error("שגיאה במחיקה:", deleteError);
      alert("שגיאה במחיקת נוכחות");
      return;
    }


  }

  // 🔁 שלב 2: עדכון/הוספה
  const result = await upsert("session_attendance", currentRecords, ["session_id", "customer_id"]);

  if (!result || result.error) {
    console.error("שגיאה בשמירת הנוכחות:", result?.error);
    alert("אירעה שגיאה בשמירת הנוכחות");
  } else {
    alert("הנוכחות נשמרה בהצלחה ✅");
    document.getElementById("attendanceModal").style.display = "none";
  }
}

// סגירת מודאל נוכחות
function closeModal() {
  document.getElementById("attendanceModal").style.display = "none";
}

// לחיצה על לחצן הוסף לקוח במודאל נוכחות
function addCustomerRow() {
  openAddCustomerModal();
}






// אחיזה במודאל ובכפתור הסגירה
const modal = document.getElementById("sessionModal");
const spanClose = modal.querySelector(".close");


// משתנים גלובליים
let attendanceBtn, makeupContainer, modalTitle, modalDate, modalTime, modalInstructor, modalBranch, modalDay, modalStatus, modalNotes, radios;
let saveBtn;
let deleteBtn;

function checkSessionChanges() {
  if (!originalSessionData) {
    saveBtn.disabled = false;
    saveBtn.style.opacity = "1";
    saveBtn.style.cursor = "pointer";
    return;
  }

  const currentTime = modalTime.value.slice(0, 5);
  const makeupValue = Array.from(radios).find(r => r.checked)?.value || "no";

  const changed =
    modalDate.value !== originalSessionData.date ||
    currentTime !== originalSessionData.time ||
    modalInstructor.value !== originalSessionData.instructor ||
    modalBranch.value !== originalSessionData.branch ||
    modalDay.value !== originalSessionData.day ||
    modalStatus.value !== originalSessionData.status ||
    modalNotes.value !== originalSessionData.notes ||
    makeupValue !== originalSessionData.makeup;

  saveBtn.disabled = !changed;
  saveBtn.style.opacity = changed ? "1" : "0.5";
  saveBtn.style.cursor = changed ? "pointer" : "not-allowed";
}


// ✳️ נשתמש במשתנים גלובליים כדי לאפשר הסרה וניהול נכון של מאזינים
let currentProgramId = null;
let currentSessionId = null;
let currentSessionDate = null;
let currentSessionTime = null;
let selectedSessionIds = [];
let originalSessionData = null;
let baseDate = null;

// שומר רפרנסים למאזינים כדי להסירם
let dayChangeHandler = null;
let dayChangeHandlerDate = null;

async function openSessionModal(programId, date, time, dateStr, session = null) {
  currentProgramId = programId;
  currentSessionId = session?.id || null;
  currentSessionDate = date || session?.date || null;
  currentSessionTime = time || session?.time || null;

  const program = allPrograms.find(p => p.id === programId && p.status_code === 1);
  if (!program) return;

  const modal = document.getElementById("sessionModal");
  modalTitle = document.getElementById("modalTitle2");
  modalDate = document.getElementById("modalDate");
  modalTime = document.getElementById("modalTime");
  modalInstructor = document.getElementById("modalInstructor");
  modalBranch = document.getElementById("modalBranch");
  modalDay = document.getElementById("modalDay");
  modalStatus = document.getElementById("modalStatus");
  modalNotes = document.getElementById("modalNotes");
  makeupContainer = document.getElementById("makeupContainer");
  radios = document.getElementsByName("makeup");
  saveBtn = document.getElementById("saveBtn");
  attendanceBtn = document.getElementById("attendanceBtn");
  deleteBtn = document.getElementById("deleteBtn");
  const programDetailsBtn = document.getElementById("programDetailsBtn");

  await loadAllCodeTables();
  populateSelectFromCodeTable(modalDay, "days");
  populateSelectFromCodeTable(modalInstructor, "instructors");
  populateSelectFromCodeTable(modalBranch, "branch");
  populateSelectFromCodeTable(modalStatus, "sessionStatus");

  const isEditMode = !!session;
  if (isEditMode) {
    modalTitle.textContent = program.name;
    modalDate.value = session.date || "";
    modalTime.value = session.time?.slice(0, 5) || "";
    modalInstructor.value = session.instructor_code || "";
    modalBranch.value = session.branch_code || "";
    modalDay.value = session.day || "";
    modalStatus.value = session.status || "";
    modalNotes.value = session.notes || "";

    originalSessionData = {
      date: modalDate.value,
      time: modalTime.value,
      instructor: modalInstructor.value,
      branch: modalBranch.value,
      day: modalDay.value,
      status: modalStatus.value,
      notes: modalNotes.value || "",
      makeup: session.has_makeup ? "yes" : "no"
    };

    selectedSessionIds = [String(session.id)];
  } else {
    modalTitle.textContent = `${program.name} - מפגש חדש`;
    modalDate.value = date || "";
    modalTime.value = time || "";
    modalInstructor.value = program.instructor_code || "";
    modalBranch.value = program.branch_code || "";
    modalDay.value = "";
    modalStatus.value = "";
    modalNotes.value = "";
    originalSessionData = null;
    selectedSessionIds = [];
  }

  function getDayForDate(dateStr) {
    const date = new Date(dateStr);
    return date.getDay() + 1; // ראשון=1 ... שבת=7
  }

  modalDate.onchange = () => {
    if (modalDate.value) modalDay.value = getDayForDate(modalDate.value);
    checkSessionChanges();
  };

  modalDay.onchange = checkSessionChanges;
  modalStatus.onchange = () => {
    if (modalStatus.value === "2") {
      makeupContainer.classList.remove("hidden");
    } else {
      makeupContainer.classList.add("hidden");
      radios.forEach(r => (r.checked = r.value === "no"));
    }
    checkSessionChanges();
  };

  [modalDate, modalTime, modalInstructor, modalBranch, modalNotes].forEach(el => {
    el.oninput = checkSessionChanges;
    el.onchange = checkSessionChanges;
  });
  radios.forEach(r => (r.onchange = checkSessionChanges));

  saveBtn.onclick = async () => {
    const idsToSave = selectedSessionIds.length ? selectedSessionIds : [currentSessionId].filter(Boolean);
    const ok = await saveSession(programId, modalDate.value, modalTime.value, idsToSave);
    if (ok) {
      alert(isEditMode ? "השינויים נשמרו בהצלחה" : "המפגש נוצר בהצלחה");
      closeModal();
      refreshCalendar();
    } else {
      alert("אירעה שגיאה בשמירה");
    }
  };

  attendanceBtn.onclick = () => { if (isEditMode) openParticipantsList(programId, dateStr, time); };
    // ✅ מחיקה של מפגש/ים מסומנים
    deleteBtn.onclick = async () => {
      if (!isEditMode) return;
  
      // לוקחים את כל הצ'קבוקסים שסומנו ברשימה
      const checkedIds = selectedSessionIds.length ? selectedSessionIds : [currentSessionId].filter(Boolean);
      await deleteSessionWithAttendanceCheck(checkedIds);
  // console.log(checkedIds);
  //     // אם סומנו מפגשים — מוחקים את כולם
  //     if (checkedIds.length > 0) {
  //       await deleteSessionWithAttendanceCheck(checkedIds);
  //     } else if (session?.id) {
  //       // אם לא סומנו מפגשים, מוחקים רק את המפגש הנוכחי מהמודאל
  //       await deleteSessionWithAttendanceCheck([session.id]);
  //     }
    };
  programDetailsBtn.onclick = () => { openProgramModal(programId); };

  attendanceBtn.disabled = !isEditMode;
  deleteBtn.disabled = !isEditMode;
  attendanceBtn.style.opacity = isEditMode ? "1" : "0.5";
  deleteBtn.style.opacity = isEditMode ? "1" : "0.5";

  modal.style.display = "flex";
  setTimeout(checkSessionChanges, 0);
}


// פונקציית שמירה
async function saveSession(programId, date, time, sessionIds = null) {
  methods.showLoader();
  try {
    const isEditMode = !!sessionIds?.length;
    const makeupValue = Array.from(radios).find(r => r.checked)?.value === "yes";
    const timeForDb = time ? (time.length === 5 ? `${time}:00` : time) : null;
    const updatedFields = {
      time: timeForDb,
      instructor_code: modalInstructor.value ? parseInt(modalInstructor.value) : null,
      branch_code: modalBranch.value ? parseInt(modalBranch.value) : null,
      status: modalStatus.value ? parseInt(modalStatus.value) : null,
      notes: modalNotes.value?.trim() || null,
      has_makeup: makeupValue
    };

    let result = false;

    if (!isEditMode) {
      // יצירת מפגש חדש
      const insertObj = {
        program_id: parseInt(programId),
        day: modalDay.value ? parseInt(modalDay.value) : null,
        date: date || null,
        ...updatedFields
      };
      const { error } = await supabase.from("program_sessions").insert([insertObj]);
      if (error) throw error;
      result = true;
    } else {
      // עדכון קיים
      const ids = sessionIds.map(id => parseInt(id));
      const updates = ids.map(id =>
        supabase.from("program_sessions").update(updatedFields).eq("id", id)
      );
      const responses = await Promise.all(updates);
      const hasError = responses.some(r => r.error);
      if (hasError) throw new Error("שגיאה בעדכון");
      result = true;
    }

    return result;
  } catch (err) {
    console.error("שגיאה בשמירת מפגש:", err);
    return false;
  } finally {
    methods.hideLoader();
  }
}



// 🗑️ מחיקת מפגש/ים מסומנים כולל בדיקת נוכחות
async function deleteSessionWithAttendanceCheck(sessionIds) {
  console.log(sessionIds);
  if (!sessionIds || sessionIds.length === 0) {
    alert("לא נבחרו מפגשים למחיקה.");
    return;
  }

  try {
    let hasAnyPresence = false;

    // שליפת כל הנוכחויות של המפגשים שנבחרו
    const { data: attendance, error: attendanceError } = await supabase
      .from("session_attendance")
      .select("*")
      .in("session_id", sessionIds);

    if (attendanceError) {
      console.error("שגיאה בשליפת נוכחויות:", attendanceError);
      throw attendanceError;
    }

    // בדיקה אם יש נוכחות פעילה באחד מהמיפגשים
    hasAnyPresence = attendance.some(a => a.is_present === true);

    const message = hasAnyPresence
      ? "קיימות נוכחויות במפגשים שסומנו. האם את בטוחה שברצונך למחוק את כל המפגשים וכל הנוכחויות שלהם?"
      : "האם את בטוחה שברצונך למחוק את כל המפגשים שסומנו?";

    if (!confirm(message)) return;

    // אם קיימות נוכחויות — מוחקים את כולן
    if (attendance.length > 0) {
      const { error: delAttendanceError } = await supabase
        .from("session_attendance")
        .delete()
        .in("session_id", sessionIds);
      if (delAttendanceError) {
        console.error("שגיאה במחיקת נוכחויות:", delAttendanceError);
        throw delAttendanceError;
      }
    }

    // מחיקת כל המפגשים שסומנו
    const { error: delSessionsError } = await supabase
      .from("program_sessions")
      .delete()
      .in("id", sessionIds);
    if (delSessionsError) {
      console.error("שגיאה במחיקת מפגשים:", delSessionsError);
      throw delSessionsError;
    }

    alert("המפגשים וכל הנוכחויות שלהם נמחקו בהצלחה.");

    // סגירת המודאל וריענון מערכת שעות
    const modal = document.getElementById("sessionModal");
    if (modal) modal.style.display = "none";

    program_sessions = await fetchItems("program_sessions");
    renderCalendar(); // ריענון התצוגה שלך

  } catch (err) {
    console.error("שגיאה כוללת במחיקה:", err);
    alert("אירעה שגיאה במחיקה. בדקי את הקונסול לפרטים.");
  }
}




async function refreshCalendar() {
  program_sessions = await fetchItems("program_sessions");
  allAttendance = await fetchItems("session_attendance");
  allTrials = allAttendance.filter(a => a.status_code === 3);
  renderCalendar();
}

// סגירה בלחיצה על X
spanClose.onclick = () => {
  modal.style.display = "none";
};

// סגירה בלחיצה מחוץ למודאל
window.onclick = (event) => {
  if (event.target === modal) {
    modal.style.display = "none";
  }
};




document.querySelector(".close-program").addEventListener("click", () => {
  document.getElementById("programModal").classList.add("hidden");
});


async function openProgramModal(programId) {


  const formatTime = (time) => time ? time.slice(0, 5) : "";

  methods.showLoader();
  document.getElementById("programModal").classList.remove("hidden");

  const { data: program } = await supabase
    .from("programs")
    .select("*")
    .eq("id", programId)
    .single();

  document.getElementById("pName").textContent = program.name;
  document.getElementById("pDay").textContent = getDescription('days', program.day);
  document.getElementById("pTime").textContent = formatTime(program.time);
  document.getElementById("pType").textContent = getDescription('programType', program.type_code);
  document.getElementById("pBranch").textContent = getDescription('branch', program.branch_code);
  document.getElementById("pInstructor").textContent = methods.getinstructor(program.instructor_code);
  document.getElementById("pStart").textContent = program.start_date;
  document.getElementById("pEnd").textContent = program.end_date;
  document.getElementById("pStatus").textContent = getDescription('programsStatus', program.status_code);

  const { data: sessions } = await supabase
    .from("program_sessions")
    .select("*")
    .eq("program_id", programId)
    .order("date");

  const tbody = document.getElementById("programSessionsTable");
  tbody.innerHTML = "";
  sessions.forEach(s => {
    tbody.innerHTML += `
        <tr class="border-b">
          <td class="p-2 text-center">
            <input 
              type="checkbox" 
              class="program-session-checkbox" 
              data-session-id="${s.id}"
              ${s.id == currentSessionId ? "checked disabled" : ""}
            >
          </td>
          <td class="p-2">${s.date}</td>
          <td class="p-2">${getDescription('days', s.day)}</td>
          <td class="p-2">${formatTime(s.time)}</td>
        </tr>
      `;
  });


  methods.hideLoader();




  const selectAll = document.getElementById("selectAllSessions");
  const checkboxes = document.querySelectorAll(".program-session-checkbox");

  selectAll.addEventListener("change", () => {
    const checked = selectAll.checked;

    checkboxes.forEach(cb => {
      const id = cb.dataset.sessionId;

      // אם זה המפגש הנוכחי, אסור לו להשתנות לעולם
      if (id === currentSessionId.toString()) {
        cb.checked = true;
        return;
      }

      cb.checked = checked;

      // ניהול המערך selectedSessionIds
      if (checked && !selectedSessionIds.includes(id)) {
        selectedSessionIds.push(id);
      }

      if (!checked) {
        selectedSessionIds = selectedSessionIds.filter(x => x !== id);
      }
    });
  });





  // סימון צ'קבוקסים לפי selectedSessionIds
  document.querySelectorAll('#programSessionsTable input[type="checkbox"]').forEach(cb => {
    const id = cb.dataset.sessionId.toString();

    cb.checked = selectedSessionIds.includes(id);

    cb.addEventListener("change", () => {
      if (cb.checked) {
        if (!selectedSessionIds.includes(id)) selectedSessionIds.push(id);
      } else {
        selectedSessionIds = selectedSessionIds.filter(x => x !== id);
      }
    });
  });


  document.getElementById("programSaveBtn").onclick = () => {
    document.getElementById("programModal").classList.add("hidden");
  };
}