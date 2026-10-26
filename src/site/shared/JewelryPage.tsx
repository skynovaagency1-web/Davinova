import { Link, useParams } from 'react-router-dom';
import { useCatalogProducts } from '../../lib/useCatalogProducts';
import { WomenCard } from '../women/WomenCard';
import { JEWELRY_TYPES, jewelryMenu, jewelryPath, jewelryTypeOf, type Dept, type JewelryType } from './jewelry';

/** Jewelry & Watches: one page per sub-menu item, with the other items as tabs. */
export function JewelryPage({ dept }: { dept: Dept }) {
  const { type } = useParams();
  const current = type && type in JEWELRY_TYPES ? type as JewelryType : undefined;
  const allowed = jewelryMenu(dept).flatMap((group) => group.items);
  const { products, loading } = useCatalogProducts();
  const pieces = products.filter((product) => {
    const kind = jewelryTypeOf(product);
    return kind && allowed.includes(kind) && (!current || kind === current);
  });
  const grid = (items: typeof products) => <div className={dept === 'men' ? 'm-grid m-grid--glass' : 'w-grid'}>{items.map((product, index) => <WomenCard key={product.id} product={product} index={index} />)}</div>;
  const info = current ? JEWELRY_TYPES[current] : { label: 'Jewelry & Watches', line: 'Wedding sets, rings and watches to finish the look' };

  return <section className={`jw jw--${dept}`}>
    <header className="jw__head">
      <span className="jw__kicker">Davinova · Jewelry & Watches</span>
      <h1>{info.label}</h1>
      <p>{info.line}</p>
    </header>
    <nav className="jw__groups" aria-label="Jewelry & Watches">
      <Link to={jewelryPath(dept)} className={!current ? 'active' : ''}>All</Link>
      {jewelryMenu(dept).map((group) => <div key={group.title} className="jw__group">
        <span>{group.title}</span>
        {group.items.map((item) => <Link key={item} to={jewelryPath(dept, item)} className={current === item ? 'active' : ''}>{JEWELRY_TYPES[item].label}</Link>)}
      </div>)}
    </nav>
    {pieces.length > 0
      ? (current ? grid(pieces) : <div className="jw__sections">{allowed.map((kind) => {
        // "All" keeps each piece with its own category, in menu order (owner's ask, 2026-10-26).
        const items = pieces.filter((product) => jewelryTypeOf(product) === kind);
        return items.length > 0 && <section key={kind} className="jw__section">
          <div className="jw__section-head">
            <h2>{JEWELRY_TYPES[kind].label} <i>{items.length}</i></h2>
            <Link to={jewelryPath(dept, kind)}>See all →</Link>
          </div>
          {grid(items)}
        </section>;
      })}</div>)
      : !loading && <div className="jw__empty">
        <strong>The first pieces are on their way.</strong>
        <span>We're choosing them now. In the meantime, find the look to wear them with.</span>
        <Link to={dept === 'men' ? '/men/shop' : '/shop'}>{dept === 'men' ? 'Shop formalwear' : 'Shop dresses'} →</Link>
      </div>}
  </section>;
}
