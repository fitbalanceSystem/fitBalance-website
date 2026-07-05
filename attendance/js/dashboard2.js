import {
  selectFromTabletype,
  selectFromTables,
  selectFromTable,
  uploadFileToStorage
} from '../utilities/dbservice.js';

import {
  getCurrentUser,
  checkAuth,
  logout,
  getAcademicYearRange
} from '../utilities/auth.js';

let input = "";
let attendanceCount;
let currentSession;
let programEl;
let lessonEl;
let dayEl;
let hourEl;

let programsMap = {};
let branchesMap = {};
let instructorsMap = {};
let sessionsToday2 = [];
let allCodeTable = [];
let allCustomers = [];
// ===================== INIT =====================
document.addEventListener("DOMContentLoaded", () => {
  loadData();

  document.querySelectorAll('input[name="idType"]').forEach(radio => {

    radio.addEventListener("change", () => {

      input = "";
      document.getElementById("numberInput").value = "";

    });

  });

  document.getElementById("btnSubmit")
    .addEventListener("click", submitAttendance);

  document.getElementById("btndeleteChar")
    .addEventListener("click", deleteChar);


  document.getElementById("btnSubmit")
    .addEventListener("click", instructorLogin);


  document.getElementById("btnSubmit")
    .addEventListener("click", changeLesson);

  document.querySelectorAll(".btndigit").forEach(btn => {

    btn.addEventListener("click", () => {

      addDigit(btn.textContent.trim());

    });

  });

});


function instructorLogin() {

}

function changeLesson() {

}

// ===================== MAIN =====================
async function loadData() {

  const today = new Date().toISOString().split('T')[0];

  const [
    programs,
    branches,
    instructors,
    sessions,
    codeTable,
    customers
  ] = await Promise.all([
    loadProgramsMap(),
    loadCodeDescriptions('branch'),
    loadInstructors(),
    program_sessions(today),
    allCodeTables(),
    allCCustomers()
  ]);

  programsMap = programs;
  branchesMap = branches;
  instructorsMap = instructors;
  sessionsToday2 = sessions;
  allCodeTable = codeTable;
  allCustomers = customers;
  // ===================== CODE MAP =====================
  const codeMap = {};

  (allCodeTable || []).forEach(row => {
    if (!codeMap[row.name]) {
      codeMap[row.name] = {};
    }
    codeMap[row.name][row.code] = row.descriptionCode;
  });

  // ===================== SESSIONS =====================
  (sessionsToday2 || []).forEach(session => {
    session.day = codeMap.days?.[session.day] || session.day;
  });


}
async function loadSessionById(sessionsId) {

  const data = await selectFromTables('session_attendance', {
    session_id: sessionsId
  });
  return data;
}
// ===================== LOADERS =====================

async function program_sessions(date) {
  return await selectFromTables('program_sessions', {
    date: date
  });
}

async function allCodeTables() {
  const data = await selectFromTable('codetables');
  return data || [];
}

async function allCCustomers() {
  const data = await selectFromTable('customers');
  return data || [];
}

async function loadProgramsMap() {
  const { data } = await selectFromTabletype('programs', {});
  return Object.fromEntries((data || []).map(p => [p.id, p]));
}

async function loadCodeDescriptions(type) {
  const { data } = await selectFromTabletype('codetables', {
    eq: ['name', type]
  });

  return Object.fromEntries(
    (data || []).map(row => [row.code, row.descriptionCode])
  );
}

async function loadInstructors() {
  const { data } = await selectFromTabletype('instructors', {});

  return Object.fromEntries(
    (data || []).map(row => [row.id, row.firstName])
  );
}

// ===================== NUMPAD =====================

function getType() {
  return document.querySelector('input[name="idType"]:checked').value;
}

function addDigit(d) {
  const type = getType();

  if (type === "phone" && input.length >= 11) return;
  if (type === "id" && input.length >= 9) return;

  input += d;
  formatInput();
}

function deleteChar() {
  input = input.slice(0, -1);
  formatInput();
}

function formatInput() {
  const type = getType();

  if (type === "phone") {
    let raw = input.replace("-", "");

    if (raw.length > 3) {
      input = raw.slice(0, 3) + "-" + raw.slice(3);
    } else {
      input = raw;
    }
  }

  const inputEl = document.getElementById("numberInput");
  if (inputEl) inputEl.value = input;
}

function isValid() {
  const type = getType();
  console.log("type");
  console.log(type);
  const raw = input.replace("-", "");

  console.log("raw");
  console.log(raw);
  if (type === "phone") {
    return /^05\d{8}$/.test(raw);
  }

  if (type === "id") {
    return /^\d{9}$/.test(raw);
  }

  return false;
}

