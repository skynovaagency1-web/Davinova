import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { CircleHelp, ClipboardList, Headphones, Heart, History, LogOut, MapPin, Package, PackageCheck, Receipt, Ruler, Share2, Truck, Undo2, UserRound, UserRoundCheck } from 'lucide-react';
import { useAccount, type Account } from '../../store/account';
import { useWishlist } from '../../store/wishlist';
import { ClubDashboard, ClubMenu } from './ClubPages';

type Dept = 'women' | 'men';
const base = (dept: Dept) => (dept === 'men' ? '/men' : '');

function money(cents: number, currency: string) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'USD' }).format(cents / 100);
}
function date(value: string) {
  return new Date(value.replace(' ', 'T') + 'Z').toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

async function post(path: string, body: unknown) {
  const response = await fetch(path, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(body) });
  const data = await response.json().catch(() => ({})) as { account?: Account; error?: string; message?: string };
  if (!response.ok) throw new Error(data.error || 'Something went wrong. Please try again.');
  return data;
}

/** Email, then a 6-digit code: no password to remember. */
export function SignIn() {
  const signedIn = useAccount((state) => state.signedIn);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [google, setGoogle] = useState(false);
  useEffect(() => { void fetch('/api/account/google?check=1').then((response) => response.json()).then((data: { enabled?: boolean }) => setGoogle(Boolean(data.enabled))).catch(() => undefined); }, []);
  const dept = typeof window !== 'undefined' && window.location.pathname.startsWith('/men') ? 'men' : 'women';

  async function sendCode(event?: FormEvent) {
    event?.preventDefault();
    setBusy(true); setError(''); setNote('');
    try {
      const data = await post('/api/account/code', { email });
      setStep('code');
      setNote(data.message || `We sent a 6-digit code to ${email}. It works for 10 minutes.`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'We could not send the code.'); }
    finally { setBusy(false); }
  }
  async function verify(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setError('');
    try {
      const data = await post('/api/account/verify', { email, code });
      if (data.account) signedIn(data.account);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'That code did not work.'); }
    finally { setBusy(false); }
  }

  return <div className="acct__card acct__signin">
    {google && step === 'email' && <>
      <a className="acct__google" href={`/api/account/google?dept=${dept}`}><svg viewBox="0 0 48 48" width="20" height="20" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>Continue with Google</a>
      <p className="acct__or"><span>or with your email</span></p>
    </>}
    {step === 'email'
      ? <form className="track__form" onSubmit={sendCode}>
        <label><span>Your email</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" autoComplete="email" required maxLength={200} /></label>
        <button type="submit" disabled={busy}>{busy ? 'Sending…' : 'Email me a code'}</button>
      </form>
      : <form className="track__form" onSubmit={verify}>
        <label><span>6-digit code</span><input value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" placeholder="123456" required autoFocus /></label>
        <button type="submit" disabled={busy || code.length !== 6}>{busy ? 'Checking…' : 'Sign in'}</button>
      </form>}
    {note && <p className="acct__note">{note}</p>}
    {error && <p className="track__error" role="alert">{error}</p>}
    {step === 'code' && <p className="acct__note"><button type="button" className="acct__link" onClick={() => void sendCode()} disabled={busy}>Send a new code</button> · <button type="button" className="acct__link" onClick={() => { setStep('email'); setCode(''); setNote(''); }}>Use another email</button></p>}
    <p className="acct__note">New here? The same step creates your account. Orders you already placed with this email show up automatically.</p>
  </div>;
}

function Details({ account }: { account: Account }) {
  const save = useAccount((state) => state.save);
  const [name, setName] = useState(account.name);
  const [address, setAddress] = useState(account.address);
  const [state, setState] = useState('');
  const field = (key: string, label: string, auto: string) =>
    <label><span>{label}</span><input value={address[key] ?? ''} onChange={(event) => setAddress({ ...address, [key]: event.target.value })} autoComplete={auto} maxLength={120} /></label>;
  async function submit(event: FormEvent) {
    event.preventDefault(); setState('Saving…');
    try { await save({ name, address }); setState('Saved'); } catch (reason) { setState(reason instanceof Error ? reason.message : 'Not saved'); }
  }
  return <form className="acct__card" id="acct-details" onSubmit={submit}>
    <h2><UserRound size={18} /> Your details</h2>
    <div className="track__form acct__fields">
      <label><span>Full name</span><input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" maxLength={100} /></label>
      {field('phone', 'Phone', 'tel')}
      {field('line1', 'Address', 'address-line1')}
      {field('line2', 'Apartment, suite (optional)', 'address-line2')}
      {field('city', 'City', 'address-level2')}
      {field('state', 'State / region', 'address-level1')}
      {field('postalCode', 'Postcode', 'postal-code')}
      {field('country', 'Country', 'country-name')}
    </div>
    <div className="acct__actions"><button type="submit" className="acct__btn">Save details</button>{state && <span className="acct__note">{state}</span>}</div>
  </form>;
}

