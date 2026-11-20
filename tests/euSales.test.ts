import { describe, expect, it } from 'vitest';
import { buildCJCreateOrderPayload, type CJOrderInput } from '../server/cj';
import { euSalesOpen, servedCountries } from '../server/shippingCountries';

const order = (countryCode: string): CJOrderInput => ({
  orderNumber: 'DV-EU-1',
  shipping: { name: 'Test', address1: '1 Rue Test', city: 'Paris', province: 'Paris', country: 'France', countryCode, postalCode: '75001', email: 'a@example.com' },
  products: [{ orderItemId: 'l1', cjProductId: 'p1', cjVariantId: 'v1', quantity: 1, variantOptions: '', storeProductId: 's1', storeProductImg: '', storeProductName: 'Dress' }],
});

describe('EU switch', () => {
  it('stays off without a valid IOSS number', () => {
    expect(euSalesOpen({ EU_SALES_OPEN: 'true' })).toBe(false);
    expect(euSalesOpen({ EU_SALES_OPEN: 'true', IOSS_NUMBER: 'IM123' })).toBe(false);
    expect(euSalesOpen({ IOSS_NUMBER: 'IM2500000001' })).toBe(false);
    expect(euSalesOpen({ EU_SALES_OPEN: 'true', IOSS_NUMBER: 'im2500000001' })).toBe(true);
  });
  it('keeps checkout to the configured countries while off, even if an EU code was listed', () => {
    expect(servedCountries({ STRIPE_SHIPPING_COUNTRIES: 'US,CA,FR' })).toEqual(['US', 'CA']);
  });
  it('adds the 27 EU countries once open', () => {
    const list = servedCountries({ STRIPE_SHIPPING_COUNTRIES: 'US,CA', EU_SALES_OPEN: 'true', IOSS_NUMBER: 'IM2500000001' });
    expect(list.slice(0, 2)).toEqual(['US', 'CA']);
    expect(list).toContain('FR');
    expect(list).toHaveLength(29);
  });
  it('declares EU parcels under our IOSS, never US ones', () => {
    expect(buildCJCreateOrderPayload(order('FR'), 'line', true, 'CN', 'IM2500000001')).toMatchObject({ iossType: 2, iossNumber: 'IM2500000001' });
    expect(buildCJCreateOrderPayload(order('US'), 'line', true, 'CN', 'IM2500000001')).not.toHaveProperty('iossNumber');
  });
});
