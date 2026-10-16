-- The placeholder /api/admin/* password gate had no brute-force protection: an
-- attacker could try unlimited passwords against functions/_middleware.ts with
-- no cost. This table backs a per-IP lockout. It is a stop-gap, not a
-- replacement for putting /api/admin/* behind Cloudflare Access in production.
CREATE TABLE IF NOT EXISTS admin_auth_attempts (
  ip TEXT PRIMARY KEY,
  failures INTEGER NOT NULL DEFAULT 0,
  locked_until TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
