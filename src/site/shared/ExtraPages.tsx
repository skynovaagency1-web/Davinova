import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Copy, Gift, Heart, Share2, Check } from 'lucide-react';
import { useCatalogProducts } from '../../lib/useCatalogProducts';
import { useWishlist } from '../../store/wishlist';
import { WomenCard } from '../women/WomenCard';
import { jewelryPath, type Dept } from './jewelry';
import { categoryPath } from '../../lib/categories';
import { WOMEN_BAGS } from '../../lib/storeCollectionTaxonomy';
import { formatMoney } from '../../lib/format';
import { GIFT_AMOUNTS_CENTS, REFERRAL } from '../../lib/giftCards';

const base = (dept: Dept) => (dept === 'men' ? '/men' : '');

/** Saved products for this browser; both shops share one list but each page shows its own department first. */
export function WishlistPage({ dept }: { dept: Dept }) {
  const ids = useWishlist((state) => state.ids);
  const clear = useWishlist((state) => state.clear);
  const { products, loading } = useCatalogProducts();
  const saved = ids.map((id) => products.find((product) => product.id === id)).filter((product) => product !== undefined);
  const mine = saved.filter((product) => product.department === dept);
  const other = saved.filter((product) => product.department !== dept);
  const grid = dept === 'men' ? 'm-grid m-grid--glass' : 'w-grid';
  return <section className={`jw jw--${dept} extra`}>
    <header className="jw__head">
      <span className="jw__kicker">Davinova · Wishlist</span>
      <h1>Your wishlist</h1>
      <p>{saved.length ? `${saved.length} saved ${saved.length === 1 ? 'piece' : 'pieces'}. Tap the heart on any product to add or remove it.` : 'Tap the heart on any product to save it here for later.'}</p>
    </header>
    {loading && !saved.length && <p className="extra__note">Loading your saved pieces…</p>}
    {!loading && !saved.length && <div className="jw__empty"><Heart size={28} /><span>Nothing saved yet. Sign in to your account to keep your wishlist on every device.</span><Link to={`${base(dept)}/shop`}>Start browsing →</Link></div>}
    {mine.length > 0 && <div className={grid}>{mine.map((product, index) => <WomenCard key={product.id} product={product} index={index} />)}</div>}
    {other.length > 0 && <>
      <h2 className="extra__sub">From the {dept === 'men' ? "women's" : "men's"} shop</h2>
      <div className={grid}>{other.map((product, index) => <WomenCard key={product.id} product={product} index={index} />)}</div>
    </>}
    {saved.length > 0 && <button type="button" className="extra__clear" onClick={clear}>Clear wishlist</button>}
  </section>;
}

