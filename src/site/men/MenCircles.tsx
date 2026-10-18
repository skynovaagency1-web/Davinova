import { Link } from 'react-router-dom';
import { Watch } from 'lucide-react';
import type { Product } from '../../types/product';
import { useCutouts } from '../../lib/useCutouts';
import { jewelryPath } from '../shared/jewelry';
import { MEN_CATEGORIES, MEN_OCCASIONS, menCategoryPath, menOccasionPath } from './menFormal';

/** "Shop by category": round tiles; a suit rises out of each ring. Watches always close the row. */
export function MenCircles({ products }: { products: Product[] }) {
  const cutoutFor = useCutouts();
  const used = new Set<string>();
  const tiles: { key: string; label: string; to: string; count: number; cut?: string | null }[] = MEN_OCCASIONS.map((occasion) => {
    const items = products.filter((product) => product.storeSubcategory === occasion.sub);
    const pick = items.find((product) => cutoutFor(product.id) && !used.has(product.id));
    if (pick) used.add(pick.id);
    return { key: occasion.key, label: occasion.short, to: menOccasionPath(occasion.key), count: items.length, cut: pick && cutoutFor(pick.id) };
  });
  // The newer categories join the row once they have pieces.
  for (const category of MEN_CATEGORIES.slice(3)) {
    const items = products.filter((product) => product.storeSubcategory === category.sub);
    const pick = items.find((product) => cutoutFor(product.id) && !used.has(product.id));
    if (!pick) continue;
    used.add(pick.id);
    tiles.push({ key: category.sub, label: category.short, to: menCategoryPath(category.sub), count: items.length, cut: cutoutFor(pick.id) });
  }
  return <section className="w-cats m-cats">
    <div className="w-sec-head"><h2>Shop by <b>category</b></h2><Link to="/men/shop" className="w-new__all">All formalwear →</Link></div>
    <div className="w-cats__rail">
      {tiles.map((tile) => <Link key={tile.key} to={tile.to} className="w-cat">
        <span className={`w-cat__ring${tile.cut ? ' w-cat__ring--pop' : ''}`}>{tile.cut ? <img className="w-cat__cut" src={tile.cut} alt="" loading="lazy" /> : <span className="m-cats__empty">{tile.label[0]}</span>}</span>
        <strong>{tile.label}</strong>
        <small>{tile.count ? `${tile.count} ${tile.count === 1 ? 'piece' : 'pieces'}` : 'Soon'}</small>
      </Link>)}
      <Link to={jewelryPath('men', 'mens-watches')} className="w-cat">
        <span className="w-cat__ring"><span className="m-cats__empty" aria-hidden="true"><Watch size={46} strokeWidth={1.4} /></span></span>
        <strong>Watches</strong>
        <small>The finishing touch</small>
      </Link>
    </div>
  </section>;
}
