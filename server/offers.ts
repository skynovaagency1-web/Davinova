import type { DiscountCode } from '../src/lib/offers';

interface D1Like { prepare(query: string): { bind(...values: unknown[]): { first<T>(): Promise<T | null> } } }

/** Looks up an active, in-date discount code that still has uses left. */
export async function loadDiscountCode(db: D1Like, raw: unknown): Promise<DiscountCode | null> {
  const code = typeof raw === 'string' ? raw.trim() : '';
  if (!/^[A-Za-z0-9_-]{2,32}$/.test(code)) return null;
  const row = await db.prepare(`
    SELECT code, discount_type, discount_value, minimum_subtotal_cents FROM discount_codes
    WHERE code=? AND active=1
      AND (starts_at IS NULL OR starts_at <= datetime('now'))
      AND (expires_at IS NULL OR expires_at > datetime('now'))
      AND (max_uses IS NULL OR uses_count < max_uses)
  `).bind(code).first<{ code: string; discount_type: 'percent' | 'fixed'; discount_value: number; minimum_subtotal_cents: number }>();
  return row ? { code: row.code, type: row.discount_type, value: row.discount_value, minimumSubtotalCents: row.minimum_subtotal_cents } : null;
}
