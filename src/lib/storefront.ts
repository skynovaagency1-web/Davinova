import type { Product } from '../types/product';

export const STANDARD_STOREFRONT_URL =
  import.meta.env.VITE_STANDARD_STOREFRONT_URL || 'https://davinova.com';

export const CURVY_STOREFRONT_URL =
  import.meta.env.VITE_CURVY_STOREFRONT_URL || 'https://curvy.davinova.com';

/** The same app becomes a distinct storefront when served from the Curvy subdomain. */
export function isCurvyStorefront(): boolean {
  if (typeof window === 'undefined') return false;
  return window.location.hostname.toLowerCase().startsWith('curvy.');
}

/**
 * Keep sizing edits separate. A dress belongs to the Curvy store only when its
 * metadata explicitly identifies plus sizing/extended sizes, or its verified
 * available size list includes 2XL–4XL. Unknown sizing is never guessed.
 */
export function isCurvyProduct(
  product: Pick<Product, 'title' | 'description' | 'tags' | 'sizes'>,
): boolean {
  const metadata = [product.title, product.description, ...product.tags]
    .join(' ')
    .toLowerCase()
    .replace(/[_-]+/g, ' ');

  const explicitlyCurvy =
    /\b(plus size|plus sized|plussize|curvy|curve collection|extended size|extended sizing|full figure|full figured|big size|big sizes)\b/.test(
      metadata,
    );
  const includesExtendedSizes = product.sizes.some((size) =>
    ['2XL', '3XL', '4XL'].includes(size),
  );

  return explicitlyCurvy || includesExtendedSizes;
}
