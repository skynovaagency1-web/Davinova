/**
 * Plain HTML put inside <div id="root"> before the page leaves the server: the page's heading, its text and
 * real links to its products and categories. Search engines read it without running the app, so they can
 * find and judge every page; the app replaces it as soon as it starts, so shoppers only see it for a moment.
 */
import type { PageSeo } from './seo';
import { cleanTitle } from '../src/lib/productText';
import { assignmentFromStoreTags, menStoreCollectionGroups, storeCollectionGroups, JEWELRY_COLLECTION } from '../src/lib/storeCollectionTaxonomy';
import { JEWELRY_TYPES, jewelryMenu, jewelryPath, type JewelryType } from '../src/site/shared/jewelry';

interface Env { DB?: D1Database; ASSETS?: { fetch: (input: Request | string) => Promise<Response> } }
interface Item { id: string; slug: string; title: string; price: number; men: boolean; collection?: string; sub?: string }

const LIST_SIZE = 60;
const RELATED_SIZE = 16;
const INDEX_TTL_MS = 15 * 60 * 1000;
let index: { at: number; items: Item[] } | undefined;

const esc = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;

/** Every product the shop shows (active, priced, with a passing photo), kept for 15 minutes per server. */
async function products(env: Env, origin: string): Promise<Item[]> {
  if (index && Date.now() - index.at < INDEX_TTL_MS) return index.items;
  if (!env.DB) return [];
  const [rows, shown] = await Promise.all([
    env.DB.prepare(`SELECT id,slug,title,price_cents,department,tags_json FROM products
      WHERE active=1 AND supplier='cj' AND cj_product_id IS NOT NULL AND price_cents > 0 ORDER BY id`)
      .all<{ id: string; slug: string; title: string; price_cents: number; department: string; tags_json: string }>(),
    shownIds(env, origin),
  ]);
  const items: Item[] = [];
  for (const row of rows.results ?? []) {
    if (shown && !shown.has(row.id)) continue;
    let tags: string[] = [];
    try { tags = JSON.parse(row.tags_json); } catch { /* no tags */ }
    const place = assignmentFromStoreTags(tags);
    items.push({ id: row.id, slug: row.slug, title: cleanTitle(row.title), price: row.price_cents, men: row.department === 'men', collection: place?.collection, sub: place?.subcategory });
  }
  index = { at: Date.now(), items };
  return items;
}

async function shownIds(env: Env, origin: string): Promise<Set<string> | undefined> {
  try {
    const url = new URL('/cutouts/manifest.json', origin).toString();
    const response = await (env.ASSETS?.fetch(url) ?? fetch(url));
    if (!response.ok) return undefined;
    const manifest = await response.json() as Record<string, string | null>;
    return new Set(Object.keys(manifest).filter((id) => typeof manifest[id] === 'string'));
  } catch {
    return undefined;
  }
}

/** The products a page lists, or none for pages that aren't product lists. */
function pick(items: Item[], bare: string, params: URLSearchParams): Item[] {
  const women = items.filter((item) => !item.men);
  const men = items.filter((item) => item.men);
  if (bare === '/shop' && params.get('category')) {
    const sub = params.get('sub');
    return women.filter((item) => item.collection === params.get('category') && (!sub || item.sub === sub));
  }
  if (bare === '/men/shop' && params.get('cat')) return men.filter((item) => item.sub === params.get('cat'));
  if (bare === '/' || bare === '/shop' || bare === '/looks' || bare === '/fits' || bare === '/slim') return women.filter((item) => item.collection !== JEWELRY_COLLECTION);
  if (bare === '/men' || bare === '/men/shop' || bare === '/men/looks') return men.filter((item) => item.collection !== JEWELRY_COLLECTION);
  if (bare === '/watches') return women.filter((item) => /watch/i.test(item.title));
  if (bare === '/accessories') return women.filter((item) => item.collection === 'accessories');
  if (bare === '/couple') return women.filter((item) => item.collection === 'couple-parent-child-clothing');
  const jewelry = bare.match(/^\/(men\/)?jewelry(?:\/([^/]+))?$/);
  if (jewelry) {
    const pool = (jewelry[1] ? men : women).filter((item) => item.collection === JEWELRY_COLLECTION);
    const type = jewelry[2];
    return type ? pool.filter((item) => item.sub === type) : pool;
  }
  return [];
}

/** Spread the list across categories instead of showing only the first one. */
function mix(items: Item[], size: number): Item[] {
  const byCategory = new Map<string, Item[]>();
  for (const item of items) {
    const key = `${item.collection}/${item.sub}`;
    byCategory.set(key, [...(byCategory.get(key) ?? []), item]);
  }
  const queues = [...byCategory.values()];
  const out: Item[] = [];
  while (out.length < size && queues.some((queue) => queue.length)) {
    for (const queue of queues) if (queue.length && out.length < size) out.push(queue.shift()!);
  }
  return out;
}

