import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Home, Menu, ShoppingBag, X } from 'lucide-react';
import { useCart } from '../../store/cart';
import { Logo } from '../shared/Logo';
import { DeptSwitch } from '../shared/DeptSwitch';
import { CloudSky } from '../shared/Cloud';
import { HangingWatch } from '../shared/HangingWatch';
import { JEWELRY_TYPES, jewelryMenu, jewelryPath } from '../shared/jewelry';

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
    <CloudSky />
    <DeptSwitch active="men" />
    <header className="m-header">
      <button type="button" className="m-header__menu" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} onClick={() => setOpen((value) => !value)}>{open ? <X size={20} /> : <Menu size={20} />}</button>
      <Link to="/men" className="m-wordmark" aria-label="Davinova Homme home"><Logo tone="metal" sub="HOMME" /></Link>
      <nav className="m-nav" aria-label="Men's navigation">{links.map(([to, label], index) => <Link key={to} to={to} className={current === to ? 'active' : ''}><i>{String(index + 1).padStart(2, '0')}</i>{label}</Link>)}
        <div className="m-nav__drop">
          <Link to={jewelryPath('men')} className={pathname.startsWith('/men/jewelry') ? 'active' : ''}><i>05</i>Jewelry &amp; Watches</Link>
          <div className="m-nav__menu">{jewelryMenu('men').map((group) => <div key={group.title}>
            <span>{group.title}</span>
            {group.items.map((item) => <Link key={item} to={jewelryPath('men', item)}>{JEWELRY_TYPES[item].label}</Link>)}
          </div>)}</div>
        </div>
      </nav>
      <div className="m-header__right">
        <Link to="/men" className="m-home" aria-label="Home"><Home size={16} /></Link>
        <Link to="/" className="m-switch">Women ↗</Link>
        <Link to="/men/bag" className="m-bag" aria-label={`Bag, ${count} items`}><ShoppingBag size={16} /><span>{String(count).padStart(2, '0')}</span></Link>
      </div>
    </header>
    <AnimatePresence>
      {open && <motion.nav className="m-drawer" aria-label="Men's mobile navigation" initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
        {links.map(([to, label], index) => <Link key={to} to={to}><i>{String(index + 1).padStart(2, '0')}</i>{label}</Link>)}
        <Link to={jewelryPath('men')}><i>05</i>Jewelry &amp; Watches</Link>
        <div className="drawer-sub">{jewelryMenu('men').flatMap((group) => group.items).map((item) => <Link key={item} to={jewelryPath('men', item)}>{JEWELRY_TYPES[item].label}</Link>)}</div>
        <Link to="/men/about"><i>↗</i>About the founder</Link>
        <Link to="/"><i>↗</i>Women's shop</Link>
      </motion.nav>}
    </AnimatePresence>
    <main><motion.div key={pathname} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}><Outlet /></motion.div></main>
    <footer className="w-footer m-footer">
      <HangingWatch to={jewelryPath('men', 'mens-watches')} />
      <div className="w-footer__big" aria-hidden="true">DAVINOVA</div>
      <Logo tone="metal" sub="HOMME" />
      <div className="w-footer__row">
        <p>Formalwear for the moments you'll keep.</p>
        <nav aria-label="Footer"><Link to="/men/about">About</Link><Link to="/shipping">Shipping</Link><Link to="/returns">Returns</Link><Link to="/contact">Contact</Link><Link to="/privacy">Privacy</Link></nav>
      </div>
      <small>© {new Date().getFullYear()} Davinova</small>
    </footer>
  </div>;
}
