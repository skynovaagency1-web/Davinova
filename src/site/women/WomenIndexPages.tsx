import { ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Product } from '../../types/product';
import { useCatalogProducts } from '../../lib/useCatalogProducts';
import { useCutouts } from '../../lib/useCutouts';
import { CATEGORY_GROUPS, categoryPath, titleParts } from '../../lib/categories';
import { BEAUTY_COLLECTIONS } from '../../lib/storeCollectionTaxonomy';
import { isCurvyLook } from '../../lib/curvyLooks';

export type Card = { key: string; label: string; line: string; to: string; items: Product[] };

/** A glass card with a popped-out photo of one product from the set; empty sets say "Coming soon". */
export function IndexCard({ card }: { card: Card }) {
  const cutoutFor = useCutouts();
  const cover = card.items.find((product) => cutoutFor(product.id));
  const [title, sub] = titleParts(card.label);
  return <Link to={card.to} className={card.items.length ? 'nova-collection-card' : 'nova-collection-card is-empty'}>
    <span className={`nova-collection-card__img${cover ? ' nova-collection-card__img--pop' : ''}`}>{cover && <img src={cutoutFor(cover.id)} alt="" loading="lazy" />}</span>
    <span className="nova-collection-card__text">
      <strong>{title}</strong>
      <em>{sub}</em>
      <small>{card.line ? `${card.line} · ` : ''}{card.items.length ? `${card.items.length} looks` : 'Coming soon'}</small>
    </span>
    <span className="nova-collection-card__arrow"><ArrowUpRight size={18} /></span>
  </Link>;
}

function women(products: Product[]) {
  return products.filter((product) => product.department !== 'men');
}

/** /categories: every category with its sub-categories, stocked ones first. */
export function CategoriesPage() {
  const { products, loading } = useCatalogProducts();
  const all = women(products);
  const groups = CATEGORY_GROUPS
    .filter((group) => !BEAUTY_COLLECTIONS.includes(group.slug))
    .map((group) => ({ group, items: all.filter((product) => product.storeCollection === group.slug) }))
    .sort((a, b) => b.items.length - a.items.length);

  return <section className="jw jw--women idx">
    <header className="jw__head">
      <span className="jw__kicker">Davinova · Categories</span>
      <h1>Every category</h1>
      <p>From wedding guest dresses to everyday sets. Pick a category, or jump straight to a type.</p>
    </header>
    {!loading && <div className="idx__groups">
      {groups.map(({ group, items }) => <div key={group.slug} className="idx__group">
        <IndexCard card={{ key: group.slug, label: group.label, line: '', to: categoryPath(group.slug), items }} />
        <nav className="jw__groups idx__subs" aria-label={group.label}>
          {group.subcategories.map((sub) => {
            const count = items.filter((product) => product.storeSubcategory === sub.slug).length;
            return <Link key={sub.slug} to={categoryPath(group.slug, sub.slug)} className={count ? '' : 'is-empty'}>{sub.label}{count ? ` · ${count}` : ''}</Link>;
          })}
        </nav>
      </div>)}
    </div>}
  </section>;
}

/** /fits: Slim and Curvy, each opening the shop filtered to that fit. */
export function FitsPage() {
  const { products, loading } = useCatalogProducts();
  const all = women(products);
  const curvy = all.filter((product) => isCurvyLook(product));
  const cards: Card[] = [
    { key: 'standard', label: 'Slim fit', line: 'Sizes XS to XL', to: '/shop?fit=standard', items: all.filter((product) => !isCurvyLook(product)) },
    { key: 'curvy', label: 'Curvy plus size', line: 'Sizes 1X and up', to: '/shop?fit=curvy', items: curvy },
    { key: 'all', label: 'All fits', line: 'Every dress in the store', to: '/shop', items: [...all].reverse() }, // reversed so its photo differs from the other two
  ];

  return <section className="jw jw--women idx">
    <header className="jw__head">
      <span className="jw__kicker">Davinova · Fits</span>
      <h1>Find your fit</h1>
      <p>Shop dresses cut for your shape. Every product page lists its exact sizes.</p>
    </header>
    {!loading && <div className="nova-collections__grid">{cards.map((card) => <IndexCard key={card.key} card={card} />)}</div>}
  </section>;
}

