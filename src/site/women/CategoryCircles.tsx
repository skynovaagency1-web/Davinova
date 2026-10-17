import { Link } from 'react-router-dom';
import type { Product } from '../../types/product';
import { isCurvyProduct } from '../../lib/storefront';
import { STYLE_CATEGORIES, matchesStyle } from '../shared/styleCategories';
import { useCutouts } from '../../lib/useCutouts';

/** "Shop by category": round photo tiles built from the catalogue, each with its live count. */
export function CategoryCircles({ products }: { products: Product[] }) {
  const tiles = [
    ...STYLE_CATEGORIES.map((category) => {
      const items = products.filter((product) => matchesStyle(product, category.key));
      return { key: category.key, label: category.label, to: `/shop?style=${category.key}`, items };
    }),
    { key: 'curvy', label: 'Curvy', to: '/shop?fit=curvy', items: products.filter(isCurvyProduct) },
  ].filter((tile) => tile.items.length > 0).sort((a, b) => b.items.length - a.items.length);

  const cutoutFor = useCutouts();
  if (tiles.length === 0) return null;
  const used = new Set<string>();
  return <section className="w-cats">
    <div className="w-sec-head"><h2>Shop by <b>category</b></h2><Link to="/shop" className="w-new__all">All dresses →</Link></div>
    <div className="w-cats__rail">{tiles.map((tile) => {
      // Give each circle a different photo where possible.
      // Prefer a dress that has a cut-out, so it can rise out of the ring.
      const pick = tile.items.find((product) => cutoutFor(product.id) && !used.has(product.id))
        ?? tile.items.find((product) => product.images[0]?.url && !used.has(product.id)) ?? tile.items.find((product) => product.images[0]?.url);
      if (pick) used.add(pick.id);
      const cut = pick && cutoutFor(pick.id);
      return <Link key={tile.key} to={tile.to} className="w-cat">
        <span className={`w-cat__ring${cut ? ' w-cat__ring--pop' : ''}`}>{cut ? <img className="w-cat__cut" src={cut} alt="" loading="lazy" /> : pick ? <img src={pick.images[0].url} alt="" loading="lazy" /> : null}</span>
        <strong>{tile.label}</strong>
        <small>{tile.items.length} looks</small>
      </Link>;
    })}</div>
  </section>;
}
