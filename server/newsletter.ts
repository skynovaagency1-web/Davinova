import { sendTransactionalEmail } from './email';

/** Newsletter sign-ups. Subscribers live in D1; marketing mail goes out from NEWS_FROM (news@davinova.com). */

export interface NewsletterEnv { DB?: D1Database; RESEND_API_KEY?: string; NEWS_FROM?: string; SITE_URL?: string }

const TABLE = `CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  email TEXT PRIMARY KEY, dept TEXT NOT NULL DEFAULT 'women', token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'subscribed', created_at TEXT NOT NULL DEFAULT (datetime('now')), unsubscribed_at TEXT)`;

export async function ensureNewsletterTable(db: D1Database): Promise<void> {
  await db.prepare(TABLE).run();
}

function newToken(): string {
  return [...crypto.getRandomValues(new Uint8Array(24))].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

/** Adds (or re-adds) a subscriber. Returns their unsubscribe token and whether they are new. */
export async function subscribe(db: D1Database, email: string, dept: 'women' | 'men'): Promise<{ token: string; isNew: boolean }> {
  await ensureNewsletterTable(db);
  const existing = await db.prepare('SELECT token,status FROM newsletter_subscribers WHERE email=?').bind(email).first<{ token: string; status: string }>();
  if (existing?.status === 'subscribed') return { token: existing.token, isNew: false };
  if (existing) {
    await db.prepare("UPDATE newsletter_subscribers SET status='subscribed', dept=?, unsubscribed_at=NULL WHERE email=?").bind(dept, email).run();
    return { token: existing.token, isNew: true };
  }
  const token = newToken();
  await db.prepare('INSERT INTO newsletter_subscribers (email, dept, token) VALUES (?,?,?)').bind(email, dept, token).run();
  return { token, isNew: true };
}

export async function unsubscribe(db: D1Database, token: string): Promise<boolean> {
  if (!/^[a-f0-9]{48}$/.test(token)) return false;
  await ensureNewsletterTable(db);
  const result = await db.prepare("UPDATE newsletter_subscribers SET status='unsubscribed', unsubscribed_at=datetime('now') WHERE token=?").bind(token).run();
  return (result.meta?.changes ?? 0) > 0;
}

export function unsubscribeUrl(env: NewsletterEnv, token: string): string {
  return (env.SITE_URL || 'https://davinova.com').replace(/\/$/, '') + '/api/newsletter/unsubscribe?t=' + token;
}

export async function sendWelcome(env: NewsletterEnv, email: string, token: string, dept: 'women' | 'men'): Promise<void> {
  const site = (env.SITE_URL || 'https://davinova.com').replace(/\/$/, '');
  const shop = dept === 'men' ? site + '/men' : site;
  const leave = unsubscribeUrl(env, token);
  await sendTransactionalEmail({
    to: email,
    subject: 'Welcome to Davinova',
    headers: { 'List-Unsubscribe': `<${leave}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
    html: '<div style="font-family:Arial,sans-serif;background:#FBF1E2;padding:28px;color:#2E2019">' +
      '<p style="letter-spacing:.2em;font-size:12px;margin:0 0 18px">DAVINOVA</p>' +
      '<p style="font-size:20px;margin:0 0 12px;color:#3C2A21">You\'re on the list.</p>' +
      '<p style="margin:0 0 18px;color:#5A4536">You\'ll be the first to hear about new arrivals, occasion edits and private offers. We only write when there is something worth seeing.</p>' +
      `<p style="margin:0 0 24px"><a href="${shop}" style="background:#3C2A21;color:#FBF1E2;padding:12px 22px;border-radius:999px;text-decoration:none">Shop new in</a></p>` +
      `<p style="margin:0;font-size:12px;color:#8E735B">Don't want these emails? <a href="${leave}" style="color:#8E735B">Unsubscribe</a>.</p></div>`,
  }, env.RESEND_API_KEY, env.NEWS_FROM || 'Davinova <news@davinova.com>');
}
