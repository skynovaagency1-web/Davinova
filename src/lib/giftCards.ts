/** Gift card and refer-a-friend terms, shared by the pages (what the customer reads) and the Workers (what is charged). */

export const GIFT_AMOUNTS_CENTS = [2500, 5000, 10000, 20000] as const;

export const REFERRAL = {
  /** The friend's discount on a first order. */
  friendCents: 1500,
  /** Smallest order the friend's discount works on. */
  minimumCents: 6000,
  /** Credit the referrer gets, as a gift card, when the friend's order ships. */
  rewardCents: 1500,
} as const;

export interface GiftCardBalance {
  code: string;
  balanceCents: number;
}

/** How much of a gift card an order uses: all of what is payable except Stripe's 50 cent minimum charge. */
export function giftCardUse(balanceCents: number, payableCents: number): number {
  return Math.max(0, Math.min(balanceCents, payableCents - 50));
}

/** Gift cards start with DVG-; everything else typed in a code box is a discount code. */
export const isGiftCode = (value: string) => /^DVG-/i.test(value.trim());
