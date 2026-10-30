import { checkoutSettings, resolveCheckoutReturnOrigin, stripeConfiguration } from '../checkout';
import { newCode } from '../../../server/giftCards';
import { GIFT_AMOUNTS_CENTS } from '../../../src/lib/giftCards';

type Env = { DB: D1Database; STRIPE_SECRET_KEY?: string; STRIPE_MODE?: string; SITE_URL?: string; CJ_LIVE_ORDERS_ENABLED?: string; CJ_SANDBOX?: string };

function reply(data: unknown, status = 200): Response {
  return Response.json(data, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
}
const text = (value: unknown, max: number) => (typeof value === 'string' ? value.trim().replace(/\s+\n/g, '\n').slice(0, max) : '');
const isEmail = (value: string) => /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value);

/** Stripe Checkout for a digital gift card. The card is switched on and emailed by the paid webhook. */
export async function onRequestPost({ request, env }: { request: Request; env: Env }): Promise<Response> {
  if (request.headers.get('Origin') && request.headers.get('Origin') !== new URL(request.url).origin) return reply({ error: 'Cross-origin requests are not allowed.' }, 403);
  const stripe = stripeConfiguration(env as never);
  if (stripe instanceof Response) return stripe;
  const settings = checkoutSettings(env as never);
  if (settings instanceof Response) return settings;
  const site = resolveCheckoutReturnOrigin(request.url, settings.site, stripe.mode);

  let body: Record<string, unknown>;
  try { body = await request.json() as Record<string, unknown>; } catch { return reply({ error: 'Invalid JSON request.' }, 400); }
  const amount = Number(body.amountCents);
  if (!(GIFT_AMOUNTS_CENTS as readonly number[]).includes(amount)) return reply({ error: 'Pick a gift card amount.' }, 400);
  const recipientEmail = text(body.recipientEmail, 120).toLowerCase();
  if (recipientEmail && !isEmail(recipientEmail)) return reply({ error: 'Check the recipient\'s email address.' }, 400);
  const recipientName = text(body.recipientName, 60);
  const senderName = text(body.senderName, 60);
  const message = text(body.message, 400);
  const page = `${site}${body.dept === 'men' ? '/men' : ''}/gift-cards`;

  const id = crypto.randomUUID();
  const code = newCode('DVG');
  await env.DB.prepare("INSERT INTO gift_cards (id, code, kind, status, initial_cents, recipient_email, recipient_name, sender_name, message) VALUES (?, ?, 'gift', 'pending', ?, ?, ?, ?, ?)")
    .bind(id, code, amount, recipientEmail || null, recipientName || null, senderName || null, message || null).run();

  const form = new URLSearchParams();
  form.set('mode', 'payment');
  form.set('locale', 'auto');
  form.set('client_reference_id', id);
  form.set('success_url', `${page}?bought=1`);
  form.set('cancel_url', `${page}?checkout=cancelled`);
  form.set('billing_address_collection', 'required');
  form.set('metadata[kind]', 'gift_card');
  form.set('metadata[gift_card_id]', id);
  form.set('payment_intent_data[metadata][gift_card_id]', id);
  form.set('line_items[0][quantity]', '1');
  form.set('line_items[0][price_data][currency]', 'usd');
  form.set('line_items[0][price_data][unit_amount]', String(amount));
  form.set('line_items[0][price_data][product_data][name]', `Davinova gift card $${amount / 100}`);
  form.set('line_items[0][price_data][product_data][description]', recipientEmail ? `Emailed to ${recipientEmail}` : 'Emailed to you');

  const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${stripe.secret}`, 'Content-Type': 'application/x-www-form-urlencoded', 'Idempotency-Key': `davinova-gift-${id}` },
    body: form.toString(),
  });
  const session = await response.json().catch(() => ({})) as { id?: string; url?: string; amount_total?: number };
  if (!response.ok || !session.id || !session.url?.startsWith('https://checkout.stripe.com/') || session.amount_total !== amount) {
    await env.DB.prepare("UPDATE gift_cards SET status='void' WHERE id=?").bind(id).run();
    return reply({ error: 'Secure checkout could not be created. No payment was taken; please try again later.' }, 502);
  }
  await env.DB.prepare('UPDATE gift_cards SET payment_reference=? WHERE id=?').bind(session.id, id).run();
  return reply({ url: session.url });
}
