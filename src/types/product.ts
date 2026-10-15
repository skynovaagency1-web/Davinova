export type Supplier = 'cj' | 'fondmart';
export type CatalogSource = 'cj' | 'fondmart';
export type CollectionCategory = 'wedding-guest' | 'cocktail-party' | 'maxi-holiday' | 'unassigned';
export type DressSize = 'XS' | 'S' | 'M' | 'L' | 'XL' | '2XL' | '3XL' | '4XL';

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
  color: string;
  length?: 'Mini' | 'Midi' | 'Maxi';
  sleeve: string;
  neckline: string;
  tags: string[];
  sizes: DressSize[];
  images: { url: string; alt: string }[];
  model3d?: { url: string; credit?: string; scale?: number; rotationY?: number };
  featured?: boolean;
  browseOnly?: boolean;
}
