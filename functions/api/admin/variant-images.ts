import { getCJProductDetail, type CJEnv } from '../../../server/cj';

interface Env extends CJEnv { DB: D1Database }

function json(data: unknown, status = 200): Response {
  return Response.json(data, { status, headers: { 'Cache-Control': 'no-store, max-age=0', 'X-Content-Type-Options': 'nosniff' } });
}

/**
 * Saves CJ's photo for each variant of up to 5 products (product_variants.image_url).
 * Only image links are written; prices, stock and labels are untouched. Admin password is checked by functions/_middleware.ts.
 */
export async function onRequestPost({ request, env }: { request: Request; env: Env }): Promise<Response> {
  let body: { productIds?: unknown };
  try { body = await request.json() as typeof body; } catch { return json({ error: 'Send a valid JSON request.' }, 400); }
  const ids = Array.isArray(body.productIds) ? body.productIds.filter((id): id is string => typeof id === 'string' && /^[a-zA-Z0-9-]{1,200}$/.test(id)).slice(0, 5) : [];
  if (!ids.length) return json({ error: 'Send productIds: up to 5 site product IDs.' }, 400);

  const results = [];
  for (const id of ids) {
    try {
      const row = await env.DB.prepare('SELECT cj_product_id FROM products WHERE id=?').bind(id).first<{ cj_product_id: string | null }>();
      if (!row?.cj_product_id) { results.push({ id, ok: false, error: 'No CJ product' }); continue; }
      const detail = await getCJProductDetail(env, row.cj_product_id);
      const updates = detail.variants
        .filter((variant) => variant.id && /^https:\/\//.test(variant.imageUrl))
        .map((variant) => env.DB.prepare('UPDATE product_variants SET image_url=? WHERE product_id=? AND cj_variant_id=?').bind(variant.imageUrl, id, variant.id));
      const done = updates.length ? await env.DB.batch(updates) : [];
      results.push({ id, ok: true, updated: done.reduce((sum, result) => sum + (result.meta?.changes ?? 0), 0) });
    } catch (cause) {
      results.push({ id, ok: false, error: cause instanceof Error ? cause.message : String(cause) });
    }
  }
  return json({ results });
}
