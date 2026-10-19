import { accountView, currentCustomer, reply, sameOrigin, type AccountEnv } from '../../../server/accounts';

const ADDRESS_FIELDS = ['line1', 'line2', 'city', 'state', 'postalCode', 'country', 'phone'] as const;
const SIZE_FIELDS = ['dress', 'top', 'bottom', 'shoe', 'ring', 'suit', 'shirt'] as const;

function clean(value: unknown, max = 120): string {
  return typeof value === 'string' ? value.replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, max) : '';
}
function pick(source: unknown, fields: readonly string[]): Record<string, string> {
  const input = source && typeof source === 'object' ? source as Record<string, unknown> : {};
  return Object.fromEntries(fields.map((field) => [field, clean(input[field])]).filter(([, value]) => value));
}

/** The signed-in customer's account, or { account: null }. */
export async function onRequestGet({ request, env }: { request: Request; env: AccountEnv }): Promise<Response> {
  if (!env.DB) return reply({ account: null });
  const customer = await currentCustomer(request, env.DB);
  return reply({ account: customer ? await accountView(env.DB, customer) : null });
}

/** Saves any of: name, address, sizes, wishlist. */
export async function onRequestPut({ request, env }: { request: Request; env: AccountEnv }): Promise<Response> {
  if (!sameOrigin(request)) return reply({ error: 'Not allowed.' }, 403);
  if (!env.DB) return reply({ error: 'Accounts are temporarily unavailable.' }, 503);
  const customer = await currentCustomer(request, env.DB);
  if (!customer) return reply({ error: 'Please sign in again.' }, 401);
  let body: { name?: unknown; address?: unknown; sizes?: unknown; wishlist?: unknown };
  try { body = await request.json() as typeof body; } catch { return reply({ error: 'Invalid request.' }, 400); }

  const sets: string[] = []; const values: unknown[] = [];
  if (body.name !== undefined) {
    const [first, ...rest] = clean(body.name, 100).split(/\s+/);
    sets.push('first_name=?', 'last_name=?'); values.push(first || null, rest.join(' ') || null);
  }
  if (body.address !== undefined) { sets.push('address_json=?'); values.push(JSON.stringify(pick(body.address, ADDRESS_FIELDS))); }
  if (body.sizes !== undefined) { sets.push('sizes_json=?'); values.push(JSON.stringify(pick(body.sizes, SIZE_FIELDS))); }
  if (body.wishlist !== undefined) {
    const ids = Array.isArray(body.wishlist) ? [...new Set(body.wishlist.filter((id): id is string => typeof id === 'string' && /^[\w-]{1,120}$/.test(id)))].slice(0, 300) : [];
    sets.push('wishlist_json=?'); values.push(JSON.stringify(ids));
  }
  if (!sets.length) return reply({ error: 'Nothing to save.' }, 400);
  await env.DB.prepare(`UPDATE customers SET ${sets.join(',')}, updated_at=datetime('now') WHERE id=?`).bind(...values, customer.id).run();
  const fresh = await currentCustomer(request, env.DB);
  return reply({ account: fresh ? await accountView(env.DB, fresh) : null });
}
