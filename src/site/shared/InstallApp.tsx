import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Download, Share, SquarePlus, X } from 'lucide-react';
import { canInstall, onInstallChange, promptInstall } from '../../lib/installApp';

const DISMISS_KEY = 'davinova-app-offer';
const dismissed = () => { try { return localStorage.getItem(DISMISS_KEY) === '1'; } catch { return true; } };
const markDismissed = () => { try { localStorage.setItem(DISMISS_KEY, '1'); } catch { /* private mode */ } };

function useInstallable() {
  const [ok, setOk] = useState(canInstall);
  useEffect(() => onInstallChange(() => setOk(canInstall())), []);
  return ok;
}

/** iPhone has no install button: show the two taps instead. */
export function InstallSteps({ dept, onClose }: { dept: 'women' | 'men'; onClose: () => void }) {
  return <div className={`app-offer app-offer--sheet app-offer--${dept}`} role="dialog" aria-label="Add Davinova to your home screen">
    <button type="button" className="app-offer__x" aria-label="Close" onClick={onClose}><X size={16} /></button>
    <img src="/icon-192.png" alt="" width="48" height="48" />
    <strong>Add Davinova to your home screen</strong>
    <ol>
      <li>Tap <Share size={15} aria-label="Share" /> in Safari's bar</li>
      <li>Choose <SquarePlus size={15} aria-hidden="true" /> <b>Add to Home Screen</b></li>
    </ol>
  </div>;
}

/** Drawer / footer link: "Get the app". Hidden once installed or where the browser can't install. */
export function InstallLink({ dept, className }: { dept: 'women' | 'men'; className?: string }) {
  const ok = useInstallable();
  const [ios, setIos] = useState(false);
  if (!ok && !ios) return null;
  return <>
    <button type="button" className={className} onClick={async () => { if ((await promptInstall()) === 'ios') setIos(true); }}>Get the app</button>
    {ios && <InstallSteps dept={dept} onClose={() => setIos(false)} />}
  </>;
}

/** One-time glass card on phones offering the app, after the visitor has browsed a little. */
export function InstallApp({ dept }: { dept: 'women' | 'men' }) {
  const { pathname } = useLocation();
  const ok = useInstallable();
  const [open, setOpen] = useState(false);
  const [ios, setIos] = useState(false);
  const quiet = /\/(cart|bag|checkout|order-confirmation|account|admin|approve-cj)/.test(pathname);

  useEffect(() => {
    if (!ok || quiet) return;
    if (new URLSearchParams(window.location.search).get('get') === 'app') { setOpen(true); return; }
    if (dismissed() || !window.matchMedia('(max-width: 700px)').matches) return;
    let scrolled = false;
    let timer = 0;
    const show = () => {
      if (!scrolled || document.querySelector('.helper__panel, .welcome__card')) { timer = window.setTimeout(show, 20000); return; }
      setOpen(true);
    };
    const onScroll = () => { if (window.scrollY > 600) scrolled = true; };
    timer = window.setTimeout(show, 45000);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { window.clearTimeout(timer); window.removeEventListener('scroll', onScroll); };
  }, [ok, quiet]);

  const close = () => { setOpen(false); setIos(false); markDismissed(); };
  if (ios) return <InstallSteps dept={dept} onClose={close} />;
  if (!open || !ok) return null;
  return <div className={`app-offer app-offer--${dept}`} role="dialog" aria-label="Get the Davinova app">
    <img src="/icon-192.png" alt="" width="44" height="44" />
    <div><strong>Davinova app</strong><span>Faster shopping, one tap from your home screen.</span></div>
    <button type="button" className="app-offer__go" onClick={async () => {
      const result = await promptInstall();
      if (result === 'ios') { setOpen(false); setIos(true); } else close();
    }}><Download size={15} /> Install</button>
    <button type="button" className="app-offer__x" aria-label="Not now" onClick={close}><X size={16} /></button>
  </div>;
}
