import { describe, expect, it } from 'vitest';
import { onRequestGet } from '../functions/api/order-status';
import { FakeD1, type FakeOrder } from './helpers/fakeD1';

const VALID_SESSION = 'cs_test_abc123XYZ';

function request(sessionId: string): Request {
  const url = sessionId
    ? 'https://davinova.com/api/order-status?session_id=' + encodeURIComponent(sessionId)
    : 'https://davinova.com/api/order-status';
  return new Request(url);
}

function order(overrides: Partial<FakeOrder> = {}): FakeOrder {
  return {
    id: 'order-1', order_number: 'DAV-1001', email: 'customer@example.com',
    status: 'pending_payment', payment_provider: 'stripe', payment_status: 'unpaid',
    payment_reference: VALID_SESSION, subtotal_cents: 8900, shipping_cents: 0,
    total_cents: 8900, currency: 'USD',
    ...overrides,
  };
}

describe('GET /api/order-status', () => {
  it('reports paid once the stored order is marked paid', async () => {
    const db = new FakeD1();
    db.seedOrder(order({ status: 'pending_approval', payment_status: 'paid' }));
    const response = await onRequestGet({ request: request(VALID_SESSION), env: { DB: db as unknown as D1Database } });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ state: 'paid', orderNumber: 'DAV-1001' });
  });

  it('reports pending while the order is still awaiting payment', async () => {
    const db = new FakeD1();
    db.seedOrder(order({ status: 'pending_payment', payment_status: 'unpaid' }));
    const response = await onRequestGet({ request: request(VALID_SESSION), env: { DB: db as unknown as D1Database } });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ state: 'pending' });
  });

  it('reports failed once the order is cancelled', async () => {
    const db = new FakeD1();
    db.seedOrder(order({ status: 'cancelled', payment_status: 'unpaid' }));
    const response = await onRequestGet({ request: request(VALID_SESSION), env: { DB: db as unknown as D1Database } });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ state: 'failed' });
  });

  it('rejects a malformed session ID before touching the database', async () => {
    const db = new FakeD1();
    const response = await onRequestGet({ request: request('not-a-real-session'), env: { DB: db as unknown as D1Database } });
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ state: 'unknown' });
  });

  it('rejects a missing session ID', async () => {
    const db = new FakeD1();
    const response = await onRequestGet({ request: request(''), env: { DB: db as unknown as D1Database } });
    expect(response.status).toBe(400);
  });

  it('reports pending for a session ID with no matching order, without revealing it does not exist', async () => {
    const db = new FakeD1();
    const response = await onRequestGet({ request: request('cs_test_unknownSession123'), env: { DB: db as unknown as D1Database } });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ state: 'pending' });
  });

  it('does not match an order from a different payment provider', async () => {
    const db = new FakeD1();
    db.seedOrder(order({ payment_provider: 'paypal', status: 'pending_approval', payment_status: 'paid' }));
    const response = await onRequestGet({ request: request(VALID_SESSION), env: { DB: db as unknown as D1Database } });
    await expect(response.json()).resolves.toEqual({ state: 'pending' });
  });

  it('fails safe to pending when the database is unavailable', async () => {
    const response = await onRequestGet({ request: request(VALID_SESSION), env: {} as { DB?: D1Database } });
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({ state: 'pending' });
  });

  it('fails safe to pending when the database throws', async () => {
    const throwingDb = { prepare: () => { throw new Error('D1 is unavailable'); } };
    const response = await onRequestGet({ request: request(VALID_SESSION), env: { DB: throwingDb as unknown as D1Database } });
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({ state: 'pending' });
  });

  it('never returns raw order fields such as email or totals, only the order number', async () => {
    const db = new FakeD1();
    db.seedOrder(order({ status: 'pending_approval', payment_status: 'paid' }));
    const response = await onRequestGet({ request: request(VALID_SESSION), env: { DB: db as unknown as D1Database } });
    const body = await response.json() as Record<string, unknown>;
    expect(Object.keys(body)).toEqual(['state', 'orderNumber']);
  });
});
