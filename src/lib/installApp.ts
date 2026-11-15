/** Davinova as a phone app: registers the service worker and keeps the browser's install offer for our own button. */
type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> };

let deferred: InstallEvent | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((fn) => fn());

export function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

/** Running as the installed app (home screen, Google Play) rather than in a browser tab. */
export function isAppMode() {
  if (isStandalone()) return true;
  try {
    const source = new URLSearchParams(window.location.search).get('source') ?? '';
    if (source.startsWith('app')) sessionStorage.setItem('davinova-app', '1');
    return sessionStorage.getItem('davinova-app') === '1';
  } catch { return false; }
}

export function isIOS() {
  const ua = navigator.userAgent;
  return /iPhone|iPad|iPod/.test(ua) || (ua.includes('Macintosh') && navigator.maxTouchPoints > 1);
}

/** True when tapping our button can install the app (Android/desktop prompt, or iPhone instructions). */
export function canInstall() {
  if (isAppMode()) return false;
  return deferred !== null || isIOS();
}

export function onInstallChange(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn); }; }

/** Shows the browser's install sheet. Returns 'ios' when the visitor must use Share → Add to Home Screen. */
export async function promptInstall(): Promise<'accepted' | 'dismissed' | 'ios' | 'unavailable'> {
  if (deferred) {
    const event = deferred;
    deferred = null; notify();
    await event.prompt();
    const { outcome } = await event.userChoice;
    track(outcome === 'accepted' ? 'app_install' : 'app_install_dismissed');
    return outcome;
  }
  return isIOS() ? 'ios' : 'unavailable';
}

function track(name: string) {
  try { (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag?.('event', name); } catch { /* analytics blocked */ }
}

export function setupApp() {
  window.addEventListener('beforeinstallprompt', (event) => { event.preventDefault(); deferred = event as InstallEvent; notify(); });
  window.addEventListener('appinstalled', () => { deferred = null; notify(); track('app_installed'); });
  if (isAppMode()) { document.documentElement.classList.add('is-app'); track('app_open'); }
  if (import.meta.env.PROD && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => { navigator.serviceWorker.register('/sw.js').catch(() => { /* site still works without it */ }); });
  }
}
