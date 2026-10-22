-- Newsletter subscribers (marketing email from news@davinova.com). The API also creates this table if it is missing.
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  email TEXT PRIMARY KEY,
  dept TEXT NOT NULL DEFAULT 'women',
  token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'subscribed',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  unsubscribed_at TEXT
);
