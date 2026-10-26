import { FLOATING_COLLECTIONS } from '../../lib/storeCollectionTaxonomy';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useCatalogProducts } from '../../lib/useCatalogProducts';
import { isFullLook, useCutouts } from '../../lib/useCutouts';
import { NovaHero } from './NovaHero';
import { CollectionCards } from './CollectionCards';
import { ReachFeature } from './ReachFeature';
import { WomenCard } from './WomenCard';
import { CategoryCircles } from './CategoryCircles';
import { TrendingRail } from './TrendingRail';
import { DressCodeGuide } from './DressCodeGuide';
import { CurvyEdit } from './CurvyEdit';
import { ShopSplit } from '../shared/ShopSplit';
import { menDoorImages } from '../men/menFormal';
import { Perks } from '../shared/Perks';
import { BagPoster } from './BagPoster';
import { BeautyPoster } from './BeautyPoster';
import { HeelPoster } from './HeelPoster';
import { Exemplaire } from './Exemplaire';

/** Women's home: hero, both shops, categories, collections, trending, featured look, guides and new arrivals. */
export function WomenHome() {
  const { products } = useCatalogProducts();
  const women = products.filter((product) => product.department === 'women' && product.shelf !== 'watches' && product.shelf !== 'jewelry' && !FLOATING_COLLECTIONS.includes(product.storeCollection ?? ''));
  const men = products.filter((product) => product.department === 'men');
  const withImages = women.filter((product) => product.images[0]?.url);
  // Home rails show whole looks on a model only; headless floating garments stay on their collection pages (owner's rule).
  const cutoutFor = useCutouts();
  const onModel = women.filter((product) => isFullLook(cutoutFor(product.id), product.storeCollection));
  const onModelWithImages = onModel.filter((product) => product.images[0]?.url);

  return <>
    <NovaHero products={women} />
    <ShopSplit womenImages={withImages.slice(0, 24).map((product) => product.images[0].url)} menImages={menDoorImages(products)} womenCount={women.length} menCount={men.length} />
    <CategoryCircles products={onModel} />
    <CollectionCards products={onModel} />
    <TrendingRail products={women} />
    <Exemplaire products={onModel} />
    <ReachFeature product={withImages[4] ?? withImages[0]} />
    <section className="w-watch-feature">
      <div className="w-sec-head"><h2>New: <b>bags</b></h2><p className="w-sec-head__note">Clutches and handbags to finish every look.</p></div>
      <BagPoster />
    </section>
    <DressCodeGuide />
    <CurvyEdit products={women} />
    <section className="w-watch-feature">
      <div className="w-sec-head"><h2>New: <b>heels</b></h2><p className="w-sec-head__note">Red patent, sky-high, made to be seen.</p></div>
      <HeelPoster />
    </section>
    <section className="w-watch-feature">
      <div className="w-sec-head"><h2>New: <b>beauty</b></h2><p className="w-sec-head__note">Fragrance, lips and glow for every woman.</p></div>
      <BeautyPoster />
    </section>
    {onModelWithImages.length > 0 && <section className="w-new">
      <div className="w-new__head"><h2>New <b>in</b></h2><Link to="/shop" className="w-new__all">See all <ArrowRight size={16} /></Link></div>
      <div className="w-new__rail">{onModelWithImages.slice(10, 22).map((product, index) => <WomenCard key={product.id} product={product} index={index} />)}</div>
    </section>}
    <Perks variant="women" />
  </>;
}
