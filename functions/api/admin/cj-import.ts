import { getCJProductDetail, parseCJVariantOption, type CJEnv } from '../../../server/cj';
import { JEWELRY_COLLECTION, MEN_COLLECTIONS, MEN_JEWELRY, WOMEN_BAGS, WOMEN_SHOES, MEN_OCCASION_BY_SUBCATEGORY, manualStoreCollectionAssignment, storeCollectionAssignmentIsValid, writeStoreCollectionTags } from '../../../src/lib/storeCollectionTaxonomy';

type CollectionCategory = 'wedding-guest' | 'cocktail-party' | 'maxi-holiday';
type Env = CJEnv & { ADMIN_PASSWORD?: string };
interface Context { request: Request; env: Env }

const categories: CollectionCategory[] = ['wedding-guest', 'cocktail-party', 'maxi-holiday'];

function json(data: unknown, status = 200): Response {
  return Response.json(data, {
    status,
    headers: { 'Cache-Control': 'no-store, max-age=0', 'X-Content-Type-Options': 'nosniff' },
  });
}

function sameOrigin(request: Request): boolean {
  const origin = request.headers.get('Origin');
  return !origin || origin === new URL(request.url).origin;
}

function slugify(value: string): string {
  return value.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 70);
}

function safeImageUrl(value: string): boolean {
  try { return new URL(value).protocol === 'https:'; } catch { return false; }
}

function cleanDescription(value: string): string {
  return value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 2000);
}

function hasExtendedSizeEvidence(values: string[]): boolean {
  const metadata = values.join(' ').toLowerCase().replace(/[_-]+/g, ' ');
  return /\b(plus size|plus sized|plussize|curvy|curve collection|extended size|extended sizing|full figure|full figured|big size|big sizes)\b/.test(metadata)
    || /\b(1xl|2xl|3xl|4xl|5xl|6xl|1x|2x|3x|4x|5x|6x|xxl|xxxl|xxxxl)\b/.test(metadata);
}

