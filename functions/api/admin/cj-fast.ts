import { calculateCJFreight, pickFastLine, type CJEnv } from '../../../server/cj';

interface Context { request: Request; env: CJEnv }

function json(data: unknown, status = 200): Response {
  return Response.json(data, { status, headers: { 'Cache-Control': 'no-store, max-age=0', 'X-Content-Type-Options': 'nosniff' } });
}

/**
 * Read-only: cheapest and fast-line (7 days or less) shipping for up to 5 CJ variants in up to 4 countries.
 * scripts/cj-fast.ts collects the answers into reports/cj-fast.json for the express price list.
 */
export async function onRequestPost({ request, env }: Context): Promise<Response> {
  let body: { vids?: unknown; countries?: unknown };
  try { body = await request.json() as typeof body; } catch { return json({ error: 'Send a valid JSON request.' }, 400); }
  const vids = Array.isArray(body.vids) ? body.vids.filter((id): id is string => typeof id === 'string' && /^[a-zA-Z0-9-]{1,200}$/.test(id)).slice(0, 5) : [];
  const countries = Array.isArray(body.countries) ? body.countries.filter((code): code is string => typeof code === 'string' && /^[A-Z]{2}$/.test(code)).slice(0, 4) : [];
  if (!vids.length || !countries.length) return json({ error: 'Send vids (up to 5) and countries (up to 4 two-letter codes).' }, 400);

  const results = [];
  for (const vid of vids) {
    const byCountry: Record<string, unknown> = {};
    for (const country of countries) {
      try {
        const options = await calculateCJFreight(env, vid, country);
        byCountry[country] = { cheapest: options[0] ?? null, fast: pickFastLine(options) };
      } catch (cause) {
        byCountry[country] = { error: cause instanceof Error ? cause.message : String(cause) };
      }
    }
    results.push({ vid, countries: byCountry });
  }
  return json({ results });
}
