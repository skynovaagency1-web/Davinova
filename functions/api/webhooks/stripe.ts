import { createApprovalToken } from '../../../server/auth';
import type { CJEnv } from '../../../server/cj';

type Env = CJEnv & {
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  STRIPE_MODE?: string;
  STRIPE_SHIPPING_COUNTRIES?: string;
  RESEND_API_KEY?: string;
  EMAIL_FROM?: string;
  OWNER_EMAIL?: string;
  SITE_URL?: string;
};

interface StripeAddress {
  line1?: string | null;
  line2?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country?: string | null;
}
interface StripeSession {
  id?: string;
  mode?: string;
  status?: string;
  payment_status?: string;
  livemode?: boolean;
  client_reference_id?: string | null;
  metadata?: Record<string, string>;
  customer_details?: { email?: string | null; name?: string | null; phone?: string | null; address?: StripeAddress | null } | null;
  customer_email?: string | null;
  shipping_details?: { name?: string | null; address?: StripeAddress | null } | null;
  collected_information?: { shipping_details?: { name?: string | null; address?: StripeAddress | null } | null } | null;
  currency?: string | null;
  amount_total?: number | null;
  amount_subtotal?: number | null;
  total_details?: { amount_shipping?: number | null; amount_tax?: number | null; amount_discount?: number | null } | null;
}
interface StripeEvent {
  id?: string;
  type?: string;
  livemode?: boolean;
  data?: { object?: StripeSession };
}
interface StoreOrder {
  id: string;
  order_number: string;
  email: string;
  status: string;
  payment_provider: string | null;
  payment_status: string;
  payment_reference: string | null;
  subtotal_cents: number;
  shipping_cents: number;
  total_cents: number;
  currency: string;
}

function reply(data: unknown, status = 200): Response {
  return Response.json(data, {
    status,
    headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
  });
}
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let index = 0; index < a.length; index++) difference |= a.charCodeAt(index) ^ b.charCodeAt(index);
  return difference === 0;
}
function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/** Stripe signs timestamp + "." + the exact raw request body using HMAC-SHA256. */
export async function verifyStripeWebhookSignature(
  rawBody: Uint8Array,
  signatureHeader: string | null,
  secret: string,
  nowSeconds = Math.floor(Date.now() / 1000),
): Promise<boolean> {
  if (!signatureHeader || !secret) return false;
  const parts = signatureHeader.split(',');
  const timestamp = parts.find((part) => part.startsWith('t='))?.slice(2);
  const v1Signatures = parts.filter((part) => part.startsWith('v1=')).map((part) => part.slice(3));
  const timestampNumber = Number(timestamp);
  if (!timestamp || !Number.isSafeInteger(timestampNumber) || Math.abs(nowSeconds - timestampNumber) > 300 || v1Signatures.length === 0) {
    return false;
  }
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const prefix = new TextEncoder().encode(timestamp + '.');
  const signed = new Uint8Array(prefix.length + rawBody.length);
  signed.set(prefix);
  signed.set(rawBody, prefix.length);
  const expected = toHex(new Uint8Array(await crypto.subtle.sign('HMAC', key, signed)));
  return v1Signatures.some((signature) => /^[a-f0-9]{64}$/i.test(signature) && safeEqual(signature.toLowerCase(), expected));
}

function isOrderCountryAllowed(env: Env, code: string): boolean {
  const allowed = (env.STRIPE_SHIPPING_COUNTRIES || '').split(',').map((country) => country.trim().toUpperCase()).filter(Boolean);
  return allowed.includes(code.toUpperCase());
}
function addressFromSession(session: StripeSession) {
  const shipping = session.collected_information?.shipping_details || session.shipping_details;
  const address = shipping?.address || session.customer_details?.address;
  if (!address) return null;
  const countryCode = String(address.country || '').toUpperCase();
  const name = String(shipping?.name || session.customer_details?.name || '').trim();
  const address1 = String(address.line1 || '').trim();
  const city = String(address.city || '').trim();
  if (!name || !address1 || !city || !/^[A-Z]{2}$/.test(countryCode)) return null;
  let country = countryCode;
  try {
    country = new Intl.DisplayNames(['en'], { type: 'region' }).of(countryCode) || countryCode;
  } catch {
    // Keep the ISO code if this runtime does not provide a region display name.
  }
  return {
    name, address1, address2: String(address.line2 || '').trim(), city,
    // CJ requires a non-empty province; Stripe state is empty for some countries.
    province: String(address.state || city).trim(), country, countryCode,
    postalCode: String(address.postal_code || '').trim(),
    phone: String(session.customer_details?.phone || '').trim(),
  };
}
function htmlEscape(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character] || character);
}

