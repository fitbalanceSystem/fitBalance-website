import { supabase } from '../utilities/db.js';
import '../utilities/main.js';

const TABLE = 'tasks';
const STATUSES = ['todo', 'in_progress', 'done'];

let allTasks = [];
let editingId = null;
let draggedId = null;

const modal = document.getElementById('taskModal');

// ─── תזכורות ───────────────────────────────────────────────
function getReminderMinutes() {
  return parseInt(localStorage.getItem('sys_tasks-reminder-minutes') ?? '30') || 30;
}

function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

function scheduleReminder(task) {
  if (!task.reminder || !task.due_date || !task.due_time) return;
  const [h, m] = task.due_time.split(':').map(Number);
  const dt = new Date(task.due_date);
  dt.setHours(h, m, 0, 0);
  const reminderMs = dt - Date.now() - (task.reminder_minutes ?? getReminderMinutes()) * 60000;
  if (reminderMs <= 0) return;
  setTimeout(() => {
    if (Notification.permission === 'granted') {
      new Notification('⏰ תזכורת משימה', { body: task.title, icon: '../../assets/icons/icon.png' });
    }
  }, reminderMs);
}

// ─── זמן ───────────────────────────────────────────────────
function getTaskDateTime(task) {
  if (!task.due_date) return null;
  const d = new Date(task.due_date);
  if (task.due_time) {
    const [h, m] = task.due_time.split(':').map(Number);
    d.setHours(h, m, 0, 0);
  } else {
    d.setHours(23, 59, 0, 0);
  }
  return d;
}

function isOverdue(task) {
  if (task.status === 'done') return false;
  const dt = getTaskDateTime(task);
  return dt && dt < new Date();
}

function isNear(task) {
  if (task.status === 'done') return false;
  const dt = getTaskDateTime(task);
  if (!dt) return false;
  const diffMin = (dt - Date.now()) / 60000;
  return diffMin >= 0 && diffMin <= getReminderMinutes();
}

// ─── טעינה ─────────────────────────────────────────────────
async function loadTasks() {
  document.getElementById('table-loader').style.display = 'flex';
  const { data, error } = await supabase.from(TABLE).select('*');
  document.getElementById('table-loader').style.display = 'none';
  if (error) return alert('שגיאה בטעינת משימות');
  allTasks = data;
  allTasks.forEach(scheduleReminder);
  renderBoard();
}

function sortTasks(tasks) {
  return [...tasks].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    const dtA = getTaskDateTime(a);
    const dtB = getTaskDateTime(b);
    if (!dtA && !dtB) return 0;
    if (!dtA) return 1;
    if (!dtB) return -1;
    return dtA - dtB;
  });
}

// ─── רינדור ────────────────────────────────────────────────
function renderBoard() {
  STATUSES.forEach(status => {
    const list  = document.getElementById(`list-${status}`);
    const tasks = sortTasks(allTasks.filter(t => t.status === status));
    document.getElementById(`count-${status}`).textContent = tasks.length;
    list.innerHTML = '';
    tasks.forEach(t => list.appendChild(createCard(t)));
  });
  setupDrop();
}

