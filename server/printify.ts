import { rewardReferrer } from './giftCards';
import { bundlePieces, CUSTOM_PRODUCTS, customProduct, type CustomColor, type CustomProduct, type CustomProductKey, type PrintableKey } from '../src/lib/customDesign';
import { sendTransactionalEmail } from './email';

/**
 * Printify: prints customers' own designs per order. Nothing is bought until the owner
 * approves the paid order, like CJ orders. Needs the PRINTIFY_API_TOKEN secret and the
 * CUSTOM_DESIGNS R2 bucket (print files are served from /api/custom/file/... for Printify to fetch).
 */
export interface PrintifyEnv {
  DB: D1Database;
  CUSTOM_DESIGNS?: R2Bucket;
  PRINTIFY_API_TOKEN?: string;
  PRINTIFY_SHOP_ID?: string;
  SITE_URL?: string;
  DRY_RUN?: string;
  RESEND_API_KEY?: string;
  EMAIL_FROM?: string;
  [key: string]: unknown;
}

const API = 'https://api.printify.com/v1';

/** Printify catalogue titles to look for, best first. PRINTIFY_BLUEPRINT_TEE etc. override them. */
const BLUEPRINT_TITLES: Record<PrintableKey, RegExp[]> = {
  tee: [/^unisex jersey short sleeve tee$/i, /jersey short sleeve tee/i],
  hoodie: [/^unisex heavy blend.{0,3} hooded sweatshirt$/i, /heavy blend.*hooded sweatshirt/i],
  tote: [/^cotton tote bag$/i, /^cotton tote$/i, /^tote bag$/i],
  mug: [/^ceramic mug,? \(?11oz\)?$/i, /^ceramic mug.*11\s?oz/i, /^accent coffee mug.*11\s?oz/i],
  cap: [/^trucker caps$/i, /trucker cap/i],
  joggers: [/^unisex sweatpants$/i, /heavy blend.*sweatpants/i],
};
/** Printify catalogue ids picked by hand (2026-10-28): OTTO Trucker Caps (printed, DTF) and Gildan Unisex Sweatpants (DTG). */
const DEFAULT_BLUEPRINT: Partial<Record<PrintableKey, number>> = { cap: 1128, joggers: 1398 };

interface CatalogVariant { id: number; color: string; size: string }
export interface PrintifyCatalog {
  productKey: PrintableKey; blueprintId: number; printProviderId: number; title: string;
  variants: CatalogVariant[]; front: { width: number; height: number } | null;
}
interface ApiVariant { id: number; options?: Record<string, string>; placeholders?: { position: string; width: number; height: number }[] }

export function isPrintifyDryRun(env: PrintifyEnv): boolean {
  return (env.DRY_RUN ?? 'true').trim().toLowerCase() !== 'false';
}

async function api<T>(env: PrintifyEnv, path: string, init: RequestInit = {}): Promise<T> {
  if (!env.PRINTIFY_API_TOKEN) throw new Error('PRINTIFY_API_TOKEN is not set.');
  const response = await fetch(API + path, {
    ...init,
    headers: { Authorization: 'Bearer ' + env.PRINTIFY_API_TOKEN, 'User-Agent': 'Davinova', 'Content-Type': 'application/json', Accept: 'application/json', ...(init.headers || {}) },
  });
  const text = await response.text();
  if (!response.ok) throw new Error('Printify ' + response.status + ' on ' + path.split('?')[0] + ': ' + text.slice(0, 240));
  return (text ? JSON.parse(text) : {}) as T;
}

/** What still has to be switched on before customers can order, or null when ready. */
export function customSetupProblem(env: PrintifyEnv): string | null {
  if (!env.CUSTOM_DESIGNS) return 'Design uploads are not switched on yet (R2 bucket CUSTOM_DESIGNS).';
  if (!env.PRINTIFY_API_TOKEN) return 'Printify is not connected yet (PRINTIFY_API_TOKEN).';
  return null;
}

function norm(value: string | undefined): string { return (value || '').trim().toLowerCase(); }

