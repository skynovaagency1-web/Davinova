/**
 * Fast-line shipping check for every product in reports/cj-check.json (cheapest variant, US + Europe).
 * Read-only: writes reports/cj-fast.json and changes nothing in the database.
 *
 * Env: SITE, ADMIN_PASSWORD (GitHub secret DAVINOVA_ADMIN_PASSWORD), LIMIT (optional), COUNTRIES (optional, default US,FR,DE,GB),
 * OUT (optional report path, default reports/cj-fast.json).
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const SITE = process.env.SITE ?? 'https://davinova.com';
const PASSWORD = process.env.ADMIN_PASSWORD ?? '';
const LIMIT = Number(process.env.LIMIT || 0);
const COUNTRIES = (process.env.COUNTRIES || 'US,FR,DE,GB').split(',').map((code) => code.trim().toUpperCase()).filter(Boolean);
const OUT = process.env.OUT || 'reports/cj-fast.json';
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type Report = { results: { siteId: string; ok: boolean; variants?: { id: string; costUsd: number | null }[] }[] };
type Answer = { vid: string; countries: Record<string, unknown> };

async function ask(vids: string[]): Promise<Answer[]> {
  for (let attempt = 0; ; attempt++) {
    const response = await fetch(SITE + '/api/admin/cj-fast', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-password': PASSWORD }, body: JSON.stringify({ vids, countries: COUNTRIES }) });
    const data = await response.json().catch(() => ({})) as { results?: Answer[]; error?: string };
    if (response.ok && data.results) return data.results;
    if (attempt >= 3) return vids.map((vid) => ({ vid, countries: { error: data.error ?? `HTTP ${response.status}` } }));
    await sleep(8000 * (attempt + 1));
  }
}

async function main() {
  if (!PASSWORD) throw new Error('Add the DAVINOVA_ADMIN_PASSWORD secret to the GitHub repository first.');
  const report = JSON.parse(readFileSync('reports/cj-check.json', 'utf8')) as Report;
  let rows = report.results.flatMap((row) => {
    const cheapest = (row.variants ?? []).filter((variant) => variant.costUsd != null).sort((a, b) => a.costUsd! - b.costUsd!)[0];
    return row.ok && cheapest ? [{ siteId: row.siteId, vid: cheapest.id }] : [];
  });
  if (LIMIT) rows = rows.slice(0, LIMIT);
  console.log(`Quoting ${rows.length} products for ${COUNTRIES.join(', ')}`);
  const results: { siteId: string; vid: string; countries: Record<string, unknown> }[] = [];
  for (let index = 0; index < rows.length; index += 5) {
    const batch = rows.slice(index, index + 5);
    const answers = await ask(batch.map((row) => row.vid));
    batch.forEach((row, i) => results.push({ ...row, countries: answers[i]?.countries ?? {} }));
    console.log(`${Math.min(index + 5, rows.length)}/${rows.length}`);
    await sleep(1000);
  }
  mkdirSync('reports', { recursive: true });
  writeFileSync(OUT, JSON.stringify({ checkedAt: new Date().toISOString(), countries: COUNTRIES, results }, null, 1));
  console.log('Done');
}

main().catch((error) => { console.error(error); process.exit(1); });
