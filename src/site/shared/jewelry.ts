import type { Product } from '../../types/product';
import { JEWELRY_COLLECTION } from '../../lib/storeCollectionTaxonomy';

export type Dept = 'women' | 'men';
export type JewelryType = 'bridal-sets' | 'wedding-hair' | 'engagement-rings' | 'fashion' | 'fine' | 'mens-watches' | 'womens-watches'
  | 'mens-wedding-bands' | 'cufflinks' | 'mens-chains-bracelets';

export const JEWELRY_TYPES: Record<JewelryType, { label: string; line: string }> = {
  'bridal-sets': { label: 'Bridal Jewelry Sets', line: 'Matching necklace, earrings and bracelet for the day' },
  'wedding-hair': { label: 'Wedding Hair Jewelry', line: 'Tiaras, combs and pins for the hair' },
  'engagement-rings': { label: 'Engagement Rings', line: 'For the question, and the yes' },
  fashion: { label: 'Fashion Jewelry', line: 'Statement pieces for the party' },
  fine: { label: 'Fine Jewelry', line: 'Gold, silver and stones to keep' },
  'mens-watches': { label: "Men's Watches", line: 'From the ceremony to the Monday after' },
  'womens-watches': { label: "Women's Watches", line: 'The finishing touch for every look' },
  'mens-wedding-bands': { label: 'Wedding Bands', line: 'The ring he wears home' },
  cufflinks: { label: 'Cufflinks & Tie Clips', line: 'Small details for the suit' },
  'mens-chains-bracelets': { label: 'Chains & Bracelets', line: 'Steel, silver and gold for every day' },
};

/** The Jewelry & Watches sub-menu. Each shop has its own pieces. */
export function jewelryMenu(dept: Dept): { title: string; items: JewelryType[] }[] {
  if (dept === 'men') return [
    { title: 'Wedding', items: ['mens-wedding-bands', 'cufflinks'] },
    { title: 'Jewelry', items: ['mens-chains-bracelets'] },
    { title: 'Watches', items: ['mens-watches'] },
  ];
  return [
    { title: 'Wedding & Engagement', items: ['bridal-sets', 'wedding-hair', 'engagement-rings'] },
    { title: 'Jewelry', items: ['fashion', 'fine'] },
    { title: 'Watches', items: ['womens-watches'] },
  ];
}

export function jewelryPath(dept: Dept, type?: JewelryType) {
  if (dept === 'women' && type === 'womens-watches') return '/watches';
  const base = dept === 'men' ? '/men/jewelry' : '/jewelry';
  return type ? `${base}/${type}` : base;
}

/** Which jewelry sub-type a product belongs to, read from its title. */
export function jewelryTypeOf(product: Pick<Product, 'title' | 'shelf' | 'department' | 'storeCollection' | 'storeSubcategory'>): JewelryType | undefined {
  // Pieces imported straight into a Jewelry & Watches sub-category keep it.
  const text = product.title.toLowerCase();
  // (A "crown" search also found crown-shaped rings and pendants; those go by their title instead.)
  const hairPiece = /tiara|hair|headdress|headpiece|headband|big crown/.test(text);
  if (product.storeCollection === JEWELRY_COLLECTION && product.storeSubcategory && product.storeSubcategory in JEWELRY_TYPES
    && (product.storeSubcategory !== 'wedding-hair' || hairPiece)) return product.storeSubcategory as JewelryType;
  if (product.shelf === 'watches') return /\bmen'?s\b|\bmale\b|\bgentlemen\b/.test(text) || product.department === 'men' ? 'mens-watches' : 'womens-watches';
  if (product.shelf !== 'jewelry') return undefined;
  if (/engagement|wedding ring|proposal/.test(text)) return 'engagement-rings';
  if (hairPiece) return 'wedding-hair';
  if (/bridal|bride|wedding/.test(text)) return 'bridal-sets';
  if (/\b(14|18)k\b|925|sterling|solid gold|diamond|moissanite|pearl/.test(text)) return 'fine';
  return 'fashion';
}
