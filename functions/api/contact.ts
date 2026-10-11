export async function onRequestPost(): Promise<Response> {
  // TODO: zod validation, honeypot, IP-based rate limit, persist to D1, send via Resend.
  return Response.json({ error: 'Contact form submission is not implemented yet.' }, { status: 501, headers: { 'Cache-Control': 'no-store' } });
}
