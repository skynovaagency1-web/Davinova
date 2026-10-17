import { describe, expect, it } from 'vitest';
import { onRequest } from '../functions/_middleware';
import { FakeD1 } from './helpers/fakeD1';

const ADMIN_PASSWORD = 'correct-horse-battery-staple';

function request(path: string, password?: string, ip = '203.0.113.5'): Request {
  const headers: Record<string, string> = { 'CF-Connecting-IP': ip };
  if (password !== undefined) headers['x-admin-password'] = password;
  return new Request('https://davinova.com' + path, { headers });
}

function next() {
  return async () => new Response('ok', { status: 200 });
}

describe('admin middleware', () => {
  it('lets non-admin paths through untouched', async () => {
    const response = await onRequest({ request: request('/api/catalog'), next: next(), env: {} });
    expect(response.status).toBe(200);
  });

  it('always lets the token-authenticated cj-approve endpoint through', async () => {
    const response = await onRequest({ request: request('/api/admin/cj-approve'), next: next(), env: {} });
    expect(response.status).toBe(200);
  });

  it('rejects when ADMIN_PASSWORD is not configured, even with a supplied password', async () => {
    const response = await onRequest({ request: request('/api/admin/cj-catalog', 'anything'), next: next(), env: {} });
    expect(response.status).toBe(401);
  });

  it('rejects a missing or wrong password', async () => {
    const env = { ADMIN_PASSWORD };
    const missing = await onRequest({ request: request('/api/admin/cj-catalog'), next: next(), env });
    expect(missing.status).toBe(401);
    const wrong = await onRequest({ request: request('/api/admin/cj-catalog', 'nope'), next: next(), env });
    expect(wrong.status).toBe(401);
  });

  it('accepts the correct password and reaches the next handler', async () => {
    const response = await onRequest({
      request: request('/api/admin/cj-catalog', ADMIN_PASSWORD),
      next: next(),
      env: { ADMIN_PASSWORD },
    });
    expect(response.status).toBe(200);
  });

  it('locks out an IP after repeated failed attempts, independent of other IPs', async () => {
    const db = new FakeD1();
    const env = { ADMIN_PASSWORD, DB: db as unknown as D1Database };

    let lastResponse: Response | undefined;
    for (let attempt = 0; attempt < 5; attempt++) {
      lastResponse = await onRequest({ request: request('/api/admin/cj-catalog', 'wrong', '198.51.100.1'), next: next(), env });
    }
    expect(lastResponse!.status).toBe(401);

    const lockedResponse = await onRequest({
      request: request('/api/admin/cj-catalog', ADMIN_PASSWORD, '198.51.100.1'),
      next: next(),
      env,
    });
    expect(lockedResponse.status).toBe(429);

    const otherIp = await onRequest({
      request: request('/api/admin/cj-catalog', ADMIN_PASSWORD, '198.51.100.2'),
      next: next(),
      env,
    });
    expect(otherIp.status).toBe(200);
  });

  it('clears the failure count after a successful login', async () => {
    const db = new FakeD1();
    const env = { ADMIN_PASSWORD, DB: db as unknown as D1Database };
    const ip = '198.51.100.3';

    for (let attempt = 0; attempt < 4; attempt++) {
      await onRequest({ request: request('/api/admin/cj-catalog', 'wrong', ip), next: next(), env });
    }
    const success = await onRequest({ request: request('/api/admin/cj-catalog', ADMIN_PASSWORD, ip), next: next(), env });
    expect(success.status).toBe(200);
    expect(db.adminAuthAttempts.has(ip)).toBe(false);

    // One more wrong attempt should start counting from zero again, not resume near the old threshold.
    const afterReset = await onRequest({ request: request('/api/admin/cj-catalog', 'wrong', ip), next: next(), env });
    expect(afterReset.status).toBe(401);
    const stillAllowed = await onRequest({ request: request('/api/admin/cj-catalog', ADMIN_PASSWORD, ip), next: next(), env });
    expect(stillAllowed.status).toBe(200);
  });

  it('lets a request through again once the lockout window has expired', async () => {
    const db = new FakeD1();
    const env = { ADMIN_PASSWORD, DB: db as unknown as D1Database };
    const ip = '198.51.100.4';

    db.adminAuthAttempts.set(ip, {
      ip, failures: 5, locked_until: new Date(Date.now() - 1000).toISOString(), updated_at: new Date().toISOString(),
    });

    const response = await onRequest({ request: request('/api/admin/cj-catalog', ADMIN_PASSWORD, ip), next: next(), env });
    expect(response.status).toBe(200);
  });
});
