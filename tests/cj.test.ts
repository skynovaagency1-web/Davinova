import { describe, expect, it } from 'vitest';
import { buildCJCreateOrderPayload, createCJOrder, isCJDryRun, type CJOrderInput } from '../functions/lib/cj';

const sampleOrder: CJOrderInput = {
  orderNumber: 'DVN-TEST-001',
  shipping: { name: 'Test Customer', address1: '123 Test Street', city: 'Austin', province: 'Texas',
    country: 'United States', countryCode: 'US', postalCode: '78701', phone: '555-0100', email: 'customer@example.com' },
  products: [{ orderItemId: 'line-1', cjProductId: 'cj-product-1', cjVariantId: 'cj-variant-1',
    quantity: 1, variantOptions: 'Pink-M', storeProductId: 'candidate-1',
    storeProductImg: 'https://example.com/dress.jpg', storeProductName: 'Test dress' }],
};

describe('CJ supplier adapter safety', () => {
  it('defaults to dry-run when the environment flag is absent', () => expect(isCJDryRun({})).toBe(true));
  it('requires owner approval even for dry-run', async () =>
    await expect(createCJOrder({ DRY_RUN: 'true' } as never, sampleOrder, false)).rejects.toThrow(/Owner approval is required/));
  it('does not call CJ when DRY_RUN is true', async () => {
    const result = await createCJOrder({ DRY_RUN: 'true' } as never, sampleOrder, true);
    expect(result.mode).toBe('dry_run');
    expect(result.cjOrderId).toBeUndefined();
  });
  it('uses CJ variant IDs in the API payload', () => {
    const payload = buildCJCreateOrderPayload(sampleOrder, 'CJPacket test option', true);
    const lines = payload.products as {vid:string;quantity:number;storeLineItemId:string}[];
    expect(lines[0].vid).toBe('cj-variant-1');
    expect(lines[0].storeLineItemId).toBe('line-1');
    expect(payload.isSandbox).toBe(1);
  });
  it('rejects missing CJ product/variant mapping', async () => {
    const invalid: CJOrderInput = {...sampleOrder,products:[{...sampleOrder.products[0],cjVariantId:''}]};
    await expect(createCJOrder({DRY_RUN:'true'} as never,invalid,true)).rejects.toThrow(/mappings are required/);
  });
  it('requires a verified logistics name for API payloads', () =>
    expect(() => buildCJCreateOrderPayload(sampleOrder,'',true)).toThrow(/logistics method/));
});
