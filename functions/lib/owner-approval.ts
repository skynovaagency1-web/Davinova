import { createApprovalToken } from './auth';
import { sendTransactionalEmail } from './email';

interface Env {
  DB: D1Database; OWNER_EMAIL?: string; RESEND_API_KEY?: string; EMAIL_FROM?: string; SITE_URL?: string; DRY_RUN?: string;
}
interface PaidOrder {
  id: string; order_number: string; payment_status: string; status: string; total_cents: number; currency: string;
}
function escapeHtml(value: string): string {
  return value.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
}

/**
 * Call only after a verified, idempotently stored Stripe/PayPal paid event.
 * Payment callbacks are not yet implemented in the checkout scaffold.
 */
export async function queueCJApprovalAfterVerifiedPayment(env: Env, orderId: string): Promise<void> {
  const order = await env.DB.prepare('SELECT id,order_number,payment_status,status,total_cents,currency FROM orders WHERE id=?')
    .bind(orderId).first<PaidOrder>();
  if (!order || order.payment_status !== 'paid' || order.status !== 'paid') {
    throw new Error('Only a newly confirmed paid order can request supplier approval.');
  }
  if (!env.OWNER_EMAIL?.trim() || !env.SITE_URL?.trim()) throw new Error('OWNER_EMAIL and SITE_URL must be configured.');
  const site = new URL(env.SITE_URL);
  if (site.protocol !== 'https:' && site.hostname !== 'localhost') throw new Error('SITE_URL must use HTTPS outside local development.');
  const approval = await createApprovalToken(order.id, env.DB, 24);
  const approvalUrl = new URL('/approve-cj', site);
  approvalUrl.searchParams.set('token', approval.token);
  const total = new Intl.NumberFormat('en-US', { style:'currency', currency:order.currency || 'USD' }).format(order.total_cents / 100);
  const dryRun = (env.DRY_RUN ?? 'true').toLowerCase() !== 'false';
  const modeNote = dryRun
    ? '<p><strong>Dry run is enabled:</strong> approval will not contact CJ or spend supplier funds.</p>'
    : '<p>Review the products and the final CJ shipping/payable amount before approving. Approval can result in a debit to your CJ balance.</p>';
  const safeNumber = escapeHtml(order.order_number);
  await sendTransactionalEmail({
    to: env.OWNER_EMAIL,
    subject: 'Davinova supplier approval needed · ' + order.order_number,
    html: '<div style="font-family:Arial,sans-serif;color:#262321;max-width:560px;margin:auto">' +
      '<p style="letter-spacing:.16em;text-transform:uppercase;font-size:11px">DAVINOVA · OWNER APPROVAL</p>' +
      '<h1 style="font-family:Georgia,serif;font-weight:normal">Supplier purchase review</h1>' +
      '<p>Customer order <strong>' + safeNumber + '</strong> has a verified payment.</p>' +
      '<p>Customer order total: <strong>' + total + '</strong></p>' + modeNote +
      '<p><a href="' + approvalUrl.toString() + '" style="display:inline-block;background:#262321;color:#fffaf5;text-decoration:none;padding:15px 20px">Review and approve CJ order</a></p>' +
      '<p style="font-size:12px;color:#817872">This single-use link expires in 24 hours. Do not approve if the supplier product, size, stock, address or total is unclear.</p></div>',
  }, env.RESEND_API_KEY, env.EMAIL_FROM);
  const update = await env.DB.prepare("UPDATE orders SET status='pending_approval',updated_at=datetime('now') WHERE id=? AND payment_status='paid' AND status='paid'")
    .bind(order.id).run();
  if (!(update.meta?.changes ?? 0)) throw new Error('Order status changed while owner approval email was being sent; reconcile order before any purchase.');
  await env.DB.prepare('INSERT INTO order_events (id,order_id,event_type,from_status,to_status,message,metadata_json) VALUES (?,?,?,?,?,?,?)')
    .bind(crypto.randomUUID(), order.id, 'cj_approval_requested', 'paid', 'pending_approval', 'Owner approval email sent after verified payment.', JSON.stringify({expiresAt:approval.expiresAt})).run();
}