/** Our colour name against Printify's: exact first, then a two-tone name that starts with it ("Black/White" for Black). */
function colorScore(theirs: string | undefined, ours: string): number {
  if (!theirs) return 1;
  if (norm(theirs) === norm(ours)) return 2;
  return norm(theirs).split('/')[0].trim() === norm(ours) ? 1 : 0;
}

/** Every colour a printable piece is sold in: its own, plus those of the bundles it is part of. */
function colorsFor(key: PrintableKey): CustomColor[] {
  const all = [...customProduct(key)!.colors, ...CUSTOM_PRODUCTS.filter((item) => item.parts?.includes(key)).flatMap((item) => item.colors)];
  return all.filter((color, index) => all.findIndex((other) => norm(other.name) === norm(color.name)) === index);
}

function covers(variants: ApiVariant[], product: CustomProduct, colors: CustomColor[]): CatalogVariant[] {
  const found: CatalogVariant[] = [];
  for (const color of colors) {
    for (const size of product.sizes.length ? product.sizes : ['']) {
      let match: ApiVariant | undefined;
      let score = 0;
      for (const variant of variants) {
        const options = variant.options || {};
        if (size && norm(options.size) !== norm(size)) continue;
        const next = colorScore(options.color, color.name);
        if (next > score) { match = variant; score = next; }
      }
      if (match) found.push({ id: match.id, color: color.name, size });
    }
  }
  return found;
}

/** Finds the Printify blueprint, a print provider that offers every colour and size, and the variant ids; cached in D1. */
export async function resolveCatalog(env: PrintifyEnv, key: PrintableKey, refresh = false): Promise<PrintifyCatalog> {
  const product = customProduct(key)!;
  const colors = colorsFor(key);
  if (!refresh) {
    const row = await env.DB.prepare("SELECT blueprint_id,print_provider_id,title,variants_json,resolved_at < datetime('now','-6 hours') AS stale FROM printify_catalog WHERE product_key=?")
      .bind(key).first<{ blueprint_id: number; print_provider_id: number; title: string; variants_json: string; stale: number }>();
    if (row) {
      const stored = JSON.parse(row.variants_json) as { variants: CatalogVariant[]; front: PrintifyCatalog['front'] };
      // A colour added since the last lookup (like the jogging-set colours) triggers a fresh lookup, at most every 6 hours.
      const missing = colors.some((color) => !stored.variants.some((variant) => norm(variant.color) === norm(color.name)));
      if (!missing || !row.stale) return { productKey: key, blueprintId: row.blueprint_id, printProviderId: row.print_provider_id, title: row.title, variants: stored.variants, front: stored.front };
    }
  }
  const wanted = colors.length * Math.max(1, product.sizes.length);
  const overrideBlueprint = Number(env['PRINTIFY_BLUEPRINT_' + key.toUpperCase()] || DEFAULT_BLUEPRINT[key] || 0);
  let blueprint: { id: number; title: string } | undefined;
  if (overrideBlueprint) {
    blueprint = await api<{ id: number; title: string }>(env, `/catalog/blueprints/${overrideBlueprint}.json`);
  } else {
    const all = await api<{ id: number; title: string }[]>(env, '/catalog/blueprints.json');
    for (const pattern of BLUEPRINT_TITLES[key]) {
      blueprint = all.find((item) => pattern.test(item.title.trim()) && !/\baop\b|all.over/i.test(item.title));
      if (blueprint) break;
    }
  }
  if (!blueprint) throw new Error(`No Printify product found for the ${product.name.toLowerCase()}; set PRINTIFY_BLUEPRINT_${key.toUpperCase()}.`);

  const overrideProvider = Number(env['PRINTIFY_PROVIDER_' + key.toUpperCase()] || 0);
  let providers = await api<{ id: number; title: string; location?: { country?: string } }[]>(env, `/catalog/blueprints/${blueprint.id}/print_providers.json`);
  if (overrideProvider) providers = providers.filter((provider) => provider.id === overrideProvider);
  // US printers first: every country we ship to today is reached fastest from there.
  providers.sort((a, b) => Number(b.location?.country === 'US') - Number(a.location?.country === 'US'));

  let best: { providerId: number; variants: CatalogVariant[]; front: PrintifyCatalog['front'] } | null = null;
  for (const provider of providers.slice(0, 8)) {
    const data = await api<{ variants?: ApiVariant[] }>(env, `/catalog/blueprints/${blueprint.id}/print_providers/${provider.id}/variants.json`);
    const variants = data.variants || [];
    const matched = covers(variants, product, colors);
    if (!best || matched.length > best.variants.length) {
      const first = variants.find((variant) => variant.id === matched[0]?.id);
      const front = first?.placeholders?.find((placeholder) => placeholder.position === 'front');
      best = { providerId: provider.id, variants: matched, front: front ? { width: front.width, height: front.height } : null };
    }
    if (matched.length === wanted) break;
  }
  if (!best || !best.variants.length) throw new Error(`No Printify print provider offers the ${product.name.toLowerCase()} colours we sell.`);

  await env.DB.prepare(`INSERT INTO printify_catalog (product_key,blueprint_id,print_provider_id,title,variants_json,resolved_at) VALUES (?,?,?,?,?,datetime('now'))
    ON CONFLICT(product_key) DO UPDATE SET blueprint_id=excluded.blueprint_id,print_provider_id=excluded.print_provider_id,title=excluded.title,variants_json=excluded.variants_json,resolved_at=excluded.resolved_at`)
    .bind(key, blueprint.id, best.providerId, blueprint.title, JSON.stringify({ variants: best.variants, front: best.front })).run();
  return { productKey: key, blueprintId: blueprint.id, printProviderId: best.providerId, title: blueprint.title, variants: best.variants, front: best.front };
}

