import { useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useCatalogProducts } from '../../lib/useCatalogProducts';

// Adapted from Aceternity's "Navbar Menu" on 21st.dev: one shared panel springs between items on hover.
const spring = { type: 'spring', mass: 0.5, damping: 11.5, stiffness: 100, restDelta: 0.001, restSpeed: 0.001 } as const;

const occasions = [
  ['wedding-guest', 'Wedding guest', 'Ceremony to last dance'],
  ['cocktail-party', 'Cocktail & party', 'Made for after dark'],
  ['maxi-holiday', 'Maxi & holiday', 'Long, light, sun-ready'],
] as const;

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
  const cover = (key: string) => products.find((product) => product.department === 'women' && product.collectionCategory === key && product.images[0]?.url)?.images[0]?.url;

  return <nav className="w-mega" aria-label="Main" onMouseLeave={() => setActive(null)} onClick={() => setActive(null)}>
    <Item label="Shop" active={active} setActive={setActive}>
      <div className="w-mega__links">
        <Link to="/shop">All dresses</Link>
        <Link to="/shop?sort=price-low">Under budget first</Link>
        <Link to="/shop?fit=standard">Slim fit</Link>
        <Link to="/shop?fit=curvy">Plus size &amp; curvy</Link>
      </div>
    </Item>
    <Item label="Occasions" active={active} setActive={setActive}>
      <div className="w-mega__products">
        {occasions.map(([key, title, line]) => <Link key={key} to={`/shop?occasion=${key}`} className="w-mega__product">
          <span>{cover(key) ? <img src={cover(key)} alt="" loading="lazy" /> : null}</span>
          <div><strong>{title}</strong><small>{line}</small></div>
        </Link>)}
      </div>
    </Item>
    <Item label="Fits" active={active} setActive={setActive}>
      <div className="w-mega__links">
        <Link to="/shop?fit=standard">Slim</Link>
        <Link to="/shop?fit=curvy">Curvy</Link>
        <Link to="/shop">All fits</Link>
      </div>
    </Item>
    <Link to="/about" className="w-mega__trigger">About</Link>
  </nav>;
}
