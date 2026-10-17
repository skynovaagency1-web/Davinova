import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useCatalogProducts } from '../../lib/useCatalogProducts';
import { NovaHero } from './NovaHero';
import { CollectionCards } from './CollectionCards';
import { ReachFeature } from './ReachFeature';
import { WomenCard } from './WomenCard';

/** Women's home: hero, featured collections, the "reach" featured product and new arrivals. */
export function WomenHome() {
  const { products } = useCatalogProducts();
  const women = products.filter((product) => product.department === 'women');
  const withImages = women.filter((product) => product.images[0]?.url);

  return <>
    <NovaHero products={women} />
    <CollectionCards products={women} />
    <ReachFeature product={withImages[4] ?? withImages[0]} />
    {withImages.length > 0 && <section className="w-new">
      <div className="w-new__head"><h2>New <b>in</b></h2><Link to="/shop" className="w-new__all">See all <ArrowRight size={16} /></Link></div>
      <div className="w-new__rail">{withImages.slice(0, 10).map((product, index) => <WomenCard key={product.id} product={product} index={index} />)}</div>
    </section>}
  </>;
}