function Sizes({ account, dept }: { account: Account; dept: Dept }) {
  const save = useAccount((state) => state.save);
  const [sizes, setSizes] = useState(account.sizes);
  const [state, setState] = useState('');
  const fields: [string, string][] = dept === 'men'
    ? [['suit', 'Suit / jacket'], ['shirt', 'Shirt'], ['bottom', 'Trousers'], ['shoe', 'Shoe'], ['ring', 'Ring']]
    : [['dress', 'Dress'], ['top', 'Top'], ['bottom', 'Bottoms'], ['shoe', 'Shoe'], ['ring', 'Ring']];
  async function submit(event: FormEvent) {
    event.preventDefault(); setState('Saving…');
    try { await save({ sizes }); setState('Saved'); } catch (reason) { setState(reason instanceof Error ? reason.message : 'Not saved'); }
  }
  return <form className="acct__card" onSubmit={submit}>
    <h2><Ruler size={18} /> Your sizes</h2>
    <p className="acct__note">Keep your sizes here so you never have to guess. Not sure? See the <Link to={`${base(dept)}/size-guide`}>size guide</Link>.</p>
    <div className="track__form acct__fields">
      {fields.map(([key, label]) => <label key={key}><span>{label}</span><input value={sizes[key] ?? ''} onChange={(event) => setSizes({ ...sizes, [key]: event.target.value })} placeholder="e.g. M or 38" maxLength={20} /></label>)}
    </div>
    <div className="acct__actions"><button type="submit" className="acct__btn">Save sizes</button>{state && <span className="acct__note">{state}</span>}</div>
  </form>;
}

const STEPS = ['Order received', 'Being prepared', 'On its way', 'Delivered'];

function QuickRow({ dept, wished }: { dept: Dept; wished: number }) {
  return <nav className="acct__card acct__quick" aria-label="Shortcuts">
    <Link to={`${base(dept)}/wishlist`}><Heart size={22} /><span>Wishlist{wished ? ` (${wished})` : ''}</span></Link>
    <Link to={`${base(dept)}/account/earnings`}><History size={22} /><span>History</span></Link>
    <Link to={`${base(dept)}/account/invite`}><Share2 size={22} /><span>Share &amp; earn</span></Link>
  </nav>;
}

/** Order counts by stage, like a parcel tracker at a glance. */
function OrderStatus({ account }: { account: Account }) {
  const count = (test: (step: number, label: string) => boolean) => account.orders.filter((order) => test(order.step, order.label)).length;
  const stages = [
    { label: 'Received', icon: ClipboardList, n: count((step) => step === 1) },
    { label: 'Preparing', icon: Package, n: count((step) => step === 2) },
    { label: 'On its way', icon: Truck, n: count((step) => step === 3) },
    { label: 'Delivered', icon: PackageCheck, n: count((step) => step >= 4) },
    { label: 'Returns', icon: Undo2, n: count((step, label) => step < 0 || /refund|return|cancel/i.test(label)) },
  ];
  return <section className="acct__card">
    <header className="acct__cardhead"><h2>My orders</h2><a href="#acct-orders">All orders ›</a></header>
    <div className="acct__stages">{stages.map(({ label, icon: Icon, n }) => <a key={label} href="#acct-orders"><i><Icon size={22} />{n > 0 && <b>{n}</b>}</i><span>{label}</span></a>)}</div>
  </section>;
}

function More({ dept, onSignOut }: { dept: Dept; onSignOut: () => void }) {
  const items = [
    { to: '#acct-details', label: 'Addresses', icon: MapPin },
    { to: `${base(dept)}/account/earnings`, label: 'Transaction records', icon: Receipt },
    { to: '#acct-connected', label: 'Connected accounts', icon: UserRoundCheck },
    { to: `${base(dept)}/faq`, label: 'Help', icon: CircleHelp },
    { to: `${base(dept)}/contact`, label: 'Contact', icon: Headphones },
  ];
  return <section className="acct__card">
    <h2>More</h2>
    <div className="acct__more">
      {items.map(({ to, label, icon: Icon }) => to.startsWith('#')
        ? <a key={label} href={to}><Icon size={22} /><span>{label}</span></a>
        : <Link key={label} to={to}><Icon size={22} /><span>{label}</span></Link>)}
      <button type="button" onClick={onSignOut}><LogOut size={22} /><span>Log out</span></button>
    </div>
  </section>;
}

