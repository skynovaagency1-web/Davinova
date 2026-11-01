import { sendTransactionalEmail } from './email';

interface ReviewEnv { DB: D1Database; RESEND_API_KEY?: string; EMAIL_FROM?: string }
interface ReviewRow { id: string; order_number: string; email: string }

/** Days after shipping before we ask: delivery takes 7 to 15 business days, so the piece has arrived and been worn. */
export const REVIEW_AFTER_DAYS = 21;

const esc = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function reviewEmailHtml(orderNumber: string): string {
  return '<div style="font-family:Arial,sans-serif;color:#262321;max-width:560px;margin:auto">'
    + '<p style="letter-spacing:.16em;text-transform:uppercase;font-size:11px">DAVINOVA</p>'
    + '<h1 style="font-family:Georgia,serif;font-weight:normal">How did it look on you?</h1>'
    + `<p>Your order <strong>${esc(orderNumber)}</strong> should be with you by now. We'd love to know how it fits and how it felt on the day.</p>`
    + '<p>Just reply to this email with a few words, and a photo if you like. We read every one, and with your OK we may share it on the site.</p>'
    + '<p>Something not right? Reply too: you have 30 days to return it, and we will help.</p>'
    + '<p style="font-size:12px;color:#817872">Thank you for shopping with Davinova.</p></div>';
}

/** Once per order, three weeks after it shipped: ask the customer how it went. */
export async function sendReviewRequests(env: ReviewEnv, limit = 10): Promise<number> {
  await env.DB.prepare('CREATE TABLE IF NOT EXISTS review_requests (order_id TEXT PRIMARY KEY, sent_at TEXT NOT NULL DEFAULT (datetime(\'now\')))').run();
  const { results } = await env.DB.prepare(`SELECT o.id, o.order_number, o.email FROM orders o
      WHERE o.status IN ('shipped','delivered') AND julianday(o.updated_at) <= julianday('now', ?)
        AND NOT EXISTS (SELECT 1 FROM review_requests r WHERE r.order_id = o.id)
      ORDER BY o.updated_at ASC LIMIT ?`).bind(`-${REVIEW_AFTER_DAYS} days`, limit).all<ReviewRow>();
  let sent = 0;
  for (const row of results ?? []) {
    // Claim the order first so a second run can never email twice.
    const claim = await env.DB.prepare('INSERT OR IGNORE INTO review_requests (order_id) VALUES (?)').bind(row.id).run();
    if (!claim.meta?.changes) continue;
    if (!row.email) continue;
    await sendTransactionalEmail({ to: row.email, subject: 'How did your Davinova piece look?', html: reviewEmailHtml(row.order_number) }, env.RESEND_API_KEY, env.EMAIL_FROM)
      .then(() => { sent += 1; })
      .catch((error) => console.error('Review request failed:', error instanceof Error ? error.message : error));
  }
  return sent;
}
