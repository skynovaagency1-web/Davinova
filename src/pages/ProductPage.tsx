import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Heart, Ruler } from 'lucide-react';
import { useCatalog } from '../data/CatalogProvider';
import { formatMoney } from '../lib/format';
import { useCart } from '../store/cart';
import type { DressSize } from '../types/product';

export function ProductPage() {
  const { slug } = useParams();
  const { products, isLoading, isWooCommerce, error } = useCatalog();
  const product = products.find((item) => item.slug === slug);
  const [size, setSize] = useState<DressSize | ''>('');
  const [added, setAdded] = useState(false);
  const add = useCart((state) => state.add);

  if (!product && isLoading) return <section className="section not-found"><p className="eyebrow">The occasion edit</p><h1>Finding your dress…</h1></section>;
  if (!product) return <section className="section not-found"><p className="eyebrow">A little detour</p><h1>We couldn’t find that dress.</h1><p>{error}</p><Link className="button button--dark" to="/shop">Back to the collection</Link></section>;

  return <section className="product-page section">
    <Link to="/shop" className="back-link"><ArrowLeft size={15} /> Back to the collection</Link>
    <div className="product-detail">
      <div className="product-gallery"><img src={product.images[0]?.url ?? '/images/placeholder-dress.svg'} alt={product.images[0]?.alt ?? product.title} />{!isWooCommerce && <span className="gallery-note">EDITORIAL PLACEHOLDER IMAGE</span>}</div>
      <div className="product-info">
        <p className="eyebrow">{product.occasion.replace('-', ' ')} edit</p>
        <h1>{product.title}</h1>
        <div className="detail-price">{formatMoney(product.priceCents, product.currency)} {product.compareAtCents && <del>{formatMoney(product.compareAtCents, product.currency)}</del>}</div>
        <p className="detail-description">{product.description || 'A considered look for your next special occasion.'}{!isWooCommerce && <span className="edit-note"> [DEMO PRODUCT — supplier details are not verified.]</span>}</p>
        <div className="detail-rule" />
        <div className="detail-field"><div className="field-heading"><span>Colour</span><strong>{product.color}</strong></div><span className="color-dot" style={{ background: product.color.toLowerCase() === 'champagne' ? '#d9c3a5' : product.color.toLowerCase() === 'black' ? '#262321' : product.color.toLowerCase() === 'sage' ? '#a4ad91' : product.color.toLowerCase() === 'navy' ? '#29374b' : '#d9aaa9' }} /></div>
        {isWooCommerce ? (
          <div className="detail-field">
            <p>Choose your exact size, colour, delivery, and payment option on our secure WooCommerce product page.</p>
            <a className="button button--dark add-button" href={product.woocommercePermalink ?? '#'}>Choose options & buy securely <ArrowRight size={17} /></a>
          </div>
        ) : (
          <>
            <div className="detail-field"><div className="field-heading"><span>Choose your size</span><button className="size-chart-link" onClick={() => alert('Size chart modal will be added in the next product-page stage. Please verify supplier measurements before ordering.')}><Ruler size={14} /> Size guide</button></div><div className="size-options">{product.sizes.map((item) => <button key={item} className={size === item ? 'size-option selected' : 'size-option'} onClick={() => { setSize(item); setAdded(false); }} aria-pressed={size === item}>{item}</button>)}</div><p className="size-caption">Inclusive sizing from XS to 4XL. Fit may vary by supplier.</p></div>
            <button className="button button--dark add-button" onClick={() => { if (!size) { alert('Please choose a size first.'); return; } add(product, size); setAdded(true); }}><span>{added ? 'Added to your bag' : 'Add to bag'}</span>{added ? <Check size={17} /> : <Heart size={17} />}</button>
          </>
        )}
        <p className="shipping-note">Delivery estimates and return terms are confirmed by the store at checkout.</p>
        <div className="product-accordion"><details><summary>Details & care</summary><p>For verified composition and care instructions, review the product information on the store page.</p></details><details><summary>Delivery & returns</summary><p>Current shipping methods, taxes, and return conditions are displayed by WooCommerce at checkout.</p></details></div>
      </div>
    </div>
  </section>;
}
