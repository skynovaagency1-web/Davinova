-- Digital gift cards (bought on /gift-cards, or earned through refer a friend) and personal referral codes.
CREATE TABLE IF NOT EXISTS gift_cards (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE COLLATE NOCASE,
  kind TEXT NOT NULL DEFAULT 'gift' CHECK (kind IN ('gift','referral')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','void')),
  initial_cents INTEGER NOT NULL CHECK (initial_cents > 0),
  balance_cents INTEGER NOT NULL DEFAULT 0 CHECK (balance_cents >= 0),
  currency TEXT NOT NULL DEFAULT 'USD',
  buyer_email TEXT,
  recipient_email TEXT,
  recipient_name TEXT,
  sender_name TEXT,
  message TEXT,
  payment_reference TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  activated_at TEXT
);
CREATE INDEX IF NOT EXISTS gift_cards_payment ON gift_cards(payment_reference);

-- One gift card use per order: 'pending' at checkout, 'applied' once Stripe confirms payment.
CREATE TABLE IF NOT EXISTS gift_card_uses (
  id TEXT PRIMARY KEY,
  gift_card_id TEXT NOT NULL REFERENCES gift_cards(id),
  order_id TEXT NOT NULL UNIQUE,
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','applied','short')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Each customer's personal code. The friend's $15 off lives in discount_codes under the same code.
CREATE TABLE IF NOT EXISTS referral_codes (
  code TEXT PRIMARY KEY COLLATE NOCASE,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_sent_at TEXT
);

-- One $15 reward per new customer, issued when their first order ships.
CREATE TABLE IF NOT EXISTS referral_rewards (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  order_id TEXT NOT NULL UNIQUE,
  friend_email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  gift_card_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
