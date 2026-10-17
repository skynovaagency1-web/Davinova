import type { Product } from '../../types/product';

/**
 * Style categories for the women's shop. Supplier colour/length fields are still "Not verified",
 * so a dress joins a category only when its own title, tags or description name the style.
 */
export const STYLE_CATEGORIES = [
  { key: 'evening', label: 'Evening', pattern: /\bevening|gown|formal\b/ },
  { key: 'lace', label: 'Lace', pattern: /\blace\b/ },
  { key: 'floral', label: 'Floral & print', pattern: /\bfloral|flower|print(ed)?\b/ },
  { key: 'party', label: 'Party', pattern: /\bparty|club|cocktail\b/ },
  { key: 'long-sleeve', label: 'Long sleeve', pattern: /\blong[\s-]sleeve/ },
  { key: 'off-shoulder', label: 'Off shoulder', pattern: /\boff[\s-]?(the[\s-])?shoulder/ },
  { key: 'sparkle', label: 'Sequin & sparkle', pattern: /\bsequin|glitter|sparkl|beaded|rhinestone/ },
  { key: 'velvet', label: 'Velvet', pattern: /\bvelvet\b/ },
  { key: 'satin', label: 'Satin', pattern: /\bsatin|silk/ },
  { key: 'slit', label: 'Split & slit', pattern: /\bslit|split\b/ },
] as const;

export type StyleKey = typeof STYLE_CATEGORIES[number]['key'];

export function matchesStyle(product: Pick<Product, 'title' | 'tags' | 'description'>, key: string): boolean {
  const category = STYLE_CATEGORIES.find((item) => item.key === key);
  if (!category) return true;
  return category.pattern.test([product.title, ...product.tags, product.description].join(' ').toLowerCase());
}
