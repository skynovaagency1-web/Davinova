import { describe, expect, it } from 'vitest';
import { cleanDescription } from '../src/site/shared/cleanDescription';

describe('product descriptions', () => {
  it('removes image tags but preserves text around them', () => {
    expect(cleanDescription('Fabric: polyester <img src="https://example.test/a.jpg">Colour: black')).toBe('Fabric: polyester Colour: black');
  });
  it('removes incomplete trailing image tags', () => {
    expect(cleanDescription('Dress x 1pc <img src="https://example.test')).toBe('Dress x 1pc');
  });
  it('keeps ordinary product details', () => {
    expect(cleanDescription('Size: S, M, L. Fabric: polyester.')).toBe('Size: S, M, L. Fabric: polyester.');
  });
  it('removes image tags irrespective of capitalization', () => {
    expect(cleanDescription('Details <IMG SRC="x">')).toBe('Details');
  });
});
