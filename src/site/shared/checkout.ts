import type { CartItem } from '../../store/cart';

/**
 * Starts Stripe Checkout. Only cart identifiers/options cross the browser boundary;
 * the Worker reads current prices, verified supplier IDs, variants and stock from D1/CJ.
 */
export async function startCheckout(items: CartItem[], code = '', giftCode = ''): Promise<void> {
  const response = await fetch('/api/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ items: items.map(({ productId, size, quantity }) => ({ productId, size, quantity })), ...(code ? { code } : {}), ...(giftCode ? { giftCode } : {}) }),
  });
  const result = await response.json().catch(() => ({})) as { url?: string; error?: string };
  if (!response.ok) throw new Error(result.error || 'Secure checkout could not be created.');
  if (typeof result.url !== 'string' || !result.url.startsWith('https://checkout.stripe.com/')) {
    throw new Error('The checkout service did not return a valid Stripe Checkout URL.');
  }
  window.location.assign(result.url);
}
