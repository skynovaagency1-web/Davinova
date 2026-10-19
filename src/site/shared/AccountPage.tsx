import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Heart, LogOut, Package, Ruler, UserRound } from 'lucide-react';
import { useAccount, type Account } from '../../store/account';
import { useWishlist } from '../../store/wishlist';

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
function SignIn() {
  const signedIn = useAccount((state) => state.signedIn);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');

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
  return <form className="acct__card" onSubmit={submit}>
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

function Orders({ account, dept }: { account: Account; dept: Dept }) {
  return <section className="acct__card">
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

  return <section className={`jw jw--${dept} help acct`}>
    <header className="jw__head">
      <span className="jw__kicker">Davinova · Account</span>
      <h1>{account ? `Hello${account.name ? ', ' + account.name.split(' ')[0] : ''}` : 'Your account'}</h1>
      <p>{account ? `Signed in as ${account.email}.` : 'Sign in with your email to see your orders, keep your wishlist on every device and save your details.'}</p>
    </header>
    {!ready && <p className="acct__note">Loading…</p>}
    {ready && !account && <SignIn />}
    {account && <div className="acct__grid">
      <Orders account={account} dept={dept} />
      <section className="acct__card">
        <h2><Heart size={18} /> Your wishlist</h2>
        <p className="acct__note">{wished ? `${wished} saved ${wished === 1 ? 'piece' : 'pieces'}, synced to your account on every device.` : 'Tap the heart on any product to save it here, on every device.'}</p>
        <Link to={`${base(dept)}/wishlist`} className="acct__btn">Open wishlist</Link>
      </section>
      <Details account={account} />
      <Sizes account={account} dept={dept} />
      <button type="button" className="acct__btn acct__btn--ghost" onClick={() => void signOut()}><LogOut size={16} /> Sign out</button>
    </div>}
  </section>;
}
