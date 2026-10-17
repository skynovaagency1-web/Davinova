import type { Product } from '../types/product';
import { storeCollectionGroups, type StoreCollectionGroup } from './storeCollectionTaxonomy';

/** The store's categories (the owner's list in storeCollectionTaxonomy.ts), as used by menus and filters. */
export const CATEGORY_GROUPS: StoreCollectionGroup[] = storeCollectionGroups;

export function categoryGroup(slug: string | null | undefined): StoreCollectionGroup | undefined {
  return CATEGORY_GROUPS.find((group) => group.slug === slug);
}

export function subcategoryLabel(group: string | null | undefined, sub: string | null | undefined): string | undefined {
  return categoryGroup(group)?.subcategories.find((item) => item.slug === sub)?.label;
}

export function categoryPath(group: string, sub?: string): string {
  return `/shop?category=${group}${sub ? `&sub=${sub}` : ''}`;
}

export function inCategory(product: Product, group: string, sub = ''): boolean {
  return product.storeCollection === group && (!sub || product.storeSubcategory === sub);
}

/** Splits a label into the two weights of the big titles: "Weddings & Events" → ["Weddings &", "EVENTS"]. */
export function titleParts(label: string): [string, string] {
  const words = label.split(' ');
  if (words.length === 1) return ['The', label.toUpperCase()];
  return [words.slice(0, -1).join(' '), words[words.length - 1].toUpperCase()];
}

/** Groups that have at least one product, most stocked first. */
export function stockedGroups(products: Product[]) {
  return CATEGORY_GROUPS
    .map((group) => ({ group, items: products.filter((product) => product.storeCollection === group.slug) }))
    .filter((entry) => entry.items.length > 0)
    .sort((a, b) => b.items.length - a.items.length);
}
