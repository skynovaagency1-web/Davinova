import { describe, expect, it } from 'vitest';
import { cleanSupplierText, imageAlt, cleanTitle, colourLabel } from './productText';

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

describe('cleanTitle', () => {
  it.each([
    ["Straw Crossbody Bags For Women Beach Crescent Bag Summer Chic Woven Handbag Shoulder Purse Adjustable Strap", 'Straw Crossbody Bag'],
    ["Watch Men's Quartz Watch Stainless Steel Band Men's Watch", 'Quartz Watch'],
    ["Anti-theft Swipe Card Holder Men's Card Holder Wallet", 'Anti-Theft Swipe Card Holder'],
    ['Champagne Dress High Heels Stiletto Crystal Bridesmaid Wedding Shoes', 'Champagne Dress High Heels'],
    ['Men Taupe Shawl Lapel One Button 2 Pieces Suit Blazer & Pants Set', 'Taupe Shawl Lapel Suit Blazer'],
    ['Women Cotton Linen A Line Dress Summer Elegant Round Neck Plus Size Loose Casual Dress', 'Cotton Linen A-Line Dress'],
    ['Automatic skeleton mechanical watch', 'Automatic Skeleton Mechanical Watch'],
    ['925 Sterling Silver 2 Karat Moissanite Necklace For Women', '925 Sterling Silver 2 Karat Moissanite Necklace'],
  ])('%s', (raw, expected) => expect(cleanTitle(raw)).toBe(expected));

  it('leaves short clean names alone', () => expect(cleanTitle('Satin Midi Dress')).toBe('Satin Midi Dress'));
});

describe('colourLabel', () => {
  it.each([['picture color', 'As pictured'], ['A', 'Style A'], ['offwhite', 'Off-white'], ['wine red', 'Wine red'], ['Black', 'Black'], ['caramel color', 'Caramel']])(
    '%s', (raw, expected) => expect(colourLabel(raw)).toBe(expected));
});
