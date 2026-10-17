import { describe, expect, it } from 'vitest';
import { verifyStripeWebhookSignature } from '../functions/api/webhooks/stripe';

async function signPayload(payload: Uint8Array, secret: string, timestamp: number): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const prefix = new TextEncoder().encode(timestamp + '.');
  const signed = new Uint8Array(prefix.length + payload.length);
  signed.set(prefix);
  signed.set(payload, prefix.length);
  const digest = new Uint8Array(await crypto.subtle.sign('HMAC', key, signed));
  const hex = Array.from(digest, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return 't=' + timestamp + ',v1=' + hex;
}

describe('Stripe webhook signature verification', () => {
  const secret = 'whsec_test_secret_for_unit_tests_only';
  const timestamp = Math.floor(Date.now() / 1000);
  const payload = new TextEncoder().encode('{"id":"evt_test","type":"checkout.session.completed"}');

  it('accepts a valid signature over the exact raw payload', async () => {
    const signature = await signPayload(payload, secret, timestamp);
    await expect(verifyStripeWebhookSignature(payload, signature, secret, timestamp)).resolves.toBe(true);
  });

  it('rejects a signature when the payload bytes change', async () => {
    const signature = await signPayload(payload, secret, timestamp);
    const modified = new TextEncoder().encode('{"id":"evt_changed","type":"checkout.session.completed"}');
    await expect(verifyStripeWebhookSignature(modified, signature, secret, timestamp)).resolves.toBe(false);
  });

  it('rejects a stale webhook timestamp', async () => {
    const stale = timestamp - 301;
    const signature = await signPayload(payload, secret, stale);
    await expect(verifyStripeWebhookSignature(payload, signature, secret, timestamp)).resolves.toBe(false);
  });

  it('rejects a missing signature header', async () => {
    await expect(verifyStripeWebhookSignature(payload, null, secret, timestamp)).resolves.toBe(false);
  });
});
