import { motion } from 'framer-motion';
import { ArrowDown, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { products } from '../data/products';
import { ProductCard } from '../components/ProductCard';

const riseIn = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.72, ease: 'easeOut' } },
};

export function HomePage() {
  return <>
    <section className="hero-section">
      <motion.div className="hero-copy" initial="hidden" animate="visible" transition={{ staggerChildren: 0.13, delayChildren: 0.12 }}>
        <motion.p className="eyebrow" variants={riseIn}>The occasion edit · 01 / 04</motion.p>
        <motion.h1 variants={riseIn}>Make room for<br /><em>the moment.</em></motion.h1>
        <motion.p className="hero-description" variants={riseIn}>Considered silhouettes for weddings, celebrations, and all the beautiful things in between.</motion.p>
        <motion.div className="hero-actions" variants={riseIn}><Link className="button button--dark" to="/shop">Discover the collection <ArrowRight size={16} /></Link><Link className="text-link" to="/about">Our point of view</Link></motion.div>
        <motion.div className="hero-note" variants={riseIn}><span className="hero-note__line" />Designed for the way you want to feel</motion.div>
      </motion.div>
      <div className="hero-art" aria-label="Editorial fashion illustration">
        <motion.div className="hero-sun" initial={{ opacity: 0, scale: 0.82 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1.35, ease: 'easeOut' }} />
        <motion.div className="hero-arch" initial={{ opacity: 0, y: 32, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 1, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}>
          <motion.div className="hero-dress" initial={{ opacity: 0, y: 35 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.1, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}>
            <div className="dress-neck" /><div className="dress-bodice" /><div className="dress-skirt" /><div className="dress-fold dress-fold--one" /><div className="dress-fold dress-fold--two" />
          </motion.div>
        </motion.div>
        <motion.div className="hero-art-caption" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.85, duration: 0.8 }}><span>THE SOFT STRUCTURE</span><span>FIG. 01 — 2026</span></motion.div>
        <div className="hero-vertical">OCCASIONWEAR / EST. IN FEELING</div>
      </div>
      <motion.a className="scroll-cue" href="#featured" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.15, duration: 0.7 }}><ArrowDown size={15} /> Scroll to explore</motion.a>
    </section>
    <motion.section className="intro-strip" initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.5 }} variants={riseIn}><p>For the <em>almost-dancing,</em> the long goodbyes, and the photographs you’ll keep.</p><span>Made for your kind of occasion.</span></motion.section>
    <section className="section featured-section" id="featured"><motion.div className="section-heading" initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.3 }} variants={riseIn}><div><p className="eyebrow">A few favourites</p><h2>Meet your <em>plus-one.</em></h2></div><Link className="text-link" to="/shop">Shop all dresses <ArrowRight size={16} /></Link></motion.div><div className="product-grid">{products.slice(0,4).map((product) => <ProductCard key={product.id} product={product} />)}</div></section>
    <motion.section className="occasion-section" initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.18 }} variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.14 } } }}><motion.div className="occasion-copy" variants={riseIn}><p className="eyebrow">Find your feeling</p><h2>Every invitation<br />has its <em>own mood.</em></h2><p>From garden ceremonies to candlelit dinners, discover a look that feels like you.</p><Link className="button button--light" to="/shop">Explore all occasions <ArrowRight size={16} /></Link></motion.div><div className="occasion-list">{[['01','Wedding guest','wedding-guest'],['02','Cocktail hour','cocktail'],['03','Evening, elevated','evening'],['04','Bridesmaid edit','bridesmaid']].map(([number, label, occasion]) => <motion.div key={number} variants={riseIn}><Link to={`/shop?occasion=${occasion}`}><span>{number}</span><strong>{label}</strong><i>↗</i></Link></motion.div>)}</div></motion.section>
    <motion.section className="promise-section" initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.16 } } }}><motion.p className="eyebrow" variants={riseIn}>The Davinova difference</motion.p><motion.h2 variants={riseIn}>Less searching.<br /><em>More feeling.</em></motion.h2><div className="promise-grid">{[['01','Thoughtful edits','Styles chosen to feel special, never overdone.'],['02','Room for everyone','Our catalogue is designed to support extended sizing, XS–4XL.'],['03','Details that matter','Clear sizing and shipping information, before you say yes.']].map(([number, title, description]) => <motion.div key={number} variants={riseIn}><span>{number}</span><h3>{title}</h3><p>{description}</p></motion.div>)}</div></motion.section>
    <motion.section className="newsletter-section" initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.25 }} variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.1 } } }}><motion.p className="eyebrow" variants={riseIn}>A note from us</motion.p><motion.h2 variants={riseIn}>Good things are <em>on the way.</em></motion.h2><motion.p variants={riseIn}>New edits, styling notes, and a little inspiration for your next invitation.</motion.p><motion.form variants={riseIn} onSubmit={(event) => { event.preventDefault(); alert('Newsletter signup will be connected in a later build stage.'); }}><label className="sr-only" htmlFor="newsletter-email">Email address</label><input id="newsletter-email" type="email" placeholder="Your email address" required /><button type="submit" aria-label="Join the mailing list">Join us <ArrowRight size={16} /></button></motion.form><motion.small variants={riseIn}>By joining, you agree to receive occasional notes from Davinova. [EDIT ME: add privacy wording.]</motion.small></motion.section>
  </>;
}
