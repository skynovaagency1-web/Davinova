import { Link } from 'react-router-dom';
import { useCatalogProducts } from '../../lib/useCatalogProducts';
import { MEN_ACCESSORIES, MEN_EVERYDAY, MEN_FORMAL, MEN_LOUNGE, menStoreCollectionGroups } from '../../lib/storeCollectionTaxonomy';
import { IndexCard } from '../women/WomenIndexPages';
import { menCategoryPath } from './menFormal';

/** /men/categories: every men's category with its types, clothes first. */
export function MenCategoriesPage() {
  const { products, loading } = useCatalogProducts();
  const men = products.filter((product) => product.department === 'men');
  // Clothes first, then shoes, ties, belts and hats (the accessories).
  const order = [MEN_FORMAL, MEN_EVERYDAY, MEN_LOUNGE, MEN_ACCESSORIES];
  const groups = menStoreCollectionGroups
    .map((group) => ({ group, items: men.filter((product) => product.storeCollection === group.slug) }))
    .filter(({ items }) => items.length)
    .sort((a, b) => order.indexOf(a.group.slug) - order.indexOf(b.group.slug));

  return <section className="jw jw--men idx">
    <header className="jw__head">
      <span className="jw__kicker">Davinova Homme · Categories</span>
      <h1>Every category</h1>
      <p>From wedding suits to loungewear. Pick a category, or jump straight to a type.</p>
    </header>
    {!loading && <div className="idx__groups">
      {groups.map(({ group, items }) => {
        const first = group.subcategories.find((sub) => items.some((product) => product.storeSubcategory === sub.slug));
        return <div key={group.slug} className="idx__group">
          <IndexCard card={{ key: group.slug, label: group.label, line: '', to: first ? menCategoryPath(first.slug) : '/men/shop', items }} />
          <nav className="jw__groups idx__subs" aria-label={group.label}>
            {group.subcategories.map((sub) => {
              const count = items.filter((product) => product.storeSubcategory === sub.slug).length;
              return count ? <Link key={sub.slug} to={menCategoryPath(sub.slug)}>{sub.label} · {count}</Link> : null;
            })}
          </nav>
        </div>;
      })}
    </div>}
  </section>;
}
