import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useCatalogProducts } from '../../lib/useCatalogProducts';
import { formatMoney } from '../../lib/format';
import { productPath } from '../../lib/storefront';
import { WomenCard as ProductCard } from '../women/WomenCard';
import { formalMen, menClothes } from './menFormal';
import { MenCollections } from './MenCollections';
import { MenCircles } from './MenCircles';
import { MenTrending } from './MenTrending';
import { ShoePoster } from './ShoePoster';
import { MenWatchPoster } from './MenWatchPoster';
import { ShopSplit } from '../shared/ShopSplit';
import { Perks } from '../shared/Perks';

// The owner's own photo with the background removed; if it fails to load the hero shows the featured product photo.
// The founder's suit photo (background removed). Until it exists the hero shows the latest looks.
const MEN_CUTOUT = '/images/men-suit.webp';
const sizes = ['S', 'M', 'L', 'XL', 'XXL'];
const codes = [
  ['BLACK TIE', 'Tuxedo or dinner jacket, bow tie, black oxfords. Nothing patterned.'],
  ['COCKTAIL', 'Dark suit, crisp shirt; a tie is optional but sharpens it.'],
  ['GARDEN WEDDING', 'Lighter suit in navy, grey or beige. Loafers work.'],
  ['DESTINATION', 'Linen or cotton tailoring, open collar, no heavy wool.'],
] as const;

/** Men's home: the HUD hero, then the same glass sections as the women's shop, in the men's grey. */
export function MenHome() {
  const { products, loading } = useCatalogProducts();
  const men = formalMen(products);
  const clothes = menClothes(products);
  const women = products.filter((product) => product.department === 'women');
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
          ? <img className="m-hero__cutout" src={MEN_CUTOUT} alt="Davinova Homme model" onError={() => setHasCutout(false)} />
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

    <MenCircles products={men} />
    <MenCollections products={men} />
    <MenTrending products={clothes} />
    <section className="w-watch-feature">
      <div className="w-sec-head"><h2>New: <b>shoes</b></h2><p className="w-sec-head__note">Patent, polished, made for the entrance.</p></div>
      <ShoePoster />
    </section>

    <section className="w-codes">
      <div className="w-sec-head"><h2 className="m-h2-block">Dress code, <b>decoded</b></h2><p className="w-sec-head__note">What each invitation really means, and what to wear.</p></div>
      <div className="w-codes__grid">{codes.map(([title, tip], index) => <div key={title} className="w-code"><span className="w-code__no">{String(index + 1).padStart(2, '0')}</span><strong>{title}</strong><p>{tip}</p></div>)}</div>
    </section>

    <section className="w-watch-feature">
      <div className="w-sec-head"><h2>New: <b>watches</b></h2><p className="w-sec-head__note">Rose gold, Roman numerals, built to be noticed.</p></div>
      <MenWatchPoster />
    </section>

    <section className="w-new">
      <div className="w-new__head"><h2>New <b>in</b></h2><Link to="/men/shop" className="w-new__all">See all <ArrowRight size={16} /></Link></div>
      {men.length === 0 && !loading && <p className="m-empty">The first men's looks are being added. Check back soon.</p>}
      <div className="w-new__rail">{clothes.slice(0, 12).map((product, index) => <ProductCard key={product.id} product={product} index={index} />)}</div>
    </section>

    <div className="m-split-wrap"><ShopSplit womenImages={women.filter((product) => product.images[0]?.url).slice(0, 24).map((product) => product.images[0].url)} menImages={clothes.filter((product) => product.images[0]?.url).slice(0, 24).map((product) => product.images[0].url)} womenCount={women.length} menCount={men.length} /></div>
    <Perks variant="men" />
  </>;
}
