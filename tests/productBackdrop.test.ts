import { describe, expect, it } from 'vitest';
import { productBackdropFor } from '../src/lib/productBackdrop';

describe('productBackdropFor', () => {
  it('uses a sage family for green dresses', () => {
    expect(productBackdropFor('Emerald')).toContain('#e3eddd');
  });

  it('uses a champagne family for a white lace dress with unverified colour', () => {
    expect(productBackdropFor('Not verified', 'White Lace Occasion Dress')).toContain('#f1e4d3');
  });

  it('uses a blush family for pink dresses', () => {
    expect(productBackdropFor('Pink')).toContain('#f2dedb');
  });

  it('keeps an elegant neutral fallback for unknown colours', () => {
    expect(productBackdropFor('Not verified', 'Occasion Dress')).toContain('#eee3d9');
  });
});
