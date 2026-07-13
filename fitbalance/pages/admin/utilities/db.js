// db.js
const { createClient } = window.supabase;

const supabaseUrl = 'https://bmrtobuvjuycnvvfmgvf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJtcnRvYnV2anV5Y252dmZtZ3ZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA1ODQ5MDUsImV4cCI6MjA2NjE2MDkwNX0.VhoKIR_nb6lyu_05CEsVT8G_c90chKTX8v__5QA-A-s';
export const supabase = createClient(supabaseUrl, supabaseKey);

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





