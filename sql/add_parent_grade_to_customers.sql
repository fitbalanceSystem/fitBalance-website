-- הוספת שדה שם הורה וכיתה לטבלת customers
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS parentName text,
  ADD COLUMN IF NOT EXISTS grade      text;
