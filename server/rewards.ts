import { ensureGiftTables, newCode } from './giftCards';
import { BLOCK_CENTS, POINTS_PER_BLOCK, POINTS_PER_DOLLAR, checkinPoints, levelFor, type RewardEntry, type Rewards } from '../src/lib/rewards';

/**
 * Davinova Club: daily check-in points, points → balance, balance top-ups and credit on invited friends' orders.
 * The balance is a personal gift card (code DVW-…), so the bag and checkout spend it exactly like any gift card.
 * Balance is store credit only: it is never paid out in cash.
 */
const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS club_members ( email TEXT PRIMARY KEY COLLATE NOCASE, wallet_card_id TEXT, points INTEGER NOT NULL DEFAULT 0 CHECK (points >= 0), lifetime_points INTEGER NOT NULL DEFAULT 0, streak INTEGER NOT NULL DEFAULT 0, last_checkin TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')) )`,
  `CREATE TABLE IF NOT EXISTS club_log ( id TEXT PRIMARY KEY, email TEXT NOT NULL COLLATE NOCASE, kind TEXT NOT NULL, cents INTEGER NOT NULL DEFAULT 0, points INTEGER NOT NULL DEFAULT 0, note TEXT NOT NULL DEFAULT '', ref TEXT UNIQUE, created_at TEXT NOT NULL DEFAULT (datetime('now')) )`,
  `CREATE INDEX IF NOT EXISTS club_log_email ON club_log(email, created_at)`,
  `CREATE TABLE IF NOT EXISTS wallet_topups ( id TEXT PRIMARY KEY, email TEXT NOT NULL COLLATE NOCASE, amount_cents INTEGER NOT NULL CHECK (amount_cents > 0), status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','void')), session_id TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')) )`,
];
let ready = false;
export async function ensureClubTables(db: D1Database): Promise<void> {
  if (ready) return;
  await ensureGiftTables(db);
  await db.batch(SCHEMA.map((statement) => db.prepare(statement)));
  ready = true;
}

interface Member { email: string; wallet_card_id: string | null; points: number; lifetime_points: number; streak: number; last_checkin: string | null }

async function member(db: D1Database, email: string): Promise<Member> {
  await db.prepare('INSERT OR IGNORE INTO club_members (email) VALUES (?)').bind(email).run();
  return (await db.prepare('SELECT email, wallet_card_id, points, lifetime_points, streak, last_checkin FROM club_members WHERE email=?').bind(email).first<Member>())!;
}

const day = (offset = 0) => new Date(Date.now() + offset * 86400000).toISOString().slice(0, 10);

