import { describe, expect, it } from 'vitest';
import { normaliseSize } from './woocommerce';

describe('normaliseSize', () => {
  it('recognizes straight sizes and common spelling variants', () => {
    expect(normaliseSize('XS')).toBe('XS');
    expect(normaliseSize('x-small')).toBe('XS');
    expect(normaliseSize('S')).toBe('S');
    expect(normaliseSize('small')).toBe('S');
    expect(normaliseSize('M')).toBe('M');
    expect(normaliseSize('medium')).toBe('M');
    expect(normaliseSize('L')).toBe('L');
    expect(normaliseSize('large')).toBe('L');
    expect(normaliseSize('XL')).toBe('XL');
    expect(normaliseSize('x-large')).toBe('XL');
  });

  it('recognizes every extended size label through 6XL, not just up to 4XL', () => {
    expect(normaliseSize('1XL')).toBe('1XL');
    expect(normaliseSize('2XL')).toBe('2XL');
    expect(normaliseSize('XXL')).toBe('2XL');
    expect(normaliseSize('3XL')).toBe('3XL');
    expect(normaliseSize('XXXL')).toBe('3XL');
    expect(normaliseSize('4XL')).toBe('4XL');
    expect(normaliseSize('XXXXL')).toBe('4XL');
    expect(normaliseSize('5XL')).toBe('5XL');
    expect(normaliseSize('XXXXXL')).toBe('5XL');
    expect(normaliseSize('6XL')).toBe('6XL');
    expect(normaliseSize('XXXXXXL')).toBe('6XL');
  });

  it('recognizes every curve "<n>X" label through 6X, not just the "XL" spellings', () => {
    expect(normaliseSize('1X')).toBe('1X');
    expect(normaliseSize('2X')).toBe('2X');
    expect(normaliseSize('3X')).toBe('3X');
    expect(normaliseSize('4X')).toBe('4X');
    expect(normaliseSize('5X')).toBe('5X');
    expect(normaliseSize('6X')).toBe('6X');
  });

  it('treats 1XL as distinct from XL, not as a synonym', () => {
    expect(normaliseSize('XL')).toBe('XL');
    expect(normaliseSize('1XL')).toBe('1XL');
    expect(normaliseSize('XL')).not.toBe(normaliseSize('1XL'));
  });

  it('is tolerant of surrounding whitespace, hyphens, underscores and case', () => {
    expect(normaliseSize('  5xl  ')).toBe('5XL');
    expect(normaliseSize('5-x-l')).toBe('5XL');
    expect(normaliseSize('5_X_L')).toBe('5XL');
  });

  it('returns undefined for unrecognized labels instead of guessing', () => {
    expect(normaliseSize('one size')).toBeUndefined();
    expect(normaliseSize('Black')).toBeUndefined();
    expect(normaliseSize('')).toBeUndefined();
  });
});
