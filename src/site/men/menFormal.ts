import type { Product } from '../../types/product';
import { MEN_FORMAL } from '../../lib/storeCollectionTaxonomy';

/** The men's three occasions, each backed by one sub-category of the men's formal list. */
export const MEN_OCCASIONS = [
  { no: '01', key: 'wedding-guest', sub: 'wedding-suits', title: 'Wedding', short: 'Suits', line: 'Suits for the ceremony' },
  { no: '02', key: 'cocktail-party', sub: 'tuxedos-and-dinner-jackets', title: 'Black tie', short: 'Tuxedos', line: 'Dinner jackets and evenings' },
  { no: '03', key: 'maxi-holiday', sub: 'linen-and-summer-suits', title: 'Holiday', short: 'Linen', line: 'Light tailoring for travel' },
] as const;

export const menOccasionPath = (key: string) => `/men/shop?occasion=${key}`;

/** Only the formalwear chosen for the men's shop; stray casual imports never show here. */
export function formalMen(products: Product[]) {
  return products.filter((product) => product.department === 'men' && product.storeCollection === MEN_FORMAL);
}
