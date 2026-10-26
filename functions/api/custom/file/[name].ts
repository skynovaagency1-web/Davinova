import type { PrintifyEnv } from '../../../../server/printify';

/**
 * Serves a design's print file (fetched by Printify) or preview (shown to the owner and on Stripe).
 * The design id is a random UUID, so files cannot be listed or guessed.
 */
export async function onRequestGet({ params, env }: { params: { name?: string }; env: PrintifyEnv }): Promise<Response> {
  const match = /^([0-9a-f-]{36})-(print\.png|preview\.jpg)$/.exec(String(params.name || ''));
  if (!match || !env.CUSTOM_DESIGNS) return new Response('Not found', { status: 404 });
  const object = await env.CUSTOM_DESIGNS.get(`designs/${match[1]}/${match[2]}`);
  if (!object) return new Response('Not found', { status: 404 });
  return new Response(object.body, {
    headers: {
      'Content-Type': match[2].endsWith('.png') ? 'image/png' : 'image/jpeg',
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
      'X-Robots-Tag': 'noindex',
    },
  });
}
