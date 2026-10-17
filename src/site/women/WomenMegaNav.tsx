import { useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useCatalogProducts } from '../../lib/useCatalogProducts';
import { CATEGORY_GROUPS, categoryPath } from '../../lib/categories';
import { JEWELRY_TYPES, jewelryMenu, jewelryPath } from '../shared/jewelry';

// Adapted from Aceternity's "Navbar Menu" on 21st.dev: one shared panel springs between items on hover.
const spring = { type: 'spring', mass: 0.5, damping: 11.5, stiffness: 100, restDelta: 0.001, restSpeed: 0.001 } as const;

function Item({ label, active, setActive, children }: { label: string; active: string | null; setActive: (value: string) => void; children: ReactNode }) {
  return <div className="w-mega__item" onMouseEnter={() => setActive(label)} onFocus={() => setActive(label)}>
    <button type="button" className={active === label ? 'w-mega__trigger active' : 'w-mega__trigger'} aria-expanded={active === label}>{label}</button>
    {active !== null && <motion.div initial={{ opacity: 0, scale: 0.85, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={spring}>
      {active === label && <div className="w-mega__anchor">
        <motion.div layoutId="w-mega-panel" transition={spring} className="w-mega__panel">
          <motion.div layout className="w-mega__inner">{children}</motion.div>
        </motion.div>
      </div>}
    </motion.div>}
  </div>;
}

/** Women's desktop navigation with animated dropdown panels. */
export function WomenMegaNav() {
  const [active, setActive] = useState<string | null>(null);
  const { products } = useCatalogProducts();
  const count = (group: string, sub?: string) => products.filter((product) => product.storeCollection === group && (!sub || product.storeSubcategory === sub)).length;

  return <nav className="w-mega" aria-label="Main" onMouseLeave={() => setActive(null)} onClick={() => setActive(null)}>
    <Item label="Shop" active={active} setActive={setActive}>
      <div className="w-mega__links">
        <Link to="/shop">Everything</Link>
        <Link to="/shop?sort=price-low">Under budget first</Link>
        <Link to="/shop?fit=standard">Slim fit</Link>
        <Link to="/shop?fit=curvy">Plus size &amp; curvy</Link>
      </div>
    </Item>
    <Item label="Categories" active={active} setActive={setActive}>
      <div className="w-mega__cols w-mega__cols--cats">
        {CATEGORY_GROUPS.map((group) => <div key={group.slug} className="w-mega__links">
          <Link to={categoryPath(group.slug)} className="w-mega__group">{group.label}</Link>
          {group.subcategories.map((sub) => <Link key={sub.slug} to={categoryPath(group.slug, sub.slug)} className={count(group.slug, sub.slug) ? undefined : 'is-empty'}>{sub.label}</Link>)}
        </div>)}
      </div>
    </Item>
    <Item label="Fits" active={active} setActive={setActive}>
      <div className="w-mega__links">
        <Link to="/shop?fit=standard">Slim</Link>
        <Link to="/shop?fit=curvy">Curvy</Link>
        <Link to="/shop">All fits</Link>
      </div>
    </Item>
    <Item label="Jewelry & Watches" active={active} setActive={setActive}>
      <div className="w-mega__cols">
        {jewelryMenu('women').map((group) => <div key={group.title} className="w-mega__links">
          <span className="w-mega__group">{group.title}</span>
          {group.items.map((item) => <Link key={item} to={jewelryPath('women', item)}>{JEWELRY_TYPES[item].label}</Link>)}
        </div>)}
      </div>
    </Item>
    <Link to="/about" className="w-mega__trigger">About</Link>
  </nav>;
}
