import { checkoutSettings, resolveCheckoutReturnOrigin, stripeConfiguration } from '../checkout';
import { currentCustomer, reply, sameOrigin } from '../../../server/accounts';
import { ensureClubTables } from '../../../server/rewards';
import { TOPUP_AMOUNTS_CENTS } from '../../../src/lib/rewards';

type Env = { DB: D1Database; STRIPE_SECRET_KEY?: string; STRIPE_MODE?: string; SITE_URL?: string; CJ_LIVE_ORDERS_ENABLED?: string; CJ_SANDBOX?: string };

/** Stripe Checkout to add money to the signed-in member's balance (store credit, spent in the bag). */
export async function onRequestPost({ request, env }: { request: Request; env: Env }): Promise<Response> {
  if (!sameOrigin(request)) return reply({ error: 'Not allowed.' }, 403);
  const customer = await currentCustomer(request, env.DB);
  if (!customer) return reply({ error: 'Please sign in again.' }, 401);
  const stripe = stripeConfiguration(env as never);
  if (stripe instanceof Response) return stripe;
  const settings = checkoutSettings(env as never);
  if (settings instanceof Response) return settings;
  const site = resolveCheckoutReturnOrigin(request.url, settings.site, stripe.mode);

  let body: Record<string, unknown>;
  try { body = await request.json() as Record<string, unknown>; } catch { return reply({ error: 'Invalid request.' }, 400); }
  const amount = Number(body.amountCents);
  if (!(TOPUP_AMOUNTS_CENTS as readonly number[]).includes(amount)) return reply({ error: 'Pick an amount.' }, 400);
  const page = `${site}${body.dept === 'men' ? '/men' : ''}/account`;

  await ensureClubTables(env.DB);
  const id = crypto.randomUUID();
  await env.DB.prepare('INSERT INTO wallet_topups (id, email, amount_cents) VALUES (?, ?, ?)').bind(id, customer.email, amount).run();

  const form = new URLSearchParams();
  form.set('mode', 'payment');
  form.set('locale', 'auto');
  form.set('client_reference_id', id);
  form.set('customer_email', customer.email);
  form.set('success_url', `${page}?topup=1`);
  form.set('cancel_url', `${page}?topup=cancelled`);
  form.set('metadata[kind]', 'wallet_topup');
  form.set('metadata[topup_id]', id);
  form.set('payment_intent_data[metadata][wallet_topup_id]', id);
  form.set('line_items[0][quantity]', '1');
  form.set('line_items[0][price_data][currency]', 'usd');
  form.set('line_items[0][price_data][unit_amount]', String(amount));
  form.set('line_items[0][price_data][product_data][name]', `Davinova balance top-up $${amount / 100}`);
  form.set('line_items[0][price_data][product_data][description]', 'Store credit for davinova.com. Not exchangeable for cash.');

  const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${stripe.secret}`, 'Content-Type': 'application/x-www-form-urlencoded', 'Idempotency-Key': `davinova-topup-${id}` },
    body: form.toString(),
  });
  const session = await response.json().catch(() => ({})) as { id?: string; url?: string; amount_total?: number };
  if (!response.ok || !session.id || !session.url?.startsWith('https://checkout.stripe.com/') || session.amount_total !== amount) {
    await env.DB.prepare("UPDATE wallet_topups SET status='void' WHERE id=?").bind(id).run();
    return reply({ error: 'Secure checkout could not be created. No payment was taken; please try again later.' }, 502);
  }
  await env.DB.prepare('UPDATE wallet_topups SET session_id=? WHERE id=?').bind(session.id, id).run();
  return reply({ url: session.url });
}
