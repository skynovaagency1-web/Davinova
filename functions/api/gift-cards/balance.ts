import { loadGiftCard } from '../../../server/giftCards';

/** Gift card balance for the bag and the gift card page. */
export async function onRequestGet({ request, env }: { request: Request; env: { DB?: D1Database } }): Promise<Response> {
  const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
  if (!env.DB) return Response.json({ error: 'Gift cards are unavailable right now.' }, { status: 503, headers });
  const card = await loadGiftCard(env.DB, new URL(request.url).searchParams.get('code')).catch(() => null);
  if (!card) return Response.json({ error: 'That gift card is not valid or has no balance left.' }, { status: 404, headers });
  return Response.json({ gift: { code: card.code, balanceCents: card.balanceCents } }, { headers });
}
