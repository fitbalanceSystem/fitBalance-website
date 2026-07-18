import { selectFromTabletype, selectFromTables, selectFromTable, addAttendance, updateTable, removeAttendance } from '../utilities/dbservice.js';

let input = "";
let isSessionLoaded = false;
let programsMap = {};
let branchesMap = {};
let instructorsMap = {};
let currentSession = {};
let sessionsToday = [];
let allCodeTable = [];
let allCustomers = [];
let approvedInstructorId = null;
let sessionIsClosed = false;
let closingSchedulerInterval = null;
let alertStopped = false;

const popupCheckIntervalMinutes = 15;
const popupAutoCloseMinutes = 15;
const sessionDurationMinutes = 45;
const remindLaterMinutes = 1;

// ===================== SESSION FINDERS =====================

async function checkUpcomingSession(sessions) {
    const today = new Date().toLocaleDateString('en-CA');
    const now = new Date();
    const currentMinute = Math.floor(now.getTime() / 60000);
    return sessions.find(session => {
        if (session.is_closed) return false;
        const sessionDateTime = new Date(`${today}T${session.time}`);
        const sessionMinute = Math.floor(sessionDateTime.getTime() / 60000);
        const diffMinutes = sessionMinute - currentMinute;
        return diffMinutes >= 0 && diffMinutes <= popupCheckIntervalMinutes;
    });
}

function findActiveSession(sessions) {
    const today = new Date().toLocaleDateString('en-CA');
    const now = new Date();
    return sessions.find(session => {
        if (session.is_closed) return false;
        const start = new Date(`${today}T${session.time}`);
        const end = new Date(start.getTime() + sessionDurationMinutes * 60 * 1000);
        return now >= start && now < end;
    });
}

// ===================== INIT =====================

async function initDashboard() {
    const today = new Date().toISOString().split('T')[0];
    sessionsToday = await program_sessions(today);
    if (!sessionsToday || sessionsToday.length === 0) {
        openNoActiveSessionsModal(0);
        return;
    }
    await loadBaseData();
    currentSession = await checkUpcomingSession(sessionsToday);
    if (!currentSession) currentSession = findActiveSession(sessionsToday);
    if (!currentSession)
        openNoActiveSessionsModal(1);
    else
        loadUpcomingSession();
}

document.addEventListener("DOMContentLoaded", async () => {
    await initDashboard();
});

// ===================== SESSION TIMING =====================

function getSessionSecsLeft() {
    if (!currentSession) return null;
    const [h, m] = (currentSession.time || "00:00:00").split(":").map(Number);
    const sessionEnd = new Date();
    sessionEnd.setHours(h, m + sessionDurationMinutes, 0, 0);
    return Math.round((sessionEnd - new Date()) / 1000);
}

function startPerSecondCountdown() {
    if (closingSchedulerInterval) clearInterval(closingSchedulerInterval);
    closingSchedulerInterval = setInterval(() => {
        if (alertStopped) {
            clearInterval(closingSchedulerInterval);
            closingSchedulerInterval = null;
            return;
        }
        const secsLeft = getSessionSecsLeft();
        if (secsLeft === null) return;
        if (secsLeft <= 0) {
            clearInterval(closingSchedulerInterval);
            closingSchedulerInterval = null;
            document.getElementById("sessionEndingModal")?.classList.add("hidden");
            document.getElementById("closeSessionModal")?.classList.remove("hidden");
        } else {
            showSessionEndingPopup(secsLeft);
        }
    }, 1000);
}

function startSessionClosingPopupScheduler() {
    if (closingSchedulerInterval) clearInterval(closingSchedulerInterval);
    closingSchedulerInterval = setInterval(() => {
        if (alertStopped) {
            clearInterval(closingSchedulerInterval);
            closingSchedulerInterval = null;
            return;
        }
        const secsLeft = getSessionSecsLeft();
        if (secsLeft === null) return;
        if (secsLeft <= 0) {
            clearInterval(closingSchedulerInterval);
            closingSchedulerInterval = null;
            document.getElementById("closeSessionModal")?.classList.remove("hidden");
        } else if (secsLeft <= popupAutoCloseMinutes * 60) {
            showSessionEndingPopup(secsLeft);
            startPerSecondCountdown();
        }
    }, popupAutoCloseMinutes * 60 * 1000);
}

function startSessionCompletionMonitor() {
    setInterval(() => {
        if (!currentSession) return;
        const secsLeft = getSessionSecsLeft();
        if (secsLeft !== null && secsLeft <= 0 && !sessionIsClosed)
            document.getElementById("closeSessionModal")?.classList.remove("hidden");
    }, popupCheckIntervalMinutes * 60 * 1000);
}

function checkAndShowSessionEndingNow() {
    if (!currentSession) return;
    const secsLeft = getSessionSecsLeft();
    if (secsLeft === null) return;
    if (secsLeft <= 0) {
        document.getElementById("closeSessionModal")?.classList.remove("hidden");
    } else if (secsLeft <= popupAutoCloseMinutes * 60) {
        showSessionEndingPopup(secsLeft);
        startPerSecondCountdown();
    }
    // אם נשאר יותר מ-popupAutoCloseMinutes — לא מקפיצים כלום
}