export async function prerenderHtml(env: Env, url: URL, lang: string, bare: string, seo: PageSeo | null): Promise<string> {
  const pre = lang === 'en' ? '' : `/${lang}`;
  const href = (path: string) => esc(`${pre}${pre && path === '/' ? '' : path}`);
  const link = (path: string, label: string) => `<a href="${href(path)}">${esc(label)}</a>`;
  const isMen = bare === '/men' || bare.startsWith('/men/');

  let items: Item[] = [];
  try { items = await products(env, url.origin); } catch { items = []; }

  const nav = isMen
    ? [['/men', 'Men'], ['/men/shop', 'Shop all'], ['/men/categories', 'Categories'], ['/men/looks', 'New fashion'], ['/men/jewelry', 'Jewelry & watches'], ['/men/custom', 'Custom'], ['/', 'Women']]
    : [['/', 'Women'], ['/shop', 'Shop all'], ['/categories', 'Categories'], ['/looks', 'New fashion'], ['/jewelry', 'Jewelry'], ['/watches', 'Watches'], ['/beauty', 'Beauty'], ['/accessories', 'Accessories'], ['/plus-size', 'Plus size'], ['/custom', 'Custom'], ['/men', 'Men']];
  const help = isMen
    ? [['/men/about', 'About'], ['/men/shipping', 'Shipping'], ['/men/returns', 'Returns'], ['/men/size-guide', 'Size guide'], ['/men/faq', 'FAQ'], ['/men/contact', 'Contact'], ['/men/gift-cards', 'Gift cards']]
    : [['/about', 'About'], ['/shipping', 'Shipping'], ['/returns', 'Returns'], ['/size-guide', 'Size guide'], ['/faq', 'FAQ'], ['/contact', 'Contact'], ['/gift-cards', 'Gift cards'], ['/privacy', 'Privacy'], ['/terms', 'Terms']];

  const heading = (seo?.title ?? 'Davinova').replace(/\s+—\s+Davinova.*$/, '') || 'Davinova';
  const parts: string[] = [];
  parts.push(`<nav aria-label="Shop">${nav.map(([path, label]) => link(path, label)).join(' · ')}</nav>`);
  parts.push(`<h1>${esc(heading)}</h1>`);
  if (seo?.description) parts.push(`<p>${esc(seo.description)}</p>`);

  const product = bare.match(/^\/(?:men\/)?product\/([^/]+)$/);
  if (product && seo?.type === 'product') {
    const offer = (seo.jsonLd[0] as { offers?: { price?: string; availability?: string } }).offers;
    if (offer?.price) parts.push(`<p>Price: $${esc(offer.price)}${offer.availability?.endsWith('InStock') ? ' · In stock' : ''} · Free tracked shipping</p>`);
    parts.push(`<img src="${esc(seo.image)}" alt="${esc(heading)}" width="480" loading="eager" />`);
    const self = items.find((item) => item.slug === decodeURIComponent(product[1]));
    if (self) {
      const group = (self.men ? menStoreCollectionGroups : storeCollectionGroups).find((item) => item.slug === self.collection);
      const sub = group?.subcategories.find((item) => item.slug === self.sub);
      const crumbs = [link(self.men ? '/men' : '/', self.men ? 'Men' : 'Women')];
      if (group && !self.men) crumbs.push(link(`/shop?category=${group.slug}`, group.label));
      if (sub) crumbs.push(link(self.men ? `/men/shop?cat=${sub.slug}` : `/shop?category=${group!.slug}&sub=${sub.slug}`, sub.label));
      parts.push(`<p>${crumbs.join(' › ')}</p>`);
      const related = items.filter((item) => item.id !== self.id && item.men === self.men && item.collection === self.collection && (!self.sub || item.sub === self.sub));
      if (related.length) parts.push(`<h2>You may also like</h2>${list(related.slice(0, RELATED_SIZE))}`);
    }
  } else {
    const listed = pick(items, bare, url.searchParams);
    if (listed.length) parts.push(`<h2>${listed.length} ${listed.length === 1 ? 'piece' : 'pieces'}</h2>${list(mix(listed, LIST_SIZE))}`);
  }

  // Category links: every shown women's category and sub-category, or the men's ones.
  const present = new Set(items.filter((item) => item.men === isMen).map((item) => `${item.collection}/${item.sub ?? ''}`));
  const hasGroup = (slug: string) => [...present].some((key) => key.startsWith(`${slug}/`));
  const categories: string[] = [];
  if (isMen) {
    for (const group of menStoreCollectionGroups) for (const sub of group.subcategories) if (present.has(`${group.slug}/${sub.slug}`)) categories.push(link(`/men/shop?cat=${sub.slug}`, sub.label));
  } else {
    for (const group of storeCollectionGroups) {
      if (!hasGroup(group.slug) || group.slug === JEWELRY_COLLECTION) continue;
      categories.push(link(`/shop?category=${group.slug}`, group.label));
      for (const sub of group.subcategories) if (present.has(`${group.slug}/${sub.slug}`)) categories.push(link(`/shop?category=${group.slug}&sub=${sub.slug}`, sub.label));
    }
  }
  for (const group of jewelryMenu(isMen ? 'men' : 'women')) for (const type of group.items) categories.push(link(jewelryPath(isMen ? 'men' : 'women', type), JEWELRY_TYPES[type as JewelryType].label));
  if (categories.length) parts.push(`<h2>Categories</h2><p>${categories.join(' · ')}</p>`);
  parts.push(`<footer><p>${help.map(([path, label]) => link(path, label)).join(' · ')}</p></footer>`);

  return `<style>.dv-prerender a{color:#CDB69E}.dv-prerender img{max-width:100%;height:auto}</style><div class="dv-prerender" style="max-width:960px;margin:0 auto;padding:24px 16px;color:#FBF1E2;background:#2E2019;font:14px/1.6 'DM Sans',system-ui,sans-serif">${parts.join('')}</div>`;

  function list(rows: Item[]): string {
    return `<ul>${rows.map((item) => `<li>${link(`${item.men ? '/men' : ''}/product/${encodeURIComponent(item.slug)}`, item.title)} — ${money(item.price)}</li>`).join('')}</ul>`;
  }
}