/** Adds store credit to a member's balance once per ref. Returns false when that ref was already credited. */
export async function addCredit(db: D1Database, email: string, cents: number, kind: string, note: string, ref: string): Promise<boolean> {
  if (!Number.isSafeInteger(cents) || cents <= 0) return false;
  await ensureClubTables(db);
  const logged = await db.prepare('INSERT OR IGNORE INTO club_log (id, email, kind, cents, note, ref) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(crypto.randomUUID(), email, kind, cents, note, ref).run();
  if (Number(logged.meta.changes) !== 1) return false;
  const row = await member(db, email);
  if (row.wallet_card_id) {
    const added = await db.prepare("UPDATE gift_cards SET balance_cents=balance_cents+?, status='active' WHERE id=?").bind(cents, row.wallet_card_id).run();
    if (Number(added.meta.changes) === 1) return true;
  }
  const id = crypto.randomUUID();
  await db.batch([
    db.prepare("INSERT INTO gift_cards (id, code, kind, status, initial_cents, balance_cents, buyer_email, recipient_email, recipient_name, activated_at) VALUES (?, ?, 'gift', 'active', ?, ?, ?, ?, 'Davinova balance', datetime('now'))")
      .bind(id, newCode('DVW'), cents, cents, email, email),
    db.prepare('UPDATE club_members SET wallet_card_id=? WHERE email=?').bind(id, email),
  ]);
  return true;
}

/** Today's check-in. Missing a day starts the streak again at day 1; after day 7 it starts again too. */
export async function checkIn(db: D1Database, email: string): Promise<{ ok: boolean; points: number; day: number }> {
  await ensureClubTables(db);
  const row = await member(db, email);
  const today = day();
  if (row.last_checkin === today) return { ok: false, points: 0, day: row.streak };
  const next = row.last_checkin === day(-1) ? (row.streak % 7) + 1 : 1;
  const points = checkinPoints(next, levelFor(row.lifetime_points).level.boost);
  const done = await db.prepare('UPDATE club_members SET streak=?, last_checkin=?, points=points+?, lifetime_points=lifetime_points+? WHERE email=? AND (last_checkin IS NULL OR last_checkin<>?)')
    .bind(next, today, points, points, email, today).run();
  if (Number(done.meta.changes) !== 1) return { ok: false, points: 0, day: row.streak };
  await db.prepare('INSERT OR IGNORE INTO club_log (id, email, kind, points, note, ref) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(crypto.randomUUID(), email, 'checkin', points, `Day ${next} check-in`, `checkin-${email.toLowerCase()}-${today}`).run();
  return { ok: true, points, day: next };
}

/** Turns whole blocks of points into balance. */
export async function convertPoints(db: D1Database, email: string): Promise<number> {
  await ensureClubTables(db);
  const row = await member(db, email);
  const blocks = Math.floor(row.points / POINTS_PER_BLOCK);
  if (blocks < 1) return 0;
  const spend = blocks * POINTS_PER_BLOCK;
  const taken = await db.prepare('UPDATE club_members SET points=points-? WHERE email=? AND points>=?').bind(spend, email, spend).run();
  if (Number(taken.meta.changes) !== 1) return 0;
  const cents = blocks * BLOCK_CENTS;
  const ref = `convert-${crypto.randomUUID()}`;
  await addCredit(db, email, cents, 'points', `${spend} points turned into balance`, ref);
  await db.prepare('UPDATE club_log SET points=? WHERE ref=?').bind(-spend, ref).run();
  return cents;
}

/**
 * When an order ships: the buyer earns points (toward levels), and if a friend they invited placed it,
 * the inviter gets credit at their level's rate. Each order counts once.
 */
export async function rewardShippedOrder(db: D1Database, orderId: string): Promise<void> {
  await ensureClubTables(db);
  const order = await db.prepare("SELECT id, email, subtotal_cents, total_cents, shipping_cents, currency, payment_status FROM orders WHERE id=?")
    .bind(orderId).first<{ id: string; email: string; subtotal_cents: number; total_cents: number; shipping_cents: number; currency: string; payment_status: string }>();
  if (!order?.email || order.payment_status !== 'paid' || String(order.currency).toUpperCase() !== 'USD') return;
  const itemsCents = Math.max(0, Math.min(order.subtotal_cents, order.total_cents - (order.shipping_cents || 0)));
  const points = Math.floor(itemsCents / 100) * POINTS_PER_DOLLAR;
  if (points > 0) {
    const logged = await db.prepare('INSERT OR IGNORE INTO club_log (id, email, kind, points, note, ref) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(crypto.randomUUID(), order.email, 'order', points, 'Points for your order', `order-${order.id}`).run();
    if (Number(logged.meta.changes) === 1) {
      await member(db, order.email);
      await db.prepare('UPDATE club_members SET points=points+?, lifetime_points=lifetime_points+? WHERE email=?').bind(points, points, order.email).run();
    }
  }
  const inviter = await db.prepare(`SELECT c.email FROM referral_rewards r JOIN referral_codes c ON c.code=r.code WHERE r.friend_email=? COLLATE NOCASE LIMIT 1`)
    .bind(order.email).first<{ email: string }>();
  if (!inviter || inviter.email.toLowerCase() === order.email.toLowerCase()) return;
  const lifetime = (await db.prepare('SELECT lifetime_points FROM club_members WHERE email=?').bind(inviter.email).first<{ lifetime_points: number }>())?.lifetime_points ?? 0;
  const cents = Math.round(itemsCents * levelFor(lifetime).level.friendPercent / 100);
  await addCredit(db, inviter.email, cents, 'friend', 'Your friend\'s order shipped', `friend-${order.id}`);
}

/** Everything the Club pages show for one member. */
export async function clubSummary(db: D1Database, email: string): Promise<Rewards> {
  await ensureClubTables(db);
  const row = await member(db, email);
  const card = row.wallet_card_id
    ? await db.prepare("SELECT code, balance_cents FROM gift_cards WHERE id=? AND status='active'").bind(row.wallet_card_id).first<{ code: string; balance_cents: number }>()
    : null;
  const referral = await db.prepare('SELECT code FROM referral_codes WHERE email=?').bind(email).first<{ code: string }>();
  let joined = 0; let ordered = 0;
  if (referral) {
    ordered = (await db.prepare('SELECT COUNT(*) AS n FROM referral_rewards WHERE code=?').bind(referral.code).first<{ n: number }>())?.n ?? 0;
    joined = (await db.prepare(`SELECT COUNT(DISTINCT lower(o.email)) AS n FROM orders o JOIN order_events e ON e.order_id=o.id AND e.event_type='stripe_checkout_created'
      WHERE json_extract(e.metadata_json,'$.code')=? COLLATE NOCASE`).bind(referral.code).first<{ n: number }>().catch(() => null))?.n ?? 0;
  }
  const sums = await db.prepare(`SELECT
      COALESCE(SUM(CASE WHEN kind IN ('friend','points') THEN cents END),0) AS total,
      COALESCE(SUM(CASE WHEN kind='friend' THEN cents END),0) AS friends,
      COALESCE(SUM(CASE WHEN kind='points' THEN cents END),0) AS points,
      COALESCE(SUM(CASE WHEN kind IN ('friend','points') AND created_at>=datetime('now','start of month') THEN cents END),0) AS month,
      COALESCE(SUM(CASE WHEN kind IN ('friend','points') AND created_at>=datetime('now','-7 days') THEN cents END),0) AS week,
      COALESCE(SUM(CASE WHEN kind IN ('friend','points') AND created_at>=datetime('now','start of day') THEN cents END),0) AS today
    FROM club_log WHERE email=?`).bind(email).first<Rewards['earnedCents']>();
  const log = (await db.prepare('SELECT kind, cents, points, note, created_at AS at FROM club_log WHERE email=? ORDER BY created_at DESC LIMIT 40').bind(email).all<RewardEntry>()).results ?? [];
  const spent = row.wallet_card_id
    ? (await db.prepare(`SELECT 'spend' AS kind, -u.amount_cents AS cents, 0 AS points, 'Paid with balance · ' || o.order_number AS note, u.created_at AS at
        FROM gift_card_uses u JOIN orders o ON o.id=u.order_id WHERE u.gift_card_id=? AND u.status='applied' ORDER BY u.created_at DESC LIMIT 20`).bind(row.wallet_card_id).all<RewardEntry>()).results ?? []
    : [];
  return {
    walletCode: card?.code ?? null,
    balanceCents: card?.balance_cents ?? 0,
    points: row.points,
    lifetimePoints: row.lifetime_points,
    streak: row.last_checkin === day() || row.last_checkin === day(-1) ? row.streak : 0,
    checkedInToday: row.last_checkin === day(),
    level: levelFor(row.lifetime_points).level.key,
    referralCode: referral?.code ?? null,
    friends: { joined: Math.max(joined, ordered), ordered },
    earnedCents: sums ?? { total: 0, friends: 0, points: 0, month: 0, week: 0, today: 0 },
    history: [...log, ...spent].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 40),
  };
}

/** Paid top-up: credits the balance once. */
export async function completeTopup(db: D1Database, topupId: string, sessionId: string, paidCents: number): Promise<'credited' | 'duplicate' | 'mismatch'> {
  await ensureClubTables(db);
  const row = await db.prepare('SELECT id, email, amount_cents FROM wallet_topups WHERE id=? AND session_id=?').bind(topupId, sessionId).first<{ id: string; email: string; amount_cents: number }>();
  if (!row || row.amount_cents !== paidCents) return 'mismatch';
  const claimed = await db.prepare("UPDATE wallet_topups SET status='paid' WHERE id=? AND status='pending'").bind(topupId).run();
  if (Number(claimed.meta.changes) !== 1) return 'duplicate';
  await addCredit(db, row.email, row.amount_cents, 'topup', 'Balance top-up', `topup-${row.id}`);
  return 'credited';
}
