-- Design-your-own pieces (tee, hoodie, tote, mug) printed per order by Printify.
-- Kept apart from order_items/supplier_orders, whose supplier column only allows CJ and FondMart.

-- One uploaded design: the print file and a preview, both stored in R2 (binding CUSTOM_DESIGNS).
CREATE TABLE IF NOT EXISTS custom_designs (
  id TEXT PRIMARY KEY,
  product_key TEXT NOT NULL,
  color TEXT NOT NULL,
  print_key TEXT NOT NULL,
  preview_key TEXT NOT NULL,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  ip_hash TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_custom_designs_ip ON custom_designs(ip_hash, created_at);

CREATE TABLE IF NOT EXISTS custom_order_items (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  design_id TEXT NOT NULL REFERENCES custom_designs(id),
  product_key TEXT NOT NULL,
  product_title TEXT NOT NULL,
  color TEXT NOT NULL,
  size TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price_cents INTEGER NOT NULL CHECK (unit_price_cents >= 0)
);
CREATE INDEX IF NOT EXISTS idx_custom_order_items_order ON custom_order_items(order_id);

-- The Printify order placed after the owner approves.
CREATE TABLE IF NOT EXISTS printify_orders (
  order_id TEXT PRIMARY KEY REFERENCES orders(id) ON DELETE CASCADE,
  printify_order_id TEXT,
  status TEXT NOT NULL DEFAULT 'processing',
  cost_cents INTEGER,
  error_message TEXT,
  tracking_number TEXT,
  tracking_url TEXT,
  tracking_email_sent_at TEXT,
  next_retry_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Printify blueprint, print provider and variant ids, looked up once with the API token.
CREATE TABLE IF NOT EXISTS printify_catalog (
  product_key TEXT PRIMARY KEY,
  blueprint_id INTEGER NOT NULL,
  print_provider_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  variants_json TEXT NOT NULL,
  resolved_at TEXT NOT NULL DEFAULT (datetime('now'))
);
