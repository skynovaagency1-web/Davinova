import { Link, useSearchParams } from 'react-router-dom';
import { useCatalogProducts } from '../../lib/useCatalogProducts';
import { BEAUTY_COLLECTIONS, storeCollectionGroups } from '../../lib/storeCollectionTaxonomy';
import { WomenCard } from './WomenCard';
import { BeautyPoster } from './BeautyPoster';

const promises = [
  ['Every shade', 'Picked to flatter every skin tone and every size.'],
  ['The finishing touch', 'Nails, fragrance and glow to go with the dress.'],
  ['Gift-ready', 'Chosen to give, or to keep for yourself.'],
] as const;

const BEAUTY = /\b(perfume|fragrance|lipstick|lip gloss|makeup|make-up|skincare|serum|cosmetic|nail polish|eyeshadow|highlighter)\b/i;
const GROUPS = storeCollectionGroups.filter((group) => BEAUTY_COLLECTIONS.includes(group.slug));

/** Health, Beauty & Hair: the campaign poster up top, then each beauty category with its sub-categories. */
export function BeautyPage() {
  const { products, loading } = useCatalogProducts();
  const [params, setParams] = useSearchParams();
  const picked = params.get('sub') ?? '';
  const filed = products.filter((product) => BEAUTY_COLLECTIONS.includes(product.storeCollection ?? ''));
  const loose = products.filter((product) => !filed.includes(product) && BEAUTY.test(product.title));
  const total = filed.length + loose.length;

  return <section className="w-watches">
    <div className="w-watches__hero">
      <div className="w-watches__copy">
        <span className="nova-chip">New · Davinova Beauty</span>
        <h1>Health, <b>beauty</b> &amp; hair</h1>
        <p>Nails, fragrance and glow to finish every look, for every woman.</p>
        <ul>{promises.map(([title, line]) => <li key={title}><strong>{title}</strong><span>{line}</span></li>)}</ul>
      </div>
      <BeautyPoster linked={false} />
    </div>

    {GROUPS.map((group) => {
      const items = filed.filter((product) => product.storeCollection === group.slug);
      const subs = group.subcategories.filter((sub) => items.some((product) => product.storeSubcategory === sub.slug));
      const sub = subs.find((item) => item.slug === picked);
      const shown = sub ? items.filter((product) => product.storeSubcategory === sub.slug) : items;
      if (!items.length) return null;
      return <div key={group.slug} className="w-beauty__group">
        <div className="w-sec-head"><h2>{group.label.split(' ')[0]} <b>{group.label.split(' ').slice(1).join(' ')}</b></h2><p className="w-sec-head__note">{shown.length} pieces</p></div>
        {subs.length > 1 && <div className="w-beauty__subs" role="tablist">
          <button type="button" className={sub ? '' : 'active'} onClick={() => setParams({}, { replace: true })}>All</button>
          {subs.map((item) => <button key={item.slug} type="button" className={item === sub ? 'active' : ''} onClick={() => setParams({ sub: item.slug }, { replace: true })}>{item.label}</button>)}
        </div>}
        <div className="w-grid">{shown.map((product, index) => <WomenCard key={product.id} product={product} index={index} />)}</div>
      </div>;
    })}

    {loose.length > 0 && <>
      <div className="w-sec-head"><h2>More <b>beauty</b></h2><p className="w-sec-head__note">{loose.length} pieces</p></div>
      <div className="w-grid">{loose.map((product, index) => <WomenCard key={product.id} product={product} index={index} />)}</div>
    </>}

    {!loading && total === 0 && <div className="w-watches__empty">
      <strong>The first pieces are on their way.</strong>
      <span>We're choosing them now. In the meantime, find the dress to wear them with.</span>
      <Link to="/shop">Shop dresses →</Link>
    </div>}
  </section>;
}