export function findVariant(catalog: PrintifyCatalog, color: string, size: string): CatalogVariant | undefined {
  const product = customProduct(catalog.productKey)!;
  return catalog.variants.find((variant) => norm(variant.color) === norm(color) && (!product.sizes.length || norm(variant.size) === norm(size)));
}

/** The Printify pieces behind one order line: itself, or each piece of a jogging set. */
export function linePieces(productKey: CustomProductKey, size: string): { key: PrintableKey; size: string }[] | null {
  const product = customProduct(productKey);
  if (!product) return null;
  if (product.parts) return bundlePieces(product, size);
  return [{ key: productKey as PrintableKey, size }];
}

/** Checks every piece of a line is on offer; returns what is missing, or null. */
export async function missingPiece(env: PrintifyEnv, productKey: CustomProductKey, color: string, size: string): Promise<string | null> {
  const pieces = linePieces(productKey, size);
  if (!pieces) return 'Pick a size for each piece.';
  for (const piece of pieces) {
    const catalog = await resolveCatalog(env, piece.key);
    if (!findVariant(catalog, color, piece.size)) return `${customProduct(piece.key)!.name} in ${color} ${piece.size}`;
  }
  return null;
}

/** Cached print areas, so the design maker exports files at Printify's exact shape. */
export async function cachedPrintAreas(db: D1Database): Promise<Partial<Record<CustomProductKey, { width: number; height: number }>>> {
  const rows = await db.prepare('SELECT product_key,variants_json FROM printify_catalog').all<{ product_key: CustomProductKey; variants_json: string }>().catch(() => ({ results: [] }));
  const areas: Partial<Record<CustomProductKey, { width: number; height: number }>> = {};
  for (const row of rows.results ?? []) {
    try { const front = (JSON.parse(row.variants_json) as { front?: { width: number; height: number } }).front; if (front) areas[row.product_key] = front; } catch { /* ignore */ }
  }
  return areas;
}

export interface CustomLine {
  id: string; design_id: string; product_key: CustomProductKey; product_title: string; color: string; size: string; quantity: number; unit_price_cents: number;
}

