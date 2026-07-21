-- הוספת עמודות חסרות לטבלת מתעניינות
ALTER TABLE inquiries
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'new'
    CHECK (status IN ('new', 'contacted', 'joined', 'closed')),
  ADD COLUMN IF NOT EXISTS notes        TEXT,
  ADD COLUMN IF NOT EXISTS program_name TEXT;
