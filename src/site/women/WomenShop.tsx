import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useCatalogProducts } from '../../lib/useCatalogProducts';
import { isCurvyProduct } from '../../lib/storefront';
import { usePaged } from '../shared/usePaged';
import { WomenCard } from './WomenCard';
import { STYLE_CATEGORIES, matchesStyle } from '../shared/styleCategories';
import { SHELVES } from '../../lib/shelves';

const collections = [['all', 'All'], ...SHELVES.map((shelf) => [shelf.key, shelf.label] as const)] as const;
const fits = [['all', 'All fits'], ['standard', 'Slim'], ['curvy', 'Curvy']] as const;
const sorts = [['featured', 'Featured'], ['price-low', 'Price ↑'], ['price-high', 'Price ↓'], ['name', 'A–Z']] as const;
const titles: Record<string, [string, string]> = {
  all: ['The', 'EDIT'], 'wedding-guest': ['Wedding', 'GUEST'], 'cocktail-party': ['Cocktail', 'PARTY'], 'maxi-holiday': ['Maxi', 'HOLIDAY'],
  evening: ['Evening', 'GOWNS'], bridal: ['The', 'BRIDE'], everyday: ['Every', 'DAY'],
};

/** Women's shop: big title band, sticky glass filter bar, paged grid. Filters live in the URL. */
export function WomenShop() {
  const [params, setParams] = useSearchParams();
  const { products, loading } = useCatalogProducts();
  const collection = params.get('occasion') ?? 'all';
  const fit = params.get('fit') ?? 'all';
  const sort = params.get('sort') ?? 'featured';
  const colour = params.get('color') ?? '';
  const style = params.get('style') ?? '';
  const styleLabel = STYLE_CATEGORIES.find((item) => item.key === style)?.label;

  const women = useMemo(() => products.filter((product) => product.department === 'women' && product.shelf !== 'watches'), [products]);
  const colours = useMemo(() => [...new Set(women.map((product) => product.color).filter(Boolean))].sort().slice(0, 14), [women]);
  const filtered = useMemo(() => {
    const list = women.filter((product) =>
      (collection === 'all' || product.shelf === collection)
      && (fit === 'all' || (fit === 'curvy') === isCurvyProduct(product))
      && (!colour || product.color === colour)
      && (!style || matchesStyle(product, style)));
    return [...list].sort((a, b) => sort === 'price-low' ? a.priceCents - b.priceCents : sort === 'price-high' ? b.priceCents - a.priceCents : sort === 'name' ? a.title.localeCompare(b.title) : Number(Boolean(b.featured)) - Number(Boolean(a.featured)));
  }, [women, collection, fit, colour, style, sort]);
  const { visible, remaining, more, sentinel } = usePaged(filtered, `${collection}|${fit}|${colour}|${style}|${sort}`);

  function set(key: string, value: string, empty: string) {
    const next = new URLSearchParams(params);
    if (value === empty) next.delete(key); else next.set(key, value);
    setParams(next, { replace: true });
  }
  const [small, big] = titles[collection] ?? titles.all;

  return <section className="w-shop">
    <div className="w-shop__band">
      <h1><i>{styleLabel ?? (fit === 'curvy' ? 'Curvy' : small)}</i><b>{big}</b></h1>
      <p>{loading ? 'Loading the collection…' : `${filtered.length} looks`}</p>
    </div>
    <div className="w-filters glass">
      <div className="w-filters__row" role="group" aria-label="Collection">{collections.map(([value, label]) => <button key={value} type="button" className={collection === value ? 'active' : ''} onClick={() => set('occasion', value, 'all')}>{label}</button>)}</div>
      <div className="w-filters__row" role="group" aria-label="Style">
        <button type="button" className={!style ? 'active' : ''} onClick={() => set('style', '', '')}>Any style</button>
        {STYLE_CATEGORIES.map(({ key, label }) => <button key={key} type="button" className={style === key ? 'active' : ''} onClick={() => set('style', style === key ? '' : key, '')}>{label}</button>)}
      </div>
      <div className="w-filters__row" role="group" aria-label="Fit">{fits.map(([value, label]) => <button key={value} type="button" className={fit === value ? 'active' : ''} onClick={() => set('fit', value, 'all')}>{label}</button>)}</div>
      {colours.length > 1 && <div className="w-filters__row" role="group" aria-label="Colour">
        <button type="button" className={!colour ? 'active' : ''} onClick={() => set('color', '', '')}>Any colour</button>
        {colours.map((value) => <button key={value} type="button" className={colour === value ? 'active' : ''} onClick={() => set('color', colour === value ? '' : value, '')}>{value}</button>)}
      </div>}
      <label className="w-filters__sort">Sort<select value={sort} onChange={(event) => set('sort', event.target.value, 'featured')}>{sorts.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
    </div>
    {!loading && filtered.length === 0 && <p className="w-shop__empty">Nothing matches these filters yet.</p>}
    <div className="w-grid">{visible.map((product, index) => <WomenCard key={product.id} product={product} index={index} />)}</div>
    {remaining > 0 && <div ref={sentinel} className="w-shop__more"><button type="button" onClick={more}>Show more ({remaining})</button></div>}
  </section>;
}
