import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useCatalogProducts } from '../../lib/useCatalogProducts';
import { isCurvyLook } from '../../lib/curvyLooks';
import { usePaged } from '../shared/usePaged';
import { isFloating, useCutouts, usePhotoTier } from '../../lib/useCutouts';
import { WomenCard } from './WomenCard';
import { STYLE_CATEGORIES, matchesStyle } from '../shared/styleCategories';
import { CATEGORY_INTROS } from '../../lib/categoryIntros';
import { CategoryHero } from '../shared/CategoryHero';
import { CATEGORY_GROUPS, categoryGroup, inCategory, stockedGroups, titleParts } from '../../lib/categories';

const SHELVES = [
  { key: 'clothing', label: 'Clothing', slugs: ['tops-and-sets', 'bottoms', 'womens-denim', 'womens-sweaters', 'womens-sweatshirts-hoodies', 'womens-jackets', 'outerwear-and-jackets', 'couple-parent-child-clothing', 'parent-child-clothing'] },
  { key: 'weddings', label: 'Weddings', slugs: ['weddings'] },
  { key: 'events', label: 'Events & Parties', slugs: ['weddings-and-events'] },
  { key: 'shoes', label: 'Shoes', slugs: ['womens-shoes'] },
  { key: 'bags', label: 'Bags', slugs: ['womens-bags'] },
  { key: 'accessories', label: 'Accessories', slugs: ['accessories'] },
  { key: 'beauty', label: 'Beauty & Wellness', slugs: ['makeup', 'skin-care', 'nail-art-and-tools', 'beauty-tools', 'hair-and-accessories', 'hair-weaves', 'food-and-health'] },
];
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

  // Only the categories show; hovering (or tapping) one opens its types underneath.
  const [open, setOpen] = useState('');
  const subsOf = (slug: string) => categoryGroup(slug)?.subcategories.filter((item) => women.some((product) => product.storeCollection === slug && product.storeSubcategory === item.slug)) ?? [];
  // Top level: Clothing, Weddings, Events, Shoes, Bags, Accessories, Beauty (owner, 2026-11-07).
  const shelves = SHELVES.map((shelf) => ({ ...shelf, groups: shelf.slugs.map((slug) => groups.find((item) => item.slug === slug)).filter((item): item is NonNullable<typeof item> => Boolean(item) && stocked.includes(item!)) })).filter((shelf) => shelf.groups.length);
  const shelfOf = (slug: string) => shelves.find((shelf) => shelf.groups.some((item) => item.slug === slug));
  const openShelf = shelves.find((shelf) => shelf.key === open);
  function go(category: string, type: string) {
    const query = new URLSearchParams(params);
    query.set('category', category);
    if (type) query.set('sub', type); else query.delete('sub');
    setParams(query, { replace: true });
    setOpen('');
  }

  return <section className="w-shop">
    {group && !style && fit === 'all' ? <CategoryHero dept="women" keys={[sub, group.slug]} label={subLabel ?? group.label} products={filtered} count={loading ? undefined : filtered.length ? `${filtered.length} pieces` : 'Coming soon'} /> : <div className="w-shop__band">
      <h1><i>{styleLabel ?? (fit === 'curvy' ? 'Curvy' : small)}</i><b>{big}</b></h1>
      <p>{loading ? 'Loading the collection…' : filtered.length ? `${filtered.length} looks` : 'Coming soon'}</p>
      {group && CATEGORY_INTROS[group.slug] && <p className="w-shop__intro">{CATEGORY_INTROS[group.slug]}</p>}
    </div>}
    <div className="w-filters glass" onMouseLeave={() => setOpen('')}>
      <div className="w-filters__row" role="group" aria-label="Category">
        <button type="button" className={collection === 'all' ? 'active' : ''} onMouseEnter={() => setOpen('')} onClick={() => pick('all')}>All</button>
        {shelves.map((shelf) => <button key={shelf.key} type="button" aria-expanded={open === shelf.key} className={`${shelf.groups.some((item) => item.slug === collection) ? 'active' : ''}${open === shelf.key ? ' open' : ''}`} onMouseEnter={() => setOpen(shelf.key)} onClick={() => setOpen(shelf.key)}>{shelf.label}<span className="w-filters__caret" aria-hidden="true">▾</span></button>)}
      </div>
      {openShelf && <div className={`w-filters__subs${openShelf.groups.length > 1 ? ' w-filters__subs--cols' : ''}`} role="group" aria-label={`${openShelf.label} types`}>
        {openShelf.groups.map((item) => <div key={item.slug} className="w-filters__col">
          <button type="button" className={`w-filters__head${collection === item.slug && !sub ? ' active' : ''}`} onClick={() => go(item.slug, '')}>{openShelf.groups.length > 1 ? item.label : `All ${item.label}`}</button>
          {subsOf(item.slug).map((type) => <button key={type.slug} type="button" className={collection === item.slug && sub === type.slug ? 'active' : ''} onClick={() => go(item.slug, type.slug)}>{type.label}</button>)}
        </div>)}
      </div>}
      {group && !openShelf && <div className="w-filters__trail"><span>{shelfOf(group.slug)?.label}</span> › {sub ? <><span>{group.label}</span> › <b>{subLabel}</b></> : <b>{group.label}</b>}<button type="button" onClick={() => (sub ? set('sub', '', '') : pick('all'))} aria-label="Clear">✕</button></div>}
      <div className="w-filters__tools">
        <div className="w-fit" role="group" aria-label="Size fit">
          <span className="w-fit__label">Size fit</span>
          {fits.map(([value, label]) => <button key={value} type="button" className={fit === value ? 'active' : ''} onClick={() => set('fit', value, 'all')}>{label}</button>)}
        </div>
        <label className="w-filters__sort">Style<select value={style} onChange={(event) => set('style', event.target.value, '')}><option value="">Any style</option>{STYLE_CATEGORIES.map(({ key, label }) => <option key={key} value={key}>{label}</option>)}</select></label>
        {colours.length > 1 && <label className="w-filters__sort">Colour<select value={colour} onChange={(event) => set('color', event.target.value, '')}><option value="">Any colour</option>{colours.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>}
        <label className="w-filters__sort">Sort<select value={sort} onChange={(event) => set('sort', event.target.value, 'featured')}>{sorts.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      </div>
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