export async function customLines(db: D1Database, orderId: string): Promise<CustomLine[]> {
  const result = await db.prepare('SELECT id,design_id,product_key,product_title,color,size,quantity,unit_price_cents FROM custom_order_items WHERE order_id=? ORDER BY id')
    .bind(orderId).all<CustomLine>().catch(() => ({ results: [] as CustomLine[] }));
  return result.results ?? [];
}

export function designFileUrl(env: PrintifyEnv, designId: string, kind: 'print' | 'preview'): string {
  return new URL(`/api/custom/file/${designId}-${kind}.${kind === 'print' ? 'png' : 'jpg'}`, env.SITE_URL || 'https://davinova.com').toString();
}

interface ApprovalOrder { id: string; order_number: string; email: string; total_cents: number; subtotal_cents?: number; shipping_address_json: string; payment_reference: string | null }

/** Review details shown on the owner approval page for a design-your-own order. */
export async function customApprovalPreview(env: PrintifyEnv, order: ApprovalOrder, lines: CustomLine[]) {
  let problem = customSetupProblem(env);
  if (!problem) {
    try {
      for (const line of lines) {
        const missing = await missingPiece(env, line.product_key, line.color, line.size);
        if (missing) { problem = `Printify does not offer ${missing}.`; break; }
      }
    } catch (error) { problem = error instanceof Error ? error.message : 'Printify could not be reached.'; }
  }
  return {
    items: lines.map((line) => ({ title: line.product_title, size: line.size, color: line.color, quantity: line.quantity, previewUrl: designFileUrl(env, line.design_id, 'preview'), printUrl: designFileUrl(env, line.design_id, 'print') })),
    readyToApprove: !problem,
    readinessMessage: problem || (isPrintifyDryRun(env)
      ? 'Ready for a safe dry-run. Nothing is sent to Printify.'
      : 'Check each design (no copyrighted logos, nothing offensive). Approving places and pays the Printify order.'),
    supplier: 'printify' as const,
  };
}

function splitName(name: string): [string, string] {
  const parts = name.trim().split(/\s+/);
  return parts.length > 1 ? [parts.slice(0, -1).join(' '), parts[parts.length - 1]] : [parts[0] || 'Customer', '.'];
}

async function shopId(env: PrintifyEnv): Promise<string> {
  if (env.PRINTIFY_SHOP_ID?.trim()) return env.PRINTIFY_SHOP_ID.trim();
  const shops = await api<{ id: number; title: string }[]>(env, '/shops.json');
  if (!shops.length) throw new Error('The Printify account has no store yet. Add one (Manage stores > Add new store > API).');
  return String(shops[0].id);
}