async function submitAttendance() {

  // if (!isValid()) {
  //   alert("מספר לא תקין");

  //   input = "";
  //   const inputEl = document.getElementById("numberInput");
  //   console.log("inputEl.value");
  //   console.log(inputEl.value);
  //   if (inputEl) inputEl.value = "";

  //   return;
  // }

  const inputEl = document.getElementById("numberInput");


  let isExists = await addCustomer(inputEl.value, getType());

  console.log("OK:", {
    type: getType(),
    value: input.replace("-", "")
  });
  if (!isExists)
    showSuccess(`לא נמצא `, `נסה שנית`);
  else {
    await addCustomerSessionAttendance(isExists);
    showSuccess(`שלום, ${isExists.firstName} ${isExists.lastName}`, `הנוכחות נקלטה בהצלחה 💖`);
    const radio = document.querySelector('input[value="id"]');
    if (radio) radio.checked = true;
  }

  input = "";
  if (inputEl) inputEl.value = "";


}

async function addCustomerSessionAttendance(currentCustomer) {
  const currentSessionArray = Array.isArray(currentSession)
    ? currentSession
    : [currentSession];
  console.log("currentSession");
  console.log(currentSession);
  // האם רשומה למפגש הנוכחי
  const sessionCustomer = currentSessionArray.find(
    row => row.customer_id === currentCustomer.id
  );

  if (sessionCustomer) {

    await updateAttendance(sessionCustomer.id, {
      is_present: true
    });

    return {
      status: "registered",
      message: "נוכחות סומנה"
    };
  }


  // בדיקה האם הייתה נוכחות בעבר
  const hasPastAttendance = allAttendance.some(
    row =>
      row.customer_id === currentCustomer.id &&
      row.is_present === true
  );

  if (hasPastAttendance) {

    return {
      status: "makeup",
      message: "השלמה"
    };
  }

  return {
    status: "trial",
    message: "ניסיון"
  };
}

async function addCustomer(idValue, idType) {

  let customer;
  if (idType === "phone") {

    customer = allCustomers.find(c =>
      c.mobile?.toString().replace(/-/g, '') === idValue.toString().replace(/-/g, '')
    );

  } else if (idType === "id") {

    customer = allCustomers.find(c =>
      c.idValue?.toString() === idValue.toString()
    );

  }

  if (!customer) {
    console.log("לקוחה לא נמצאה");
    return null;
  }

  return customer;
}
// ===================== MODAL =====================

function showSuccess(textTitle, text) {

  const modal = document.getElementById("successModal");
  const textElTitle = document.getElementById("successTextTitle");
  const textEl = document.getElementById("successText");

  if (textEl) textElTitle.innerText = textTitle;
  if (textEl) textEl.innerText = text;
  if (!modal) return;

  modal.classList.remove("hidden");

  setTimeout(() => {
    modal.classList.add("hidden");
  }, 2000);
}


setInterval(() => {
  selectCurruntSession();
}, 15000);

async function selectCurruntSession() {

  const now = new Date();

  currentSession = sessionsToday2
    ?.map(session => {

      // זמן מגיע כ־20:00:00
      const [hours, minutes, seconds] = session.time.split(":").map(Number);

      const sessionTime = new Date();
      sessionTime.setHours(hours, minutes, seconds || 0, 0);

      const diffMinutes = (sessionTime - now) / (1000 * 60);

      return {
        session,
        diffMinutes
      };

    })
    .filter(item => item.diffMinutes >= 0 && item.diffMinutes <= 15)
    .sort((a, b) => a.diffMinutes - b.diffMinutes)[0]?.session;

  if (!currentSession) {
    console.log("לא נמצא מפגש ב-15 הדקות הקרובות");
    return;
  }

  // ===================== PROGRAM =====================
  const program = programsMap[currentSession.program_id];

  console.log("program", program);
  console.log("currentSession", currentSession);

  // ===================== DOM ELEMENTS =====================
  const programEl = document.getElementById("programName");
  const lessonEl = document.getElementById("lessonName");
  const dayEl = document.getElementById("lessonDay");
  const hourEl = document.getElementById("lessonHour");
  const attendanceCount = document.getElementById("attendanceCount");

  if (programEl) programEl.textContent = program?.name || "";
  if (lessonEl) lessonEl.textContent = program?.name || "";
  if (dayEl) dayEl.textContent = currentSession?.day || "";

  // ===================== ATTENDANCE =====================
  const sessionsTodayData = await loadSessionById(currentSession.id);

  if (attendanceCount) {
    attendanceCount.textContent = sessionsTodayData?.length || 0;
  }

  // ===================== TIME =====================
  const [h, m] = (currentSession.time || "00:00:00")
    .split(":")
    .map(Number);

  const formattedTime =
    String(h).padStart(2, "0") + ":" +
    String(m).padStart(2, "0");

  if (hourEl) {
    hourEl.textContent = formattedTime;
  }

  console.log("sessionsToday2:", sessionsToday2);
  console.log("programsMap:", programsMap);
}