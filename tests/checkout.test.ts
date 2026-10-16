import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';

vi.mock('../server/cj', () => ({ queryCJVariantStock: vi.fn() }));

import { onRequestPost } from '../functions/api/checkout';
import { queryCJVariantStock } from '../server/cj';
import { FakeD1 } from './helpers/fakeD1';

const stockMock = queryCJVariantStock as unknown as Mock;

function baseEnv(db: FakeD1) {
  return {
    DB: db as unknown as D1Database,
    STRIPE_SECRET_KEY: 'sk_test_123',
    STRIPE_MODE: 'test' as const,
    STRIPE_SHIPPING_COUNTRIES: 'FR,US',
    STRIPE_SHIPPING_FEE_CENTS: '500',
    STRIPE_SHIPPING_LABEL: 'Standard delivery',
    SITE_URL: 'https://davinova.com',
  };
}

function seedPurchasableProduct(db: FakeD1, overrides: Record<string, unknown> = {}) {
  db.seedCatalogRow('prod-1', 'M', {
    product_id: 'prod-1', product_title: 'Rosewater Satin Midi', product_slug: 'rosewater-satin-midi',
    price_cents: 8900, cost_cents: 3000, currency: 'USD', supplier: 'cj',
    supplier_verified: 1, product_active: 1, catalog_source: 'cj', cj_product_id: 'cj-prod-1',
    variant_id: 'variant-1', size: 'M', color: 'Blush', sku: 'SKU-1', cj_sku: 'CJ-SKU-1',
    cj_variant_id: 'cj-variant-1', variant_active: 1, available_stock: 10, image_url: null,
    ...overrides,
  });
}

function request(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request('https://davinova.com/api/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}

function stripeSessionResponse(overrides: Record<string, unknown> = {}) {
  return {
    id: 'cs_test_session_1',
    url: 'https://checkout.stripe.com/pay/cs_test_session_1',
    currency: 'usd',
    amount_subtotal: 8900,
    amount_total: 9400,
    total_details: { amount_shipping: 500, amount_tax: 0, amount_discount: 0 },
    ...overrides,
  };
}

function mockFetch(sessionOverrides: Record<string, unknown> = {}) {
  const calls: Array<{ url: string; body?: string }> = [];
  const fn = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, body: init?.body as string | undefined });
    if (url === 'https://api.stripe.com/v1/checkout/sessions') {
      return new Response(JSON.stringify(stripeSessionResponse(sessionOverrides)), { status: 200 });
    }
    if (url.includes('/checkout/sessions/') && url.endsWith('/expire')) {
      return new Response(JSON.stringify({ id: 'cs_test_session_1' }), { status: 200 });
    }
    throw new Error('Unexpected fetch call in test: ' + url);
  });
  vi.stubGlobal('fetch', fn);
  return { fn, calls };
}

