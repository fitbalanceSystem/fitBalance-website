// import שירותים
import { selectFromTabletype, addAttendance, removeAttendance } from '../utilities/dbservice.js';
import { getCurrentUser, formatTime, showSpinner, hideSpinner } from '../utilities/auth.js';

// משתנים גלובליים
let currentWeekStart = getStartOfWeek(new Date());
let currentSession = null;
const { id: currentClientId } = await getCurrentUser();

// בעת טעינת הדף
document.addEventListener("DOMContentLoaded", () => {
    loadSchedule();
    updateWeekDates(currentWeekStart);

    document.querySelector('.close-btn').addEventListener('click', closeModal);
    document.getElementById('lessonModal').addEventListener('click', (event) => {
        if (event.target.id === 'lessonModal') closeModal();
    });

    document.getElementById('prevWeek').addEventListener('click', () => changeWeek(-7));
    document.getElementById('nextWeek').addEventListener('click', () => changeWeek(7));
});

function changeWeek(offset) {
    currentWeekStart.setDate(currentWeekStart.getDate() + offset);
    loadSchedule();
    updateWeekDates(currentWeekStart);
}

async function loadSchedule() {
    showSpinner();
    try {
        const user = await getCurrentUser();
        const weekDates = getDatesForWeek(currentWeekStart);
        document.getElementById('weekRange').textContent = 'טוען...';
        document.getElementById('scheduleGrid').innerHTML = '<div class="col-span-7 text-center text-gray-400">טוען שיעורים...</div>';

        const [allSessions, mySessionIds, programsMap, branchesMap, instructorsMap] = await Promise.all([
            loadSessionsInRange(weekDates[0], weekDates[6]),
            loadMySessionIds(user.id),
            loadProgramsMap(),
            loadCodeDescriptions('branch'),
            loadInstructors()
        ]);

        document.getElementById('weekRange').textContent = formatWeekRange(weekDates);
        await renderSchedule(allSessions, mySessionIds, weekDates, programsMap, branchesMap, instructorsMap);
    } finally {
        hideSpinner();
    }
}

async function loadSessionsInRange(startDate, endDate) {
    const { data } = await selectFromTabletype('program_sessions', {
        gte: ['date', startDate.toISOString().slice(0, 10)],
        lte: ['date', endDate.toISOString().slice(0, 10)]
    });
    return data || [];
}

async function loadMySessionIds(userId) {
    const { data } = await selectFromTabletype('session_attendance', {
        eq: ['customer_id', userId]
    });
    return data ? data.map(cs => cs.session_id) : [];
}

async function loadProgramsMap() {
    const { data } = await selectFromTabletype('programs', {});
    return Object.fromEntries((data || []).map(p => [p.id, p]));
}

async function loadCodeDescriptions(type) {
    const { data } = await selectFromTabletype('codetables', {
        eq: ['name', type]
    });
    return Object.fromEntries((data || []).map(row => [row.code, row.descriptionCode]));
}

async function loadInstructors() {
    const { data } = await selectFromTabletype('instructors', {});
    return Object.fromEntries((data || []).map(row => [row.id, `${row.firstName}`]));
}

function getDateOnly(date) {
    return new Date(date).toISOString().slice(0, 10);
}

