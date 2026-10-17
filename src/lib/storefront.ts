import type { Product } from '../types/product';

/**
 * Keep sizing edits separate. A dress belongs to the Curvy store only when its
 * metadata explicitly identifies plus sizing/extended sizes, or its verified
 * size metadata includes common plus-size labels from 1X/1XL through 6X/6XL. Unknown sizing is never guessed.
 *
 * The Curvy fit is a women's-only concept: a men's formalwear item's own "XXL"
 * label (a plain letter size, not a women's curve size) must never be read as
 * extended-size evidence, so men's products always report false here.
 */
export function isCurvyProduct(
  product: Pick<Product, 'title' | 'description' | 'tags' | 'sizes' | 'department'>,
): boolean {
  if (product.department === 'men') return false;
  const metadata = [product.title, product.description, ...product.tags]
    .join(' ')
    .toLowerCase()
    .replace(/[_-]+/g, ' ');

  const explicitlyCurvy =
    /\b(plus size|plus sized|plussize|curvy|curve collection|extended size|extended sizing|full figure|full figured|big size|big sizes)\b/.test(
      metadata,
    );
  const includesExtendedSizes = product.sizes.some((size) =>
    ['1XL', '2XL', '3XL', '4XL', '5XL', '6XL', '1X', '2X', '3X', '4X', '5X', '6X'].includes(size),
  );
  const titleListsExtendedSizes =
    /\b(1xl|2xl|3xl|4xl|5xl|6xl|1x|2x|3x|4x|5x|6x|xxl|xxxl|xxxxl)\b/.test(metadata);

  return explicitlyCurvy || includesExtendedSizes || titleListsExtendedSizes;
}

/** Men's products live in the separate men's storefront under /men. */
export function productPath(product: { slug: string; department?: string }): string {
  return product.department === 'men' ? `/men/product/${product.slug}` : `/product/${product.slug}`;
}
