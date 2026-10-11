/**
 * CJ Dropshipping API adapter — NOT READY FOR LIVE ORDERS.
 * Official docs: https://developers.cjdropshipping.com/
 * VERIFY each endpoint, request field, token expiry, logistics option, and payment flow
 * against the current official API docs before implementation or deployment.
 */
export interface CjOrderLine { vid: string; quantity: number }
export interface CjShippingAddress { firstName: string; lastName: string; address: string; city: string; postalCode: string; countryCode: string; phone: string }
export interface CjOrderRequest { orderNumber: string; shippingAddress: CjShippingAddress; products: CjOrderLine[]; logisticName: string }
export interface CjOrderResult { orderId: string; status: string }

export async function createCjOrder(_input: CjOrderRequest, dryRun = true): Promise<CjOrderResult> {
  if (dryRun) return { orderId: `DRY-RUN-${_input.orderNumber}`, status: 'dry_run' };
  throw new Error('CJ live ordering is not implemented. Verify API v2 docs before enabling.');
}
