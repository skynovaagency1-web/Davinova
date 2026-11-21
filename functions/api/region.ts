import { euSalesOpen, isEuDelivery, servedCountries, type EuEnv } from '../../server/shippingCountries';

/** Where the visitor is (Cloudflare country), whether we deliver to the EU yet, and every country the bag can ship to. */
export function onRequestGet(context: { request: Request & { cf?: { country?: string } }; env: EuEnv }): Response {
  const country = String(context.request.cf?.country || '').toUpperCase();
  return Response.json(
    { country, eu: isEuDelivery(country), euOpen: euSalesOpen(context.env), countries: servedCountries(context.env) },
    { headers: { 'Cache-Control': 'private, max-age=600' } },
  );
}
