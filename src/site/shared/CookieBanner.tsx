import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';

const KEY = 'davinova-consent';
type Win = Window & { __dvNeedsConsent?: boolean; __dvLoadAnalytics?: () => void };

function stored(): string | null { try { return localStorage.getItem(KEY); } catch { return null; } }

/** Opens the cookie choice again (footer "Cookie settings" link). */
export function openCookieSettings() { window.dispatchEvent(new Event('davinova:cookies')); }

/**
 * Cookie choice for visitors in Europe (EEA, UK, Switzerland): Google Analytics and Tag Manager load only after
 * "Accept". "Refuse" is just as easy, as CNIL asks. Everyone else can change their choice from the footer link.
 */
export function CookieBanner({ dept }: { dept: 'women' | 'men' }) {
  const [open, setOpen] = useState(() => Boolean((window as Win).__dvNeedsConsent) && !stored());
  useEffect(() => {
    const reopen = () => setOpen(true);
    window.addEventListener('davinova:cookies', reopen);
    return () => window.removeEventListener('davinova:cookies', reopen);
  }, []);

  function choose(value: 'granted' | 'denied') {
    const before = stored();
    try { localStorage.setItem(KEY, value); } catch { /* private mode */ }
    setOpen(false);
    if (value === 'granted') (window as Win).__dvLoadAnalytics?.();
    // Analytics already running can only be stopped by a fresh page load.
    else if (before === 'granted' || (!before && !(window as Win).__dvNeedsConsent)) window.location.reload();
  }

  if (!open) return null;
  const base = dept === 'men' ? '/men' : '';
  return createPortal(<div className={`cookies cookies--${dept}`} role="dialog" aria-label="Cookie choice">
    <p><b>Cookies.</b> We'd like to use analytics cookies (Google Analytics) to see how the shop is used and make it better. They're off unless you accept. <Link to={`${base}/privacy`}>Learn more</Link></p>
    <div className="cookies__actions">
      <button type="button" onClick={() => choose('denied')}>Refuse</button>
      <button type="button" onClick={() => choose('granted')}>Accept</button>
    </div>
  </div>, document.body);
}
