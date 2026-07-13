import { supabase, fetchItems, updateItem, upsert } from '../utilities/db.js';
import * as methods from '../utilities/methods.js';
import '../utilities/main.js';
import { populateSelectFromCodeTable, loadAllCodeTables, getNameFromCodeTable, getNameInstructor } from '../utilities/code-tables.js';

document.addEventListener('DOMContentLoaded', async () => {


  await loadAllCodeTables();

  // טעינת קומבו בוקסים
  populateSelectFromCodeTable(document.querySelector('select[name="type_code"]'), 'programType');
  populateSelectFromCodeTable(document.querySelector('select[name="branch_code"]'), 'branch');
  populateSelectFromCodeTable(document.querySelector('select[name="status_code"]'), 'programsStatus');
  populateSelectFromCodeTable(document.querySelector('select[name="day"]'), 'days');
  populateSelectFromCodeTable(document.querySelector('select[name="instructor_code"]'), 'instructors');
  methods.populateMinutes(document.querySelector('select[name="duration"]'));

  const table = 'programs';
  const tbody = document.querySelector('#programsTable tbody');
  const modal = document.getElementById('lessonModal');
  const openModalBtn = document.getElementById('newProgramBtn');
  const closeModalBtn = document.getElementById('closeModal');
  const saveBtn = document.getElementById('save-program-btn');
  const form = document.getElementById('lessonForm');

  let programId = null;
  let currentLessonMode = null;
  let currentLessonId = null;
  let allPrograms = [];

  // סינון ועיבוד הטבלה
  function renderPrograms(programs) {
    tbody.innerHTML = '';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const showActive = document.getElementById('showActiveOnly').checked;

    let filtered = programs.filter(p => {
      if (!showActive) return true;
      const start = p.start_date ? new Date(p.start_date) : null;
      const end = p.end_date ? new Date(p.end_date) : null;
      return start && end && start <= today && end >= today;
    });

    filtered.sort((a, b) => {
      const startDiff = new Date(a.start_date) - new Date(b.start_date);
      if (startDiff !== 0) return startDiff;
      return new Date(a.end_date) - new Date(b.end_date);
    });

    filtered.forEach(program => {
      const row = document.createElement('tr');
      if (program.status_code === 1) row.style.backgroundColor = '#e0f7ff';

      row.innerHTML = `
        <td>${program.name}</td>
        <td>${getNameFromCodeTable('days', program.day)}</td>
        <td>${methods.formatTime(program.time)}</td>
        <td>${getNameFromCodeTable('branch', program.branch_code)}</td>
        <td>${program.start_date}</td>
        <td>${program.end_date}</td>
        <td class="action-icons">
          <button class="action-btn edit" title="עריכה"><i class="fas fa-edit"></i></button>
          <button class="action-btn delete" title="מחיקה"><i class="fas fa-trash-alt"></i></button>
        </td>
      `;

      row.addEventListener('click', async () => {
        const { data, error } = await supabase.from(table).select('*').eq('id', program.id).single();
        if (error) return alert('שגיאה בטעינת פרטי התוכנית');
        openProgramViewModal(data);
      });

      row.querySelector('.action-btn.edit').addEventListener('click', (e) => {
        e.stopPropagation();
        openLessonModal('edit', program);
      });

      row.querySelector('.action-btn.delete').addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm(`האם למחוק את התוכנית "${program.name}"?`)) {
          supabase.from(table).delete().eq('id', program.id).then(({ error }) => {
            if (error) alert('אירעה שגיאה במחיקה');
            else loadPrograms();
          });
        }
      });

      tbody.appendChild(row);
    });
  }

  document.getElementById('showActiveOnly').addEventListener('change', () => renderPrograms(allPrograms));

  // טען טבלת תוכניות
  async function loadPrograms() {
    try {
      document.getElementById('table-loader').style.display = 'flex';
      allPrograms = await fetchItems(table);
      renderPrograms(allPrograms);
    } catch (err) {
      console.error("שגיאה בטעינת תוכניות:", err);
      alert("אירעה שגיאה בעת טעינת התוכניות.");
    } finally {
      document.getElementById('table-loader').style.display = 'none';
    }
  }

  // פתיחת מודאל במצב עריכה / חדש
  async function openLessonModal(mode, rowData = null) {
    currentLessonMode = mode;
    currentLessonId = rowData ? rowData.id : null;
    const modalTitle = document.getElementById('modalTitle');
    const lessonName = document.getElementById('lessonName');
    const lessonDay = document.getElementById('lessonDay');
    const lessonTime = document.getElementById('lessonTime');
    const lessonStartDate = document.getElementById('lessonStartDate');
    const lessonEndDate = document.getElementById('lessonEndDate');
    const lessonType = document.getElementById('lessonType');
    const lessonDuration = document.getElementById('lessonDuration');
    const lessonBranch = document.getElementById('lessonBranch');
    const lessonInstructor = document.getElementById('lessonInstructor');
    const lessonStatus = document.getElementById('lessonStatus');

    if (mode === 'edit' && rowData) {
      programId = rowData.id || null;
      modalTitle.textContent = 'עריכת שיעור';
      lessonName.value = rowData.name || '';
      lessonDay.value = rowData.day || '';
      lessonTime.value = rowData.time || '';
      lessonStartDate.value = rowData.start_date || '';
      lessonEndDate.value = rowData.end_date || '';
      lessonType.value = rowData.type_code || '';
      lessonDuration.value = rowData.duration || '';
      lessonBranch.value = rowData.branch_code || '';
      lessonInstructor.value = rowData.instructor_code || '';
      lessonStatus.value = rowData.status_code || '';
      document.getElementById('lessonPrice').value = rowData.price ?? '';
    } else {
      modalTitle.textContent = 'שיעור חדש';
      form.reset();
      lessonDuration.value = '45';
    }

    modal.style.display = 'flex';
  }

  function closeModal() {
    modal.style.display = "none";
    form.reset();
    currentLessonId = null;
    currentLessonMode = null;
  }
  // אירועים
  openModalBtn.addEventListener('click', () => openLessonModal('new'));
  closeModalBtn.addEventListener('click', closeModal);

  document.getElementById('exportProgramsBtn')?.addEventListener('click', () => {
    const headers = ['שם','יום','שעה','ת.התחלה','ת.סיום'];
    const rows = allPrograms.map(p => [p.name,p.day,p.time,p.start_date,p.end_date].map(v => `"${v||''}"`).join(','));
    const csv = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([csv],{type:'text/csv'})), download: 'תוכניות.csv' });
    a.click();
  });

  // טעינה ראשונית של טבלת תוכניות
  await loadPrograms();

  console.log("טעינה הסתיימה");


  if (saveBtn) {
    saveBtn.addEventListener("click", async () => {
      try {
        // שליפת כל שדות הטופס
        const formData = {
          name: document.getElementById('lessonName').value.trim(),
          day: document.getElementById('lessonDay').value,
          time: document.getElementById('lessonTime').value,
          branch_code: document.getElementById('lessonBranch').value,
          start_date: document.getElementById('lessonStartDate').value,
          end_date: document.getElementById('lessonEndDate').value,
          type_code: document.getElementById('lessonType').value,
          duration: document.getElementById('lessonDuration').value,
          instructor_code: document.getElementById('lessonInstructor').value,
          status_code: document.getElementById('lessonStatus').value,
          price: parseFloat(document.getElementById('lessonPrice').value) || null
        };

        // מצבים: 'new' או 'edit'
        const mode = currentLessonMode;

        // אם זה מצב עריכה יש לשלב את המזהה לשם upsert
        if (mode === 'edit') {
          formData.id = programId; // מוסיפים את המזהה כדי ש-upsert תדע לעדכן ולא להוסיף חדשה
        }

        // מבצעים upsert (עדכון או הוספה) בבת אחת
        const result = await upsert('programs', formData);

        if (result && !result.error) {
          console.log(mode === 'edit' ? "העדכון בוצע בהצלחה!" : "ההוספה בוצעה בהצלחה!", result.data);


          // מזהה התוכנית החדש (או הקיים אם עדכון)
          const programId = result.data[0].id;

          // מחיקה קודמת של כל המפגשים אם במצב עריכה (כדי שלא יצטברו כפולים)
          if (mode === 'edit') {
            await methods.deleteByFilter('program_sessions', { program_id: programId });
          }

          // יצירת מפגשים לפי טווח תאריכים ויום בשבוע
          const sessionDates = getMatchingDates(
            formData.start_date,
            formData.end_date,
            parseInt(formData.day) -1
          );

          const sessions = sessionDates.map(date => ({
            program_id: programId,
            date: date,
            time: formData.time,

            status: formData.status_code,
            day: formData.day,
            branch_code: formData.branch_code,
            instructor_code: formData.instructor_code
          }));

          if (sessions.length) {
            await upsert('program_sessions', sessions);
          }


          closeModal();
          await loadPrograms();
        } else {
          console.error("אירעה שגיאה בשמירה:", result.error);
          alert("אירעה שגיאה בשמירת התוכנית. אנא נסה שוב.");
        }

      } catch (err) {
        console.error(err.stack);
      }
    });
  }



});

