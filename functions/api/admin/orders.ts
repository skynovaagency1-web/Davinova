import { createApprovalToken } from '../../../server/auth';

interface Env { DB: D1Database }

function json(data: unknown, status = 200): Response {
  return Response.json(data, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
}

/** Owner order list. Admin password is checked by functions/_middleware.ts. */
export async function onRequestGet({ env }: { env: Env }): Promise<Response> {
  const orders = await env.DB.prepare(
    `SELECT o.id,o.order_number,o.email,o.status,o.payment_status,o.total_cents,o.currency,o.shipping_address_json,o.tracking_number,o.tracking_url,o.created_at,
      o.payment_reference,COALESCE(so.status,po.status) AS supplier_status,COALESCE(so.error_message,po.error_message) AS supplier_error
     FROM orders o LEFT JOIN supplier_orders so ON so.order_id=o.id AND so.supplier='cj' LEFT JOIN printify_orders po ON po.order_id=o.id
     WHERE o.status<>'pending_payment' OR o.created_at>datetime('now','-1 day')
     ORDER BY o.created_at DESC LIMIT 100`,
  ).all<Record<string, unknown> & { id: string; shipping_address_json: string }>()
    .catch(() => env.DB.prepare(
    `SELECT o.id,o.order_number,o.email,o.status,o.payment_status,o.total_cents,o.currency,o.shipping_address_json,o.tracking_number,o.tracking_url,o.created_at,
      o.payment_reference,so.status AS supplier_status,so.error_message AS supplier_error
     FROM orders o LEFT JOIN supplier_orders so ON so.order_id=o.id AND so.supplier='cj'
     WHERE o.status<>'pending_payment' OR o.created_at>datetime('now','-1 day')
     ORDER BY o.created_at DESC LIMIT 100`,
  ).all<Record<string, unknown> & { id: string; shipping_address_json: string }>());
  const rows = orders.results ?? [];
  const items = rows.length
    ? await env.DB.prepare(
      `SELECT order_id,product_title AS title,size,color,quantity,unit_price_cents,unit_cost_cents FROM order_items
       WHERE order_id IN (${rows.map(() => '?').join(',')})
       UNION ALL SELECT order_id,product_title,size,color,quantity,unit_price_cents,0 FROM custom_order_items
       WHERE order_id IN (${rows.map(() => '?').join(',')})`,
    ).bind(...rows.map((row) => row.id), ...rows.map((row) => row.id)).all<{ order_id: string }>()
      // Before migration 0011 (custom designs) is applied there is no custom_order_items table.
      .catch(() => env.DB.prepare(`SELECT order_id,product_title AS title,size,color,quantity,unit_price_cents,unit_cost_cents FROM order_items
       WHERE order_id IN (${rows.map(() => '?').join(',')}) ORDER BY id`).bind(...rows.map((row) => row.id)).all<{ order_id: string }>())
    : { results: [] };
  const byOrder = new Map<string, unknown[]>();
  for (const item of items.results ?? []) byOrder.set(item.order_id, [...(byOrder.get(item.order_id) ?? []), item]);
  return json({
    orders: rows.map(({ shipping_address_json, payment_reference, ...row }) => {
      let address: Record<string, unknown> = {};
      try { address = JSON.parse(shipping_address_json) as Record<string, unknown>; } catch { /* stored as text */ }
      return { ...row, test: String(payment_reference || '').startsWith('cs_test_'), address, items: byOrder.get(row.id) ?? [] };
    }),
  });
}

/** Opens the existing one-time approval review for a paid order waiting on the owner. */
export async function onRequestPost({ request, env }: { request: Request; env: Env }): Promise<Response> {
  let body: { orderId?: unknown };
  try { body = await request.json() as typeof body; } catch { return json({ error: 'Invalid JSON request.' }, 400); }
  const orderId = typeof body.orderId === 'string' ? body.orderId : '';
  const order = await env.DB.prepare('SELECT id,status,payment_status FROM orders WHERE id=?').bind(orderId).first<{ id: string; status: string; payment_status: string }>();
  if (!order || order.payment_status !== 'paid' || order.status !== 'pending_approval') return json({ error: 'This order is not waiting for your approval.' }, 409);
  // Any older unused link for this order stops working, so only one review can be open at a time.
  await env.DB.prepare("UPDATE approvals SET used_at=datetime('now') WHERE order_id=? AND used_at IS NULL").bind(order.id).run();
  const approval = await createApprovalToken(order.id, env.DB, 1);
  return json({ token: approval.token });
}
