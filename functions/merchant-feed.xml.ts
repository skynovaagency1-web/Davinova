import { cleanSupplierText } from '../src/lib/productText';
interface Env { DB: D1Database; ASSETS?: { fetch: (input: Request | string) => Promise<Response> } }

const SITE = 'https://davinova.com';

/**
 * Product feed for Google Merchant Center (free listings in Google Shopping and the Products tab).
 * Only priced products whose photo passed the check, the same ones the shop shows.
 */
export async function onRequestGet({ env, request }: { env: Env; request: Request }): Promise<Response> {
  const cache = (globalThis as unknown as { caches?: { default: Cache } }).caches?.default;
  const cached = await cache?.match(request.url);
  if (cached) return cached;

  const manifest = await loadManifest(env, request);
  const { results } = await env.DB.prepare(`SELECT p.id, p.slug, p.title, p.description, p.price_cents, p.compare_at_cents, p.currency, p.department,
      (SELECT url FROM product_images i WHERE i.product_id = p.id ORDER BY i.is_primary DESC, i.position LIMIT 1) AS image,
      (SELECT COUNT(*) FROM product_variants v WHERE v.product_id = p.id AND v.active = 1) AS variants
    FROM products p WHERE p.active = 1 AND p.price_cents > 0`)
    .all<{ id: string; slug: string; title: string; description: string; price_cents: number; compare_at_cents: number | null; currency: string; department: string; image: string | null; variants: number }>();

  const esc = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const plain = (html: string) => cleanSupplierText(html.replace(/<[^>]*>/g, ' '));
  const items = (results ?? []).filter((row) => row.image && (!manifest || typeof manifest[row.id] === 'string')).map((row) => {
    const link = `${SITE}${row.department === 'men' ? '/men' : ''}/product/${encodeURIComponent(row.slug)}`;
    const currency = row.currency || 'USD';
    const price = `${(row.price_cents / 100).toFixed(2)} ${currency}`;
    const onSale = row.compare_at_cents && row.compare_at_cents > row.price_cents;
    return `<item>
<g:id>${esc(row.id)}</g:id>
<title>${esc(row.title.slice(0, 150))}</title>
<description>${esc((plain(row.description) || row.title).slice(0, 4900))}</description>
<link>${esc(link)}</link>
<g:image_link>${esc(row.image as string)}</g:image_link>
<g:availability>${row.variants > 0 ? 'in_stock' : 'out_of_stock'}</g:availability>
<g:price>${onSale ? `${((row.compare_at_cents as number) / 100).toFixed(2)} ${currency}` : price}</g:price>${onSale ? `\n<g:sale_price>${price}</g:sale_price>` : ''}
<g:brand>Davinova</g:brand>
<g:condition>new</g:condition>
<g:identifier_exists>no</g:identifier_exists>
<g:gender>${row.department === 'men' ? 'male' : 'female'}</g:gender>
<g:age_group>adult</g:age_group>
<g:shipping><g:country>US</g:country><g:price>0.00 ${currency}</g:price></g:shipping>
</item>`;
  });
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
<channel>
<title>Davinova</title>
<link>${SITE}</link>
<description>Davinova products</description>
${items.join('\n')}
</channel>
</rss>
`;
  const response = new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } });
  if (cache) await cache.put(request.url, response.clone());
  return response;
}

async function loadManifest(env: Env, request: Request): Promise<Record<string, string | null> | undefined> {
  try {
    const url = new URL('/cutouts/manifest.json', request.url).toString();
    const response = await (env.ASSETS?.fetch(url) ?? fetch(url));
    return response.ok ? await response.json() as Record<string, string | null> : undefined;
  } catch {
    return undefined;
  }
}
