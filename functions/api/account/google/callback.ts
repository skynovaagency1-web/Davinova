import { GOOGLE_STATE_COOKIE as STATE_COOKIE, createSession, googleKeys, readCookie, sessionCookie, validEmail, type Customer } from '../../../../server/accounts';

type Env = { DB?: D1Database; GOOGLE_CLIENT_ID?: string; GOOGLE_CLIENT_SECRET?: string };

function home(origin: string, dept: string, query: string): string {
  return `${origin}${dept === 'men' ? '/men' : ''}/account${query}`;
}
const clearState = `${STATE_COOKIE}=; Path=/api/account/google; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;

/** Google sends the customer back here: check state, swap the code for the verified email, sign in (creating the account the first time). */
export async function onRequestGet({ request, env }: { request: Request; env: Env }): Promise<Response> {
  const url = new URL(request.url);
  const state = url.searchParams.get('state') || '';
  const dept = state.split('.')[1] === 'men' ? 'men' : 'women';
  const fail = (why: string) => new Response(null, { status: 302, headers: { Location: home(url.origin, dept, `?google=${why}`), 'Set-Cookie': clearState, 'Cache-Control': 'no-store' } });
  const keys = googleKeys(env);
  if (!env.DB || !keys) return fail('off');
  const saved = readCookie(request, STATE_COOKIE);
  if (!saved || saved !== state || !/^[a-f0-9]{48}\.(men|women)$/.test(state)) return fail('expired');
  const code = url.searchParams.get('code');
  if (!code) return fail('cancelled');

  const token = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code, client_id: keys.id, client_secret: keys.secret,
      redirect_uri: `${url.origin}/api/account/google/callback`, grant_type: 'authorization_code',
    }).toString(),
  }).then((response) => response.ok ? response.json() as Promise<{ access_token?: string }> : null).catch(() => null);
  if (!token?.access_token) return fail('failed');
  const profile = await fetch('https://openidconnect.googleapis.com/v1/userinfo', { headers: { Authorization: `Bearer ${token.access_token}` } })
    .then((response) => response.ok ? response.json() as Promise<{ email?: string; email_verified?: boolean; given_name?: string; family_name?: string }> : null).catch(() => null);
  const email = validEmail(profile?.email);
  if (!email || profile?.email_verified !== true) return fail('failed');

  await env.DB.prepare('INSERT INTO customers (id, email, first_name, last_name) VALUES (?, ?, ?, ?) ON CONFLICT(email) DO NOTHING')
    .bind(crypto.randomUUID(), email, (profile.given_name || '').slice(0, 60) || null, (profile.family_name || '').slice(0, 60) || null).run();
  const customer = await env.DB.prepare('SELECT id,email,first_name,last_name,address_json,sizes_json,wishlist_json FROM customers WHERE email=?').bind(email).first<Customer>();
  if (!customer) return fail('failed');
  const session = await createSession(env.DB, customer.id);
  const headers = new Headers({ Location: home(url.origin, dept, ''), 'Cache-Control': 'no-store' });
  headers.append('Set-Cookie', sessionCookie(session));
  headers.append('Set-Cookie', clearState);
  return new Response(null, { status: 302, headers });
}
