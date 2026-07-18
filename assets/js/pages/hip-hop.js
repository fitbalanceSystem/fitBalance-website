// hip-hop.js – דף נחיתה חוגי היפ הופ

const sb = window._sb;

// ---- מעקב מקור הגעה ----
const SOURCE = new URLSearchParams(window.location.search).get('source') || 'direct';

if (!sessionStorage.getItem('visit_source')) {
  sessionStorage.setItem('visit_source', SOURCE);
  sb.from('landing_visits').insert({ source: SOURCE, page: 'hip-hop', visited_at: new Date().toISOString() })
    .then(({ error }) => { if (error) console.warn('visit log:', error.message); });
}

const DAYS_HE = { 1: 'ראשון', 2: 'שני', 3: 'שלישי', 4: 'רביעי', 5: 'חמישי', 6: 'שישי', 7: 'שבת' };

// ---- שליפת נתונים ----

async function loadHipHopGroups() {
  const today = new Date().toISOString().split('T')[0];

  // שלב 1: מצא את ה-type_code של היפ הופ מטבלת codetables
  const { data: codeRows, error: codeErr } = await sb
    .from('codetables')
    .select('code')
    .eq('name', 'programType')
    .ilike('descriptionCode', '%היפ הופ%');

  if (codeErr || !codeRows?.length) {
    console.warn('לא נמצא type_code להיפ הופ', codeErr);
    return [];
  }

  const hipHopCodes = codeRows.map(r => r.code);

  // שלב 2: מצא סטטוסים שמאפשרים הרשמה
  const { data: statusRows } = await sb
    .from('codetables')
    .select('code')
    .eq('name', 'programsStatus')
    .or('descriptionCode.ilike.%פתוח%,descriptionCode.ilike.%הרשמה%,descriptionCode.ilike.%חדש%,descriptionCode.ilike.%פעיל%');

  const openStatusCodes = statusRows?.map(r => r.code) ?? [];

  // שלב 3: שלוף תוכניות היפ הופ פעילות/עתידיות
  let query = sb
    .from('programs')
    .select('id, name, day, time, start_date, end_date, status_code, type_code, target_audience, level, registration_open')
    .in('type_code', hipHopCodes)
    .or(`end_date.gte.${today},end_date.is.null`);

  const { data: programs, error: progErr } = await query;
  if (progErr) { console.error(progErr); return []; }

  // שלב 4: סינון – לא להציג קבוצות שהסתיימו
  return programs.filter(p => {
    // אם יש שדה registration_open מפורש – כבד אותו
    if (p.registration_open === false) return false;
    // סטטוס חייב להיות ברשימת הפתוחים (אם יש רשימה)
    if (openStatusCodes.length && !openStatusCodes.includes(String(p.status_code))) return false;
    return true;
  });
}

// ---- בניית כרטיס ----

function buildCard(program) {
  const dayName = DAYS_HE[program.day] ?? `יום ${program.day}`;
  const timeStr = program.time ? program.time.slice(0, 5) : '';

  const { badgeClass, badgeText, cardBorder } = resolveStyle(program);

  const card = document.createElement('div');
  card.className = `card bg-white rounded-2xl p-6 shadow-md border-t-4 ${cardBorder} fade-in`;

  card.innerHTML = `
    <div class="flex justify-between items-start mb-3">
      <span class="text-xs font-bold text-white px-3 py-1 rounded-full ${badgeClass}">${badgeText}</span>
    </div>
    <h3 class="text-xl font-bold text-gray-800 mb-2">${program.name}</h3>
    ${program.target_audience ? `<p class="text-sm text-gray-500 mb-1"><i class="fas fa-users ml-1 text-pink-400"></i>${program.target_audience}</p>` : ''}
    <p class="text-sm text-gray-600 mb-1"><i class="fas fa-calendar-day ml-1 text-purple-400"></i>יום ${dayName}</p>
    ${timeStr ? `<p class="text-sm text-gray-600 mb-4"><i class="fas fa-clock ml-1 text-purple-400"></i>${timeStr}</p>` : ''}
    <button
      onclick="openRegistrationModal(${program.id}, '${escapeAttr(program.name)}')"
      class="w-full bg-pink-600 text-white py-2 rounded-full font-semibold hover:bg-pink-700 transition-all text-sm">
      להרשמה
    </button>
  `;

  return card;
}

