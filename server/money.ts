export function calculateDiscount(subtotalCents: number, type: 'percent' | 'fixed', value: number): number {
  if (!Number.isSafeInteger(subtotalCents) || subtotalCents < 0) throw new Error('Invalid subtotal');
  if (!Number.isSafeInteger(value) || value < 0) throw new Error('Invalid discount value');
  const raw = type === 'percent' ? Math.floor((subtotalCents * value) / 100) : value;
  return Math.min(subtotalCents, raw);
}
