import { motion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Product } from '../../types/product';
import { editorialImages } from '../../lib/editorialImages';
import { categoryPath, stockedGroups } from '../../lib/categories';
import { useCutouts } from '../../lib/useCutouts';

/** Featured collections as rounded cards with a photo, a two-weight title and an arrow chip. */
export function CollectionCards({ products }: { products: Product[] }) {
  const cutoutFor = useCutouts();
  const cards = stockedGroups(products).map(({ group, items }) => {
    const words = group.label.split(' ');
    const popper = items.find((product) => cutoutFor(product.id));
    const cover = items.find((product) => product.images[0]?.url)?.images[0]?.url;
    // The line under the title names the types this category actually has in stock.
    const line = group.subcategories.filter((sub) => items.some((product) => product.storeSubcategory === sub.slug)).slice(0, 3).map((sub) => sub.label).join(' · ');
    return {
      key: group.slug, title: words[0], sub: words.slice(1).join(' '),
      line, to: categoryPath(group.slug), count: items.length, image: cover ?? editorialImages.black, cut: popper ? cutoutFor(popper.id) : undefined,
    };
  });

  return <section className="nova-collections" id="collections">
    <div className="nova-collections__head">
      <span className="nova-chip">Featured collections</span>
      <h2>Shop by <b>collection</b></h2>
    </div>
    <div className="nova-collections__grid">
      {cards.map((card, index) => <motion.div key={card.key} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.3 }} transition={{ duration: 0.6, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}>
        <Link to={card.to} className="nova-collection-card">
          <span className={`nova-collection-card__img${card.cut ? ' nova-collection-card__img--pop' : ''}`}><img src={card.cut ?? card.image} alt="" loading="lazy" /></span>
          <span className="nova-collection-card__text">
            <strong>{card.title}</strong>
            <em>{card.sub}</em>
            <small>{card.line ? `${card.line} · ` : ''}{card.count} looks</small>
          </span>
          <span className="nova-collection-card__arrow"><ArrowUpRight size={18} /></span>
        </Link>
      </motion.div>)}
    </div>
  </section>;
}
