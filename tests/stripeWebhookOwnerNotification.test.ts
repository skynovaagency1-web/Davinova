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

describe('Stripe webhook owner-approval notification', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sends exactly one owner-approval email when two different Stripe event IDs report the same paid order concurrently', async () => {
    const db = new FakeD1();
    seedPaidOrder(db);
    const env = baseEnv(db);

    let emailCalls = 0;
    vi.stubGlobal('fetch', vi.fn(async () => {
      emailCalls++;
      return new Response('{}', { status: 200 });
    }));

    const [requestA, requestB] = await Promise.all([
      buildRequest('evt_completed_1', 'checkout.session.completed', env.STRIPE_WEBHOOK_SECRET),
      buildRequest('evt_async_succeeded_1', 'checkout.session.async_payment_succeeded', env.STRIPE_WEBHOOK_SECRET),
    ]);

    const [responseA, responseB] = await Promise.all([
      onRequestPost({ request: requestA, env }),
      onRequestPost({ request: requestB, env }),
    ]);

    expect(responseA.status).toBe(200);
    expect(responseB.status).toBe(200);
    expect(emailCalls).toBe(1);

    const notifications = db.orderEvents.filter((row) => row.event_type === 'stripe_owner_approval_notified');
    expect(notifications).toHaveLength(1);
  });

  it('allows a retry to send the notification after the first attempt fails to deliver', async () => {
    const db = new FakeD1();
    seedPaidOrder(db);
    const env = baseEnv(db);

    const fetchMock = vi.fn(async () => new Response('server error', { status: 500 }));
    vi.stubGlobal('fetch', fetchMock);

    const firstRequest = await buildRequest('evt_completed_2', 'checkout.session.completed', env.STRIPE_WEBHOOK_SECRET);
    const firstResponse = await onRequestPost({ request: firstRequest, env });
    expect(firstResponse.status).toBe(503);
    expect(db.orderEvents.some((row) => row.event_type === 'stripe_owner_approval_notified')).toBe(false);

    fetchMock.mockImplementation(async () => new Response('{}', { status: 200 }));
    const retryRequest = await buildRequest('evt_completed_2_retry', 'checkout.session.completed', env.STRIPE_WEBHOOK_SECRET);
    const retryResponse = await onRequestPost({ request: retryRequest, env });
    expect(retryResponse.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(db.orderEvents.filter((row) => row.event_type === 'stripe_owner_approval_notified')).toHaveLength(1);
  });
});
