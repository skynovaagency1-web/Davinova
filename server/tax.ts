import { usdToEurCents, EUR_PER_USD } from '../src/lib/currency';
import { isEuDelivery } from '../src/lib/euCountries';

/** Standard VAT rates (%) in the 27 EU countries, checked 2026-11 (Romania moved to 21% on 1 Aug 2025). */
export const EU_VAT_RATES: Record<string, number> = {
  AT: 20, BE: 21, BG: 20, HR: 25, CY: 19, CZ: 21, DK: 25, EE: 24, FI: 25.5, FR: 20, DE: 19, GR: 24, HU: 27, IE: 23,
  IT: 22, LV: 21, LT: 21, LU: 17, MT: 18, NL: 21, PL: 23, PT: 23, RO: 21, SK: 23, SI: 22, ES: 21, SE: 25,
};

/** IOSS covers consignments whose goods are worth €150 or less (excluding VAT and shipping). */
export const IOSS_LIMIT_EUR_CENTS = 15000;

export const NOTICE_EU_OVER_150 = 'Orders above €150 are shipped DDU (Delivered Duty Unpaid). Local import VAT and customs duties will be collected by the carrier upon delivery.';
export const NOTICE_NON_EU = 'International orders outside the EU are shipped DDU (Delivered Duty Unpaid). Prices exclude local import taxes, GST/VAT, or customs duties, which may apply upon delivery.';

export type TaxCase = 'A' | 'B' | 'C';

export interface TaxLineInput { usdCents: number; quantity: number }

export interface TaxQuote {
  taxCase: TaxCase;
  country: string;
  currency: 'EUR' | 'USD';
  iossEligible: boolean;
  /** Decimal, e.g. 0.2 (0 when no EU VAT is collected). */
  vatRate: number;
  /** Unit price charged per line, in the charge currency. Case A includes VAT; case B is the price without VAT. */
  unitCents: number[];
  discountCents: number;
  shippingCents: number;
  /** VAT included in what the customer pays (case A only). */
  vatCents: number;
  /** Shown in checkout; the IOSS number is never part of it. */
  notice: string;
}

const withoutVat = (cents: number, rate: number) => Math.round(cents / (1 + rate));

/**
 * Case A: EU, goods ≤ €150 → charged in EUR, VAT of the delivery country included in the shown price, IOSS.
 * Case B: EU, goods > €150 → charged in EUR without VAT, shipped DDU (VAT and duties paid on delivery).
 * Case C: outside the EU → charged in USD, no VAT, shipped DDU.
 * Discounts are in USD (as computed by the offers code) and converted like prices.
 */
export function quoteTax(country: string, lines: TaxLineInput[], discountUsdCents: number, shippingUsdCents: number): TaxQuote {
  const code = country.toUpperCase();
  const ratePercent = EU_VAT_RATES[code];
  if (!isEuDelivery(code) || ratePercent === undefined) {
    return {
      taxCase: 'C', country: code, currency: 'USD', iossEligible: false, vatRate: 0,
      unitCents: lines.map((line) => line.usdCents), discountCents: discountUsdCents, shippingCents: shippingUsdCents,
      vatCents: 0, notice: NOTICE_NON_EU,
    };
  }
  const rate = ratePercent / 100;
  const grossUnits = lines.map((line) => usdToEurCents(line.usdCents));
  const grossDiscount = Math.round(discountUsdCents * EUR_PER_USD);
  const grossShipping = Math.round(shippingUsdCents * EUR_PER_USD);
  const grossGoods = grossUnits.reduce((sum, unit, index) => sum + unit * lines[index].quantity, 0) - grossDiscount;
  const netGoods = withoutVat(grossGoods, rate);
  if (netGoods <= IOSS_LIMIT_EUR_CENTS) {
    const gross = grossGoods + grossShipping;
    return {
      taxCase: 'A', country: code, currency: 'EUR', iossEligible: true, vatRate: rate,
      unitCents: grossUnits, discountCents: grossDiscount, shippingCents: grossShipping,
      vatCents: gross - withoutVat(gross, rate),
      notice: `Prices include ${code} VAT (${ratePercent}%), collected under the EU IOSS scheme. Nothing more to pay on delivery.`,
    };
  }
  return {
    taxCase: 'B', country: code, currency: 'EUR', iossEligible: false, vatRate: 0,
    unitCents: grossUnits.map((unit) => withoutVat(unit, rate)), discountCents: withoutVat(grossDiscount, rate),
    shippingCents: withoutVat(grossShipping, rate), vatCents: 0, notice: NOTICE_EU_OVER_150,
  };
}

export interface ComplianceInput {
  currency: string; country: string; iossEligible: boolean; vatRate: number;
  subtotalCents: number; discountCents: number; giftCardCents: number; shippingCents: number;
  /** EUR for one unit of the order currency (1 for EUR orders). */
  eurRate: number;
}

export interface ComplianceFields {
  shipping_country: string; currency: string; eur_exchange_rate: number;
  net_subtotal_eur: number; shipping_fee_eur: number; eu_vat_rate_applied: number;
  eu_vat_collected_eur: number; total_paid_eur: number; ioss_eligible: 0 | 1;
}

const eur = (cents: number, rate: number) => Math.round(cents * rate) / 100;

/**
 * The French tax / URSSAF record for a paid order. A gift card is a way of paying, not a discount, so its part still
 * counts as goods sold; only real discounts (bundles, codes) lower the goods value. IOSS VAT is split out of the
 * VAT-inclusive amounts so that net + shipping + VAT = what the customer paid.
 */
export function complianceFields(input: ComplianceInput): ComplianceFields {
  const realDiscount = Math.max(0, input.discountCents - input.giftCardCents);
  const goodsGross = input.subtotalCents - realDiscount;
  const rate = input.iossEligible ? input.vatRate : 0;
  const goodsVat = rate ? goodsGross - withoutVat(goodsGross, rate) : 0;
  const shippingVat = rate ? input.shippingCents - withoutVat(input.shippingCents, rate) : 0;
  const net = eur(goodsGross - goodsVat, input.eurRate);
  const shipping = eur(input.shippingCents - shippingVat, input.eurRate);
  const vat = eur(goodsVat + shippingVat, input.eurRate);
  return {
    shipping_country: input.country.toUpperCase(), currency: input.currency.toUpperCase(),
    eur_exchange_rate: input.eurRate, net_subtotal_eur: net, shipping_fee_eur: shipping,
    eu_vat_rate_applied: rate, eu_vat_collected_eur: vat,
    total_paid_eur: Math.round((net + shipping + vat) * 100) / 100, ioss_eligible: input.iossEligible ? 1 : 0,
  };
}
