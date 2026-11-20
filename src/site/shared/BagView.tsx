import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, Gift, Minus, Plus, Tag, X } from 'lucide-react';
import { useCatalogProducts } from '../../lib/useCatalogProducts';
import { formatMoney, formatUsd } from '../../lib/format';
import { EUR_PER_USD, usdToEurCents } from '../../lib/currency';
import { useRegion } from '../../lib/useRegion';
import { quoteTax, EU_VAT_RATES } from '../../../server/tax';
import { isEuDelivery } from '../../lib/euCountries';
import { getWooCommercePageUrl, isWooCommerceConfigured } from '../../lib/woocommerce';
import { productPath } from '../../lib/storefront';
import { useCart } from '../../store/cart';
import { startCheckout } from './checkout';
import { BUNDLE_TIERS, FREE_GIFT, computeOffer, type DiscountCode } from '../../lib/offers';
import { useCutouts } from '../../lib/useCutouts';
import { giftCardUse, isGiftCode, type GiftCardBalance } from '../../lib/giftCards';

const CODE_KEY = 'davinova-code';
const GIFT_KEY = 'davinova-gift';
const COUNTRY_KEY = 'davinova-ship-to';
function saved(key: string) { try { return sessionStorage.getItem(key) ?? ''; } catch { return ''; } }
function remember(key: string, value: string) { try { if (value) sessionStorage.setItem(key, value); else sessionStorage.removeItem(key); } catch { /* private mode */ } }
function countryName(code: string) { try { return new Intl.DisplayNames(['en'], { type: 'region' }).of(code) || code; } catch { return code; } }

