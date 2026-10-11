import { Link, NavLink, Outlet } from 'react-router-dom';
import { ShoppingBag, Search } from 'lucide-react';
import { brand } from '../config/brand';
import { useCart } from '../store/cart';

export function Layout() {
  const count = useCart((state) => state.items.reduce((sum, item) => sum + item.quantity, 0));
  return <div className="site-shell">
    <div className="announcement">A little something special for every celebration <span>✦</span> Complimentary shipping over $150</div>
    <header className="site-header">
      <button className="icon-button search-button" aria-label="Search (coming soon)" title="Search coming soon"><Search size={19} /></button>
      <Link to="/" className="wordmark" aria-label={`${brand.name} home`}>{brand.name}<span>ATELIER</span></Link>
      <nav className="desktop-nav" aria-label="Main navigation"><NavLink to="/shop">Shop all</NavLink><a href="/shop?occasion=wedding-guest">Wedding guest</a><a href="/shop?occasion=evening">Evening</a><a href="/about">Our story</a></nav>
      <Link to="/cart" className="cart-link" aria-label={`Shopping bag, ${count} items`}><ShoppingBag size={20} /><span>Bag ({count})</span></Link>
    </header>
    <main><Outlet /></main>
    <footer className="site-footer"><div><Link to="/" className="wordmark footer-wordmark">{brand.name}<span>ATELIER</span></Link><p>For the moments that stay with you.</p></div><div className="footer-links"><Link to="/shipping">Shipping</Link><Link to="/returns">Returns</Link><Link to="/contact">Contact</Link><Link to="/privacy">Privacy</Link></div><small>© {new Date().getFullYear()} {brand.name}. Thoughtfully dressed.</small></footer>
  </div>;
}
