import { loadDiscountCode } from '../../server/offers';

/** Checks a discount code for the bag. Only the code's terms are returned; the checkout recomputes everything. */
export async function onRequestGet({ request, env }: { request: Request; env: { DB?: D1Database } }): Promise<Response> {
  const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
  if (!env.DB) return Response.json({ error: 'Offers are unavailable right now.' }, { status: 503, headers });
  const code = await loadDiscountCode(env.DB, new URL(request.url).searchParams.get('code'));
  if (!code) return Response.json({ error: 'That code is not valid.' }, { status: 404, headers });
  return Response.json({ code }, { headers });
}
