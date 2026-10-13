import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AnimatePresence, LayoutGroup, motion } from 'framer-motion';
import { SlidersHorizontal, X } from 'lucide-react';
import { products } from '../data/products';
import { ProductCard } from '../components/ProductCard';
import { fabricColors } from '../lib/fabric';
import { formatMoney } from '../lib/format';

const occasions = [
  ['all', 'All styles'],
  ['wedding-guest', 'Wedding Guest'],
  ['cocktail-party', 'Cocktail & Party'],
  ['maxi-holiday', 'Maxi & Holiday'],
] as const;

const unique = (values: string[]) => [...new Set(values)].filter((value) => value && value !== 'Not specified').sort();
const allColors = unique(products.map((product) => product.color));
const allSleeves = unique(products.map((product) => product.sleeve));
const maxPrice = Math.ceil(Math.max(...products.map((product) => product.priceCents)) / 1000) * 1000;

// All filters live in the URL so a filtered view can be shared or bookmarked.
export function ShopPage() {
  const [params, setParams] = useSearchParams();
  const [panelOpen, setPanelOpen] = useState(false);
  const occasion = params.get('occasion') ?? 'all';
  const colors = params.getAll('color');
  const sleeves = params.getAll('sleeve');
  const priceCap = Number(params.get('max') ?? maxPrice);
  const sort = params.get('sort') ?? 'featured';

  function update(mutate: (next: URLSearchParams) => void) {
    const next = new URLSearchParams(params);
    mutate(next);
    setParams(next, { replace: true });
  }
  function toggle(key: string, value: string) {
    update((next) => {
      const current = next.getAll(key);
      next.delete(key);
      (current.includes(value) ? current.filter((item) => item !== value) : [...current, value]).forEach((item) => next.append(key, item));
    });
  }
  const activeCount = colors.length + sleeves.length + (priceCap < maxPrice ? 1 : 0) + (occasion !== 'all' ? 1 : 0)

  const filtered = useMemo(() => {
    const list = products.filter((product) =>
      (occasion === 'all' || product.collectionCategory === occasion)
      && (colors.length === 0 || colors.includes(product.color))
      && (sleeves.length === 0 || sleeves.includes(product.sleeve))
      && product.priceCents <= priceCap);
    return [...list].sort((a, b) => sort === 'price-low' ? a.priceCents - b.priceCents : sort === 'price-high' ? b.priceCents - a.priceCents : sort === 'name' ? a.title.localeCompare(b.title) : Number(Boolean(b.featured)) - Number(Boolean(a.featured)));
  }, [occasion, colors, sleeves, priceCap, sort]);

  const filterPanel = <div className="filter-panel__groups">
    <fieldset><legend>Colour</legend><div className="swatch-list">{allColors.map((color) => <button type="button" key={color} className={colors.includes(color) ? 'swatch selected' : 'swatch'} onClick={() => toggle('color', color)} aria-pressed={colors.includes(color)}><i style={{ background: fabricColors[color.toLowerCase()] ?? '#b9a79b' }} />{color}</button>)}</div></fieldset>
    <fieldset><legend>Sleeve</legend><div className="chip-list">{allSleeves.map((sleeve) => <button type="button" key={sleeve} className={sleeves.includes(sleeve) ? 'chip selected' : 'chip'} onClick={() => toggle('sleeve', sleeve)} aria-pressed={sleeves.includes(sleeve)}>{sleeve}</button>)}</div></fieldset>
    <fieldset><legend>Price <span>up to {formatMoney(priceCap)}</span></legend><input type="range" min={1000} max={maxPrice} step={500} value={priceCap} onChange={(event) => update((next) => { if (Number(event.target.value) >= maxPrice) next.delete('max'); else next.set('max', event.target.value); })} aria-label="Maximum price" /></fieldset>
    {activeCount > 0 && <button type="button" className="text-link" onClick={() => update((next) => { next.delete('color'); next.delete('sleeve'); next.delete('max'); next.delete('occasion'); })}>Clear filters</button>}
  </div>;

  return <section className="shop-page section">
    <motion.div className="shop-title" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}>
      <p className="eyebrow">The Davinova collection</p><h1>Dress for <em>the occasion.</em></h1><p>Pieces for the invitations you’ve been looking forward to.</p>
    </motion.div>
    <LayoutGroup>
      <nav className="occasion-tabs" aria-label="Shop by occasion">{occasions.map(([value, label]) => <button type="button" key={value} className={occasion === value ? 'active' : ''} onClick={() => update((next) => { if (value === 'all') next.delete('occasion'); else next.set('occasion', value); })}>{label}{occasion === value && <motion.span layoutId="occasion-underline" className="occasion-tabs__line" />}</button>)}</nav>
    </LayoutGroup>
    <div className="shop-toolbar">
      <button type="button" className="filter-toggle" onClick={() => setPanelOpen(true)}><SlidersHorizontal size={16} /> Filters{activeCount > 0 && <b>{activeCount}</b>}</button>
      <span>{filtered.length} {filtered.length === 1 ? 'style' : 'styles'} to fall for</span>
      <div><label htmlFor="sort-products" className="sr-only">Sort products</label><select id="sort-products" value={sort} onChange={(event) => update((next) => { if (event.target.value === 'featured') next.delete('sort'); else next.set('sort', event.target.value); })}><option value="featured">Featured</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option><option value="name">Name</option></select></div>
    </div>
    <div className="shop-layout">
      <aside className="filter-sidebar" aria-label="Filters">{filterPanel}</aside>
      <div>
        <motion.div className="product-grid" layout>
          {filtered.map((product, index) => <ProductCard key={product.id} product={product} index={index} />)}
        </motion.div>
        {filtered.length === 0 && <div className="empty-results"><p>{occasion === 'maxi-holiday' ? 'We are curating the first Maxi & Holiday edit.' : 'Nothing matches these filters just yet.'}</p><button type="button" className="text-link" onClick={() => setParams({}, { replace: true })}>Show every dress</button></div>}
      </div>
    </div>
    <AnimatePresence>{panelOpen && <>
      <motion.div className="filter-scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setPanelOpen(false)} />
      <motion.aside className="filter-drawer" role="dialog" aria-modal="true" aria-label="Filters" initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ type: 'spring', stiffness: 260, damping: 32 }}>
        <div className="filter-drawer__head"><strong>Filters</strong><button type="button" className="icon-button" onClick={() => setPanelOpen(false)} aria-label="Close filters"><X size={18} /></button></div>
        {filterPanel}
        <button type="button" className="button button--dark filter-drawer__done" onClick={() => setPanelOpen(false)}>Show {filtered.length} {filtered.length === 1 ? 'style' : 'styles'}</button>
      </motion.aside>
    </>}</AnimatePresence>
  </section>;
}