function createCard(task) {
  const card = document.createElement('div');
  card.className = 'task-card';
  card.draggable = true;
  card.dataset.id = task.id;

  const overdue = isOverdue(task);
  const near    = !overdue && isNear(task);
  if (overdue) card.classList.add('overdue');
  else if (near) card.classList.add('near');

  const timeStr = task.due_date
    ? `📅 ${task.due_date}${task.due_time ? ' ' + task.due_time.slice(0,5) : ''}`
    : '';

  const alertBadge = overdue
    ? `<span class="badge-alert">⚠️ באיחור</span>`
    : near
    ? `<span class="badge-near">⏰ בקרוב</span>`
    : '';

  const reminderBadge = task.reminder
    ? `<span style="font-size:11px;color:#8b5cf6;">🔔</span>`
    : '';

  const pinBtn = `<button class="pin-btn" title="${task.pinned ? 'בטל נעיצה' : 'נעץ'}" style="background:none;border:none;cursor:pointer;font-size:13px;padding:2px;color:${task.pinned ? '#f59e0b' : '#d1d5db'};"><i class="fas fa-thumbtack"></i></button>`;

  card.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">
      <div class="task-title">${task.pinned ? '📌 ' : ''}${task.title}</div>
      <div style="display:flex;gap:6px;flex-shrink:0;">
        ${pinBtn}
        <button class="edit-btn" title="עריכה" style="background:none;border:none;cursor:pointer;color:#8b5cf6;font-size:13px;padding:2px;"><i class="fas fa-edit"></i></button>
        <button class="delete-btn" title="מחיקה" style="background:none;border:none;cursor:pointer;color:#ef4444;font-size:13px;padding:2px;"><i class="fas fa-trash"></i></button>
      </div>
    </div>
    ${task.description ? `<div style="font-size:12px;color:#6b7280;margin-bottom:6px;">${task.description}</div>` : ''}
    <div class="task-meta">
      <span class="priority-badge priority-${task.priority}">${priorityLabel(task.priority)}</span>
      ${timeStr ? `<span>${timeStr}</span>` : ''}
      ${reminderBadge}
      ${alertBadge}
    </div>`;

  card.querySelector('.pin-btn').addEventListener('click', async e => {
    e.stopPropagation();
    const { error } = await supabase.from(TABLE).update({ pinned: !task.pinned }).eq('id', task.id);
    if (error) return alert('שגיאה');
    task.pinned = !task.pinned;
    renderBoard();
  });
  card.querySelector('.edit-btn').addEventListener('click',   e => { e.stopPropagation(); openModal(task); });
  card.querySelector('.delete-btn').addEventListener('click', e => { e.stopPropagation(); deleteTask(task.id); });

  // Drag
  card.addEventListener('dragstart', e => {
    draggedId = task.id;
    card.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
  });
  card.addEventListener('dragend', () => card.classList.remove('dragging'));

  return card;
}

function priorityLabel(p) {
  return { high: 'גבוהה', medium: 'בינונית', low: 'נמוכה' }[p] || p;
}

// ─── Drag & Drop ────────────────────────────────────────────
function setupDrop() {
  document.querySelectorAll('.kanban-col').forEach(col => {
    col.addEventListener('dragover', e => {
      e.preventDefault();
      col.classList.add('drag-over');
    });
    col.addEventListener('dragleave', () => col.classList.remove('drag-over'));
    col.addEventListener('drop', async e => {
      e.preventDefault();
      col.classList.remove('drag-over');
      const newStatus = col.dataset.status;
      if (!draggedId || !newStatus) return;
      const task = allTasks.find(t => t.id === draggedId);
      if (!task || task.status === newStatus) return;
      task.status = newStatus;
      renderBoard();
      await supabase.from(TABLE).update({ status: newStatus }).eq('id', draggedId);
      draggedId = null;
    });
  });
}

// ─── מודאל ─────────────────────────────────────────────────
function openModal(task = null, status = 'todo') {
  editingId = task?.id ?? null;
  document.getElementById('modalTitle').textContent    = task ? 'עריכת משימה' : 'משימה חדשה';
  document.getElementById('taskTitle').value           = task?.title            || '';
  document.getElementById('taskDesc').value            = task?.description      || '';
  document.getElementById('taskPriority').value        = task?.priority         || 'medium';
  document.getElementById('taskStatus').value          = task?.status           || status;
  document.getElementById('taskDueDate').value         = task?.due_date         || '';
  document.getElementById('taskDueTime').value         = task?.due_time         || '';
  document.getElementById('taskReminder').checked      = task?.reminder         ?? false;
  document.getElementById('taskReminderMin').value     = task?.reminder_minutes ?? getReminderMinutes();
  modal.classList.add('open');
}

function closeModal() {
  modal.classList.remove('open');
  document.getElementById('taskForm').reset();
  editingId = null;
}

async function deleteTask(id) {
  if (!confirm('למחוק את המשימה?')) return;
  const { error } = await supabase.from(TABLE).delete().eq('id', id);
  if (error) return alert('שגיאה במחיקה');
  allTasks = allTasks.filter(t => t.id !== id);
  renderBoard();
}

// ─── שמירה ─────────────────────────────────────────────────
document.getElementById('saveTaskBtn').addEventListener('click', async () => {
  const title = document.getElementById('taskTitle').value.trim();
  if (!title) return alert('יש להזין כותרת');

  const payload = {
    title,
    description:      document.getElementById('taskDesc').value.trim()    || null,
    priority:         document.getElementById('taskPriority').value,
    status:           document.getElementById('taskStatus').value,
    due_date:         document.getElementById('taskDueDate').value         || null,
    due_time:         document.getElementById('taskDueTime').value         || null,
    reminder:         document.getElementById('taskReminder').checked,
    reminder_minutes: parseInt(document.getElementById('taskReminderMin').value) || 30,
  };
  if (editingId) payload.id = editingId;

  let error;
  if (editingId) {
    const { error: e } = await supabase.from(TABLE).update(payload).eq('id', editingId);
    error = e;
  } else {
    const res = await supabase.from(TABLE).insert(payload);
    console.log('insert result:', JSON.stringify(res));
    error = res.error;
  }
  if (error) return alert('שגיאה: ' + JSON.stringify(error));
  closeModal();
  await loadTasks();
});

// ─── אירועים ───────────────────────────────────────────────
document.getElementById('newTaskBtn').addEventListener('click',   () => openModal());
document.getElementById('closeModalBtn').addEventListener('click', closeModal);
modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
document.querySelectorAll('.add-task-btn').forEach(btn =>
  btn.addEventListener('click', () => openModal(null, btn.dataset.status))
);

// ─── אתחול ─────────────────────────────────────────────────
requestNotificationPermission();
loadTasks();
setInterval(loadTasks, 60000);
