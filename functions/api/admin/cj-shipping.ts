import { calculateCJEUFreight, type CJEnv } from '../../../server/cj';

type Env = CJEnv & { ADMIN_PASSWORD?: string };

function json(data: unknown, status = 200): Response {
  return Response.json(data, {
    status,
    headers: {
      'Cache-Control': 'no-store, max-age=0',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

function sameOrigin(request: Request): boolean {
  const origin = request.headers.get('Origin');
  return !origin || origin === new URL(request.url).origin;
}

/** Read-only freight estimate. No product or order data is written. */
export async function onRequestGet({ request, env }: { request: Request; env: Env }): Promise<Response> {
  if (!sameOrigin(request)) return json({ error: 'Cross-origin request blocked.' }, 403);
  const url = new URL(request.url);
  const variantId = (url.searchParams.get('vid') ?? '').trim();
  const source = (url.searchParams.get('origin') ?? 'CN').trim().toUpperCase();
  const destination = (url.searchParams.get('country') ?? '').trim().toUpperCase();
  const quantity = Number(url.searchParams.get('quantity') ?? '1');
  const zip = (url.searchParams.get('zip') ?? '').trim();

  if (!/^[A-Z]{2}$/.test(destination)) return json({ error: 'Choose a valid two-letter destination country code.' }, 400);
  try {
    const result = await calculateCJEUFreight(env, variantId, source, destination, quantity, zip);
    return json({ ok: true, mode: 'read_only', ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 320) : 'CJ freight quote failed.';
    return json({ error: message }, 502);
  }
}
