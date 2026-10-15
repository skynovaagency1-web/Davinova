import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SlidersHorizontal } from 'lucide-react';
import { useCatalog } from '../data/CatalogProvider';
import { ProductCard } from '../components/ProductCard';

export function ShopPage() {
  const { products, isLoading, error } = useCatalog();
  const [params, setParams] = useSearchParams();
  const [sort, setSort] = useState('featured');
  const occasion = params.get('occasion') ?? 'all';
  const filtered = useMemo(() => {
    const list = products.filter((product) => occasion === 'all' || product.occasion === occasion);
    return [...list].sort((a, b) => sort === 'price-low' ? a.priceCents - b.priceCents : sort === 'price-high' ? b.priceCents - a.priceCents : sort === 'name' ? a.title.localeCompare(b.title) : Number(Boolean(b.featured)) - Number(Boolean(a.featured)));
  }, [products, occasion, sort]);

  return (
    <section className="shop-page section">
      <div className="shop-title"><p className="eyebrow">The Davinova collection</p><h1>Dress for <em>the occasion.</em></h1><p>Pieces for the invitations you’ve been looking forward to.</p></div>
      <div className="shop-toolbar">
        <span>{isLoading ? 'Loading the collection…' : `${filtered.length} styles to fall for`}</span>
        <div>
          <SlidersHorizontal size={16} />
          <label htmlFor="occasion-filter" className="sr-only">Filter by occasion</label>
          <select id="occasion-filter" value={occasion} onChange={(e) => setParams(e.target.value === 'all' ? {} : { occasion: e.target.value })}>
            <option value="all">All occasions</option><option value="wedding-guest">Wedding guest</option><option value="cocktail">Cocktail</option><option value="evening">Evening</option><option value="bridesmaid">Bridesmaid</option>
          </select>
          <label htmlFor="sort-products" className="sr-only">Sort products</label>
          <select id="sort-products" value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="featured">Featured</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option><option value="name">Name</option>
          </select>
        </div>
      </div>
      <div className="product-grid">
        {filtered.map((product) => <ProductCard key={product.id} product={product} />)}
      </div>
      {!isLoading && filtered.length === 0 && <p role="status">{error ?? 'No dresses match this occasion just yet.'}</p>}
      {error && products.length > 0 && <p role="status">{error}</p>}
    </section>
  );
}
