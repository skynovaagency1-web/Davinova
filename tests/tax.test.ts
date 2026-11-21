import { describe, expect, it } from 'vitest';
import { complianceFields, EU_VAT_RATES, NOTICE_EU_OVER_150, NOTICE_NON_EU, quoteTax } from '../server/tax';
import { usdToEurCents } from '../src/lib/currency';
import { iossSummary, toReportOrder, urssafSummary } from '../functions/api/admin/tax-reports';

describe('EU VAT rates', () => {
  it('has the 27 EU countries', () => {
    expect(Object.keys(EU_VAT_RATES)).toHaveLength(27);
    expect(EU_VAT_RATES.FR).toBe(20);
    expect(EU_VAT_RATES.RO).toBe(21);
  });
});

describe('quoteTax', () => {
  it('case A: EU up to €150 is charged in EUR with VAT included', () => {
    const quote = quoteTax('FR', [{ usdCents: 8999, quantity: 1 }], 0, 0);
    expect(quote).toMatchObject({ taxCase: 'A', currency: 'EUR', iossEligible: true, vatRate: 0.2 });
    expect(quote.unitCents[0]).toBe(usdToEurCents(8999));
    const gross = quote.unitCents[0];
    expect(quote.vatCents).toBe(gross - Math.round(gross / 1.2));
    expect(quote.notice).not.toMatch(/IM\d/);
  });
  it('case B: EU above €150 is charged without VAT and shipped DDU', () => {
    const quote = quoteTax('DE', [{ usdCents: 12999, quantity: 2 }], 0, 0);
    expect(quote).toMatchObject({ taxCase: 'B', currency: 'EUR', iossEligible: false, vatRate: 0, vatCents: 0, notice: NOTICE_EU_OVER_150 });
    expect(quote.unitCents[0]).toBe(Math.round(usdToEurCents(12999) / 1.19));
  });
  it('the €150 limit is on goods without VAT, after discounts', () => {
    // €169.99 incl. 20% VAT = €141.66 net: still IOSS.
    const lines = [{ usdCents: 19499, quantity: 1 }];
    expect(usdToEurCents(19499)).toBeGreaterThan(15000);
    expect(quoteTax('FR', lines, 0, 0).taxCase).toBe('A');
  });
  it('case C: outside the EU is charged in USD with no VAT', () => {
    const quote = quoteTax('US', [{ usdCents: 8999, quantity: 1 }], 500, 0);
    expect(quote).toMatchObject({ taxCase: 'C', currency: 'USD', iossEligible: false, vatRate: 0, vatCents: 0, notice: NOTICE_NON_EU, discountCents: 500 });
    expect(quote.unitCents).toEqual([8999]);
  });
});

describe('complianceFields', () => {
  it('splits IOSS VAT out so net + shipping + VAT = paid', () => {
    const fields = complianceFields({ currency: 'EUR', country: 'FR', iossEligible: true, vatRate: 0.2, subtotalCents: 12000, discountCents: 0, giftCardCents: 0, shippingCents: 0, eurRate: 1 });
    expect(fields).toMatchObject({ net_subtotal_eur: 100, eu_vat_collected_eur: 20, total_paid_eur: 120, ioss_eligible: 1, eu_vat_rate_applied: 0.2 });
  });
  it('converts USD orders at the given rate and keeps gift-card money as turnover', () => {
    const fields = complianceFields({ currency: 'USD', country: 'US', iossEligible: false, vatRate: 0, subtotalCents: 10000, discountCents: 3000, giftCardCents: 2000, shippingCents: 0, eurRate: 0.9 });
    expect(fields).toMatchObject({ net_subtotal_eur: 81, eu_vat_collected_eur: 0, total_paid_eur: 81, ioss_eligible: 0, currency: 'USD' });
  });
});

describe('tax reports', () => {
  const base = {
    created_at: '2026-12-03 10:00:00', paid_at: '2026-12-03 10:01:00', status: 'pending_approval', subtotal_cents: 0, shipping_cents: 0, discount_cents: 0,
    total_cents: 0, shipping_address_json: '{}', tracking_number: null, eur_exchange_rate: 1, shipping_fee_eur: 0, gift_cents: null,
  };
  const orders = [
    toReportOrder({ ...base, order_number: 'A', currency: 'EUR', shipping_country: 'FR', net_subtotal_eur: 100, eu_vat_rate_applied: 0.2, eu_vat_collected_eur: 20, total_paid_eur: 120, ioss_eligible: 1 }),
    toReportOrder({ ...base, order_number: 'B', currency: 'EUR', shipping_country: 'FR', net_subtotal_eur: 50, eu_vat_rate_applied: 0.2, eu_vat_collected_eur: 10, total_paid_eur: 60, ioss_eligible: 1 }),
    toReportOrder({ ...base, order_number: 'C', currency: 'EUR', shipping_country: 'DE', net_subtotal_eur: 200, eu_vat_rate_applied: 0, eu_vat_collected_eur: 0, total_paid_eur: 200, ioss_eligible: 0 }),
    toReportOrder({ ...base, order_number: 'D', currency: 'USD', shipping_country: 'US', net_subtotal_eur: 80, eu_vat_rate_applied: 0, eu_vat_collected_eur: 0, total_paid_eur: 80, ioss_eligible: 0, eur_exchange_rate: 0.86 }),
  ];
  it('groups IOSS sales by country', () => {
    expect(iossSummary(orders)).toEqual([{ country: 'FR', rate: 0.2, base: 150, vat: 30, orders: 2 }]);
  });
  it('splits URSSAF turnover without VAT into EU and outside EU', () => {
    expect(urssafSummary(orders)).toEqual({ eu: 350, nonEu: 80, total: 430, euOrders: 3, nonEuOrders: 1 });
  });
  it('estimates old orders paid before tax records', () => {
    const old = toReportOrder({ ...base, order_number: 'E', currency: 'USD', subtotal_cents: 10000, shipping_country: null, shipping_address_json: '{"countryCode":"us"}',
      net_subtotal_eur: null, eu_vat_rate_applied: null, eu_vat_collected_eur: null, total_paid_eur: null, ioss_eligible: null, eur_exchange_rate: null, shipping_fee_eur: null });
    expect(old).toMatchObject({ country: 'US', estimated: true, net: 87 });
  });
});
