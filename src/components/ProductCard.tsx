import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import type { Product } from '../types/product';
import { formatMoney } from '../lib/format';

export function ProductCard({ product }: { product: Product }) {
  return (
    <article className="product-card group">
      <Link to={`/product/${product.slug}`} className="product-card__image" aria-label={`View ${product.title}`}>
        <img src={product.images[0]?.url} alt={product.images[0]?.alt ?? product.title} loading="lazy" />
        {product.compareAtCents && <span className="product-card__badge">A considered find</span>}
        <span className="product-card__arrow" aria-hidden="true"><ArrowUpRight size={18} /></span>
      </Link>
      <div className="product-card__meta"><div><p className="eyebrow">{product.length ? `${product.color} · ${product.length}` : product.color}</p><h3><Link to={`/product/${product.slug}`}>{product.title}</Link></h3></div><p className="product-card__price">{formatMoney(product.priceCents)}{product.compareAtCents && <del>{formatMoney(product.compareAtCents)}</del>}</p></div>
    </article>
  );
}
