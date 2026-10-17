import { useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { ArrowRight, Gem, ShoppingBag, Sparkles, Star, Shirt } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Product } from '../../types/product';
import { editorialImages } from '../../lib/editorialImages';
import { formatMoney } from '../../lib/format';

const spring = { stiffness: 90, damping: 18, mass: 0.6 };
const HERO_CUTOUT = '/images/hero-model.png';
const sizes = ['XS', 'S', 'M', 'L', 'XL'];
const tones = ['#141018', '#6b4bd6', '#b9a3f5', '#e8b7c8', '#d9c3a5'];

/** Home hero: split headline, cut-through model photo, lilac panel and floating glass widgets. */
export function NovaHero({ products }: { products: Product[] }) {
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const near = { x: useSpring(useTransform(mx, (v) => v * 22), spring), y: useSpring(useTransform(my, (v) => v * 18), spring) };
  const far = { x: useSpring(useTransform(mx, (v) => v * -12), spring), y: useSpring(useTransform(my, (v) => v * -10), spring) };
  const [size, setSize] = useState('M');
  const [tone, setTone] = useState(1);
  // A transparent PNG at this path makes the model step out of the panel; until it exists the framed photo is used.
  const [hasCutout, setHasCutout] = useState(true);

  const withImages = products.filter((product) => product.images[0]?.url);
  const featured = withImages[0];
  const thumbs = withImages.slice(1, 4);

  function onMove(event: React.PointerEvent<HTMLElement>) {
    if (event.pointerType !== 'mouse') return;
    const box = event.currentTarget.getBoundingClientRect();
    mx.set((event.clientX - box.left) / box.width - 0.5);
    my.set((event.clientY - box.top) / box.height - 0.5);
  }

  return <section className="nova-hero" onPointerMove={onMove} onPointerLeave={() => { mx.set(0); my.set(0); }}>
    <div className="nova-hero__ghost" aria-hidden="true">DAVINOVA</div>
    <motion.h1 className="nova-hero__title nova-hero__title--left" initial={{ opacity: 0, x: -40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}>
      <i>Dress the</i><b>MOMENT</b>
    </motion.h1>
    <motion.div className="nova-hero__title nova-hero__title--right" aria-hidden="true" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}>
      <i>Own the</i><b>ROOM</b><Sparkles className="nova-hero__spark" size={30} />
    </motion.div>

    <div className="nova-hero__panel">
      <div className="nova-hero__copy">
        <span className="nova-chip"><Sparkles size={12} /> New occasion edit</span>
        <h2>Where elegance<br />meets the invitation</h2>
        <p>Wedding guest, cocktail and holiday looks picked for the moments you'll keep.</p>
        <a className="nova-pill-button" href="#collections">Explore now <span><ArrowRight size={16} /></span></a>
        {thumbs.length > 0 && <div className="nova-hero__proof glass">
          <div className="nova-hero__faces">{thumbs.map((product) => <img key={product.id} src={product.images[0].url} alt="" loading="lazy" />)}</div>
          <span><strong>{products.length}+ looks</strong><br />in the edit</span>
        </div>}
      </div>

      <div className="nova-hero__side">
        <ul className="nova-hero__perks">
          <li><Shirt size={20} strokeWidth={1.6} />Occasion<br />ready</li>
          <li><Star size={20} strokeWidth={1.6} />Curated<br />edits</li>
          <li><Gem size={20} strokeWidth={1.6} />Limited<br />drops</li>
        </ul>
        {featured && <motion.div style={near}>
          <Link to={`/product/${featured.slug}`} className="nova-feature-card">
            <span className="nova-feature-card__label">Featured look</span>
            <span className="nova-feature-card__img"><img src={featured.images[0].url} alt={featured.images[0].alt || featured.title} /></span>
            <strong>{featured.title}</strong>
            <span className="nova-feature-card__price"><ShoppingBag size={14} />{featured.browseOnly ? 'Coming soon' : formatMoney(featured.priceCents, featured.currency)}</span>
          </Link>
        </motion.div>}
      </div>
    </div>

    <motion.div className={hasCutout ? 'nova-hero__model nova-hero__model--cutout' : 'nova-hero__model'} initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}>
      <div className="nova-hero__ring" aria-hidden="true" />
      {hasCutout
        ? <img src={HERO_CUTOUT} alt="Davinova model in occasionwear" loading="eager" onError={() => setHasCutout(false)} />
        : <img src={editorialImages.black} alt="Editorial occasionwear inspiration" loading="eager" />}
    </motion.div>

    <motion.div className="nova-float nova-float--sizes glass" style={far} role="group" aria-label="Preview sizes">
      {sizes.map((item) => <button key={item} type="button" className={size === item ? 'active' : ''} onClick={() => setSize(item)}>{item}</button>)}
    </motion.div>
    <motion.div className="nova-float nova-float--tones glass" style={far} role="group" aria-label="Preview colours">
      <span className="nova-float__caret" style={{ left: `${tone * 20 + 10}%` }} />
      {tones.map((colour, index) => <button key={colour} type="button" aria-label={`Colour ${index + 1}`} style={{ background: colour }} onClick={() => setTone(index)} />)}
    </motion.div>
  </section>;
}
