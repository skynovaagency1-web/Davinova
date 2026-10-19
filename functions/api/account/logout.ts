import { clearedCookie, endSession, reply, sameOrigin, type AccountEnv } from '../../../server/accounts';

export async function onRequestPost({ request, env }: { request: Request; env: AccountEnv }): Promise<Response> {
  if (!sameOrigin(request)) return reply({ error: 'Not allowed.' }, 403);
  if (env.DB) await endSession(request, env.DB);
  return reply({ ok: true }, 200, { 'Set-Cookie': clearedCookie });
}
