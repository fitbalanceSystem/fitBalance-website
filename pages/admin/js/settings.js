const supabaseClient = window._sb;

async function populateTables() {
  const data = {};

  // טען את codeTables
  const { data: codeData, error: codeError } = await supabaseClient
    .from('codetables')
    .select('*');

  if (codeError) {
    console.error("שגיאה בטעינת codeTables", codeError);
    return;
  }

  // קיבוץ לפי name
  const grouped = {};
  codeData.forEach(row => {
    if (!grouped[row.name]) grouped[row.name] = [];
    grouped[row.name].push({
      code: row.code,
      descriptionCode: row.descriptionCode
    });
  });

  // הפוך את הקבוצות למערך בתוך codeTables
  data.codeTables = Object.entries(grouped).map(([name, items]) => ({ name, items }));

  // טען את users
  const { data: userData, error: userError } = await supabaseClient
    .from('users')
    .select('*');

  if (userError) {
    console.error("שגיאה בטעינת users", userError);
    return;
  }

  data.users = userData;

  // טען טבלאות לדף
  Object.entries(data).forEach(([category, records]) => {
    const tbody = document.getElementById(`${category}-body`);
    if (!tbody) return;

    tbody.innerHTML = ''; // איפוס

    records.forEach((row, index) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${row.name || row.email || row.id}</td>
        <td>
          <pre style="font-family: monospace; font-size: 12px; max-height: 120px; overflow:auto; direction: ltr; margin:0;">
${JSON.stringify(row.items || { ...row, name: undefined }, null, 2)}
          </pre>
        </td>
        <td>
          <button class="delete-btn" data-category="${category}" data-index="${index}">מחק</button>
        </td>
      `;
      tr.addEventListener("click", (e) => {
        // מונע פתיחת המודאל בלחיצה על כפתור המחיקה
        if (e.target.classList.contains('delete-btn')) return;
        openModal(category, index);
      });
      tbody.appendChild(tr);
    });

    // הוספת שורת כפתור +
    const tr = document.createElement('tr');
    const td = document.createElement("td");
    td.colSpan = 3;

    const addRowBtn = document.createElement("button");
    addRowBtn.textContent = "+ הוספת שורה";
    addRowBtn.classList.add("add-row-btn");
    addRowBtn.onclick = () => addRow(category);

    td.appendChild(addRowBtn);
    tr.appendChild(td);
    tbody.appendChild(tr);

  });

  setupDeleteButtons();
}

function setupDeleteButtons() {
  document.querySelectorAll(".delete-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const category = btn.dataset.category;
      const index = Number(btn.dataset.index);
      deleteRow(category, index);
      e.stopPropagation();
    });
  });
}

async function deleteRow(category, index) {
  // כאן אפשר גם לקרוא ל-Supabase למחיקת הרשומה מהDB אם רוצים
  // כרגע רק מעדכן את ה-UI

  const tbody = document.getElementById(`${category}-body`);
  if (!tbody) return;

  // מחיקת השורה מהטבלה
  const rows = Array.from(tbody.querySelectorAll("tr"));
  if (index >= 0 && index < rows.length) {
    tbody.removeChild(rows[index]);
  }

  // אחרי מחיקה אפשר לרענן או לעדכן את הנתונים לפי הצורך
  // לדוגמה אפשר לקרוא שוב ל-populateTables() או לעדכן מערך הנתונים מקומי

  // פה פשוט מפעיל שוב את הפונקציות ליצירת כפתורי מחיקה עדכניים
  setupDeleteButtons();
}

// function openModal(category, index) {
//   // כיוון שמופע הפונקציה השתנה (מקודם קיבלת את rowElement),
//   // צריך לטעון את הנתונים מחדש לפי category ו-index
//   // אפשר לשמור את הנתונים ב-globals או לטעון מחדש

//   // בשביל הפשטות - נטען מחדש מה-DOM:

//   const tbody = document.getElementById(`${category}-body`);
//   if (!tbody) return;

//   const rows = Array.from(tbody.querySelectorAll("tr"));
//   if (index >= rows.length) return;

//   const row = rows[index];

//   const name = row.cells[0].innerText; // העמודה הראשונה - שם
//   const jsonText = row.cells[1].innerText; // תוכן JSON

//   let data;
//   try {
//     data = JSON.parse(jsonText);
//   } catch (e) {
//     alert("פורמט JSON לא תקין");
//     return;
//   }

//   // עדכון כותרת
//   document.getElementById("modalTitle").innerText = name;

//   // בניית הטבלה
//   const headerRow = document.getElementById("editTableHeader");
//   const body = document.getElementById("editTableBody");

//   headerRow.innerHTML = "";
//   body.innerHTML = "";

//   // קביעת עמודות (אם זה מערך של אובייקטים)
//   if (Array.isArray(data) && data.length > 0 && typeof data[0] === "object") {
//     const keys = Object.keys(data[0]);
//     keys.forEach(key => {
//       const th = document.createElement("th");
//       th.textContent = key;
//       headerRow.appendChild(th);
//     });

//     // בניית שורות
//     data.forEach((item, rowIndex) => {
//       const tr = document.createElement("tr");
//       keys.forEach(key => {
//         const td = document.createElement("td");
//         td.contentEditable = true;
//         td.innerText = item[key];
//         tr.appendChild(td);
//       });
//       body.appendChild(tr);
//     });

//     // שמירה של השם של הרשומה שערכת
//     const modal = document.getElementById("editModal");
//     modal.dataset.recordName = name;
//     modal.dataset.category = category;
//     modal.dataset.index = index;

//     // פתיחת המודאל
//     modal.style.display = "block";
//   } else {
//     alert("ה-JSON חייב להיות מערך של אובייקטים");
//   }
// }

function closeModal() {
  document.getElementById("editModal").style.display = "none";
}

function saveChanges() {
  const body = document.getElementById("editTableBody");
  const headers = Array.from(document.querySelectorAll("#editTable thead th"));
  const rows = Array.from(body.querySelectorAll("tr"));

  const updatedData = rows.map(tr => {
    const tds = Array.from(tr.querySelectorAll("td"));
    const obj = {};
    headers.forEach((th, i) => {
      obj[th.textContent] = tds[i].innerText.trim();
    });
    return obj;
  });

  const updatedJSON = JSON.stringify(updatedData, null, 2);
  const modal = document.getElementById("editModal");
  const recordName = modal.dataset.recordName;
  const category = modal.dataset.category;
  const index = Number(modal.dataset.index);

  // עדכון הטבלה בדום
  const tbody = document.getElementById(`${category}-body`);
  if (!tbody) return;

  const rowsDom = Array.from(tbody.querySelectorAll("tr"));
  if (index < rowsDom.length) {
    rowsDom[index].cells[1].innerHTML = `<pre style="font-family: monospace; font-size: 12px; max-height: 120px; overflow:auto; direction: ltr; margin:0;">${updatedJSON}</pre>`;
  }

  closeModal();
}

// פונקציה להוספת שורה חדשה לטבלה הרלוונטית
function addRow(category) {
  const tbody = document.getElementById(`${category}-body`);
  if (!tbody) return;

  const tr = document.createElement("tr");

  tr.innerHTML = `
    <td><input type="text" placeholder="code" /></td>
    <td><input type="text" placeholder="descriptionCode" /></td>
    <td>
      <button class="delete-btn">מחק</button>
    </td>
  `;

  tbody.insertBefore(tr, tbody.lastElementChild);

  // להוסיף מאזין לכפתור מחיקה בשורה החדשה
  tr.querySelector(".delete-btn").addEventListener("click", (e) => {
    tbody.removeChild(tr);
    e.stopPropagation();
  });
}

// מאזינים לאירועים לאחר טעינת ה-DOM
document.addEventListener("DOMContentLoaded", () => {

  // מפעיל את פונקציית טעינת הנתונים
  populateTables();

  // מאזין לכפתור הוספת שורה עיקרי (אם קיים)
  const addRowBtn = document.getElementById("addRowBtn");
  if (addRowBtn) {
    addRowBtn.addEventListener("click", () => {
      // אם יש טבלה בעריכה, מוסיף שורה חדשה בה
      const tbody = document.getElementById("editTableBody");
      if (!tbody) return;

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td contenteditable="true"></td>
        <td contenteditable="true"></td>
      `;
      tbody.appendChild(tr);
    });
  }

  // מאזין לכפתורי אקורדיון (אם קיימים)
  document.querySelectorAll('.accordion-header').forEach(button => {
    button.addEventListener('click', () => {
      const body = button.nextElementSibling;
      body.style.display = body.style.display === 'block' ? 'none' : 'block';
    });
  });

});



