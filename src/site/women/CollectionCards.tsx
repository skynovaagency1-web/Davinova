import { motion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Product } from '../../types/product';
import { editorialImages } from '../../lib/editorialImages';
import { SHELVES } from '../../lib/shelves';
import { useCutouts } from '../../lib/useCutouts';

const titles: Record<string, [string, string]> = {
  'wedding-guest': ['Wedding Guest', 'Collection'], 'cocktail-party': ['Cocktail', '& Party'], evening: ['Evening', 'Gowns'],
  'maxi-holiday': ['Maxi', '& Holiday'], bridal: ['Bridal', 'Collection'], everyday: ['Everyday', 'Dresses'],
};
const collections = SHELVES.map((shelf) => ({ key: shelf.key, title: titles[shelf.key][0], sub: titles[shelf.key][1], line: shelf.line, to: `/shop?occasion=${shelf.key}`, fallback: editorialImages.black }));

/** Featured collections as rounded cards with a photo, a two-weight title and an arrow chip. */
export function CollectionCards({ products }: { products: Product[] }) {
  const cutoutFor = useCutouts();
  const cards = collections.map((collection) => {
    const inCollection = products.filter((product) => product.shelf === collection.key);
    const popper = inCollection.find((product) => cutoutFor(product.id));
    const cover = inCollection.find((product) => product.images[0]?.url)?.images[0]?.url;
    return { ...collection, count: inCollection.length, image: cover ?? collection.fallback, cut: popper ? cutoutFor(popper.id) : undefined };
  }).filter((card) => card.count > 0);

  return <section className="nova-collections" id="collections">
    <div className="nova-collections__head">
      <span className="nova-chip">Featured collections</span>
      <h2>Pick your <b>occasion</b></h2>
    </div>
    <div className="nova-collections__grid">
      {cards.map((card, index) => <motion.div key={card.key} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.3 }} transition={{ duration: 0.6, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}>
        <Link to={card.to} className="nova-collection-card">
          <span className={`nova-collection-card__img${card.cut ? ' nova-collection-card__img--pop' : ''}`}><img src={card.cut ?? card.image} alt="" loading="lazy" /></span>
          <span className="nova-collection-card__text">
            <strong>{card.title}</strong>
            <em>{card.sub}</em>
            <small>{card.line}{card.count > 0 && ` · ${card.count} looks`}</small>
          </span>
          <span className="nova-collection-card__arrow"><ArrowUpRight size={18} /></span>
        </Link>
      </motion.div>)}
    </div>
  </section>;
}
