export async function onRequestPost(): Promise<Response> {
  // TODO: validate order number/email, rate-limit requests, and return only minimal order status.
  return Response.json({ error: 'Order tracking is not implemented yet.' }, { status: 501, headers: { 'Cache-Control': 'no-store' } });
}
