import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Flame } from 'lucide-react';
import type { Product } from '../../types/product';
import { WomenCard } from './WomenCard';

const tabs = [['all', 'All'], ['wedding-guest', 'Wedding guest'], ['cocktail-party', 'Cocktail'], ['evening', 'Evening'], ['maxi-holiday', 'Holiday']] as const;

/** "Trending now": a ranked rail with occasion tabs. Featured looks lead, then the rest of the collection. */
export function TrendingRail({ products }: { products: Product[] }) {
  const [tab, setTab] = useState<string>('all');
  const list = useMemo(() => products
    .filter((product) => product.images[0]?.url && (tab === 'all' || product.shelf === tab))
    .sort((a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)) || b.images.length - a.images.length)
    .slice(0, 10), [products, tab]);
  if (products.length === 0) return null;

  return <section className="w-trend">
    <div className="w-sec-head">
      <h2><Flame size={30} className="w-trend__flame" /> Trending <b>now</b></h2>
      <div className="w-trend__tabs" role="tablist" aria-label="Trending by occasion">{tabs.map(([value, label]) =>
        <button key={value} type="button" role="tab" aria-selected={tab === value} className={tab === value ? 'active' : ''} onClick={() => setTab(value)}>{label}</button>)}
      </div>
    </div>
    <div className="w-trend__rail">{list.map((product, index) => <div key={product.id} className="w-trend__item">
      <span className="w-trend__rank">{String(index + 1).padStart(2, '0')}</span>
      <WomenCard product={product} index={index} />
    </div>)}</div>
    <Link to={tab === 'all' ? '/shop' : `/shop?occasion=${tab}`} className="w-trend__more">See everything trending →</Link>
  </section>;
}
