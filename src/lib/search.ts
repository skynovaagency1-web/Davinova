import type { Department, Product } from '../types/product';

/** Words a shopper types, mapped to the words CJ titles use. */
const SYNONYMS: Record<string, string[]> = { purse: ['bag', 'handbag'], bag: ['bag', 'handbag'], gown: ['gown', 'dress'], tux: ['tuxedo'], curvy: ['plus', 'curvy'], blazer: ['blazer', 'jacket'] };

const words = (text: string) => text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').split(/[^a-z0-9]+/).filter(Boolean);

function haystack(product: Product) {
  return words([product.title, product.storeCollectionLabel, product.storeSubcategoryLabel, product.color, product.tags.join(' ')].filter(Boolean).join(' ')).join(' ');
}

/** Every typed word must appear (as the start of a word); title hits rank first. */
export function searchProducts(products: Product[], query: string, department: Department): Product[] {
  const terms = words(query).map((term) => { const one = term.length > 3 ? term.replace(/s$/, '') : term; return SYNONYMS[term] ?? SYNONYMS[one] ?? [one]; });
  if (!terms.length) return [];
  return products
    .filter((product) => product.department === department && product.images[0]?.url)
    .map((product) => {
      const text = ' ' + haystack(product);
      const title = ' ' + words(product.title).join(' ');
      if (!terms.every((options) => options.some((term) => text.includes(' ' + term)))) return null;
      const score = terms.filter((options) => options.some((term) => title.includes(' ' + term))).length * 2 + (product.supplierVerified ? 1 : 0);
      return { product, score };
    })
    .filter((hit): hit is { product: Product; score: number } => hit !== null)
    .sort((a, b) => b.score - a.score)
    .map((hit) => hit.product);
}
