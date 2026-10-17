import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Flame } from 'lucide-react';
import type { Product } from '../../types/product';
import { WomenCard as ProductCard } from '../women/WomenCard';
import { MEN_OCCASIONS, menOccasionPath } from './menFormal';

/** "Trending now" for men: a ranked rail of glass cards with occasion tabs. */
export function MenTrending({ products }: { products: Product[] }) {
  const [tab, setTab] = useState('all');
  const list = useMemo(() => products
    .filter((product) => tab === 'all' || product.collectionCategory === tab)
    .sort((a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)) || b.images.length - a.images.length)
    .slice(0, 10), [products, tab]);
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
