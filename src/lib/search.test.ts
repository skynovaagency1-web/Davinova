import { describe, expect, it } from 'vitest';
import { searchProducts } from './search';
import type { Product } from '../types/product';

const item = (id: string, title: string, department: 'women' | 'men' = 'women', extra: Partial<Product> = {}) => ({
  id, slug: id, title, department, tags: [], color: '', images: [{ url: 'https://x/a.jpg', alt: '' }], supplierVerified: true, ...extra,
}) as unknown as Product;

const products = [
  item('a', 'Satin Wedding Guest Dress'),
  item('b', 'Sequin Evening Gown'),
  item('c', 'Leather Handbag'),
  item('d', 'Slim Fit Wedding Suit', 'men'),
  item('e', 'Pleated Midi Dress', 'women', { storeSubcategoryLabel: 'Wedding guest' }),
];

describe('searchProducts', () => {
  it('needs every word and keeps to the department', () => {
    expect(searchProducts(products, 'wedding', 'women').map((p) => p.id)).toEqual(['a', 'e']);
    expect(searchProducts(products, 'wedding suit', 'men').map((p) => p.id)).toEqual(['d']);
  });
  it('maps shopper words and plurals', () => {
    expect(searchProducts(products, 'purses', 'women').map((p) => p.id)).toEqual(['c']);
    expect(searchProducts(products, 'gowns', 'women').map((p) => p.id).sort()).toEqual(['a', 'b', 'e']);
  });
  it('returns nothing for an empty query', () => {
    expect(searchProducts(products, '  ', 'women')).toEqual([]);
  });
});
