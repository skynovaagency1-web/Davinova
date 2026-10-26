import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronDown, ChevronUp, Home, Search, ShoppingBag } from 'lucide-react';
import { useCatalogProducts } from '../../lib/useCatalogProducts';
import { productPath } from '../../lib/storefront';
import { WomenCard as ProductCard } from '../women/WomenCard';
import { formalMen, menCategoryPath, menClothes, menDoorImages } from './menFormal';
import { MenCollections } from './MenCollections';
import { MenCircles } from './MenCircles';
import { MenTrending } from './MenTrending';
import { ShoePoster } from './ShoePoster';
import { MenWatchPoster } from './MenWatchPoster';
import { CustomPoster } from './CustomPoster';
import { PosterSides } from '../shared/PosterSides';
import { POSTER_PICKS } from '../../config/posterPicks';
import { ShopSplit } from '../shared/ShopSplit';
import { Perks } from '../shared/Perks';
import { MoodBar } from '../shared/Mood';
import { jewelryPath, jewelryTypeOf } from '../shared/jewelry';

// The founder's suit photo (background removed). Until it exists the hero shows the latest looks.
const MEN_CUTOUT = '/images/men-suit.webp';
const MEN_BAG_SUBS = new Set(['briefcases', 'messenger-bags-and-backpacks', 'mens-backpacks', 'crossbody-bags', 'waist-bags', 'luggage-and-travel-bags']);
const HERO_SUBS = new Set(['wedding-suits', 'tuxedos-and-dinner-jackets', 'linen-and-summer-suits', 'blazers-and-waistcoats']);
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
  // Owner 2026-10-24: a bags row under Print on demand.
  const bags = men.filter((product) => MEN_BAG_SUBS.has(product.storeSubcategory ?? '') && product.images[0]?.url);
  const shoes = men.filter((product) => ['formal-shoes', 'casual-shoes', 'vulcanize-shoe', 'man-boots'].includes(product.storeSubcategory ?? '') && product.images[0]?.url);
  const tees = products.filter((product) => product.department === 'men' && product.storeSubcategory === 't-shirts' && product.images[0]?.url);
  const watches = products.filter((product) => jewelryTypeOf(product) === 'mens-watches' && product.images[0]?.url);
  // Owner: the hero look card shows tailoring only, never underwear or loungewear.
  const looks = clothes.filter((product) => HERO_SUBS.has(product.storeSubcategory ?? '') && product.images[0]?.url).slice(0, 6);
  const [active, setActive] = useState(0);
  const [hasCutout, setHasCutout] = useState(true);
  const [heroSize, setHeroSize] = useState('M');
  const look = looks[active % Math.max(looks.length, 1)];

  // The look card turns over every few seconds.
  useEffect(() => {
    if (looks.length < 2) return;
    const timer = window.setInterval(() => setActive((index) => (index + 1) % looks.length), 5000);
    return () => window.clearInterval(timer);
  }, [looks.length]);

  return <>
    {/* Owner 2026-10-24: glass "product UI" hero (thin giant word, look picker, colours, sizes, info card) around the suit model. */}
    <section className="mh">
      <span className="mh__title" aria-hidden="true">Homme</span>
      <nav className="mh__icons" aria-label="Quick links">
        <Link to="/men" aria-label="Men's home"><Home size={20} /></Link>
        <Link to="/men/shop" aria-label="Search the men's shop"><Search size={20} /></Link>
        <Link to="/men/bag" aria-label="Your bag"><ShoppingBag size={20} /></Link>
      </nav>

      <div className="mh__model">
        {hasCutout
          ? <img src={MEN_CUTOUT} alt="Davinova Homme model in a black suit" onError={() => setHasCutout(false)} />
          : look ? <img src={look.images[0].url} alt={look.title} /> : null}
      </div>

      {looks.length > 0 && <div className="mh__thumbs">
        <button type="button" aria-label="Previous look" onClick={() => setActive((index) => (index - 1 + looks.length) % looks.length)}><ChevronUp size={18} /></button>
        {[-1, 0, 1].map((step) => {
          const index = (active + step + looks.length) % looks.length;
          const item = looks[index];
          return <button key={step} type="button" className={step === 0 ? 'is-active' : ''} aria-label={step === 0 ? `${item.title} (shown)` : `Show ${item.title}`} onClick={() => setActive(index)}>
            <img src={item.images[0].url} alt="" loading="lazy" />
          </button>;
        })}
        <button type="button" aria-label="Next look" onClick={() => setActive((index) => (index + 1) % looks.length)}><ChevronDown size={18} /></button>
      </div>}

      <MoodBar dept="men" className="mh__colors" />

      <div className="mh__sizes" role="group" aria-label="Sizes">
        {['S', 'M', 'L', 'XL'].map((size) => <button key={size} type="button" className={size === heroSize ? 'is-on' : ''} aria-pressed={size === heroSize} onClick={() => setHeroSize(size)}>{size.toLowerCase()}</button>)}
      </div>

      <div className="mh__info">
        <h1>Dressed for the occasion</h1>
        <p>Suits, tuxedos and evening wear chosen for weddings, black-tie dinners and holidays. Sizes S to 3XL, 30-day returns.</p>
        {look && <Link to={productPath(look)} className="mh__look"><span>Look {String(active + 1).padStart(2, '0')}</span>{look.title}</Link>}
        <Link className="mh__cta" to="/men/shop">Shop formal <ArrowRight size={16} /></Link>
      </div>
    </section>

    <MenCircles products={men} />
    <MenCollections products={men} />
    <MenTrending products={clothes} />
    <section className="w-watch-feature">
      <div className="w-sec-head"><h2>Print on <b>demand</b></h2><p className="w-sec-head__note">Blank tees, your print. Made when you order.</p></div>
      <PosterSides products={tees} picks={POSTER_PICKS.tees}><CustomPoster /></PosterSides>
    </section>

    {bags.length > 0 && <section className="w-new">
      <div className="w-new__head"><h2>The bag <b>edit</b></h2><Link to={menCategoryPath('briefcases')} className="w-new__all">See all <ArrowRight size={16} /></Link></div>
      <div className="w-new__rail">{bags.slice(0, 12).map((product, index) => <ProductCard key={product.id} product={product} index={index} />)}</div>
    </section>}
    <section className="w-watch-feature">
      <div className="w-sec-head"><h2>New: <b>shoes</b></h2><p className="w-sec-head__note">Patent, polished, made for the entrance.</p></div>
      <PosterSides products={shoes} picks={POSTER_PICKS.menShoes}><ShoePoster /></PosterSides>
    </section>

    <section className="w-codes">
      <div className="w-sec-head"><h2 className="m-h2-block">Dress code, <b>decoded</b></h2><p className="w-sec-head__note">What each invitation really means, and what to wear.</p></div>
      <div className="w-codes__grid">{codes.map(([title, tip], index) => <div key={title} className="w-code"><span className="w-code__no">{String(index + 1).padStart(2, '0')}</span><strong>{title}</strong><p>{tip}</p></div>)}</div>
    </section>

    <section className="w-watch-feature">
      <div className="w-sec-head"><h2>New: <b>watches</b></h2><p className="w-sec-head__note">Rose gold, Roman numerals, built to be noticed.</p></div>
      <PosterSides products={[...watches].reverse()} picks={POSTER_PICKS.menWatches}><MenWatchPoster /></PosterSides>
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
