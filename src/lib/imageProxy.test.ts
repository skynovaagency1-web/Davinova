import { describe, expect, it } from 'vitest';
import { siteImage, supplierImage } from './imageProxy';

describe('image proxy paths', () => {
  it('maps supplier photos to /img and back', () => {
    const url = 'https://cf.cjdropshipping.com/quick/product/abc.jpg';
    expect(siteImage(url)).toBe('/img/cf.cjdropshipping.com/quick/product/abc.jpg');
    expect(supplierImage(siteImage(url))).toBe(url);
  });
  it('leaves other photos alone and refuses other hosts', () => {
    expect(siteImage('/cutouts/x.webp')).toBe('/cutouts/x.webp');
    expect(siteImage('https://example.com/a.jpg')).toBe('https://example.com/a.jpg');
    expect(supplierImage('/img/example.com/a.jpg')).toBeNull();
    expect(supplierImage('/img/cf.cjdropshipping.com/../x')).toBeNull();
  });
});
