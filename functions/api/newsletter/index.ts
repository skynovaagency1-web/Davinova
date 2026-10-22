import { countAttempt, lockedOut, reply, sameOrigin, validEmail } from '../../../server/accounts';
import { sendWelcome, subscribe, type NewsletterEnv } from '../../../server/newsletter';

/** Footer newsletter sign-up. Sends one welcome email from news@ to new subscribers. */
export async function onRequestPost({ request, env }: { request: Request; env: NewsletterEnv }): Promise<Response> {
  if (!sameOrigin(request)) return reply({ error: 'Not allowed.' }, 403);
  if (!env.DB) return reply({ error: 'Sign-up is temporarily unavailable.' }, 503);
  let body: { email?: unknown; dept?: unknown };
  try { body = await request.json() as typeof body; } catch { return reply({ error: 'Invalid request.' }, 400); }
  const email = validEmail(body.email);
  if (!email) return reply({ error: 'Enter a valid email address.' }, 400);
  const dept = body.dept === 'men' ? 'men' : 'women';

  // At most 10 sign-ups per IP every 30 minutes.
  const ipKey = 'news:' + (request.headers.get('CF-Connecting-IP') || 'unknown');
  if (await lockedOut(env.DB, ipKey)) return reply({ error: 'Too many sign-ups. Please try again later.' }, 429);
  await countAttempt(env.DB, ipKey, 10, 30);

  const { token, isNew } = await subscribe(env.DB, email, dept);
  if (isNew) {
    try { await sendWelcome(env, email, token, dept); } catch (error) {
      console.error('Welcome email failed:', error instanceof Error ? error.message : error);
    }
  }
  return reply({ ok: true });
}
