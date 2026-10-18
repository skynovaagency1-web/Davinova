import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import type { Product } from '../../types/product';
import { formatMoney } from '../../lib/format';
import { productPath } from '../../lib/storefront';
import { isFloating, useCutouts } from '../../lib/useCutouts';

/**
 * Women's product card. When the dress has a cut-out photo, the glass card is only the lower part and
 * the dress stands up out of it (3D pop-out); clothes with the model erased float in a lit studio box;
 * otherwise the photo sits inside the card.
 */
export function WomenCard({ product, index = 0 }: { product: Product; index?: number }) {
  const [broken, setBroken] = useState(false);
  const cutoutFor = useCutouts();
  const cutout = cutoutFor(product.id);
  const image = product.images[0]?.url;
  const second = product.images[1]?.url;
  const href = productPath(product);
  const kind = cutout ? (isFloating(cutout, product.storeCollection) ? ' w-card--float' : ' w-card--pop') : '';
  return <motion.article className={`w-card${kind}`} initial={{ opacity: 0, y: 26 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.1 }} transition={{ duration: 0.6, delay: (index % 4) * 0.06, ease: [0.22, 1, 0.36, 1] }}>
    <Link to={href} className="w-card__img" aria-label={product.title}>
      {cutout
        ? <img className="w-card__cutout" style={{ animationDelay: `${-(index % 5) * 1.3}s` }} src={cutout} alt={product.images[0]?.alt || product.title} loading="lazy" />
        : image && !broken ? <img src={image} alt={product.images[0].alt || product.title} loading="lazy" onError={() => setBroken(true)} /> : <span className="w-card__missing">Photo coming soon</span>}
      {!cutout && second && !broken && <img className="w-card__alt" src={second} alt="" aria-hidden="true" loading="lazy" />}
      {product.browseOnly && <span className="w-card__badge">Coming soon</span>}
      <span className="w-card__arrow"><ArrowUpRight size={16} /></span>
    </Link>
    <div className="w-card__meta">
      <Link to={href}><h3>{product.title}</h3></Link>
      <span className="w-card__price">{product.browseOnly ? 'Soon' : formatMoney(product.priceCents, product.currency)}</span>
    </div>
  </motion.article>;
}
