export type Supplier = 'cj' | 'fondmart';
export type DressSize = 'XS' | 'S' | 'M' | 'L' | 'XL' | '2XL' | '3XL' | '4XL';

export interface Product {
  id: string;
  slug: string;
  title: string;
  description: string;
  priceCents: number;
  compareAtCents?: number;
  currency?: string;
  supplier: Supplier;
  supplierProductUrl?: string;
  occasion: 'wedding-guest' | 'cocktail' | 'evening' | 'bridesmaid';
  color: string;
  length: 'Mini' | 'Midi' | 'Maxi';
  sleeve: string;
  neckline: string;
  tags: string[];
  sizes: DressSize[];
  images: { url: string; alt: string }[];
  model3d?: { url: string; credit?: string; scale?: number; rotationY?: number };
  featured?: boolean;
  inStock?: boolean;
  woocommerceProductId?: number;
  woocommercePermalink?: string;
  woocommerceType?: 'simple' | 'variable';
}