function resolveStyle(program) {
  const name = (program.name || '').toLowerCase();
  const level = (program.level || '').toLowerCase();
  const isNew = name.includes('חדש') || name.includes('new');
  const isAdvanced = level === 'advanced' || name.includes('מתקדמ');

  if (isNew)      return { badgeClass: 'badge-new',      badgeText: '✨ קבוצה חדשה',       cardBorder: 'border-yellow-400' };
  if (isAdvanced) return { badgeClass: 'badge-advanced', badgeText: '🏆 קבוצת מתקדמים',    cardBorder: 'border-purple-500' };
  return           { badgeClass: 'badge-open',     badgeText: '✅ הרשמה פתוחה',      cardBorder: 'border-pink-500' };
}

function escapeAttr(str) {
  return (str || '').replace(/'/g, "\\'");
}

// ---- רינדור ----

async function render() {
  const loader = document.getElementById('groups-loader');
  const grid   = document.getElementById('groups-grid');
  const noGroups = document.getElementById('no-groups');

  try {
    const groups = await loadHipHopGroups();

    loader.classList.add('hidden');

    if (!groups.length) {
      noGroups.classList.remove('hidden');
      return;
    }

    grid.classList.remove('hidden');
    groups.forEach(g => {
      const card = buildCard(g);
      grid.appendChild(card);
      // הפעל fade-in
      requestAnimationFrame(() => requestAnimationFrame(() => card.classList.add('visible')));
    });

  } catch (err) {
    console.error('שגיאה בטעינת קבוצות:', err);
    loader.innerHTML = '<p class="text-red-500">אירעה שגיאה בטעינת הנתונים. נסי לרענן את הדף.</p>';
  }
}

// ---- מודאל הרשמה ----

window.openRegistrationModal = function(programId, programName) {
  document.getElementById('modal-program-id').value = programId ?? '';
  document.getElementById('modal-group-name').textContent = programName ? `קבוצה: ${programName}` : 'השאירי פרטים ונחזור אלייך';
  document.getElementById('reg-error').classList.add('hidden');
  document.getElementById('reg-success').classList.add('hidden');
  document.getElementById('registration-form').reset();
  document.getElementById('registration-modal').classList.add('open');
};

window.closeRegistrationModal = function() {
  document.getElementById('registration-modal').classList.remove('open');
};

// סגירה בלחיצה על הרקע
document.getElementById('registration-modal').addEventListener('click', function(e) {
  if (e.target === this) window.closeRegistrationModal();
});

document.getElementById('registration-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const btn = document.getElementById('reg-submit-btn');
  const errEl = document.getElementById('reg-error');
  const successEl = document.getElementById('reg-success');

  errEl.classList.add('hidden');
  successEl.classList.add('hidden');
  btn.disabled = true;
  btn.textContent = 'שולחת...';

  const programId = document.getElementById('modal-program-id').value || null;
  const name  = document.getElementById('reg-name').value.trim();
  const phone = document.getElementById('reg-phone').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const notes = document.getElementById('reg-notes').value.trim();

  const { error } = await sb.from('program_registrations').insert({
    program_id: programId ? parseInt(programId) : null,
    full_name: name,
    phone,
    email: email || null,
    notes: notes || null,
    source: sessionStorage.getItem('visit_source') || SOURCE,
    created_at: new Date().toISOString(),
  });

  btn.disabled = false;
  btn.textContent = 'שלחי הרשמה';

  if (error) {
    console.error(error);
    errEl.textContent = 'אירעה שגיאה בשליחה. נסי שוב או צרי קשר בטלפון.';
    errEl.classList.remove('hidden');
  } else {
    successEl.textContent = '✅ ההרשמה התקבלה! ניצור איתך קשר בקרוב.';
    successEl.classList.remove('hidden');
    document.getElementById('registration-form').reset();
    setTimeout(window.closeRegistrationModal, 2500);
  }
});

// ---- הפעלה ----
document.addEventListener('DOMContentLoaded', render);
