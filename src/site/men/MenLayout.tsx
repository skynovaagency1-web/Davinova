import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Menu, ShoppingBag, X } from 'lucide-react';
import { useCart } from '../../store/cart';
import { Logo } from '../shared/Logo';

const links = [
  ['/men/shop', 'All formal'],
  ['/men/shop?occasion=wedding-guest', 'Wedding'],
  ['/men/shop?occasion=cocktail-party', 'Black tie'],
  ['/men/shop?occasion=maxi-holiday', 'Holiday'],
] as const;

/** The men's storefront: its own header, menu, colours and footer, separate from the women's shop. */
export function MenLayout() {
  const { pathname, search } = useLocation();
  const [open, setOpen] = useState(false);
  const count = useCart((state) => state.items.reduce((sum, item) => sum + item.quantity, 0));
  const current = pathname + search;

  useEffect(() => {
    setOpen(false);
    document.title = 'Davinova Homme — Formalwear';
  }, [pathname, search]);

  return <div className="m-shell">
    <header className="m-header">
      <button type="button" className="m-header__menu" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} onClick={() => setOpen((value) => !value)}>{open ? <X size={20} /> : <Menu size={20} />}</button>
      <Link to="/men" className="m-wordmark" aria-label="Davinova Homme home"><Logo tone="metal" sub="HOMME" /></Link>
      <nav className="m-nav" aria-label="Men's navigation">{links.map(([to, label], index) => <Link key={to} to={to} className={current === to ? 'active' : ''}><i>{String(index + 1).padStart(2, '0')}</i>{label}</Link>)}</nav>
      <div className="m-header__right">
        <Link to="/" className="m-switch">Women ↗</Link>
        <Link to="/men/bag" className="m-bag" aria-label={`Bag, ${count} items`}><ShoppingBag size={16} /><span>{String(count).padStart(2, '0')}</span></Link>
      </div>
    </header>
    <AnimatePresence>
      {open && <motion.nav className="m-drawer" aria-label="Men's mobile navigation" initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
        {links.map(([to, label], index) => <Link key={to} to={to}><i>{String(index + 1).padStart(2, '0')}</i>{label}</Link>)}
        <Link to="/"><i>↗</i>Women's shop</Link>
      </motion.nav>}
    </AnimatePresence>
    <main><motion.div key={pathname} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}><Outlet /></motion.div></main>
    <footer className="m-footer">
      <div className="m-footer__grid">
        <span className="m-wordmark"><Logo tone="metal" sub="HOMME" /></span>
        <nav aria-label="Footer"><Link to="/shipping">Shipping</Link><Link to="/returns">Returns</Link><Link to="/contact">Contact</Link><Link to="/privacy">Privacy</Link></nav>
      </div>
      <div className="m-footer__bar"><span>© {new Date().getFullYear()} DAVINOVA</span><span>FORMALWEAR / FOR THE OCCASION</span><span className="m-barcode" aria-hidden="true" /></div>
    </footer>
  </div>;
}
