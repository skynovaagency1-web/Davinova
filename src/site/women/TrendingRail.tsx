import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Flame } from 'lucide-react';
import type { Product } from '../../types/product';
import { WomenCard } from './WomenCard';
import { categoryPath, stockedGroups } from '../../lib/categories';
import { isFullLook, useCutouts } from '../../lib/useCutouts';

/** "Trending now": a ranked rail with occasion tabs. Only whole looks on a real model (owner's rule), featured first. */
export function TrendingRail({ products }: { products: Product[] }) {
  const [tab, setTab] = useState<string>('all');
  const cutoutFor = useCutouts();
  const looks = useMemo(() => products.filter((product) => product.images[0]?.url && isFullLook(cutoutFor(product.id), product.storeCollection)), [products, cutoutFor]);
  const tabs = useMemo(() => [['all', 'All'] as const, ...stockedGroups(looks).slice(0, 4).map(({ group }) => [group.slug, group.label] as const)], [looks]);
  const list = useMemo(() => looks
    .filter((product) => tab === 'all' || product.storeCollection === tab)
    .sort((a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)) || b.images.length - a.images.length)
    .slice(0, 10), [looks, tab]);
  if (looks.length === 0) return null;

  return <section className="w-trend">
    <div className="w-sec-head">
      <h2><Flame size={30} className="w-trend__flame" /> Trending <b>now</b></h2>
      <div className="w-trend__tabs" role="tablist" aria-label="Trending by category">{tabs.map(([value, label]) =>
        <button key={value} type="button" role="tab" aria-selected={tab === value} className={tab === value ? 'active' : ''} onClick={() => setTab(value)}>{label}</button>)}
      </div>
    </div>
    <div className="w-trend__rail">{list.map((product, index) => <div key={product.id} className="w-trend__item">
      <span className="w-trend__rank">{String(index + 1).padStart(2, '0')}</span>
      <WomenCard product={product} index={index} />
    </div>)}</div>
    <Link to={tab === 'all' ? '/shop' : categoryPath(tab)} className="w-trend__more">See everything trending →</Link>
  </section>;
}
