import { suggestCollectionCategory } from '../../../src/lib/collectionSuggestions';

interface Env {
  DB: D1Database;
  ADMIN_PASSWORD?: string;
}
interface ProductRow {
  id: string;
  title: string;
  description: string;
  occasion: string;
  length: string | null;
  tags_json: string;
  collection_category: string;
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

/**
 * Conservatively organize existing browse-only CJ dresses. Only listings with a
 * clear title/category/description clue are changed; ambiguous listings are left alone.
 * Supplier-verified listings and all order/checkout data are out of scope.
 */
export async function onRequestPost({ request, env }: { request: Request; env: Env }): Promise<Response> {
  if (!sameOrigin(request)) return json({ error: 'Cross-origin request blocked.' }, 403);
  if (!env.DB) return json({ error: 'The Davinova database binding is unavailable.' }, 503);

  try {
    const { results } = await env.DB.prepare(
      `SELECT id,title,description,occasion,length,tags_json,collection_category
       FROM products
       WHERE active=1 AND supplier='cj' AND catalog_source='cj'
         AND cj_product_id IS NOT NULL AND supplier_verified=0
       ORDER BY created_at DESC`,
    ).all<ProductRow>();

    const statements: D1PreparedStatement[] = [];
    let alreadyCorrectCount = 0;
    const needsReview: Array<{ id: string; title: string; currentCollection: string }> = [];

    for (const row of results ?? []) {
      const categoryClues = [row.occasion, row.length ?? '', ...safeTags(row.tags_json)].join(' ');
      const suggested = suggestCollectionCategory(row.title, categoryClues, row.description);

      if (!suggested) {
        needsReview.push({ id: row.id, title: row.title, currentCollection: row.collection_category });
        continue;
      }
      if (suggested === row.collection_category) {
        alreadyCorrectCount += 1;
        continue;
      }

      statements.push(env.DB.prepare(
        `UPDATE products
         SET collection_category=?, updated_at=datetime('now')
         WHERE id=? AND supplier_verified=0 AND collection_category=?`,
      ).bind(suggested, row.id, row.collection_category));
    }

    let movedCount = 0;
    for (let index = 0; index < statements.length; index += 50) {
      const outcomes = await env.DB.batch(statements.slice(index, index + 50));
      movedCount += outcomes.reduce((total, result) => total + (result.meta?.changes ?? 0), 0);
    }

    return json({
      ok: true,
      scannedCount: (results ?? []).length,
      movedCount,
      alreadyCorrectCount,
      needsReviewCount: needsReview.length,
      needsReview: needsReview.slice(0, 25),
      message: 'Clear collection matches were organized. Ambiguous dresses were left unchanged.',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 240) : 'Could not organize the catalogue.';
    return json({ error: message }, 502);
  }
}
