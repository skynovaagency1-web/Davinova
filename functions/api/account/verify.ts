import { accountView, countAttempt, createSession, lockedOut, MAX_CODE_ATTEMPTS, reply, sameOrigin, sessionCookie, sha256, validEmail, type AccountEnv, type Customer } from '../../../server/accounts';

/** Checks the emailed code, creates the account on first sign-in and starts a 60-day session. */
export async function onRequestPost({ request, env }: { request: Request; env: AccountEnv }): Promise<Response> {
  if (!sameOrigin(request)) return reply({ error: 'Not allowed.' }, 403);
  if (!env.DB) return reply({ error: 'Accounts are temporarily unavailable.' }, 503);
  let body: { email?: unknown; code?: unknown };
  try { body = await request.json() as typeof body; } catch { return reply({ error: 'Invalid request.' }, 400); }
  const email = validEmail(body.email);
  const code = typeof body.code === 'string' ? body.code.replace(/\s/g, '') : '';
  if (!email || !/^\d{6}$/.test(code)) return reply({ error: 'Enter the 6-digit code from the email.' }, 400);

  const ipKey = 'acct-verify:' + (request.headers.get('CF-Connecting-IP') || 'unknown');
  if (await lockedOut(env.DB, ipKey)) return reply({ error: 'Too many attempts. Please try again in 15 minutes.' }, 429);
  const row = await env.DB.prepare("SELECT code_hash, attempts, expires_at>datetime('now') AS live FROM customer_codes WHERE email=?")
    .bind(email).first<{ code_hash: string; attempts: number; live: number }>();
  if (!row || !row.live || row.attempts >= MAX_CODE_ATTEMPTS) return reply({ error: 'This code has expired. Ask for a new one.' }, 400);
  if (row.code_hash !== await sha256(email + ':' + code)) {
    await env.DB.prepare('UPDATE customer_codes SET attempts=attempts+1 WHERE email=?').bind(email).run();
    await countAttempt(env.DB, ipKey, 20, 15);
    return reply({ error: 'That code is not right. Check the email and try again.' }, 400);
  }
  await env.DB.prepare('DELETE FROM customer_codes WHERE email=?').bind(email).run();

  await env.DB.prepare("INSERT INTO customers (id, email) VALUES (?, ?) ON CONFLICT(email) DO NOTHING").bind(crypto.randomUUID(), email).run();
  const customer = await env.DB.prepare('SELECT id,email,first_name,last_name,address_json,sizes_json,wishlist_json FROM customers WHERE email=?')
    .bind(email).first<Customer>();
  if (!customer) return reply({ error: 'We could not open your account. Please try again.' }, 500);
  const token = await createSession(env.DB, customer.id);
  return reply({ account: await accountView(env.DB, customer) }, 200, { 'Set-Cookie': sessionCookie(token) });
}
