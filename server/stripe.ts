/** Stripe adapter placeholder. Verify current API versions and webhook requirements. */
export async function createStripeCheckout(_input: { orderId: string; amountCents: number; currency: string; successUrl: string; cancelUrl: string }, _secretKey?: string): Promise<{ url: string }> {
  throw new Error('Stripe Checkout creation is not implemented yet.');
}
export async function verifyStripeWebhook(_rawBody: string, _signature: string | null, _secret?: string): Promise<never> {
  throw new Error('Stripe webhook signature verification is not implemented yet; reject events until it is.');
}
