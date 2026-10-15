import { useEffect, useState } from 'react';
import type { CollectionCategory, Product } from '../types/product';

interface CatalogueRow {
  id: string;
  slug: string;
  title: string;
  description?: string;
  priceCents?: number;
  compareAtCents?: number;
  occasion?: Product['occasion'];
  collectionCategory?: CollectionCategory;
  color?: string;
  length?: Product['length'];
  sleeve?: string;
  neckline?: string;
  tags?: string[];
  supplierVerified?: boolean;
  sourceSupplier?: Product['sourceSupplier'];
  sourceSupplierProductId?: string;
  cjProductId?: string;
  images?: Product['images'];
  featured?: boolean;
  browseOnly?: boolean;
}

function isCollection(value: unknown): value is CollectionCategory {
  return value === 'wedding-guest' || value === 'cocktail-party' || value === 'maxi-holiday' || value === 'unassigned';
}

function toProduct(row: CatalogueRow): Product | null {
  if (!row.id || !row.slug || !row.title || !Array.isArray(row.images)) return null;
  const collectionCategory = isCollection(row.collectionCategory) ? row.collectionCategory : 'unassigned';
  const occasion: Product['occasion'] = row.occasion === 'wedding-guest' || row.occasion === 'cocktail' || row.occasion === 'evening' || row.occasion === 'bridesmaid'
    ? row.occasion
    : collectionCategory === 'cocktail-party' ? 'cocktail' : collectionCategory === 'maxi-holiday' ? 'evening' : 'wedding-guest';
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description ?? '',
    priceCents: Number.isFinite(row.priceCents) ? Math.max(0, Number(row.priceCents)) : 0,
    compareAtCents: Number.isFinite(row.compareAtCents) ? Number(row.compareAtCents) : undefined,
    supplier: 'cj',
    supplierVerified: row.supplierVerified === true,
    sourceSupplier: row.sourceSupplier === 'fondmart' ? 'fondmart' : 'cj',
    sourceSupplierProductId: row.sourceSupplierProductId,
    cjProductId: row.cjProductId,
    collectionCategory,
    occasion,
    color: row.color ?? '',
    length: row.length,
    sleeve: row.sleeve ?? '',
    neckline: row.neckline ?? '',
    tags: Array.isArray(row.tags) ? row.tags : [],
    sizes: [],
    images: row.images.filter((image) => image && typeof image.url === 'string' && image.url.startsWith('https://')),
    featured: row.featured === true,
    browseOnly: row.browseOnly !== false,
  };
}

/** Loads only products saved from the CJ catalogue. Never fall back to FondMart research placeholders. */
export function useCatalogProducts() {
  const [catalogProducts, setCatalogProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/catalog', { headers: { Accept: 'application/json' }, cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error('Catalogue endpoint unavailable');
        return await response.json() as { products?: CatalogueRow[] };
      })
      .then((data) => {
        if (cancelled || !Array.isArray(data.products)) return;
        const mapped = data.products.map(toProduct).filter((item): item is Product => item !== null);
        setCatalogProducts(mapped);
      })
      .catch(() => {
        // Show an empty, accurate catalogue if the API/database is unavailable.
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return { products: catalogProducts, loading };
}
