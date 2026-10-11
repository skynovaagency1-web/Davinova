/** Approval-token signing is intentionally fail-closed until cryptographic implementation is added. */
export async function createApprovalToken(_orderId: string, _secret?: string): Promise<never> {
  throw new Error('Approval token signing is not implemented.');
}
export async function verifyApprovalToken(_token: string, _secret?: string): Promise<never> {
  throw new Error('Approval token verification is not implemented.');
}
