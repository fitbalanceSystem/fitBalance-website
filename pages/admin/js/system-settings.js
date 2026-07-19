const supabaseClient = window._sb;


let allSettings = [];

async function loadSettings() {
  const { data, error } = await supabaseClient.from('system_settings').select('*');
console.log("data: "+data);
  if (error) return alert('שגיאה בטעינה');

  allSettings = data;
}

// function renderSettings() {
//     const container = document.getElementById('settings-container');
//     container.innerHTML = '';
  
//     const categories = [...new Set(allSettings.map(s => s.category))];
  
//     categories.forEach(category => {
//       const categorySettings = allSettings.filter(s => s.category === category);
  
//       const wrapper = document.createElement('div');
  
//       const header = document.createElement('div');
//       header.className = 'category-header';
//       header.innerHTML = `
//         <span>${category}</span>
//         <span>${categorySettings[0]?.description || ''}</span>
//       `;
//       header.onclick = () => {
//         const table = wrapper.querySelector('table');
//         table.style.display = table.style.display === 'none' ? '' : 'none';
//       };
//       const table2 = document.createElement('table');
//       table2.className = 'settings-table';
  
//       table2.innerHTML = `
//         <thead>
//           <tr>
//             <th>✔</th>
//             <th>Key</th>
//             <th>Value</th>
//             <th>Type</th>
//             <th>Update Date</th>
//           </tr>
//         </thead>
//         <tbody>
//           ${categorySettings.map(row => `
//             <tr data-id="${row.id}">
//               <td><input type="checkbox" data-id="${row.id}" /></td>
//               <td>${row.key}</td>
//               <td>${JSON.stringify(row.value)}</td>
//               <td>${row.type}</td>
//               <td>${row.updated_at ? row.updated_at.split('T')[0] : ''}</td>
//             </tr>
//           `).join('')}
//         </tbody>
//       `;
//   console.log("table2: "+table2);
//       wrapper.appendChild(header);
//       wrapper.appendChild(table2);
//       container.appendChild(wrapper);
  
//       // הוספת eventListener לכל שורה להצגת מודאל JSON
//       const rows = table2.querySelectorAll('tbody tr');
//       rows.forEach(row => {
//         row.addEventListener('click', () => {
//           const id = row.getAttribute('data-id');
//           const setting = allSettings.find(s => s.id === id);
//           if (setting) {
//             openModal(setting);
//           }
//         });
//       });
//     });
//   }
  
  // פונקציית יצירת המודאל
//   function openJsonModal(setting) {
//     // יצירת overlay שמכסה את כל המסך
//     const overlay = document.createElement('div');
//     overlay.style.position = 'fixed';
//     overlay.style.top = 0;
//     overlay.style.left = 0;
//     overlay.style.width = '100vw';
//     overlay.style.height = '100vh';
//     overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
//     overlay.style.display = 'flex';
//     overlay.style.justifyContent = 'center';
//     overlay.style.alignItems = 'center';
//     overlay.style.zIndex = 1000;
//     overlay.style.direction = 'rtl';  // מבנה RTL - משמאל לימין
  
//     // יצירת מודאל עם עיצוב בסיסי
//     const modal = document.createElement('div');
//     modal.style.backgroundColor = 'white';
//     modal.style.padding = '20px';
//     modal.style.borderRadius = '8px';
//     modal.style.maxWidth = '500px';
//     modal.style.maxHeight = '80vh';
//     modal.style.overflowY = 'auto';
//     modal.style.boxShadow = '0 2px 10px rgba(0,0,0,0.3)';
//     modal.style.textAlign = 'right'; // מיישר טקסט לימין במודאל
  
//     // הצגת JSON מפורמט יפה
//     const pre = document.createElement('pre');
//     pre.textContent = JSON.stringify(setting, null, 2);
//     pre.style.whiteSpace = 'pre-wrap'; // שורה ארוכה תתחלק
//     modal.appendChild(pre);
  
//     // כפתור סגירה
//     const closeBtn = document.createElement('button');
//     closeBtn.textContent = 'סגור';
//     closeBtn.style.marginTop = '10px';
//     closeBtn.style.cursor = 'pointer';
//     closeBtn.onclick = () => {
//       document.body.removeChild(overlay);
//     };
//     modal.appendChild(closeBtn);
  
//     overlay.appendChild(modal);
//     document.body.appendChild(overlay);
//   }
  
  

// function refreshCache() {
//   loadSettings();
// }

// function openAddModal() {
//   document.getElementById('modalTitle').innerText = 'הוספת הגדרה';
//   clearModalFields();
//   document.getElementById('settingModal').style.display = 'flex';
// }

// function openEditModal(id) {
//   const row = allSettings.find(x => x.id === id);
//   if (!row) return;

//   document.getElementById('modalTitle').innerText = 'עריכת הגדרה';
//   document.getElementById('modal-category').value = row.category;
//   document.getElementById('modal-key').value = row.key;
//   document.getElementById('modal-value').value = JSON.stringify(row.value, null, 2);
//   document.getElementById('modal-type').value = row.type;
//   document.getElementById('modal-description').value = row.description;
//   document.getElementById('settingModal').dataset.editId = id;
//   document.getElementById('settingModal').style.display = 'flex';
// }

