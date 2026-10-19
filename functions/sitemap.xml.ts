interface Env { DB: D1Database; ASSETS?: { fetch: (input: Request | string) => Promise<Response> } }
import { assignmentFromStoreTags } from '../src/lib/storeCollectionTaxonomy';
import { jewelryMenu, jewelryPath } from '../src/site/shared/jewelry';

const SITE = 'https://davinova.com';
const PAGES = [
  '/', '/shop', '/categories', '/fits', '/slim', '/plus-size', '/accessories', '/couple', '/watches', '/jewelry',
  '/gift-cards', '/refer', '/about', '/shipping', '/returns', '/size-guide', '/faq', '/contact', '/privacy', '/terms',
  '/men', '/men/shop', '/men/categories', '/men/jewelry', '/men/gift-cards', '/men/refer', '/men/about',
  '/men/shipping', '/men/returns', '/men/size-guide', '/men/faq', '/men/contact',
];

/** Every shop page, category and shown product, so search engines can find them all. */
export async function onRequestGet({ env, request }: { env: Env; request: Request }): Promise<Response> {
  const cache = (globalThis as unknown as { caches?: { default: Cache } }).caches?.default;
  const cached = await cache?.match(request.url);
  if (cached) return cached;

  const shown = await shownIds(env, request);
  const { results } = await env.DB.prepare(`SELECT id,slug,department,tags_json FROM products
    WHERE active=1 AND supplier='cj' AND cj_product_id IS NOT NULL AND collection_category IN ('wedding-guest','cocktail-party','maxi-holiday')`)
    .all<{ id: string; slug: string; department: string; tags_json: string }>();
  const urls = new Set(PAGES);
  for (const dept of ['women', 'men'] as const) for (const group of jewelryMenu(dept)) for (const type of group.items) urls.add(jewelryPath(dept, type));
  for (const row of results ?? []) {
    if (shown && !shown.has(row.id)) continue;
    const men = row.department === 'men';
    urls.add(`${men ? '/men' : ''}/product/${row.slug}`);
    let tags: string[] = [];
    try { tags = JSON.parse(row.tags_json); } catch { /* no tags */ }
    const place = assignmentFromStoreTags(tags);
    if (!men && place?.collection) {
      urls.add(`/shop?category=${place.collection}`);
      if (place.subcategory) urls.add(`/shop?category=${place.collection}&sub=${place.subcategory}`);
    }
  }

  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`
    + [...urls].map((path) => `  <url><loc>${SITE}${path.replace(/&/g, '&amp;')}</loc></url>`).join('\n')
    + '\n</urlset>\n';
  const response = new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } });
  if (cache) await cache.put(request.url, response.clone());
  return response;
}

/** Ids with a passing photo in public/cutouts/manifest.json, matching what /api/catalog shows. */
async function shownIds(env: Env, request: Request): Promise<Set<string> | undefined> {
  try {
    const url = new URL('/cutouts/manifest.json', request.url).toString();
    const response = await (env.ASSETS?.fetch(url) ?? fetch(url));
    if (!response.ok) return undefined;
    const manifest = await response.json() as Record<string, string | null>;
    return new Set(Object.keys(manifest).filter((id) => typeof manifest[id] === 'string'));
  } catch {
    return undefined;
  }
}
