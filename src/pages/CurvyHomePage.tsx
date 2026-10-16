import { motion } from 'framer-motion';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ProductCard } from '../components/ProductCard';
import { editorialImages } from '../lib/editorialImages';
import { isCurvyProduct, STANDARD_STOREFRONT_URL } from '../lib/storefront';
import { useCatalogProducts } from '../lib/useCatalogProducts';

const riseIn = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: 'easeOut' } },
};

export function CurvyHomePage() {
  const { products, loading } = useCatalogProducts();
  const curvyProducts = products.filter(isCurvyProduct);

  return (
    <div className="curvy-storefront">
      <section className="curvy-hero">
        <motion.div className="curvy-hero__copy" initial="hidden" animate="visible" transition={{ staggerChildren: 0.12 }}>
          <motion.p className="eyebrow" variants={riseIn}>Davinova · The Curve Edit</motion.p>
          <motion.h1 variants={riseIn}>Your curves.<br /><em>Your moment.</em></motion.h1>
          <motion.p className="curvy-hero__description" variants={riseIn}>
            Occasionwear with room to feel like yourself. Discover a considered, size-inclusive edit made for celebrations, evenings, and everything worth remembering.
          </motion.p>
          <motion.div className="curvy-hero__actions" variants={riseIn}>
            <a className="button button--dark" href="#curvy-edit">Explore the Curvy edit <ArrowRight size={16} /></a>
            <a className="curvy-text-link" href={STANDARD_STOREFRONT_URL}>Visit standard collection <ArrowUpRight size={15} /></a>
          </motion.div>
          <motion.div className="curvy-hero__note" variants={riseIn}><span /> Dedicated to extended-size discovery</motion.div>
        </motion.div>

        <motion.div className="curvy-hero__art" initial={{ opacity: 0, x: 22 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.9, delay: 0.15 }}>
          <img src={editorialImages.burgundy} alt="Davinova Curve Edit editorial inspiration; not an exact product photograph" />
          <div className="curvy-hero__art-caption"><span>THE CURVE EDIT</span><span>DAVINOVA · 02</span></div>
          <div className="curvy-hero__seal">Made for<br /><em>your moment.</em></div>
        </motion.div>
      </section>

      <section className="curvy-manifesto">
        <p className="eyebrow">A different kind of edit</p>
        <p className="curvy-manifesto__quote">Style isn't a size.<br /><em>It's how you feel in it.</em></p>
        <p className="curvy-manifesto__body">The Curvy store is being curated separately, so extended-size options and fit details can be identified clearly instead of getting lost in a general catalogue.</p>
      </section>

      <section className="curvy-edit section" id="curvy-edit">
        <div className="section-heading">
          <div>
            <p className="eyebrow">The Curve Edit</p>
            <h2>Occasionwear for <em>your silhouette.</em></h2>
          </div>
          <Link className="text-link" to="/shop">View the full edit <ArrowRight size={16} /></Link>
        </div>

        {loading ? (
          <p className="curvy-empty-state">Preparing the Curvy edit…</p>
        ) : curvyProducts.length > 0 ? (
          <div className="product-grid">
            {curvyProducts.slice(0, 4).map((product, index) => (
              <ProductCard key={product.id} product={product} index={index} />
            ))}
          </div>
        ) : (
          <div className="curvy-empty-state">
            <span className="curvy-empty-state__index">THE FIRST EDIT · IN PREPARATION</span>
            <h3>Good things are being gathered.</h3>
            <p>We’ll show dresses here when their plus-size or extended-size details are identified. For now, we won’t guess a fit or imply that an unverified size is available.</p>
            <Link className="button button--dark" to="/shop">Explore the Curvy store <ArrowRight size={16} /></Link>
          </div>
        )}
      </section>

      <section className="curvy-occasion">
        <div>
          <p className="eyebrow">A look for the invitation</p>
          <h2>Dress for the <em>feeling.</em></h2>
          <p>Start with the occasion. Find your mood. The collection will grow as suitable extended-size styles are confirmed.</p>
        </div>
        <nav aria-label="Shop Curvy by occasion">
          <Link to="/shop?occasion=wedding-guest"><span>01</span> Wedding Guest <ArrowUpRight size={16} /></Link>
          <Link to="/shop?occasion=cocktail-party"><span>02</span> Cocktail &amp; Party <ArrowUpRight size={16} /></Link>
          <Link to="/shop?occasion=maxi-holiday"><span>03</span> Maxi &amp; Holiday <ArrowUpRight size={16} /></Link>
        </nav>
      </section>
    </div>
  );
}
