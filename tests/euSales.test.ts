import { describe, expect, it } from 'vitest';
import { buildCJCreateOrderPayload, type CJOrderInput } from '../server/cj';
import { destinationProblem, euSalesOpen, servedCountries } from '../server/shippingCountries';

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
  it('ships worldwide minus the blocked list, and no EU while off', () => {
    const list = servedCountries({});
    expect(list).toContain('US');
    expect(list).toContain('JP');
    expect(list).toContain('CH');
    for (const code of ['GB', 'RU', 'BY', 'IR', 'KP', 'SY', 'CU', 'BR', 'IN', 'TR', 'ID', 'FR', 'DE']) expect(list).not.toContain(code);
  });
  it('adds the 27 EU countries once open', () => {
    const closed = servedCountries({});
    const open = servedCountries({ EU_SALES_OPEN: 'true', IOSS_NUMBER: 'IM2500000001' });
    expect(open).toContain('FR');
    expect(open.length - closed.length).toBe(27);
  });
  it('rejects blocked and closed destinations at the API', () => {
    expect(destinationProblem({}, 'GB')).toMatch(/don’t deliver/);
    expect(destinationProblem({}, 'RU')).toMatch(/don’t deliver/);
    expect(destinationProblem({}, 'FR')).toMatch(/EU opens soon/);
    expect(destinationProblem({}, '')).toMatch(/Choose/);
    expect(destinationProblem({}, 'US')).toBe('');
    expect(destinationProblem({ EU_SALES_OPEN: 'true', IOSS_NUMBER: 'IM2500000001' }, 'FR')).toBe('');
  });
  it('declares IOSS-eligible EU parcels under our IOSS, bigger EU parcels without, never US ones', () => {
    expect(buildCJCreateOrderPayload({ ...order('FR'), iossEligible: true }, 'line', true, 'CN', 'IM2500000001')).toMatchObject({ iossType: 2, iossNumber: 'IM2500000001' });
    const over150 = buildCJCreateOrderPayload({ ...order('FR'), iossEligible: false }, 'line', true, 'CN', 'IM2500000001');
    expect(over150).toMatchObject({ iossType: 1 });
    expect(over150).not.toHaveProperty('iossNumber');
    expect(buildCJCreateOrderPayload(order('US'), 'line', true, 'CN', 'IM2500000001')).not.toHaveProperty('iossNumber');
  });
});
