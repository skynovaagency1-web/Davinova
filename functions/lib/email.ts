/** Resend HTTP API adapter placeholder. Do not send until verified sender/domain is configured. */
export async function sendTransactionalEmail(_input: { to: string; subject: string; html: string }, _apiKey?: string, _from?: string): Promise<void> {
  throw new Error('Resend email delivery is not implemented yet.');
}
