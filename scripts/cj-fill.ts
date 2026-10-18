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
 * ONLY (optional comma-separated sub-category slugs), MEN=1 (men's formal list), JEWELRY=1 (Jewelry & Watches list).
 */
import { readFileSync } from 'node:fs';
import { jewelryStoreCollectionGroups, menStoreCollectionGroups, storeCollectionGroups, suggestStoreCollection } from '../src/lib/storeCollectionTaxonomy.ts';

const SITE = process.env.SITE ?? 'https://feature-3d-fashion-storefron.davinova.pages.dev';
const PASSWORD = process.env.ADMIN_PASSWORD ?? '';
const TARGET = Number(process.env.TARGET ?? 6);
const MAX_IMPORTS = Number(process.env.MAX_IMPORTS ?? 120);
// PLUS=1 looks only for plus-size versions (titles must say so); the curvy section is then picked by eye.
const PLUS = process.env.PLUS === '1';
const PLUS_SEARCH = ['plus size dress', 'plus size women dress', 'plus size maxi dress', 'plus size party dress', 'plus size bodycon dress', 'plus size evening gown', 'plus size african dress', 'curvy women dress', 'plus size wedding guest dress', 'plus size mermaid dress'];
const PLUS_TITLE = /\b(plus[ -]size|curvy|curve)\b/i;
// MEN=1 fills the men's formal list instead: titles must name men and the sub-category's own garment.
const MEN = process.env.MEN === '1';
const MEN_TITLE = /\b(men|mens|men's|male|groom|groomsman|groomsmen|gentleman|gentlemen)\b/i;
const WOMEN_TITLE = /\b(women|womens|women's|woman|ladies|lady|female|girls?)\b/i;
const MEN_SEARCH: Record<string, string[]> = {
  'wedding-suits': ['men wedding suit', 'groom suit', 'men slim fit suit', 'men three piece suit'],
  'tuxedos-and-dinner-jackets': ['men tuxedo', 'men dinner jacket', 'men velvet blazer', 'men tuxedo suit'],
  'linen-and-summer-suits': ['men linen suit', 'men summer suit', 'men linen blazer', 'men beach wedding suit'],
  'blazers-and-waistcoats': ['men blazer', 'men sport coat', 'men waistcoat', 'men suit vest'],
  'dress-shirts': ['men dress shirt', 'men formal shirt', 'men tuxedo shirt', 'men slim fit shirt'],
  'ties-and-bow-ties': ['men necktie', 'men bow tie', 'men tie set pocket square', 'men silk tie'],
  'dress-shoes': ['men oxford shoes', 'men leather dress shoes', 'men loafers', 'men derby shoes'],
  'belts-and-suspenders': ['men leather belt', 'men suspenders', 'men dress belt'],
};
const MEN_FITS: Record<string, RegExp> = {
  'wedding-suits': /\bsuits?\b/i,
  'tuxedos-and-dinner-jackets': /\b(tuxedos?|dinner jackets?|smoking jackets?|velvet (blazer|suit)s?)\b/i,
  'linen-and-summer-suits': /\blinen\b.*\b(suits?|blazers?)\b|\b(suits?|blazers?)\b.*\blinen\b/i,
  'blazers-and-waistcoats': /\b(blazers?|sport coats?|suit jackets?|waistcoats?|suit vests?|vests?)\b/i,
  'dress-shirts': /\b(dress|formal|tuxedo|business|office) shirts?\b|\bshirts?\b.*\b(formal|business|wedding)\b/i,
  'ties-and-bow-ties': /\b(neck ?ties?|bow ?ties?|ties?|pocket squares?|cravats?)\b/i,
  'dress-shoes': /\b(oxfords?|loafers?|brogues?|derby|dress shoes|leather shoes|formal shoes)\b/i,
  'belts-and-suspenders': /\b(belts?|suspenders?|braces)\b/i,
};
// Accessories that only borrow a word (tie clips belong with cufflinks; shoe care is not shoes).
const NOT_ACCESSORY = /\b(tie ?(clip|bar|pin)s?|cufflinks?|shoe ?(polish|brush|horn|tree|lace)s?|insoles?|belt ?buckles? only|seat ?belt|sneakers?|sandals?|slippers?|boots?)\b/i;
// Casual pieces that only borrow the word "suit".
const NOT_TAILORING = /\b(tracksuit|sweatsuit|swimsuit|jogging|sports? suit|pajama|hoodie|sweat|shorts? suit|t-?shirt)\b/i;
// JEWELRY=1 fills Jewelry & Watches for both shops: titles must name the piece, and men's pieces must not say women.
const JEWELRY = process.env.JEWELRY === '1';
const JEWELRY_SEARCH: Record<string, string[]> = {
  'bridal-sets': ['bridal jewelry set', 'wedding jewelry set necklace earrings', 'rhinestone bridal necklace set'],
  'wedding-hair': ['bridal tiara', 'wedding crown', 'bridal hair comb', 'bridal hairpin pearl'],
  'engagement-rings': ['engagement ring', 'moissanite engagement ring', 'zircon engagement ring', 'wedding ring women'],
  fashion: ['statement earrings', 'statement necklace women', 'gold hoop earrings', 'women bracelet fashion'],
  fine: ['925 sterling silver necklace women', 'pearl earrings', '18k gold necklace women', 'sterling silver earrings'],
  'womens-watches': ['women watch', 'ladies quartz watch', 'women bracelet watch', 'ladies gold watch'],
  'mens-wedding-bands': ['men wedding band', 'men tungsten ring', 'men titanium ring', 'men wedding ring'],
  cufflinks: ['cufflinks', 'tie clip', 'cufflinks tie clip set'],
  'mens-chains-bracelets': ['men chain necklace', 'men cuban chain', 'men bracelet stainless steel', 'men beaded bracelet'],
  'mens-watches': ['men watch', 'men quartz watch', 'men luxury watch', 'men chronograph watch'],
};
const JEWELRY_FITS: Record<string, RegExp> = {
  'bridal-sets': /\b(bridal|wedding|bride)\b.*\b(sets?|necklace)\b|\b(sets?|necklace)\b.*\b(bridal|wedding|bride)\b/i,
  'wedding-hair': /\b(tiaras?|crowns?|hair ?(comb|pin|clip|vine|band)s?|hairpins?|headpieces?)\b/i,
  'engagement-rings': /\b(engagement|wedding|proposal|moissanite|solitaire)\b.*\brings?\b|\brings?\b.*\b(engagement|wedding|proposal)\b/i,
  fashion: /\b(earrings?|necklaces?|bracelets?|bangles?|pendants?|chokers?)\b/i,
  fine: /\b(925|sterling|18k|14k|solid gold|pearls?|moissanite)\b/i,
  'womens-watches': /\bwatch(es)?\b/i,
  'mens-wedding-bands': /\brings?\b|\bbands?\b/i,
  cufflinks: /\b(cuff ?links?|tie (clip|bar|pin)s?)\b/i,
  'mens-chains-bracelets': /\b(chains?|bracelets?|necklaces?)\b/i,
  'mens-watches': /\bwatch(es)?\b/i,
};
const MEN_PIECES = ['mens-wedding-bands', 'mens-chains-bracelets', 'mens-watches'];
// Things that share jewelry words but are not jewelry (or are for kids, pets, phones).
const NOT_JEWELRY = /\b(smart ?watch|watch ?band|watch ?strap|phone ?case|jewelry ?box|storage|display|stand|organizer|holder|tool|kit|beads? for|diy|keychain|key ?ring|nose|belly|tattoo|smart)\b/i;
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

  const slots = (JEWELRY ? jewelryStoreCollectionGroups : MEN ? menStoreCollectionGroups : storeCollectionGroups).flatMap((group) => group.subcategories.map((sub) => ({ group, sub })))
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
    const words = JEWELRY ? JEWELRY_SEARCH[sub.slug] ?? [sub.label] : MEN ? MEN_SEARCH[sub.slug] ?? [sub.label] : PLUS ? [`plus size ${sub.label.replace(/Women’s|Woman|Ladies|Lady/g, '').trim()}`, ...PLUS_SEARCH] : [sub.label.replace(/Women’s|Woman|Ladies|Lady/g, 'women').replace(/&/g, ' ').replace(/\s+/g, ' ').trim(), ...sub.matchTerms.slice(1, 5)];
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
          if (JEWELRY) {
            if (NOT_JEWELRY.test(item.name) || !JEWELRY_FITS[sub.slug]?.test(item.name)) continue;
            if (MEN_PIECES.includes(sub.slug) && (!MEN_TITLE.test(item.name) || WOMEN_TITLE.test(item.name))) continue;
            if (sub.slug.startsWith('womens') && MEN_TITLE.test(item.name) && !WOMEN_TITLE.test(item.name)) continue;
          } else if (MEN) {
            if (!MEN_TITLE.test(item.name) || WOMEN_TITLE.test(item.name) || NOT_TAILORING.test(item.name) || NOT_ACCESSORY.test(item.name) || !MEN_FITS[sub.slug]?.test(item.name)) continue;
            // A tuxedo or linen suit belongs in its own sub-category, not under wedding suits.
            if (sub.slug === 'wedding-suits' && (MEN_FITS['tuxedos-and-dinner-jackets'].test(item.name) || /\blinen\b/i.test(item.name))) continue;
          } else {
            const fit = suggestStoreCollection(item.name, item.category);
            if (fit?.collection !== group.slug || fit.subcategory !== sub.slug) continue;
          }
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
