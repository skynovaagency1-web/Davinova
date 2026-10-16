import { motion } from 'framer-motion';
import { ArrowDown, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCatalogProducts } from '../lib/useCatalogProducts';
import { ProductCard } from '../components/ProductCard';
import { Cloth } from '../components/canvasui/Cloth';
import { editorialImages } from '../lib/editorialImages';
import { StorefrontChooser } from '../components/StorefrontChooser';
import { isCurvyProduct } from '../lib/storefront';

const riseIn = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.72, ease: 'easeOut' } },
};

export function HomePage() {
  const { products } = useCatalogProducts();
  const standardProducts = products.filter((product) => !isCurvyProduct(product));

  return <>
    <section className="hero-section">
      <motion.div className="hero-copy" initial="hidden" animate="visible" transition={{ staggerChildren: 0.13, delayChildren: 0.12 }}>
        <motion.p className="eyebrow" variants={riseIn}>The occasion edit · 01 / 03</motion.p>
        <motion.h1 variants={riseIn}>Make room for<br /><em>the moment.</em></motion.h1>
        <motion.p className="hero-description" variants={riseIn}>Considered silhouettes for weddings, celebrations, and all the beautiful things in between.</motion.p>
        <motion.div className="hero-actions" variants={riseIn}><a className="button button--dark" href="#storefront-chooser">Discover the collection <ArrowRight size={16} /></a><Link className="text-link" to="/about">Our point of view</Link></motion.div>
        <motion.div className="hero-note" variants={riseIn}><span className="hero-note__line" />Designed for the way you want to feel</motion.div>
      </motion.div>
      <div className="hero-art editorial-hero-art" aria-label="Davinova occasionwear editorial">
        <motion.div className="hero-photo hero-photo--secondary" initial={{ opacity: 0, x: -22, rotate: -3 }} animate={{ opacity: 1, x: 0, rotate: -2 }} transition={{ duration: 0.9, delay: 0.35, ease: 'easeOut' }}>
          <img src={editorialImages.burgundy} alt="Editorial inspiration: burgundy occasionwear, not an exact product photograph" loading="eager" />
          <span className="hero-photo__label">THE COLOUR STORY <i>02</i></span>
        </motion.div>
        <motion.div className="hero-photo hero-photo--primary" initial={{ opacity: 0, y: 28, clipPath: 'inset(0 0 100% 0)' }} animate={{ opacity: 1, y: 0, clipPath: 'inset(0 0 0% 0)' }} transition={{ duration: 1.15, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}>
          <img src={editorialImages.black} alt="Editorial inspiration: black eveningwear, not an exact product photograph" loading="eager" />
          <span className="hero-photo__label">THE OCCASION EDIT <i>01</i></span>
        </motion.div>
        <motion.div className="hero-photo hero-photo--tertiary" initial={{ opacity: 0, x: 25, y: 15, rotate: 4 }} animate={{ opacity: 1, x: 0, y: 0, rotate: 3 }} transition={{ duration: 1, delay: 0.48, ease: 'easeOut' }}>
          <img src={editorialImages.blue} alt="Editorial inspiration: blue formalwear, not an exact product photograph" loading="eager" />
          <span className="hero-photo__label">AFTER DARK <i>03</i></span>
        </motion.div>
        <motion.div className="hero-art-caption" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9, duration: 0.8 }}><span>EDITORIAL INSPIRATION ONLY</span><span>DAVINOVA · 2026</span></motion.div>
        <div className="hero-vertical">OCCASIONWEAR / EST. IN FEELING</div>
      </div>
      <motion.a className="scroll-cue" href="#storefront-chooser" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.15, duration: 0.7 }}><ArrowDown size={15} /> Scroll to explore</motion.a>
    </section>
    <StorefrontChooser />
    <motion.section className="intro-strip" initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.5 }} variants={riseIn}><p>For the <em>almost-dancing,</em> the long goodbyes, and the photographs you’ll keep.</p><span>Made for your kind of occasion.</span></motion.section>
    <motion.section className="fabric-feature section" initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.16 } } }}>
      <motion.div className="fabric-feature__copy" variants={riseIn}>
        <p className="eyebrow">Texture, in motion · The atelier note</p>
        <h2>Every detail<br />deserves <em>a closer look.</em></h2>
        <p>Occasionwear should feel as beautiful in motion as it looks in the mirror. Explore the edit chosen for the moments you will remember.</p>
        <Link className="button button--dark" to="/shop">Explore the edit <ArrowRight size={16} /></Link>
        <span className="fabric-feature__footnote">MOVE YOUR CURSOR OVER THE IMAGE</span>
      </motion.div>
      <motion.div className="fabric-feature__visual" variants={riseIn}>
        <Cloth className="fabric-feature__cloth" pin="top" wind={1.15} speed={0.32} amplitude={14} drape={18} brush={0.72} brushSize={120} damping={1.15} light={0.42} sheen={0.14} shadow={0.2} cornerRadius={0} backing={[0.95, 0.92, 0.88]}>
          <div className="fabric-feature__image">
            <img src={editorialImages.black} alt="Editorial fashion inspiration; supplier-specific product photographs are being confirmed" loading="lazy" />
          </div>
        </Cloth>
        <div className="fabric-feature__stamp"><span>DAVINOVA</span><span>THE OCCASION EDIT · 01</span></div>
        <p className="fabric-feature__caption">A little movement changes everything.</p>
      </motion.div>
    </motion.section>
    <section className="section featured-section" id="featured"><motion.div className="section-heading" initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.3 }} variants={riseIn}><div><p className="eyebrow">A few favourites</p><h2>Meet your <em>plus-one.</em></h2></div><Link className="text-link" to="/shop">Shop all dresses <ArrowRight size={16} /></Link></motion.div><div className="product-grid">{standardProducts.slice(0,4).map((product) => <ProductCard key={product.id} product={product} />)}</div></section>
    <motion.section className="occasion-section" initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.18 }} variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.14 } } }}><motion.div className="occasion-copy" variants={riseIn}><p className="eyebrow">Find your feeling</p><h2>Every invitation<br />has its <em>own mood.</em></h2><p>From garden ceremonies to candlelit dinners, discover a look that feels like you.</p><Link className="button button--light" to="/shop">Explore all occasions <ArrowRight size={16} /></Link></motion.div><div className="occasion-list">{[['01','Wedding Guest','wedding-guest'],['02','Cocktail & Party','cocktail-party'],['03','Maxi & Holiday','maxi-holiday']].map(([number, label, occasion]) => <motion.div key={number} variants={riseIn}><Link to={`/shop?occasion=${occasion}`}><span>{number}</span><strong>{label}</strong><i>↗</i></Link></motion.div>)}</div></motion.section>
    <motion.section className="promise-section" initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.16 } } }}><motion.p className="eyebrow" variants={riseIn}>The Davinova difference</motion.p><motion.h2 variants={riseIn}>Less searching.<br /><em>More feeling.</em></motion.h2><div className="promise-grid">{[['01','Thoughtful edits','Styles chosen to feel special, never overdone.'],['02','Occasion-first edits','A considered starting point for weddings, evenings, and celebrations.'],['03','Clarity before checkout','We are verifying size availability and shipping terms before orders open.']].map(([number, title, description]) => <motion.div key={number} variants={riseIn}><span>{number}</span><h3>{title}</h3><p>{description}</p></motion.div>)}</div></motion.section>
    <motion.section className="newsletter-section editorial-cta" initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.25 }} variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.1 } } }}><motion.p className="eyebrow" variants={riseIn}>Your next invitation</motion.p><motion.h2 variants={riseIn}>Find a dress to <em>remember.</em></motion.h2><motion.p variants={riseIn}>Discover the pieces curated for weddings, celebrations, and evenings that call for something special.</motion.p><motion.div variants={riseIn}><Link className="button button--dark" to="/shop">Explore all dresses <ArrowRight size={16} /></Link></motion.div></motion.section>
  </>;
}
