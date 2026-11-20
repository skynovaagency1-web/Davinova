-- French tax / URSSAF record per order (see server/tax.ts complianceFields). server/orderTax.ts adds these on first use too.
ALTER TABLE orders ADD COLUMN shipping_country TEXT;
ALTER TABLE orders ADD COLUMN eur_exchange_rate REAL;
ALTER TABLE orders ADD COLUMN net_subtotal_eur REAL;
ALTER TABLE orders ADD COLUMN shipping_fee_eur REAL;
ALTER TABLE orders ADD COLUMN eu_vat_rate_applied REAL NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN eu_vat_collected_eur REAL NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN total_paid_eur REAL;
ALTER TABLE orders ADD COLUMN ioss_eligible INTEGER NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN tax_case TEXT;
ALTER TABLE orders ADD COLUMN paid_at TEXT;
CREATE INDEX IF NOT EXISTS idx_orders_paid_at ON orders(paid_at);
CREATE TABLE IF NOT EXISTS fx_rates ( day TEXT PRIMARY KEY, usd_to_eur REAL NOT NULL, source TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')) );
CREATE TABLE IF NOT EXISTS stripe_tax_rates ( key TEXT PRIMARY KEY, stripe_id TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')) );
