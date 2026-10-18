import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useCatalogProducts } from '../../lib/useCatalogProducts';
import { productPath } from '../../lib/storefront';
import { WomenCard as ProductCard } from '../women/WomenCard';
import { formalMen, menClothes, menDoorImages } from './menFormal';
import { MenCollections } from './MenCollections';
import { MenCircles } from './MenCircles';
import { MenTrending } from './MenTrending';
import { ShoePoster } from './ShoePoster';
import { MenWatchPoster } from './MenWatchPoster';
import { ShopSplit } from '../shared/ShopSplit';
import { Perks } from '../shared/Perks';
import { jewelryPath, jewelryTypeOf } from '../shared/jewelry';

// The founder's suit photo (background removed). Until it exists the hero shows the latest looks.
const MEN_CUTOUT = '/images/men-suit.webp';
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
  const watches = products.filter((product) => jewelryTypeOf(product) === 'mens-watches' && product.images[0]?.url);
  const looks = clothes.filter((product) => product.images[0]?.url).slice(0, 6);
  const [active, setActive] = useState(0);
  const [hasCutout, setHasCutout] = useState(true);
  const look = looks[active % Math.max(looks.length, 1)];

  // The look card turns over every few seconds.
  useEffect(() => {
    if (looks.length < 2) return;
    const timer = window.setInterval(() => setActive((index) => (index + 1) % looks.length), 5000);
    return () => window.clearInterval(timer);
  }, [looks.length]);

  return <>
    <section className="m-hero">
      <span className="m-hero__word" aria-hidden="true">HOMME</span>
      <div className="m-hero__copy">
        <span className="m-hero__kicker">Davinova Homme · Special edition</span>
        <h1>Dressed for <em>the occasion</em></h1>
        <p>Suits, tuxedos and evening wear chosen for weddings, black-tie dinners and holidays.</p>
        <div className="m-hero__ctas">
          <Link className="m-hero__btn m-hero__btn--main" to="/men/shop">Shop formal <ArrowRight size={16} /></Link>
          <Link className="m-hero__btn m-hero__btn--ghost" to="/men/categories">Categories</Link>
        </div>
        <ul className="m-hero__facts">
          <li><b>{men.length || '—'}</b>Looks</li>
          <li><b>S–3XL</b>Sizes</li>
          <li><b>30 days</b>Returns</li>
        </ul>
      </div>

      <div className="m-hero__model">
        {hasCutout
          ? <img className="m-hero__cutout" src={MEN_CUTOUT} alt="Davinova Homme model in a black suit" onError={() => setHasCutout(false)} />
          : look ? <img className="m-hero__photo" src={look.images[0].url} alt={look.title} />
          : <div className="m-hero__placeholder">{loading ? 'LOADING…' : 'NEW LOOKS / SOON'}</div>}
      </div>

      {look && <Link className="m-hero__look" to={productPath(look)}>
        <AnimatePresence mode="wait"><motion.img key={look.id} src={look.images[0].url} alt="" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }} /></AnimatePresence>
        <div><span>Look {String(active + 1).padStart(2, '0')}</span><strong>{look.title}</strong></div>
      </Link>}
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
      <div className="w-new__head"><h2>New <b>in</b></h2><Link to={jewelryPath('men', 'mens-watches')} className="w-new__all">See all <ArrowRight size={16} /></Link></div>
      {watches.length === 0 && !loading && <p className="m-empty">New watches are being added. Check back soon.</p>}
      <div className="w-new__rail">{watches.slice(0, 12).map((product, index) => <ProductCard key={product.id} product={product} index={index} />)}</div>
    </section>

    <div className="m-split-wrap"><ShopSplit womenImages={women.filter((product) => product.images[0]?.url).slice(0, 24).map((product) => product.images[0].url)} menImages={menDoorImages(products)} womenCount={women.length} menCount={men.length} /></div>
    <Perks variant="men" />
  </>;
}
