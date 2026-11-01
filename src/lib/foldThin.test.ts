import { describe, expect, it } from 'vitest';
import type { Product } from '../types/product';
import { foldThinSubcategories, MIN_SUBCATEGORY_ITEMS } from './useCatalogProducts';

const item = (id: string, sub: string) => ({ id, department: 'women', storeCollection: 'dresses', storeSubcategory: sub, storeSubcategoryLabel: sub }) as unknown as Product;

describe('foldThinSubcategories', () => {
  it('keeps full sub-categories and folds thin ones into the category', () => {
    const full = Array.from({ length: MIN_SUBCATEGORY_ITEMS }, (_, i) => item(`a${i}`, 'maxi'));
    const out = foldThinSubcategories([...full, item('b', 'mini')]);
    expect(out.filter((p) => p.storeSubcategory === 'maxi')).toHaveLength(MIN_SUBCATEGORY_ITEMS);
    expect(out.find((p) => p.id === 'b')?.storeSubcategory).toBeUndefined();
    expect(out.find((p) => p.id === 'b')?.storeCollection).toBe('dresses');
  });
});
