export async function onRequestPost(): Promise<Response> {
  // Fail closed until server-side cart validation, D1 pricing, address validation,
  // checkout session creation, and webhook-based order confirmation are implemented.
  return Response.json({ error: 'Checkout is not available in this development scaffold.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
}
