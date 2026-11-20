/**
 * Shown currency. Shop prices are stored and charged in US dollars; visitors in the euro area see them in euros.
 * Prices are converted at a fixed rate and rounded up to end in ,99 so they read like real euro prices.
 * Update EUR_PER_USD when the rate moves a lot (checked 2026-11).
 */
export const EUR_PER_USD = 0.87;

const EUROZONE = new Set('AT BE HR CY EE FI FR DE GR IE IT LV LT LU MT NL PT SK SI ES MC AD SM VA'.split(' '));

type Win = Window & { __DV_CC?: string };

function detect(): 'EUR' | 'USD' {
  if (typeof window === 'undefined') return 'USD';
  const cc = String((window as Win).__DV_CC || '').toUpperCase();
  if (cc && cc !== 'XX') return EUROZONE.has(cc) ? 'EUR' : 'USD';
  if (/^\/fr(\/|$)/.test(window.location.pathname)) return 'EUR';
  let tz = '';
  try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch { /* old browser */ }
  return /^Europe\/(Paris|Berlin|Madrid|Rome|Brussels|Amsterdam|Vienna|Lisbon|Dublin|Helsinki|Athens|Luxembourg|Monaco|Bratislava|Ljubljana|Tallinn|Riga|Vilnius|Zagreb|Malta|Andorra)$/.test(tz) ? 'EUR' : 'USD';
}

export const DISPLAY_CURRENCY: 'EUR' | 'USD' = detect();

/** USD cents → euro cents, rounded up to the next ,99 (whole-dollar amounts like thresholds stay whole euros). */
export function usdToEurCents(usdCents: number): number {
  const eur = usdCents * EUR_PER_USD;
  if (usdCents % 100 === 0 && usdCents >= 1000) return Math.round(eur / 100) * 100;
  return Math.max(99, Math.ceil((eur + 1) / 100) * 100 - 1);
}
