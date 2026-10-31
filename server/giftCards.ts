import { sendTransactionalEmail } from './email';
import { REFERRAL, type GiftCardBalance } from '../src/lib/giftCards';

export interface GiftEnv {
  DB: D1Database;
  RESEND_API_KEY?: string;
  EMAIL_FROM?: string;
  SITE_URL?: string;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
}
const money = (cents: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
const site = (env: GiftEnv) => (env.SITE_URL || 'https://davinova.com').replace(/\/$/, '');

/** Same as migrations/0012_gift_cards.sql; run on first use so the live database needs no manual step. */
const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS gift_cards ( id TEXT PRIMARY KEY, code TEXT NOT NULL UNIQUE COLLATE NOCASE, kind TEXT NOT NULL DEFAULT 'gift' CHECK (kind IN ('gift','referral')), status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','void')), initial_cents INTEGER NOT NULL CHECK (initial_cents > 0), balance_cents INTEGER NOT NULL DEFAULT 0 CHECK (balance_cents >= 0), currency TEXT NOT NULL DEFAULT 'USD', buyer_email TEXT, recipient_email TEXT, recipient_name TEXT, sender_name TEXT, message TEXT, payment_reference TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')), activated_at TEXT )`,
  `CREATE INDEX IF NOT EXISTS gift_cards_payment ON gift_cards(payment_reference)`,
  `CREATE TABLE IF NOT EXISTS gift_card_uses ( id TEXT PRIMARY KEY, gift_card_id TEXT NOT NULL REFERENCES gift_cards(id), order_id TEXT NOT NULL UNIQUE, amount_cents INTEGER NOT NULL CHECK (amount_cents > 0), status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','applied','short')), created_at TEXT NOT NULL DEFAULT (datetime('now')) )`,
  `CREATE TABLE IF NOT EXISTS referral_codes ( code TEXT PRIMARY KEY COLLATE NOCASE, email TEXT NOT NULL UNIQUE COLLATE NOCASE, created_at TEXT NOT NULL DEFAULT (datetime('now')), last_sent_at TEXT )`,
  `CREATE TABLE IF NOT EXISTS referral_rewards ( id TEXT PRIMARY KEY, code TEXT NOT NULL, order_id TEXT NOT NULL UNIQUE, friend_email TEXT NOT NULL UNIQUE COLLATE NOCASE, gift_card_id TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')) )`,
];
let schemaReady = false;
export async function ensureGiftTables(db: D1Database): Promise<void> {
  if (schemaReady) return;
  await db.batch(SCHEMA.map((statement) => db.prepare(statement)));
  schemaReady = true;
}

/** Codes like DVG-7KQM-P4XZ: no 0/O or 1/I, so they read cleanly from an email. */
export function newCode(prefix: string): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  const chars = Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join('');
  return `${prefix}-${chars.slice(0, 4)}-${chars.slice(4)}`;
}

export async function loadGiftCard(db: D1Database, raw: unknown): Promise<(GiftCardBalance & { id: string }) | null> {
  const code = typeof raw === 'string' ? raw.trim() : '';
  if (!/^[A-Za-z0-9-]{6,32}$/.test(code)) return null;
  const row = await db.prepare("SELECT id, code, balance_cents FROM gift_cards WHERE code=? AND status='active' AND balance_cents > 0")
    .bind(code).first<{ id: string; code: string; balance_cents: number }>();
  return row ? { id: row.id, code: row.code, balanceCents: row.balance_cents } : null;
}

/**
 * Takes the gift card amount reserved at checkout off the card once Stripe confirms payment.
 * Returns 'short' when the card no longer covers it (spent in a parallel checkout), so the order is reviewed by hand.
 */
export async function applyGiftUse(db: D1Database, orderId: string): Promise<'none' | 'applied' | 'short'> {
  const use = await db.prepare("SELECT id, gift_card_id, amount_cents FROM gift_card_uses WHERE order_id=? AND status='pending'")
    .bind(orderId).first<{ id: string; gift_card_id: string; amount_cents: number }>()
    // Before migration 0012 the table doesn't exist; a paid order must never fail on that.
    .catch(() => null);
  if (!use) return 'none';
  const claimed = await db.prepare("UPDATE gift_card_uses SET status='applied' WHERE id=? AND status='pending'").bind(use.id).run();
  if (Number(claimed.meta.changes) !== 1) return 'none';
  const taken = await db.prepare("UPDATE gift_cards SET balance_cents=balance_cents-? WHERE id=? AND status='active' AND balance_cents>=?")
    .bind(use.amount_cents, use.gift_card_id, use.amount_cents).run();
  if (Number(taken.meta.changes) === 1) return 'applied';
  await db.prepare("UPDATE gift_card_uses SET status='short' WHERE id=?").bind(use.id).run();
  return 'short';
}

interface GiftRow { id: string; code: string; kind: string; initial_cents: number; buyer_email: string | null; recipient_email: string | null; recipient_name: string | null; sender_name: string | null; message: string | null }

