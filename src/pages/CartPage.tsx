import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, Minus, Plus, Trash2 } from 'lucide-react';
import { useCatalogProducts } from '../lib/useCatalogProducts';
import { formatMoney } from '../lib/format';
import { useCart } from '../store/cart';
import { getWooCommercePageUrl, isWooCommerceConfigured } from '../lib/woocommerce';

export function CartPage() {
  const { products } = useCatalogProducts();
  const { items, remove, setQuantity } = useCart();
  const [searchParams] = useSearchParams();
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');
  const checkoutState = searchParams.get('checkout');

  const lines = items
    .map((item) => ({ ...item, product: products.find((product) => product.id === item.productId) }))
    .filter((item) => item.product && !item.product.browseOnly && item.product.supplierVerified);
  const subtotal = lines.reduce((sum, item) => sum + item.product!.priceCents * item.quantity, 0);

  async function beginCheckout() {
    if (checkoutBusy || lines.length === 0) return;
    setCheckoutBusy(true);
    setCheckoutError('');

    try {
      // Only cart identifiers/options cross the browser boundary. The Worker reads
      // current prices, verified supplier IDs, variants and stock from D1/CJ.
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          items: lines.map((item) => ({
            productId: item.productId,
            size: item.size,
            quantity: item.quantity,
          })),
        }),
      });
      const result = await response.json().catch(() => ({})) as { url?: string; error?: string };
      if (!response.ok) throw new Error(result.error || 'Secure checkout could not be created.');
      if (typeof result.url !== 'string' || !result.url.startsWith('https://checkout.stripe.com/')) {
        throw new Error('The checkout service did not return a valid Stripe Checkout URL.');
      }
      window.location.assign(result.url);
    } catch (error) {
      setCheckoutError(error instanceof Error ? error.message : 'Secure checkout could not be created.');
      setCheckoutBusy(false);
    }
  }

  if (isWooCommerceConfigured()) {
    const cartUrl = getWooCommercePageUrl('cart');
    const checkoutUrl = getWooCommercePageUrl('checkout');
    return <section className="section cart-page">
      <p className="eyebrow">Your edit</p><h1>Your <em>bag.</em></h1>
      <div className="empty-cart">
        <p>Your basket lives in our secure store, where live sizes, stock, shipping, taxes and payment are confirmed together.</p>
        {cartUrl && <a className="button button--dark" href={cartUrl}>Open your WooCommerce basket <ArrowRight size={16} /></a>}
        {checkoutUrl && <a className="text-link" href={checkoutUrl}>Go to secure checkout</a>}
      </div>
    </section>;
  }

  return <section className="section cart-page">
    <p className="eyebrow">Your edit</p><h1>Your <em>bag.</em></h1>
    {checkoutState === 'cancelled' && <p className="checkout-notice" role="status">Checkout was cancelled. Your bag is still here when you are ready.</p>}
    {checkoutError && <p className="checkout-notice checkout-notice--error" role="alert">{checkoutError}</p>}
    {lines.length === 0
      ? <div className="empty-cart">
          <p>Your bag is waiting for something lovely.</p>
          <Link className="button button--dark" to="/shop">Explore the collection <ArrowRight size={16} /></Link>
        </div>
      : <div className="cart-layout">
          <div className="cart-lines">
            {lines.map((item) => <article className="cart-line" key={item.productId + '-' + item.size}>
              <img src={item.product!.images[0]?.url} alt={item.product!.title} />
              <div className="cart-line__info">
                <Link to={'/product/' + item.product!.slug}><h2>{item.product!.title}</h2></Link>
                <p>{item.product!.color} · Size {item.size}</p>
                <div className="quantity-control">
                  <button aria-label="Decrease quantity" onClick={() => setQuantity(item.productId, item.size, item.quantity - 1)}><Minus size={13}/></button>
                  <span>{item.quantity}</span>
                  <button aria-label="Increase quantity" onClick={() => setQuantity(item.productId, item.size, item.quantity + 1)}><Plus size={13}/></button>
                </div>
              </div>
              <div className="cart-line__end">
                <strong>{formatMoney(item.product!.priceCents * item.quantity, item.product!.currency)}</strong>
                <button className="remove-button" aria-label={'Remove ' + item.product!.title} onClick={() => remove(item.productId, item.size)}><Trash2 size={15}/></button>
              </div>
            </article>)}
          </div>
          <aside className="cart-summary">
            <p className="eyebrow">The summary</p>
            <div><span>Subtotal</span><strong>{formatMoney(subtotal, lines[0]?.product?.currency)}</strong></div>
            <div><span>Shipping</span><span>Shown at secure checkout</span></div>
            <p className="summary-disclaimer">The server rechecks the approved size, current CJ stock, retail price and delivery configuration before Stripe can collect payment. Supplier fulfilment still requires owner approval.</p>
            <button className="button button--dark" type="button" disabled={checkoutBusy || lines.length === 0} onClick={() => void beginCheckout()}>
              <span>{checkoutBusy ? 'Preparing secure checkout…' : 'Continue to secure checkout'}</span><ArrowRight size={16}/>
            </button>
            <Link className="text-link" to="/shop">Keep discovering</Link>
          </aside>
        </div>}
  </section>;
}
