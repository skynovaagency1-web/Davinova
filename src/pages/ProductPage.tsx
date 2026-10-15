import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Check, Heart, Ruler, Rotate3D } from 'lucide-react';
import { useCatalogProducts } from '../lib/useCatalogProducts';
import { formatMoney } from '../lib/format';
import { fullSizeImage } from '../lib/images';
import { editorialImageFor } from '../lib/editorialImages';
import { useCart } from '../store/cart';
import { DressViewer3D } from '../components/DressViewer3D';
import type { DressSize } from '../types/product';

const colourSwatches: Record<string, string> = {
  champagne: '#d9c3a5',
  black: '#262321',
  sage: '#a4ad91',
  navy: '#29374b',
  'navy blue': '#29374b',
  pink: '#c68b9b',
  'light green': '#a0ad82',
  'wine red': '#7f2d40',
  brown: '#765244',
  'multi-colour': 'linear-gradient(135deg, #cf9b9c 0 33%, #6b8199 33% 66%, #d5c19e 66%)',
  apricot: '#d4a17e',
  burgundy: '#70263c',
};

export function ProductPage() {
  const { slug } = useParams();
  const { products, loading } = useCatalogProducts();
  const product = products.find((item) => item.slug === slug);
  const [size, setSize] = useState<DressSize | ''>('');
  const [added, setAdded] = useState(false);
  const [view3d, setView3d] = useState(false);
  const [usingEditorial, setUsingEditorial] = useState(!fullSizeImage(product?.images[0]?.url));
  const [imageUnavailable, setImageUnavailable] = useState(false);
  const add = useCart((state) => state.add);
  useEffect(() => {
    setUsingEditorial(!fullSizeImage(product?.images[0]?.url));
    setImageUnavailable(false);
  }, [product?.id]);

  if (!product && loading) {
    return <section className="section not-found"><p className="eyebrow">The Davinova edit</p><h1>Opening this dress…</h1><p>Just a moment while we load the collection.</p><Link className="button button--dark" to="/shop">Back to the collection</Link></section>;
  }

  if (!product) {
    return <section className="section not-found"><p className="eyebrow">A little detour</p><h1>We couldn’t find that dress.</h1><Link className="button button--dark" to="/shop">Back to the collection</Link></section>;
  }

  const browseOnly = Boolean(product.browseOnly || !product.supplierVerified);

  return <section className="product-page section">
    <Link to="/shop" className="back-link"><ArrowLeft size={15} /> Back to the collection</Link>
    <div className="product-detail">
      <div className="product-visual-column">
        {!view3d && <div className="product-gallery">
          {!imageUnavailable
            ? <img
                src={usingEditorial ? editorialImageFor(product.color) : fullSizeImage(product.images[0]?.url)}
                alt={usingEditorial
                  ? `Editorial inspiration for ${product.title}; not an exact product photograph`
                  : product.images[0]?.alt ?? product.title}
                onError={() => {
                  if (!usingEditorial) setUsingEditorial(true);
                  else setImageUnavailable(true);
                }}
              />
            : <div style={{ display: 'grid', placeContent: 'center', minHeight: 420, padding: 24, background: 'linear-gradient(145deg, #eee2d8, #c9b0a2)', color: '#4d4038', textAlign: 'center' }}>
                <span style={{ letterSpacing: '.18em', fontSize: 11 }}>DAVINOVA</span>
                <span style={{ marginTop: 8, fontFamily: 'Georgia, serif', fontSize: 26 }}>The occasion edit</span>
                <span style={{ marginTop: 10, fontSize: 12 }}>Product image coming soon</span>
              </div>}
          {usingEditorial && !imageUnavailable && <span style={{ position: 'absolute', left: 16, bottom: 16, background: 'rgba(255,253,251,.94)', color: '#5d4b42', padding: '8px 10px', fontSize: 10, letterSpacing: '.08em' }}>EDITORIAL INSPIRATION · NOT EXACT ITEM</span>}
          <span className="gallery-note">DAVINOVA · THE OCCASION EDIT</span>
        </div>}
        <div className="viewer-switch" role="group" aria-label="Product viewing mode">
          <button type="button" className={!view3d ? 'viewer-switch__button active' : 'viewer-switch__button'} onClick={() => setView3d(false)}>Editorial view</button>
          {product.model3d?.url && <button type="button" className={view3d ? 'viewer-switch__button active' : 'viewer-switch__button'} onClick={() => setView3d(true)}><Rotate3D size={14} /> View in 3D</button>}
        </div>
        {view3d && product.model3d?.url && <DressViewer3D modelUrl={product.model3d.url} title={product.title} color={product.color} scale={product.model3d.scale} rotationY={product.model3d.rotationY} />}
        {!view3d && <p className="image-disclaimer">{browseOnly ? 'Editorial inspiration only — this is not an exact photograph of the listed dress. Product-specific photos and availability are being confirmed.' : 'Product imagery supplied by our catalogue.'}</p>}
      </div>
      <div className="product-info">
        <p className="eyebrow">{product.occasion.replace('-', ' ')} edit</p>
        <h1>{product.title}</h1>
        <div className="detail-price">{browseOnly ? 'Coming soon' : <>{formatMoney(product.priceCents)} {product.compareAtCents && <del>{formatMoney(product.compareAtCents)}</del>}</>}</div>
        <p className="detail-description">{product.description}</p>
        <div className="detail-rule" />
        {!browseOnly && <div className="detail-field">
          <div className="field-heading"><span>Colour</span><strong>{product.color}</strong></div>
          <span className="color-dot" style={{ background: colourSwatches[product.color.toLowerCase()] ?? '#d9aaa9' }} />
        </div>}
        {!browseOnly && product.sizes.length > 0 ? <div className="detail-field">
          <div className="field-heading"><span>Choose your size</span><button className="size-chart-link" onClick={() => alert('Size measurements must be verified against the supplier before publishing.')}><Ruler size={14} /> Size guide</button></div>
          <div className="size-options">{product.sizes.map((item) => <button key={item} className={size === item ? 'size-option selected' : 'size-option'} onClick={() => { setSize(item); setAdded(false); }} aria-pressed={size === item}>{item}</button>)}</div>
        </div> : <div className="detail-field">
          <div className="field-heading"><span>Sizes & availability</span></div>
          <p className="size-caption">We’re preparing this dress for the Davinova collection. Sizes, stock, the final price and delivery details are still being confirmed. This item cannot be purchased yet.</p>
        </div>}
        <button className="button button--dark add-button" disabled={browseOnly || product.sizes.length === 0} onClick={() => { if (!size) { alert('Please choose a size first.'); return; } add(product, size); setAdded(true); }}><span>{browseOnly || product.sizes.length === 0 ? 'Coming soon — not available to purchase' : added ? 'Added to your bag' : 'Add to bag'}</span>{added ? <Check size={17} /> : <Heart size={17} />}</button>
        <p className="shipping-note">Shipping estimates and terms will be shown after supplier and destination details are confirmed.</p>
        <div className="product-accordion">
          <details><summary>Details & care</summary><p>Product composition and care instructions are awaiting supplier verification. [EDIT ME]</p></details>
          <details><summary>Delivery & returns</summary><p>Shipping and return terms are placeholders. Review the policy pages before launch. [EDIT ME]</p></details>
        </div>
      </div>
    </div>
  </section>;
}