async function sendOwnerApprovalEmail(env: Env, order: StoreOrder, approvalToken: string): Promise<void> {
  if (!env.RESEND_API_KEY || !env.EMAIL_FROM || !env.OWNER_EMAIL || !env.SITE_URL) {
    throw new Error('Resend and owner-notification settings must be configured before paid orders can be finalized.');
  }
  const site = new URL(env.SITE_URL);
  if (site.protocol !== 'https:') throw new Error('SITE_URL must use HTTPS for owner approval links.');
  const approvalUrl = site.origin + '/approve-cj?token=' + encodeURIComponent(approvalToken);
  const total = new Intl.NumberFormat('en-GB', { style: 'currency', currency: order.currency || 'USD' }).format(order.total_cents / 100);
  const subject = 'Davinova order ' + order.order_number + ' — review before CJ fulfilment';
  const text = [
    'A customer payment has been verified for Davinova order ' + order.order_number + '.',
    'Paid total: ' + total,
    '',
    'The supplier order has NOT been placed automatically. Review the verified CJ product/variant, stock, landed cost and shipping before approving.',
    '',
    'Review order: ' + approvalUrl,
    '',
    'This one-time approval link expires in 24 hours.',
  ].join('\n');
  const html = '<div style="font-family:Arial,sans-serif;line-height:1.6;color:#292521">' +
    '<h2>Davinova order ready for review</h2>' +
    '<p>Customer payment has been verified for order <strong>' + htmlEscape(order.order_number) + '</strong>.</p>' +
    '<p>Paid total: <strong>' + htmlEscape(total) + '</strong></p>' +
    '<p>The supplier order has <strong>not</strong> been placed automatically. Review item mapping, current stock, supplier costs and delivery before approving fulfilment.</p>' +
    '<p><a href="' + htmlEscape(approvalUrl) + '" style="display:inline-block;padding:12px 18px;background:#292521;color:#fff;text-decoration:none">Review order</a></p>' +
    '<p>This one-time approval link expires in 24 hours.</p></div>';

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + env.RESEND_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: env.EMAIL_FROM, to: [env.OWNER_EMAIL], subject, text, html }),
  });
  if (!response.ok) throw new Error('Resend could not deliver the order approval notification.');
}

async function existingEvent(env: Env, eventId: string): Promise<boolean> {
  const row = await env.DB.prepare('SELECT id FROM webhook_events WHERE id=? LIMIT 1')
    .bind(eventId).first<{ id: string }>();
  return Boolean(row);
}
async function recordEvent(env: Env, event: StripeEvent, session?: StripeSession): Promise<void> {
  const payload = {
    checkoutSessionId: session?.id || null,
    orderId: session?.metadata?.order_id || session?.client_reference_id || null,
    paymentStatus: session?.payment_status || null,
  };
  await env.DB.prepare('INSERT OR IGNORE INTO webhook_events (id, provider, event_type, payload_json) VALUES (?, ?, ?, ?)')
    .bind(event.id!, 'stripe', event.type || 'unknown', JSON.stringify(payload)).run();
}

/**
 * Verify Stripe's signature, reconcile the paid amount with the D1 order and
 * collect shipping details. The existing one-time owner-approval flow remains
 * the only code path allowed to start a CJ supplier purchase.
 */
