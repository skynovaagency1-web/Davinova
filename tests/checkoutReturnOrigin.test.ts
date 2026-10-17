import { describe, expect, it } from 'vitest';
import { resolveCheckoutReturnOrigin } from '../functions/api/checkout';

describe('Stripe checkout return origin', () => {
  it('keeps customers on the Curvy subdomain', () => {
    expect(resolveCheckoutReturnOrigin(
      'https://curvy.davinova.com/api/checkout',
      'https://davinova.com',
      'live',
    )).toBe('https://curvy.davinova.com');
  });

  it('keeps standard customers on the main domain', () => {
    expect(resolveCheckoutReturnOrigin(
      'https://davinova.com/api/checkout',
      'https://davinova.com',
      'live',
    )).toBe('https://davinova.com');
  });

  it('does not trust an unlisted request host', () => {
    expect(resolveCheckoutReturnOrigin(
      'https://attacker.example/api/checkout',
      'https://davinova.com',
      'live',
    )).toBe('https://davinova.com');
  });

  it('allows localhost only in Stripe test mode', () => {
    expect(resolveCheckoutReturnOrigin(
      'http://localhost:8788/api/checkout',
      'https://davinova.com',
      'test',
    )).toBe('http://localhost:8788');
    expect(resolveCheckoutReturnOrigin(
      'http://localhost:8788/api/checkout',
      'https://davinova.com',
      'live',
    )).toBe('https://davinova.com');
  });
});
