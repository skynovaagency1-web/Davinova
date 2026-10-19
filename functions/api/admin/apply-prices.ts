interface Env { DB: D1Database }
interface Context { request: Request; env: Env }

function json(data: unknown, status = 200): Response {
  return Response.json(data, { status, headers: { 'Cache-Control': 'no-store, max-age=0', 'X-Content-Type-Options': 'nosniff' } });
}

type Body = {
  products?: [string, number, number][]; // [site id, price cents, landed cost cents]
  variants?: [string, string, string, number][]; // [CJ variant id, option label, colour, stock]
  titles?: [string, string][]; // [site id, new title]
};

/**
 * Writes approved prices to the database (scripts/apply-prices.ts sends them in chunks).
 * Priced products become supplier-verified; only the listed variants are switched on, with their label and stock.
 */
export async function onRequestPost({ request, env }: Context): Promise<Response> {
  let body: Body;
  try { body = await request.json() as Body; } catch { return json({ error: 'Send a valid JSON request.' }, 400); }
  const products = (body.products ?? []).filter(([id, price, cost]) => typeof id === 'string' && Number.isInteger(price) && price > 0 && Number.isInteger(cost) && cost > 0);
  const variants = (body.variants ?? []).filter(([vid, label, colour, stock]) => typeof vid === 'string' && typeof label === 'string' && label.length > 0 && label.length <= 40 && typeof colour === 'string' && Number.isInteger(stock) && stock > 0);
  const titles = (body.titles ?? []).filter(([id, title]) => typeof id === 'string' && typeof title === 'string' && title.length > 0 && title.length <= 200);
  if (products.length + variants.length + titles.length > 1000) return json({ error: 'Send at most 1000 rows per request.' }, 400);

  const statements = [
    ...products.map(([id, price, cost]) => env.DB.prepare("UPDATE products SET price_cents=?,cost_cents=?,supplier_verified=1,updated_at=datetime('now') WHERE id=?").bind(price, cost, id)),
    ...variants.map(([vid, label, colour, stock]) => env.DB.prepare("UPDATE product_variants SET active=1,size=?,color=?,available_stock=?,stock_checked_at=datetime('now') WHERE cj_variant_id=?").bind(label, colour || 'Not verified', stock, vid)),
    ...titles.map(([id, title]) => env.DB.prepare("UPDATE products SET title=?,updated_at=datetime('now') WHERE id=?").bind(title, id)),
  ];
  if (!statements.length) return json({ error: 'Nothing to apply.' }, 400);
  const results = await env.DB.batch(statements);
  const changed = results.reduce((sum, result) => sum + (result.meta?.changes ?? 0), 0);
  return json({ ok: true, statements: statements.length, changed });
}
