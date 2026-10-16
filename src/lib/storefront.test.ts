import { describe, expect, it } from 'vitest';
import type { Product } from '../types/product';
import { isCurvyProduct } from './storefront';

function product(overrides: Partial<Pick<Product, 'title' | 'description' | 'tags' | 'sizes'>> = {}) {
  return {
    title: 'Elegant occasion dress',
    description: '',
    tags: [],
    sizes: [],
    ...overrides,
  };
}

describe('isCurvyProduct', () => {
  it('recognises plus-size wording in product metadata', () => {
    expect(isCurvyProduct(product({ title: 'Elegant plus-size evening dress' }))).toBe(true);
    expect(isCurvyProduct(product({ tags: ['extended-size', 'occasionwear'] }))).toBe(true);
  });

  it('recognises verified extended sizes', () => {
    expect(isCurvyProduct(product({ sizes: ['XL', '2XL'] }))).toBe(true);
    expect(isCurvyProduct(product({ sizes: ['3XL'] }))).toBe(true);
    expect(isCurvyProduct(product({ sizes: ['5XL'] }))).toBe(true);
    expect(isCurvyProduct(product({ sizes: ['1X'] }))).toBe(true);
    expect(isCurvyProduct(product({ title: 'Evening dress available in 6XL' }))).toBe(true);
  });

  it('does not guess when the available size metadata is unknown or standard-only', () => {
    expect(isCurvyProduct(product())).toBe(false);
    expect(isCurvyProduct(product({ sizes: ['XS', 'S', 'M', 'L', 'XL'] }))).toBe(false);
  });
});
