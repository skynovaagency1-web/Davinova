import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { ShoppingBag, Menu, X } from 'lucide-react';
import { brand } from '../config/brand';
import { useCart } from '../store/cart';

export function Layout() {
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const count = useCart((state) => state.items.reduce((sum, item) => sum + item.quantity, 0));
  const closeMenu = () => setMenuOpen(false);

  useEffect(() => { setMenuOpen(false); }, [pathname]);

  return <div className="site-shell">
    <div className="announcement">A little something special for every celebration <span>✦</span> Complimentary shipping over $150</div>
    <header className="site-header">
      <button className="icon-button search-button" type="button" aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'} title={menuOpen ? 'Close menu' : 'Open menu'} aria-expanded={menuOpen} aria-controls="mobile-navigation" onClick={() => setMenuOpen((open) => !open)}>{menuOpen ? <X size={20} /> : <Menu size={20} />}</button>
      <Link to="/" className="wordmark" aria-label={`${brand.name} home`}>{brand.name}<span>ATELIER</span></Link>
      <nav className="desktop-nav" aria-label="Main navigation"><NavLink to="/shop">Shop all</NavLink><Link to="/shop?occasion=wedding-guest">Wedding guest</Link><Link to="/shop?occasion=evening">Evening</Link><Link to="/about">Our story</Link></nav>
      <Link to="/cart" className="cart-link" aria-label={`Shopping bag, ${count} items`}><ShoppingBag size={20} /><span>Bag ({count})</span></Link>
    </header>
    <AnimatePresence>
      {menuOpen && <motion.div className="mobile-menu-backdrop" tabIndex={-1} onKeyDown={(event) => { if (event.key === 'Escape') closeMenu(); }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closeMenu}>
        <motion.nav id="mobile-navigation" className="mobile-menu" role="dialog" aria-modal="true" aria-label="Mobile navigation" initial={{ opacity: 0, x: -18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }} transition={{ duration: 0.24, ease: 'easeOut' }} onClick={(event) => event.stopPropagation()}>
          <div className="mobile-menu__top"><span>EXPLORE DAVINOVA</span><button type="button" className="icon-button" aria-label="Close menu" onClick={closeMenu}><X size={18} /></button></div>
          <Link to="/shop" onClick={closeMenu}>Shop all <span>↗</span></Link>
          <Link to="/shop?occasion=wedding-guest" onClick={closeMenu}>Wedding guest <span>↗</span></Link>
          <Link to="/shop?occasion=cocktail" onClick={closeMenu}>Cocktail hour <span>↗</span></Link>
          <Link to="/shop?occasion=evening" onClick={closeMenu}>Evening edit <span>↗</span></Link>
          <Link to="/about" onClick={closeMenu}>Our story <span>↗</span></Link>
          <div className="mobile-menu__foot"><p>For the moments that stay with you.</p><span>OCCASIONWEAR · DAVINOVA ATELIER</span></div>
        </motion.nav>
      </motion.div>}
    </AnimatePresence>
    <main><motion.div key={pathname} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}><Outlet /></motion.div></main>
    <footer className="site-footer"><div><Link to="/" className="wordmark footer-wordmark">{brand.name}<span>ATELIER</span></Link><p>For the moments that stay with you.</p></div><div className="footer-links"><Link to="/shipping">Shipping</Link><Link to="/returns">Returns</Link><Link to="/contact">Contact</Link><Link to="/privacy">Privacy</Link></div><small>© {new Date().getFullYear()} {brand.name}. Thoughtfully dressed.</small></footer>
  </div>;
}
