import {
  assignmentFromStoreTags,
  hasManualStoreCollectionAssignment,
  manualStoreCollectionAssignment,
  publicProductTags,
  storeCollectionAssignmentIsValid,
  suggestStoreCollection,
  writeStoreCollectionTags,
} from '../../../src/lib/storeCollectionTaxonomy';

interface Env {
  DB: D1Database;
  ADMIN_PASSWORD?: string;
}
interface ProductRow {
  id: string;
  title: string;
  description: string;
  length: string | null;
  tags_json: string;
  collection_category: string;
}
interface ReviewRow {
  id: string;
  title: string;
  tags_json: string;
  collection_category: string;
  supplier_verified: number;
}
interface AssignmentBody {
  action?: unknown;
  productId?: unknown;
  storeCollection?: unknown;
  storeSubcategory?: unknown;
}

function json(data: unknown, status = 200): Response {
  return Response.json(data, {
    status,
    headers: {
      'Cache-Control': 'no-store, max-age=0',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

function sameOrigin(request: Request): boolean {
  const origin = request.headers.get('Origin');
  return !origin || origin === new URL(request.url).origin;
}

function safeTags(value: string): string[] {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

async function assignExistingProduct(
  body: AssignmentBody,
  env: Env,
): Promise<Response> {
  const productId = typeof body.productId === 'string' ? body.productId.trim() : '';
  const collection = typeof body.storeCollection === 'string' ? body.storeCollection : '';
  const subcategory = typeof body.storeSubcategory === 'string' ? body.storeSubcategory : '';

  if (!productId || !/^[a-zA-Z0-9-]{1,200}$/.test(productId)) {
    return json({ error: 'A valid existing Davinova product ID is required.' }, 400);
  }
  if (!collection || !subcategory || !storeCollectionAssignmentIsValid(collection, subcategory)) {
    return json({ error: 'Choose one of your clothing collections and a valid subcategory.' }, 400);
  }

  const product = await env.DB.prepare(
    `SELECT id,title,tags_json,collection_category,supplier_verified
     FROM products
     WHERE id=? AND active=1 AND supplier='cj' AND catalog_source='cj' AND cj_product_id IS NOT NULL
     LIMIT 1`,
  ).bind(productId).first<ReviewRow>();

  if (!product) return json({ error: 'This imported CJ product was not found.' }, 404);
  if (product.supplier_verified === 1) {
    return json({ error: 'Supplier-verified products are protected from automatic category edits.' }, 409);
  }

  const selected = manualStoreCollectionAssignment(collection, subcategory);
  if (!selected) return json({ error: 'Choose a valid clothing subcategory.' }, 400);
  const oldTags = safeTags(product.tags_json);
  const newTags = writeStoreCollectionTags(oldTags, selected, true);
  const result = await env.DB.prepare(
    `UPDATE products
     SET tags_json=?, updated_at=datetime('now')
     WHERE id=? AND supplier_verified=0 AND tags_json=?`,
  ).bind(JSON.stringify(newTags), product.id, product.tags_json).run();

  if ((result.meta?.changes ?? 0) !== 1) {
    return json({ error: 'The product changed while you were editing it. Run the organizer again and retry.' }, 409);
  }

  return json({
    ok: true,
    assignedCount: 1,
    product: {
      id: product.id,
      title: product.title,
      storeCollection: selected.collection,
      storeCollectionLabel: selected.collectionLabel,
      storeSubcategory: selected.subcategory,
      storeSubcategoryLabel: selected.subcategoryLabel,
    },
    message: 'Existing product assigned to your clothing collection. No import was performed.',
  });
}

/**
 * Organizes existing browse-only CJ listings into Davinova's supplied clothing
 * taxonomy. Taxonomy assignments are stored in reserved tags_json metadata so this
 * works with already-deployed D1 schemas. Occasion collections remain untouched.
 * Supplier-verified listings and order/checkout data are never changed.
 */
export async function onRequestPost({ request, env }: { request: Request; env: Env }): Promise<Response> {
  if (!sameOrigin(request)) return json({ error: 'Cross-origin request blocked.' }, 403);
  if (!env.DB) return json({ error: 'The Davinova database binding is unavailable.' }, 503);

  let body: AssignmentBody = {};
  if (request.headers.get('Content-Length') !== '0') {
    try {
      body = await request.json() as AssignmentBody;
    } catch {
      body = {};
    }
  }

  try {
    if (body.action === 'assign') {
      return await assignExistingProduct(body, env);
    }

    const { results } = await env.DB.prepare(
      `SELECT id,title,description,length,tags_json,collection_category
       FROM products
       WHERE active=1 AND supplier='cj' AND catalog_source='cj'
         AND cj_product_id IS NOT NULL AND supplier_verified=0
       ORDER BY created_at DESC`,
    ).all<ProductRow>();

    const statements: D1PreparedStatement[] = [];
    const plannedMoves: Array<{
      id: string;
      title: string;
      oldTagsJson: string;
      newTagsJson: string;
      collectionLabel: string;
      subcategoryLabel?: string;
    }> = [];
    const needsReview: Array<{
      id: string;
      title: string;
      currentCollection?: string;
      currentCollectionLabel?: string;
      currentSubcategory?: string;
      currentSubcategoryLabel?: string;
    }> = [];
    let alreadyCorrectCount = 0;

    for (const row of results ?? []) {
      const tags = safeTags(row.tags_json);
      const current = assignmentFromStoreTags(tags);
      if (hasManualStoreCollectionAssignment(tags)) {
        alreadyCorrectCount += 1;
        continue;
      }

      const visibleTags = publicProductTags(tags);
      const suggested = suggestStoreCollection(
        row.title,
        '',
        row.description,
        [row.length ?? '', ...visibleTags],
      );

      // The automatic sorter must find both the user's collection and a specific
      // subcategory. Broad or conflicting clues are surfaced for a human decision.
      if (!suggested?.subcategory) {
        needsReview.push({
          id: row.id,
          title: row.title,
          currentCollection: current?.collection,
          currentCollectionLabel: current?.collectionLabel,
          currentSubcategory: current?.subcategory,
          currentSubcategoryLabel: current?.subcategoryLabel,
        });
        continue;
      }

      if (
        current?.collection === suggested.collection
        && current?.subcategory === suggested.subcategory
      ) {
        alreadyCorrectCount += 1;
        continue;
      }

      const newTagsJson = JSON.stringify(writeStoreCollectionTags(tags, suggested));
      plannedMoves.push({
        id: row.id,
        title: row.title,
        oldTagsJson: row.tags_json,
        newTagsJson,
        collectionLabel: effective.collectionLabel,
        subcategoryLabel: effective.subcategoryLabel,
      });
      statements.push(env.DB.prepare(
        `UPDATE products
         SET tags_json=?, updated_at=datetime('now')
         WHERE id=? AND supplier_verified=0 AND tags_json=?`,
      ).bind(newTagsJson, row.id, row.tags_json));
    }

    let movedCount = 0;
    const moved: Array<{ id: string; title: string; collection: string; subcategory?: string }> = [];
    for (let index = 0; index < statements.length; index += 50) {
      const outcomes = await env.DB.batch(statements.slice(index, index + 50));
      outcomes.forEach((outcome, offset) => {
        if ((outcome.meta?.changes ?? 0) < 1) return;
        const plan = plannedMoves[index + offset];
        if (!plan) return;
        movedCount += 1;
        moved.push({
          id: plan.id,
          title: plan.title,
          collection: plan.collectionLabel,
          subcategory: plan.subcategoryLabel,
        });
      });
    }

    return json({
      ok: true,
      scannedCount: (results ?? []).length,
      movedCount,
      alreadyCorrectCount,
      needsReviewCount: needsReview.length,
      needsReview: needsReview.slice(0, 100),
      moved: moved.slice(0, 100),
      message: 'Matching products were sorted into your clothing collections. Ambiguous products were left unchanged for review.',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 240) : 'Could not organize the catalogue.';
    return json({ error: message }, 502);
  }
}