describe('POST /api/checkout', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    stockMock.mockReset();
  });

  it('creates a Stripe session from server-side prices when totals reconcile', async () => {
    const db = new FakeD1();
    seedPurchasableProduct(db);
    stockMock.mockResolvedValue([{ totalInventoryNum: 10 }]);
    const { calls } = mockFetch();

    const response = await onRequestPost({
      request: request({ items: [{ productId: 'prod-1', size: 'M', quantity: 1 }] }),
      env: baseEnv(db),
    });

    expect(response.status).toBe(200);
    const body = await response.json() as { url?: string; sessionId?: string; orderNumber?: string };
    expect(body.url).toBe('https://checkout.stripe.com/pay/cs_test_session_1');
    expect(body.sessionId).toBe('cs_test_session_1');

    const order = [...db.orders.values()][0];
    expect(order.payment_reference).toBe('cs_test_session_1');
    expect(order.subtotal_cents).toBe(8900);
    expect(order.shipping_cents).toBe(500);
    expect(order.total_cents).toBe(9400);
    expect(order.status).toBe('pending_payment');

    const sessionCall = calls.find((call) => call.url === 'https://api.stripe.com/v1/checkout/sessions');
    expect(sessionCall?.body).toContain('line_items%5B0%5D%5Bprice_data%5D%5Bunit_amount%5D=8900');
  });

  it('never trusts a client-supplied price: it only uses the server-stored price_cents', async () => {
    const db = new FakeD1();
    seedPurchasableProduct(db, { price_cents: 8900 });
    stockMock.mockResolvedValue([{ totalInventoryNum: 10 }]);
    const { calls } = mockFetch();

    await onRequestPost({
      request: request({ items: [{ productId: 'prod-1', size: 'M', quantity: 1, priceCents: 1 }] }),
      env: baseEnv(db),
    });

    const sessionCall = calls.find((call) => call.url === 'https://api.stripe.com/v1/checkout/sessions');
    expect(sessionCall?.body).toContain('unit_amount%5D=8900');
    expect(sessionCall?.body).not.toContain('unit_amount%5D=1&');
  });

  it('rejects checkout when stock is insufficient, without creating a Stripe session', async () => {
    const db = new FakeD1();
    seedPurchasableProduct(db);
    stockMock.mockResolvedValue([{ totalInventoryNum: 0 }]);
    const { fn } = mockFetch();

    const response = await onRequestPost({
      request: request({ items: [{ productId: 'prod-1', size: 'M', quantity: 1 }] }),
      env: baseEnv(db),
    });

    expect(response.status).toBe(409);
    expect(fn).not.toHaveBeenCalled();
    expect(db.orders.size).toBe(0);
  });

  it('rejects an unverified product before creating any order', async () => {
    const db = new FakeD1();
    seedPurchasableProduct(db, { supplier_verified: 0 });
    stockMock.mockResolvedValue([{ totalInventoryNum: 10 }]);
    const { fn } = mockFetch();

    const response = await onRequestPost({
      request: request({ items: [{ productId: 'prod-1', size: 'M', quantity: 1 }] }),
      env: baseEnv(db),
    });

    expect(response.status).toBe(409);
    expect(fn).not.toHaveBeenCalled();
    expect(db.orders.size).toBe(0);
  });

  it('rejects a cart mixing products with different currencies', async () => {
    const db = new FakeD1();
    seedPurchasableProduct(db, { currency: 'USD' });
    db.seedCatalogRow('prod-2', 'M', {
      product_id: 'prod-2', product_title: 'Champagne One-Shoulder', product_slug: 'champagne-one-shoulder',
      price_cents: 9900, cost_cents: 3500, currency: 'EUR', supplier: 'cj',
      supplier_verified: 1, product_active: 1, catalog_source: 'cj', cj_product_id: 'cj-prod-2',
      variant_id: 'variant-2', size: 'M', color: 'Champagne', sku: 'SKU-2', cj_sku: 'CJ-SKU-2',
      cj_variant_id: 'cj-variant-2', variant_active: 1, available_stock: 10, image_url: null,
    });
    stockMock.mockResolvedValue([{ totalInventoryNum: 10 }]);
    const { fn } = mockFetch();

    const response = await onRequestPost({
      request: request({ items: [
        { productId: 'prod-1', size: 'M', quantity: 1 },
        { productId: 'prod-2', size: 'M', quantity: 1 },
      ] }),
      env: baseEnv(db),
    });

    expect(response.status).toBe(409);
    expect(fn).not.toHaveBeenCalled();
  });

  it('marks the order cancelled and takes no payment when Stripe session creation fails', async () => {
    const db = new FakeD1();
    seedPurchasableProduct(db);
    stockMock.mockResolvedValue([{ totalInventoryNum: 10 }]);
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: { message: 'down' } }), { status: 500 })));

    const response = await onRequestPost({
      request: request({ items: [{ productId: 'prod-1', size: 'M', quantity: 1 }] }),
      env: baseEnv(db),
    });

    expect(response.status).toBe(502);
    const order = [...db.orders.values()][0];
    expect(order.status).toBe('cancelled');
    expect(order.payment_status).toBe('unpaid');
  });

  it('expires the Stripe session and marks the order needs_attention when totals do not reconcile', async () => {
    const db = new FakeD1();
    seedPurchasableProduct(db);
    stockMock.mockResolvedValue([{ totalInventoryNum: 10 }]);
    const { calls } = mockFetch({ amount_subtotal: 100, amount_total: 600 });

    const response = await onRequestPost({
      request: request({ items: [{ productId: 'prod-1', size: 'M', quantity: 1 }] }),
      env: baseEnv(db),
    });

    expect(response.status).toBe(502);
    const body = await response.json() as { url?: string };
    expect(body.url).toBeUndefined();

    const order = [...db.orders.values()][0];
    expect(order.status).toBe('needs_attention');
    expect(order.payment_reference).toBeUndefined();

    const expireCall = calls.find((call) => call.url.endsWith('/expire'));
    expect(expireCall).toBeDefined();
  });

  it('rejects a mismatched shipping amount even when the subtotal matches', async () => {
    const db = new FakeD1();
    seedPurchasableProduct(db);
    stockMock.mockResolvedValue([{ totalInventoryNum: 10 }]);
    mockFetch({ amount_subtotal: 8900, amount_total: 8900, total_details: { amount_shipping: 0, amount_tax: 0, amount_discount: 0 } });

    const response = await onRequestPost({
      request: request({ items: [{ productId: 'prod-1', size: 'M', quantity: 1 }] }),
      env: baseEnv(db),
    });

    expect(response.status).toBe(502);
    const order = [...db.orders.values()][0];
    expect(order.status).toBe('needs_attention');
  });

  it('rejects cross-origin checkout requests before touching the database', async () => {
    const db = new FakeD1();
    seedPurchasableProduct(db);
    const { fn } = mockFetch();

    const response = await onRequestPost({
      request: request(
        { items: [{ productId: 'prod-1', size: 'M', quantity: 1 }] },
        { Origin: 'https://attacker.example' },
      ),
      env: baseEnv(db),
    });

    expect(response.status).toBe(403);
    expect(fn).not.toHaveBeenCalled();
    expect(db.orders.size).toBe(0);
  });

  it('rejects malformed JSON', async () => {
    const db = new FakeD1();
    const response = await onRequestPost({
      request: new Request('https://davinova.com/api/checkout', { method: 'POST', body: 'not json' }),
      env: baseEnv(db),
    });
    expect(response.status).toBe(400);
  });

  it('rejects an empty cart', async () => {
    const db = new FakeD1();
    const response = await onRequestPost({ request: request({ items: [] }), env: baseEnv(db) });
    expect(response.status).toBe(400);
  });

  it('rejects a cart with more than five distinct lines', async () => {
    const db = new FakeD1();
    const items = Array.from({ length: 6 }, (_, index) => ({ productId: 'prod-' + index, size: 'M', quantity: 1 }));
    const response = await onRequestPost({ request: request({ items }), env: baseEnv(db) });
    expect(response.status).toBe(400);
  });

  it('rejects a duplicate product/size line instead of silently merging it', async () => {
    const db = new FakeD1();
    seedPurchasableProduct(db);
    const response = await onRequestPost({
      request: request({ items: [
        { productId: 'prod-1', size: 'M', quantity: 1 },
        { productId: 'prod-1', size: 'm', quantity: 1 },
      ] }),
      env: baseEnv(db),
    });
    expect(response.status).toBe(400);
  });
});
