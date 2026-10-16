import { afterEach, describe, expect, it, vi } from 'vitest';
import { onRequestPost } from '../functions/api/webhooks/stripe';
import { FakeD1 } from './helpers/fakeD1';

async function signPayload(payload: Uint8Array, secret: string, timestamp: number): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const prefix = new TextEncoder().encode(timestamp + '.');
  const signed = new Uint8Array(prefix.length + payload.length);
  signed.set(prefix);
  signed.set(payload, prefix.length);
  const digest = new Uint8Array(await crypto.subtle.sign('HMAC', key, signed));
  const hex = Array.from(digest, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return 't=' + timestamp + ',v1=' + hex;
}

function baseEnv(db: FakeD1) {
  return {
    DB: db as unknown as D1Database,
    STRIPE_SECRET_KEY: 'sk_test_x',
    STRIPE_WEBHOOK_SECRET: 'whsec_test_secret_for_unit_tests_only',
    STRIPE_MODE: 'test',
    STRIPE_SHIPPING_COUNTRIES: 'FR',
    RESEND_API_KEY: 're_test',
    EMAIL_FROM: 'orders@davinova.com',
    OWNER_EMAIL: 'owner@davinova.com',
    SITE_URL: 'https://davinova.com',
  };
}

const ORDER_ID = 'order-1';
const SESSION_ID = 'cs_test_session_1';

function sessionObject() {
  return {
    id: SESSION_ID,
    mode: 'payment',
    status: 'complete',
    payment_status: 'paid',
    livemode: false,
    metadata: { order_id: ORDER_ID, order_number: 'DAV-1001' },
    customer_details: {
      email: 'customer@example.com',
      name: 'Jane Doe',
      address: { line1: '1 Rue de Paris', city: 'Paris', postal_code: '75001', country: 'FR' },
    },
    currency: 'usd',
    amount_total: 8900,
    amount_subtotal: 8900,
    total_details: { amount_shipping: 0, amount_tax: 0, amount_discount: 0 },
  };
}

async function buildRequest(eventId: string, eventType: string, secret: string) {
  const event = { id: eventId, type: eventType, livemode: false, data: { object: sessionObject() } };
  const body = new TextEncoder().encode(JSON.stringify(event));
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = await signPayload(body, secret, timestamp);
  return new Request('https://davinova.com/api/webhooks/stripe', {
    method: 'POST',
    headers: { 'Stripe-Signature': signature },
    body,
  });
}

function seedPaidOrder(db: FakeD1) {
  db.seedOrder({
    id: ORDER_ID,
    order_number: 'DAV-1001',
    email: 'pending@example.com',
    status: 'pending_payment',
    payment_provider: 'stripe',
    payment_status: 'unpaid',
    payment_reference: SESSION_ID,
    subtotal_cents: 8900,
    shipping_cents: 0,
    total_cents: 8900,
    currency: 'USD',
  });
}

describe('Stripe webhook event claim lifecycle', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('rejects a second delivery while an earlier claim on the same event is still fresh (busy)', async () => {
    const db = new FakeD1();
    seedPaidOrder(db);
    const env = baseEnv(db);
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 200 })));

    db.webhookEvents.set('evt_busy', {
      id: 'evt_busy', provider: 'stripe', event_type: 'processing',
      processed_at: new Date().toISOString(), payload_json: '{"claimToken":"someone-else"}',
    });

    const request = await buildRequest('evt_busy', 'checkout.session.completed', env.STRIPE_WEBHOOK_SECRET);
    const response = await onRequestPost({ request, env });

    expect(response.status).toBe(503);
    const order = db.orders.get(ORDER_ID)!;
    expect(order.status).toBe('pending_payment');
  });

  it('lets a retried delivery reclaim and process an event whose earlier claim expired (crashed invocation)', async () => {
    const db = new FakeD1();
    seedPaidOrder(db);
    const env = baseEnv(db);
    let emailCalls = 0;
    vi.stubGlobal('fetch', vi.fn(async () => {
      emailCalls++;
      return new Response('{}', { status: 200 });
    }));

    const staleProcessedAt = new Date(Date.now() - 6 * 60 * 1000).toISOString();
    db.webhookEvents.set('evt_stale_claim', {
      id: 'evt_stale_claim', provider: 'stripe', event_type: 'processing',
      processed_at: staleProcessedAt, payload_json: '{"claimToken":"crashed-invocation"}',
    });

    const request = await buildRequest('evt_stale_claim', 'checkout.session.completed', env.STRIPE_WEBHOOK_SECRET);
    const response = await onRequestPost({ request, env });

    expect(response.status).toBe(200);
    const order = db.orders.get(ORDER_ID)!;
    expect(order.status).toBe('pending_approval');
    expect(emailCalls).toBe(1);

    const claim = db.webhookEvents.get('evt_stale_claim')!;
    expect(claim.event_type).toBe('checkout.session.completed');
  });

  it('does not reprocess an event ID that was already fully recorded (duplicate delivery)', async () => {
    const db = new FakeD1();
    seedPaidOrder(db);
    const env = baseEnv(db);
    const fetchMock = vi.fn(async () => new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    db.webhookEvents.set('evt_already_done', {
      id: 'evt_already_done', provider: 'stripe', event_type: 'checkout.session.completed',
      processed_at: new Date().toISOString(),
      payload_json: JSON.stringify({ checkoutSessionId: SESSION_ID, orderId: ORDER_ID, paymentStatus: 'paid' }),
    });

    const request = await buildRequest('evt_already_done', 'checkout.session.completed', env.STRIPE_WEBHOOK_SECRET);
    const response = await onRequestPost({ request, env });

    expect(response.status).toBe(200);
    const body = await response.json() as { received?: boolean; duplicate?: boolean };
    expect(body).toEqual({ received: true, duplicate: true });

    expect(fetchMock).not.toHaveBeenCalled();
    const order = db.orders.get(ORDER_ID)!;
    expect(order.status).toBe('pending_payment');
    expect(db.orderEvents).toHaveLength(0);
  });
});