/** Places and pays the Printify order for an approved paid order. Call only after the approval token is consumed. */
export async function placePrintifyOrder(env: PrintifyEnv, order: ApprovalOrder, lines: CustomLine[]): Promise<{ mode: 'dry_run' | 'live' | 'on_hold'; message: string }> {
  const existing = await env.DB.prepare('SELECT status FROM printify_orders WHERE order_id=?').bind(order.id).first<{ status: string }>();
  if (existing && existing.status !== 'dry_run') throw new Error('A Printify order record already exists for this order. Check Printify before doing anything else.');
  if (isPrintifyDryRun(env)) {
    await env.DB.prepare("INSERT INTO printify_orders (order_id,status) VALUES (?,'dry_run') ON CONFLICT(order_id) DO UPDATE SET updated_at=datetime('now')").bind(order.id).run();
    return { mode: 'dry_run', message: 'Dry-run recorded. Nothing was sent to Printify.' };
  }
  await env.DB.prepare("INSERT INTO printify_orders (order_id,status) VALUES (?,'processing') ON CONFLICT(order_id) DO UPDATE SET status='processing',error_message=NULL,updated_at=datetime('now')").bind(order.id).run();
  try {
    const address = JSON.parse(order.shipping_address_json || '{}') as Record<string, string>;
    const [firstName, lastName] = splitName(address.name || '');
    const items = [];
    for (const line of lines) {
      const pieces = linePieces(line.product_key, line.size);
      if (!pieces) throw new Error(`The sizes saved for ${line.product_title} could not be read.`);
      // A jogging set is several Printify items with the same design; each keeps its own external id.
      for (const [index, piece] of pieces.entries()) {
        const catalog = await resolveCatalog(env, piece.key);
        const variant = findVariant(catalog, line.color, piece.size);
        if (!variant) throw new Error(`Printify does not offer ${customProduct(piece.key)!.name} in ${line.color} ${piece.size}.`);
        items.push({ print_provider_id: catalog.printProviderId, blueprint_id: catalog.blueprintId, variant_id: variant.id, print_areas: { front: designFileUrl(env, line.design_id, 'print') }, quantity: line.quantity, external_id: pieces.length > 1 ? `${line.id}-${index + 1}` : line.id });
      }
    }
    const shop = await shopId(env);
    const created = await api<{ id?: string }>(env, `/shops/${shop}/orders.json`, {
      method: 'POST',
      body: JSON.stringify({
        external_id: order.id, label: order.order_number, line_items: items, shipping_method: 1, send_shipping_notification: false,
        address_to: { first_name: firstName, last_name: lastName, email: order.email, phone: address.phone || '', country: address.countryCode || '', region: address.province || '', address1: address.address1 || '', address2: address.address2 || '', city: address.city || '', zip: address.postalCode || '' },
      }),
    });
    if (!created.id) throw new Error('Printify did not return an order id.');
    await env.DB.prepare("UPDATE printify_orders SET printify_order_id=?,status='created',updated_at=datetime('now') WHERE order_id=?").bind(created.id, order.id).run();

    // Never pay Printify more than the customer paid: hold the order for a manual look instead.
    const detail = await api<{ total_price?: number; total_shipping?: number; total_tax?: number }>(env, `/shops/${shop}/orders/${created.id}.json`);
    const cost = Number(detail.total_price || 0) + Number(detail.total_shipping || 0) + Number(detail.total_tax || 0);
    await env.DB.prepare("UPDATE printify_orders SET cost_cents=?,updated_at=datetime('now') WHERE order_id=?").bind(cost || null, order.id).run();
    if (cost >= order.total_cents) {
      await env.DB.prepare("UPDATE printify_orders SET status='on_hold',error_message=?,updated_at=datetime('now') WHERE order_id=?").bind(`Printify cost ${cost} cents is not below the paid ${order.total_cents} cents.`, order.id).run();
      await env.DB.prepare("UPDATE orders SET status='needs_attention',updated_at=datetime('now') WHERE id=?").bind(order.id).run();
      return { mode: 'on_hold', message: 'Printify order created but NOT sent to print: its cost is not below what the customer paid. Check it in Printify.' };
    }
    await api(env, `/shops/${shop}/orders/${created.id}/send_to_production.json`, { method: 'POST', body: '{}' });
    await env.DB.batch([
      env.DB.prepare("UPDATE printify_orders SET status='ordered',updated_at=datetime('now') WHERE order_id=?").bind(order.id),
      env.DB.prepare("UPDATE orders SET status='ordered',updated_at=datetime('now') WHERE id=?").bind(order.id),
      env.DB.prepare("INSERT INTO order_events (id,order_id,event_type,from_status,to_status,message,metadata_json) VALUES (?,?,?,?,?,?,?)")
        .bind(crypto.randomUUID(), order.id, 'printify_order_sent', 'pending_approval', 'ordered', 'Printify order placed and sent to print after owner approval.', JSON.stringify({ printifyOrderId: created.id, costCents: cost })),
    ]);
    return { mode: 'live', message: 'Printify order placed and sent to print. Tracking is emailed to the customer when it ships.' };
  } catch (error) {
    const detail = error instanceof Error ? error.message.slice(0, 400) : 'Unknown Printify error';
    await env.DB.prepare("UPDATE printify_orders SET status='needs_attention',error_message=?,updated_at=datetime('now') WHERE order_id=?").bind(detail, order.id).run();
    await env.DB.prepare("UPDATE orders SET status='needs_attention',updated_at=datetime('now') WHERE id=?").bind(order.id).run();
    throw error;
  }
}

