import { useEffect, useState, type CSSProperties } from 'react';
import { SearchButton } from '../shared/SearchOverlay';
import { SocialLinks } from '../shared/SocialLinks';
import { NewsletterSignup } from '../shared/NewsletterSignup';
import { SupportHelper } from '../shared/SupportHelper';
import { PromoBar } from '../shared/PromoBar';
import { WelcomePopup } from '../shared/WelcomePopup';
import { AnimatePresence, motion } from 'framer-motion';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Heart, Home, Menu, ShoppingBag, UserRound, X } from 'lucide-react';
import { useCart } from '../../store/cart';
import { Logo } from '../shared/Logo';
import { DeptSwitch } from '../shared/DeptSwitch';
import { CloudSky } from '../shared/Cloud';
import { MoodBar, MoodLayer } from '../shared/Mood';
import { JEWELRY_TYPES, jewelryMenu, jewelryPath } from '../shared/jewelry';
import { MEN_CATEGORIES, menCategoryPath } from './menFormal';
import { useWishlist } from '../../store/wishlist';
import { useAccount } from '../../store/account';

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
  const wished = useWishlist((state) => state.ids.length);
  const signedIn = useAccount((state) => Boolean(state.account));
  const count = useCart((state) => state.items.reduce((sum, item) => sum + item.quantity, 0));
  const current = pathname + search;

  useEffect(() => {
    setOpen(false);
    document.title = 'Davinova Homme — Formalwear';
  }, [pathname, search]);

  return <div className="m-shell">
    <CloudSky />
    <MoodLayer dept="men" />
    <PromoBar dept="men" />
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
        <Link to="/men/custom/design" className={pathname.startsWith('/men/custom') ? 'active' : ''}><i>06</i>Design yours</Link>
      </nav>
      <div className="m-header__right">
        <Link to="/men" className="m-home" aria-label="Home"><Home size={16} /></Link>
        <SearchButton department="men" className="m-home" />
        <Link to="/men/wishlist" className="m-home m-wishlink" aria-label={`Wishlist, ${wished} saved`}><Heart size={16} />{wished > 0 && <i>{wished}</i>}</Link>
        <Link to="/men/account" className="m-home m-acctlink" aria-label={signedIn ? 'My account' : 'Sign in'}><UserRound size={16} />{signedIn && <b aria-hidden="true" />}</Link>
        <Link to="/" className="m-switch">Women ↗</Link>
        <Link to="/men/bag" className="m-bag" aria-label={`Bag, ${count} items`}><ShoppingBag size={16} /><span>{String(count).padStart(2, '0')}</span></Link>
      </div>
    </header>
    <AnimatePresence>
      {open && <motion.nav className="m-drawer" aria-label="Men's mobile navigation" initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
        {links.map(([to, label], index) => <Link key={to} to={to}><i>{String(index + 1).padStart(2, '0')}</i>{label}</Link>)}
        <div className="drawer-sub">{MEN_CATEGORIES.map((item) => <Link key={item.sub} to={menCategoryPath(item.sub)}>{item.short}</Link>)}</div>
        <Link to={jewelryPath('men')}><i>05</i>Jewelry &amp; Watches</Link>
        <div className="drawer-sub">{jewelryMenu('men').flatMap((group) => group.items).map((item) => <Link key={item} to={jewelryPath('men', item)}>{JEWELRY_TYPES[item].label}</Link>)}</div>
        <Link to="/men/custom/design"><i>06</i>Design your own</Link>
        <Link to="/men/categories"><i>↗</i>All categories</Link>
        <Link to="/men/wishlist"><i>♡</i>Wishlist</Link>
        <Link to="/men/account"><i>◎</i>My account</Link>
        <Link to="/men/gift-cards"><i>↗</i>Gift cards</Link>
        <Link to="/men/refer"><i>↗</i>Refer a friend</Link>
        <Link to="/men/about"><i>↗</i>About the founder</Link>
        <Link to="/"><i>↗</i>Women's shop</Link>
      </motion.nav>}
    </AnimatePresence>
    <main><motion.div key={pathname} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}><Outlet /></motion.div></main>
    <footer className="w-footer m-footer">
      <div className="w-footer__art w-footer__art--men" style={{ '--art': 'url(/images/footer-davinova-men.webp)' } as CSSProperties}>
        <img src="/images/footer-davinova-men.webp" alt="Davinova Homme" width="1672" height="941" loading="lazy" />
        <span className="w-footer__sweep" aria-hidden="true" />
        {/* the watch on the last A is in the picture; it opens the bag like the women's hanging bag */}
        <Link to="/men/bag" className="w-footer__watch" aria-label="Open your bag"><span>Your bag</span></Link>
      </div>
      <Logo tone="metal" sub="HOMME" />
      <NewsletterSignup dept="men" />
      <div className="w-footer__row">
        <p>Formalwear for the moments you'll keep.</p>
        <nav aria-label="Footer"><Link to="/men/about">About</Link><Link to="/men/wishlist">Wishlist</Link><Link to="/men/account">My account</Link><Link to="/men/gift-cards">Gift cards</Link><Link to="/men/refer">Refer a friend</Link><Link to="/men/categories">Categories</Link><Link to="/men/track">Track order</Link><Link to="/men/shipping">Shipping</Link><Link to="/men/returns">Returns</Link><Link to="/men/size-guide">Size guide</Link><Link to="/men/faq">FAQ</Link><Link to="/men/contact">Contact</Link><Link to="/men/privacy">Privacy</Link><Link to="/men/terms">Terms</Link></nav>
      </div>
      <SocialLinks />
      <small>© {new Date().getFullYear()} Davinova</small>
    </footer>
    <MoodBar dept="men" className="mood-bar--float" />
    <SupportHelper dept="men" />
    <WelcomePopup dept="men" />
  </div>;
}
