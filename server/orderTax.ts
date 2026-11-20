/**
 * Tax and URSSAF columns on orders (migrations/0013_order_tax_fields.sql). Added on first use too, because
 * migrations on this project are applied by hand and an order must never fail for a missing column.
 */
const COLUMNS: Array<[string, string]> = [
  ['shipping_country', 'TEXT'],
  ['eur_exchange_rate', 'REAL'],
  ['net_subtotal_eur', 'REAL'],
  ['shipping_fee_eur', 'REAL'],
  ['eu_vat_rate_applied', 'REAL NOT NULL DEFAULT 0'],
  ['eu_vat_collected_eur', 'REAL NOT NULL DEFAULT 0'],
  ['total_paid_eur', 'REAL'],
  ['ioss_eligible', 'INTEGER NOT NULL DEFAULT 0'],
  ['tax_case', 'TEXT'],
  ['paid_at', 'TEXT'],
];

let ready = false;
export async function ensureOrderTaxColumns(db: D1Database): Promise<void> {
  if (ready) return;
  const existing = await db.prepare('PRAGMA table_info(orders)').all<{ name: string }>();
  const have = new Set((existing.results ?? []).map((row) => row.name));
  const missing = COLUMNS.filter(([name]) => !have.has(name));
  if (missing.length) await db.batch(missing.map(([name, type]) => db.prepare(`ALTER TABLE orders ADD COLUMN ${name} ${type}`)));
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_orders_paid_at ON orders(paid_at)').run();
  ready = true;
}
