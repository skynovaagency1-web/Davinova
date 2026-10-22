import { unsubscribe, type NewsletterEnv } from '../../../server/newsletter';

function page(message: string, status = 200): Response {
  return new Response(
    '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Davinova</title>' +
    '<body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#FBF1E2;color:#2E2019;font-family:Arial,sans-serif;padding:24px">' +
    `<div style="max-width:420px;text-align:center"><p style="letter-spacing:.2em;font-size:12px">DAVINOVA</p><p style="font-size:18px">${message}</p>` +
    '<p><a href="/" style="color:#5A4536">Back to the shop</a></p></div></body>',
    { status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } },
  );
}

/** Link in every newsletter email. */
export async function onRequestGet({ request, env }: { request: Request; env: NewsletterEnv }): Promise<Response> {
  if (!env.DB) return page('Please try again in a moment.', 503);
  const token = new URL(request.url).searchParams.get('t') || '';
  return await unsubscribe(env.DB, token) ? page('You have been unsubscribed. You will not get any more newsletters from us.') : page('This link is not valid or was already used.', 404);
}

/** One-click unsubscribe from the email client (List-Unsubscribe-Post). */
export async function onRequestPost({ request, env }: { request: Request; env: NewsletterEnv }): Promise<Response> {
  if (env.DB) await unsubscribe(env.DB, new URL(request.url).searchParams.get('t') || '');
  return new Response(null, { status: 204 });
}
