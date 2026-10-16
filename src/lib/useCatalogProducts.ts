import { useEffect, useState } from 'react';
import type { CollectionCategory, Product } from '../types/product';
import { previewFirstCjDress } from '../data/previewFirstCjDress';
import { fetchWooCommerceProducts, isWooCommerceConfigured } from './woocommerce';

interface CatalogueRow {
  id: string;
  slug: string;
  title: string;
  description?: string;
  priceCents?: number;
  compareAtCents?: number;
  currency?: string;
  occasion?: Product['occasion'];
  collectionCategory?: CollectionCategory;
  color?: string;
  length?: Product['length'];
  sleeve?: string;
  neckline?: string;
  tags?: string[];
  sizes?: string[];
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
    currency: row.currency || 'EUR',
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
    sizes: Array.isArray(row.sizes) ? row.sizes.filter((size): size is Product['sizes'][number] => ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL', '6XL'].includes(size)) : [],
    images: row.images.filter((image) => image && typeof image.url === 'string' && image.url.startsWith('https://')),
    featured: row.featured === true,
    browseOnly: row.browseOnly !== false,
  };
}

/**
 * The WooCommerce public Store API becomes the catalogue source of truth when configured.
 * Otherwise, use the existing CJ/D1 browse-only catalogue. Never mix the two catalogues.
 */
export function useCatalogProducts() {
  const [catalogProducts, setCatalogProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    if (isWooCommerceConfigured()) {
      setCatalogProducts([]);
      setLoading(true);
      setError(null);
      fetchWooCommerceProducts(controller.signal)
        .then((products) => {
          if (cancelled) return;
          setCatalogProducts(products);
          setError(products.length ? null : 'No published products were returned by WooCommerce.');
        })
        .catch((cause: unknown) => {
          if (cancelled || controller.signal.aborted) return;
          setCatalogProducts([]);
          setError(cause instanceof Error ? cause.message : 'Could not load the WooCommerce catalogue.');
        })
        .finally(() => { if (!cancelled) setLoading(false); });

      return () => {
        cancelled = true;
        controller.abort();
      };
    }

    fetch('/api/catalog', { headers: { Accept: 'application/json' }, cache: 'no-store', signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error('Catalogue endpoint unavailable');
        return await response.json() as { products?: CatalogueRow[] };
      })
      .then((data) => {
        if (cancelled || !Array.isArray(data.products)) return;
        const mapped = data.products.map(toProduct).filter((item): item is Product => item !== null);
        const isPagesPreview = window.location.hostname === 'davinova.pages.dev' || window.location.hostname.endsWith('.davinova.pages.dev');
        setCatalogProducts(mapped.length === 0 && isPagesPreview ? [previewFirstCjDress] : mapped);
        setError(null);
      })
      .catch((cause: unknown) => {
        if (cancelled || controller.signal.aborted) return;
        const isPagesPreview = window.location.hostname === 'davinova.pages.dev' || window.location.hostname.endsWith('.davinova.pages.dev');
        if (isPagesPreview) {
          setCatalogProducts([previewFirstCjDress]);
        } else {
          setCatalogProducts([]);
          setError(cause instanceof Error ? cause.message : 'Could not load the Davinova catalogue.');
        }
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  return { products: catalogProducts, loading, error };
}
