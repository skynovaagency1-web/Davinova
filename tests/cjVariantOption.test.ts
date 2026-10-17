import { describe, expect, it } from 'vitest';
import { parseCJVariantOption } from '../server/cj';

describe('parseCJVariantOption', () => {
  it('splits "Black / 2XL" into size and colour', () => {
    expect(parseCJVariantOption('Black / 2XL')).toEqual({ size: '2XL', color: 'Black' });
  });

  it('splits "2XL - Black" regardless of field order', () => {
    expect(parseCJVariantOption('2XL - Black')).toEqual({ size: '2XL', color: 'Black' });
  });

  it('splits labels with no spaces around the separator, e.g. "Black-2XL"', () => {
    expect(parseCJVariantOption('Black-2XL')).toEqual({ size: '2XL', color: 'Black' });
  });

  it('splits a multi-word colour from its size, e.g. "Dusty Rose / 1XL"', () => {
    expect(parseCJVariantOption('Dusty Rose / 1XL')).toEqual({ size: '1XL', color: 'Dusty Rose' });
  });

  it('recognizes every curve size label through 6X and 6XL, combined with a colour', () => {
    expect(parseCJVariantOption('Black / 1X')).toEqual({ size: '1X', color: 'Black' });
    expect(parseCJVariantOption('Black / 1XL')).toEqual({ size: '1XL', color: 'Black' });
    expect(parseCJVariantOption('Black / 5X')).toEqual({ size: '5X', color: 'Black' });
    expect(parseCJVariantOption('Black / 5XL')).toEqual({ size: '5XL', color: 'Black' });
    expect(parseCJVariantOption('Black / 6X')).toEqual({ size: '6X', color: 'Black' });
    expect(parseCJVariantOption('Black / 6XL')).toEqual({ size: '6XL', color: 'Black' });
  });

  it('treats a bare size with no colour as size-only, not ambiguous', () => {
    expect(parseCJVariantOption('2XL')).toEqual({ size: '2XL', color: 'Not verified' });
    expect(parseCJVariantOption('1X')).toEqual({ size: '1X', color: 'Not verified' });
  });

  it('keeps the original label when no token reads as a recognized size', () => {
    expect(parseCJVariantOption('Black')).toEqual({ size: 'Black', color: 'Not verified' });
    expect(parseCJVariantOption('One Size')).toEqual({ size: 'One Size', color: 'Not verified' });
  });

  it('keeps the original label when more than one token looks like a size (ambiguous)', () => {
    expect(parseCJVariantOption('XL / 2XL')).toEqual({ size: 'XL / 2XL', color: 'Not verified' });
  });

  it('keeps the original label for an empty or whitespace-only string', () => {
    expect(parseCJVariantOption('')).toEqual({ size: 'Not verified', color: 'Not verified' });
    expect(parseCJVariantOption('   ')).toEqual({ size: 'Not verified', color: 'Not verified' });
  });

  it('is tolerant of semicolons, commas and extra whitespace as separators', () => {
    expect(parseCJVariantOption('Black; 3XL')).toEqual({ size: '3XL', color: 'Black' });
    expect(parseCJVariantOption('Black,3XL')).toEqual({ size: '3XL', color: 'Black' });
    expect(parseCJVariantOption('  Black   3XL  ')).toEqual({ size: '3XL', color: 'Black' });
  });

  it('never fabricates a size for a colour-only label, even one shaped like a product option', () => {
    // "S" here is a stand-in colour code with no digit, should not resolve as a size unless recognized.
    expect(parseCJVariantOption('Champagne')).toEqual({ size: 'Champagne', color: 'Not verified' });
  });

  it("reads a men's XXL as its own plain letter size, not as the women's 2XL curve size", () => {
    expect(parseCJVariantOption('Black / XXL', 'men')).toEqual({ size: 'XXL', color: 'Black' });
    expect(parseCJVariantOption('Black / 2XL', 'men')).toEqual({ size: 'XXL', color: 'Black' });
  });

  it("still reads a women's \"XXL\" as the 2XL curve size under the default women's department", () => {
    expect(parseCJVariantOption('Black / XXL')).toEqual({ size: '2XL', color: 'Black' });
  });

  it("does not recognize a women's curve size label (like 3XL) under the men's department", () => {
    expect(parseCJVariantOption('Black / 3XL', 'men')).toEqual({ size: 'Black / 3XL', color: 'Not verified' });
  });
});
