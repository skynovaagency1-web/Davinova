import { describe, expect, it } from 'vitest';
import { isOffNiche } from './niche';
import { usdToEurCents } from './currency';

describe('isOffNiche', () => {
  it('hides gadgets and hair tools', () => {
    expect(isOffNiche('KP-855 Wireless Bluetooth Speaker Makeup Mirror', 'beauty-tools', 'mirrors')).toBe(true);
    expect(isOffNiche('Wireless Hair Straightener')).toBe(true);
    expect(isOffNiche('Nail Lamp', 'nail-art-and-tools', 'nail-dryers')).toBe(true);
  });
  it('keeps the niche', () => {
    expect(isOffNiche('Off-Shoulder Satin Midi Party Dress', 'weddings-and-events', 'cocktail-dresses')).toBe(false);
    expect(isOffNiche('Quartz Hour Analog Digital LED Sports Watch', 'jewelry-and-watches', 'mens-watches')).toBe(false);
    expect(isOffNiche('Heavy-Embroidered Shiny Champagne Bottle Rhinestone Evening Bag', 'womens-bags', 'evening-bags')).toBe(false);
  });
});

describe('usdToEurCents', () => {
  it('ends shop prices in ,99', () => {
    expect(usdToEurCents(8699)).toBe(7599);
    expect(usdToEurCents(4899) % 100).toBe(99);
  });
  it('keeps whole amounts whole', () => expect(usdToEurCents(10000)).toBe(8700));
});