function detectDepartment(values: string[]): 'women' | 'men' {
  const metadata = values.join(' ').toLowerCase();
  if (/\b(women|womens|women's|woman|ladies|lady|female|girls?)\b/.test(metadata)) return 'women';
  return /\b(men's|mens|men |for men|groom|groomsman|suit|blazer|tuxedo)\b/.test(metadata) ? 'men' : 'women';
}

function safeJsonArray(value: string): string[] {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

/**
 * Adds a CJ catalogue item as a visible browse-only listing.
 * Listings remain unverified, have no sell price or confirmed stock, and cannot be purchased.
 * No supplier order is placed.
 */
export async function onRequestPost({ request, env }: Context): Promise<Response> {
  if (!sameOrigin(request)) return json({ error: 'Cross-origin request blocked.' }, 403);
  if (!env.DB) return json({ error: 'The Davinova database binding is unavailable.' }, 503);

  let body: { productId?: unknown; collectionCategory?: unknown; storeCollection?: unknown; storeSubcategory?: unknown; storeCollectionManual?: unknown };
  try { body = await request.json() as typeof body; }
  catch { return json({ error: 'Send a valid JSON request.' }, 400); }

  const productId = typeof body.productId === 'string' ? body.productId.trim() : '';
  if (!productId || !/^[a-zA-Z0-9-]{1,200}$/.test(productId)) {
    return json({ error: 'A valid CJ product ID is required.' }, 400);
  }
  const storeCollection = typeof body.storeCollection === 'string' ? body.storeCollection : '';
  const storeSubcategory = typeof body.storeSubcategory === 'string' ? body.storeSubcategory : '';
  if (!storeCollection || !storeSubcategory || !storeCollectionAssignmentIsValid(storeCollection, storeSubcategory)) {
    return json({ error: 'Choose one of your categories and one of its sub-categories.' }, 400);
  }
  // The shop runs on the owner's categories. The old occasion column is still required by the database,
  // so it is filled from the sub-category unless one is sent.
  const forMen = MEN_COLLECTIONS.includes(storeCollection);
  const collectionCategory: CollectionCategory = typeof body.collectionCategory === 'string' && categories.includes(body.collectionCategory as CollectionCategory)
    ? body.collectionCategory as CollectionCategory
    : forMen ? MEN_OCCASION_BY_SUBCATEGORY[storeSubcategory] ?? 'wedding-guest'
    : storeSubcategory === 'cocktail-dresses' || storeSubcategory === 'prom-dresses' ? 'cocktail-party' : 'wedding-guest';
  const storeAssignment = manualStoreCollectionAssignment(storeCollection, storeSubcategory);
  const manualStoreAssignment = body.storeCollectionManual === true;

  try {
    const existing = await env.DB.prepare(
      'SELECT id, title, supplier_verified FROM products WHERE cj_product_id = ? OR catalog_source_product_id = ? LIMIT 1',
    ).bind(productId, productId).first<{ id: string; title: string; supplier_verified: number }>();

    if (existing) {
      if (existing.supplier_verified !== 1) {
        if (storeAssignment) {
          const existingTagsRow = await env.DB.prepare('SELECT tags_json FROM products WHERE id=?')
            .bind(existing.id).first<{ tags_json: string }>();
          const oldTags = existingTagsRow?.tags_json ? safeJsonArray(existingTagsRow.tags_json) : [];
          const newTags = writeStoreCollectionTags(oldTags, storeAssignment, manualStoreAssignment);
          await env.DB.prepare(
            "UPDATE products SET active=1, collection_category=?, tags_json=?, updated_at=datetime('now') WHERE id=? AND supplier_verified=0",
          ).bind(collectionCategory, JSON.stringify(newTags), existing.id).run();
        } else {
          await env.DB.prepare(
            "UPDATE products SET active=1, collection_category=?, updated_at=datetime('now') WHERE id=? AND supplier_verified=0",
          ).bind(collectionCategory, existing.id).run();
        }
        return json({
          ok: true, alreadyImported: true, productId: existing.id, title: existing.title,
          status: 'published_browse_only', message: 'The existing listing was updated without importing a duplicate.',
        });
      }
      return json({
        ok: true, alreadyImported: true, productId: existing.id, title: existing.title,
        status: 'already_verified', message: 'This CJ product already exists in Davinova.',
      });
    }

    const detail = await getCJProductDetail(env, productId);
    if (!detail.id || !detail.name || !detail.variants.length) {
      return json({ error: 'CJ did not return a product with identifiable variants. Nothing was saved.' }, 422);
    }
    if (detail.variants.some((variant) => !variant.id)) {
      return json({ error: 'At least one variant is missing its CJ variant ID. Nothing was saved.' }, 422);
    }

    const productKey = 'cj-' + detail.id;
    const slug = (slugify(detail.name) || 'cj-dress') + '-' + detail.id.slice(-10).toLowerCase();
    const itemCostCents = detail.sellPriceUsd === null ? null : Math.max(0, Math.round(detail.sellPriceUsd * 100));
    const occasion = collectionCategory === 'cocktail-party' ? 'cocktail'
      : collectionCategory === 'maxi-holiday' ? 'evening' : 'wedding-guest';
    const images = [...new Set([detail.imageUrl, ...detail.imageUrls].filter((url) => Boolean(url) && safeImageUrl(url)))].slice(0, 8);
    const variantSizeLabels = detail.variants.map((variant) => variant.options || variant.name || '');
    const baseTags = hasExtendedSizeEvidence([detail.name, detail.description, ...variantSizeLabels])
      ? ['plus-size', 'extended-size']
      : [];
    const department = forMen || (storeCollection === JEWELRY_COLLECTION && MEN_JEWELRY.includes(storeSubcategory)) ? 'men'
      : storeCollection === JEWELRY_COLLECTION || storeCollection === WOMEN_BAGS || storeCollection === WOMEN_SHOES ? 'women' : detectDepartment([detail.name, detail.description, detail.category]);
    const tags = storeAssignment ? writeStoreCollectionTags(baseTags, storeAssignment, manualStoreAssignment) : baseTags;

    const statements = [
      env.DB.prepare(
        'INSERT INTO products (id, slug, title, description, supplier, catalog_source, catalog_source_product_id, catalog_source_url, cj_product_id, supplier_verified, collection_category, catalog_source_cost_cents, price_cents, cost_cents, currency, occasion, department, color, length, sleeve, neckline, tags_json, active, featured) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
      ).bind(
        productKey, slug, detail.name.slice(0, 180), cleanDescription(detail.description),
        'cj', 'cj', detail.id, null, detail.id, 0, collectionCategory, itemCostCents, 0, 0, 'USD',
        occasion, department, 'Not verified', 'Not verified', 'Not verified', 'Not verified', JSON.stringify(tags), 1, 0,
      ),
            ...images.map((url, index) => env.DB.prepare(
        'INSERT INTO product_images (id, product_id, url, alt, position, is_primary) VALUES (?,?,?,?,?,?)',
      ).bind(
        `cjimg-${detail.id}-${index + 1}`, productKey, url,
        `${detail.name.slice(0, 120)} — ${index === 0 ? 'front view' : 'angle ' + (index + 1)} | Davinova`,
        index, index === 0 ? 1 : 0,
      )),
      ...detail.variants.map((variant, index) => {
        const rawOption = (variant.options || variant.name || `Variant ${index + 1}`).slice(0, 100);
        const { size, color } = parseCJVariantOption(rawOption, department);
        const variantId = `cjvar-${detail.id}-${variant.id}`.slice(0, 240);
        return env.DB.prepare(
          'INSERT INTO product_variants (id, product_id, size, color, sku, supplier_variant_id, cj_variant_id, cj_sku, available_stock, stock_checked_at, active) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
        ).bind(
          variantId, productKey, size, color, null,
          variant.id, variant.id, variant.sku || null, null, null, 0,
        );
      }),
    ];

    await env.DB.batch(statements);
    return json({
      ok: true, alreadyImported: false, productId: productKey, title: detail.name,
      status: 'published_browse_only', imageCount: images.length, variantCount: detail.variants.length,
      message: 'Listed on the public Davinova catalogue as Coming soon. It remains unavailable to purchase until size, stock, pricing, shipping, and image rights are verified.',
    }, 201);
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 260) : 'CJ product import failed.';
    return json({ error: message }, 502);
  }
}
