-- טבלת מסמכים ידניים של לקוחות
CREATE TABLE IF NOT EXISTS customer_documents (
  id          bigserial PRIMARY KEY,
  customer_id bigint    NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  name        text      NOT NULL,
  file_path   text      NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- RLS: רק authenticated (מנהל) יכול לקרוא/לכתוב
ALTER TABLE customer_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin full access" ON customer_documents
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
