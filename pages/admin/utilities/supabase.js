const supabase = window._sb;

export async function loadDB(tableName) {
  const { data, error } = await supabase.from(tableName).select("*");
  if (error) {
    console.error(`שגיאה בטעינת טבלת ${tableName}:`, error.message);
    return [];
  }
  return data;
}


// הוספת רשומה חדשה
export async function insertToDB(tableName, newData) {
  const { data, error } = await supabase.from(tableName).insert([newData]).select();
  if (error) {
    console.error(`שגיאה בהכנסת נתון לטבלה ${tableName}:`, error.message);
    return null;
  }
  return data[0]; // מחזיר את הרשומה שנוספה
}

// עדכון רשומה לפי id
export async function updateDB(tableName, id, updatedData) {
  try {

    const { data, error } = await supabase
      .from(tableName)
      .update(updatedData)
      .eq('id', id)
      .select();


    if (error) {
      console.error(`שגיאה בעדכון רשומה בטבלה ${tableName}:`, error.message);
      return null;
    }

    return data[0];

  } catch (err) {
    console.error("שגיאה כללית:", err);
    console.error(err.stack);
    return null;
  }
}


// מחיקת רשומה לפי id
export async function deleteDB(tableName, id) {
  const { data, error } = await supabase
    .from(tableName)
    .delete()
    .eq('id', id)
    .select();

  if (error) {
    console.error(`שגיאה במחיקת רשומה מטבלה ${tableName}:`, error.message);
    return null;
  }
  return data[0];
}

export async function upsert(tableName,data) {
  try {
    // שימוש ב-upsert לשמירה מהירה (הוספה או עדכון)
    const { error } = await supabase
      .from(tableName)
      .upsert([data]);

    if (error) throw error;
    return true;

    saveStatus.textContent = '✅ נשמר בהצלחה';
    setTimeout(() => (saveStatus.style.display = 'none'), 2000);

  } catch (err) {
    console.error('שגיאה בשמירת נתונים:', err);
    return false;

    alert('אירעה שגיאה בשמירת הנתונים. נסה שנית.');
    saveStatus.style.display = 'none';
  }
}