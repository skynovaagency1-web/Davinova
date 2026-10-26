import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { Product } from '../../types/product';
import { formatMoney } from '../../lib/format';
import { productPath } from '../../lib/storefront';
import { useCutouts } from '../../lib/useCutouts';

/** A home poster with two pieces from its category floating on each side, so the space beside it is never empty. */
export function PosterSides({ products, picks = [], children }: { products: Product[]; picks?: readonly string[]; children: ReactNode }) {
  const cutoutFor = useCutouts();
  // Only pieces customers can buy now (never "Coming soon"), clean cut-outs first, so the side cards look as finished as the poster.
  const priced = products.filter((product) => product.supplierVerified && product.priceCents > 0);
  const pool = priced.length >= 2 ? priced : products;
  // Hand-picked pieces first (see config/posterPicks), then the rest of the category with clean cut-outs first.
  const chosen = picks.map((id) => priced.find((product) => product.id === id)).filter((product): product is Product => Boolean(product));
  const rest = pool.filter((product) => !chosen.includes(product));
  const shown = [...chosen, ...rest.filter((product) => cutoutFor(product.id)), ...rest.filter((product) => !cutoutFor(product.id))].slice(0, 4);
  if (shown.length < 2) return <>{children}</>;
  const card = (product: Product, index: number) => <Link key={product.id} to={productPath(product)} className="poster-side" style={{ animationDelay: `${index * -1.6}s` }}>
    <span className="poster-side__img"><img src={cutoutFor(product.id) ?? product.images[0]?.url} alt="" loading="lazy" /></span>
    <strong>{product.title}</strong>
    <em>{product.supplierVerified ? formatMoney(product.priceCents, product.currency) : 'Coming soon'}</em>
  </Link>;
  const half = Math.ceil(shown.length / 2);
  return <div className="poster-sides">
    <div className="poster-sides__col">{shown.slice(0, half).map((product, index) => card(product, index))}</div>
    <div className="poster-sides__poster">{children}</div>
    <div className="poster-sides__col">{shown.slice(half).map((product, index) => card(product, index + half))}</div>
  </div>;
}
