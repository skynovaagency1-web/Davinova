import { useEffect, useState } from 'react';
import type { CollectionCategory, Product } from '../types/product';
import { previewFirstCjDress } from '../data/previewFirstCjDress';
import { fetchWooCommerceProducts, isWooCommerceConfigured } from './woocommerce';
import { shelfFor } from './shelves';
import { loadCutouts } from './useCutouts';

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
  department?: Product['department'];
  storeCollection?: string;
  storeCollectionLabel?: string;
  storeSubcategory?: string;
  storeSubcategoryLabel?: string;
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
    storeCollection: row.storeCollection,
    storeCollectionLabel: row.storeCollectionLabel,
    storeSubcategory: row.storeSubcategory,
    storeSubcategoryLabel: row.storeSubcategoryLabel,
    occasion,
    department: row.department === 'men' ? 'men' : 'women',
    color: row.color ?? '',
    length: row.length,
    sleeve: row.sleeve ?? '',
    neckline: row.neckline ?? '',
    tags: Array.isArray(row.tags) ? row.tags : [],
    sizes: Array.isArray(row.sizes) ? row.sizes.filter((size): size is Product['sizes'][number] => ['XS', 'S', 'M', 'L', 'XL', 'XXL', '1XL', '2XL', '3XL', '4XL', '5XL', '6XL', '1X', '2X', '3X', '4X', '5X', '6X'].includes(size)) : [],
    images: row.images.filter((image) => image && typeof image.url === 'string' && image.url.startsWith('https://')),
    featured: row.featured === true,
    browseOnly: row.browseOnly !== false,
  };
}

// Shared by every page in the session, so moving between the shop, a product and the bag
// reuses one catalogue download instead of fetching all products again on each page.
let cjCatalogueRequest: Promise<Product[]> | null = null;

function loadCjCatalogue(): Promise<Product[]> {
  if (!cjCatalogueRequest) {
    cjCatalogueRequest = Promise.all([fetch('/api/catalog', { headers: { Accept: 'application/json' } }), loadCutouts()])
      .then(async ([response, cutouts]) => {
        if (!response.ok) throw new Error('Catalogue endpoint unavailable');
        const data = await response.json() as { products?: CatalogueRow[] };
        if (!Array.isArray(data.products)) throw new Error('Catalogue response was not a product list');
        return data.products.map(toProduct)
          .filter((item): item is Product => item !== null)
          .map((item) => ({ ...item, shelf: shelfFor(item) }))
          // Pyjamas, kids' clothes, pet costumes and the like are not part of the store.
          .filter((item) => item.shelf !== 'hidden')
          // Only products whose photo passed the photo check (whole model, nothing cut off) are shown.
          .filter((item) => typeof cutouts[item.id] === 'string');
      })
      .catch((cause: unknown) => {
        cjCatalogueRequest = null; // allow a retry on the next page visit
        throw cause;
      });
  }
  return cjCatalogueRequest;
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

    loadCjCatalogue()
      .then((mapped) => {
        if (cancelled) return;
        const isPagesPreview = window.location.hostname === 'davinova.pages.dev' || window.location.hostname.endsWith('.davinova.pages.dev');
        setCatalogProducts(mapped.length === 0 && isPagesPreview ? [previewFirstCjDress] : mapped);
        setError(null);
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
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
