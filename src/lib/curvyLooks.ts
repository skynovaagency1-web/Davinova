import type { Product } from '../types/product';

/**
 * Products shown in the Curvy / Plus size section. Picked by eye: the photo must show a plus-size model,
 * not just a product sold in large sizes (CJ often lists 5XL on a slim model). Add ids here after checking.
 */
const CURVY_LOOKS = new Set([
  'cj-1797983666124107776', // PU leather sling dress
  'cj-2412030108181607100', // pleated African wear dress
  'cj-2502080311141601000', // ruffled short-sleeve dress
]);

export function isCurvyLook(product: Pick<Product, 'id' | 'department'>): boolean {
  return product.department !== 'men' && CURVY_LOOKS.has(product.id);
}