function cardHtml(env: GiftEnv, card: GiftRow, intro: string): string {
  return '<div style="font-family:Arial,sans-serif;color:#2E2019;max-width:560px;margin:auto;line-height:1.6">' +
    '<p style="letter-spacing:.16em;text-transform:uppercase;font-size:11px">DAVINOVA</p>' +
    '<div style="background:linear-gradient(135deg,#2E2019,#5A4536 60%,#8E735B);color:#FBF1E2;border-radius:18px;padding:28px 26px;margin:14px 0">' +
    '<div style="letter-spacing:.3em;font-size:13px">DAVINOVA</div>' +
    '<div style="font-family:Georgia,serif;font-size:44px;margin:18px 0 6px">' + escapeHtml(money(card.initial_cents)) + '</div>' +
    '<div style="font-size:12px;letter-spacing:.12em;text-transform:uppercase;opacity:.8">Gift card</div></div>' +
    '<p>' + intro + '</p>' +
    (card.message ? '<blockquote style="border-left:3px solid #CDB69E;margin:16px 0;padding:4px 14px;font-style:italic">' + escapeHtml(card.message).replace(/\n/g, '<br>') + '</blockquote>' : '') +
    '<p>Your code: <strong style="font-size:18px;letter-spacing:.08em">' + escapeHtml(card.code) + '</strong></p>' +
    '<p>Enter it in your bag at checkout, on anything in both shops. It never expires, and whatever you don\'t spend stays on the card for next time.</p>' +
    '<p><a href="' + escapeHtml(site(env)) + '/shop" style="display:inline-block;background:#3C2A21;color:#FBF1E2;text-decoration:none;padding:13px 18px">Start shopping</a></p>' +
    '<p style="font-size:12px;color:#8E735B">Gift cards can\'t be exchanged for cash. Questions? Just reply to this email.</p></div>';
}

async function sendCard(env: GiftEnv, card: GiftRow): Promise<void> {
  const to = card.recipient_email || card.buyer_email;
  if (!to) return;
  const from = card.sender_name ? escapeHtml(card.sender_name) : 'Someone special';
  const intro = card.kind === 'referral'
    ? 'Thank you for sharing Davinova. Your friend\'s order has shipped, so here is your ' + escapeHtml(money(card.initial_cents)) + ' credit.'
    : card.recipient_email && card.recipient_email.toLowerCase() !== (card.buyer_email || '').toLowerCase()
      ? (card.recipient_name ? escapeHtml(card.recipient_name) + ', ' : '') + from + ' sent you a Davinova gift card.'
      : 'Here is your Davinova gift card, ready to give or to keep.';
  await sendTransactionalEmail({
    to,
    subject: card.kind === 'referral' ? 'You earned ' + money(card.initial_cents) + ' at Davinova' : (card.sender_name ? card.sender_name.slice(0, 60) + ' sent you a Davinova gift card' : 'Your Davinova gift card'),
    html: cardHtml(env, card, intro),
  }, env.RESEND_API_KEY, env.EMAIL_FROM);
  // The buyer gets a short receipt when the card went to someone else.
  if (card.kind === 'gift' && card.buyer_email && to.toLowerCase() !== card.buyer_email.toLowerCase()) {
    await sendTransactionalEmail({
      to: card.buyer_email,
      subject: 'Your Davinova gift card was sent',
      html: '<div style="font-family:Arial,sans-serif;color:#2E2019;max-width:560px;margin:auto;line-height:1.6"><p style="letter-spacing:.16em;text-transform:uppercase;font-size:11px">DAVINOVA</p>' +
        '<p>Your ' + escapeHtml(money(card.initial_cents)) + ' gift card was emailed to ' + escapeHtml(to) + '. Thank you!</p>' +
        '<p style="font-size:12px;color:#8E735B">If it doesn\'t arrive, reply to this email and we\'ll resend it.</p></div>',
    }, env.RESEND_API_KEY, env.EMAIL_FROM).catch((error) => console.error('Gift card receipt failed:', error instanceof Error ? error.message : error));
  }
}

/** Paid gift card purchase: switch the card on (once) and email it. */
export async function activateGiftCard(env: GiftEnv, giftId: string, sessionId: string, paidCents: number, buyerEmail: string): Promise<'activated' | 'duplicate' | 'mismatch'> {
  const card = await env.DB.prepare("SELECT id, code, kind, initial_cents, buyer_email, recipient_email, recipient_name, sender_name, message FROM gift_cards WHERE id=? AND payment_reference=?")
    .bind(giftId, sessionId).first<GiftRow>();
  if (!card) return 'mismatch';
  if (paidCents !== card.initial_cents) return 'mismatch';
  const switched = await env.DB.prepare("UPDATE gift_cards SET status='active', balance_cents=initial_cents, buyer_email=?, activated_at=datetime('now') WHERE id=? AND status='pending'")
    .bind(buyerEmail || card.buyer_email, giftId).run();
  if (Number(switched.meta.changes) !== 1) return 'duplicate';
  await sendCard(env, { ...card, buyer_email: buyerEmail || card.buyer_email })
    .catch((error) => console.error('Gift card email failed:', error instanceof Error ? error.message : error));
  return 'activated';
}

