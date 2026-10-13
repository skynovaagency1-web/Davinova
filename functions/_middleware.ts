interface Env { ADMIN_PASSWORD?: string }
interface Context { request: Request; next: () => Promise<Response>; env: Env }

// Placeholder perimeter middleware. Protect /api/admin/* with Cloudflare Access in production;
// this password fallback must be replaced with a timing-safe, session-based implementation.
export async function onRequest(context: Context): Promise<Response> {
  const url = new URL(context.request.url);
  if (!url.pathname.startsWith('/api/admin/')) return context.next();
  // This exact endpoint verifies a high-entropy, expiring, one-use approval token itself.
  if (url.pathname === '/api/admin/cj-approve' && ['GET', 'POST'].includes(context.request.method)) return context.next();
  const expected = context.env.ADMIN_PASSWORD;
  const supplied = context.request.headers.get('x-admin-password');
  if (!expected || !supplied || supplied !== expected) {
    return Response.json({ error: 'Unauthorized' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
  }
  return context.next();
}
