import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { ShoppingBag, Menu, X, ChevronDown } from 'lucide-react';
import { getWooCommercePageUrl, isWooCommerceConfigured } from '../lib/woocommerce';
import { brand } from '../config/brand';
import { useCart } from '../store/cart';

export function Layout() {
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [womenMenuOpen, setWomenMenuOpen] = useState(false);
  const [womenMobileOpen, setWomenMobileOpen] = useState(false);
  const [accessoriesOpen, setAccessoriesOpen] = useState(false);
  const [accessoriesMobileOpen, setAccessoriesMobileOpen] = useState(false);
  const count = useCart((state) => state.items.reduce((sum, item) => sum + item.quantity, 0));
  const wooCartUrl = getWooCommercePageUrl('cart');
  const wooConfigured = isWooCommerceConfigured();
  const closeMenu = () => setMenuOpen(false);

  useEffect(() => {
    setMenuOpen(false);
    setWomenMenuOpen(false);
    setWomenMobileOpen(false);
    setAccessoriesOpen(false);
    setAccessoriesMobileOpen(false);
    document.title = 'Davinova — Occasion, beautifully considered';
  }, [pathname]);

  return <div className="site-shell">
    <div className="announcement">A considered edit for every celebration <span>✦</span> Discover your next occasion look</div>
    <header className="site-header">
      <button className="icon-button search-button" type="button" aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'} title={menuOpen ? 'Close menu' : 'Open menu'} aria-expanded={menuOpen} aria-controls="mobile-navigation" onClick={() => setMenuOpen((open) => !open)}>{menuOpen ? <X size={20} /> : <Menu size={20} />}</button>
      <Link to="/" className="wordmark" aria-label={`${brand.name} home`}>{brand.name}<span>ATELIER</span></Link>
      <nav className="desktop-nav" aria-label="Main navigation">
        <NavLink to="/shop">Shop all</NavLink>
        <div className="women-nav" onMouseEnter={() => setWomenMenuOpen(true)} onMouseLeave={() => setWomenMenuOpen(false)}>
          <button type="button" className="women-nav__trigger" aria-expanded={womenMenuOpen} aria-haspopup="true" onClick={() => setWomenMenuOpen((open) => !open)} onKeyDown={(event) => { if (event.key === 'Escape') setWomenMenuOpen(false); }}>
            Women Clothing <ChevronDown size={13} aria-hidden="true" />
          </button>
          <div className={womenMenuOpen ? 'women-nav__dropdown is-open' : 'women-nav__dropdown'}>
            <span className="women-nav__eyebrow">SHOP WOMEN</span>
            <Link to="/shop?fit=standard">Slim</Link>
            <Link to="/shop?fit=curvy">Plus Size &amp; Curvy</Link>
            <div className="women-accessories">
              <button type="button" className="women-accessories__trigger" aria-expanded={accessoriesOpen} aria-haspopup="true" onClick={() => setAccessoriesOpen((open) => !open)} onKeyDown={(event) => { if (event.key === 'Escape') setAccessoriesOpen(false); }}>
                Accessories <ChevronDown size={13} aria-hidden="true" />
              </button>
              <div className={accessoriesOpen ? 'women-accessories__dropdown is-open' : 'women-accessories__dropdown'}>
                <Link to="/shop?accessory=scarves-wraps">Scarves &amp; Wraps</Link>
                <Link to="/shop?accessory=face-masks">Face Masks</Link>
                <Link to="/shop?accessory=belts-cummerbunds">Belts &amp; Cummerbunds</Link>
                <Link to="/shop?accessory=women-gloves-mittens">Women’s Gloves &amp; Mittens</Link>
                <Link to="/shop?accessory=women-socks">Women’s Socks</Link>
                <Link to="/shop?accessory=women-hats-caps">Women’s Hats &amp; Caps</Link>
              </div>
            </div>
          </div>
        </div>
        <Link to="/about">Our story</Link>
      </nav>
      {wooConfigured && wooCartUrl ? <a href={wooCartUrl} className="cart-link" aria-label="Open WooCommerce shopping basket"><ShoppingBag size={20} /><span>Bag</span></a> : <Link to="/cart" className="cart-link" aria-label={`Shopping bag, ${count} items`}><ShoppingBag size={20} /><span>Bag ({count})</span></Link>}
    </header>
    <AnimatePresence>
      {menuOpen && <motion.div className="mobile-menu-backdrop" tabIndex={-1} onKeyDown={(event) => { if (event.key === 'Escape') closeMenu(); }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closeMenu}>
        <motion.nav id="mobile-navigation" className="mobile-menu" role="dialog" aria-modal="true" aria-label="Mobile navigation" initial={{ opacity: 0, x: -18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }} transition={{ duration: 0.24, ease: 'easeOut' }} onClick={(event) => event.stopPropagation()}>
          <div className="mobile-menu__top"><span>EXPLORE DAVINOVA</span><button type="button" className="icon-button" aria-label="Close menu" onClick={closeMenu}><X size={18} /></button></div>
          <Link to="/shop" onClick={closeMenu}>Shop all <span>↗</span></Link>
          <div className="mobile-women-nav">
            <button type="button" className="mobile-women-nav__trigger" aria-expanded={womenMobileOpen} aria-controls="mobile-women-collections" onClick={() => setWomenMobileOpen((open) => !open)}>
              Women Clothing <ChevronDown size={18} aria-hidden="true" />
            </button>
            {womenMobileOpen && <div id="mobile-women-collections" className="mobile-women-nav__links">
              <Link to="/shop?fit=standard" onClick={closeMenu}>Slim <span>↗</span></Link>
              <Link to="/shop?fit=curvy" onClick={closeMenu}>Plus Size &amp; Curvy <span>↗</span></Link>
              <div className="mobile-accessories-nav">
                <button type="button" className="mobile-accessories-nav__trigger" aria-expanded={accessoriesMobileOpen} aria-controls="mobile-accessory-collections" onClick={() => setAccessoriesMobileOpen((open) => !open)}>
                  Accessories <ChevronDown size={16} aria-hidden="true" />
                </button>
                {accessoriesMobileOpen && <div id="mobile-accessory-collections" className="mobile-accessories-nav__links">
                  <Link to="/shop?accessory=scarves-wraps" onClick={closeMenu}>Scarves &amp; Wraps <span>↗</span></Link>
                  <Link to="/shop?accessory=face-masks" onClick={closeMenu}>Face Masks <span>↗</span></Link>
                  <Link to="/shop?accessory=belts-cummerbunds" onClick={closeMenu}>Belts &amp; Cummerbunds <span>↗</span></Link>
                  <Link to="/shop?accessory=women-gloves-mittens" onClick={closeMenu}>Women’s Gloves &amp; Mittens <span>↗</span></Link>
                  <Link to="/shop?accessory=women-socks" onClick={closeMenu}>Women’s Socks <span>↗</span></Link>
                  <Link to="/shop?accessory=women-hats-caps" onClick={closeMenu}>Women’s Hats &amp; Caps <span>↗</span></Link>
                </div>}
              </div>
            </div>}
          </div>
          <Link to="/about" onClick={closeMenu}>Our story <span>↗</span></Link>
          <div className="mobile-menu__foot"><p>For the moments that stay with you.</p><span>OCCASIONWEAR · DAVINOVA ATELIER</span></div>
        </motion.nav>
      </motion.div>}
    </AnimatePresence>
    <main><motion.div key={pathname} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}><Outlet /></motion.div></main>
    <footer className="site-footer"><div><Link to="/" className="wordmark footer-wordmark">{brand.name}<span>ATELIER</span></Link><p>For the moments that stay with you.</p></div><div className="footer-links"><Link to="/shipping">Shipping</Link><Link to="/returns">Returns</Link><Link to="/contact">Contact</Link><Link to="/privacy">Privacy</Link></div><small>© {new Date().getFullYear()} {brand.name}. Thoughtfully dressed.</small></footer>
  </div>;
}
