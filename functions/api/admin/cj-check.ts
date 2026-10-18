import { calculateCJFreight, getCJProductDetail, getCJProductStock, type CJEnv } from '../../../server/cj';

interface Context { request: Request; env: CJEnv }

function json(data: unknown, status = 200): Response {
  return Response.json(data, { status, headers: { 'Cache-Control': 'no-store, max-age=0', 'X-Content-Type-Options': 'nosniff' } });
}

/**
 * Read-only check of up to 5 CJ products: live cost, variants, stock and the cheapest US shipping.
 * Nothing is written to the database; scripts/cj-check.ts collects the results into a report.
 */
export async function onRequestPost({ request, env }: Context): Promise<Response> {
  let body: { productIds?: unknown };
  try { body = await request.json() as typeof body; } catch { return json({ error: 'Send a valid JSON request.' }, 400); }
  const ids = Array.isArray(body.productIds) ? body.productIds.filter((id): id is string => typeof id === 'string' && /^[a-zA-Z0-9-]{1,200}$/.test(id)).slice(0, 5) : [];
  if (!ids.length) return json({ error: 'Send productIds: up to 5 CJ product IDs.' }, 400);

  const results = [];
  for (const id of ids) {
    try {
      const detail = await getCJProductDetail(env, id);
      const stock = await getCJProductStock(env, id).catch(() => ({} as Record<string, number>));
      const variants = detail.variants.map((variant) => ({ id: variant.id, options: variant.options, costUsd: variant.sellPriceUsd, stock: stock[variant.id] ?? null }));
      const priced = variants.filter((variant) => variant.costUsd !== null);
      const cheapest = priced.sort((a, b) => (a.costUsd ?? 0) - (b.costUsd ?? 0))[0];
      const freight = cheapest ? await calculateCJFreight(env, cheapest.id).catch(() => []) : [];
      results.push({
        id, ok: true, name: detail.name, saleStatus: detail.saleStatus,
        minCostUsd: cheapest?.costUsd ?? detail.sellPriceUsd,
        maxCostUsd: priced.reduce((max, variant) => Math.max(max, variant.costUsd ?? 0), 0) || detail.sellPriceUsd,
        totalStock: Object.keys(stock).length ? Object.values(stock).reduce((a, b) => a + b, 0) : null,
        shipping: freight[0] ?? null,
        variants,
      });
    } catch (cause) {
      results.push({ id, ok: false, error: cause instanceof Error ? cause.message : String(cause) });
    }
  }
  return json({ results });
}