/** The phone menu's four sections: two fits over the clothing categories, then accessories and couple sets. */
const CLOTHING_GROUPS = CATEGORY_GROUPS.filter((group) => group.slug !== 'accessories' && group.slug !== 'couple-parent-child-clothing' && !BEAUTY_COLLECTIONS.includes(group.slug));
const FIT_SECTIONS = [
  { fit: 'standard', label: 'Slim', to: '/slim', line: 'Sizes XS to XL, every category cut slim.' },
  { fit: 'curvy', label: 'Plus size', to: '/plus-size', line: 'Sizes 1X and up, every category cut for curves.' },
] as const;

function inFit(product: Product, fit: 'standard' | 'curvy') {
  return (fit === 'curvy') === isCurvyLook(product);
}

/** /slim and /plus-size: the clothing categories, each opening the shop filtered to that fit. */
export function FitCategoriesPage({ fit }: { fit: 'standard' | 'curvy' }) {
  const { products, loading } = useCatalogProducts();
  const section = FIT_SECTIONS.find((item) => item.fit === fit)!;
  const all = women(products).filter((product) => inFit(product, fit));
  const cards: Card[] = CLOTHING_GROUPS
    .map((group) => ({ key: group.slug, label: group.label, line: '', to: `${categoryPath(group.slug)}&fit=${fit}`, items: all.filter((product) => product.storeCollection === group.slug) }))
    .sort((a, b) => b.items.length - a.items.length);
  if (fit === 'standard') cards.push({ key: 'couple', label: 'Couple & Parent-Child Clothing', line: '', to: '/couple', items: women(products).filter((product) => product.storeCollection === 'couple-parent-child-clothing') });

  return <section className="jw jw--women idx">
    <header className="jw__head">
      <span className="jw__kicker">Davinova · {section.label}</span>
      <h1>{section.label}</h1>
      <p>{section.line}</p>
    </header>
    {!loading && <div className="nova-collections__grid">{cards.map((card) => <IndexCard key={card.key} card={card} />)}</div>}
  </section>;
}

/** /accessories and /couple: one category's types as cards (Accessories also links Jewelry & Watches). */
export function GroupPage({ slug }: { slug: 'accessories' | 'couple-parent-child-clothing' }) {
  const { products, loading } = useCatalogProducts();
  const group = CATEGORY_GROUPS.find((item) => item.slug === slug)!;
  const items = women(products).filter((product) => product.storeCollection === slug);
  const cards: Card[] = group.subcategories
    .map((sub) => ({ key: sub.slug, label: sub.label, line: '', to: categoryPath(slug, sub.slug), items: items.filter((product) => product.storeSubcategory === sub.slug) }))
    .sort((a, b) => b.items.length - a.items.length);
  if (slug === 'accessories') cards.unshift({ key: 'jewelry', label: 'Jewelry & Watches', line: 'Sets, rings and watches', to: '/jewelry', items: [] });

  return <section className="jw jw--women idx">
    <header className="jw__head">
      <span className="jw__kicker">Davinova · {group.label}</span>
      <h1>{group.label}</h1>
      <p>{slug === 'accessories' ? 'The finishing touches: bags, jewelry, watches and more.' : 'Matching looks for couples, parents and little ones.'}</p>
      <Link to={categoryPath(slug)} className="idx__all">Shop all {group.label} →</Link>
    </header>
    {!loading && <div className="nova-collections__grid">{cards.map((card) => <IndexCard key={card.key} card={card} />)}</div>}
  </section>;
}
