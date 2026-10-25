import type { Product } from '../types/product';
import { FREE_GIFT } from './offers';

export type BadgeKind = 'soon' | 'low' | 'gift' | 'new' | 'best';

/** One badge per card, most useful first. Every badge is true: stock and dates come from the store database. */
export function productBadge(product: Product): { kind: BadgeKind; label: string } | null {
  if (product.browseOnly) return { kind: 'soon', label: 'Coming soon' };
  if (product.lowStock) return { kind: 'low', label: `Only ${product.lowStock} left` };
  if (product.priceCents >= FREE_GIFT.thresholdCents) return { kind: 'gift', label: 'Free gift' };
  if (product.isNew) return { kind: 'new', label: 'New' };
  if (product.featured) return { kind: 'best', label: 'Best seller' };
  return null;
}
