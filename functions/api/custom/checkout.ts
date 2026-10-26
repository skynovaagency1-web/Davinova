import { customProduct, MAX_CUSTOM_QUANTITY, ONE_SIZE } from '../../../src/lib/customDesign';
import { customSetupProblem, designFileUrl, findVariant, resolveCatalog, type PrintifyEnv } from '../../../server/printify';
import { currentCustomer } from '../../../server/accounts';
import { checkoutSettings, resolveCheckoutReturnOrigin, stripeConfiguration } from '../checkout';

type Env = PrintifyEnv & {
  STRIPE_SECRET_KEY?: string; STRIPE_MODE?: string; STRIPE_SHIPPING_COUNTRIES?: string; STRIPE_SHIPPING_FEE_CENTS?: string;
  STRIPE_SHIPPING_LABEL?: string; STRIPE_AUTOMATIC_TAX?: string; CJ_LIVE_ORDERS_ENABLED?: string; CJ_SANDBOX?: string;
};

function reply(data: unknown, status = 200): Response {
  return Response.json(data, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
}

/**
 * Stripe Checkout for one design-your-own piece. The price comes from src/lib/customDesign.ts, never the browser.
 * The paid webhook queues owner approval as for CJ orders; approval places the Printify order.
 */
export async function onRequestPost({ request, env }: { request: Request; env: Env }): Promise<Response> {
  if (request.headers.get('Origin') && request.headers.get('Origin') !== new URL(request.url).origin) return reply({ error: 'Cross-origin checkout requests are not allowed.' }, 403);
  if (customSetupProblem(env)) return reply({ error: 'Custom orders open very soon. Please check back shortly.' }, 503);
  const stripe = stripeConfiguration(env as never);
  if (stripe instanceof Response) return stripe;
  const settings = checkoutSettings(env as never);
  if (settings instanceof Response) return settings;
  const site = resolveCheckoutReturnOrigin(request.url, settings.site, stripe.mode);

  let body: Record<string, unknown>;
  try { body = await request.json() as Record<string, unknown>; } catch { return reply({ error: 'Invalid JSON request.' }, 400); }
  const designId = typeof body.designId === 'string' ? body.designId : '';
  const quantity = Number(body.quantity);
  const dept = body.dept === 'men' ? 'men' : 'women';
  if (!/^[0-9a-f-]{36}$/.test(designId) || !Number.isSafeInteger(quantity) || quantity < 1 || quantity > MAX_CUSTOM_QUANTITY) return reply({ error: 'Your design is incomplete. Please try again.' }, 400);

  const design = await env.DB.prepare('SELECT id,product_key,color FROM custom_designs WHERE id=?').bind(designId).first<{ id: string; product_key: string; color: string }>();
  const product = customProduct(design?.product_key);
  if (!design || !product) return reply({ error: 'This design was not found. Please save it again.' }, 404);
  const size = product.sizes.length ? String(body.size || '') : ONE_SIZE;
  if (product.sizes.length && !product.sizes.includes(size)) return reply({ error: 'Pick a size first.' }, 400);

  try {
    const catalog = await resolveCatalog(env, product.key);
    if (!findVariant(catalog, design.color, size)) return reply({ error: `${product.name} in ${design.color} ${size} is not available right now.` }, 409);
  } catch (error) {
    console.error('Printify catalogue lookup failed:', error instanceof Error ? error.message : error);
    return reply({ error: 'Custom orders are paused for a moment. No payment was taken; please try again later.' }, 503);
  }

  const title = `${product.name} · ${design.color}${product.sizes.length ? ' · ' + size : ''} (your design)`;
  const subtotal = product.priceCents * quantity;
  const orderId = crypto.randomUUID();
  const orderNumber = `DV-${crypto.randomUUID().replaceAll('-', '').slice(0, 12).toUpperCase()}`;
  const total = subtotal + settings.shippingFeeCents;

  await env.DB.batch([
    env.DB.prepare(`INSERT INTO orders (id,order_number,email,status,payment_provider,payment_status,subtotal_cents,shipping_cents,discount_cents,total_cents,currency,shipping_address_json,shipping_method)
      VALUES (?,?,?,'pending_payment','stripe','unpaid',?,?,0,?,'USD','{}','standard')`).bind(orderId, orderNumber, `pending+${orderId}@checkout.invalid`, subtotal, settings.shippingFeeCents, total),
    env.DB.prepare('INSERT INTO custom_order_items (id,order_id,design_id,product_key,product_title,color,size,quantity,unit_price_cents) VALUES (?,?,?,?,?,?,?,?,?)')
      .bind(crypto.randomUUID(), orderId, design.id, product.key, title, design.color, size, quantity, product.priceCents),
    env.DB.prepare("INSERT INTO order_events (id,order_id,event_type,to_status,message,metadata_json) VALUES (?,?,'stripe_checkout_created','pending_payment','Stripe Checkout session requested for a custom design.',?)")
      .bind(crypto.randomUUID(), orderId, JSON.stringify({ designId: design.id, product: product.key })),
  ]);

  const form = new URLSearchParams();
  form.set('mode', 'payment');
  form.set('locale', 'auto');
  form.set('client_reference_id', orderId);
  const email = (await currentCustomer(request, env.DB).catch(() => null))?.email;
  if (email) form.set('customer_email', email);
  form.set('success_url', `${site}/order-confirmation?session_id={CHECKOUT_SESSION_ID}`);
  form.set('cancel_url', `${site}${dept === 'men' ? '/men' : ''}/custom/design?checkout=cancelled`);
  form.set('phone_number_collection[enabled]', 'true');
  form.set('billing_address_collection', 'required');
  settings.countries.forEach((country, index) => form.set(`shipping_address_collection[allowed_countries][${index}]`, country));
  form.set('shipping_options[0][shipping_rate_data][type]', 'fixed_amount');
  form.set('shipping_options[0][shipping_rate_data][fixed_amount][amount]', String(settings.shippingFeeCents));
  form.set('shipping_options[0][shipping_rate_data][fixed_amount][currency]', 'usd');
  form.set('shipping_options[0][shipping_rate_data][display_name]', 'Free tracked delivery (printed for you, 7–12 business days)');
  if (settings.autoTax) form.set('automatic_tax[enabled]', 'true');
  form.set('metadata[order_id]', orderId);
  form.set('metadata[order_number]', orderNumber);
  form.set('payment_intent_data[metadata][order_id]', orderId);
  form.set('payment_intent_data[metadata][order_number]', orderNumber);
  form.set('line_items[0][quantity]', String(quantity));
  form.set('line_items[0][price_data][currency]', 'usd');
  form.set('line_items[0][price_data][unit_amount]', String(product.priceCents));
  form.set('line_items[0][price_data][product_data][name]', title);
  form.set('line_items[0][price_data][product_data][images][0]', designFileUrl(env, design.id, 'preview'));
  form.set('line_items[0][price_data][product_data][metadata][design_id]', design.id);

  const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${stripe.secret}`, 'Content-Type': 'application/x-www-form-urlencoded', 'Idempotency-Key': `davinova-custom-${orderId}` },
    body: form.toString(),
  });
  const session = await response.json().catch(() => ({})) as { id?: string; url?: string; amount_total?: number; amount_subtotal?: number; total_details?: { amount_tax?: number; amount_shipping?: number } };
  if (!response.ok || !session.id || !session.url?.startsWith('https://checkout.stripe.com/') || session.amount_subtotal !== subtotal) {
    await env.DB.prepare("UPDATE orders SET status='cancelled',updated_at=datetime('now') WHERE id=? AND status='pending_payment'").bind(orderId).run();
    return reply({ error: 'Secure checkout could not be created. No payment was taken; please try again later.' }, 502);
  }
  await env.DB.prepare("UPDATE orders SET payment_reference=?,total_cents=?,updated_at=datetime('now') WHERE id=?")
    .bind(session.id, Number(session.amount_total ?? total), orderId).run();
  return reply({ url: session.url, orderNumber });
}