function escapeHtml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

/** Hourly (with the CJ tracking sync): picks up Printify shipments and emails the customer. */
export async function syncPrintifyTracking(env: PrintifyEnv): Promise<void> {
  if (!env.PRINTIFY_API_TOKEN || isPrintifyDryRun(env)) return;
  const rows = await env.DB.prepare(`SELECT po.order_id,po.printify_order_id,po.tracking_number,po.tracking_email_sent_at,o.order_number,o.email
    FROM printify_orders po JOIN orders o ON o.id=po.order_id
    WHERE po.status IN ('ordered','shipped') AND po.printify_order_id IS NOT NULL AND po.tracking_email_sent_at IS NULL
      AND (po.next_retry_at IS NULL OR julianday(po.next_retry_at)<=julianday('now')) ORDER BY po.updated_at LIMIT 20`)
    .all<{ order_id: string; printify_order_id: string; tracking_number: string | null; tracking_email_sent_at: string | null; order_number: string; email: string }>()
    .catch(() => ({ results: [] }));
  if (!rows.results?.length) return;
  const shop = await shopId(env);
  for (const row of rows.results) {
    try {
      const detail = await api<{ shipments?: { number?: string; url?: string; carrier?: string }[] }>(env, `/shops/${shop}/orders/${row.printify_order_id}.json`);
      const shipment = (detail.shipments || []).find((item) => item.number);
      if (!shipment?.number) {
        await env.DB.prepare("UPDATE printify_orders SET next_retry_at=datetime('now','+1 hour'),updated_at=datetime('now') WHERE order_id=?").bind(row.order_id).run();
        continue;
      }
      const tracking = shipment.number.trim();
      const url = (shipment.url || '').trim() || 'https://www.17track.net/en?nums=' + encodeURIComponent(tracking);
      await env.DB.batch([
        env.DB.prepare("UPDATE printify_orders SET status='shipped',tracking_number=?,tracking_url=?,error_message=NULL,next_retry_at=NULL,updated_at=datetime('now') WHERE order_id=?").bind(tracking, url, row.order_id),
        env.DB.prepare("UPDATE orders SET status='shipped',tracking_number=?,tracking_url=?,updated_at=datetime('now') WHERE id=?").bind(tracking, url, row.order_id),
      ]);
      await rewardReferrer(env, row.order_id).catch((error) => console.error('Referral reward failed:', error instanceof Error ? error.message : error));
      await sendTransactionalEmail({
        to: row.email, subject: 'Your Davinova order ' + row.order_number + ' is on its way',
        html: '<div style="font-family:Arial,sans-serif;color:#262321;max-width:560px;margin:auto"><p style="letter-spacing:.16em;text-transform:uppercase;font-size:11px">DAVINOVA</p><h1 style="font-family:Georgia,serif;font-weight:normal">Your design is on its way.</h1><p>Order <strong>' + escapeHtml(row.order_number) + '</strong> has been printed and shipped.</p><p>Tracking number: <strong>' + escapeHtml(tracking) + '</strong></p><p><a href="' + escapeHtml(url) + '" style="display:inline-block;background:#262321;color:#fffaf5;text-decoration:none;padding:13px 18px">Track your delivery</a></p><p style="font-size:12px;color:#817872">Carrier updates can take a little time to appear.</p></div>',
      }, env.RESEND_API_KEY, env.EMAIL_FROM);
      await env.DB.prepare("UPDATE printify_orders SET tracking_email_sent_at=datetime('now') WHERE order_id=?").bind(row.order_id).run();
    } catch (error) {
      await env.DB.prepare("UPDATE printify_orders SET error_message=?,next_retry_at=datetime('now','+1 hour'),updated_at=datetime('now') WHERE order_id=?")
        .bind(error instanceof Error ? error.message.slice(0, 400) : 'Tracking sync failed', row.order_id).run();
    }
  }
}

export { CUSTOM_PRODUCTS };
