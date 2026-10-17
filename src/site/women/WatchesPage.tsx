import { Link } from 'react-router-dom';
import { useCatalogProducts } from '../../lib/useCatalogProducts';
import { WomenCard } from './WomenCard';
import { WatchPoster } from './WatchPoster';

const promises = [
  ['Made to be worn', 'Everyday watches that still feel like an occasion.'],
  ['Gift-ready', 'Chosen to give, or to keep for yourself.'],
  ['Matched to the dress', 'Gold, rose and silver tones picked to sit with our collections.'],
] as const;

/** Watches: the campaign poster up top, then every product on the watches shelf. */
export function WatchesPage() {
  const { products, loading } = useCatalogProducts();
  const watches = products.filter((product) => product.shelf === 'watches');

  return <section className="w-watches">
    <div className="w-watches__hero">
      <div className="w-watches__copy">
        <span className="nova-chip">New · Davinova Time</span>
        <h1>The <b>watch</b> edit</h1>
        <p>The finishing touch for every look. Pieces you reach for, from the wedding to the Monday after.</p>
        <ul>{promises.map(([title, line]) => <li key={title}><strong>{title}</strong><span>{line}</span></li>)}</ul>
      </div>
      <WatchPoster linked={false} />
    </div>

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
