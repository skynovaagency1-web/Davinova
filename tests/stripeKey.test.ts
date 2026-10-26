import { describe, expect, it } from 'vitest';
import { stripeConfiguration } from '../functions/api/checkout';

const live = { DB: {} as D1Database, STRIPE_MODE: 'live', CJ_LIVE_ORDERS_ENABLED: 'true', CJ_SANDBOX: 'false', DRY_RUN: 'false' };

describe('stripeConfiguration', () => {
  it('accepts standard and restricted live keys in live mode', () => {
    expect(stripeConfiguration({ ...live, STRIPE_SECRET_KEY: 'sk_live_abc' })).toEqual({ mode: 'live', secret: 'sk_live_abc' });
    expect(stripeConfiguration({ ...live, STRIPE_SECRET_KEY: 'rk_live_abc' })).toEqual({ mode: 'live', secret: 'rk_live_abc' });
  });
  it('refuses a test key in live mode', () => {
    expect(stripeConfiguration({ ...live, STRIPE_SECRET_KEY: 'sk_test_abc' })).toBeInstanceOf(Response);
    expect(stripeConfiguration({ ...live, STRIPE_SECRET_KEY: 'rk_test_abc' })).toBeInstanceOf(Response);
  });
});