function showSessionEndingPopup(secsLeft) {
    const modal = document.getElementById("sessionEndingModal");
    const label = document.getElementById("sessionEndingText");
    if (label) {
        const mins = Math.floor(secsLeft / 60);
        const secs = secsLeft % 60;
        const display = mins > 0
            ? `${mins}:${String(secs).padStart(2, "0")} דקות`
            : `${secs} שניות`;
        label.textContent = `השיעור מסתיים בעוד ${display}`;
    }
    modal?.classList.remove("hidden");
}

// ===================== LOAD SESSION =====================

async function loadUpcomingSession() {
    const program = programsMap[currentSession.program_id];

    const lessonEl = document.getElementById("lessonName");
    const dayEl = document.getElementById("lessonDay");
    const hourEl = document.getElementById("lessonHour");
    const attendanceCount = document.getElementById("attendanceCount");

    if (lessonEl) lessonEl.textContent = program?.name || "";
    if (dayEl) dayEl.textContent = currentSession?.day || "";

    const sessionsTodayData = await loadSessionById(currentSession.id);
    const presentCount = (sessionsTodayData || []).filter(r => r.is_present === true).length;
    if (attendanceCount) attendanceCount.textContent = presentCount;

    const [h, m] = (currentSession.time || "00:00:00").split(":").map(Number);
    if (hourEl) hourEl.textContent = String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0");

    // שיעור סגור מה-DB
    if (currentSession.is_closed) {
        sessionIsClosed = true;
        updateSessionClosedUI();
    }

    isSessionLoaded = true;
    alertStopped = false;
    if (!sessionIsClosed) {
        checkAndShowSessionEndingNow();
        if (!closingSchedulerInterval) startSessionClosingPopupScheduler();
        checkUnclosedPreviousSessions();
        scheduleEndOfSessionBell();
    }
}

async function loadSessionManually(sessionId) {
    const session = sessionsToday.find(s => s.id == sessionId);
    if (!session || session.is_closed) return;
    if (closingSchedulerInterval) { clearInterval(closingSchedulerInterval); closingSchedulerInterval = null; }
    currentSession = session;
    isSessionLoaded = true;
    sessionIsClosed = false;
    updateSessionClosedUI();
    loadUpcomingSession();
}

let endOfSessionBellTimeout = null;

function scheduleEndOfSessionBell() {
    if (endOfSessionBellTimeout) { clearTimeout(endOfSessionBellTimeout); endOfSessionBellTimeout = null; }
    const secsLeft = getSessionSecsLeft();
    if (secsLeft === null || secsLeft <= 0) return;
    endOfSessionBellTimeout = setTimeout(() => {
        if (sessionIsClosed) return;
        // אם השיעור עדיין לא נסגר, הצג אותו כשיעור שלא נסגר בפעמון
        const bell = document.getElementById("unclosedBell");
        const badge = document.getElementById("unclosedBadge");
        if (!bell) return;
        // הוסף את השיעור הנוכחי לרשימת הלא-סגורים אם אינו שם
        const existing = bell._unclosedSessions || [];
        const alreadyIn = existing.some(s => s.id === currentSession?.id);
        if (!alreadyIn && currentSession) {
            bell._unclosedSessions = [...existing, currentSession];
            const count = bell._unclosedSessions.length;
            if (badge) badge.textContent = count;
            bell.classList.remove("hidden");
        }
    }, secsLeft * 1000);
}


function checkUnclosedPreviousSessions() {
    if (!currentSession) {
        const bell = document.getElementById("unclosedBell");
        if (bell) { bell.classList.add("hidden"); bell._unclosedSessions = []; }
        return;
    }
    const today = new Date().toLocaleDateString('en-CA');
    const currentStart = new Date(`${today}T${currentSession.time}`);

    const unclosed = (sessionsToday || []).filter(s => {
        if (s.id === currentSession.id || s.is_closed) return false;
        const sStart = new Date(`${today}T${s.time}`);
        return sStart < currentStart;
    });

    const bell = document.getElementById("unclosedBell");
    const badge = document.getElementById("unclosedBadge");
    if (!bell) return;

    if (unclosed.length > 0) {
        bell.classList.remove("hidden");
        if (badge) badge.textContent = unclosed.length;
        bell._unclosedSessions = unclosed;
    } else {
        bell.classList.add("hidden");
    }
}

function openUnclosedModal(session) {
    const program = programsMap[session.program_id];
    const name = program?.name || session.program_id;
    const time = (session.time || '').slice(0, 5);
    const titleEl = document.getElementById("unclosedModalTitle");
    if (titleEl) titleEl.textContent = `שיעור "${name}" בשעה ${time} לא נסגר`;
    document.getElementById("unclosedModal").dataset.sessionId = session.id;
    document.getElementById("unclosedModal")?.classList.remove("hidden");
}

// ===================== CLOSE SESSION =====================

