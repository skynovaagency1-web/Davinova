interface Env { DB: D1Database }
export async function onRequestGet({ env, request }: { env: Env; request: Request }): Promise<Response> {
  const url = new URL(request.url);
  const collection = url.searchParams.get('occasion');
  const fields = 'p.id,p.slug,p.title,p.description,p.price_cents,p.compare_at_cents,p.currency,p.occasion,p.collection_category,p.department,p.color,p.length,p.sleeve,p.neckline,p.tags_json,p.featured,p.popularity,(SELECT url FROM product_images i WHERE i.product_id=p.id ORDER BY is_primary DESC,position LIMIT 1) AS image_url';
  const base = "SELECT " + fields + " FROM products p WHERE p.active=1 AND p.supplier='cj' AND p.supplier_verified=1 AND p.cj_product_id IS NOT NULL AND p.collection_category IN ('wedding-guest','cocktail-party','maxi-holiday') AND EXISTS (SELECT 1 FROM product_variants v WHERE v.product_id=p.id AND v.active=1 AND v.cj_variant_id IS NOT NULL AND v.available_stock > 0)";
  const query = collection
    ? env.DB.prepare(base + ' AND p.collection_category=? ORDER BY p.featured DESC,p.created_at DESC').bind(collection)
    : env.DB.prepare(base + ' ORDER BY p.featured DESC,p.created_at DESC');
  const { results } = await query.all();
  return Response.json({ products: results }, { headers: { 'Cache-Control': 'public, max-age=30, s-maxage=60', 'X-Content-Type-Options': 'nosniff' } });
}
