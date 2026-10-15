import { getCJProductDetail, searchCJProducts, type CJEnv } from '../../../server/cj';

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

/** Read-only owner catalogue lookup. Admin password is checked by functions/_middleware.ts. */
export async function onRequestGet({ request, env }: { request: Request; env: Env }): Promise<Response> {
  if (!sameOrigin(request)) return json({ error: 'Cross-origin request blocked.' }, 403);
  const url = new URL(request.url);
  const productId = url.searchParams.get('pid')?.trim();

  try {
    if (productId) {
      const detail = await getCJProductDetail(env, productId);
      return json({ ok: true, mode: 'read_only', detail });
    }

    const keyword = (url.searchParams.get('q') ?? '').trim();
    if (keyword.length < 2 || keyword.length > 100) {
      return json({ error: 'Enter a search term between 2 and 100 characters.' }, 400);
    }
    const page = Number(url.searchParams.get('page') ?? '1');
    const size = Number(url.searchParams.get('size') ?? '10');
    const result = await searchCJProducts(env, keyword, page, size);
    return json({ ok: true, mode: 'read_only', ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 320) : 'CJ catalogue request failed.';
    return json({ error: message }, 502);
  }
}
