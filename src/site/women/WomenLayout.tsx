import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Menu, Search, ShoppingBag, X } from 'lucide-react';
import { useCart } from '../../store/cart';
import { WomenMegaNav } from './WomenMegaNav';
import { Logo } from '../shared/Logo';
import { DeptSwitch } from '../shared/DeptSwitch';
import { CloudSky } from '../shared/Cloud';
import { HangingBag } from '../shared/HangingBag';
import { CATEGORY_GROUPS, categoryPath } from '../../lib/categories';
import { JEWELRY_TYPES, jewelryMenu, jewelryPath } from '../shared/jewelry';

const links = [
  ['/shop', 'Shop'],
  ['/categories', 'Categories'],
  ...CATEGORY_GROUPS.map((group) => [categoryPath(group.slug), group.label] as const),
  ['/fits', 'Fits'],
  ['/jewelry', 'Jewelry & Watches'],
] as const;

/** The women's storefront: floating header, lilac menu and footer. */
export function WomenLayout() {
  const { pathname, search } = useLocation();
  const [open, setOpen] = useState(false);
  const count = useCart((state) => state.items.reduce((sum, item) => sum + item.quantity, 0));

  useEffect(() => {
    setOpen(false);
    document.title = 'Davinova — Occasion dresses';
  }, [pathname, search]);

  return <div className="w-shell">
    <CloudSky />
    <DeptSwitch active="women" />
    <header className="w-header">
      <button type="button" className="w-header__menu" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} onClick={() => setOpen((value) => !value)}>{open ? <X size={20} /> : <Menu size={20} />}</button>
      <WomenMegaNav />
      <Link to="/" className="w-wordmark" aria-label="Davinova home"><Logo /></Link>
      <div className="w-header__right">
        <Link to="/shop" className="w-icon" aria-label="Browse the shop"><Search size={18} /></Link>
        <Link to="/men" className="w-switch">Men ↗</Link>
        <Link to="/bag" className="w-bag" aria-label={`Bag, ${count} items`}><ShoppingBag size={16} /><span>{count} {count === 1 ? 'item' : 'items'}</span></Link>
      </div>
    </header>
    <AnimatePresence>
      {open && <motion.nav className="w-drawer" aria-label="Mobile" initial={{ clipPath: 'circle(0% at 30px 30px)' }} animate={{ clipPath: 'circle(150% at 30px 30px)' }} exit={{ clipPath: 'circle(0% at 30px 30px)' }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}>
        {links.map(([to, label], index) => <motion.div key={to} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 + index * 0.05 }}><Link to={to}>{label}</Link></motion.div>)}
        <div className="drawer-sub">{jewelryMenu('women').flatMap((group) => group.items).map((item) => <Link key={item} to={jewelryPath('women', item)}>{JEWELRY_TYPES[item].label}</Link>)}</div>
        <Link to="/about" className="drawer-about">About the founder</Link>
        <Link to="/men" className="w-drawer__switch">Men's shop ↗</Link>
      </motion.nav>}
    </AnimatePresence>
    <main><motion.div key={pathname} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}><Outlet /></motion.div></main>
    <footer className="w-footer">
      <HangingBag />
      <div className="w-footer__big" aria-hidden="true">DAVINOVA</div>
      <Logo tone="brand" />
      <div className="w-footer__row">
        <p>Dresses for the moments you'll keep.</p>
        <nav aria-label="Footer"><Link to="/about">About</Link><Link to="/shipping">Shipping</Link><Link to="/returns">Returns</Link><Link to="/contact">Contact</Link><Link to="/privacy">Privacy</Link></nav>
      </div>
      <small>© {new Date().getFullYear()} Davinova</small>
    </footer>
  </div>;
}