async function closeSession() {
    if (!currentSession) return;
    // עדכון is_closed ב-DB ובמערך המקומי
    const closedId = currentSession.id;
    await updateTable('program_sessions', { is_closed: true }, { id: closedId });
    const local = (sessionsToday || []).find(s => s.id === closedId);
    if (local) local.is_closed = true;

    document.getElementById("closeSessionModal")?.classList.add("hidden");
    sessionIsClosed = true;
    updateSessionClosedUI();
    document.getElementById("lessonName").textContent = "";
    document.getElementById("lessonDay").textContent = "";
    document.getElementById("lessonHour").textContent = "";
    document.getElementById("attendanceCount").textContent = "0";
    currentSession = null;
    isSessionLoaded = false;
    if (closingSchedulerInterval) { clearInterval(closingSchedulerInterval); closingSchedulerInterval = null; }
}

async function confirmAndCloseSession() {
    if (!currentSession || !approvedInstructorId) return;

    const ok = confirm("האם את בטוחה שברצונך לסגור את השיעור?");
    if (!ok) return;

    const attendance = await loadSessionById(currentSession.id);
    const present = (attendance || []).filter(r => r.is_present === true);
    await Promise.all(
        present.map(r => updateTable('session_attendance', { is_present: true }, { id: r.id }))
    );
    document.getElementById("sessionAttendanceListModal")?.classList.add("hidden");
    approvedInstructorId = null;

    // עצירת הטיימר לפני סגירה
    if (closingSchedulerInterval) { clearInterval(closingSchedulerInterval); closingSchedulerInterval = null; }
    document.getElementById("sessionEndingModal")?.classList.add("hidden");

    sessionIsClosed = true;
    updateSessionClosedUI();

    const modal = document.getElementById("successModal");
    const titleEl = document.getElementById("successTextTitle");
    const textEl = document.getElementById("successText");
    const icon = document.getElementById("successIcon");
    if (icon) { icon.textContent = "✓"; icon.className = "text-8xl text-green-500 mb-4"; }
    if (titleEl) titleEl.textContent = "השיעור נסגר בהצלחה";
    if (textEl) textEl.textContent = `${present.length} בנות אושרו לשיעור 💖`;
    modal?.classList.remove("hidden");
    setTimeout(() => {
        modal?.classList.add("hidden");
        closeSession();
    }, 3000);
}

// ===================== PASSWORD MODAL =====================

async function verifyInstructorPassword(password) {
    const instructors = await selectFromTable('instructors', { password });
    return (instructors && instructors.length > 0) ? instructors[0] : null;
}

// source: 'ending' = מהמודאל ספירה, 'closeModal' = מכפתור סגור שיעור הישיר
function openPasswordModal(source = 'ending') {
    document.getElementById("sessionEndingModal")?.classList.add("hidden");
    if (source !== 'closeModal') document.getElementById("closeSessionModal")?.classList.add("hidden");
    document.getElementById("instructorPasswordInput").value = "";
    document.getElementById("passwordError").textContent = "";
    document.getElementById("passwordModal").dataset.source = source;
    document.getElementById("passwordModal")?.classList.remove("hidden");
}

// ===================== UI STATE =====================

function updateSessionClosedUI() {
    const badge = document.getElementById("sessionClosedBadge");
    const submitBtn = document.getElementById("btnSubmit");
    const closeBtn = document.getElementById("btninstructorLogin");
    const numpadBtns = document.querySelectorAll(".btndigit, #btndeleteChar");
    const numberInput = document.getElementById("numberInput");

    if (sessionIsClosed) {
        if (badge) badge.classList.remove("hidden");
        if (submitBtn) submitBtn.disabled = true;
        if (closeBtn) {
            closeBtn.disabled = true;
            closeBtn.className = closeBtn.className
                .replace(/text-rose-700/, 'text-gray-400')
                .replace(/border-rose-200/, 'border-gray-200');
        }
        numpadBtns.forEach(b => b.disabled = true);
        if (numberInput) numberInput.disabled = true;
    } else {
        if (badge) badge.classList.add("hidden");
        if (submitBtn) submitBtn.disabled = false;
        if (closeBtn) {
            closeBtn.disabled = false;
            closeBtn.className = closeBtn.className
                .replace(/text-gray-400/, 'text-rose-700')
                .replace(/border-gray-200/, 'border-rose-200');
        }
        numpadBtns.forEach(b => b.disabled = false);
        if (numberInput) numberInput.disabled = false;
    }
}

// ===================== ATTENDANCE LIST MODAL =====================

let pendingDeletions = []; // { session_id, customer_id }