// function clearModalFields() {
//   document.getElementById('modal-category').value = '';
//   document.getElementById('modal-key').value = '';
//   document.getElementById('modal-value').value = '';
//   document.getElementById('modal-type').value = '';
//   document.getElementById('modal-description').value = '';
//   delete document.getElementById('settingModal').dataset.editId;
// }

// async function saveModalSetting() {
//   const category = document.getElementById('modal-category').value;
//   const key = document.getElementById('modal-key').value;
//   const value = document.getElementById('modal-value').value;
//   const type = document.getElementById('modal-type').value;
//   const description = document.getElementById('modal-description').value;

//   let jsonValue;
//   try {
//     jsonValue = JSON.parse(value);
//   } catch {
//     return alert('ערך JSON לא תקין');
//   }

//   const id = document.getElementById('settingModal').dataset.editId;

//   const payload = { category, key, value: jsonValue, type, description };

//   let res;
//   if (id) {
//     res = await supabaseClient.from('system_settings').update(payload).eq('id', id);
//   } else {
//     res = await supabaseClient.from('system_settings').insert([payload]);
//   }

//   closeModal();
//   loadSettings();
// }

async function deleteSelected() {
  const checked = [...document.querySelectorAll('input[type=checkbox]:checked')]
    .map(cb => cb.dataset.id);
  if (checked.length === 0) return alert('לא נבחרו פריטים');

  if (!confirm('האם למחוק את ההגדרות המסומנות?')) return;

  await supabaseClient.from('system_settings').delete().in('id', checked);
  loadSettings();
}

let currentEditSettingId = null;

// function openJsonModal(setting) {
//   const modal = document.getElementById("jsonEditModal");
//   const editor = document.getElementById("json-editor");
//   editor.value = JSON.stringify(setting.value, null, 2);
//   editor.classList.remove("invalid");
//   document.getElementById("json-error").textContent = "";
//   currentEditSettingId = setting.id;
//   modal.style.display = "block";
// }

// function closeJsonModal() {
//   document.getElementById("jsonEditModal").style.display = "none";
//   currentEditSettingId = null;
// }

// function validateJsonEditor() {
//   const textarea = document.getElementById("json-editor");
//   const errorDiv = document.getElementById("json-error");
//   try {
//     JSON.parse(textarea.value);
//     textarea.classList.remove("invalid");
//     errorDiv.textContent = "";
//     return true;
//   } catch (e) {
//     textarea.classList.add("invalid");
//     errorDiv.textContent = "שגיאת JSON: " + e.message;
//     return false;
//   }
// }

// async function saveJsonValue() {
//   if (!validateJsonEditor()) {
//     alert("יש שגיאת JSON. תקני לפני השמירה.");
//     return;
//   }

//   const newValue = JSON.parse(document.getElementById("json-editor").value);
//   const { error } = await supabaseClient
//     .from('system_settings')
//     .update({ value: newValue })
//     .eq('id', currentEditSettingId);

//   if (error) {
//     alert("שגיאה בשמירה");
//     return;
//   }

//   closeJsonModal();
//   loadSettings();
// }

  
window.onload = async () => {
    await loadSettings();  // טוען את כל הנתונים ל-allSettings (או משתנה גלובלי אחר)
    renderSettings();      // מציג את הנתונים אחרי שהטענת הושלמה
  };


  function openModal(rowElement) {
    console.log("!!!");
    const name = rowElement.cells[0].innerText; // העמודה הראשונה - שם
    const jsonText = rowElement.cells[1].innerText; // תוכן JSON
    
    let data;
    try {
      data = JSON.parse(jsonText);
    } catch (e) {
      alert("פורמט JSON לא תקין");
      return;
    }
  
    // עדכון כותרת
    document.getElementById("modalTitle").innerText = name;
  
    // בניית הטבלה
    const headerRow = document.getElementById("editTableHeader");
    const body = document.getElementById("editTableBody");
  
    headerRow.innerHTML = "";
    body.innerHTML = "";
  
    // קביעת עמודות (אם זה מערך של אובייקטים)
    if (Array.isArray(data) && data.length > 0 && typeof data[0] === "object") {
      const keys = Object.keys(data[0]);
      keys.forEach(key => {
        const th = document.createElement("th");
        th.textContent = key;
        headerRow.appendChild(th);
      });
  
      // בניית שורות
      data.forEach((item, rowIndex) => {
        const tr = document.createElement("tr");
        keys.forEach(key => {
          const td = document.createElement("td");
          td.contentEditable = true;
          td.innerText = item[key];
          tr.appendChild(td);
        });
        body.appendChild(tr);
      });
  
      // שמירה של השם של הרשומה שערכת
      document.getElementById("editModal").dataset.recordName = name;
  
      // פתיחת המודאל
      document.getElementById("editModal").style.display = "block";
    } else {
      alert("ה-JSON חייב להיות מערך של אובייקטים");
    }
  }
  
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
        obj[th.textContent] = tds[i].innerText;
      });
      return obj;
    });
  
    const updatedJSON = JSON.stringify(updatedData, null, 2);
    const recordName = document.getElementById("editModal").dataset.recordName;
  
    // מציאת השורה המקורית בעמוד והחלפת JSON
    const allRows = document.querySelectorAll("tbody tr");
    allRows.forEach(row => {
      if (row.cells[0].innerText === recordName) {
        row.cells[1].innerText = updatedJSON;
      }
    });
  
    closeModal();
  }
  