/** The bag is shared by both storefronts; the variant only changes its look and the "keep shopping" link. */
export function BagView({ variant }: { variant: 'women' | 'men' }) {
  const { products } = useCatalogProducts();
  const { items, remove, setQuantity } = useCart();
  const [params] = useSearchParams();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const shopPath = variant === 'men' ? '/men/shop' : '/shop';
  const [codeInput, setCodeInput] = useState(() => saved(CODE_KEY));
  const [gift, setGift] = useState<GiftCardBalance | null>(null);
  const [code, setCode] = useState<DiscountCode | null>(null);
  const [codeError, setCodeError] = useState('');
  const cutoutFor = useCutouts();

  const lines = items
    .map((item) => ({ ...item, product: products.find((product) => product.id === item.productId) }))
    .filter((item): item is typeof item & { product: NonNullable<typeof item.product> } => Boolean(item.product && !item.product.browseOnly && item.product.supplierVerified));
  const subtotal = lines.reduce((sum, item) => sum + item.product.priceCents * item.quantity, 0);
  const pieces = lines.reduce((sum, item) => sum + item.quantity, 0);
  const offer = computeOffer(subtotal, pieces, code);
  const region = useRegion();
  const countries = useMemo(() => (region?.countries ?? []).map((value) => ({ code: value, name: countryName(value) })).sort((a, b) => a.name.localeCompare(b.name)), [region]);
  const [picked, setPicked] = useState(() => saved(COUNTRY_KEY));
  const served = (value: string) => countries.some((row) => row.code === value);
  const country = served(picked) ? picked : region && served(region.country) ? region.country : '';
  const toEu = isEuDelivery(country);
  // Gift cards are in US dollars, so they pay for orders delivered outside the EU only.
  const giftCents = gift && country && !toEu ? giftCardUse(gift.balanceCents, subtotal - offer.discountCents) : 0;
  // Same VAT case and amounts as the server will charge (server/tax.ts); shipping is free.
  const quote = country ? quoteTax(country, lines.map((item) => ({ usdCents: item.product.priceCents, quantity: item.quantity })), offer.discountCents + giftCents, 0) : null;
  const eurGross = lines.reduce((sum, item) => sum + usdToEurCents(item.product.priceCents) * item.quantity, 0);
  const eurDiscountGross = Math.round(offer.discountCents * EUR_PER_USD);
  const chargeTotal = quote ? quote.unitCents.reduce((sum, unit, index) => sum + unit * lines[index].quantity, 0) - quote.discountCents : 0;
  const nextTier = [...BUNDLE_TIERS].reverse().find((tier) => pieces < tier.minItems);
  const currency = lines[0]?.product.currency;

  // "Complete the look": shown, priced pieces from the shelves that go with what is in the bag.
  const upsell = useMemo(() => {
    const inBag = new Set(items.map((item) => item.productId));
    const want = variant === 'men' ? ['jewelry-and-watches', 'mens-accessories'] : ['jewelry-and-watches', 'womens-bags', 'womens-shoes'];
    const pool = products.filter((product) => product.department === variant && !inBag.has(product.id) && product.supplierVerified && !product.browseOnly && product.priceCents > 0 && want.includes(product.storeCollection ?? '') && Boolean(cutoutFor(product.id)));
    // A different mix each day, the same all day.
    const day = Math.floor(Date.now() / 86400000);
    return pool.map((product, index) => ({ product, key: (index * 2654435761 + day * 97) % 1000003 })).sort((a, b) => a.key - b.key).slice(0, 4).map(({ product }) => product);
  }, [products, items, variant, cutoutFor]);

  // One box for both: gift cards (DVG-…) are kept alongside a discount code, so both can be used together.
  async function applyCode(value: string) {
    const clean = value.trim();
    setCodeError('');
    if (!clean) { setCode(null); remember(CODE_KEY, ''); return; }
    if (isGiftCode(clean)) {
      const response = await fetch(`/api/gift-cards/balance?code=${encodeURIComponent(clean)}`).catch(() => null);
      const data = await response?.json().catch(() => ({})) as { gift?: GiftCardBalance; error?: string } | undefined;
      if (!response?.ok || !data?.gift) { setCodeError(data?.error || 'That gift card is not valid.'); return; }
      setGift(data.gift);
      remember(GIFT_KEY, data.gift.code);
      setCodeInput(code?.code ?? '');
      return;
    }
    const response = await fetch(`/api/offers?code=${encodeURIComponent(clean)}`).catch(() => null);
    const data = await response?.json().catch(() => ({})) as { code?: DiscountCode; error?: string } | undefined;
    if (!response?.ok || !data?.code) { setCode(null); setCodeError(data?.error || 'That code is not valid.'); return; }
    setCode(data.code);
    remember(CODE_KEY, data.code.code);
  }
  const removeGift = () => { setGift(null); remember(GIFT_KEY, ''); };
  useEffect(() => {
    if (codeInput) void applyCode(codeInput);
    const giftCode = saved(GIFT_KEY);
    if (giftCode) void applyCode(giftCode);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function checkout() {
    if (busy || lines.length === 0) return;
    if (!country) { setError('Choose the country we deliver to.'); return; }
    setBusy(true);
    setError('');
    try {
      await startCheckout(lines, country, offer.source === 'code' ? code?.code : '', giftCents ? gift?.code : '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Secure checkout could not be created.');
      setBusy(false);
    }
  }

  if (isWooCommerceConfigured()) {
    const cartUrl = getWooCommercePageUrl('cart');
    return <section className={`bag bag--${variant}`}><h1>Your <b>bag</b></h1>
      <p>Your basket lives in our secure store, where sizes, stock, shipping and payment are confirmed together.</p>
      {cartUrl && <a className="bag__cta" href={cartUrl}>Open your basket <ArrowRight size={16} /></a>}
    </section>;
  }

  return <section className={`bag bag--${variant}`}>
    <h1>Your <b>bag</b></h1>
    {params.get('checkout') === 'cancelled' && <p className="bag__notice" role="status">Checkout was cancelled. Your bag is still here.</p>}
    {error && <p className="bag__notice bag__notice--error" role="alert">{error}</p>}
    {lines.length === 0
      ? <div className="bag__empty"><p>Nothing here yet.</p><Link className="bag__cta" to={shopPath}>Start shopping <ArrowRight size={16} /></Link></div>
      : <div className="bag__grid">
          <div className="bag__lines">{lines.map((item) => <article key={item.productId + item.size} className="bag__line">
            <Link to={productPath(item.product)} className="bag__img"><img src={item.product.images[0]?.url} alt="" /></Link>
            <div className="bag__info">
              <Link to={productPath(item.product)}><strong>{item.product.title}</strong></Link>
              <span>{item.size.includes(' / ') ? `${item.size.split(' / ')[0]} · Size ${item.size.split(' / ')[1]}` : `${item.product.color ? `${item.product.color} · ` : ''}Size ${item.size}`}</span>
              <div className="bag__qty">
                <button type="button" aria-label="Decrease quantity" onClick={() => setQuantity(item.productId, item.size, item.quantity - 1)}><Minus size={13} /></button>
                <span>{item.quantity}</span>
                <button type="button" aria-label="Increase quantity" onClick={() => setQuantity(item.productId, item.size, item.quantity + 1)}><Plus size={13} /></button>
              </div>
            </div>
            <div className="bag__end">
              <strong>{toEu ? formatMoney(usdToEurCents(item.product.priceCents) * item.quantity, 'EUR') : formatMoney(item.product.priceCents * item.quantity, item.product.currency)}</strong>
              <button type="button" aria-label={`Remove ${item.product.title}`} onClick={() => remove(item.productId, item.size)}><X size={16} /></button>
            </div>
          </article>)}</div>
          <aside className="bag__summary">
            <div><span>Subtotal</span><strong>{toEu ? formatMoney(eurGross, 'EUR') : formatMoney(subtotal, currency)}</strong></div>
            {offer.discountCents > 0 && <div className="bag__save"><span>{offer.label}</span><strong>−{toEu ? formatMoney(eurDiscountGross, 'EUR') : formatMoney(offer.discountCents, currency)}</strong></div>}
            {giftCents > 0 && <div className="bag__save"><span>Gift card {gift!.code} <button type="button" className="bag__giftx" aria-label="Remove gift card" onClick={removeGift}><X size={12} /></button></span><strong>−{formatMoney(giftCents, currency)}</strong></div>}
            {offer.giftEligible && <div className="bag__save"><span><Gift size={14} /> Free gift: {FREE_GIFT.title}</span><strong>Free</strong></div>}
            <label className="bag__country"><span>Deliver to</span>
              <select value={country} onChange={(event) => { setPicked(event.target.value); remember(COUNTRY_KEY, event.target.value); }} aria-label="Delivery country">
                <option value="" disabled>Choose a country</option>
                {countries.map((row) => <option key={row.code} value={row.code}>{row.name}</option>)}
              </select>
            </label>
            {region?.eu && !region.euOpen && !country && <p className="bag__fx">Delivery to the EU opens soon.</p>}
            <div><span>Shipping</span><span>Free</span></div>
            {quote?.taxCase === 'A' && <div><span>TVA / VAT ({EU_VAT_RATES[quote.country]}% - {quote.country})</span><span>{formatMoney(quote.vatCents, 'EUR')}</span></div>}
            {quote?.taxCase === 'B' && <div className="bag__save"><span>VAT not charged (paid on delivery)</span><strong>−{formatMoney(eurGross - eurDiscountGross - chargeTotal, 'EUR')}</strong></div>}
            {quote && <div className="bag__total"><span>Total</span><strong>{quote.currency === 'EUR' ? formatMoney(chargeTotal, 'EUR') : formatUsd(chargeTotal)}</strong></div>}
            {quote && quote.taxCase !== 'A' && <p className="bag__fx">{quote.notice}</p>}
            {gift && toEu && <p className="bag__fx">Gift cards work on orders delivered outside the EU for now.</p>}
            <form className="bag__code" onSubmit={(event) => { event.preventDefault(); void applyCode(codeInput); }}>
              <Tag size={14} />
              <input value={codeInput} onChange={(event) => setCodeInput(event.target.value.toUpperCase())} placeholder="Discount or gift card code" aria-label="Discount or gift card code" maxLength={32} />
              <button type="submit">Apply</button>
            </form>
            {codeError && <p className="bag__codeerr" role="alert">{codeError}</p>}
            {offer.codeNote && <p>{offer.codeNote}</p>}
            {nextTier && <p className="bag__nudge">Add {nextTier.minItems - pieces} more {nextTier.minItems - pieces === 1 ? 'piece' : 'pieces'} and save {nextTier.percent}% on your whole bag.</p>}
            <div className="bag__gift" aria-label="Free gift progress">
              <span><Gift size={14} /> {offer.giftEligible ? `You've unlocked free ${FREE_GIFT.title.toLowerCase()}` : `${formatMoney(offer.giftRemainingCents, currency)} away from free ${FREE_GIFT.title.toLowerCase()}`}</span>
              <i style={{ ['--p' as string]: `${Math.min(100, ((FREE_GIFT.thresholdCents - offer.giftRemainingCents) / FREE_GIFT.thresholdCents) * 100)}%` }} />
            </div>
            <button type="button" className="bag__cta" disabled={busy} onClick={() => void checkout()}>{busy ? 'Preparing checkout…' : 'Secure checkout'} <ArrowRight size={16} /></button>
            {quote?.taxCase === 'C' && currency && formatMoney(100, 'USD') !== formatUsd(100) && <p className="bag__fx">Prices are shown in euros. Orders outside the EU are charged in US dollars; your bank converts it.</p>}
            <p>Prices, sizes and stock are rechecked before payment.</p>
          </aside>
        </div>}
    {lines.length > 0 && upsell.length > 0 && <div className="bag__upsell">
      <h2>Complete the <b>look</b></h2>
      <div className="bag__upsell-row">{upsell.map((product) => <Link key={product.id} to={productPath(product)} className="bag__upsell-card">
        <span className="bag__upsell-img"><img src={cutoutFor(product.id) || product.images[0]?.url} alt="" loading="lazy" /></span>
        <strong>{product.title}</strong>
        <span>{formatMoney(product.priceCents, product.currency)}</span>
      </Link>)}</div>
    </div>}
  </section>;
}
