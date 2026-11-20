/** The 27 EU member states (shared by the bag and the server; no secrets here). */
export const EU_DELIVERY_COUNTRIES = [
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT',
  'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE',
] as const;

export function isEuDelivery(code: string): boolean {
  return (EU_DELIVERY_COUNTRIES as readonly string[]).includes(code.toUpperCase());
}
