import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useCatalogProducts } from '../../lib/useCatalogProducts';
import { usePaged } from '../shared/usePaged';
import { WomenCard as ProductCard } from '../women/WomenCard';
import { formalMen } from './menFormal';

const tabs = [['all', 'ALL'], ['wedding-guest', 'WEDDING'], ['cocktail-party', 'BLACK TIE'], ['maxi-holiday', 'HOLIDAY']] as const;
const sorts = [['featured', 'FEATURED'], ['price-low', 'PRICE ↑'], ['price-high', 'PRICE ↓']] as const;

/** Men's shop: an index-style header with segmented tabs and a HUD grid. */
export function MenShop() {
  const [params, setParams] = useSearchParams();
  const { products, loading } = useCatalogProducts();
  const occasion = params.get('occasion') ?? 'all';
  const sort = params.get('sort') ?? 'featured';
  const filtered = useMemo(() => {
    const list = formalMen(products).filter((product) => occasion === 'all' || product.collectionCategory === occasion);
    return [...list].sort((a, b) => sort === 'price-low' ? a.priceCents - b.priceCents : sort === 'price-high' ? b.priceCents - a.priceCents : Number(Boolean(b.featured)) - Number(Boolean(a.featured)));
  }, [products, occasion, sort]);
  const { visible, remaining, more, sentinel } = usePaged(filtered, `${occasion}|${sort}`);

  function set(key: string, value: string, empty: string) {
    const next = new URLSearchParams(params);
    if (value === empty) next.delete(key); else next.set(key, value);
    setParams(next, { replace: true });
  }

  return <section className="m-shop">
    <div className="m-shop__head">
      <h1>INDEX <i>/ FORMAL</i></h1>
      <span className="m-shop__count">{loading ? '…' : String(filtered.length).padStart(3, '0')} LOOKS</span>
    </div>
    <div className="m-shop__bar">
      <div className="m-tabs" role="group" aria-label="Occasion">{tabs.map(([value, label], index) => <button key={value} type="button" className={occasion === value ? 'active' : ''} onClick={() => set('occasion', value, 'all')}><i>{String(index).padStart(2, '0')}</i>{label}</button>)}</div>
      <div className="m-tabs" role="group" aria-label="Sort">{sorts.map(([value, label]) => <button key={value} type="button" className={sort === value ? 'active' : ''} onClick={() => set('sort', value, 'featured')}>{label}</button>)}</div>
    </div>
    {!loading && filtered.length === 0 && <p className="m-empty">No looks here yet. New formalwear is on the way.</p>}
    <div className="m-grid m-grid--glass">{visible.map((product, index) => <ProductCard key={product.id} product={product} index={index} />)}</div>
    {remaining > 0 && <div ref={sentinel} className="m-shop__more"><button type="button" onClick={more}>LOAD MORE / {remaining}</button></div>}
  </section>;
}
