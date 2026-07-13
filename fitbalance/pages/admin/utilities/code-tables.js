// code-tables.js
import { fetchItems } from './db.js';

// משתנה אחיד לשמירת הטבלאות
export const codeTables = {};
export let instructors = {};

let loadPromise = null;

export async function loadCentralCodeTable(types) {
  const allCodes = await fetchItems('codetables');
  types.forEach(type => {
    codeTables[type] = {};
    allCodes
      .filter(row => row.name === type)
      .forEach(row => {
        codeTables[type][row.code] = row.descriptionCode;
      });
  });
}

export async function loadInstructorTable() {
  const all = await fetchItems('instructors');
  instructors = all;
  const active = all.filter(i => i.is_active !== false);
  codeTables['instructors'] = {};
  active.forEach(instr => {
    codeTables['instructors'][instr.id] = `${instr.firstName || ''} ${instr.lastName || ''}`.trim();
  });
}

export async function loadAllCodeTables() {
  if (!loadPromise) {
    loadPromise = Promise.all([
      loadCentralCodeTable(['programType', 'branch', 'programsStatus', 'days', 'attendanceStatus', 'sessionStatus']),
      loadInstructorTable()
    ]);
  }
  await loadPromise;
}

export function populateSelectFromCodeTable(selectEl, type) {
  const table = codeTables[type] || {};
  selectEl.innerHTML = `<option value="">בחר/י</option>`;
  for (const [code, name] of Object.entries(table)) {
    const option = document.createElement('option');
    option.value = code;
    option.textContent = name;
    selectEl.appendChild(option);
  }
}

export function getOptionsFromCodeTable(type) {
  const table = codeTables[type] || {};
  let options = `<option value="">בחר/י</option>`;
  for (const [code, name] of Object.entries(table)) {
    options += `<option value="${code}">${name}</option>`;
  }
  return options;
}

export function getNameFromCodeTable(type, code) {
  return codeTables[type]?.[code] || code;
}

export function getNameInstructor(code){
  return codeTables['instructors']?.[code] || code;
}


export function getinstructor(code) {
  const match = instructors.find(x => x.id == code);
  return match ? match.firstName : "";
}

export function getDescription(type, code) {
  return codeTables[type]?.[code] || "";
}