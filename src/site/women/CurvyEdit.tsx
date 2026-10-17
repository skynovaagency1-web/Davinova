import { Link } from 'react-router-dom';
import type { Product } from '../../types/product';
import { isCurvyLook } from '../../lib/curvyLooks';
import { useCutouts } from '../../lib/useCutouts';

/** The curve edit: a gradient band with a count and a fan of photos. */
export function CurvyEdit({ products }: { products: Product[] }) {
  const cutoutFor = useCutouts();
  const curvy = products.filter((product) => isCurvyLook(product) && cutoutFor(product.id));
  if (curvy.length < 3) return null;
  return <section className="w-curvy">
    <div className="w-curvy__copy">
      <span className="nova-chip">The curve edit</span>
      <h2>Every occasion, <b>every size</b></h2>
      <p>{curvy.length} looks cut for curves, from wedding guest gowns to party dresses.</p>
      <Link to="/shop?fit=curvy" className="nova-pill-button">Shop curvy <span>→</span></Link>
    </div>
    <div className="w-curvy__fan" aria-hidden="true">{curvy.slice(0, 4).map((product, index) =>
      <img key={product.id} src={cutoutFor(product.id)} alt="" loading="lazy" style={{ '--i': index } as React.CSSProperties} />)}
    </div>
  </section>;
}
