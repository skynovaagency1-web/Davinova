import { useEffect } from 'react';

export function usePageMeta(opts: { title: string; description?: string }) {
  useEffect(() => {
    document.title = opts.title;
    if (opts.description) {
      let tag = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
      if (!tag) {
        tag = document.createElement('meta');
        tag.name = 'description';
        document.head.appendChild(tag);
      }
      tag.content = opts.description;
    }
    // og:title for social sharing
    let og = document.querySelector('meta[property="og:title"]') as HTMLMetaElement | null;
    if (!og) {
      og = document.createElement('meta');
      og.setAttribute('property', 'og:title');
      document.head.appendChild(og);
    }
    og.content = opts.title;
  }, [opts.title, opts.description]);
}

export function productMetaTitle(title: string, occasion?: string) {
  const clean = title.replace(/\s+/g, ' ').trim().slice(0, 60);
  if (occasion) return `${clean} — ${occasion} | Davinova`;
  return `${clean} | Davinova`;
}

export function jsonLdProduct(product: { title: string; slug: string; priceCents: number; currency: string; images: { url: string }[]; description: string; inStock?: boolean }) {
  const url = `https://davinova.com/product/${product.slug}`;
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    description: product.description.slice(0, 500),
    image: product.images.map(i => i.url),
    url,
    brand: { '@type': 'Brand', name: 'Davinova' },
    offers: {
      '@type': 'Offer',
      priceCurrency: product.currency || 'USD',
      price: (product.priceCents / 100).toFixed(2),
      availability: product.inStock === false ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock',
      url,
      seller: { '@type': 'Organization', name: 'Davinova' },
    },
  };
}