async function refreshAttendanceList() {
    const list = document.getElementById("attendanceNamesList");
    const countEl = document.getElementById("attendanceListCount");
    const pendingSection = document.getElementById("pendingDeletionsSection");
    const saveBtn = document.getElementById("btnSavePendingChanges");
    const cancelBtn = document.getElementById("btnCancelAttendanceList");
    if (!list) return;
    list.innerHTML = "";

    const attendance = await loadSessionById(currentSession?.id);
    const present = (attendance || []).filter(r =>
        r.is_present === true &&
        !pendingDeletions.some(d => d.customer_id == r.customer_id)
    );

    const displayCount = present.length;
    if (countEl) countEl.textContent = displayCount;
    const cardCount = document.getElementById("attendanceCount");
    if (cardCount) cardCount.textContent = displayCount;

    const hasPending = pendingDeletions.length > 0;
    if (pendingSection) pendingSection.classList.toggle("hidden", !hasPending);
    if (saveBtn) {
        saveBtn.classList.toggle("hidden", !hasPending);
        // כשיש מחיקות מחכות, הלחצן סגור תפוס עמודה אחת
        if (cancelBtn) cancelBtn.className = cancelBtn.className
            .replace('col-span-2', hasPending ? 'col-span-1' : 'col-span-2');
    }

    if (present.length === 0) {
        list.innerHTML = '<p class="text-center text-gray-400 py-3 text-sm">לא סומנה נוכחות לשיעור זה</p>';
        return;
    }

    present.forEach((r, i) => {
        const customer = allCustomers.find(c => c.id === r.customer_id);
        const name = customer ? `${customer.firstName} ${customer.lastName}` : `לקוחה ${r.customer_id}`;
        const div = document.createElement("div");
        div.className = "flex items-center gap-3 px-4 py-2 rounded-2xl bg-green-50 border border-green-100";
        const deleteBtn = `<button data-session="${r.session_id}" data-customer="${r.customer_id}"
            class="btnDeleteAttendance mr-auto text-red-400 hover:text-red-600 text-base font-bold transition">✕</button>`;
        div.innerHTML = `<span class="text-green-500 font-bold text-sm">${i + 1}.</span>
            <span class="text-gray-700 font-semibold text-sm flex-1">${name}</span>
            <span class="text-green-400 text-sm">✓</span>${deleteBtn}`;
        list.appendChild(div);
    });

    list.querySelectorAll(".btnDeleteAttendance").forEach(btn => {
        btn.addEventListener("click", () => {
            pendingDeletions.push({ session_id: btn.dataset.session, customer_id: btn.dataset.customer });
            refreshAttendanceList();
        });
    });
}

async function openAttendanceListModal() {
    pendingDeletions = [];
    const errEl = document.getElementById("attendanceAddError");
    const addInput = document.getElementById("attendanceAddInput");
    const addSection = document.getElementById("attendanceAddSection");
    const liveSearch = document.getElementById("attendanceLiveSearch");
    if (errEl) errEl.textContent = "";
    if (addInput) addInput.value = "";
    if (addSection) addSection.classList.remove("hidden");
    if (liveSearch) liveSearch.classList.add("hidden");
    // reset radio
    const idRadio = document.querySelector('input[name="modalIdType"][value="id"]');
    if (idRadio) idRadio.checked = true;
    document.getElementById("sessionAttendanceListModal").dataset.isUnclosed = "";
    document.getElementById("sessionAttendanceListModal").dataset.savedSessionId = "";
    await refreshAttendanceList();
    document.getElementById("sessionAttendanceListModal")?.classList.remove("hidden");
}

function getModalIdType() {
    return document.querySelector('input[name="modalIdType"]:checked')?.value || "id";
}

async function addAttendanceFromModal() {
    const addInput = document.getElementById("attendanceAddInput");
    const errorEl = document.getElementById("attendanceAddError");
    const value = addInput?.value?.trim();
    if (!value) return;

    const idType = getModalIdType();

    if (idType === 'phone' && !isValidPhone(value)) {
        if (errorEl) errorEl.textContent = "נייד חייב להתחיל ב-05 ולהכיל 10 ספרות"; return;
    }
    if (idType === 'id' && !isValidId(value)) {
        if (errorEl) errorEl.textContent = "ת.ז שגויה, בדקי שנית"; return;
    }

    const customer = findCustomer(idType, value);
    if (!customer) { if (errorEl) errorEl.textContent = "לא נמצאה לקוחה"; return; }

    const attendance = await loadSessionById(currentSession.id);
    const already = (attendance || []).find(r => r.customer_id === customer.id && r.is_present === true);
    const inPending = pendingDeletions.some(d => d.customer_id == customer.id);

    if (already && !inPending) { if (errorEl) errorEl.textContent = "הלקוחה כבר מסומנת"; return; }

    if (inPending) {
        // ביטול המחיקה הזמנית
        pendingDeletions = pendingDeletions.filter(d => d.customer_id != customer.id);
    } else {
        const existing = (attendance || []).find(r => r.customer_id === customer.id);
        if (existing)
            await updateTable('session_attendance', { is_present: true }, { id: existing.id });
        else
            await addAttendance(currentSession.id, customer.id);
    }

    if (errorEl) errorEl.textContent = "";
    if (addInput) addInput.value = "";
    document.getElementById("attendanceLiveSearch")?.classList.add("hidden");
    refreshAttendanceList();
}

