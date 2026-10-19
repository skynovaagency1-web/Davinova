import { sendTransactionalEmail } from '../../../server/email';
import { CODE_MINUTES, countAttempt, lockedOut, randomCode, reply, sameOrigin, sha256, validEmail, type AccountEnv } from '../../../server/accounts';

/** Emails a 6-digit sign-in code. The answer is the same whether or not the email has an account. */
export async function onRequestPost({ request, env }: { request: Request; env: AccountEnv }): Promise<Response> {
  if (!sameOrigin(request)) return reply({ error: 'Not allowed.' }, 403);
  if (!env.DB) return reply({ error: 'Accounts are temporarily unavailable.' }, 503);
  let body: { email?: unknown };
  try { body = await request.json() as typeof body; } catch { return reply({ error: 'Invalid request.' }, 400); }
  const email = validEmail(body.email);
  if (!email) return reply({ error: 'Enter a valid email address.' }, 400);

  // At most 8 codes per IP and 5 per email every 30 minutes, so nobody can flood an inbox.
  const ipKey = 'acct-send:' + (request.headers.get('CF-Connecting-IP') || 'unknown');
  const mailKey = 'acct-mail:' + email;
  if (await lockedOut(env.DB, ipKey) || await lockedOut(env.DB, mailKey)) return reply({ error: 'Too many codes requested. Please try again in 30 minutes.' }, 429);
  const recent = await env.DB.prepare("SELECT 1 FROM customer_codes WHERE email=? AND sent_at>datetime('now','-45 seconds')").bind(email).first();
  if (recent) return reply({ ok: true, sent: false, message: 'A code was just sent. Check your inbox and spam folder.' });
  await countAttempt(env.DB, ipKey, 8, 30);
  await countAttempt(env.DB, mailKey, 5, 30);

  const code = randomCode();
  await env.DB.prepare(
    `INSERT INTO customer_codes (email, code_hash, attempts, expires_at, sent_at) VALUES (?,?,0,datetime('now', ?),datetime('now'))
     ON CONFLICT(email) DO UPDATE SET code_hash=excluded.code_hash, attempts=0, expires_at=excluded.expires_at, sent_at=excluded.sent_at`,
  ).bind(email, await sha256(email + ':' + code), `+${CODE_MINUTES} minutes`).run();
  try {
    await sendTransactionalEmail({
      to: email,
      subject: `${code} is your Davinova sign-in code`,
      html: '<div style="font-family:Arial,sans-serif;background:#FBF1E2;padding:28px;color:#2E2019">' +
        '<p style="letter-spacing:.2em;font-size:12px;margin:0 0 18px">DAVINOVA</p>' +
        '<p style="margin:0 0 10px">Your sign-in code:</p>' +
        `<p style="font-size:34px;letter-spacing:.3em;font-weight:700;margin:0 0 18px;color:#3C2A21">${code}</p>` +
        `<p style="margin:0;color:#5A4536">It works for ${CODE_MINUTES} minutes. If you did not ask for it, you can ignore this email.</p></div>`,
    }, env.RESEND_API_KEY, env.EMAIL_FROM);
  } catch (error) {
    console.error('Sign-in code email failed:', error instanceof Error ? error.message : error);
    return reply({ error: 'We could not send the code right now. Please try again in a moment.' }, 502);
  }
  return reply({ ok: true, sent: true });
}
