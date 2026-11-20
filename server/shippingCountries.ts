/**
 * Europe opens only once the owner has an IOSS number (owner's choice, 2026-11-18): set EU_SALES_OPEN=true and
 * IOSS_NUMBER=IMxxxxxxxxxx in Cloudflare. Prices then include VAT (we collect and declare it under IOSS), the EU
 * countries join checkout, and CJ orders to the EU carry the IOSS number so customers pay nothing on delivery.
 */
export const EU_DELIVERY_COUNTRIES = [
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT',
  'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE',
] as const;

export const EU_VAT_NOTE = 'EU delivery: prices include VAT. Nothing more to pay when your parcel arrives.';

export interface EuEnv { EU_SALES_OPEN?: string; IOSS_NUMBER?: string }

/** A valid IOSS number looks like IM + 10 digits. */
export function iossNumber(env: EuEnv): string {
  const value = (env.IOSS_NUMBER || '').trim().toUpperCase();
  return /^IM\d{10}$/.test(value) ? value : '';
}

/** The switch: on only when the owner turned it on AND a valid IOSS number is set. */
export function euSalesOpen(env: EuEnv): boolean {
  return env.EU_SALES_OPEN === 'true' && Boolean(iossNumber(env));
}

export function isEuDelivery(code: string): boolean {
  return (EU_DELIVERY_COUNTRIES as readonly string[]).includes(code.toUpperCase());
}

/** STRIPE_SHIPPING_COUNTRIES, plus the EU once it is open. EU codes listed by hand stay out while the switch is off. */
export function servedCountries(env: EuEnv & { STRIPE_SHIPPING_COUNTRIES?: string }): string[] {
  const open = euSalesOpen(env);
  const listed = (env.STRIPE_SHIPPING_COUNTRIES || '').split(',').map((value) => value.trim().toUpperCase())
    .filter(Boolean).filter((code) => open || !isEuDelivery(code));
  if (listed.length === 0) return [];
  return open ? [...new Set([...listed, ...EU_DELIVERY_COUNTRIES])] : [...new Set(listed)];
}
