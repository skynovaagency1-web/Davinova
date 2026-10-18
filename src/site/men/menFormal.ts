import type { Product } from '../../types/product';
import { MEN_ACCESSORIES, MEN_COLLECTIONS } from '../../lib/storeCollectionTaxonomy';

/** The men's three occasions, each backed by one sub-category of the men's formal list. */
export const MEN_OCCASIONS = [
  { no: '01', key: 'wedding-guest', sub: 'wedding-suits', title: 'Wedding', short: 'Suits', line: 'Suits for the ceremony' },
  { no: '02', key: 'cocktail-party', sub: 'tuxedos-and-dinner-jackets', title: 'Black tie', short: 'Tuxedos', line: 'Dinner jackets and evenings' },
  { no: '03', key: 'maxi-holiday', sub: 'linen-and-summer-suits', title: 'Holiday', short: 'Linen', line: 'Light tailoring for travel' },
] as const;

/** Every men's category, in menu order: the three suits first, then the rest of the look. */
export const MEN_CATEGORIES = [
  { sub: 'wedding-suits', short: 'Suits' },
  { sub: 'tuxedos-and-dinner-jackets', short: 'Tuxedos' },
  { sub: 'linen-and-summer-suits', short: 'Linen' },
  { sub: 'blazers-and-waistcoats', short: 'Blazers' },
  { sub: 'dress-shirts', short: 'Shirts' },
  { sub: 'ties-and-bow-ties', short: 'Ties' },
  { sub: 'dress-shoes', short: 'Shoes' },
  { sub: 'belts-and-suspenders', short: 'Belts' },
  { sub: 'hats-and-caps', short: 'Hats' },
  { sub: 'outerwear-and-jackets', short: 'Outerwear' },
  { sub: 'bottoms', short: 'Bottoms' },
  { sub: 't-shirts', short: 'T-Shirts' },
  { sub: 'mens-sleep-and-lounge', short: 'Lounge' },
  { sub: 'shorts', short: 'Shorts' },
  { sub: 'briefs', short: 'Briefs' },
  { sub: 'robes', short: 'Robes' },
  { sub: 'man-pajama-sets', short: 'Pajamas' },
  { sub: 'boxers', short: 'Boxers' },
  { sub: 'long-johns', short: 'Long Johns' },
] as const;

export const menCategoryPath = (sub: string) => `/men/shop?cat=${sub}`;

export const menOccasionPath = (key: string) => `/men/shop?occasion=${key}`;

/** Only products filed in the men's own lists; stray imports never show here. */
export function formalMen(products: Product[]) {
  return products.filter((product) => product.department === 'men' && MEN_COLLECTIONS.includes(product.storeCollection ?? ''));
}

/** Clothes only, for the rails (Trending now, New in): no ties, shoes, belts or hats. */
export const menClothes = (products: Product[]) => formalMen(products).filter((product) => product.storeCollection !== MEN_ACCESSORIES);
