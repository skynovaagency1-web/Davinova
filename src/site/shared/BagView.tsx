import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, Minus, Plus, X } from 'lucide-react';
import { useCatalogProducts } from '../../lib/useCatalogProducts';
import { formatMoney } from '../../lib/format';
import { getWooCommercePageUrl, isWooCommerceConfigured } from '../../lib/woocommerce';
import { productPath } from '../../lib/storefront';
import { useCart } from '../../store/cart';
import { startCheckout } from './checkout';

/** The bag is shared by both storefronts; the variant only changes its look and the "keep shopping" link. */
export function BagView({ variant }: { variant: 'women' | 'men' }) {
  const { products } = useCatalogProducts();
  const { items, remove, setQuantity } = useCart();
  const [params] = useSearchParams();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const shopPath = variant === 'men' ? '/men/shop' : '/shop';

  const lines = items
    .map((item) => ({ ...item, product: products.find((product) => product.id === item.productId) }))
    .filter((item): item is typeof item & { product: NonNullable<typeof item.product> } => Boolean(item.product && !item.product.browseOnly && item.product.supplierVerified));
  const subtotal = lines.reduce((sum, item) => sum + item.product.priceCents * item.quantity, 0);

  async function checkout() {
    if (busy || lines.length === 0) return;
    setBusy(true);
    setError('');
    try {
      await startCheckout(lines);
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
              <strong>{formatMoney(item.product.priceCents * item.quantity, item.product.currency)}</strong>
              <button type="button" aria-label={`Remove ${item.product.title}`} onClick={() => remove(item.productId, item.size)}><X size={16} /></button>
            </div>
          </article>)}</div>
          <aside className="bag__summary">
            <div><span>Subtotal</span><strong>{formatMoney(subtotal, lines[0]?.product.currency)}</strong></div>
            <div><span>Shipping</span><span>At checkout</span></div>
            <button type="button" className="bag__cta" disabled={busy} onClick={() => void checkout()}>{busy ? 'Preparing checkout…' : 'Secure checkout'} <ArrowRight size={16} /></button>
            <p>Prices, sizes and stock are rechecked before payment.</p>
          </aside>
        </div>}
  </section>;
}
