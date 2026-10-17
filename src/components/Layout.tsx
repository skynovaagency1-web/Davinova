import { useEffect, useId, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { ShoppingBag, Menu, X, ChevronDown } from 'lucide-react';
import { getWooCommercePageUrl, isWooCommerceConfigured } from '../lib/woocommerce';
import { brand } from '../config/brand';
import { useCart } from '../store/cart';

type PlainTextCategoryGroup = { title: string; items: string[] };

const slimCategoryGroups: PlainTextCategoryGroup[] = [
  {
    "title": "Couple & Parent-Child Clothing",
    "items": [
      "Couple & Parent-Child Sweatshirts",
      "Couple & Parent-Child Short-Sleeves",
      "Couple & Parent-Child Jackets",
      "Couple & Parent-Child Tops",
      "Couple & Parent-Child Suits",
      "Couple & Parent-Child Pants"
    ]
  },
  {
    "title": "Women's Jackets",
    "items": [
      "Women's Casual Jackets",
      "Women's Baseball Jackets"
    ]
  },
  {
    "title": "Women's Sweatshirts & Hoodies",
    "items": [
      "Women's Sweatpants",
      "Women's Sweatsuit Sets",
      "Women's Sweatshirt Dresses",
      "Women's Zip-Up Hoodies"
    ]
  },
  {
    "title": "Women's Sweaters",
    "items": [
      "Women's Cardigans",
      "Women's Knit Sets",
      "Women's Knit Skirts",
      "Women's Knit Bottoms",
      "Women's Sweater Dresses"
    ]
  },
  {
    "title": "Women's Denim",
    "items": [
      "Women's Denim Tops",
      "Women's Denim Jackets",
      "Women's Denim Sets",
      "Women's Denim Skirts",
      "Women's Denim Dresses"
    ]
  },
  {
    "title": "Tops & Sets",
    "items": [
      "Ladies Short Sleeve",
      "Women's Camis",
      "Women's Vests",
      "Women's Short-Sleeved Shirts",
      "Women's Long-Sleeved Shirts",
      "Women's Suit Sets",
      "Women's Activewear Sets",
      "Women's Casual Sets",
      "Women's Three-Piece Sets",
      "Women's Tube Tops",
      "Women's Sleeveless Tops",
      "Blouses & Shirts",
      "Woman Hoodies & Sweatshirts",
      "Jumpsuits",
      "Rompers",
      "Lady Dresses",
      "Sweaters",
      "Suits & Sets"
    ]
  },
  {
    "title": "Bottoms",
    "items": [
      "Women's Skirts",
      "Women's Overalls",
      "Women's Flare Pants",
      "Women's Straight-Leg Pants",
      "Women's Suit Pants",
      "Women's Cargo Pants",
      "Leggings",
      "Skirts",
      "Woman Jeans",
      "Woman Shorts",
      "Pants & Capris",
      "Wide Leg Pants"
    ]
  },
  {
    "title": "Outerwear & Jackets",
    "items": [
      "Blazers",
      "Wool & Blend",
      "Women's Padded Jackets",
      "Women's Coats",
      "Women's Sherpa Jackets",
      "Women's Fur Coats",
      "Women's Fur-Paneled Jackets",
      "Women's Wool Coats",
      "Women's Outerwear",
      "Women's Shell Jackets",
      "Women's Blazers",
      "Women's Capes",
      "Woman Trench",
      "Basic Jacket",
      "Leather & Suede",
      "Real Fur"
    ]
  },
  {
    "title": "Weddings & Events",
    "items": [
      "Cocktail Dresses",
      "Evening Dresses",
      "Bridesmaid Dresses",
      "Prom Dresses",
      "Wedding Dresses",
      "Flower Girl Dresses"
    ]
  }
];

function PlainTextMenuGroup({ title, items, mobile = false }: PlainTextCategoryGroup & { mobile?: boolean }) {
  const [open, setOpen] = useState(false);
  const listId = useId();
  const wrapperClass = mobile ? 'mobile-accessories-nav mobile-slim-category' : 'women-accessories women-slim-category';
  const triggerClass = mobile ? 'mobile-accessories-nav__trigger' : 'women-accessories__trigger';
  const listClass = mobile ? 'mobile-accessories-nav__links' : 'women-accessories__dropdown';
  const itemClass = mobile ? 'mobile-accessories-nav__item' : 'women-accessories__item';
  const itemsMarkup = items.map((item) => <span key={item} className={itemClass}>{item}</span>);

  return <div className={wrapperClass}>
    <button type="button" className={triggerClass} aria-expanded={open} aria-controls={listId} onClick={() => setOpen((previous) => !previous)} onKeyDown={(event) => { if (event.key === 'Escape') setOpen(false); }}>
      {title} <ChevronDown size={mobile ? 16 : 13} aria-hidden="true" />
    </button>
    {mobile
      ? open && <div id={listId} className={listClass}>{itemsMarkup}</div>
      : <div id={listId} className={open ? `${listClass} is-open` : listClass}>{itemsMarkup}</div>}
  </div>;
}

export function Layout() {
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [womenMenuOpen, setWomenMenuOpen] = useState(false);
  const [womenMobileOpen, setWomenMobileOpen] = useState(false);
  const [accessoriesOpen, setAccessoriesOpen] = useState(false);
  const [accessoriesMobileOpen, setAccessoriesMobileOpen] = useState(false);
  const [slimMobileOpen, setSlimMobileOpen] = useState(false);
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
    setSlimMobileOpen(false);
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
            <div className="women-slim-group">
              <Link to="/shop?fit=standard" className="women-slim-link">Slim <ChevronDown size={13} aria-hidden="true" /></Link>
              <div className="women-slim-flyout">
                {slimCategoryGroups.map((group) => <PlainTextMenuGroup key={group.title} title={group.title} items={group.items} />)}
              </div>
            </div>
            <Link to="/shop?fit=curvy">Plus Size &amp; Curvy</Link>
            <div className="women-accessories">
              <button type="button" className="women-accessories__trigger" aria-expanded={accessoriesOpen} aria-haspopup="true" onClick={() => setAccessoriesOpen((open) => !open)} onKeyDown={(event) => { if (event.key === 'Escape') setAccessoriesOpen(false); }}>
                Accessories <ChevronDown size={13} aria-hidden="true" />
              </button>
              <div className={accessoriesOpen ? 'women-accessories__dropdown is-open' : 'women-accessories__dropdown'}>
                <span className="women-accessories__item">Scarves &amp; Wraps</span>
                <span className="women-accessories__item">Face Masks</span>
                <span className="women-accessories__item">Belts &amp; Cummerbunds</span>
                <span className="women-accessories__item">Women’s Gloves &amp; Mittens</span>
                <span className="women-accessories__item">Women’s Socks</span>
                <span className="women-accessories__item">Women’s Hats &amp; Caps</span>
              </div>
            </div>
          </div>
        </div>
        <Link to="/shop?dept=men">Men's</Link>
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
              <div className="mobile-slim-group">
                <div className="mobile-slim-row">
                  <Link to="/shop?fit=standard" onClick={closeMenu}>Slim <span>↗</span></Link>
                  <button type="button" className="mobile-slim-toggle" aria-label="Show Slim categories" aria-expanded={slimMobileOpen} aria-controls="mobile-slim-category-list" onClick={() => setSlimMobileOpen((open) => !open)}>
                    <ChevronDown size={16} aria-hidden="true" />
                  </button>
                </div>
                {slimMobileOpen && <div id="mobile-slim-category-list" className="mobile-slim-category-list">
                  {slimCategoryGroups.map((group) => <PlainTextMenuGroup key={group.title} title={group.title} items={group.items} mobile />)}
                </div>}
              </div>
              <Link to="/shop?fit=curvy" onClick={closeMenu}>Plus Size &amp; Curvy <span>↗</span></Link>
              <div className="mobile-accessories-nav">
                <button type="button" className="mobile-accessories-nav__trigger" aria-expanded={accessoriesMobileOpen} aria-controls="mobile-accessory-collections" onClick={() => setAccessoriesMobileOpen((open) => !open)}>
                  Accessories <ChevronDown size={16} aria-hidden="true" />
                </button>
                {accessoriesMobileOpen && <div id="mobile-accessory-collections" className="mobile-accessories-nav__links">
                  <span className="mobile-accessories-nav__item">Scarves &amp; Wraps</span>
                  <span className="mobile-accessories-nav__item">Face Masks</span>
                  <span className="mobile-accessories-nav__item">Belts &amp; Cummerbunds</span>
                  <span className="mobile-accessories-nav__item">Women’s Gloves &amp; Mittens</span>
                  <span className="mobile-accessories-nav__item">Women’s Socks</span>
                  <span className="mobile-accessories-nav__item">Women’s Hats &amp; Caps</span>
                </div>}
              </div>
            </div>}
          </div>
          <Link to="/shop?dept=men" onClick={closeMenu}>Men's <span>↗</span></Link>
          <Link to="/about" onClick={closeMenu}>Our story <span>↗</span></Link>
          <div className="mobile-menu__foot"><p>For the moments that stay with you.</p><span>OCCASIONWEAR · DAVINOVA ATELIER</span></div>
        </motion.nav>
      </motion.div>}
    </AnimatePresence>
    <main><motion.div key={pathname} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}><Outlet /></motion.div></main>
    <footer className="site-footer"><div><Link to="/" className="wordmark footer-wordmark">{brand.name}<span>ATELIER</span></Link><p>For the moments that stay with you.</p></div><div className="footer-links"><Link to="/shipping">Shipping</Link><Link to="/returns">Returns</Link><Link to="/contact">Contact</Link><Link to="/privacy">Privacy</Link></div><small>© {new Date().getFullYear()} {brand.name}. Thoughtfully dressed.</small></footer>
  </div>;
}
