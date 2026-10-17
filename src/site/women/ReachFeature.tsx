import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Product } from '../../types/product';
import { editorialImages } from '../../lib/editorialImages';
import { formatMoney } from '../../lib/format';
import { productPath } from '../../lib/storefront';

// A transparent PNG of a model reaching forward; until it exists the phone shows the framed photo.
const REACH_CUTOUT = '/images/reach-model.png';

/** Featured product: a model reaches out of a phone screen towards the dress beside it. */
export function ReachFeature({ product }: { product?: Product }) {
  const [hasCutout, setHasCutout] = useState(true);
  if (!product?.images[0]?.url) return null;

  return <section className="nova-reach">
    <motion.h2 initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.6 }} transition={{ duration: 0.7 }}>The one you <em>reach for.</em></motion.h2>
    <div className="nova-reach__scene">
      <motion.div className={hasCutout ? 'nova-reach__phone nova-reach__phone--cutout' : 'nova-reach__phone'} initial={{ opacity: 0, x: -40, rotate: -4 }} whileInView={{ opacity: 1, x: 0, rotate: 0 }} viewport={{ once: true, amount: 0.4 }} transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}>
        <div className="nova-reach__screen"><img src={editorialImages.burgundy} alt="" aria-hidden="true" /></div>
        {hasCutout && <img className="nova-reach__cutout" src={REACH_CUTOUT} alt="Model reaching out of the screen" onError={() => setHasCutout(false)} />}
      </motion.div>
      <motion.div className="nova-reach__product" initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.4 }} transition={{ duration: 0.9, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}>
        <Link to={productPath(product)} className="nova-reach__card">
          <img src={product.images[0].url} alt={product.images[0].alt || product.title} loading="lazy" />
        </Link>
        <div className="nova-reach__info">
          <span>Featured look</span>
          <strong>{product.title}</strong>
          <Link className="nova-pill-button" to={productPath(product)}>{product.browseOnly ? 'Coming soon' : formatMoney(product.priceCents, product.currency)} <span><ArrowRight size={16} /></span></Link>
        </div>
      </motion.div>
    </div>
  </section>;
}
