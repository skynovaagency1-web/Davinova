interface Env { DB: D1Database; ASSETS?: { fetch: (input: Request | string) => Promise<Response> } }
import { assignmentFromStoreTags, publicProductTags } from '../../src/lib/storeCollectionTaxonomy';

type DbProduct = {
  id: string; slug: string; title: string; description: string;
  price_cents: number; compare_at_cents: number | null; cost_cents: number; currency: string;
  occasion: string; collection_category: string; department: string; color: string; length: string | null;
  sleeve: string; neckline: string; tags_json: string; featured: number;
  supplier: string; catalog_source: string; catalog_source_product_id: string | null;
  cj_product_id: string | null; supplier_verified: number; has_sellable_variant: number;
};
type DbImage = { url: string; alt: string };

function allowedCategory(value: string | null): boolean {
  return value === null || ['wedding-guest', 'cocktail-party', 'maxi-holiday'].includes(value);
}

/**
 * Public browsing catalogue. Unlike /api/products, this may return unverified
 * catalogue entries, but marks them browseOnly and supplies no purchasable sizes.
 */
export async function onRequestGet({ env, request }: { env: Env; request: Request }): Promise<Response> {
  const url = new URL(request.url);
  const collection = url.searchParams.get('occasion');
  if (!allowedCategory(collection)) {
    return Response.json({ error: 'Unknown collection.' }, { status: 400 });
  }

  // The whole catalogue is the same for every visitor, so answer from Cloudflare's edge cache when we can.
  const cache = (globalThis as unknown as { caches?: { default: Cache } }).caches?.default;
  const cacheKey = new Request(url.toString(), { method: 'GET' });
  const cached = await cache?.match(cacheKey);
  if (cached) return cached;
  // ?all=1 (used by the import and photo-check scripts) includes products not yet shown.
  const shown = url.searchParams.get('all') === '1' ? undefined : await photoCheckedIds(env, request);

  const base = `SELECT id,slug,title,description,price_cents,compare_at_cents,cost_cents,currency,occasion,
    collection_category,department,color,length,sleeve,neckline,tags_json,featured,supplier,catalog_source,
    catalog_source_product_id,cj_product_id,supplier_verified,
    CASE WHEN EXISTS (SELECT 1 FROM product_variants v WHERE v.product_id=products.id AND v.active=1 AND v.cj_variant_id IS NOT NULL AND v.available_stock > 0) THEN 1 ELSE 0 END AS has_sellable_variant
    FROM products
    WHERE active=1 AND supplier='cj' AND catalog_source='cj' AND cj_product_id IS NOT NULL AND collection_category IN ('wedding-guest','cocktail-party','maxi-holiday')`;
  const filter = collection ? ' AND collection_category=?' : '';
  const binds = collection ? [collection] : [];
  const ids = `SELECT id FROM products WHERE active=1 AND supplier='cj' AND catalog_source='cj' AND cj_product_id IS NOT NULL AND collection_category IN ('wedding-guest','cocktail-party','maxi-holiday')${filter}`;
  // One round trip for products, images and sizes. Querying per product made ~400 sequential calls for 200 products.
  const [productsResult, imagesResult, variantsResult] = await env.DB.batch([
    env.DB.prepare(base + filter + ' ORDER BY featured DESC,created_at DESC').bind(...binds),
    env.DB.prepare(`SELECT product_id,url,alt FROM product_images WHERE product_id IN (${ids}) ORDER BY product_id,is_primary DESC,position`).bind(...binds),
    env.DB.prepare(`SELECT product_id,size FROM product_variants WHERE active=1 AND cj_variant_id IS NOT NULL AND available_stock > 0 AND product_id IN (${ids}) ORDER BY product_id,size`).bind(...binds),
  ]);
  const results = (productsResult.results ?? []) as DbProduct[];
  const imagesByProduct = groupByProduct((imagesResult.results ?? []) as (DbImage & { product_id: string })[]);
  const sizesByProduct = groupByProduct((variantsResult.results ?? []) as { product_id: string; size: string }[]);

  const products = [];
  for (const row of results) {
    // Products whose photo failed the photo check are never shown, so don't send them.
    if (shown && !shown.has(row.id)) continue;
    const imageRows = (imagesByProduct.get(row.id) ?? []).slice(0, 8).map(({ url, alt }) => ({ url, alt }));
    const variantRows = sizesByProduct.get(row.id) ?? [];
    const verified = row.supplier_verified === 1;
    const allowedSizes = new Set(['XS', 'S', 'M', 'L', 'XL', 'XXL', '1XL', '2XL', '3XL', '4XL', '5XL', '6XL', '1X', '2X', '3X', '4X', '5X', '6X']);
    const sizes = verified && row.price_cents > 0 && row.cost_cents > 0
      ? [...new Set((variantRows ?? []).map((variant) => variant.size).filter((size) => allowedSizes.has(size)))]
      : [];
    const purchasable = verified && row.has_sellable_variant === 1 && row.price_cents > 0 && row.cost_cents > 0 && sizes.length > 0;
    const productTags = safeJsonArray(row.tags_json);
    const storeAssignment = assignmentFromStoreTags(productTags);
    products.push({
      id: row.id, slug: row.slug, title: row.title, description: row.description,
      priceCents: row.price_cents, compareAtCents: row.compare_at_cents ?? undefined,
      currency: row.currency, occasion: row.occasion, collectionCategory: row.collection_category,
      department: row.department === 'men' ? 'men' : 'women',
      storeCollection: storeAssignment?.collection,
      storeCollectionLabel: storeAssignment?.collectionLabel,
      storeSubcategory: storeAssignment?.subcategory,
      storeSubcategoryLabel: storeAssignment?.subcategoryLabel,
      color: row.color === 'Not verified' ? '' : row.color,
      length: ['Mini','Midi','Maxi'].includes(row.length ?? '') ? row.length : undefined,
      sleeve: row.sleeve === 'Not verified' ? '' : row.sleeve,
      neckline: row.neckline === 'Not verified' ? '' : row.neckline,
      tags: publicProductTags(productTags),
      sizes,
      supplier: 'cj', supplierVerified: verified,
      sourceSupplier: row.catalog_source, sourceSupplierProductId: row.catalog_source_product_id ?? undefined,
      cjProductId: row.cj_product_id ?? undefined,
      images: imageRows,
      featured: row.featured === 1,
      browseOnly: !purchasable,
    });
  }

  const response = Response.json({ products }, {
    headers: {
      'Cache-Control': 'public, max-age=60, s-maxage=300',
      'X-Content-Type-Options': 'nosniff',
    },
  });
  if (cache) await cache.put(cacheKey, response.clone());
  return response;
}

/** Ids with a passing photo in public/cutouts/manifest.json; undefined (show everything) if it can't be read. */
async function photoCheckedIds(env: Env, request: Request): Promise<Set<string> | undefined> {
  try {
    const response = await (env.ASSETS?.fetch(new URL('/cutouts/manifest.json', request.url).toString()) ?? fetch(new URL('/cutouts/manifest.json', request.url)));
    if (!response.ok) return undefined;
    const manifest = await response.json() as Record<string, string | null>;
    return new Set(Object.keys(manifest).filter((id) => typeof manifest[id] === 'string'));
  } catch {
    return undefined;
  }
}

function groupByProduct<T extends { product_id: string }>(rows: T[]): Map<string, T[]> {
  const grouped = new Map<string, T[]>();
  for (const row of rows) {
    const list = grouped.get(row.product_id);
    if (list) list.push(row);
    else grouped.set(row.product_id, [row]);
  }
  return grouped;
}

function safeJsonArray(value: string): string[] {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}
