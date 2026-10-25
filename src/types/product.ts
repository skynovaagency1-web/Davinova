export type Supplier = 'cj' | 'fondmart';
export type CatalogSource = 'cj' | 'fondmart';
export type CollectionCategory = 'wedding-guest' | 'cocktail-party' | 'maxi-holiday' | 'unassigned';
export type DressSize = 'XS' | 'S' | 'M' | 'L' | 'XL' | '1XL' | '2XL' | '3XL' | '4XL' | '5XL' | '6XL' | '1X' | '2X' | '3X' | '4X' | '5X' | '6X';
/** Men's formalwear uses its own letter-size scheme, distinct from DressSize (e.g. 'XXL' is not the same label as '2XL'). */
export type MensSize = 'S' | 'M' | 'L' | 'XL' | 'XXL';
/** A dress size, or a CJ option label such as "36", "One size" or "Black / M" (colour / size). */
export type ProductSize = DressSize | MensSize | (string & {});
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
  /** Storefront shelf worked out from the title (see lib/shelves.ts); 'hidden' items are not shown. */
  shelf?: import('../lib/shelves').Shelf;
  storeCollection?: string;
  storeCollectionLabel?: string;
  storeSubcategory?: string;
  storeSubcategoryLabel?: string;
  occasion: 'wedding-guest' | 'cocktail' | 'evening' | 'bridesmaid';
  department: Department;
  color: string;
  length?: 'Mini' | 'Midi' | 'Maxi';
  sleeve: string;
  neckline: string;
  tags: string[];
  sizes: ProductSize[];
  /** Supplier photo per colour (the part before " / " in a size label). */
  colourImages?: Record<string, string>;
  images: { url: string; alt: string }[];
  model3d?: { url: string; credit?: string; scale?: number; rotationY?: number };
  featured?: boolean;
  browseOnly?: boolean;
  /** Added to the shop in the last 4 days. */
  isNew?: boolean;
  /** Units left across the shown sizes, set only when 25 or fewer. */
  lowStock?: number;
  currency?: string;
  woocommerceProductId?: number;
  woocommercePermalink?: string;
  woocommerceType?: 'simple' | 'variable';
  inStock?: boolean;
  isPurchasable?: boolean;
}
