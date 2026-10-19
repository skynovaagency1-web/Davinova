/**
 * Sends the approved price list (scripts/price-apply.json) to /api/admin/apply-prices in chunks.
 * Env: SITE, ADMIN_PASSWORD (GitHub secret DAVINOVA_ADMIN_PASSWORD).
 */
import { readFileSync } from 'node:fs';

const SITE = process.env.SITE ?? 'https://feature-3d-fashion-storefron.davinova.pages.dev';
const PASSWORD = process.env.ADMIN_PASSWORD ?? '';
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type Data = { products: unknown[]; variants: unknown[]; titles: unknown[] };

async function send(body: Partial<Data>) {
  for (let attempt = 0; ; attempt++) {
    const response = await fetch(SITE + '/api/admin/apply-prices', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-password': PASSWORD }, body: JSON.stringify(body) });
    const data = await response.json().catch(() => ({})) as { changed?: number; error?: string };
    if (response.ok) return data.changed ?? 0;
    // The first run lands while Cloudflare is still deploying this endpoint, so keep trying for a few minutes.
    if (attempt >= 15) throw new Error(data.error ?? `HTTP ${response.status}`);
    await sleep(20000);
  }
}

async function main() {
  if (!PASSWORD) throw new Error('Add the DAVINOVA_ADMIN_PASSWORD secret to the GitHub repository first.');
  const data = JSON.parse(readFileSync('scripts/price-apply.json', 'utf8')) as Data;
  let changed = 0;
  // Variants first, so a product never shows a price before its sizes are switched on.
  for (let i = 0; i < data.variants.length; i += 500) {
    changed += await send({ variants: data.variants.slice(i, i + 500) });
    console.log(`variants ${Math.min(i + 500, data.variants.length)}/${data.variants.length}`);
  }
  for (let i = 0; i < data.products.length; i += 500) {
    changed += await send({ products: data.products.slice(i, i + 500) });
    console.log(`products ${Math.min(i + 500, data.products.length)}/${data.products.length}`);
  }
  if (data.titles.length) changed += await send({ titles: data.titles });
  console.log(`Done: ${changed} rows changed`);
}

main().catch((error) => { console.error(error); process.exit(1); });
