import { Link } from 'react-router-dom';
import { useCatalogProducts } from '../../lib/useCatalogProducts';
import { WomenCard } from './WomenCard';
import { CategoryHero } from '../shared/CategoryHero';
import { jewelryTypeOf } from '../shared/jewelry';

/** Watches: the campaign poster up top, then every product on the watches shelf. */
export function WatchesPage() {
  const { products, loading } = useCatalogProducts();
  const watches = products.filter((product) => jewelryTypeOf(product) === 'womens-watches');

  return <section className="w-watches">
    <CategoryHero dept="women" keys={['womens-watches']} label="Watches" products={watches} count={loading ? undefined : `${watches.length} pieces`} />

    <div className="w-sec-head"><h2>All <b>watches</b></h2><p className="w-sec-head__note">{loading ? 'Loading…' : `${watches.length} pieces`}</p></div>
    {watches.length > 0
      ? <div className="w-grid">{watches.map((product, index) => <WomenCard key={product.id} product={product} index={index} />)}</div>
      : !loading && <div className="w-watches__empty">
        <strong>The first watches are on their way.</strong>
        <span>We're choosing the first pieces now. In the meantime, find the dress to wear with one.</span>
        <Link to="/shop" className="nova-pill-button">Shop dresses <span>→</span></Link>
      </div>}
  </section>;
}
