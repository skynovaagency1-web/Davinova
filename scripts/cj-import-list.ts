/**
 * Imports CJ products picked by eye (scripts/cj-import-list.json: [{ id, collection, subcategory }]) through the
 * live site's admin endpoint, then the workflow runs the photo check. Products already in the shop are skipped.
 * Env: SITE, ADMIN_PASSWORD (GitHub secret DAVINOVA_ADMIN_PASSWORD).
 */
import { readFileSync } from 'node:fs';

const SITE = process.env.SITE ?? 'https://davinova.com';
const PASSWORD = process.env.ADMIN_PASSWORD ?? '';
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  if (!PASSWORD) throw new Error('Add the DAVINOVA_ADMIN_PASSWORD secret to the GitHub repository first.');
  const picks = JSON.parse(readFileSync('scripts/cj-import-list.json', 'utf8')) as { id: string; collection: string; subcategory: string }[];
  const catalog = await (await fetch(SITE + '/api/catalog?all=1')).json() as { products: { cjProductId?: string }[] };
  const known = new Set(catalog.products.map((product) => product.cjProductId).filter(Boolean));
  let imported = 0;
  for (const pick of picks) {
    if (known.has(pick.id)) continue;
    for (let attempt = 0; attempt < 4; attempt++) {
      await sleep(1500 + attempt * 5000);
      const response = await fetch(SITE + '/api/admin/cj-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-password': PASSWORD },
        body: JSON.stringify({ productId: pick.id, storeCollection: pick.collection, storeSubcategory: pick.subcategory }),
      });
      // CJ allows about one request a second; back off and retry when it says to slow down.
      if ((response.status === 429 || response.status === 502) && attempt < 3) continue;
      const data = await response.json().catch(() => ({})) as { error?: string };
      if (response.ok) { imported++; console.log(`+ ${pick.subcategory}: ${pick.id}`); }
      else console.log(`  skip ${pick.id}: ${data.error ?? response.status}`);
      break;
    }
  }
  console.log(`\nImported ${imported} of ${picks.length} picks.`);
}

main().catch((error) => { console.error(error); process.exit(1); });
