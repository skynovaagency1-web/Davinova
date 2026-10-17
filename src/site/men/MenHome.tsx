import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useCatalogProducts } from '../../lib/useCatalogProducts';
import { formatMoney } from '../../lib/format';
import { productPath } from '../../lib/storefront';
import { MenCard } from './MenCard';

// A transparent PNG of a man in a suit; until it exists the hero shows the featured product photo.
const MEN_CUTOUT = '/images/men-model.png';
const sizes = ['S', 'M', 'L', 'XL', 'XXL'];
const occasions = [
  ['01', 'Wedding', 'Suits for the ceremony', '/men/shop?occasion=wedding-guest'],
  ['02', 'Black tie', 'Dinner jackets and evenings', '/men/shop?occasion=cocktail-party'],
  ['03', 'Holiday', 'Light tailoring for travel', '/men/shop?occasion=maxi-holiday'],
] as const;

/** Men's home: a HUD-style hero around the model, occasion tiles and the latest looks. */
export function MenHome() {
  const { products, loading } = useCatalogProducts();
  const men = products.filter((product) => product.department === 'men');
  const looks = men.filter((product) => product.images[0]?.url).slice(0, 4);
  const [active, setActive] = useState(0);
  const [size, setSize] = useState('M');
  const [hasCutout, setHasCutout] = useState(true);
  const look = looks[active];

  return <>
    <section className="m-hero">
      <div className="m-hero__edition"><b>SPECIAL EDITION</b><span>FOR THE OCCASION</span></div>
      <span className="m-hero__glow">COLLECTION</span>

      <div className="m-hero__model">
        {hasCutout
          ? <img className="m-hero__cutout" src={MEN_CUTOUT} alt="Davinova Homme model in a suit" onError={() => setHasCutout(false)} />
          : look ? <AnimatePresence mode="wait"><motion.img key={look.id} className="m-hero__photo" src={look.images[0].url} alt={look.title} initial={{ opacity: 0, scale: 1.04 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }} /></AnimatePresence>
          : <div className="m-hero__placeholder">{loading ? 'LOADING…' : 'NEW LOOKS / SOON'}</div>}
      </div>

      <div className="m-panel m-hero__sizes">
        <div className="m-hero__sizegrid" role="group" aria-label="Sizes">{sizes.map((item) => <button key={item} type="button" className={size === item ? 'active' : ''} onClick={() => setSize(item)}>{item}</button>)}</div>
        <strong>Regular fit</strong>
        <span>Tailored line, size {size} shown. Exact measurements on each look.</span>
      </div>

      <div className="m-panel m-hero__spec">
        <span className="m-hero__index">({String(active + 1).padStart(2, '0')})</span>
        <span className="m-hero__big">{String(active + 1).padStart(2, '0')}</span>
        <h1>{look ? look.title : 'Formalwear for the occasion'}</h1>
        <p>{look?.description ? look.description.slice(0, 150) + (look.description.length > 150 ? '…' : '') : 'Suits, blazers and evening jackets chosen for weddings, black-tie dinners and holidays.'}</p>
        <Link className="m-hero__cta" to={look ? productPath(look) : '/men/shop'}>{look ? (look.browseOnly ? 'VIEW LOOK' : formatMoney(look.priceCents, look.currency)) : 'SHOP FORMAL'} <ArrowRight size={16} /></Link>
        <span className="m-barcode" aria-hidden="true" />
        {looks.length > 1 && <div className="m-hero__pager" role="group" aria-label="Featured looks">{looks.map((item, index) => <button key={item.id} type="button" className={index === active ? 'active' : ''} onClick={() => setActive(index)}>{String(index + 1).padStart(2, '0')}</button>)}</div>}
      </div>

      <div className="m-hero__badge"><span className="m-mono">DH</span><span className="m-hero__badgebox">LOOK<br /><b>{String(active + 1).padStart(3, '0')}</b></span></div>
    </section>

    <section className="m-occasions">{occasions.map(([no, title, line, to]) => <Link key={no} to={to} className="m-occasion"><i>{no}</i><strong>{title}</strong><span>{line}</span><ArrowRight size={18} /></Link>)}</section>

    <section className="m-latest">
      <div className="m-latest__head"><h2>LATEST <i>/ {String(men.length).padStart(3, '0')} LOOKS</i></h2><Link to="/men/shop">VIEW ALL <ArrowRight size={14} /></Link></div>
      {men.length === 0 && !loading && <p className="m-empty">The first men's looks are being added. Check back soon.</p>}
      <div className="m-grid">{men.slice(0, 8).map((product, index) => <MenCard key={product.id} product={product} index={index} />)}</div>
    </section>
  </>;
}
