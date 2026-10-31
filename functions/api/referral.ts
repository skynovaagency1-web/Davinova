import { ensureGiftTables, ensureReferralCode, sendReferralCode, type GiftEnv } from '../../server/giftCards';

function reply(data: unknown, status = 200): Response {
  return Response.json(data, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
}

/** Refer a friend: emails the customer their personal code (never shown on screen, so only the inbox owner gets it). */
export async function onRequestPost({ request, env }: { request: Request; env: GiftEnv }): Promise<Response> {
  if (request.headers.get('Origin') && request.headers.get('Origin') !== new URL(request.url).origin) return reply({ error: 'Cross-origin requests are not allowed.' }, 403);
  let body: Record<string, unknown>;
  try { body = await request.json() as Record<string, unknown>; } catch { return reply({ error: 'Invalid JSON request.' }, 400); }
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase().slice(0, 120) : '';
  if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email)) return reply({ error: 'Check your email address.' }, 400);
  try {
    await ensureGiftTables(env.DB);
    const code = await ensureReferralCode(env.DB, email);
    // At most one email a day per address, so the form can't be used to flood someone's inbox.
    const slot = await env.DB.prepare("UPDATE referral_codes SET last_sent_at=datetime('now') WHERE code=? AND (last_sent_at IS NULL OR last_sent_at < datetime('now','-1 day'))").bind(code).run();
    if (Number(slot.meta.changes) === 1) await sendReferralCode(env, email, code);
    return reply({ sent: true });
  } catch (error) {
    console.error('Referral code failed:', error instanceof Error ? error.message : error);
    return reply({ error: 'We couldn\'t send your code right now. Please try again later.' }, 503);
  }
}