function Connected({ account, dept }: { account: Account; dept: Dept }) {
  const [google, setGoogle] = useState(false);
  useEffect(() => { void fetch('/api/account/google?check=1').then((response) => response.json()).then((data: { enabled?: boolean }) => setGoogle(Boolean(data.enabled))).catch(() => undefined); }, []);
  return <section className="acct__card" id="acct-connected">
    <h2><UserRoundCheck size={18} /> Connected accounts</h2>
    <p className="acct__note">Sign in with your email code{google ? ' or with Google' : ''}. Google works for {account.email} when that is your Google address.</p>
    {google && <a className="acct__google" href={`/api/account/google?dept=${dept}`}>Continue with Google</a>}
  </section>;
}

function Orders({ account, dept }: { account: Account; dept: Dept }) {
  return <section className="acct__card" id="acct-orders">
    <h2><Package size={18} /> Your orders</h2>
    {!account.orders.length && <p className="acct__note">No orders yet. When you order with {account.email}, it shows up here with its tracking.</p>}
    {account.orders.map((order) => <article key={order.orderNumber} className="acct__order">
      <header><strong>{order.orderNumber}</strong><span>{date(order.placedAt)} · {money(order.totalCents, order.currency)}</span></header>
      <p className="help__big">{order.label}</p>
      {order.step >= 0 && <ol className="track__steps">{STEPS.map((step, index) => <li key={step} className={index + 1 <= order.step ? 'done' : ''}>{step}</li>)}</ol>}
      <ul>{order.items.map((item, index) => <li key={index}>{item.quantity} × {item.title}{[item.color, item.size].filter(Boolean).length ? ` (${[item.color, item.size].filter(Boolean).join(', ')})` : ''}</li>)}</ul>
      {order.trackingNumber && <p>Tracking: <b>{order.trackingNumber}</b>{order.trackingUrl && <> · <a href={order.trackingUrl} target="_blank" rel="noreferrer">Follow your parcel</a></>}</p>}
    </article>)}
    {account.orders.length > 0 && <p className="acct__note">Questions about an order? <Link to={`${base(dept)}/contact`}>Contact us</Link> with its number.</p>}
  </section>;
}

/** My account: orders, wishlist, details and sizes. */
export function AccountPage({ dept }: { dept: Dept }) {
  const { account, ready, load, signOut } = useAccount();
  const wished = useWishlist((state) => state.ids.length);
  useEffect(() => { if (!ready) void load(); }, [ready, load]);

  return <section className={`jw jw--${dept} help acct club`}>
    <header className="jw__head club__head">
      <div>
        <span className="jw__kicker">Davinova · Account</span>
        <h1>{account ? `Hello${account.name ? ', ' + account.name.split(' ')[0] : ''}` : 'Your account'}</h1>
        <p>{account ? `Signed in as ${account.email}.` : 'Sign in with your email to see your orders, balance and rewards, keep your wishlist on every device and save your details.'}</p>
      </div>
      {account && <ClubMenu dept={dept} />}
    </header>
    {!ready && <p className="acct__note">Loading…</p>}
    {ready && !account && <SignIn />}
    {account && <div className="acct__grid">
      <ClubDashboard dept={dept} />
      <QuickRow dept={dept} wished={wished} />
      <OrderStatus account={account} />
      <Orders account={account} dept={dept} />
      <section className="acct__card">
        <h2><Heart size={18} /> Your wishlist</h2>
        <p className="acct__note">{wished ? `${wished} saved ${wished === 1 ? 'piece' : 'pieces'}, synced to your account on every device.` : 'Tap the heart on any product to save it here, on every device.'}</p>
        <Link to={`${base(dept)}/wishlist`} className="acct__btn">Open wishlist</Link>
      </section>
      <Details account={account} />
      <Connected account={account} dept={dept} />
      <Sizes account={account} dept={dept} />
      <More dept={dept} onSignOut={() => void signOut()} />
    </div>}
  </section>;
}
