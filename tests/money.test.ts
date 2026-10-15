import { describe, expect, it } from 'vitest';
import { calculateDiscount } from '../server/money';

describe('calculateDiscount', () => {
  it('calculates a percentage discount in cents', () => expect(calculateDiscount(10000, 'percent', 15)).toBe(1500));
  it('caps a fixed discount at the subtotal', () => expect(calculateDiscount(500, 'fixed', 1000)).toBe(500));
  it('rejects negative subtotals', () => expect(() => calculateDiscount(-1, 'fixed', 10)).toThrow());
});
