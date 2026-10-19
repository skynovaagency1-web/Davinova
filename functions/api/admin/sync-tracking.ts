import { scheduled } from '../../../server/scheduled';
import type { CJEnv } from '../../../server/cj';

type Env = CJEnv & { RESEND_API_KEY?: string; EMAIL_FROM?: string };

/**
 * Pages has no cron, so the hourly "Sync tracking" GitHub Action calls this.
 * Admin password is checked by functions/_middleware.ts.
 */
export async function onRequestPost({ env }: { env: Env }): Promise<Response> {
  await scheduled({ cron: 'manual', scheduledTime: Date.now() }, env, undefined as unknown as ExecutionContext);
  const pending = await env.DB.prepare("SELECT COUNT(*) AS n FROM supplier_orders WHERE supplier='cj' AND status IN ('ordered','shipped')").first<{ n: number }>();
  return Response.json({ ok: true, watching: pending?.n ?? 0 }, { headers: { 'Cache-Control': 'no-store' } });
}
