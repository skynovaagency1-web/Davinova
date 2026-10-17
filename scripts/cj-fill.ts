/**
 * Fills empty sub-categories with CJ products, dresses first.
 *
 * Runs in GitHub Actions ("Fill categories from CJ"), through the live site's own admin endpoints, so the CJ
 * key never leaves Cloudflare. For every sub-category in the owner's list that shows fewer than TARGET
 * products, it searches CJ with the sub-category's own words and imports products whose title sorts into
 * that same sub-category. The photo check (scripts/cutouts.py) runs afterwards and hides any import
 * without a flawless photo, so this imports a few extra.
 *
 * Env: SITE, ADMIN_PASSWORD (GitHub secret DAVINOVA_ADMIN_PASSWORD), TARGET (default 6), MAX_IMPORTS (default 120),
 * ONLY (optional comma-separated sub-category slugs).
 */
import { readFileSync } from 'node:fs';
import { storeCollectionGroups, suggestStoreCollection } from '../src/lib/storeCollectionTaxonomy.ts';

const SITE = process.env.SITE ?? 'https://feature-3d-fashion-storefron.davinova.pages.dev';
const PASSWORD = process.env.ADMIN_PASSWORD ?? '';
const TARGET = Number(process.env.TARGET ?? 6);
const MAX_IMPORTS = Number(process.env.MAX_IMPORTS ?? 120);
// PLUS=1 looks only for plus-size versions (titles must say so); the curvy section is then picked by eye.
const PLUS = process.env.PLUS === '1';
const PLUS_TITLE = /\b(plus[ -]size|curvy|curve)\b/i;
const ONLY = (process.env.ONLY ?? '').split(',').map((value) => value.trim()).filter(Boolean);
const DRESS_FIRST = ['weddings-and-events', 'tops-and-sets:lady-dresses', 'womens-sweaters:womens-sweater-dresses', 'womens-denim:womens-denim-dresses', 'womens-sweatshirts-hoodies:womens-sweatshirt-dresses'];
const NOT_FOR_STORE = /\b(kids?|child|children|toddler|baby|boys?|pet|dog|cat|pajamas?|pyjamas?|lingerie|costume|cosplay|halloween)\b/i;

type Search = { items: { id: string; name: string; category: string }[] };
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function admin<T>(path: string, init: RequestInit = {}): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    const response = await fetch(SITE + path, { ...init, headers: { 'Content-Type': 'application/json', 'x-admin-password': PASSWORD, ...init.headers } });
    const data = await response.json().catch(() => ({})) as T & { error?: string };
    // CJ allows about one request a second; back off and retry when it says to slow down.
    if ((response.status === 429 || response.status === 502) && attempt < 3) { await sleep(5000 * (attempt + 1)); continue; }
    if (!response.ok) throw new Error(data.error ?? `HTTP ${response.status}`);
    return data;
  }
}

async function main() {
  if (!PASSWORD) throw new Error('Add the DAVINOVA_ADMIN_PASSWORD secret to the GitHub repository first.');
  const catalog = await (await fetch(SITE + '/api/catalog?all=1')).json() as { products: { id: string; cjProductId?: string; storeCollection?: string; storeSubcategory?: string }[] };
  const manifest = JSON.parse(readFileSync('public/cutouts/manifest.json', 'utf8')) as Record<string, string | null>;
  const known = new Set(catalog.products.map((product) => product.cjProductId).filter(Boolean));
  // A product only counts once its photo passed the check (unchecked new imports count too, so re-runs don't over-import).
  const shown = (group: string, sub: string) => catalog.products.filter((product) => product.storeCollection === group && product.storeSubcategory === sub && manifest[product.id] !== null).length;

  const slots = storeCollectionGroups.flatMap((group) => group.subcategories.map((sub) => ({ group, sub })))
    .filter(({ sub }) => !ONLY.length || ONLY.includes(sub.slug))
    .sort((a, b) => rank(a.group.slug, a.sub.slug) - rank(b.group.slug, b.sub.slug));

  let imported = 0;
  const summary: string[] = [];
  for (const { group, sub } of slots) {
    if (imported >= MAX_IMPORTS) break;
    const have = PLUS ? 0 : shown(group.slug, sub.slug);
    let need = Math.max(0, TARGET - have) * 5; // extra, because the photo check hides most CJ photos
    if (!need) continue;
    let added = 0;
    const words = PLUS ? [`plus size ${sub.label.replace(/Women’s|Woman|Ladies|Lady/g, '').trim()}`, 'plus size dress', 'plus size women dress'] : [sub.label.replace(/Women’s|Woman|Ladies|Lady/g, 'women').replace(/&/g, ' ').replace(/\s+/g, ' ').trim(), ...sub.matchTerms.slice(1, 5)];
    for (const keyword of [...new Set(words)]) {
      for (let page = 1; page <= 5 && need > 0 && imported < MAX_IMPORTS; page++) {
        await sleep(1200);
        let result: Search;
        try { result = await admin<Search>(`/api/admin/cj-catalog?q=${encodeURIComponent(keyword)}&page=${page}&size=10`); }
        catch (error) { console.log(`search "${keyword}" failed: ${(error as Error).message}`); break; }
        if (!result.items.length) break;
        for (const item of result.items) {
          if (need <= 0 || imported >= MAX_IMPORTS || known.has(item.id)) continue;
          if (PLUS && !PLUS_TITLE.test(item.name)) continue;
          if (NOT_FOR_STORE.test(item.name) && sub.slug !== 'flower-girl-dresses' && group.slug !== 'couple-parent-child-clothing') continue;
          const fit = suggestStoreCollection(item.name, item.category);
          if (fit?.collection !== group.slug || fit.subcategory !== sub.slug) continue;
          await sleep(1200);
          try {
            await admin('/api/admin/cj-import', { method: 'POST', body: JSON.stringify({ productId: item.id, storeCollection: group.slug, storeSubcategory: sub.slug }) });
            known.add(item.id); imported++; added++; need--;
            console.log(`+ ${sub.label}: ${item.name}`);
          } catch (error) { console.log(`  skip ${item.id}: ${(error as Error).message}`); }
        }
      }
      if (need <= 0) break;
    }
    summary.push(`${group.label} › ${sub.label}: had ${have}, imported ${added}`);
  }
  console.log('\n' + summary.join('\n') + `\n\nImported ${imported} products.`);
}

function rank(group: string, sub: string) {
  const index = DRESS_FIRST.findIndex((key) => key === group || key === `${group}:${sub}`);
  return index === -1 ? DRESS_FIRST.length : index;
}

main().catch((error) => { console.error(error); process.exit(1); });
