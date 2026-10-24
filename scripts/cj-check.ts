/**
 * Checks every product shown on the site against CJ: live cost, variants, stock and cheapest US shipping.
 * Read-only: it writes reports/cj-check.json and reports/cj-check.csv and changes nothing in the database.
 *
 * Env: SITE, ADMIN_PASSWORD (GitHub secret DAVINOVA_ADMIN_PASSWORD), LIMIT (optional, for a trial run).
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const SITE = process.env.SITE ?? 'https://feature-3d-fashion-storefron.davinova.pages.dev';
const PASSWORD = process.env.ADMIN_PASSWORD ?? '';
const LIMIT = Number(process.env.LIMIT || 0);
// RETRY=1 rechecks only the rows of the last report that failed or came back without stock or shipping.
const RETRY = process.env.RETRY === '1';
// UNPRICED=1 checks only products that still have no price (new imports); OUT picks the report path.
const UNPRICED = process.env.UNPRICED === '1';
const OUT = process.env.OUT || 'reports/cj-check.json';
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type Row = { id: string; ok: boolean; error?: string; name?: string; saleStatus?: string; minCostUsd?: number | null; maxCostUsd?: number | null;
  totalStock?: number | null; shipping?: { name: string; priceUsd: number; days: string } | null; variants?: { options: string; costUsd: number | null; stock: number | null }[] };

async function check(ids: string[]): Promise<Row[]> {
  for (let attempt = 0; ; attempt++) {
    const response = await fetch(SITE + '/api/admin/cj-check', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-password': PASSWORD }, body: JSON.stringify({ productIds: ids }) });
    const data = await response.json().catch(() => ({})) as { results?: Row[]; error?: string };
    if (response.ok && data.results) return data.results;
    if (attempt >= 3) return ids.map((id) => ({ id, ok: false, error: data.error ?? `HTTP ${response.status}` }));
    await sleep(8000 * (attempt + 1));
  }
}

const csv = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;

async function main() {
  if (!PASSWORD) throw new Error('Add the DAVINOVA_ADMIN_PASSWORD secret to the GitHub repository first.');
  const catalog = await (await fetch(SITE + '/api/catalog?all=1')).json() as { products: { id: string; title: string; priceCents?: number; cjProductId?: string; department?: string; storeCollection?: string; storeSubcategory?: string }[] };
  const manifest = JSON.parse(readFileSync('public/cutouts/manifest.json', 'utf8')) as Record<string, string | null>;
  let shown = catalog.products.filter((product) => product.cjProductId && typeof manifest[product.id] === 'string');
  const previous = RETRY ? (JSON.parse(readFileSync(OUT, 'utf8')) as { results: (Row & { siteId: string })[] }).results : [];
  if (RETRY) {
    const redo = new Set(previous.filter((row) => !row.ok || row.totalStock == null || !row.shipping).map((row) => row.siteId));
    shown = shown.filter((product) => redo.has(product.id));
  }
  if (UNPRICED) shown = shown.filter((product) => !product.priceCents);
  if (LIMIT) shown = shown.slice(0, LIMIT);
  console.log(`Checking ${shown.length} products shown on the site`);

  const results: (Row & { siteId: string; title: string; department?: string; collection?: string; sub?: string })[] = [];
  for (let index = 0; index < shown.length; index += 5) {
    const batch = shown.slice(index, index + 5);
    const rows = await check(batch.map((product) => product.cjProductId!));
    await sleep(1500);
    rows.forEach((row, i) => results.push({ ...row, siteId: batch[i].id, title: batch[i].title, department: batch[i].department, collection: batch[i].storeCollection, sub: batch[i].storeSubcategory }));
    console.log(`${Math.min(index + 5, shown.length)}/${shown.length}`);
  }

  if (RETRY) {
    const fresh = new Map(results.map((row) => [row.siteId, row]));
    const merged = previous.map((row) => fresh.get(row.siteId) ?? row) as typeof results;
    results.length = 0; results.push(...merged);
  }
  mkdirSync('reports', { recursive: true });
  writeFileSync(OUT, JSON.stringify({ checkedAt: new Date().toISOString(), results }, null, 1));
  const header = ['site_id', 'title', 'department', 'collection', 'sub', 'ok', 'error', 'cj_status', 'min_cost_usd', 'max_cost_usd', 'total_stock', 'variants', 'variants_in_stock', 'options', 'ship_usd', 'ship_days', 'ship_method', 'landed_usd'];
  const lines = results.map((row) => {
    const inStock = (row.variants ?? []).filter((variant) => (variant.stock ?? 0) > 0).length;
    const landed = row.minCostUsd != null && row.shipping ? (row.minCostUsd + row.shipping.priceUsd).toFixed(2) : '';
    return [row.siteId, row.title, row.department, row.collection, row.sub, row.ok, row.error, row.saleStatus, row.minCostUsd, row.maxCostUsd, row.totalStock,
      row.variants?.length ?? '', inStock, (row.variants ?? []).map((variant) => variant.options).join(' | '), row.shipping?.priceUsd, row.shipping?.days, row.shipping?.name, landed].map(csv).join(',');
  });
  writeFileSync(OUT.replace(/\.json$/, '.csv'), [header.join(','), ...lines].join('\n') + '\n');
  const failed = results.filter((row) => !row.ok).length;
  const empty = results.filter((row) => row.ok && row.totalStock === 0).length;
  console.log(`Done: ${results.length} checked, ${failed} failed, ${empty} out of stock`);
}

main().catch((error) => { console.error(error); process.exit(1); });
