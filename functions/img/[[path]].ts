import { supplierImage } from '../../src/lib/imageProxy';

/**
 * Serves supplier product photos from davinova.com: fetched once, then kept in Cloudflare's edge cache for 30 days,
 * so phones load them from the nearest Cloudflare server and never see the supplier's link.
 */
export async function onRequestGet({ request, waitUntil }: { request: Request; waitUntil: (p: Promise<unknown>) => void }): Promise<Response> {
  const url = new URL(request.url);
  const source = supplierImage(url.pathname);
  if (!source) return new Response('Not found', { status: 404 });
  const cache = (caches as unknown as { default: Cache }).default;
  const key = new Request(url.origin + url.pathname, { method: 'GET' });
  const hit = await cache.match(key);
  if (hit) return hit;
  // If the supplier refuses us, send the browser to the photo directly so it still shows.
  const fallback = () => new Response(null, { status: 302, headers: { Location: source, 'Cache-Control': 'public, max-age=300' } });
  const upstream = await fetch(source, { cf: { cacheEverything: true, cacheTtl: 2592000 } } as RequestInit).catch(() => null);
  const type = upstream?.headers.get('Content-Type') ?? '';
  if (!upstream?.ok || !type.startsWith('image/')) return fallback();
  const response = new Response(upstream.body, {
    headers: {
      'Content-Type': type,
      'Cache-Control': 'public, max-age=2592000, immutable',
      'X-Content-Type-Options': 'nosniff',
      'Access-Control-Allow-Origin': '*',
    },
  });
  waitUntil(cache.put(key, response.clone()));
  return response;
}
