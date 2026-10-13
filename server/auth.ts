const encoder = new TextEncoder();
async function digestToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(token));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}
function newApprovalSecret(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)), (byte) => byte.toString(16).padStart(2, '0')).join('');
}
export async function createApprovalToken(orderId: string, db: D1Database, ttlHours = 24): Promise<{token:string;expiresAt:string}> {
  if (!orderId.trim()) throw new Error('An order ID is required.');
  if (!Number.isFinite(ttlHours) || ttlHours < 1 || ttlHours > 168) throw new Error('Approval token lifetime must be between 1 and 168 hours.');
  const token = newApprovalSecret();
  const expiresAt = new Date(Date.now() + ttlHours * 3600000).toISOString();
  await db.prepare('INSERT INTO approvals (id,order_id,token_hash,expires_at) VALUES (?,?,?,?)')
    .bind(crypto.randomUUID(), orderId, await digestToken(token), expiresAt).run();
  return { token: token, expiresAt: expiresAt };
}
export async function getApprovalTokenOrderId(token: string, db: D1Database): Promise<string | null> {
  if (!/^[a-f0-9]{64}$/i.test(token)) return null;
  const row = await db.prepare("SELECT order_id FROM approvals WHERE token_hash=? AND used_at IS NULL AND julianday(expires_at)>julianday('now')")
    .bind(await digestToken(token.toLowerCase())).first<{order_id:string}>();
  return row?.order_id ?? null;
}
export async function consumeApprovalToken(token: string, db: D1Database): Promise<string | null> {
  if (!/^[a-f0-9]{64}$/i.test(token)) return null;
  const row = await db.prepare("UPDATE approvals SET used_at=datetime('now') WHERE token_hash=? AND used_at IS NULL AND julianday(expires_at)>julianday('now') RETURNING order_id")
    .bind(await digestToken(token.toLowerCase())).first<{order_id:string}>();
  return row?.order_id ?? null;
}
