import { describe, expect, it } from 'vitest';
import { giftCardUse, isGiftCode } from './giftCards';

describe('gift cards', () => {
  it('uses the whole balance when the order is bigger', () => expect(giftCardUse(5000, 12000)).toBe(5000));
  it('leaves Stripe its 50 cent minimum when the card covers the order', () => expect(giftCardUse(10000, 4000)).toBe(3950));
  it('never goes negative', () => expect(giftCardUse(2500, 30)).toBe(0));
  it('tells gift codes from discount codes', () => {
    expect(isGiftCode('dvg-7kqm-p4xz')).toBe(true);
    expect(isGiftCode('WELCOME10')).toBe(false);
    expect(isGiftCode('FRIEND-AB12-CD34')).toBe(false);
  });
});
