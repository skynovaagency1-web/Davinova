import { Link } from 'react-router-dom';
import { useCatalogProducts } from '../../lib/useCatalogProducts';
import { menStoreCollectionGroups } from '../../lib/storeCollectionTaxonomy';
import { IndexCard } from '../women/WomenIndexPages';
import { menCategoryPath } from './menFormal';

/** /men/categories: every men's category with its types, stocked ones first. */
export function MenCategoriesPage() {
  const { products, loading } = useCatalogProducts();
  const men = products.filter((product) => product.department === 'men');
  const groups = menStoreCollectionGroups
    .map((group) => ({ group, items: men.filter((product) => product.storeCollection === group.slug) }))
    .sort((a, b) => b.items.length - a.items.length);

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
              return <Link key={sub.slug} to={menCategoryPath(sub.slug)} className={count ? '' : 'is-empty'}>{sub.label}{count ? ` · ${count}` : ''}</Link>;
            })}
          </nav>
        </div>;
      })}
    </div>}
  </section>;
}
