import { describe, expect, it } from 'vitest';
import { randomCode, sameOrigin, sessionCookie, validEmail } from '../server/accounts';

describe('customer accounts', () => {
  it('normalises and checks emails', () => {
    expect(validEmail('  Ana@Example.COM ')).toBe('ana@example.com');
    expect(validEmail('not-an-email')).toBe('');
    expect(validEmail('a<b@x.io')).toBe('');
  });
  it('makes 6-digit codes', () => { for (let i = 0; i < 50; i++) expect(randomCode()).toMatch(/^\d{6}$/); });
  it('refuses other sites', () => {
    expect(sameOrigin(new Request('https://davinova.com/api/account', { method: 'PUT', headers: { Origin: 'https://evil.example' } }))).toBe(false);
    expect(sameOrigin(new Request('https://davinova.com/api/account', { method: 'PUT', headers: { Origin: 'https://davinova.com' } }))).toBe(true);
  });
  it('keeps the session cookie away from scripts', () => expect(sessionCookie('a'.repeat(64))).toMatch(/HttpOnly; Secure; SameSite=Lax/));
});
