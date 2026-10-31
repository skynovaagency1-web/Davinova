import { describe, expect, it } from 'vitest';
import { cleanSupplierText, imageAlt } from './productText';

describe('supplier text', () => {
  it('keeps the product details and drops supplier notes', () => {
    const raw = 'Elegant satin maxi dress with a wrap front. Please allow 1-3cm differences due to manual measurement. Due to the different display and different light, the picture may not reflect the actual color of the item. Packing list: Dress*1';
    expect(cleanSupplierText(raw)).toBe('Elegant satin maxi dress with a wrap front.');
  });
  it('turns the Asian size warning into sizing advice', () => {
    expect(cleanSupplierText('Soft chiffon. Note: Asian sizes are 1 to 2 sizes smaller than European and American people.'))
      .toBe('Soft chiffon. Runs small: we suggest one size up. See the size guide for exact measurements.');
  });
  it('removes supplier image tags', () => expect(cleanSupplierText('Lined bodice.<img src="x.jpg">')).toBe('Lined bodice.'));
  it('rewrites the old CJ photo text', () => {
    expect(imageAlt('CJ catalogue image for Red satin dress; commercial use rights not verified', 'x')).toBe('Red satin dress | Davinova');
    expect(imageAlt('', 'Red satin dress')).toBe('Red satin dress');
  });
});
