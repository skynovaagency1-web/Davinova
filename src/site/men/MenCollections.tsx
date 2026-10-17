import { motion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Product } from '../../types/product';
import { useCutouts } from '../../lib/useCutouts';
import { MEN_OCCASIONS, menOccasionPath } from './menFormal';

/** Wedding, Black tie and Holiday as glass cards; the suit stands up out of each card. */
export function MenCollections({ products }: { products: Product[] }) {
  const cutoutFor = useCutouts();
  return <section className="nova-collections m-collections">
    <div className="nova-collections__head">
      <span className="nova-chip">The occasions</span>
      <h2>Dress for <b>the day</b></h2>
    </div>
    <div className="nova-collections__grid">{MEN_OCCASIONS.map((occasion, index) => {
      const items = products.filter((product) => product.storeSubcategory === occasion.sub);
      const pick = items.find((product) => cutoutFor(product.id));
      const cut = pick && cutoutFor(pick.id);
      return <motion.div key={occasion.key} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.3 }} transition={{ duration: 0.6, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}>
        <Link to={menOccasionPath(occasion.key)} className="nova-collection-card">
          <span className={`nova-collection-card__img${cut ? ' nova-collection-card__img--pop' : ''}`}>{cut ? <img src={cut} alt="" loading="lazy" /> : <i className="m-collections__no">{occasion.no}</i>}</span>
          <span className="nova-collection-card__text">
            <strong>{occasion.title}</strong>
            <em>{occasion.line}</em>
            <small>{items.length ? `${items.length} looks` : 'New looks soon'}</small>
          </span>
          <span className="nova-collection-card__arrow"><ArrowUpRight size={18} /></span>
        </Link>
      </motion.div>;
    })}</div>
  </section>;
}