function runLiveSearch() {
    const addInput = document.getElementById("attendanceAddInput");
    const liveSearch = document.getElementById("attendanceLiveSearch");
    if (!addInput || !liveSearch) return;

    const value = addInput.value.trim();
    const idType = getModalIdType();

    if (value.length < 2) { liveSearch.classList.add("hidden"); return; }

    const raw = value.replace(/[-\s]/g, '').toLowerCase();
    const results = allCustomers.filter(c => {
        if (idType === 'phone') {
            return (c.mobile?.toString().replace(/[-\s]/g, '') || '').startsWith(raw);
        } else {
            const cId = (c.idValue?.toString() || '').padStart(9, '0');
            return cId.startsWith(raw.padStart ? raw : raw) ||
                   cId.replace(/^0+/, '').startsWith(raw.replace(/^0+/, ''));
        }
    }).slice(0, 5);

    if (results.length === 0) { liveSearch.classList.add("hidden"); return; }

    liveSearch.innerHTML = "";
    liveSearch.classList.remove("hidden");
    results.forEach(c => {
        const btn = document.createElement("button");
        btn.className = "text-right w-full px-3 py-1.5 rounded-xl hover:bg-green-50 text-sm text-gray-700 font-semibold transition";
        btn.textContent = `${c.firstName} ${c.lastName}`;
        btn.addEventListener("click", () => {
            addInput.value = idType === 'phone'
                ? (c.mobile?.toString() || '')
                : (c.idValue?.toString() || '');
            liveSearch.classList.add("hidden");
            addAttendanceFromModal();
        });
        liveSearch.appendChild(btn);
    });
}

// ===================== VALIDATION =====================

function normalizePhone(val) {
    return val.replace(/[-\s]/g, '');
}

function isValidPhone(val) {
    const raw = normalizePhone(val);
    return /^05\d{8}$/.test(raw);
}

function isValidId(val) {
    // תומך ב-9 ספרות עם או בלי 0 בהתחלה (מרחיב ל-9)
    const padded = val.padStart(9, '0');
    if (!/^\d{9}$/.test(padded)) return false;
    let sum = 0;
    for (let i = 0; i < 9; i++) {
        let d = parseInt(padded[i]) * (i % 2 === 0 ? 1 : 2);
        if (d > 9) d -= 9;
        sum += d;
    }
    return sum % 10 === 0;
}

function findCustomer(idType, value) {
    const raw = normalizePhone(value);
    if (idType === 'phone') {
        return allCustomers.find(c => normalizePhone(c.mobile?.toString() || '') === raw);
    }
    // ת.ז — חיפוש גמיש: עם ובלי אפס מוביל
    const padded = value.padStart(9, '0');
    const stripped = value.replace(/^0+/, '') || '0';
    return allCustomers.find(c => {
        const cId = c.idValue?.toString() || '';
        return cId === value || cId === padded || cId === stripped ||
               cId.padStart(9, '0') === padded;
    });
}


async function checkParticipantStatus(customerId) {
    if (!currentSession) return null;
    const attendance = await loadSessionById(currentSession.id);
    const record = (attendance || []).find(r => r.customer_id === customerId);
    if (record) return { status: "registered", record };
    const allAttendance = await selectFromTables('session_attendance', { customer_id: customerId });
    const hasPast = (allAttendance || []).some(r => r.is_present === true);
    return hasPast ? { status: "makeup" } : { status: "trial" };
}

async function submitAttendance() {
    if (!currentSession) { alert("לא נבחר מפגש פעיל"); return; }
    const inputEl = document.getElementById("numberInput");
    const idType = document.querySelector('input[name="idType"]:checked')?.value || "id";
    const value = inputEl?.value?.trim();
    if (!value) return;

    if (idType === 'phone' && !isValidPhone(value)) {
        showFeedback("מספר נייד שגוי", "נייד חייב להתחיל ב-05 ולהכיל 10 ספרות", false);
        return;
    }
    if (idType === 'id' && !isValidId(value)) {
        showFeedback("ת.ז שגויה", "בדקי את מספר תעודת הזהות", false);
        return;
    }

    const customer = findCustomer(idType, value);
    if (!customer) {
        showFeedback("לא נמצאה לקוחה", "נסי שנית", false);
        if (inputEl) inputEl.value = "";
        input = "";
        return;
    }

    const statusInfo = await checkParticipantStatus(customer.id);
    if (statusInfo?.status === "registered" && statusInfo.record) {
        if (statusInfo.record.is_present === true) {
            showFeedback(`${customer.firstName} ${customer.lastName}`, "כבר רשומה לשיעור זה ✓", false);
            if (inputEl) inputEl.value = "";
            input = "";
            return;
        }
        await updateTable('session_attendance', { is_present: true }, { id: statusInfo.record.id });
    } else {
        await addAttendance(currentSession.id, customer.id);
    }

    const countEl = document.getElementById("attendanceCount");
    const updated = await loadSessionById(currentSession.id);
    const presentCount = (updated || []).filter(r => r.is_present === true).length;
    if (countEl) countEl.textContent = presentCount;

    showFeedback(`שלום, ${customer.firstName} ${customer.lastName}`, "הנוכחות נקלטה בהצלחה 💖", true);

    const radio = document.querySelector('input[value="id"]');
    if (radio) radio.checked = true;
    input = "";
    if (inputEl) inputEl.value = "";
}

