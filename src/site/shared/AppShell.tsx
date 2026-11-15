import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShoppingBag, Store, UserRound } from 'lucide-react';
import { useCart } from '../../store/cart';
import { isAppMode } from '../../lib/installApp';
import { Logo } from './Logo';

const FILM_KEY = 'davinova-app-film';

/** Opening film: the logo draws itself on the espresso wall, once per app launch. Tap to skip. */
function OpeningFilm({ dept }: { dept: 'women' | 'men' }) {
  const [phase, setPhase] = useState<'on' | 'out' | 'gone'>(() => { try { return sessionStorage.getItem(FILM_KEY) ? 'gone' : 'on'; } catch { return 'gone'; } });
  useEffect(() => {
    if (phase !== 'on') return;
    try { sessionStorage.setItem(FILM_KEY, '1'); } catch { /* private mode */ }
    const out = window.setTimeout(() => setPhase('out'), 2600);
    return () => window.clearTimeout(out);
  }, [phase]);
  useEffect(() => {
    if (phase !== 'out') return;
    const gone = window.setTimeout(() => setPhase('gone'), 600);
    return () => window.clearTimeout(gone);
  }, [phase]);
  if (phase === 'gone') return null;
  return <div className={`app-film app-film--${dept}${phase === 'out' ? ' is-out' : ''}`} role="presentation" onClick={() => setPhase('out')}>
    <span className="app-film__halo" aria-hidden="true" />
    <div className="app-film__logo"><Logo tone={dept === 'men' ? 'metal' : 'brand'} sub={dept === 'men' ? 'HOMME' : undefined} /></div>
    <span className="app-film__line" aria-hidden="true" />
    <small>Tap to skip</small>
  </div>;
}

/** The app's floating glass bottom bar: Shop · big Bag · Account. Only in the installed app. */
export function AppShell({ dept }: { dept: 'women' | 'men' }) {
  const { pathname } = useLocation();
  const count = useCart((state) => state.items.reduce((sum, item) => sum + item.quantity, 0));
  const [app] = useState(isAppMode);
  if (!app) return null;
  const base = dept === 'men' ? '/men' : '';
  const shop = base || '/';
  const bag = `${base}/bag`;
  const account = `${base}/account`;
  const on = (to: string) => to === shop ? pathname === shop : pathname.startsWith(to);
  return <>
    <OpeningFilm dept={dept} />
    <nav className={`rudder rudder--${dept}`} aria-label="App">
      <Link to={shop} className={`rudder__tab${on(shop) ? ' is-on' : ''}`}><i><Store size={20} /></i><span>Shop</span></Link>
      <Link to={bag} className={`rudder__bag${on(bag) ? ' is-on' : ''}`} aria-label={`Bag, ${count} items`}>
        <ShoppingBag size={26} />{count > 0 && <b>{count}</b>}
      </Link>
      <Link to={account} className={`rudder__tab${on(account) ? ' is-on' : ''}`}><i><UserRound size={20} /></i><span>Account</span></Link>
    </nav>
  </>;
}