/** A customer's personal referral code, created on first ask. The friend's $15 off is a discount code with the same name. */
export async function ensureReferralCode(db: D1Database, email: string): Promise<string> {
  const existing = await db.prepare('SELECT code FROM referral_codes WHERE email=?').bind(email).first<{ code: string }>();
  if (existing) return existing.code;
  const code = newCode('FRIEND');
  await db.batch([
    db.prepare('INSERT INTO referral_codes (code, email) VALUES (?, ?)').bind(code, email),
    db.prepare("INSERT INTO discount_codes (id, code, discount_type, discount_value, minimum_subtotal_cents, active) VALUES (?, ?, 'fixed', ?, ?, 1)")
      .bind(`ref-${code.toLowerCase()}`, code, REFERRAL.friendCents, REFERRAL.minimumCents),
  ]);
  return code;
}

export async function sendReferralCode(env: GiftEnv, email: string, code: string): Promise<void> {
  const link = `${site(env)}/?ref=${encodeURIComponent(code)}`;
  await sendTransactionalEmail({
    to: email,
    subject: 'Your Davinova code: give $15, get $15',
    html: '<div style="font-family:Arial,sans-serif;color:#2E2019;max-width:560px;margin:auto;line-height:1.6"><p style="letter-spacing:.16em;text-transform:uppercase;font-size:11px">DAVINOVA</p>' +
      '<h1 style="font-family:Georgia,serif;font-weight:normal">Give $15, get $15</h1>' +
      '<p>Your personal code is <strong style="font-size:18px;letter-spacing:.08em">' + escapeHtml(code) + '</strong>.</p>' +
      '<p>Your friend gets ' + escapeHtml(money(REFERRAL.friendCents)) + ' off a first order of ' + escapeHtml(money(REFERRAL.minimumCents)) + ' or more. When their order ships, we email you a ' + escapeHtml(money(REFERRAL.rewardCents)) + ' gift card.</p>' +
      '<p>Share this link, the code is already in it:<br><a href="' + escapeHtml(link) + '">' + escapeHtml(link) + '</a></p>' +
      '<p style="font-size:12px;color:#8E735B">Credit can\'t be exchanged for cash. Using your own code doesn\'t earn a reward.</p></div>',
  }, env.RESEND_API_KEY, env.EMAIL_FROM);
}

/**
 * Called when an order ships: if it used someone's referral code and is that customer's first paid order,
 * the referrer gets a $15 gift card by email. Each friend counts once.
 */
export async function rewardReferrer(env: GiftEnv, orderId: string): Promise<void> {
  const row = await env.DB.prepare(`
    SELECT o.email, r.code, r.email AS referrer FROM orders o
    JOIN order_events e ON e.order_id=o.id AND e.event_type='stripe_checkout_created'
    JOIN referral_codes r ON r.code = json_extract(e.metadata_json,'$.code')
    WHERE o.id=? LIMIT 1`).bind(orderId).first<{ email: string; code: string; referrer: string }>();
  if (!row || !row.email || row.email.toLowerCase() === row.referrer.toLowerCase()) return;
  const earlier = await env.DB.prepare("SELECT 1 FROM orders WHERE lower(email)=lower(?) AND id<>? AND payment_status IN ('paid','partially_refunded','refunded') AND created_at < (SELECT created_at FROM orders WHERE id=?) LIMIT 1")
    .bind(row.email, orderId, orderId).first();
  if (earlier) return;
  const rewardId = crypto.randomUUID();
  const claimed = await env.DB.prepare('INSERT OR IGNORE INTO referral_rewards (id, code, order_id, friend_email) VALUES (?, ?, ?, ?)')
    .bind(rewardId, row.code, orderId, row.email).run();
  if (Number(claimed.meta.changes) !== 1) return;
  const card: GiftRow = { id: crypto.randomUUID(), code: newCode('DVG'), kind: 'referral', initial_cents: REFERRAL.rewardCents, buyer_email: row.referrer, recipient_email: row.referrer, recipient_name: null, sender_name: null, message: null };
  await env.DB.batch([
    env.DB.prepare("INSERT INTO gift_cards (id, code, kind, status, initial_cents, balance_cents, buyer_email, recipient_email, activated_at) VALUES (?, ?, 'referral', 'active', ?, ?, ?, ?, datetime('now'))")
      .bind(card.id, card.code, card.initial_cents, card.initial_cents, row.referrer, row.referrer),
    env.DB.prepare('UPDATE referral_rewards SET gift_card_id=? WHERE id=?').bind(card.id, rewardId),
  ]);
  await sendCard(env, card).catch((error) => console.error('Referral reward email failed:', error instanceof Error ? error.message : error));
}
