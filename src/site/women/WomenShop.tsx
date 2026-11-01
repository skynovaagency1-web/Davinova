import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useCatalogProducts } from '../../lib/useCatalogProducts';
import { isCurvyLook } from '../../lib/curvyLooks';
import { usePaged } from '../shared/usePaged';
import { isFloating, useCutouts, usePhotoTier } from '../../lib/useCutouts';
import { WomenCard } from './WomenCard';
import { STYLE_CATEGORIES, matchesStyle } from '../shared/styleCategories';
import { CATEGORY_INTROS } from '../../lib/categoryIntros';
import { CATEGORY_GROUPS, categoryGroup, inCategory, stockedGroups, titleParts } from '../../lib/categories';

const fits = [['all', 'All fits'], ['standard', 'Slim'], ['curvy', 'Curvy']] as const;
const sorts = [['featured', 'Featured'], ['price-low', 'Price ↑'], ['price-high', 'Price ↓'], ['name', 'A–Z']] as const;

/** Women's shop: big title band, sticky glass filter bar, paged grid. Filters live in the URL. */
export function WomenShop() {
  const [params, setParams] = useSearchParams();
  const { products, loading } = useCatalogProducts();
  const collection = categoryGroup(params.get('category'))?.slug ?? 'all';
  const sub = collection === 'all' ? '' : params.get('sub') ?? '';
  const group = categoryGroup(collection);
  const subLabel = group?.subcategories.find((item) => item.slug === sub)?.label;
  const fit = params.get('fit') ?? 'all';
  const sort = params.get('sort') ?? 'featured';
  const colour = params.get('color') ?? '';
  const style = params.get('style') ?? '';
  const styleLabel = STYLE_CATEGORIES.find((item) => item.key === style)?.label;

  const women = useMemo(() => products.filter((product) => product.department === 'women' && product.shelf !== 'watches' && product.shelf !== 'jewelry'), [products]);
  const colours = useMemo(() => [...new Set(women.map((product) => product.color).filter(Boolean))].sort().slice(0, 14), [women]);
  const tier = usePhotoTier();
  const filtered = useMemo(() => {
    const list = women.filter((product) =>
      (collection === 'all' || inCategory(product, collection, sub))
      && (fit === 'all' || (fit === 'curvy') === isCurvyLook(product))
      && (!colour || product.color === colour)
      && (!style || matchesStyle(product, style)));
    return [...list].sort((a, b) => sort === 'price-low' ? a.priceCents - b.priceCents : sort === 'price-high' ? b.priceCents - a.priceCents : sort === 'name' ? a.title.localeCompare(b.title) : tier(a) - tier(b) || Number(Boolean(b.featured)) - Number(Boolean(a.featured)));
  }, [women, collection, sub, fit, colour, style, sort, tier]);
  // Photos on a model and floating clothes (model erased) are shown apart, never mixed in one grid.
  const cutoutFor = useCutouts();
  const floating = filtered.filter((product) => isFloating(cutoutFor(product.id), product.storeCollection));
  const onModel = filtered.filter((product) => !isFloating(cutoutFor(product.id), product.storeCollection));
  const look = params.get('look') === 'floating' || !onModel.length ? 'floating' : 'model';
  const shown = look === 'floating' ? floating : onModel;
  const { visible, remaining, more, sentinel } = usePaged(shown, `${collection}|${sub}|${fit}|${colour}|${style}|${sort}|${look}`);

  function set(key: string, value: string, empty: string) {
    const next = new URLSearchParams(params);
    if (value === empty) next.delete(key); else next.set(key, value);
    setParams(next, { replace: true });
  }
  const [small, big] = subLabel ? titleParts(subLabel) : group ? titleParts(group.label) : ['The', 'EDIT'];
  // Categories with stock first, then the rest of the owner's list.
  const stocked = stockedGroups(women).map((entry) => entry.group);
  const groups = [...stocked, ...CATEGORY_GROUPS.filter((item) => !stocked.includes(item))];
  function pick(next: string) {
    const query = new URLSearchParams(params);
    query.delete('sub');
    if (next === 'all') query.delete('category'); else query.set('category', next);
    setParams(query, { replace: true });
  }

  return <section className="w-shop">
    <div className="w-shop__band">
      <h1><i>{styleLabel ?? (fit === 'curvy' ? 'Curvy' : small)}</i><b>{big}</b></h1>
      <p>{loading ? 'Loading the collection…' : filtered.length ? `${filtered.length} looks` : 'Coming soon'}</p>
      {group && CATEGORY_INTROS[group.slug] && <p className="w-shop__intro">{CATEGORY_INTROS[group.slug]}</p>}
    </div>
    <div className="w-filters glass">
      <div className="w-filters__row" role="group" aria-label="Category">
        <button type="button" className={collection === 'all' ? 'active' : ''} onClick={() => pick('all')}>All</button>
        {groups.map((item) => <button key={item.slug} type="button" className={collection === item.slug ? 'active' : ''} onClick={() => pick(item.slug)}>{item.label}</button>)}
      </div>
      {group && <div className="w-filters__row" role="group" aria-label="Type">
        <button type="button" className={!sub ? 'active' : ''} onClick={() => set('sub', '', '')}>All {group.label}</button>
        {group.subcategories.filter((item) => women.some((product) => product.storeCollection === group.slug && product.storeSubcategory === item.slug)).map((item) => <button key={item.slug} type="button" className={sub === item.slug ? 'active' : ''} onClick={() => set('sub', item.slug, '')}>{item.label}</button>)}
      </div>}
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
    {!loading && filtered.length === 0 && <p className="w-shop__empty">{group && !fit.includes('curvy') && !colour && !style ? 'The first pieces are on their way.' : 'Nothing matches these filters yet.'}</p>}
    {floating.length > 0 && onModel.length > 0 && <div className="look-switch" role="group" aria-label="Photo style">
      <button type="button" className={look === 'model' ? 'active' : ''} onClick={() => set('look', 'model', 'model')}>On model <i>{onModel.length}</i></button>
      <button type="button" className={look === 'floating' ? 'active' : ''} onClick={() => set('look', 'floating', 'model')}>Floating <i>{floating.length}</i></button>
    </div>}
    <div className="w-grid">{visible.map((product, index) => <WomenCard key={product.id} product={product} index={index} />)}</div>
    {remaining > 0 && <div ref={sentinel} className="w-shop__more"><button type="button" onClick={more}>Show more ({remaining})</button></div>}
  </section>;
}