async function checkIfProgramExists({ name, day, time, branch_code, start_date, end_date }) {
  const { data: programs, error } = await supabase
    .from('programs')
    .select('*')
    .eq('name', name)
    .eq('day', day)
    .eq('time', time)
    .eq('branch_code', branch_code);

  if (error) {
    console.error('שגיאה בבדיקת תוכניות:', error);
    return null;
  }

  const newStart = new Date(start_date);
  const newEnd = new Date(end_date);

  return programs.find(p => {
    const existingStart = new Date(p.start_date);
    const existingEnd = new Date(p.end_date);
    return newStart <= existingEnd && newEnd >= existingStart;
  }) || null;
}

// צפייה בפרטי תוכנית
export function openProgramViewModal(program) {
  const modal = document.getElementById('program-view-modal');
  const detailsDiv = document.getElementById('program-details');
  const loader = document.getElementById('program-view-loader');

  openModal('program-view-modal');
  loader.style.display = 'flex';
  detailsDiv.style.display = 'none';


  setTimeout(() => {
    detailsDiv.innerHTML = `
      <p><strong>שם:</strong> ${program.name}</p>
      <p><strong>סוג:</strong> ${getNameFromCodeTable('programType', program.type_code)}</p>
      <p><strong>יום:</strong> ${getNameFromCodeTable('days', program.day)}</p>
      <p><strong>שעה:</strong> ${methods.formatTime(program.time)}</p>
      <p><strong>משך שיעור:</strong> ${program.duration}</p>
      <p><strong>סניף:</strong> ${getNameFromCodeTable('branch', program.branch_code)}</p>
      <p><strong>מדריכה:</strong> ${getNameInstructor(program.instructor_code)}</p>
      <p><strong>תאריך התחלה:</strong> ${program.start_date || '-'}</p>
      <p><strong>תאריך סיום:</strong> ${program.end_date || '-'}</p>
      <p><strong>סטטוס:</strong> ${getNameFromCodeTable('programsStatus', program.status_code)}</p>
    `;
    loader.style.display = 'none';
    detailsDiv.style.display = 'block';
  }, 500);
}

// פונקציות עזר לפתיחת/סגירת מודאל
function openModal(id) {
  document.getElementById(id).classList.add('open');
}
function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}
window.closeModal = closeModal;



function getMatchingDates(startDateStr, endDateStr, dayOfWeek) {
  const dates = [];
  const startDate = new Date(startDateStr);
  const endDate = new Date(endDateStr);
  
  let current = new Date(startDate);
  while (current <= endDate) {
    if (current.getDay() === dayOfWeek) {
      dates.push(current.toISOString().split('T')[0]); // בפורמט YYYY-MM-DD
    }
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

