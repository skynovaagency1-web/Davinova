import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Heart, Home, Menu, Search, ShoppingBag, X } from 'lucide-react';
import { useCart } from '../../store/cart';
import { WomenMegaNav } from './WomenMegaNav';
import { Logo } from '../shared/Logo';
import { DeptSwitch } from '../shared/DeptSwitch';
import { CloudSky } from '../shared/Cloud';
import { HangingBag } from '../shared/HangingBag';
import { CATEGORY_GROUPS, categoryPath } from '../../lib/categories';
import { useCatalogProducts } from '../../lib/useCatalogProducts';
import { isCurvyLook } from '../../lib/curvyLooks';
import type { Product } from '../../types/product';
import { useWishlist } from '../../store/wishlist';

const CLOTHING = CATEGORY_GROUPS.filter((group) => group.slug !== 'accessories' && group.slug !== 'couple-parent-child-clothing');

/** Phone menu: four titles, each with its stocked types as sub-titles. */
function drawerSections(products: Product[]) {
  const women = products.filter((product) => product.department !== 'men');
  const has = (group: string, sub?: string, fit?: 'standard' | 'curvy') => women.some((product) => product.storeCollection === group && (!sub || product.storeSubcategory === sub) && (!fit || (fit === 'curvy') === isCurvyLook(product)));
  const fitSection = (fit: 'standard' | 'curvy', label: string, to: string) => ({
    label, to, subs: CLOTHING.filter((group) => has(group.slug, undefined, fit)).map((group) => ({ to: `${categoryPath(group.slug)}&fit=${fit}`, label: group.label })),
  });
  const groupSection = (slug: string, label: string, to: string) => {
    const group = CATEGORY_GROUPS.find((item) => item.slug === slug);
    return { label, to, subs: (group?.subcategories ?? []).filter((sub) => has(slug, sub.slug)).map((sub) => ({ to: categoryPath(slug, sub.slug), label: sub.label })) };
  };
  const accessories = groupSection('accessories', 'Accessories', '/accessories');
  accessories.subs.unshift({ to: '/jewelry', label: 'Jewelry & Watches' }, { to: '/beauty', label: 'Beauty' });
  const slim = fitSection('standard', 'Slim', '/slim');
  // Couple & Parent-Child sits under Slim; its own types are listed on its page.
  slim.subs.push({ to: '/couple', label: 'Couple & Parent-Child Clothing' });
  return [slim, fitSection('curvy', 'Plus size', '/plus-size'), accessories];
}

/** The women's storefront: floating header, lilac menu and footer. */
export function WomenLayout() {
  const { pathname, search } = useLocation();
  const [open, setOpen] = useState(false);
  const { products } = useCatalogProducts();
  const wished = useWishlist((state) => state.ids.length);
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
        <Link to="/" className="w-icon w-home" aria-label="Home"><Home size={18} /></Link>
        <Link to="/shop" className="w-icon" aria-label="Browse the shop"><Search size={18} /></Link>
        <Link to="/wishlist" className="w-icon w-home w-wishlink" aria-label={`Wishlist, ${wished} saved`}><Heart size={18} />{wished > 0 && <i>{wished}</i>}</Link>
        <Link to="/men" className="w-switch">Men ↗</Link>
        <Link to="/bag" className="w-bag" aria-label={`Bag, ${count} items`}><ShoppingBag size={16} /><span>{count} {count === 1 ? 'item' : 'items'}</span></Link>
      </div>
    </header>
    <AnimatePresence>
      {open && <motion.nav className="w-drawer" aria-label="Mobile" initial={{ clipPath: 'circle(0% at 30px 30px)' }} animate={{ clipPath: 'circle(150% at 30px 30px)' }} exit={{ clipPath: 'circle(0% at 30px 30px)' }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}>
        <Link to="/" className="drawer-about">Home</Link>
        {drawerSections(products).map((section, index) => <motion.div key={section.to} className="drawer-title" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 + index * 0.05 }}>
          <Link to={section.to}>{section.label}</Link>
          {section.subs.length > 0 && <div className="drawer-sub">{section.subs.map((sub) => <Link key={sub.to} to={sub.to}>{sub.label}</Link>)}</div>}
        </motion.div>)}
        <Link to="/wishlist" className="drawer-about">Wishlist</Link>
        <Link to="/gift-cards" className="drawer-about">Gift cards</Link>
        <Link to="/refer" className="drawer-about">Refer a friend</Link>
        <Link to="/about" className="drawer-about">About the founder</Link>
        <Link to="/men" className="w-drawer__switch">Men's shop ↗</Link>
      </motion.nav>}
    </AnimatePresence>
    <main><motion.div key={pathname} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}><Outlet /></motion.div></main>
    <footer className="w-footer">
      <div className="w-footer__big"><span aria-hidden="true">DAVINOV</span><span className="w-footer__hook"><HangingBag /></span><span aria-hidden="true">A</span></div>
      <Logo tone="brand" />
      <div className="w-footer__row">
        <p>Dresses for the moments you'll keep.</p>
        <nav aria-label="Footer"><Link to="/about">About</Link><Link to="/wishlist">Wishlist</Link><Link to="/gift-cards">Gift cards</Link><Link to="/refer">Refer a friend</Link><Link to="/shipping">Shipping</Link><Link to="/returns">Returns</Link><Link to="/size-guide">Size guide</Link><Link to="/faq">FAQ</Link><Link to="/contact">Contact</Link><Link to="/privacy">Privacy</Link><Link to="/terms">Terms</Link></nav>
      </div>
      <small>© {new Date().getFullYear()} Davinova</small>
    </footer>
  </div>;
}
