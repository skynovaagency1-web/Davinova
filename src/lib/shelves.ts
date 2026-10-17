import type { Product } from '../types/product';

/**
 * Where each women's product sits in the shop. Supplier categories were imported loosely (pyjamas, pet
 * costumes and bridal gowns all landed in "wedding guest"), so the storefront sorts each product by
 * what its own title says. Anything that is not a women's dress goes to "hidden" and is not shown.
 */
export type Shelf = 'wedding-guest' | 'cocktail-party' | 'evening' | 'bridal' | 'maxi-holiday' | 'everyday' | 'watches' | 'jewelry' | 'hidden';

export const SHELVES: { key: Exclude<Shelf, 'hidden' | 'watches' | 'jewelry'>; label: string; short: string; line: string }[] = [
  { key: 'wedding-guest', label: 'Wedding guest', short: 'Guest', line: 'Ceremony to last dance' },
  { key: 'cocktail-party', label: 'Cocktail & party', short: 'Cocktail', line: 'Made for after dark' },
  { key: 'evening', label: 'Evening gowns', short: 'Evening', line: 'Black tie and galas' },
  { key: 'maxi-holiday', label: 'Maxi & holiday', short: 'Holiday', line: 'Long, light, sun-ready' },
  { key: 'bridal', label: 'Bridal', short: 'Bridal', line: 'For the bride herself' },
  { key: 'everyday', label: 'Everyday', short: 'Everyday', line: 'Easy dresses for any day' },
];

const rules: [Shelf, RegExp][] = [
  ['watches', /\bwrist ?watch|\bwatch(es)?\b/],
  ['jewelry', /jewel|necklace|earring|bracelet|bangle|pendant|\brings?\b|tiara|crown|hairpin|hair clip|hair comb|headpiece|headband|brooch|anklet/],
  ['maxi-holiday', /\bcover[\s-]?up\b/],
  ['hidden', /parent[\s-]child|mother[\s-](and[\s-])?daughter|\bkids?\b|child|\bgirls?\b|little girl|\bpet\b|\bdog\b|pajama|homewear|home wear|home service|swimsuit|swim\b|bathing suit|surgical|protective suit|work clothes|\bbib\b|costume|\bcos\b|cosplay|coslpay|halloween|hanfu|xiuhe|official robes|pants suit|wide leg pants|t-shirt|sweater parent|performance vest|gown shawl/],
  ['wedding-guest', /bridesmaid|sisters dress|girlfriends/],
  ['bridal', /wedding dress|wedding gown|bride|bridal|wedding veil|light wedding|wedding photography|toast dress|wedding bridal/],
  ['cocktail-party', /cocktail|party|club|nightclub|sequin|glitter|sparkl|\bmini\b|bodycon|birthday|tube top dress/],
  ['evening', /evening|\bgown\b|banquet|\bprom\b|formal|fishtail|mermaid|ball|velvet/],
  ['maxi-holiday', /\bmaxi\b|holiday|vacation|beach|seaside|boho|travel|ethnic|kaftan|summer/],
  ['wedding-guest', /bridesmaid|elegant|lace|floral|flower|temperament|french|chiffon|ruffle|satin|backless|off[\s-]?(the[\s-])?shoulder|slit|split/],
  ['everyday', /dress|skirt/],
];

export function shelfFor(product: Pick<Product, 'title' | 'tags' | 'department'>): Shelf {
  const text = [product.title, ...product.tags.filter((tag) => !tag.startsWith('__'))].join(' ').toLowerCase();
  for (const [shelf, pattern] of rules.slice(0, 2)) if (pattern.test(text)) return shelf;
  if (product.department === 'men') return 'everyday';
  for (const [shelf, pattern] of rules.slice(2)) if (pattern.test(text)) return shelf;
  return 'hidden';
}
