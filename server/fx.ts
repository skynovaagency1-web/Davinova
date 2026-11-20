import { EUR_PER_USD } from '../src/lib/currency';

/**
 * Official euro reference rate (ECB, via the free Frankfurter API), cached once per day in D1 so every order stores
 * the rate of its purchase day. If the service is down, the last known rate is used, then the shop's display rate.
 */
const SCHEMA = 'CREATE TABLE IF NOT EXISTS fx_rates ( day TEXT PRIMARY KEY, usd_to_eur REAL NOT NULL, source TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime(\'now\')) )';

export async function usdToEurRate(db: D1Database, day = new Date().toISOString().slice(0, 10)): Promise<number> {
  await db.prepare(SCHEMA).run();
  const cached = await db.prepare('SELECT usd_to_eur FROM fx_rates WHERE day=?').bind(day).first<{ usd_to_eur: number }>();
  if (cached?.usd_to_eur) return cached.usd_to_eur;
  try {
    const response = await fetch('https://api.frankfurter.dev/v1/latest?base=USD&symbols=EUR', { headers: { Accept: 'application/json' } });
    const data = await response.json() as { rates?: { EUR?: number } };
    const rate = Number(data.rates?.EUR);
    if (response.ok && rate > 0.3 && rate < 3) {
      await db.prepare('INSERT OR IGNORE INTO fx_rates (day, usd_to_eur, source) VALUES (?, ?, ?)').bind(day, rate, 'ecb').run();
      return rate;
    }
  } catch { /* fall back below */ }
  const last = await db.prepare('SELECT usd_to_eur FROM fx_rates ORDER BY day DESC LIMIT 1').first<{ usd_to_eur: number }>();
  return last?.usd_to_eur || EUR_PER_USD;
}
