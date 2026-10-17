import { Link } from 'react-router-dom';
import { useCatalogProducts } from '../../lib/useCatalogProducts';
import { WomenCard } from './WomenCard';
import { BeautyPoster } from './BeautyPoster';

const promises = [
  ['Every shade', 'Picked to flatter every skin tone and every size.'],
  ['The finishing touch', 'Fragrance, lips and glow to go with the dress.'],
  ['Gift-ready', 'Chosen to give, or to keep for yourself.'],
] as const;

const BEAUTY = /\b(perfume|fragrance|lipstick|lip gloss|makeup|make-up|skincare|serum|cosmetic|nail polish|eyeshadow|highlighter)\b/i;

/** Beauty: the campaign poster up top, then every beauty product. */
export function BeautyPage() {
  const { products, loading } = useCatalogProducts();
  const beauty = products.filter((product) => BEAUTY.test(product.title));

  return <section className="w-watches">
    <div className="w-watches__hero">
      <div className="w-watches__copy">
        <span className="nova-chip">New · Davinova Beauty</span>
        <h1>The <b>beauty</b> edit</h1>
        <p>Fragrance, lips and glow to finish every look, for every woman.</p>
        <ul>{promises.map(([title, line]) => <li key={title}><strong>{title}</strong><span>{line}</span></li>)}</ul>
      </div>
      <BeautyPoster linked={false} />
    </div>

    <div className="w-sec-head"><h2>All <b>beauty</b></h2><p className="w-sec-head__note">{loading ? 'Loading…' : `${beauty.length} pieces`}</p></div>
    {beauty.length > 0
      ? <div className="w-grid">{beauty.map((product, index) => <WomenCard key={product.id} product={product} index={index} />)}</div>
      : !loading && <div className="w-watches__empty">
        <strong>The first pieces are on their way.</strong>
        <span>We're choosing them now. In the meantime, find the dress to wear them with.</span>
        <Link to="/shop">Shop dresses →</Link>
      </div>}
  </section>;
}
