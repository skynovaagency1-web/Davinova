import { currentCustomer, reply, sameOrigin, type AccountEnv } from '../../../server/accounts';
import { checkIn, clubSummary, convertPoints, ensureClubTables } from '../../../server/rewards';
import { ensureReferralCode } from '../../../server/giftCards';

/** The signed-in member's Club summary: balance, points, streak, level, friends, history. */
export async function onRequestGet({ request, env }: { request: Request; env: AccountEnv }): Promise<Response> {
  if (!env.DB) return reply({ rewards: null });
  const customer = await currentCustomer(request, env.DB);
  if (!customer) return reply({ rewards: null }, 401);
  return reply({ rewards: await clubSummary(env.DB, customer.email) });
}

/** { action: 'checkin' } claims today's points; { action: 'convert' } turns whole 100s of points into balance; { action: 'invite' } creates the invite code. */
export async function onRequestPost({ request, env }: { request: Request; env: AccountEnv }): Promise<Response> {
  if (!sameOrigin(request)) return reply({ error: 'Not allowed.' }, 403);
  if (!env.DB) return reply({ error: 'Rewards are temporarily unavailable.' }, 503);
  const customer = await currentCustomer(request, env.DB);
  if (!customer) return reply({ error: 'Please sign in again.' }, 401);
  let body: { action?: unknown };
  try { body = await request.json() as typeof body; } catch { return reply({ error: 'Invalid request.' }, 400); }
  if (body.action === 'checkin') {
    const result = await checkIn(env.DB, customer.email);
    return reply({ checkin: result, rewards: await clubSummary(env.DB, customer.email) });
  }
  if (body.action === 'convert') {
    const cents = await convertPoints(env.DB, customer.email);
    if (!cents) return reply({ error: 'You need at least 100 points.' }, 400);
    return reply({ convertedCents: cents, rewards: await clubSummary(env.DB, customer.email) });
  }
  if (body.action === 'invite') {
    // Signed in means the email is verified, so the personal code can be shown on screen.
    await ensureClubTables(env.DB);
    await ensureReferralCode(env.DB, customer.email.toLowerCase());
    return reply({ rewards: await clubSummary(env.DB, customer.email) });
  }
  return reply({ error: 'Unknown action.' }, 400);
}
