interface Env { DB: D1Database }

type DbProduct = {
  id: string; slug: string; title: string; description: string;
  price_cents: number; compare_at_cents: number | null; currency: string;
  occasion: string; collection_category: string; color: string; length: string | null;
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

  const base = `SELECT id,slug,title,description,price_cents,compare_at_cents,currency,occasion,
    collection_category,color,length,sleeve,neckline,tags_json,featured,supplier,catalog_source,
    catalog_source_product_id,cj_product_id,supplier_verified,
    CASE WHEN EXISTS (SELECT 1 FROM product_variants v WHERE v.product_id=products.id AND v.active=1 AND v.cj_variant_id IS NOT NULL AND v.available_stock > 0) THEN 1 ELSE 0 END AS has_sellable_variant
    FROM products
    WHERE active=1 AND collection_category IN ('wedding-guest','cocktail-party','maxi-holiday')`;
  const statement = collection
    ? env.DB.prepare(base + ' AND collection_category=? ORDER BY featured DESC,created_at DESC').bind(collection)
    : env.DB.prepare(base + ' ORDER BY featured DESC,created_at DESC');
  const { results } = await statement.all<DbProduct>();

  const products = [];
  for (const row of results) {
    const { results: imageRows } = await env.DB.prepare(
      'SELECT url,alt FROM product_images WHERE product_id=? ORDER BY is_primary DESC,position LIMIT 8',
    ).bind(row.id).all<DbImage>();
    const verified = row.supplier_verified === 1;
    products.push({
      id: row.id, slug: row.slug, title: row.title, description: row.description,
      priceCents: row.price_cents, compareAtCents: row.compare_at_cents ?? undefined,
      currency: row.currency, occasion: row.occasion, collectionCategory: row.collection_category,
      color: row.color === 'Not verified' ? '' : row.color,
      length: ['Mini','Midi','Maxi'].includes(row.length ?? '') ? row.length : undefined,
      sleeve: row.sleeve === 'Not verified' ? '' : row.sleeve,
      neckline: row.neckline === 'Not verified' ? '' : row.neckline,
      tags: safeJsonArray(row.tags_json),
      sizes: [],
      supplier: 'cj', supplierVerified: verified,
      sourceSupplier: row.catalog_source, sourceSupplierProductId: row.catalog_source_product_id ?? undefined,
      cjProductId: row.cj_product_id ?? undefined,
      images: imageRows,
      featured: row.featured === 1,
      browseOnly: !(verified && row.has_sellable_variant === 1),
    });
  }

  return Response.json({ products }, {
    headers: {
      'Cache-Control': 'public, max-age=30, s-maxage=60',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

function safeJsonArray(value: string): string[] {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}
