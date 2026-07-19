const db = window._sb;

const JOBS_CONFIG = [
  { name: 'daily-attendance',  description: 'חישוב נוכחות יומי לכל המפגשים',          type: 'auto',   schedule: '0 23 * * *',  enabled: true },
  { name: 'monthly-salary',    description: 'חישוב שכר חודשי ושליחת מייל למדריכות',   type: 'manual', schedule: null,           enabled: true },
  { name: 'monthly-reports',   description: 'יצירת דוחות חודשיים אוטומטיים',          type: 'auto',   schedule: '0 6 1 * *',   enabled: true },
  { name: 'birthday-greeting', description: 'שליחת מייל מזל טוב ללקוחות יום הולדת 🎂',  type: 'auto',   schedule: '0 7 * * *',   enabled: true },
];

// חישוב ריצה הבאה מ-cron expression (פשוט)
function nextRunFromCron(cron) {
  if (!cron) return '—';
  const parts = cron.split(' ');
  const [min, hour, dom, month, dow] = parts;
  const now = new Date();
  const next = new Date(now);

  if (dom === '*' && dow === '*') {
    // כל יום בשעה קבועה
    next.setHours(parseInt(hour), parseInt(min), 0, 0);
    if (next <= now) next.setDate(next.getDate() + 1);
  } else if (dom !== '*') {
    // כל חודש ביום קבוע
    next.setDate(parseInt(dom));
    next.setHours(parseInt(hour), parseInt(min), 0, 0);
    if (next <= now) {
      next.setMonth(next.getMonth() + 1);
      next.setDate(parseInt(dom));
    }
  }
  return next.toLocaleString('he-IL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function statusBadge(status) {
  const map = {
    success: ['bg-green-100 text-green-800', '✓ הצליח'],
    running: ['bg-blue-100 text-blue-800 animate-pulse', '⟳ רץ כעת'],
    failed:  ['bg-red-100 text-red-800',   '✗ נכשל'],
    null:    ['bg-gray-100 text-gray-500',  '— לא רץ'],
  };
  const [cls, label] = map[status] ?? map[null];
  return `<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${cls}">${label}</span>`;
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('he-IL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

async function loadJobsData() {
  const { data: runs } = await db
    .from('job_runs')
    .select('job_name, status, started_at, finished_at')
    .order('started_at', { ascending: false });

  // מיפוי: job_name → הריצה האחרונה
  const lastRun = {};
  (runs || []).forEach(r => {
    if (!lastRun[r.job_name]) lastRun[r.job_name] = r;
  });

  return lastRun;
}

function renderTable(lastRun) {
  const tbody = document.getElementById('jobsBody');
  tbody.innerHTML = JOBS_CONFIG.map(job => {
    const run = lastRun[job.name];
    const isRunning = run?.status === 'running';
    return `
    <tr class="hover:bg-gray-50 transition" id="row-${job.name}">
      <td class="px-4 py-3 font-medium text-gray-800">${job.description}</td>
      <td class="px-4 py-3 text-center">
        <span class="text-xs px-2 py-1 rounded-full ${job.type === 'auto' ? 'bg-purple-100 text-purple-700' : 'bg-orange-100 text-orange-700'}">
          ${job.type === 'auto' ? 'אוטומטי' : 'ידני'}
        </span>
      </td>
      <td class="px-4 py-3 text-center">${statusBadge(run?.status ?? null)}</td>
      <td class="px-4 py-3 text-center text-sm text-gray-600">${formatDate(run?.started_at)}</td>
      <td class="px-4 py-3 text-center text-sm text-gray-600">${nextRunFromCron(job.schedule)}</td>
      <td class="px-4 py-3 text-center space-x-2 space-x-reverse">
        ${isRunning
          ? `<button onclick="stopJob('${job.name}')" class="bg-red-500 hover:bg-red-600 text-white text-xs px-3 py-1.5 rounded transition">⏹ עצור</button>`
          : `<button onclick="runJob('${job.name}')" class="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 rounded transition">▶ הרץ</button>`
        }
      </td>
    </tr>`;
  }).join('');
}

async function init() {
  document.getElementById('jobsBody').innerHTML =
    `<tr><td colspan="6" class="text-center p-6 text-gray-400">טוען...</td></tr>`;
  const lastRun = await loadJobsData();
  renderTable(lastRun);
}

// הרצה — מפעיל GitHub Actions workflow_dispatch
window.runJob = async function(jobName) {
  const job = JOBS_CONFIG.find(j => j.name === jobName);
  if (!job) return;

  const confirmed = confirm(`להריץ את "${job.description}" עכשיו?`);
  if (!confirmed) return;

  const GITHUB_OWNER = 'fitbalanceSystem';
  const GITHUB_REPO  = 'fitBalance-website';
  const GITHUB_TOKEN = '';

  const res = await fetch(
    `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/actions/workflows/batch-jobs.yml/dispatches`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ref: 'main',
        inputs: { job_name: jobName },
      }),
    }
  );

  if (res.status === 204) {
    showToast(`✓ התהליך "${job.description}" הופעל ב-GitHub Actions`, '#16a34a');
    setTimeout(init, 4000); // רענון אחרי 4 שניות
  } else {
    const err = await res.text();
    showToast('שגיאה בהפעלה: ' + err, '#dc2626');
  }
};

// עצירה — מעדכן סטטוס ל-failed (ביטול ידני)
window.stopJob = async function(jobName) {
  const job = JOBS_CONFIG.find(j => j.name === jobName);
  const confirmed = confirm(`לעצור את "${job?.description}"?`);
  if (!confirmed) return;

  const { data: runs } = await db
    .from('job_runs')
    .select('id')
    .eq('job_name', jobName)
    .eq('status', 'running')
    .order('started_at', { ascending: false })
    .limit(1);

  if (runs?.length) {
    await db.from('job_runs').update({
      status: 'failed',
      finished_at: new Date().toISOString(),
      error_message: 'הופסק ידנית',
    }).eq('id', runs[0].id);
  }

  showToast(`התהליך "${job?.description}" נעצר`, '#dc2626');
  await init();
};

function showToast(msg, color = '#1f2937') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.style.background = color;
  t.classList.remove('hidden');
  setTimeout(() => t.classList.add('hidden'), 3500);
}

document.addEventListener('DOMContentLoaded', () => {
  init();
  // רענון אוטומטי כל 30 שניות
  setInterval(init, 30000);
});
