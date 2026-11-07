/**
 * "Sign in with Google": sends the customer to Google with a one-time state cookie.
 * Needs GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET (Cloudflare Pages settings); without them the button is hidden.
 */
import { GOOGLE_STATE_COOKIE as STATE_COOKIE, googleKeys } from '../../../../server/accounts';

type Env = { GOOGLE_CLIENT_ID?: string; GOOGLE_CLIENT_SECRET?: string };

export async function onRequestGet({ request, env }: { request: Request; env: Env }): Promise<Response> {
  const url = new URL(request.url);
  const keys = googleKeys(env);
  if (url.searchParams.get('check') === '1') {
    return Response.json({ enabled: Boolean(keys) }, { headers: { 'Cache-Control': 'no-store' } });
  }
  if (!keys) return Response.redirect(`${url.origin}/account?google=off`, 302);
  const back = url.searchParams.get('dept') === 'men' ? 'men' : 'women';
  const nonce = [...crypto.getRandomValues(new Uint8Array(24))].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  const state = `${nonce}.${back}`;
  const google = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  google.searchParams.set('client_id', keys.id);
  google.searchParams.set('redirect_uri', `${url.origin}/api/account/google/callback`);
  google.searchParams.set('response_type', 'code');
  google.searchParams.set('scope', 'openid email profile');
  google.searchParams.set('state', state);
  google.searchParams.set('prompt', 'select_account');
  return new Response(null, {
    status: 302,
    headers: {
      Location: google.toString(),
      'Set-Cookie': `${STATE_COOKIE}=${state}; Path=/api/account/google; HttpOnly; Secure; SameSite=Lax; Max-Age=600`,
      'Cache-Control': 'no-store',
    },
  });
}