async function renderSchedule(sessions, mySessionIds, weekDates, programsMap, branchesMap, instructorsMap) {
    const grid = document.getElementById('scheduleGrid');
    grid.innerHTML = '';

    for (let i = 0; i < 7; i++) {
        const daySessions = sessions.filter(s => s.date === getDateOnly(weekDates[i]));
        const col = document.createElement('div');
        col.className = 'space-y-3';

        if (daySessions.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'text-center text-gray-400';
            empty.textContent = 'אין שיעורים';
            col.appendChild(empty);
        }

        for (const session of daySessions) {
            const program = programsMap[session.program_id];
            if (!program) continue;

            const name = program.name;
            const branch = branchesMap[program.branch_code] || 'סניף לא ידוע';
            const instructor = instructorsMap[program.instructor_code] || '---';
            const isAssigned = mySessionIds.includes(session.id);

            const box = document.createElement('div');
            box.classList.add('p-3', 'rounded', 'shadow', 'transition', 'cursor-pointer', 'relative');
            box.classList.add(isAssigned ? 'session-assigned' : 'bg-pink-50');

            if (isAssigned) {
                const tag = document.createElement('div');
                tag.textContent = 'את משובצת כאן';
                tag.className = 'absolute -top-2 -left-2 text-green-600 border border-green-400 bg-white rounded px-2 py-0.5 shadow-sm z-10';
                tag.style.fontSize = '10px';
                tag.style.fontWeight = '700';
                box.appendChild(tag);
            }

            box.innerHTML += `
                <p class="font-bold text-pink-700 text-lg">${name}</p>
                <p class="text-sm text-gray-600 mt-1">${formatTime(session.time)} | ${branch}</p>
                <p class="text-sm text-gray-500">${instructor}</p>
            `;

            box.onclick = () => openModal(name, session.time, branch, instructor, session.date, isAssigned, session.id);
            col.appendChild(box);
        }

        grid.appendChild(col);
    }
}

function getStartOfWeek(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    return new Date(d.setDate(diff));
}

function getDatesForWeek(start) {
    return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        return d;
    });
}

function formatWeekRange(weekDates) {
    const options = { day: 'numeric', month: 'numeric' };
    return `${weekDates[0].toLocaleDateString('he-IL', options)} - ${weekDates[6].toLocaleDateString('he-IL', options)}`;
}

function updateWeekDates(startDate) {
    const dateSpans = document.querySelectorAll('#weekDays .date');
    const current = new Date(startDate);
    dateSpans.forEach(span => {
        span.textContent = `${current.getDate()}/${current.getMonth() + 1}`;
        current.setDate(current.getDate() + 1);
    });
}

function openModal(name, time, branch, instructor, date, isAssigned, session_id) {
    showSpinner();
    try {
        document.getElementById('modalTitle').textContent = name;
        document.getElementById('modalTime').textContent = `שעה: ${formatTime(time)}`;
        document.getElementById('modalBranch').textContent = `סניף: ${branch}`;
        document.getElementById('modalInstructor').textContent = `מדריכה: ${instructor}`;

        currentSession = { name, time, date, session_id };

        const now = new Date();
        const sessionDateTime = new Date(`${date}T${formatTime(time)}`);
        const isFuture = sessionDateTime > now;

        document.getElementById('cancelParticipationBtn').classList.toggle('hidden', !isAssigned || !isFuture);
        document.getElementById('registerCompletionBtn').classList.toggle('hidden', isAssigned || !isFuture);

        document.getElementById('lessonModal').classList.remove('hidden');
    } finally {
        hideSpinner();
    }
}

function closeModal() {
    document.getElementById('lessonModal').classList.add('hidden');
}

document.getElementById('cancelParticipationBtn').addEventListener('click', async () => {
    if (!currentSession) return;

    const confirmed = confirm(`האם את בטוחה שברצונך לבטל את ההרשמה לשיעור "${currentSession.name}" בתאריך ${currentSession.date} בשעה ${formatTime(currentSession.time)}?`);
    if (!confirmed) return;

    showSpinner();
    const { success } = await removeAttendance(currentSession.session_id, currentClientId);

    if (!success) {
        alert('שגיאה במחיקת ההרשמה.');
    } else {
        alert('ההרשמה בוטלה בהצלחה.');
        closeModal();
        loadSchedule();
    }
    hideSpinner();
});

document.getElementById('registerCompletionBtn').addEventListener('click', async () => {
    if (!currentSession) return;

    const confirmed = confirm(`האם את בטוחה שאת מעוניינת להשלים שיעור "${currentSession.name}" ביום ${currentSession.date} בשעה ${formatTime(currentSession.time)}?`);
    if (!confirmed) return;

    showSpinner();
    const { success } = await addAttendance(currentSession.session_id, currentClientId, 2);

    if (!success) {
        alert('שגיאה בהרשמה להשלמה.');
    } else {
        alert('נרשמת להשלמה בהצלחה.');
        closeModal();
        loadSchedule();
    }
    hideSpinner();
});
