import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, X } from 'lucide-react';
import { useCatalogProducts } from '../../lib/useCatalogProducts';
import { useCutouts } from '../../lib/useCutouts';
import { formatMoney } from '../../lib/format';
import { productPath } from '../../lib/storefront';
import { searchProducts } from '../../lib/search';
import type { Department } from '../../types/product';

const SUGGESTIONS: Record<Department, string[]> = {
  women: ['Wedding guest', 'Satin', 'Sequin', 'Plus size', 'Heels', 'Handbag', 'Earrings', 'Watch'],
  men: ['Wedding suit', 'Tuxedo', 'Linen', 'Dress shoes', 'Tie', 'Watch', 'Cufflinks', 'Briefcase'],
};

/** Header search: a glass panel with instant results from the shop's own catalogue. */
export function SearchButton({ department, className }: { department: Department; className: string }) {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => { setOpen(false); }, [pathname]);
  return <>
    <button type="button" className={className} aria-label="Search the shop" onClick={() => setOpen(true)}><Search size={department === 'men' ? 16 : 18} /></button>
    <AnimatePresence>{open && <SearchPanel department={department} onClose={() => setOpen(false)} />}</AnimatePresence>
  </>;
}

function SearchPanel({ department, onClose }: { department: Department; onClose: () => void }) {
  const [query, setQuery] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const { products, loading } = useCatalogProducts();
  const cutoutFor = useCutouts();
  const results = useMemo(() => searchProducts(products, query, department), [products, query, department]);

  useEffect(() => {
    input.current?.focus();
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = overflow; };
  }, [onClose]);

  return <motion.div className={`search search--${department}`} role="dialog" aria-modal="true" aria-label="Search" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
    <motion.div className="search__panel" initial={{ y: -24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -24, opacity: 0 }} transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }} onClick={(event) => event.stopPropagation()}>
      <div className="search__bar">
        <Search size={20} aria-hidden="true" />
        <input ref={input} type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={department === 'men' ? 'Search suits, shoes, watches…' : 'Search dresses, bags, jewelry…'} aria-label="Search the shop" />
        <button type="button" onClick={onClose} aria-label="Close search"><X size={20} /></button>
      </div>
      {!query.trim() && <div className="search__chips">
        <span>Popular</span>
        {SUGGESTIONS[department].map((word) => <button key={word} type="button" onClick={() => setQuery(word)}>{word}</button>)}
      </div>}
      {query.trim() && <>
        <p className="search__count" role="status">{loading ? 'Searching…' : results.length ? `${results.length} ${results.length === 1 ? 'piece' : 'pieces'}` : 'Nothing found. Try another word, like “satin” or “watch”.'}</p>
        <ul className="search__results">
          {results.slice(0, 24).map((product) => <li key={product.id}>
            <Link to={productPath(product)}>
              <span><img src={cutoutFor(product.id) ?? product.images[0].url} alt="" loading="lazy" /></span>
              <strong>{product.title}</strong>
              <em>{product.supplierVerified ? formatMoney(product.priceCents, product.currency) : 'Coming soon'}</em>
            </Link>
          </li>)}
        </ul>
      </>}
    </motion.div>
  </motion.div>;
}
