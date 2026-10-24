import type { CJEnv } from '../../server/cj';

type Env = CJEnv;

function reply(data: unknown, status = 200): Response {
  return Response.json(data, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
    },
  });
}

/**
 * Returns only the payment state for a Checkout Session already attached to
 * a stored Davinova order. The session ID is not treated as proof of payment.
 */
export async function onRequestGet({ request, env }: { request: Request; env: Env }): Promise<Response> {
  if (!env.DB) return reply({ state: 'pending' }, 503);

  const sessionId = new URL(request.url).searchParams.get('session_id') || '';
  if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(sessionId)) {
    return reply({ state: 'unknown' }, 400);
  }

  try {
    const order = await env.DB.prepare(
      "SELECT order_number, status, payment_status, total_cents, currency FROM orders WHERE payment_provider='stripe' AND payment_reference=? LIMIT 1",
    ).bind(sessionId).first<{ order_number: string; status: string; payment_status: string; total_cents: number; currency: string }>();

    if (!order) return reply({ state: 'pending' });
    // The order number lets the customer track the order later; the Checkout Session ID is already private to them.
    if (order.payment_status === 'paid') return reply({ state: 'paid', orderNumber: order.order_number, value: order.total_cents / 100, currency: order.currency });
    if (order.status === 'cancelled') return reply({ state: 'failed' });
    return reply({ state: 'pending' });
  } catch (error) {
    console.error('Order payment status lookup failed:', error instanceof Error ? error.message : 'Unknown database failure');
    return reply({ state: 'pending' }, 503);
  }
}
