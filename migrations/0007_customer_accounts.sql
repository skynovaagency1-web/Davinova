-- Customer accounts: passwordless sign-in with a 6-digit email code.
-- Orders are linked by email, so orders placed before signing up show up too.
-- The customers table from 0001 (id, email, first_name, last_name, phone) gains account data.
ALTER TABLE customers ADD COLUMN address_json TEXT NOT NULL DEFAULT '{}';
ALTER TABLE customers ADD COLUMN sizes_json TEXT NOT NULL DEFAULT '{}';
ALTER TABLE customers ADD COLUMN wishlist_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE customers ADD COLUMN updated_at TEXT;
CREATE TABLE IF NOT EXISTS customer_codes (
  email TEXT PRIMARY KEY COLLATE NOCASE,
  code_hash TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  expires_at TEXT NOT NULL,
  sent_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS customer_sessions (
  token_hash TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_customer_sessions_customer ON customer_sessions(customer_id);