// ===================== DATA LOADING =====================

async function program_sessions(date) {
    const all = await selectFromTables('program_sessions', { date });
    return (all || []).filter(s => s.status === null || s.status === 1 || s.status === undefined);
}

async function loadBaseData() {
    const [programs, branches, instructors, codeTable, customers] = await Promise.all([
        loadProgramsMap(), loadCodeDescriptions('branch'), loadInstructors(), allCodeTables(), allCCustomers()
    ]);
    programsMap = programs;
    branchesMap = branches;
    instructorsMap = instructors;
    allCodeTable = codeTable;
    allCustomers = customers;

    const codeMap = {};
    (allCodeTable || []).forEach(row => {
        if (!codeMap[row.name]) codeMap[row.name] = {};
        codeMap[row.name][row.code] = row.descriptionCode;
    });
    (sessionsToday || []).forEach(session => {
        session.day = codeMap.days?.[session.day] || session.day;
    });
}

async function allCodeTables() { return (await selectFromTable('codetables')) || []; }
async function allCCustomers() { return (await selectFromTable('customers')) || []; }
async function loadProgramsMap() {
    const { data } = await selectFromTabletype('programs', {});
    return Object.fromEntries((data || []).map(p => [p.id, p]));
}
async function loadCodeDescriptions(type) {
    const { data } = await selectFromTabletype('codetables', { eq: ['name', type] });
    return Object.fromEntries((data || []).map(row => [row.code, row.descriptionCode]));
}
async function loadInstructors() {
    const { data } = await selectFromTabletype('instructors', {});
    return Object.fromEntries((data || []).map(row => [row.id, row.firstName]));
}
async function loadSessionById(sessionsId) {
    return await selectFromTables('session_attendance', { session_id: sessionsId });
}

// ===================== MODALS =====================

function openNoActiveSessionsModal(haveSession) {
    const MainTitle = document.getElementById("ModalMainTitle");
    document.getElementById("noActiveSessionsModal").classList.remove("hidden");
    MainTitle.textContent = haveSession === 0
        ? "אין מפגשים פעילים היום!"
        : `לא נמצא מפגש ב ${popupCheckIntervalMinutes} דקות הקרובות`;
}

function closeNoActiveSessionsModal() {
    document.getElementById("noActiveSessionsModal").classList.add("hidden");
}

function openChangeLessonModal() {
    const list = document.getElementById("sessionsList");
    if (!list) return;
    list.innerHTML = "";
    const sessions = sessionsToday || [];
    if (sessions.length === 0) {
        list.innerHTML = '<p class="text-center text-gray-400 py-4">אין שיעורים להיום</p>';
    } else {
        sessions.forEach(s => {
            const program = programsMap[s.program_id];
            const isClosed = !!s.is_closed;
            const btn = document.createElement("button");
            btn.className = `w-full text-right px-4 py-3 rounded-2xl border font-semibold transition flex items-center justify-between gap-2
                ${isClosed
                    ? 'border-gray-200 text-gray-400 bg-gray-50 cursor-pointer'
                    : 'border-pink-200 text-rose-700 hover:bg-pink-50'}`;
            btn.innerHTML = `<span>${program?.name || s.program_id} — ${(s.time || '').slice(0, 5)} — ${s.day || ''}</span>
                ${isClosed ? '<span class="text-gray-400">🔒 נעול</span>' : ''}`;
            btn.addEventListener("click", () => {
                if (isClosed) {
                    document.getElementById("changeLessonModal")?.classList.add("hidden");
                    showLockedSessionAlert();
                    return;
                }
                loadSessionManually(s.id);
                document.getElementById("changeLessonModal")?.classList.add("hidden");
            });
            list.appendChild(btn);
        });
    }
    document.getElementById("changeLessonModal")?.classList.remove("hidden");
}

function showLockedSessionAlert() {
    const modal = document.getElementById("successModal");
    const titleEl = document.getElementById("successTextTitle");
    const textEl = document.getElementById("successText");
    const icon = document.getElementById("successIcon");
    if (icon) { icon.textContent = "🔒"; icon.className = "text-8xl mb-4"; }
    if (titleEl) titleEl.textContent = "השיעור נעול";
    if (textEl) textEl.textContent = "לשינוי פנה למנהל המערכת";
    modal?.classList.remove("hidden");
    setTimeout(() => modal?.classList.add("hidden"), 3000);
}

// ===================== INPUT =====================

function getIdType() {
    return document.querySelector('input[name="idType"]:checked')?.value || "id";
}

function addDigit(d) {
    const type = getIdType();
    if (type === "phone" && input.replace("-", "").length >= 10) return;
    if (type === "id" && input.length >= 9) return;
    input += d;
    formatInput();
}

function deleteChar() {
    input = input.replace("-", "").slice(0, -1);
    formatInput();
}