// פונקציה לפתיחת המודאל והצגת הטבלה עם תיבות סימון
function openModal(rowElement) {
  const name = rowElement.cells[0].innerText; // שם מהרשימה
  const jsonText = rowElement.cells[1].innerText; // JSON מהתא

  let data;
  try {
    data = JSON.parse(jsonText);
  } catch (e) {
    alert("פורמט JSON לא תקין");
    return;
  }

  // עדכון כותרת המודאל
  document.getElementById("modalTitle").innerText = name;

  const headerRow = document.getElementById("editTableHeader");
  const body = document.getElementById("editTableBody");

  headerRow.innerHTML = "";
  body.innerHTML = "";

  // הוספת טור לכותרת עבור תיבות סימון
  const thCheckbox = document.createElement("th");
  thCheckbox.textContent = ""; // אפשר לכתוב "בחר" אם רוצים
  headerRow.appendChild(thCheckbox);

  // בדיקה שהנתונים הם מערך של אובייקטים
  if (Array.isArray(data) && data.length > 0 && typeof data[0] === "object") {
    const keys = Object.keys(data[0]);
    // יצירת כותרות לעמודות לפי המפתחות ב-JSON
    keys.forEach(key => {
      const th = document.createElement("th");
      th.textContent = key;
      headerRow.appendChild(th);
    });

    // יצירת שורות הטבלה עם תיבות סימון
    data.forEach(item => {
      const tr = document.createElement("tr");

      // תא תיבת סימון
      const tdCheckbox = document.createElement("td");
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.classList.add("modal-row-checkbox");
      tdCheckbox.appendChild(checkbox);
      tr.appendChild(tdCheckbox);

      // תאי נתונים אחרים
      keys.forEach(key => {
        const td = document.createElement("td");
        td.contentEditable = true; // ניתן לערוך את הנתונים בטבלה
        td.innerText = item[key];
        tr.appendChild(td);
      });

      body.appendChild(tr);
    });

    // שמירת שם הרשומה במודאל
    document.getElementById("editModal").dataset.recordName = name;

    // הוספת כפתור מחיקת מסומנים אם לא קיים
    if (!document.getElementById("deleteSelectedModalBtn")) {
      const modalFooter = document.getElementById("modalFooter");
      const deleteSelectedBtn = document.createElement("button");
      deleteSelectedBtn.id = "deleteSelectedModalBtn";
      deleteSelectedBtn.textContent = "מחק מסומנים";
      deleteSelectedBtn.style.marginRight = "10px";
      deleteSelectedBtn.onclick = deleteSelectedModalRows;
      modalFooter.appendChild(deleteSelectedBtn);
    }

    // הצגת המודאל
    document.getElementById("editModal").style.display = "block";
  } else {
    alert("ה-JSON חייב להיות מערך של אובייקטים");
  }
}

// פונקציה למחיקת השורות המסומנות במודאל
function deleteSelectedModalRows() {
  const body = document.getElementById("editTableBody");
  const checkboxes = body.querySelectorAll(".modal-row-checkbox");
  let anySelected = false;

  checkboxes.forEach(checkbox => {
    if (checkbox.checked) {
      anySelected = true;
      checkbox.closest("tr").remove();
    }
  });

  if (!anySelected) alert("לא סומנו שורות למחיקה");
}

// פונקציה לסגירת המודאל (ניתן להוסיף לפי הצורך)
function closeModal() {
  document.getElementById("editModal").style.display = "none";
}
