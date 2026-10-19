interface Env { ADMIN_PASSWORD?: string; DB?: D1Database }
interface Context { request: Request; next: () => Promise<Response>; env: Env }

const MAX_FAILURES = 5;
const LOCKOUT_MINUTES = 15;

function unauthorized(message = 'Unauthorized'): Response {
  return Response.json({ error: message }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
}
function lockedResponse(): Response {
  return Response.json(
    { error: 'Too many failed admin login attempts. Try again later.' },
    { status: 429, headers: { 'Cache-Control': 'no-store', 'Retry-After': String(LOCKOUT_MINUTES * 60) } },
  );
}

/** Constant-time string comparison so response timing cannot reveal how much of the password matched. */
function timingSafeEqual(a: string, b: string): boolean {
  const length = Math.max(a.length, b.length);
  let difference = a.length === b.length ? 0 : 1;
  for (let index = 0; index < length; index++) {
    difference |= (a.charCodeAt(index) || 0) ^ (b.charCodeAt(index) || 0);
  }
  return difference === 0;
}

function clientIp(request: Request): string {
  return request.headers.get('CF-Connecting-IP') || 'unknown';
}

async function isLockedOut(db: D1Database, ip: string): Promise<boolean> {
  const row = await db.prepare('SELECT locked_until FROM admin_auth_attempts WHERE ip=?')
    .bind(ip).first<{ locked_until: string | null }>();
  return Boolean(row?.locked_until && Date.parse(row.locked_until) > Date.now());
}

async function recordFailure(db: D1Database, ip: string): Promise<void> {
  const row = await db.prepare('SELECT failures, locked_until FROM admin_auth_attempts WHERE ip=?')
    .bind(ip).first<{ failures: number; locked_until: string | null }>();
  // A lockout that has already expired does not carry its old failure count forward.
  const previousFailures = row && !(row.locked_until && Date.parse(row.locked_until) <= Date.now()) ? row.failures : 0;
  const failures = previousFailures + 1;
  const lockedUntil = failures >= MAX_FAILURES ? new Date(Date.now() + LOCKOUT_MINUTES * 60000).toISOString() : null;
  await db.prepare(
    `INSERT INTO admin_auth_attempts (ip, failures, locked_until, updated_at) VALUES (?,?,?,datetime('now'))
     ON CONFLICT(ip) DO UPDATE SET failures=excluded.failures, locked_until=excluded.locked_until, updated_at=datetime('now')`,
  ).bind(ip, failures, lockedUntil).run();
}

async function clearFailures(db: D1Database, ip: string): Promise<void> {
  await db.prepare('DELETE FROM admin_auth_attempts WHERE ip=?').bind(ip).run();
}

// Placeholder perimeter middleware. Protect /api/admin/* with Cloudflare Access in
// production; this password + per-IP lockout is a stop-gap, not a replacement for it.
export async function onRequest(context: Context): Promise<Response> {
  const url = new URL(context.request.url);
  // davinova.com is the main address (sitemap, Stripe webhook), so www visitors are sent there with their path kept.
  if (url.hostname === 'www.davinova.com') {
    url.hostname = 'davinova.com';
    return Response.redirect(url.toString(), 301);
  }
  if (!url.pathname.startsWith('/api/admin/')) return context.next();
  // This exact endpoint verifies a high-entropy, expiring, one-use approval token itself.
  if (url.pathname === '/api/admin/cj-approve' && ['GET', 'POST'].includes(context.request.method)) return context.next();

  const expected = context.env.ADMIN_PASSWORD;
  const supplied = context.request.headers.get('x-admin-password') || '';
  if (!expected) return unauthorized();

  const db = context.env.DB;
  const ip = clientIp(context.request);
  if (db && (await isLockedOut(db, ip))) return lockedResponse();

  if (!timingSafeEqual(supplied, expected)) {
    if (db) await recordFailure(db, ip);
    return unauthorized();
  }

  if (db) await clearFailures(db, ip);
  return context.next();
}
