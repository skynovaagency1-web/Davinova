export type Supplier = 'cj' | 'fondmart';
export type CatalogSource = 'cj' | 'fondmart';
export type CollectionCategory = 'wedding-guest' | 'cocktail-party' | 'maxi-holiday' | 'unassigned';
export type DressSize = 'XS' | 'S' | 'M' | 'L' | 'XL' | '1XL' | '2XL' | '3XL' | '4XL' | '5XL' | '6XL' | '1X' | '2X' | '3X' | '4X' | '5X' | '6X';
/** Men's formalwear uses its own letter-size scheme, distinct from DressSize (e.g. 'XXL' is not the same label as '2XL'). */
export type MensSize = 'S' | 'M' | 'L' | 'XL' | 'XXL';
export type ProductSize = DressSize | MensSize;
export type Department = 'women' | 'men';

export interface Product {
  id: string;
  slug: string;
  title: string;
  description: string;
  priceCents: number; // Draft retail price until CJ product/shipping costs are verified.
  compareAtCents?: number;
  supplier: Supplier;
  supplierVerified: boolean;
  sourceSupplier: CatalogSource;
  sourceSupplierProductId?: string;
  sourceSupplierUrl?: string;
  cjProductId?: string;
  cjVariantId?: string;
  collectionCategory: CollectionCategory;
  occasion: 'wedding-guest' | 'cocktail' | 'evening' | 'bridesmaid';
  department: Department;
  color: string;
  length?: 'Mini' | 'Midi' | 'Maxi';
  sleeve: string;
  neckline: string;
  tags: string[];
  sizes: ProductSize[];
  images: { url: string; alt: string }[];
  model3d?: { url: string; credit?: string; scale?: number; rotationY?: number };
  featured?: boolean;
  browseOnly?: boolean;
  currency?: string;
  woocommerceProductId?: number;
  woocommercePermalink?: string;
  woocommerceType?: 'simple' | 'variable';
  inStock?: boolean;
  isPurchasable?: boolean;
}
