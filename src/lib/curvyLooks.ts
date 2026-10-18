import type { Product } from '../types/product';

/**
 * Products shown in the Curvy / Plus size section. Picked by eye: the photo must show a plus-size model,
 * not just a product sold in large sizes (CJ often lists 5XL on a slim model). Add ids here after checking.
 */
const CURVY_LOOKS = new Set([
  'cj-1797983666124107776', // PU leather sling dress
  'cj-2412030108181607100', // pleated African wear dress
  'cj-2502080311141601000', // ruffled short-sleeve dress
  'cj-2505240606271600600',
  'cj-2411010717141629800',
  'cj-2406280810221615700',
  'cj-2412130201431606600',
  'cj-2509161023171621600',
  'cj-2099377429520023554',
  'cj-2412040550021610600',
  'cj-2410050826161609000',
  'cj-2100125782113890306',
]);

export function isCurvyLook(product: Pick<Product, 'id' | 'department'>): boolean {
  return product.department !== 'men' && CURVY_LOOKS.has(product.id);
}
