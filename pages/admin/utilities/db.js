// db.js
export const supabase = new Proxy({}, {
  get(_, prop) {
    return window._sb[prop].bind(window._sb);
  }
});

export async function fetchItems(table) {
  let allData = [];
  let from = 0;
  const pageSize = 1000;
  let batch = [];

  do {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .range(from, from + pageSize - 1);

    if (error) throw error;

    batch = data;
    allData = allData.concat(batch);
    from += pageSize;
  } while (batch.length === pageSize); // כל עוד קיבלנו "עמוד מלא" ממשיכים

  return allData;
}


// הוספה
export async function insertItem(table, newItem) {
  const { error } = await supabase.from(table).insert(newItem);
  if (error) throw error;
}

// עדכון
export async function updateItem(table, id, updatedFields) {
  try {
    const { data, error } = await supabase
      .from(table)
      .update(updatedFields)
      .eq('id', id)
      .select();  // בקשת החזרת הרשומה המעודכנת

    if (error) throw error;
    return { success: true, data };
  } catch(err) {
    console.error('Error updating item:', err.message);
    return { success: false, error: err.message };
  }
}



export async function upsert(tableName, data, conflictKeys = []) {
  try {
    const dataToSend = Array.isArray(data) ? data : [data];

    const options = {};
    if (conflictKeys.length > 0) {
      options.onConflict = conflictKeys.join(",");
    }

    const { data: resultData, error } = await supabase
      .from(tableName)
      .upsert(dataToSend, options)
      .select();

    if (error) throw error;

    return { data: resultData };
  } catch (err) {
    console.error("שגיאה בשמירת נתונים:", err);
    return { error: err.message || err };
  }
}