/** Digital gift cards: pick an amount, write who it's for, pay with Stripe; the code is emailed once payment clears. */
export function GiftCardPage({ dept }: { dept: Dept }) {
  const [params] = useSearchParams();
  const [amount, setAmount] = useState<number>(10000);
  const [form, setForm] = useState({ recipientName: '', recipientEmail: '', senderName: '', message: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [check, setCheck] = useState('');
  const [balance, setBalance] = useState('');
  const field = (key: keyof typeof form) => ({ value: form[key], onChange: (event: { target: { value: string } }) => setForm({ ...form, [key]: event.target.value }) });
  const ideas: [string, string][] = dept === 'men'
    ? [['Men\'s watches', jewelryPath('men', 'mens-watches')], ['Cufflinks & tie clips', jewelryPath('men', 'cufflinks')], ['Ties & bow ties', '/men/shop?cat=ties-and-bow-ties']]
    : [['Watches', '/watches'], ['Bridal jewelry', jewelryPath('women', 'bridal-sets')], ['Bags', categoryPath(WOMEN_BAGS)]];
  const buy = async () => {
    if (busy) return;
    setBusy(true); setError('');
    const response = await fetch('/api/gift-cards/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amountCents: amount, dept, ...form }) }).catch(() => null);
    const data = await response?.json().catch(() => ({})) as { url?: string; error?: string } | undefined;
    if (response?.ok && data?.url?.startsWith('https://checkout.stripe.com/')) { window.location.assign(data.url); return; }
    setError(data?.error || 'Secure checkout could not be created. No payment was taken.');
    setBusy(false);
  };
  const checkBalance = async () => {
    setBalance('');
    const response = await fetch(`/api/gift-cards/balance?code=${encodeURIComponent(check.trim())}`).catch(() => null);
    const data = await response?.json().catch(() => ({})) as { gift?: { balanceCents: number }; error?: string } | undefined;
    setBalance(data?.gift ? `Balance: ${formatMoney(data.gift.balanceCents, 'USD')}` : (data?.error || 'That gift card is not valid.'));
  };
  return <section className={`jw jw--${dept} extra`}>
    <header className="jw__head">
      <span className="jw__kicker">Davinova · Gift cards</span>
      <h1>Give the moment</h1>
      <p>A digital Davinova gift card, sent by email with your message. Good on anything in both shops and it never expires.</p>
    </header>
    {params.get('bought') && <p className="bag__notice" role="status">Thank you! The gift card is on its way by email. It can take a minute to arrive.</p>}
    {params.get('checkout') === 'cancelled' && <p className="bag__notice" role="status">Checkout was cancelled. No payment was taken.</p>}
    <div className="gift">
      <div className={`gift__card gift__card--${dept}`} aria-label={`Gift card preview, ${formatMoney(amount, 'USD')}`}>
        <span className="gift__brand">DAVINOVA</span>
        <span className="gift__amount">${amount / 100}</span>
        <span className="gift__line">{form.recipientName.trim() ? `For ${form.recipientName.trim()}` : 'Gift card · for the moments you\'ll keep'}</span>
      </div>
      <div className="gift__pick help__body">
        <h2>Choose an amount</h2>
        <div className="gift__amounts" role="radiogroup" aria-label="Gift card amount">
          {GIFT_AMOUNTS_CENTS.map((value) => <button key={value} type="button" role="radio" aria-checked={amount === value} className={amount === value ? 'active' : ''} onClick={() => setAmount(value)}>${value / 100}</button>)}
        </div>
        <form className="gift__form" onSubmit={(event) => { event.preventDefault(); void buy(); }}>
          <label>Their name<input {...field('recipientName')} maxLength={60} placeholder="Optional" /></label>
          <label>Their email<input {...field('recipientEmail')} type="email" maxLength={120} placeholder="Leave empty to get it yourself" /></label>
          <label>From<input {...field('senderName')} maxLength={60} placeholder="Your name" /></label>
          <label className="gift__wide">Message<textarea {...field('message')} maxLength={400} rows={3} placeholder="Happy wedding day!" /></label>
          <button type="submit" className="gift__buy" disabled={busy}><Gift size={18} /> {busy ? 'Opening checkout…' : `Buy ${formatMoney(amount, 'USD')} gift card`}</button>
        </form>
        {error && <p className="bag__codeerr" role="alert">{error}</p>}
        <ul>
          <li>Emailed as soon as payment clears, with your message.</li>
          <li>Use it in one order or across several; the balance carries over.</li>
          <li>Works together with bundle savings and discount codes.</li>
        </ul>
        <h2>Check a balance</h2>
        <form className="bag__code" onSubmit={(event) => { event.preventDefault(); void checkBalance(); }}>
          <input value={check} onChange={(event) => setCheck(event.target.value.toUpperCase())} placeholder="DVG-XXXX-XXXX" aria-label="Gift card code" maxLength={32} />
          <button type="submit">Check</button>
        </form>
        {balance && <p className="help__note" role="status">{balance}</p>}
        <h2>Not sure? Gift ideas</h2>
        <div className="gift__ideas">{ideas.map(([label, to]) => <Link key={label} to={to}>{label} →</Link>)}</div>
      </div>
    </div>
  </section>;
}

/** Refer a friend: the customer's personal code is emailed to them, so only the inbox owner can share it. */
export function ReferralPage({ dept }: { dept: Dept }) {
  const [copied, setCopied] = useState(false);
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'busy' | 'sent' | 'error'>('idle');
  const [error, setError] = useState('');
  const link = `https://davinova.com${base(dept) || '/'}`;
  const copy = async () => {
    try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { setCopied(false); }
  };
  const share = async () => {
    if (navigator.share) { try { await navigator.share({ title: 'Davinova', text: 'Occasion dresses and formalwear I think you\'ll love', url: link }); } catch { /* closed */ } }
    else await copy();
  };
  const send = async () => {
    setState('busy'); setError('');
    const response = await fetch('/api/referral', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) }).catch(() => null);
    const data = await response?.json().catch(() => ({})) as { error?: string } | undefined;
    if (response?.ok) { setState('sent'); return; }
    setError(data?.error || 'We couldn\'t send your code right now.'); setState('error');
  };
  const friend = formatMoney(REFERRAL.friendCents, 'USD').replace('.00', '');
  const reward = formatMoney(REFERRAL.rewardCents, 'USD').replace('.00', '');
  const minimum = formatMoney(REFERRAL.minimumCents, 'USD').replace('.00', '');
  return <section className={`jw jw--${dept} extra`}>
    <header className="jw__head">
      <span className="jw__kicker">Davinova · Refer a friend</span>
      <h1>{`Give ${friend}, get ${reward}`}</h1>
      <p>{`Know someone with a wedding, gala or party coming up? Send them your code. They get ${friend} off their first order, and you get a ${reward} gift card when it ships.`}</p>
    </header>
    <div className="refer">
      {[['01', 'Get your code', 'Enter your email below and we send your personal code and link.'],
        ['02', `They save ${friend}`, `Your friend gets ${friend} off a first order of ${minimum} or more.`],
        ['03', `You get ${reward}`, `When their order ships, we email you a ${reward} gift card. No limit on friends.`]].map(([no, title, text]) =>
        <div key={no} className="refer__step help__body"><span className="refer__no">{no}</span><h2>{title}</h2><p>{text}</p></div>)}
    </div>
    <div className="refer__share help__body">
      <h2>Email me my code</h2>
      {state === 'sent'
        ? <p role="status">{`Check your inbox: your code is on its way to ${email}.`}</p>
        : <form className="bag__code" onSubmit={(event) => { event.preventDefault(); void send(); }}>
            <input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@email.com" aria-label="Your email" maxLength={120} />
            <button type="submit" disabled={state === 'busy'}>{state === 'busy' ? 'Sending…' : 'Send'}</button>
          </form>}
      {error && <p className="bag__codeerr" role="alert">{error}</p>}
      <h2>Or just share the shop</h2>
      <code>{link}</code>
      <div className="refer__btns">
        <button type="button" onClick={copy}>{copied ? <><Check size={16} /> Copied</> : <><Copy size={16} /> Copy link</>}</button>
        <button type="button" onClick={share}><Share2 size={16} /> Share</button>
      </div>
      <p className="help__note">Credit can't be exchanged for cash. Your own code doesn't earn a reward.</p>
    </div>
  </section>;
}
