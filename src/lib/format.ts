import { DISPLAY_CURRENCY, usdToEurCents } from './currency';

const PAGE_LOCALE = typeof window !== 'undefined' && /^\/fr(\/|$)/.test(window.location.pathname) ? 'fr-FR'
  : typeof window !== 'undefined' && /^\/es(\/|$)/.test(window.location.pathname) ? 'es-ES' : 'en-IE';

/** Shop price for this visitor: US dollars, or euros for the euro area (see currency.ts). */
export function formatMoney(cents: number, currency = 'USD', locale = 'en-US'): string {
  if (currency.toUpperCase() === 'USD' && DISPLAY_CURRENCY === 'EUR') {
    const negative = cents < 0;
    const out = new Intl.NumberFormat(PAGE_LOCALE, { style: 'currency', currency: 'EUR' }).format(usdToEurCents(Math.abs(cents)) / 100);
    return negative ? `-${out}` : out;
  }
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(cents / 100);
}
/** Always in US dollars (what checkout charges). */
export function formatUsd(cents: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}
