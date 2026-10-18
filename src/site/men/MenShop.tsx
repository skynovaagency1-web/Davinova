import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useCatalogProducts } from '../../lib/useCatalogProducts';
import { usePaged } from '../shared/usePaged';
import { isFloating, useCutouts } from '../../lib/useCutouts';
import { WomenCard as ProductCard } from '../women/WomenCard';
import { MEN_FORMAL } from '../../lib/storeCollectionTaxonomy';
import { MEN_CATEGORIES, formalMen } from './menFormal';

const tabs = [['all', 'ALL'], ['wedding-guest', 'WEDDING'], ['cocktail-party', 'BLACK TIE'], ['maxi-holiday', 'HOLIDAY']] as const;
const sorts = [['featured', 'FEATURED'], ['price-low', 'PRICE ↑'], ['price-high', 'PRICE ↓']] as const;

/** Men's shop: an index-style header with segmented tabs and a HUD grid. */
export function MenShop() {
  const [params, setParams] = useSearchParams();
  const { products, loading } = useCatalogProducts();
  const occasion = params.get('occasion') ?? 'all';
  const cat = params.get('cat') ?? 'all';
  const sort = params.get('sort') ?? 'featured';
  const all = useMemo(() => formalMen(products), [products]);
  // Only categories that have something in them get a tab.
  const cats = MEN_CATEGORIES.filter((item) => all.some((product) => product.storeSubcategory === item.sub));
  const filtered = useMemo(() => {
    // Occasions sort the suits; accessories only show under All or their own category.
    const list = all.filter((product) => (occasion === 'all' || (product.storeCollection === MEN_FORMAL && product.collectionCategory === occasion))
      && (cat === 'all' || product.storeSubcategory === cat));
    return [...list].sort((a, b) => sort === 'price-low' ? a.priceCents - b.priceCents : sort === 'price-high' ? b.priceCents - a.priceCents : Number(Boolean(b.featured)) - Number(Boolean(a.featured)));
  }, [all, occasion, cat, sort]);
  // Photos on a model and floating clothes (model erased) are shown apart, never mixed in one grid.
  const cutoutFor = useCutouts();
  const floating = filtered.filter((product) => isFloating(cutoutFor(product.id), product.storeCollection));
  const onModel = filtered.filter((product) => !isFloating(cutoutFor(product.id), product.storeCollection));
  const look = params.get('look') === 'floating' || !onModel.length ? 'floating' : 'model';
  const shown = look === 'floating' ? floating : onModel;
  const { visible, remaining, more, sentinel } = usePaged(shown, `${occasion}|${cat}|${sort}|${look}`);

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
      {cats.length > 1 && <div className="m-tabs" role="group" aria-label="Category">{[{ sub: 'all', short: 'Everything' }, ...cats].map((item) => <button key={item.sub} type="button" className={cat === item.sub ? 'active' : ''} onClick={() => set('cat', item.sub, 'all')}>{item.short.toUpperCase()}</button>)}</div>}
      <div className="m-tabs" role="group" aria-label="Sort">{sorts.map(([value, label]) => <button key={value} type="button" className={sort === value ? 'active' : ''} onClick={() => set('sort', value, 'featured')}>{label}</button>)}</div>
    </div>
    {!loading && filtered.length === 0 && <p className="m-empty">No looks here yet. New formalwear is on the way.</p>}
    {floating.length > 0 && onModel.length > 0 && <div className="look-switch" role="group" aria-label="Photo style">
      <button type="button" className={look === 'model' ? 'active' : ''} onClick={() => set('look', 'model', 'model')}>ON MODEL <i>{onModel.length}</i></button>
      <button type="button" className={look === 'floating' ? 'active' : ''} onClick={() => set('look', 'floating', 'model')}>FLOATING <i>{floating.length}</i></button>
    </div>}
    <div className="m-grid m-grid--glass">{visible.map((product, index) => <ProductCard key={product.id} product={product} index={index} />)}</div>
    {remaining > 0 && <div ref={sentinel} className="m-shop__more"><button type="button" onClick={more}>LOAD MORE / {remaining}</button></div>}
  </section>;
}
