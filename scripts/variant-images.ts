/**
 * Fills product_variants.image_url with CJ's photo for every variant, 5 products at a time.
 * Writes only image links. Env: SITE, ADMIN_PASSWORD (GitHub secret DAVINOVA_ADMIN_PASSWORD), LIMIT (optional).
 */
const SITE = process.env.SITE ?? 'https://davinova.com';
const PASSWORD = process.env.ADMIN_PASSWORD ?? '';
const LIMIT = Number(process.env.LIMIT || 0);
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  if (!PASSWORD) throw new Error('Add the DAVINOVA_ADMIN_PASSWORD secret to the GitHub repository first.');
  const catalog = await (await fetch(SITE + '/api/catalog?all=1')).json() as { products: { id: string; sizes: string[]; colourImages?: Record<string, string> }[] };
  // Only products with a colour still missing its photo, so reruns spend CJ calls on new items.
  const colours = (sizes: string[]) => new Set(sizes.filter((size) => size.includes(' / ')).map((size) => size.slice(0, size.indexOf(' / '))));
  let ids = catalog.products.filter((product) => [...colours(product.sizes)].some((colour) => !product.colourImages?.[colour])).map((product) => product.id);
  if (LIMIT) ids = ids.slice(0, LIMIT);
  console.log(`Saving variant photos for ${ids.length} products`);
  let updated = 0; let failed = 0;
  for (let index = 0; index < ids.length; index += 5) {
    const batch = ids.slice(index, index + 5);
    for (let attempt = 0; ; attempt++) {
      const response = await fetch(SITE + '/api/admin/variant-images', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-password': PASSWORD }, body: JSON.stringify({ productIds: batch }) });
      const data = await response.json().catch(() => ({})) as { results?: { ok: boolean; updated?: number }[]; error?: string };
      if (response.ok && data.results) {
        for (const result of data.results) {
          if (result.ok) updated += result.updated ?? 0;
          else failed++;
        }
        break;
      }
      if (attempt >= 3) { failed += batch.length; console.log('Batch failed:', data.error ?? response.status); break; }
      await sleep(8000 * (attempt + 1));
    }
    console.log(`${Math.min(index + 5, ids.length)}/${ids.length} · ${updated} variants updated · ${failed} products failed`);
    await sleep(1000);
  }
  console.log('Done');
}

main().catch((error) => { console.error(error); process.exit(1); });