export async function onRequestPost({ request, env }: { request: Request; env: Env }): Promise<Response> {
  if (!env.DB || !env.STRIPE_WEBHOOK_SECRET || !env.STRIPE_SECRET_KEY) {
    return reply({ error: 'Stripe webhook settings are not configured.' }, 503);
  }
  if (env.STRIPE_MODE !== 'test' && env.STRIPE_MODE !== 'live') {
    return reply({ error: 'STRIPE_MODE must be explicitly configured.' }, 503);
  }

  const rawBody = new Uint8Array(await request.arrayBuffer());
  const valid = await verifyStripeWebhookSignature(rawBody, request.headers.get('Stripe-Signature'), env.STRIPE_WEBHOOK_SECRET);
  if (!valid) return reply({ error: 'Invalid Stripe webhook signature.' }, 400);

  let event: StripeEvent;
  try {
    event = JSON.parse(new TextDecoder().decode(rawBody)) as StripeEvent;
  } catch {
    return reply({ error: 'Invalid webhook JSON.' }, 400);
  }
  if (!event.id || !event.type) return reply({ error: 'Missing Stripe event ID or type.' }, 400);
  if (Boolean(event.livemode) !== (env.STRIPE_MODE === 'live')) {
    return reply({ error: 'Stripe event mode does not match the configured checkout mode.' }, 400);
  }

  try {
    if (await existingEvent(env, event.id)) return reply({ received: true, duplicate: true });

    const supported = new Set([
      'checkout.session.completed',
      'checkout.session.async_payment_succeeded',
      'checkout.session.async_payment_failed',
    ]);
    if (!supported.has(event.type)) {
      await recordEvent(env, event);
      return reply({ received: true, ignored: true });
    }

    const session = event.data?.object;
    if (!session?.id || session.mode !== 'payment') {
      return reply({ error: 'Webhook does not contain a valid payment Checkout Session.' }, 400);
    }
    const orderId = String(session.metadata?.order_id || session.client_reference_id || '');
    if (!orderId) return reply({ error: 'Checkout Session has no order reference.' }, 400);

    const order = await env.DB.prepare(
      'SELECT id, order_number, email, status, payment_provider, payment_status, payment_reference, subtotal_cents, shipping_cents, total_cents, currency FROM orders WHERE id=? LIMIT 1',
    ).bind(orderId).first<StoreOrder>();

    if (!order || order.payment_provider !== 'stripe' || order.payment_reference !== session.id) {
      return reply({ error: 'Checkout Session does not match a stored Davinova order.' }, 409);
    }
    if (session.metadata?.order_number !== order.order_number) {
      return reply({ error: 'Checkout Session order number does not match the stored order.' }, 409);
    }

    if (event.type === 'checkout.session.async_payment_failed') {
      await env.DB.prepare(
        "UPDATE orders SET status='cancelled', payment_status='unpaid', updated_at=datetime('now') WHERE id=? AND status='pending_payment' AND payment_reference=?",
      ).bind(order.id, session.id).run();
      await recordEvent(env, event, session);
      return reply({ received: true, paymentFailed: true });
    }

    if (session.payment_status !== 'paid' || session.status !== 'complete') {
      await recordEvent(env, event, session);
      return reply({ received: true, awaitingPayment: true });
    }

    const paidTotal = Number(session.amount_total);
    const subtotal = Number(session.amount_subtotal);
    const shippingAmount = Number(session.total_details?.amount_shipping ?? 0);
    const currency = String(session.currency || '').toUpperCase();
    if (
      !Number.isSafeInteger(paidTotal) || !Number.isSafeInteger(subtotal) ||
      paidTotal !== order.total_cents || subtotal !== order.subtotal_cents ||
      shippingAmount !== order.shipping_cents || currency !== String(order.currency).toUpperCase()
    ) {
      await env.DB.prepare(
        "UPDATE orders SET status='needs_attention', payment_status='paid', updated_at=datetime('now') WHERE id=? AND payment_reference=?",
      ).bind(order.id, session.id).run();
      await env.DB.prepare(
        "INSERT INTO order_events (id, order_id, event_type, from_status, to_status, message, metadata_json) VALUES (?, ?, 'stripe_amount_mismatch', ?, 'needs_attention', 'Stripe reported a paid amount that did not match the stored order; manual reconciliation is required.', ?)",
      ).bind(
        crypto.randomUUID(), order.id, order.status,
        JSON.stringify({ sessionId: session.id, stripeCurrency: currency, expectedCurrency: order.currency }),
      ).run();
      await recordEvent(env, event, session);
      return reply({ received: true, needsAttention: true });
    }

    const address = addressFromSession(session);
    const email = String(session.customer_details?.email || session.customer_email || '').trim();
    if (!address || !email || !isOrderCountryAllowed(env, address.countryCode)) {
      await env.DB.prepare(
        "UPDATE orders SET status='needs_attention', payment_status='paid', updated_at=datetime('now') WHERE id=? AND payment_reference=?",
      ).bind(order.id, session.id).run();
      await env.DB.prepare(
        "INSERT INTO order_events (id, order_id, event_type, from_status, to_status, message, metadata_json) VALUES (?, ?, 'stripe_shipping_incomplete', ?, 'needs_attention', 'Payment succeeded but address, email or destination validation failed. Reconcile before fulfilment.', ?)",
      ).bind(
        crypto.randomUUID(), order.id, order.status,
        JSON.stringify({ sessionId: session.id, countryCode: address?.countryCode || null }),
      ).run();
      await recordEvent(env, event, session);
      return reply({ received: true, needsAttention: true });
    }

    if (!['pending_payment', 'pending_approval'].includes(order.status)) {
      await recordEvent(env, event, session);
      return reply({ received: true, ignored: true, status: order.status });
    }

    if (order.status === 'pending_payment') {
      const shippingAddressJson = JSON.stringify({
        name: address.name, address1: address.address1, address2: address.address2,
        city: address.city, province: address.province, country: address.country,
        countryCode: address.countryCode, postalCode: address.postalCode, phone: address.phone,
      });
      await env.DB.prepare(
        "UPDATE orders SET status='pending_approval', payment_status='paid', email=?, shipping_address_json=?, updated_at=datetime('now') WHERE id=? AND status='pending_payment' AND payment_reference=?",
      ).bind(email, shippingAddressJson, order.id, session.id).run();
      await env.DB.prepare(
        "INSERT INTO order_events (id, order_id, event_type, from_status, to_status, message, metadata_json) VALUES (?, ?, 'stripe_payment_verified', 'pending_payment', 'pending_approval', 'Stripe signature verified and paid amount reconciled. Waiting for owner approval before CJ fulfilment.', ?)",
      ).bind(
        crypto.randomUUID(), order.id,
        JSON.stringify({ checkoutSessionId: session.id, currency, amountTotal: paidTotal }),
      ).run();
    }

    const notificationExists = await env.DB.prepare(
      "SELECT id FROM order_events WHERE order_id=? AND event_type='stripe_owner_approval_notified' LIMIT 1",
    ).bind(order.id).first<{ id: string }>();

    if (!notificationExists) {
      const approval = await createApprovalToken(order.id, env.DB, 24);
      try {
        await sendOwnerApprovalEmail(env, { ...order, email, status: 'pending_approval' }, approval.token);
      } catch (error) {
        await env.DB.prepare(
          "UPDATE approvals SET used_at=datetime('now') WHERE order_id=? AND used_at IS NULL",
        ).bind(order.id).run();
        console.error('Owner approval notification failed:', error instanceof Error ? error.message : 'Unknown email failure');
        return reply({ error: 'Payment is recorded; order approval notification needs retry.' }, 503);
      }
      await env.DB.prepare(
        "INSERT INTO order_events (id, order_id, event_type, from_status, to_status, message, metadata_json) VALUES (?, ?, 'stripe_owner_approval_notified', 'pending_payment', 'pending_approval', 'Owner approval notification sent; supplier purchasing still requires explicit approval.', ?)",
      ).bind(
        crypto.randomUUID(), order.id,
        JSON.stringify({ recipient: env.OWNER_EMAIL, expiresAt: approval.expiresAt }),
      ).run();
    }

    await recordEvent(env, event, session);
    return reply({ received: true, orderStatus: 'pending_approval' });
  } catch (error) {
    console.error('Stripe webhook processing failed:', error instanceof Error ? error.message : 'Unknown webhook failure');
    return reply({ error: 'Webhook processing failed and should be retried.' }, 503);
  }
}
