import { supabase } from './supabaseClient.js'

export async function selectFromTable(table, filters = {}) {
  let query = supabase.from(table).select('*');

  for (const [key, value] of Object.entries(filters)) {
    if (typeof value === 'object' && value !== null) {
      // כאן נבדוק את סוג התנאים
      for (const [operator, val] of Object.entries(value)) {
        switch (operator) {
          case 'eq':
            query = query.eq(key, val);
            break;
          case 'lte':
            query = query.lte(key, val);
            break;
          case 'gte':
            query = query.gte(key, val);
            break;
          case 'lt':
            query = query.lt(key, val);
            break;
          case 'gt':
            query = query.gt(key, val);
            break;
          // אפשר להוסיף עוד אופרטורים לפי הצורך
          default:
            throw new Error(`Unsupported filter operator: ${operator}`);
        }
      }
    } else {
      // אם הערך הוא לא אובייקט, נניח שזו השוואה שווה
      query = query.eq(key, value);
    }
  }

  const { data, error } = await query;

  if (error) {
    console.log('Supabase error:', error);
    throw error;
  }

  return data;
}


export async function selectFromTableAll(table) {
  let query = supabase.from(table).select('*');
  const { data, error } = await query;

  if (error) {
    console.log('Supabase error:', error)
    throw error
  }

  return data

}

export async function selectFromTabletype(table, filters = {}) {
  let query = supabase.from(table).select('*');

  for (const [type, [column, value]] of Object.entries(filters)) {
    if (type === 'eq') query = query.eq(column, value);
    else if (type === 'gte') query = query.gte(column, value);
    else if (type === 'lte') query = query.lte(column, value);
    // הוסיפי תנאים נוספים אם צריך
  }

  return await query;
}


/**
 * מעלה קובץ ל-Supabase Storage
 * @param {string} bucket - שם ה-bucket ב-Storage
 * @param {string} path - הנתיב בו יישמר הקובץ כולל שם הקובץ
 * @param {File | Blob} file - קובץ להעלאה
 * @returns {Promise<void>}
 */
export async function uploadFileToStorage(bucket, path, file) {
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: true,
    })

  if (error) throw error

  return data
}

/**
 * מקבל URL ציבורי לקובץ ב-Storage
 * @param {string} bucket - שם ה-bucket
 * @param {string} path - נתיב הקובץ
 * @returns {string} url ציבורי של הקובץ
 */
export function getPublicUrl(bucket, path) {
  const { data, error } = supabase.storage
    .from(bucket)
    .getPublicUrl(path)

  if (error) throw error
  return data.publicUrl
}

/**
 * פונקציה לעדכון שדות בטבלה
 * @param {string} table - שם הטבלה
 * @param {object} updateValues - אובייקט עם שדות וערכים לעדכון
 * @param {object} filters - תנאי סינון לעדכון
 * @returns {Promise<object>} data של העדכון
 */
export async function updateTable(table, updateValues, filters = {}) {
  let query = supabase.from(table).update(updateValues)
  for (const [key, value] of Object.entries(filters)) {
    query = query.eq(key, value)
  }

  const { data, error } = await query

  if (error) throw error
  return data
}


/**
 * מוסיף נוכחות לשיעור עבור משתמש
 * @param {string} sessionId - מזהה השיעור
 * @param {string} clientId - מזהה המשתמש/לקוח
 * @param {string} [status='registered'] - סטטוס ההרשמה (רשום/השלמה וכו')
 * @returns {Promise<{ success: boolean, error?: any }>}
 */
export async function addAttendance(sessionId, clientId, status_code = 2) {
  const { error } = await supabase
    .from('session_attendance')
    .insert([{ session_id: sessionId, customer_id: clientId, status_code }]);
  
  if (error) {
    console.error('שגיאה בהוספת נוכחות:', error);
    return { success: false, error };
  }

  return { success: true };
}

/**
 * מסיר נוכחות לשיעור עבור משתמש
 * @param {string} sessionId - מזהה השיעור
 * @param {string} clientId - מזהה המשתמש/לקוח
 * @returns {Promise<{ success: boolean, error?: any }>}
 */
export async function removeAttendance(sessionId, clientId) {
  const { error } = await supabase
    .from('session_attendance')
    .delete()
    .match({ session_id: sessionId, customer_id: clientId });

  if (error) {
    console.error('שגיאה במחיקת נוכחות:', error);
    return { success: false, error };
  }

  return { success: true };
}

export async function getDescriptionFromCodeTable(tableName, code) {
  const { data, error } = await supabase
    .from('codetables')
    .select('descriptionCode')
    .eq('name', tableName)
    .eq('code', code)
    .maybeSingle();

  if (error) {
    console.error(`שגיאה בשליפת קוד מ-${tableName}`, error);
    return '';
  }

  return data?.descriptionCode || '';
}

export async function getDescriptionFromInstructor(code) {
const { data, error } = await supabase
  .from('instructors')
  .select('firstName')
  .eq('id', code)
  .maybeSingle();

if (error) {
  console.error(`שגיאה בשליפת קוד`, error);
  return '';
}

return data?.firstName || '';
}
