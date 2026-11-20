import { euSalesOpen, isEuDelivery, type EuEnv } from '../../server/shippingCountries';

/** Where the visitor is (Cloudflare country) and whether we deliver to the EU yet, for the product page note. */
export function onRequestGet(context: { request: Request & { cf?: { country?: string } }; env: EuEnv }): Response {
  const country = String(context.request.cf?.country || '').toUpperCase();
  return Response.json(
    { country, eu: isEuDelivery(country), euOpen: euSalesOpen(context.env) },
    { headers: { 'Cache-Control': 'private, max-age=600' } },
  );
}
