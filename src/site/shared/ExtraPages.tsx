import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Copy, Gift, Heart, Share2, Check } from 'lucide-react';
import { useCatalogProducts } from '../../lib/useCatalogProducts';
import { useWishlist } from '../../store/wishlist';
import { WomenCard } from '../women/WomenCard';
import { jewelryPath, type Dept } from './jewelry';
import { categoryPath } from '../../lib/categories';
import { WOMEN_BAGS } from '../../lib/storeCollectionTaxonomy';

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
    {!loading && !saved.length && <div className="jw__empty"><Heart size={28} /><span>Nothing saved yet. Your wishlist stays on this device, no account needed.</span><Link to={`${base(dept)}/shop`}>Start browsing →</Link></div>}
    {mine.length > 0 && <div className={grid}>{mine.map((product, index) => <WomenCard key={product.id} product={product} index={index} />)}</div>}
    {other.length > 0 && <>
      <h2 className="extra__sub">From the {dept === 'men' ? "women's" : "men's"} shop</h2>
      <div className={grid}>{other.map((product, index) => <WomenCard key={product.id} product={product} index={index} />)}</div>
    </>}
    {saved.length > 0 && <button type="button" className="extra__clear" onClick={clear}>Clear wishlist</button>}
  </section>;
}

const AMOUNTS = [25, 50, 100, 200];

/** Digital gift cards: pick an amount and see the card; buying opens with checkout. */
export function GiftCardPage({ dept }: { dept: Dept }) {
  const [amount, setAmount] = useState(100);
  const ideas: [string, string][] = dept === 'men'
    ? [['Men\'s watches', jewelryPath('men', 'mens-watches')], ['Cufflinks & tie clips', jewelryPath('men', 'cufflinks')], ['Ties & bow ties', '/men/shop?cat=ties-and-bow-ties']]
    : [['Watches', '/watches'], ['Bridal jewelry', jewelryPath('women', 'bridal-sets')], ['Bags', categoryPath(WOMEN_BAGS)]];
  return <section className={`jw jw--${dept} extra`}>
    <header className="jw__head">
      <span className="jw__kicker">Davinova · Gift cards</span>
      <h1>Give the moment</h1>
      <p>A digital Davinova gift card, sent by email with your message. Good on anything in both shops and it never expires.</p>
    </header>
    <div className="gift">
      <div className={`gift__card gift__card--${dept}`} aria-label={`Gift card preview, $${amount}`}>
        <span className="gift__brand">DAVINOVA</span>
        <span className="gift__amount">${amount}</span>
        <span className="gift__line">Gift card · for the moments you'll keep</span>
      </div>
      <div className="gift__pick help__body">
        <h2>Choose an amount</h2>
        <div className="gift__amounts" role="radiogroup" aria-label="Gift card amount">
          {AMOUNTS.map((value) => <button key={value} type="button" role="radio" aria-checked={amount === value} className={amount === value ? 'active' : ''} onClick={() => setAmount(value)}>${value}</button>)}
        </div>
        <ul>
          <li>Delivered instantly by email, or on the date you choose.</li>
          <li>Add a personal message for the wedding, birthday or anniversary.</li>
          <li>Use it in one order or across several; the balance carries over.</li>
        </ul>
        <button type="button" className="gift__buy" disabled><Gift size={18} /> Gift cards open with checkout</button>
        <p className="help__note">Checkout is opening soon. Questions? Write to <a href="mailto:contact@davinova.com">contact@davinova.com</a>.</p>
        <h2>Not sure? Gift ideas</h2>
        <div className="gift__ideas">{ideas.map(([label, to]) => <Link key={label} to={to}>{label} →</Link>)}</div>
      </div>
    </div>
  </section>;
}

/** Refer a friend: how the reward works and an easy way to share the shop. */
export function ReferralPage({ dept }: { dept: Dept }) {
  const [copied, setCopied] = useState(false);
  const link = `https://davinova.com${base(dept) || '/'}`;
  const copy = async () => {
    try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { setCopied(false); }
  };
  const share = async () => {
    if (navigator.share) { try { await navigator.share({ title: 'Davinova', text: 'Occasion dresses and formalwear I think you\'ll love', url: link }); } catch { /* closed */ } }
    else await copy();
  };
  return <section className={`jw jw--${dept} extra`}>
    <header className="jw__head">
      <span className="jw__kicker">Davinova · Refer a friend</span>
      <h1>Give $15, get $15</h1>
      <p>Know someone with a wedding, gala or party coming up? Send them to Davinova. They get $15 off their first order, and you get $15 when it ships.</p>
    </header>
    <div className="refer">
      {[['01', 'Share your link', 'After your first order you get a personal link by email. Until then, share the shop below.'],
        ['02', 'They save $15', 'Your friend gets $15 off a first order of $60 or more.'],
        ['03', 'You get $15', 'When their order ships, $15 lands in your Davinova credit. No limit on friends.']].map(([no, title, text]) =>
        <div key={no} className="refer__step help__body"><span className="refer__no">{no}</span><h2>{title}</h2><p>{text}</p></div>)}
    </div>
    <div className="refer__share help__body">
      <code>{link}</code>
      <div className="refer__btns">
        <button type="button" onClick={copy}>{copied ? <><Check size={16} /> Copied</> : <><Copy size={16} /> Copy link</>}</button>
        <button type="button" onClick={share}><Share2 size={16} /> Share</button>
      </div>
      <p className="help__note">Rewards start once checkout opens. Credit can't be exchanged for cash.</p>
    </div>
  </section>;
}