function formatInput() {
    const type = getIdType();
    let raw = input.replace("-", "");
    input = (type === "phone" && raw.length > 3) ? raw.slice(0, 3) + "-" + raw.slice(3) : raw;
    const inputEl = document.getElementById("numberInput");
    if (inputEl) inputEl.value = input;
}

function showFeedback(title, text, success) {
    const modal = document.getElementById("successModal");
    const titleEl = document.getElementById("successTextTitle");
    const textEl = document.getElementById("successText");
    const icon = document.getElementById("successIcon");
    if (titleEl) titleEl.textContent = title;
    if (textEl) textEl.textContent = text;
    if (icon) {
        icon.textContent = success ? "✓" : "✗";
        icon.className = success ? "text-8xl text-green-500 mb-4" : "text-8xl text-red-500 mb-4";
    }
    modal?.classList.remove("hidden");
    setTimeout(() => modal?.classList.add("hidden"), 2000);
}

// ===================== EVENT LISTENERS =====================

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("unclosedBell")
        ?.addEventListener("click", () => {
            const sessions = document.getElementById("unclosedBell")._unclosedSessions || [];
            if (sessions.length > 0) openUnclosedModal(sessions[0]);
        });

    document.getElementById("btnCloseUnclosedSession")
        ?.addEventListener("click", async () => {
            const sessionId = parseInt(document.getElementById("unclosedModal").dataset.sessionId);
            document.getElementById("unclosedModal")?.classList.add("hidden");
            const savedSession = currentSession;
            const session = (sessionsToday || []).find(s => s.id === sessionId);
            if (!session) return;
            currentSession = session;
            document.getElementById("sessionAttendanceListModal").dataset.isUnclosed = "true";
            document.getElementById("sessionAttendanceListModal").dataset.savedSessionId = savedSession?.id || "";
            await openAttendanceListModal();
        });

    document.getElementById("btnCancelUnclosedModal")
        ?.addEventListener("click", () => document.getElementById("unclosedModal")?.classList.add("hidden"));

    document.getElementById("btninstructorLogin")
        ?.addEventListener("click", () => openPasswordModal('closeModal'));

    document.getElementById("btnCloseNoSessionModal")
        ?.addEventListener("click", closeNoActiveSessionsModal);

    document.getElementById("btnChooseLesson")
        ?.addEventListener("click", () => { closeNoActiveSessionsModal(); openChangeLessonModal(); });

    document.getElementById("btnchangeLesson")
        ?.addEventListener("click", openChangeLessonModal);

    document.getElementById("btnSubmit")
        ?.addEventListener("click", submitAttendance);

    document.getElementById("btndeleteChar")
        ?.addEventListener("click", deleteChar);

    document.getElementById("btnCloseChangeLesson")
        ?.addEventListener("click", () => document.getElementById("changeLessonModal")?.classList.add("hidden"));

    // סגור שיעור ישיר — דרך אימות סיסמא
    document.getElementById("btnConfirmCloseSession")
        ?.addEventListener("click", () => openPasswordModal('closeModal'));

    document.getElementById("btnCancelCloseSession")
        ?.addEventListener("click", () => document.getElementById("closeSessionModal")?.classList.add("hidden"));

    document.getElementById("btnStopAlert")
        ?.addEventListener("click", () => {
            alertStopped = true;
            if (closingSchedulerInterval) { clearInterval(closingSchedulerInterval); closingSchedulerInterval = null; }
            document.getElementById("sessionEndingModal")?.classList.add("hidden");
        });

    document.getElementById("btnRemindLater")
        ?.addEventListener("click", () => {
            alertStopped = false;
            document.getElementById("sessionEndingModal")?.classList.add("hidden");
            if (closingSchedulerInterval) { clearInterval(closingSchedulerInterval); closingSchedulerInterval = null; }
            setTimeout(() => {
                if (alertStopped) return;
                const secsLeft = getSessionSecsLeft();
                if (secsLeft !== null && secsLeft > 0) {
                    showSessionEndingPopup(secsLeft);
                    startPerSecondCountdown();
                } else {
                    document.getElementById("closeSessionModal")?.classList.remove("hidden");
                }
            }, remindLaterMinutes * 60 * 1000);
        });

    // סגור שיעור ממודאל ספירה — דרך אימות סיסמא
    document.getElementById("btnCloseSessionFromEnding")
        ?.addEventListener("click", () => openPasswordModal('ending'));

    document.getElementById("btnConfirmPassword")
        ?.addEventListener("click", async () => {
            const password = document.getElementById("instructorPasswordInput").value.trim();
            const instructor = await verifyInstructorPassword(password);
            if (!instructor) {
                document.getElementById("passwordError").textContent = "סיסמא שגויה, נסי שנית";
                return;
            }
            approvedInstructorId = instructor.id;
            const pwModal = document.getElementById("passwordModal");
            const unclosedId = pwModal.dataset.unclosedId;
            const savedSessionId = pwModal.dataset.savedSessionId;
            pwModal.dataset.unclosedId = "";
            pwModal.dataset.savedSessionId = "";
            pwModal?.classList.add("hidden");

            if (unclosedId) {
                const sessionId = parseInt(unclosedId);
                await updateTable('program_sessions', { is_closed: true }, { id: sessionId });
                const local = (sessionsToday || []).find(s => s.id === sessionId);
                if (local) local.is_closed = true;
                // שחזור לשיעור הנוכחי האמיתי
                if (savedSessionId) {
                    currentSession = (sessionsToday || []).find(s => s.id === parseInt(savedSessionId)) || currentSession;
                }
                approvedInstructorId = null;
                checkUnclosedPreviousSessions();
                showFeedback("שיעור נסגר בהצלחה", "✓", true);
            } else {
                openAttendanceListModal();
            }
        });

    document.getElementById("btnCancelPassword")
        ?.addEventListener("click", () => {
            document.getElementById("passwordModal")?.classList.add("hidden");
        });

    document.getElementById("btnConfirmCloseFromList")
        ?.addEventListener("click", async () => {
            const modal = document.getElementById("sessionAttendanceListModal");
            const isUnclosed = modal.dataset.isUnclosed === "true";
            if (pendingDeletions.length > 0) {
                const ok = confirm(`יש ${pendingDeletions.length} מחיקות שלא נשמרו. להמשיך?`);
                if (!ok) return;
                await Promise.all(pendingDeletions.map(d => removeAttendance(d.session_id, d.customer_id)));
                pendingDeletions = [];
            }
            if (isUnclosed) {
                const savedSessionId = modal.dataset.savedSessionId;
                const unclosedSessionId = currentSession?.id;
                modal.dataset.isUnclosed = "";
                modal.dataset.savedSessionId = "";
                modal?.classList.add("hidden");
                document.getElementById("passwordModal").dataset.unclosedId = unclosedSessionId;
                document.getElementById("passwordModal").dataset.savedSessionId = savedSessionId;
                openPasswordModal('unclosed');
            } else {
                confirmAndCloseSession();
            }
        });

    document.getElementById("btnSavePendingChanges")
        ?.addEventListener("click", async () => {
            if (pendingDeletions.length === 0) return;
            const ok = confirm(`למחוק ${pendingDeletions.length} בנות מרשימת הנוכחות?`);
            if (!ok) return;
            await Promise.all(pendingDeletions.map(d => removeAttendance(d.session_id, d.customer_id)));
            pendingDeletions = [];
            refreshAttendanceList();
        });

    document.getElementById("btnCancelAttendanceList")
        ?.addEventListener("click", async () => {
            if (pendingDeletions.length > 0) {
                const ok = confirm("יש מחיקות שלא נשמרו. לסגור בלי לשמור?");
                if (!ok) return;
                pendingDeletions = [];
            }
            document.getElementById("sessionAttendanceListModal")?.classList.add("hidden");
        });

    document.getElementById("btnAddAttendanceFromModal")
        ?.addEventListener("click", addAttendanceFromModal);

    document.getElementById("attendanceAddInput")
        ?.addEventListener("keydown", e => { if (e.key === "Enter") addAttendanceFromModal(); });

    document.getElementById("attendanceAddInput")
        ?.addEventListener("input", runLiveSearch);

    document.querySelectorAll('input[name="modalIdType"]').forEach(r =>
        r.addEventListener("change", () => {
            const addInput = document.getElementById("attendanceAddInput");
            if (addInput) addInput.value = "";
            document.getElementById("attendanceLiveSearch")?.classList.add("hidden");
            const errEl = document.getElementById("attendanceAddError");
            if (errEl) errEl.textContent = "";
        })
    );

    document.getElementById("btnRefresh")
        ?.addEventListener("click", async () => {
            if (closingSchedulerInterval) { clearInterval(closingSchedulerInterval); closingSchedulerInterval = null; }
            if (endOfSessionBellTimeout) { clearTimeout(endOfSessionBellTimeout); endOfSessionBellTimeout = null; }
            sessionIsClosed = false;
            alertStopped = false;
            input = "";
            currentSession = {};
            isSessionLoaded = false;
            approvedInstructorId = null;
            document.getElementById("lessonName").textContent = "";
            document.getElementById("lessonDay").textContent = "";
            document.getElementById("lessonHour").textContent = "";
            document.getElementById("attendanceCount").textContent = "";
            document.getElementById("numberInput").value = "";
            // איפוס פעמון
            const bell = document.getElementById("unclosedBell");
            if (bell) { bell.classList.add("hidden"); bell._unclosedSessions = []; }
            updateSessionClosedUI();
            await initDashboard();
        });

    document.querySelectorAll(".btndigit").forEach(btn =>
        btn.addEventListener("click", () => addDigit(btn.textContent.trim()))
    );

    document.querySelectorAll('input[name="idType"]').forEach(radio =>
        radio.addEventListener("change", () => {
            input = "";
            const inputEl = document.getElementById("numberInput");
            if (inputEl) inputEl.value = "";
        })
    );

    startSessionCompletionMonitor();
});
