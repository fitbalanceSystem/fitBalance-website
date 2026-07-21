-- הוספת עמודת סטטוס לטבלת מתעניינות
ALTER TABLE inquiries
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'new'
    CHECK (status IN ('new', 'contacted', 'joined', 'closed'));
