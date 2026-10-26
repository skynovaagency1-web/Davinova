import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { Product } from '../../types/product';
import { formatMoney } from '../../lib/format';
import { productPath } from '../../lib/storefront';
import { useCutouts } from '../../lib/useCutouts';

/** A home poster with two pieces from its category floating on each side, so the space beside it is never empty. */
export function PosterSides({ products, children }: { products: Product[]; children: ReactNode }) {
  const cutoutFor = useCutouts();
  // Pieces with a clean cut-out first, so the side cards look as finished as the poster.
  const picks = [...products.filter((product) => cutoutFor(product.id)), ...products.filter((product) => !cutoutFor(product.id))].slice(0, 4);
  if (picks.length < 2) return <>{children}</>;
  const card = (product: Product, index: number) => <Link key={product.id} to={productPath(product)} className="poster-side" style={{ animationDelay: `${index * -1.6}s` }}>
    <span className="poster-side__img"><img src={cutoutFor(product.id) ?? product.images[0]?.url} alt="" loading="lazy" /></span>
    <strong>{product.title}</strong>
    <em>{product.supplierVerified ? formatMoney(product.priceCents, product.currency) : 'Coming soon'}</em>
  </Link>;
  const half = Math.ceil(picks.length / 2);
  return <div className="poster-sides">
    <div className="poster-sides__col">{picks.slice(0, half).map((product, index) => card(product, index))}</div>
    <div className="poster-sides__poster">{children}</div>
    <div className="poster-sides__col">{picks.slice(half).map((product, index) => card(product, index + half))}</div>
  </div>;
}
