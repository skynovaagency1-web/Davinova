import { Link } from 'react-router-dom';
import { ArrowRight, Minus, Plus, Trash2 } from 'lucide-react';
import { useCatalog } from '../data/CatalogProvider';
import { getWooCommercePageUrl } from '../lib/woocommerce';
import { products as demoProducts } from '../data/products';
import { formatMoney } from '../lib/format';
import { useCart } from '../store/cart';

export function CartPage() {
  const { isWooCommerce } = useCatalog();
  const { items, remove, setQuantity } = useCart();

  if (isWooCommerce) {
    const cartUrl = getWooCommercePageUrl('cart');
    const checkoutUrl = getWooCommercePageUrl('checkout');
    return <section className="section cart-page">
      <p className="eyebrow">Your edit</p><h1>Your <em>bag.</em></h1>
      <div className="empty-cart">
        <p>Your Davinova basket is managed securely by our store, so its live stock, chosen variants, delivery, and payment details stay in sync.</p>
        <a className="button button--dark" href={cartUrl ?? '#'}>Open your basket <ArrowRight size={16} /></a>
        <a className="text-link" href={checkoutUrl ?? '#'}>Go to secure checkout</a>
      </div>
    </section>;
  }

  const lines = items.map((item) => ({ ...item, product: demoProducts.find((product) => product.id === item.productId) })).filter((item) => item.product);
  const subtotal = lines.reduce((sum, item) => sum + item.product!.priceCents * item.quantity, 0);
  return <section className="section cart-page"><p className="eyebrow">Your edit</p><h1>Your <em>bag.</em></h1>{lines.length === 0 ? <div className="empty-cart"><p>Your bag is waiting for something lovely.</p><Link className="button button--dark" to="/shop">Explore the collection <ArrowRight size={16} /></Link></div> : <div className="cart-layout"><div className="cart-lines">{lines.map((item) => <article className="cart-line" key={`${item.productId}-${item.size}`}><img src={item.product!.images[0]?.url} alt={item.product!.title} /><div className="cart-line__info"><Link to={`/product/${item.product!.slug}`}><h2>{item.product!.title}</h2></Link><p>{item.product!.color} · Size {item.size}</p><div className="quantity-control"><button aria-label="Decrease quantity" onClick={() => setQuantity(item.productId,item.size,item.quantity-1)}><Minus size={13}/></button><span>{item.quantity}</span><button aria-label="Increase quantity" onClick={() => setQuantity(item.productId,item.size,item.quantity+1)}><Plus size={13}/></button></div></div><div className="cart-line__end"><strong>{formatMoney(item.product!.priceCents*item.quantity, item.product!.currency)}</strong><button className="remove-button" aria-label={`Remove ${item.product!.title}`} onClick={() => remove(item.productId,item.size)}><Trash2 size={15}/></button></div></article>)}</div><aside className="cart-summary"><p className="eyebrow">The summary</p><div><span>Subtotal</span><strong>{formatMoney(subtotal)}</strong></div><div><span>Shipping</span><span>Calculated at checkout</span></div><p className="summary-disclaimer">Taxes, delivery estimates, and final prices will be confirmed by the server during checkout.</p><button className="button button--dark" onClick={() => alert('Secure checkout is only enabled after WooCommerce is connected.')}>Continue to checkout <ArrowRight size={16}/></button><Link className="text-link" to="/shop">Keep discovering</Link></aside></div>}</section>;
}
