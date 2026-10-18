import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Flame } from 'lucide-react';
import type { Product } from '../../types/product';
import { MEN_FORMAL } from '../../lib/storeCollectionTaxonomy';
import { WomenCard as ProductCard } from '../women/WomenCard';
import { MEN_OCCASIONS, menOccasionPath } from './menFormal';

const inOccasion = (product: Product, occasion: (typeof MEN_OCCASIONS)[number]) =>
  product.storeSubcategory === occasion.sub || (product.storeCollection === MEN_FORMAL && product.collectionCategory === occasion.key);

/** "Trending now" for men: wedding, black tie and holiday looks mixed in one ranked rail, with a tab for each. */
export function MenTrending({ products }: { products: Product[] }) {
  const [tab, setTab] = useState('all');
  const list = useMemo(() => {
    const rank = (items: Product[]) => [...items].sort((a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)) || b.images.length - a.images.length);
    const groups = MEN_OCCASIONS.map((occasion) => rank(products.filter((product) => inOccasion(product, occasion))));
    if (tab !== 'all') return groups[MEN_OCCASIONS.findIndex((occasion) => occasion.key === tab)].slice(0, 12);
    // All: wedding, black tie and holiday taken in turn, so the three are mixed.
    const mixed: Product[] = [];
    for (let round = 0; mixed.length < 12 && groups.some((group) => group.length > round); round += 1) {
      for (const group of groups) if (group[round] && mixed.length < 12) mixed.push(group[round]);
    }
    return mixed;
  }, [products, tab]);
  if (products.length === 0) return null;
  return <section className="w-trend">
    <div className="w-sec-head">
      <h2><Flame size={30} className="w-trend__flame" /> Trending <b>now</b></h2>
      <div className="w-trend__tabs" role="tablist" aria-label="Trending by occasion">{[{ key: 'all', title: 'All' }, ...MEN_OCCASIONS].map((item) =>
        <button key={item.key} type="button" role="tab" aria-selected={tab === item.key} className={tab === item.key ? 'active' : ''} onClick={() => setTab(item.key)}>{item.title}</button>)}
      </div>
    </div>
    <div className="w-trend__rail">{list.map((product, index) => <div key={product.id} className="w-trend__item">
      <span className="w-trend__rank">{String(index + 1).padStart(2, '0')}</span>
      <ProductCard product={product} index={index} />
    </div>)}</div>
    <Link to={tab === 'all' ? '/men/shop' : menOccasionPath(tab)} className="w-trend__more">See everything trending →</Link>
  </section>;
}
