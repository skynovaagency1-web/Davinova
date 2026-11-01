import { useEffect, useState, type FormEvent } from 'react';
import { useLocation } from 'react-router-dom';
import { X, Copy, Check } from 'lucide-react';

export const WELCOME_CODE = 'WELCOME10';
const SEEN_KEY = 'davinova-welcome-seen';

function seen() { try { return localStorage.getItem(SEEN_KEY) === '1'; } catch { return true; } }
function markSeen() { try { localStorage.setItem(SEEN_KEY, '1'); } catch { /* private mode */ } }

/** Once per visitor: after a while on the site, or when the mouse heads for the tab bar, offer 10% off for joining the list. */
export function WelcomePopup({ dept }: { dept: 'women' | 'men' }) {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'busy' | 'done'>('idle');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const quiet = /\/(cart|bag|checkout|order-confirmation|account|admin)/.test(pathname);

  useEffect(() => {
    if (quiet || seen()) return;
    // One popup at a time: wait while the Nova chat is open, and on phones only after the visitor has scrolled.
    let scrolled = !window.matchMedia('(max-width: 700px)').matches;
    let timer = 0;
    const show = () => {
      if (seen()) return;
      if (!scrolled || document.querySelector('.helper__panel')) { timer = window.setTimeout(show, 15000); return; }
      setOpen(true); markSeen();
      window.dispatchEvent(new Event('davinova:popup'));
    };
    timer = window.setTimeout(show, 30000);
    const onScroll = () => { if (window.scrollY > 400) scrolled = true; };
    const leave = (event: MouseEvent) => { if (event.clientY <= 0) show(); };
    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('mouseout', leave);
    return () => { window.clearTimeout(timer); window.removeEventListener('scroll', onScroll); document.removeEventListener('mouseout', leave); };
  }, [quiet]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setState('busy'); setError('');
    try {
      const response = await fetch('/api/newsletter', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, dept }) });
      const data = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(data.error || 'Could not sign you up. Please try again.');
      try { sessionStorage.setItem('davinova-code', WELCOME_CODE); } catch { /* private mode */ }
      setState('done');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not sign you up. Please try again.');
      setState('idle');
    }
  }

  function copy() {
    navigator.clipboard?.writeText(WELCOME_CODE).then(() => setCopied(true)).catch(() => setCopied(false));
  }

  if (!open) return null;
  return <div className={`welcome welcome--${dept}`} role="dialog" aria-modal="true" aria-label="Welcome offer" onClick={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
    <div className="welcome__card">
      <button type="button" className="welcome__close" aria-label="Close" onClick={() => setOpen(false)}><X size={18} /></button>
      <span className="welcome__kicker">Welcome to Davinova</span>
      <h2><b>10%</b> off your first order</h2>
      {state === 'done'
        ? <>
          <p>You're on the list. Your code is saved in your bag, or copy it here:</p>
          <button type="button" className="welcome__code" onClick={copy}>{WELCOME_CODE} {copied ? <Check size={16} /> : <Copy size={16} />}</button>
          <button type="button" className="welcome__cta" onClick={() => setOpen(false)}>Start shopping</button>
        </>
        : <>
          <p>Join the list for first looks at new arrivals and private offers.</p>
          <form onSubmit={submit}>
            <input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Your email" aria-label="Your email" autoComplete="email" />
            <button type="submit" className="welcome__cta" disabled={state === 'busy'}>{state === 'busy' ? 'Joining…' : 'Get my 10%'}</button>
          </form>
          {error && <p className="welcome__error" role="alert">{error}</p>}
          <button type="button" className="welcome__skip" onClick={() => setOpen(false)}>No thanks</button>
        </>}
    </div>
  </div>;
}
