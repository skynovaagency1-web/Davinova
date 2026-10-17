import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import type { Product } from '../../types/product';
import { formatMoney } from '../../lib/format';
import { productPath } from '../../lib/storefront';

/** Men's product card: grey HUD tile with a look number, uppercase name and a price box. */
export function MenCard({ product, index = 0 }: { product: Product; index?: number }) {
  const [broken, setBroken] = useState(false);
  const image = product.images[0]?.url;
  const href = productPath(product);
  return <motion.article className="m-card" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.1 }} transition={{ duration: 0.5, delay: (index % 4) * 0.05 }}>
    <Link to={href} className="m-card__img" aria-label={product.title}>
      <span className="m-card__no">LOOK {String(index + 1).padStart(2, '0')}</span>
      {image && !broken ? <img src={image} alt={product.images[0].alt || product.title} loading="lazy" onError={() => setBroken(true)} /> : <span className="m-card__missing">PHOTO / SOON</span>}
      {product.browseOnly && <span className="m-card__badge">SOON</span>}
    </Link>
    <div className="m-card__meta">
      <Link to={href}><h3>{product.title}</h3></Link>
      <span>{product.browseOnly ? '—' : formatMoney(product.priceCents, product.currency)}</span>
    </div>
  </motion.article>;
}
