import { describe, expect, it } from 'vitest';
import { FREE_GIFT, computeOffer } from './offers';

describe('computeOffer', () => {
  it('gives no discount for one piece', () => {
    expect(computeOffer(5000, 1).discountCents).toBe(0);
  });
  it('applies the bundle tiers', () => {
    expect(computeOffer(10000, 2)).toMatchObject({ discountCents: 1000, source: 'bundle' });
    expect(computeOffer(10000, 3)).toMatchObject({ discountCents: 1500, source: 'bundle' });
  });
  it('keeps whichever of bundle or code saves more, never both', () => {
    const code = { code: 'WELCOME10', type: 'percent' as const, value: 10, minimumSubtotalCents: 0 };
    expect(computeOffer(10000, 1, code)).toMatchObject({ discountCents: 1000, source: 'code' });
    expect(computeOffer(10000, 3, code)).toMatchObject({ discountCents: 1500, source: 'bundle' });
  });
  it('respects a code minimum', () => {
    const code = { code: 'BIG20', type: 'fixed' as const, value: 2000, minimumSubtotalCents: 15000 };
    expect(computeOffer(10000, 1, code).discountCents).toBe(0);
    expect(computeOffer(15000, 1, code).discountCents).toBe(2000);
  });
  it('unlocks the free gift on the discounted total', () => {
    expect(computeOffer(FREE_GIFT.thresholdCents, 1).giftEligible).toBe(true);
    const bundled = computeOffer(FREE_GIFT.thresholdCents, 2);
    expect(bundled.giftEligible).toBe(false);
    expect(bundled.giftRemainingCents).toBe(bundled.discountCents);
  });
});
