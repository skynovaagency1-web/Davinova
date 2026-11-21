/**
 * Where we deliver (owner's rules, 2026-11-20) and the EU switch.
 *
 * - Worldwide by default: every destination Stripe Checkout can ship to, minus the blocked list.
 * - Blocked: GB until UK VAT registration; sanctioned countries; countries where parcels are often refused at customs.
 * - The 27 EU countries only open once IOSS is set up: EU_SALES_OPEN=true and IOSS_NUMBER=IM + 10 digits in Cloudflare.
 *   IOSS_NUMBER is server-only: it is sent to CJ for EU parcels and never to the browser, emails or invoices.
 */
import { EU_DELIVERY_COUNTRIES, isEuDelivery } from '../src/lib/euCountries';

export { EU_DELIVERY_COUNTRIES, isEuDelivery };

export const BLOCKED_COUNTRIES: Record<string, string> = {
  GB: 'United Kingdom: paused until UK VAT registration is complete.',
  RU: 'Sanctioned destination.', BY: 'Sanctioned destination.', IR: 'Sanctioned destination.',
  KP: 'Sanctioned destination.', SY: 'Sanctioned destination.', CU: 'Sanctioned destination.',
  BR: 'Parcels are often refused at customs.', IN: 'Parcels are often refused at customs.',
  TR: 'Parcels are often refused at customs.', ID: 'Parcels are often refused at customs.',
};

/** Destinations Stripe Checkout accepts for shipping, minus places with no reliable post (Antarctica, uninhabited islands, conflict zones). */
const STRIPE_SHIPPABLE = (
  'AD AE AG AI AL AM AO AR AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BW BY BZ CA CD CF CG CH CI CK CL CM CN CO CR CV CW CY CZ ' +
  'DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GT GU GW GY HK HN HR HT HU ID IE IL IM IN IQ IS IT ' +
  'JE JM JO JP KE KG KH KI KM KN KR KW KY KZ LA LB LC LI LK LR LS LT LU LV MA MC MD ME MF MG MK ML MM MN MO MQ MR MS MT MU MV MW MX MY MZ NA NC NE NG ' +
  'NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PY QA RE RO RS RU RW SA SB SC SE SG SH SI SJ SK SL SM SN SR ST SV SX SZ TC TD TG TH TJ TK ' +
  'TL TM TN TO TR TT TV TW TZ UA UG US UY UZ VA VC VE VG VN VU WF WS XK YT ZA ZM ZW'
).split(' ');

export interface EuEnv { EU_SALES_OPEN?: string; IOSS_NUMBER?: string }

/** A valid IOSS number looks like IM + 10 digits. Server-side only. */
export function iossNumber(env: EuEnv): string {
  const value = (env.IOSS_NUMBER || '').trim().toUpperCase();
  return /^IM\d{10}$/.test(value) ? value : '';
}

/** The EU switch: on only when the owner turned it on AND a valid IOSS number is set. */
export function euSalesOpen(env: EuEnv): boolean {
  return env.EU_SALES_OPEN === 'true' && Boolean(iossNumber(env));
}


export function isBlocked(code: string): boolean {
  return Object.hasOwn(BLOCKED_COUNTRIES, code.toUpperCase());
}

/** Every country checkout offers right now. */
export function servedCountries(env: EuEnv): string[] {
  const open = euSalesOpen(env);
  return STRIPE_SHIPPABLE.filter((code) => !isBlocked(code) && (open || !isEuDelivery(code)));
}

/** Why a destination can't be used, or '' when it can. Used to reject at the checkout API. */
export function destinationProblem(env: EuEnv, code: string): string {
  const country = code.toUpperCase();
  if (!/^[A-Z]{2}$/.test(country)) return 'Choose the country we deliver to.';
  if (isBlocked(country)) return 'We don’t deliver to this country at the moment.';
  if (isEuDelivery(country) && !euSalesOpen(env)) return 'Delivery to the EU opens soon.';
  if (!STRIPE_SHIPPABLE.includes(country)) return 'We don’t deliver to this country at the moment.';
  return '';
}
