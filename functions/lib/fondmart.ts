/**
 * FondMart supplier adapter — NOT READY FOR LIVE ORDERS.
 *
 * FondMart currently documents Shopify automatic product import and a downloadable
 * product-data package for other e-commerce platforms. Do not assume an order API
 * exists for this custom store; confirm the supported integration method with
 * FondMart and implement it only from their current official documentation.
 */
export interface FondMartOrderLine {
  supplierProductId: string;
  supplierVariantId?: string;
  quantity: number;
}

export interface FondMartShippingAddress {
  firstName: string;
  lastName: string;
  address: string;
  city: string;
  postalCode: string;
  countryCode: string;
  phone: string;
}

export interface FondMartOrderRequest {
  orderNumber: string;
  shippingAddress: FondMartShippingAddress;
  products: FondMartOrderLine[];
}

export interface FondMartOrderResult {
  orderId: string;
  status: 'dry_run';
}

/**
 * Safe placeholder only. Live order forwarding deliberately fails closed until the
 * owner confirms a supported FondMart order integration and its credentials.
 */
export async function createFondMartOrder(input: FondMartOrderRequest, dryRun = true): Promise<FondMartOrderResult> {
  if (dryRun) return { orderId: `DRY-RUN-${input.orderNumber}`, status: 'dry_run' };
  throw new Error('FondMart live ordering is not implemented. Confirm the supported integration with FondMart before enabling.');
}
