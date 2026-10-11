interface Env { DB: D1Database }
export async function onRequestGet({ env, request }: { env: Env; request: Request }): Promise<Response> {
  const url = new URL(request.url);
  const occasion = url.searchParams.get('occasion');
  const query = occasion
    ? env.DB.prepare('SELECT p.*, (SELECT url FROM product_images i WHERE i.product_id=p.id ORDER BY is_primary DESC, position LIMIT 1) AS image_url FROM products p WHERE p.active=1 AND p.occasion=? ORDER BY p.featured DESC, p.created_at DESC').bind(occasion)
    : env.DB.prepare('SELECT p.*, (SELECT url FROM product_images i WHERE i.product_id=p.id ORDER BY is_primary DESC, position LIMIT 1) AS image_url FROM products p WHERE p.active=1 ORDER BY p.featured DESC, p.created_at DESC');
  const { results } = await query.all();
  return Response.json({ products: results }, { headers: { 'Cache-Control': 'public, max-age=60, s-maxage=300' } });
}
