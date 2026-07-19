CREATE TABLE IF NOT EXISTS password_reset_requests (
  id           BIGSERIAL PRIMARY KEY,
  email        TEXT NOT NULL,
  role         TEXT NOT NULL CHECK (role IN ('customer', 'employee')),
  status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'handled')),
  requested_at TIMESTAMPTZ DEFAULT NOW()
);

GRANT INSERT ON password_reset_requests TO anon;
GRANT USAGE, SELECT ON SEQUENCE password_reset_requests_id_seq TO anon;
