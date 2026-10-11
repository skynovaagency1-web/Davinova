import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import type { Product } from '../types/product';
import { formatMoney } from '../lib/format';

export function ProductCard({ product }: { product: Product }) {
  return (
    <motion.article
      className="product-card group"
      initial={{ opacity: 0, y: 26 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -5 }}
    >
      <Link to={`/product/${product.slug}`} className="product-card__image" aria-label={`View ${product.title}`}>
        <motion.img
          src={product.images[0]?.url}
          alt={product.images[0]?.alt ?? product.title}
          loading="lazy"
          whileHover={{ scale: 1.065 }}
          transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
        />
        {product.compareAtCents && <span className="product-card__badge">A considered find</span>}
        <motion.span className="product-card__arrow" aria-hidden="true" initial={{ opacity: 0, y: 8 }} whileHover={{ opacity: 1, y: 0 }}><ArrowUpRight size={18} /></motion.span>
      </Link>
      <div className="product-card__meta"><div><p className="eyebrow">{product.length ? `${product.color} · ${product.length}` : product.color}</p><h3><Link to={`/product/${product.slug}`}>{product.title}</Link></h3></div><p className="product-card__price">{formatMoney(product.priceCents)}{product.compareAtCents && <del>{formatMoney(product.compareAtCents)}</del>}</p></div>
    </motion.article>
  );
}
