/**
 * Shop offers shared by the bag (what the customer sees) and the checkout Worker (what Stripe charges).
 * Bundle and code discounts never stack: the customer gets whichever saves more.
 */

export const BUNDLE_TIERS = [
  { minItems: 3, percent: 15 },
  { minItems: 2, percent: 10 },
] as const;

/** Orders at or above this subtotal (after discounts) get the free gift, shipped with the order by CJ. */
export const FREE_GIFT = {
  thresholdCents: 15000,
  productId: 'cj-2087457117384761345',
  size: 'One size',
  title: 'Pearl earrings',
} as const;

export interface DiscountCode {
  code: string;
  type: 'percent' | 'fixed';
  value: number;
  minimumSubtotalCents: number;
}

export interface Offer {
  discountCents: number;
  label: string;
  source: 'none' | 'bundle' | 'code';
  /** Set when a code was entered but the bundle (or nothing) wins. */
  codeNote?: string;
  giftEligible: boolean;
  /** Cents still needed for the free gift; 0 once eligible. */
  giftRemainingCents: number;
}

export function bundlePercent(itemCount: number): number {
  return BUNDLE_TIERS.find((tier) => itemCount >= tier.minItems)?.percent ?? 0;
}

export function codeDiscount(subtotalCents: number, code: DiscountCode): number {
  if (subtotalCents < code.minimumSubtotalCents) return 0;
  const raw = code.type === 'percent' ? Math.floor((subtotalCents * Math.min(code.value, 90)) / 100) : code.value;
  return Math.max(0, Math.min(subtotalCents - 50, raw));
}

export function computeOffer(subtotalCents: number, itemCount: number, code?: DiscountCode | null): Offer {
  const percent = bundlePercent(itemCount);
  const bundle = Math.floor((subtotalCents * percent) / 100);
  const fromCode = code ? codeDiscount(subtotalCents, code) : 0;
  let offer: Pick<Offer, 'discountCents' | 'label' | 'source' | 'codeNote'>;
  if (fromCode > bundle) offer = { discountCents: fromCode, label: `Code ${code!.code.toUpperCase()}`, source: 'code' };
  else if (bundle > 0) {
    offer = { discountCents: bundle, label: `Bundle: ${itemCount} pieces, ${percent}% off`, source: 'bundle' };
    if (code) offer.codeNote = fromCode ? 'Your bundle saves more than the code, so we kept the bundle.' : `Code ${code.code.toUpperCase()} needs a bigger order.`;
  } else {
    offer = { discountCents: 0, label: '', source: 'none' };
    if (code) offer.codeNote = `Code ${code.code.toUpperCase()} needs a bigger order.`;
  }
  const after = subtotalCents - offer.discountCents;
  return { ...offer, giftEligible: after >= FREE_GIFT.thresholdCents, giftRemainingCents: Math.max(0, FREE_GIFT.thresholdCents - after) };
}
