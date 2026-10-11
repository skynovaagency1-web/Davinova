import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Check, Heart, Ruler, Rotate3D } from 'lucide-react';
import { products } from '../data/products';
import { formatMoney } from '../lib/format';
import { useCart } from '../store/cart';
import { DressViewer3D } from '../components/DressViewer3D';
import type { DressSize } from '../types/product';

export function ProductPage() {
  const { slug } = useParams();
  const product = products.find((item) => item.slug === slug);
  const [size, setSize] = useState<DressSize | ''>('');
  const [added, setAdded] = useState(false);
  const [view3d, setView3d] = useState(false);
  const add = useCart((state) => state.add);

  if (!product) {
    return <section className="section not-found"><p className="eyebrow">A little detour</p><h1>We couldn’t find that dress.</h1><Link className="button button--dark" to="/shop">Back to the collection</Link></section>;
  }

  return <section className="product-page section">
    <Link to="/shop" className="back-link"><ArrowLeft size={15} /> Back to the collection</Link>
    <div className="product-detail">
      <div className="product-visual-column">
        {!view3d && <div className="product-gallery">
          <img src={product.images[0]?.url} alt={product.images[0]?.alt ?? product.title} />
          <span className="gallery-note">DAVINOVA · THE OCCASION EDIT</span>
        </div>}
        <div className="viewer-switch" role="group" aria-label="Product viewing mode">
          <button type="button" className={!view3d ? 'viewer-switch__button active' : 'viewer-switch__button'} onClick={() => setView3d(false)}>Editorial view</button>
          <button type="button" className={view3d ? 'viewer-switch__button active' : 'viewer-switch__button'} onClick={() => setView3d(true)}><Rotate3D size={14} /> View in 3D</button>
        </div>
        {view3d && <DressViewer3D modelUrl={product.model3d?.url} title={product.title} color={product.color} scale={product.model3d?.scale} rotationY={product.model3d?.rotationY} />}
        {!view3d && <p className="image-disclaimer">Supplier listing image · Verify reseller image rights before launch.</p>}
      </div>
      <div className="product-info">
        <p className="eyebrow">{product.occasion.replace('-', ' ')} edit</p>
        <h1>{product.title}</h1>
        <div className="detail-price">{formatMoney(product.priceCents)} {product.compareAtCents && <del>{formatMoney(product.compareAtCents)}</del>}</div>
        <p className="detail-description">{product.description}</p>
        <div className="detail-rule" />
        <div className="detail-field">
          <div className="field-heading"><span>Colour</span><strong>{product.color}</strong></div>
          <span className="color-dot" style={{ background: product.color.toLowerCase() === 'champagne' ? '#d9c3a5' : product.color.toLowerCase() === 'black' ? '#262321' : product.color.toLowerCase() === 'sage' ? '#a4ad91' : product.color.toLowerCase() === 'navy' ? '#29374b' : '#d9aaa9' }} />
        </div>
        {product.sizes.length > 0 ? <div className="detail-field">
          <div className="field-heading"><span>Choose your size</span><button className="size-chart-link" onClick={() => alert('Size measurements must be verified against the supplier before publishing.')}><Ruler size={14} /> Size guide</button></div>
          <div className="size-options">{product.sizes.map((item) => <button key={item} className={size === item ? 'size-option selected' : 'size-option'} onClick={() => { setSize(item); setAdded(false); }} aria-pressed={size === item}>{item}</button>)}</div>
        </div> : <div className="detail-field">
          <div className="field-heading"><span>Sizes & availability</span></div>
          <p className="size-caption">We are confirming the available sizes and current stock with FondMart. This item cannot be purchased yet.</p>
        </div>}
        <button className="button button--dark add-button" disabled={product.sizes.length === 0} onClick={() => { if (!size) { alert('Please choose a size first.'); return; } add(product, size); setAdded(true); }}><span>{product.sizes.length === 0 ? 'Availability to be confirmed' : added ? 'Added to your bag' : 'Add to bag'}</span>{added ? <Check size={17} /> : <Heart size={17} />}</button>
        <p className="shipping-note">Shipping estimates and terms will be shown after supplier and destination details are confirmed.</p>
        <div className="product-accordion">
          <details><summary>Details & care</summary><p>Product composition and care instructions are awaiting supplier verification. [EDIT ME]</p></details>
          <details><summary>Delivery & returns</summary><p>Shipping and return terms are placeholders. Review the policy pages before launch. [EDIT ME]</p></details>
        </div>
      </div>
    </div>
  </section>;
}
