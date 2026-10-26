import { describe, expect, it } from 'vitest';
import { deliveryWindow } from './delivery';

describe('deliveryWindow', () => {
  it('counts business days only', () => {
    // Monday 2026-10-26: +8 business days = Thursday Nov 5, +18 = Thursday Nov 19.
    const [first, last] = deliveryWindow(new Date(2026, 9, 26));
    expect([first.getMonth(), first.getDate()]).toEqual([10, 5]);
    expect([last.getMonth(), last.getDate()]).toEqual([10, 19]);
  });
});
