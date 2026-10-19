import { describe, expect, it } from 'vitest';
import { maxTransitDays, pickFastLine } from '../server/cj';

const quotes = [
  { name: 'CJ Packet Liquid', priceUsd: 5, days: '3-5' },
  { name: 'LuWei', priceUsd: 7.23, days: '5-11' },
  { name: 'YunExpress Ordinary', priceUsd: 7.73, days: '4-7' },
  { name: 'CJPacket Fast Ordinary', priceUsd: 9.02, days: '4-6' },
  { name: 'DHL', priceUsd: 30.92, days: '3-7' },
];

describe('fast shipping line', () => {
  it('reads the longest promised day', () => {
    expect(maxTransitDays('4-7')).toBe(7);
    expect(maxTransitDays('')).toBe(Infinity);
  });
  it('picks the cheapest everyday line within 7 days', () => expect(pickFastLine(quotes)?.name).toBe('YunExpress Ordinary'));
  it('falls back to the fastest everyday line', () =>
    expect(pickFastLine([{ name: 'Slow A', priceUsd: 4, days: '12-20' }, { name: 'Slow B', priceUsd: 6, days: '8-12' }])?.name).toBe('Slow B'));
  it('returns null when nothing is usable', () => expect(pickFastLine([{ name: 'DHL', priceUsd: 30, days: '3-5' }])).toBeNull());
});
