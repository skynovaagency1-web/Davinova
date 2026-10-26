import { STEPS } from './orderSteps';

/** Customer accounts: passwordless email-code sign-in, cookie sessions and saved account data. */

export interface AccountEnv { DB?: D1Database; RESEND_API_KEY?: string; EMAIL_FROM?: string }
export interface Customer { id: string; email: string; first_name: string | null; last_name: string | null; address_json: string; sizes_json: string; wishlist_json: string }

export const SESSION_COOKIE = 'dv_session';
const SESSION_DAYS = 60;
export const CODE_MINUTES = 10;
export const MAX_CODE_ATTEMPTS = 5;

export function reply(data: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return Response.json(data, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', ...headers } });
}

export function validEmail(value: unknown): string {
  const email = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return email.length <= 200 && /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/.test(email) ? email : '';
}

/** Browsers send Origin on POST/PUT; a different origin is refused so other sites can't act for a signed-in customer. */
export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get('Origin');
  return !origin || origin === new URL(request.url).origin;
}

export async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function randomCode(): string {
  const values = crypto.getRandomValues(new Uint32Array(1));
  return String(values[0] % 1000000).padStart(6, '0');
}

function randomToken(): string {
  return [...crypto.getRandomValues(new Uint8Array(32))].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function readCookie(request: Request, name: string): string {
  for (const part of (request.headers.get('Cookie') || '').split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return rest.join('=');
  }
  return '';
}

export function sessionCookie(token: string): string {
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_DAYS * 86400}`;
}
export const clearedCookie = `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;

export async function createSession(db: D1Database, customerId: string): Promise<string> {
  const token = randomToken();
  await db.prepare("INSERT INTO customer_sessions (token_hash, customer_id, expires_at) VALUES (?,?,datetime('now', ?))")
    .bind(await sha256(token), customerId, `+${SESSION_DAYS} days`).run();
  return token;
}

/** The signed-in customer for this request, or null. */
export async function currentCustomer(request: Request, db: D1Database): Promise<Customer | null> {
  const token = readCookie(request, SESSION_COOKIE);
  if (!/^[a-f0-9]{64}$/.test(token)) return null;
  return db.prepare(
    `SELECT c.id,c.email,c.first_name,c.last_name,c.address_json,c.sizes_json,c.wishlist_json FROM customer_sessions s
     JOIN customers c ON c.id=s.customer_id WHERE s.token_hash=? AND s.expires_at>datetime('now')`,
  ).bind(await sha256(token)).first<Customer>();
}

export async function endSession(request: Request, db: D1Database): Promise<void> {
  const token = readCookie(request, SESSION_COOKIE);
  if (token) await db.prepare('DELETE FROM customer_sessions WHERE token_hash=?').bind(await sha256(token)).run();
}

/** Per-key attempt counter (shares the admin lockout table). */
export async function lockedOut(db: D1Database, key: string): Promise<boolean> {
  const row = await db.prepare('SELECT locked_until FROM admin_auth_attempts WHERE ip=?').bind(key).first<{ locked_until: string | null }>();
  return Boolean(row?.locked_until && Date.parse(row.locked_until) > Date.now());
}
export async function countAttempt(db: D1Database, key: string, max: number, minutes: number): Promise<void> {
  const row = await db.prepare('SELECT failures, locked_until FROM admin_auth_attempts WHERE ip=?').bind(key).first<{ failures: number; locked_until: string | null }>();
  const previous = row && !(row.locked_until && Date.parse(row.locked_until) <= Date.now()) ? row.failures : 0;
  const failures = previous + 1;
  const lockedUntil = failures >= max ? new Date(Date.now() + minutes * 60000).toISOString() : null;
  await db.prepare(
    `INSERT INTO admin_auth_attempts (ip, failures, locked_until, updated_at) VALUES (?,?,?,datetime('now'))
     ON CONFLICT(ip) DO UPDATE SET failures=excluded.failures, locked_until=excluded.locked_until, updated_at=datetime('now')`,
  ).bind(key, failures, lockedUntil).run();
}

function parse<T>(json: string, fallback: T): T {
  try { return JSON.parse(json) as T; } catch { return fallback; }
}

/** Everything the account page shows. Orders are matched by email, so ones placed before signing up appear too. */
export async function accountView(db: D1Database, customer: Customer) {
  const orders = await db.prepare(
    `SELECT id,order_number,status,total_cents,currency,tracking_number,tracking_url,created_at FROM orders
     WHERE email=? COLLATE NOCASE AND status<>'pending_payment' ORDER BY created_at DESC LIMIT 50`,
  ).bind(customer.email).all<{ id: string; order_number: string; status: string; total_cents: number; currency: string; tracking_number: string | null; tracking_url: string | null; created_at: string }>();
  const rows = orders.results ?? [];
  const items = rows.length
    ? (await db.prepare(`SELECT order_id,product_title AS title,size,color,quantity FROM order_items WHERE order_id IN (${rows.map(() => '?').join(',')})
      UNION ALL SELECT order_id,product_title,size,color,quantity FROM custom_order_items WHERE order_id IN (${rows.map(() => '?').join(',')})`)
      .bind(...rows.map((row) => row.id), ...rows.map((row) => row.id)).all<{ order_id: string; title: string; size: string; color: string; quantity: number }>()
      .catch(() => db.prepare(`SELECT order_id,product_title AS title,size,color,quantity FROM order_items WHERE order_id IN (${rows.map(() => '?').join(',')}) ORDER BY id`)
        .bind(...rows.map((row) => row.id)).all<{ order_id: string; title: string; size: string; color: string; quantity: number }>())).results ?? []
    : [];
  return {
    email: customer.email,
    name: [customer.first_name, customer.last_name].filter(Boolean).join(' '),
    address: parse<Record<string, string>>(customer.address_json, {}),
    sizes: parse<Record<string, string>>(customer.sizes_json, {}),
    wishlist: parse<string[]>(customer.wishlist_json, []),
    orders: rows.map((row) => {
      const step = STEPS[row.status] ?? STEPS.paid;
      return {
        orderNumber: row.order_number, placedAt: row.created_at, totalCents: row.total_cents, currency: row.currency,
        step: step.step, label: step.label, trackingNumber: row.tracking_number,
        trackingUrl: row.tracking_url && /^https:\/\//i.test(row.tracking_url) ? row.tracking_url : null,
        items: items.filter((item) => item.order_id === row.id).map(({ order_id: _, ...item }) => item),
      };
    }),
  };
}
