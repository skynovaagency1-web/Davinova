import { ensureNewsletterTable } from '../../../server/newsletter';

/** Owner export of active newsletter subscribers as CSV. Admin password is checked by functions/_middleware.ts. */
export async function onRequestGet({ env }: { env: { DB: D1Database } }): Promise<Response> {
  await ensureNewsletterTable(env.DB);
  const rows = await env.DB.prepare("SELECT email,dept,created_at FROM newsletter_list WHERE status='subscribed' ORDER BY created_at").all<{ email: string; dept: string; created_at: string }>();
  const csv = ['email,shop,signed_up', ...(rows.results ?? []).map((row) => `${row.email},${row.dept},${row.created_at}`)].join('\n');
  return new Response(csv, { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="davinova-subscribers.csv"', 'Cache-Control': 'no-store' } });
}
