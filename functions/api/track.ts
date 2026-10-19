import { STEPS } from '../../server/orderSteps';
interface Env { DB?: D1Database }
interface OrderRow {
  id: string; order_number: string; status: string; created_at: string; updated_at: string;
  tracking_number: string | null; tracking_url: string | null; shipping_address_json: string;
}

// Wrong order number/email pairs per IP before a short lockout, so order numbers can't be guessed.
const MAX_FAILURES = 10;
const LOCKOUT_MINUTES = 15;

function reply(data: unknown, status = 200): Response {
  return Response.json(data, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' } });
}

async function lockedOut(db: D1Database, key: string): Promise<boolean> {
  const row = await db.prepare('SELECT locked_until FROM admin_auth_attempts WHERE ip=?').bind(key).first<{ locked_until: string | null }>();
  return Boolean(row?.locked_until && Date.parse(row.locked_until) > Date.now());
}
async function recordFailure(db: D1Database, key: string): Promise<void> {
  const row = await db.prepare('SELECT failures, locked_until FROM admin_auth_attempts WHERE ip=?').bind(key).first<{ failures: number; locked_until: string | null }>();
  const previous = row && !(row.locked_until && Date.parse(row.locked_until) <= Date.now()) ? row.failures : 0;
  const failures = previous + 1;
  const lockedUntil = failures >= MAX_FAILURES ? new Date(Date.now() + LOCKOUT_MINUTES * 60000).toISOString() : null;
  await db.prepare(
    `INSERT INTO admin_auth_attempts (ip, failures, locked_until, updated_at) VALUES (?,?,?,datetime('now'))
     ON CONFLICT(ip) DO UPDATE SET failures=excluded.failures, locked_until=excluded.locked_until, updated_at=datetime('now')`,
  ).bind(key, failures, lockedUntil).run();
}

/** Customer order lookup: needs both the order number and the email used at checkout, and returns only what the customer already knows. */
export async function onRequestPost({ request, env }: { request: Request; env: Env }): Promise<Response> {
  if (!env.DB) return reply({ error: 'Order tracking is temporarily unavailable.' }, 503);
  let body: { orderNumber?: unknown; email?: unknown };
  try { body = await request.json() as typeof body; } catch { return reply({ error: 'Invalid request.' }, 400); }
  const orderNumber = typeof body.orderNumber === 'string' ? body.orderNumber.trim().toUpperCase().replace(/^#/, '') : '';
  const email = typeof body.email === 'string' ? body.email.trim() : '';
  if (!/^DV-[A-Z0-9]{6,20}$/.test(orderNumber) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200) {
    return reply({ error: 'Enter the order number from your confirmation (it starts with DV-) and the email you used.' }, 400);
  }

  const key = 'track:' + (request.headers.get('CF-Connecting-IP') || 'unknown');
  if (await lockedOut(env.DB, key)) return reply({ error: 'Too many attempts. Please try again in 15 minutes.' }, 429);

  const order = await env.DB.prepare(
    'SELECT id,order_number,status,created_at,updated_at,tracking_number,tracking_url,shipping_address_json FROM orders WHERE order_number=? AND email=? COLLATE NOCASE LIMIT 1',
  ).bind(orderNumber, email).first<OrderRow>();
  if (!order) {
    await recordFailure(env.DB, key);
    return reply({ error: 'We could not find an order with that number and email. Check both and try again.' }, 404);
  }

  const items = await env.DB.prepare('SELECT product_title AS title,size,color,quantity FROM order_items WHERE order_id=? ORDER BY id')
    .bind(order.id).all<{ title: string; size: string; color: string; quantity: number }>();
  let country = '';
  try { country = String((JSON.parse(order.shipping_address_json) as { country?: unknown }).country || ''); } catch { /* no address yet */ }
  const step = STEPS[order.status] ?? STEPS.paid;
  return reply({
    orderNumber: order.order_number, placedAt: order.created_at, updatedAt: order.updated_at,
    step: step.step, label: step.label, note: step.note, country,
    trackingNumber: order.tracking_number, trackingUrl: order.tracking_url,
    items: items.results ?? [],
  });
}
