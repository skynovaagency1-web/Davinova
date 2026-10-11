/** PayPal adapter placeholder. Verify API and webhook event names against current docs. */
export async function createPayPalOrder(_input: { orderId: string; amountCents: number; currency: string }, _clientId?: string, _clientSecret?: string): Promise<{ id: string; approveUrl: string }> {
  throw new Error('PayPal order creation is not implemented yet.');
}
export async function verifyPayPalWebhook(_headers: Headers, _body: unknown, _webhookId?: string): Promise<never> {
  throw new Error('PayPal webhook verification is not implemented yet; reject events until it is.');
}
