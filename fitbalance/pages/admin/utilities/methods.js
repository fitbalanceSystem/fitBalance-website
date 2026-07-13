// code-tables.js
import { fetchItems, supabase } from './db.js';

let allInstructors = [];
let allCodeTables = [];

export function setInstructors(data) {
  allInstructors = data;
}

export function setCodeTables(data) {
  allCodeTables = data;
}

export function getinstructor(code) {
  const match = allInstructors.find(x => x.id == code);
  return match ? match.firstName : "";
}

export function getDescription(type, code) {
  const match = allCodeTables.find(x => x.name === type && x.code == code);
  return match ? match.descriptionCode : "";
}


export function fillSelect(selectElement, items, valueField, textFieldOrFunc, defaultText, filterFunc) {
  selectElement.innerHTML = '';
  const defaultOption = document.createElement('option');
  defaultOption.value = '';
  defaultOption.textContent = defaultText;
  selectElement.appendChild(defaultOption);

  // אם קיבלנו פונקציית סינון, נשתמש בה
  const filteredItems = filterFunc ? items.filter(filterFunc) : items;

  filteredItems.forEach(item => {
    const option = document.createElement('option');
    option.value = item[valueField];

    if (typeof textFieldOrFunc === 'function') {
      option.textContent = textFieldOrFunc(item);
    } else {
      option.textContent = item[textFieldOrFunc];
    }

    selectElement.appendChild(option);
  });
}

export function formatTime(timeStr) {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':');
  return `${h.padStart(2, '0')}:${m.padStart(2, '0')}`;
}

export function populateMinutes(selectEl){
  selectEl.innerHTML = `<option value="">בחר/י דקה</option>`;
  for(let i=1; i<=60;i++){
    const option = document.createElement('option');
    option.value = i;
    option.textContent=i;
    selectEl.appendChild(option);
  }
}

// spinner.js
export function showSpinner(target = 'global') {
  const spinner = document.getElementById(`${target}-spinner`);
  if (spinner) spinner.classList.remove('hidden');
}

export function hideSpinner(target = 'global') {
  const spinner = document.getElementById(`${target}-spinner`);
  if (spinner) spinner.classList.add('hidden');
}


export async function deleteByFilter(table, filter) {
  const { data, error } = await supabase
    .from(table)
    .delete()
    .match(filter);
  if (error) {
    console.error('שגיאה במחיקה:', error);
  }
  return data;
}

export function getCurrentDateForDay(currentWeekStart, dayIndex) {
  const date = new Date(currentWeekStart);
  date.setDate(currentWeekStart.getDate() + dayIndex);
  return date;
}

export function formatDateToHebrew(dateStr) {
  const days = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
  const date = new Date(dateStr);
  if (isNaN(date)) return dateStr; // אם תאריך לא תקין, מחזיר את המקורי
  const dayName = days[date.getDay()];
  return `${dayName} ${dateStr}`;
}

export function showLoader() {
  document.getElementById("globalLoader").classList.remove("hidden");
}

export function hideLoader() {
  document.getElementById("globalLoader").classList.add("hidden");
}





