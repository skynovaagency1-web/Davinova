import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check, ChevronRight, ShoppingBag } from 'lucide-react';
import { useCatalogProducts } from '../../lib/useCatalogProducts';
import { formatMoney } from '../../lib/format';
import { isProductPurchasable, isWooCommerceProduct } from '../../lib/woocommerce';
import { isCurvyProduct, productPath } from '../../lib/storefront';
import { useCart } from '../../store/cart';
import type { Product, ProductSize } from '../../types/product';

type Variant = 'women' | 'men';

const usesByCollection: Record<string, string[]> = {
  'wedding-guest': ['for the ceremony', 'for the reception', 'for the after-party'],
  'cocktail-party': ['for cocktail hour', 'for the party', 'for date night'],
  'maxi-holiday': ['for the holiday', 'for garden parties', 'for summer weddings'],
};
const wordByCollection: Record<string, string> = { 'wedding-guest': 'Guest', 'cocktail-party': 'Cocktail', 'maxi-holiday': 'Holiday' };

/** Product page shared by both storefronts: a poster-style stage, then the buying panel. */
export function ProductView({ variant }: { variant: Variant }) {
  const { slug } = useParams();
  const { products, loading } = useCatalogProducts();
  const product = products.find((item) => item.slug === slug);
  const shopPath = variant === 'men' ? '/men/shop' : '/shop';

  if (!product) {
    return <section className={`pv pv--${variant} pv--empty`}>
      <h1>{loading ? 'Opening this look…' : 'We couldn’t find that look.'}</h1>
      {!loading && <Link className="pv-back" to={shopPath}><ArrowLeft size={15} /> Back to the shop</Link>}
    </section>;
  }
  return <ProductBody key={product.id} product={product} products={products} variant={variant} shopPath={shopPath} />;
}

function ProductBody({ product, products, variant, shopPath }: { product: Product; products: Product[]; variant: Variant; shopPath: string }) {
  const [index, setIndex] = useState(0);
  const [broken, setBroken] = useState(false);
  const [size, setSize] = useState<ProductSize | ''>('');
  const [added, setAdded] = useState(false);
  const [sizeHint, setSizeHint] = useState(false);
  const add = useCart((state) => state.add);
  const still = useReducedMotion();
  useEffect(() => { window.scrollTo({ top: 0 }); }, []);

  const photos = product.images;
  const photo = photos[index] ?? photos[0];
  const isWoo = isWooCommerceProduct(product);
  const canBuy = isWoo ? isProductPurchasable(product) : !product.browseOnly && product.supplierVerified && product.sizes.length > 0;
  const word = variant === 'men' ? 'Formal' : wordByCollection[product.collectionCategory] ?? 'Occasion';
  const uses = variant === 'men' ? ['for the wedding', 'for the dinner', 'for the gala'] : usesByCollection[product.collectionCategory] ?? usesByCollection['wedding-guest'];
  const specs = ([['Colour', product.color], ['Length', product.length], ['Neckline', product.neckline], ['Sleeve', product.sleeve]] as [string, string | undefined][])
    .filter((entry): entry is [string, string] => Boolean(entry[1]));
  const bigNumber = product.sizes.length > 1 ? { value: product.sizes.length, label: 'sizes to choose from' }
    : photos.length > 1 ? { value: photos.length, label: 'angles to explore' } : null;
  const related = products.filter((item) => item.id !== product.id && item.department === product.department && item.collectionCategory === product.collectionCategory && item.images[0]?.url).slice(0, 8);
  const price = canBuy || isWoo ? formatMoney(product.priceCents, product.currency) : 'Coming soon';

  function addToBag() {
    if (!size) { setSizeHint(true); return; }
    add(product, size);
    setAdded(true);
  }

  return <section className={`pv pv--${variant}`}>
    <Link className="pv-back" to={shopPath}><ArrowLeft size={15} /> Back to the shop</Link>
    <div className="pv-grid">
      <div className="pv-stage">
        <div className="pv-stage__banner">
          <div><strong>{word}</strong><span>{variant === 'men' ? 'Davinova Homme' : isCurvyProduct(product) ? 'The curve edit' : 'The occasion edit'}</span></div>
          <ul>{uses.map((use) => <li key={use}><ChevronRight size={14} />{use}</li>)}</ul>
        </div>
        <div className="pv-stage__product">
          {photo?.url && !broken
            // Floating loop adapted from "Product Bounce Card" (ruixen.ui, 21st.dev), slowed down for clothing.
            ? <motion.img key={photo.url} src={photo.url} alt={photo.alt || product.title} onError={() => setBroken(true)} animate={still ? undefined : { y: [0, -14, 0], rotateY: [0, 4, -4, 0] }} transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }} style={{ transformStyle: 'preserve-3d' }} />
            : <div className="pv-stage__missing">Photo coming soon</div>}
        </div>
        {specs.slice(0, 2).map(([label, value], i) => <span key={label} className={`pv-callout pv-callout--${i + 1}`}><b>{value}</b>{label}<svg viewBox="0 0 120 40" aria-hidden="true"><path d={i ? 'M4 6 C30 2 34 30 60 22 S100 30 116 36' : 'M4 30 C24 40 40 8 64 18 S98 4 116 10'} /></svg></span>)}
        {bigNumber && <span className="pv-stage__number"><b>{bigNumber.value}</b>{bigNumber.label}</span>}
        {photos.length > 1 && <div className="pv-stage__thumbs" aria-label="Product photos">
          {photos.slice(0, 6).map((image, i) => <button key={image.url + i} type="button" className={i === index ? 'active' : ''} onClick={() => { setIndex(i); setBroken(false); }} aria-label={`Photo ${i + 1}`} aria-pressed={i === index}><img src={image.url} alt="" loading="lazy" /><span>{String(i + 1).padStart(2, '0')}</span></button>)}
        </div>}
      </div>

      <aside className="pv-buy">
        <span className="pv-buy__tag">{variant === 'men' ? 'Men · Formal' : product.collectionCategory.replace('-', ' ')}</span>
        <h1>{product.title}</h1>
        <div className="pv-buy__price">{price}{canBuy && product.compareAtCents && <del>{formatMoney(product.compareAtCents, product.currency)}</del>}</div>
        {product.description && <p className="pv-buy__desc">{product.description}</p>}
        {specs.length > 0 && <dl className="pv-buy__specs">{specs.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>}
        {!isWoo && canBuy && <div className="pv-buy__sizes">
          <span>Choose your size {sizeHint && !size && <em>· pick one first</em>}</span>
          <div role="group" aria-label="Sizes">{product.sizes.map((item) => <button key={item} type="button" className={size === item ? 'active' : ''} aria-pressed={size === item} onClick={() => { setSize(item); setAdded(false); setSizeHint(false); }}>{item}</button>)}</div>
        </div>}
        {isWoo
          ? (canBuy && product.woocommercePermalink
            ? <a className="pv-buy__cta" href={product.woocommercePermalink}>Choose options <ArrowRight size={18} /></a>
            : <button type="button" className="pv-buy__cta" disabled>Unavailable</button>)
          : canBuy
            ? <button type="button" className="pv-buy__cta" onClick={addToBag}>{added ? <>Added to bag <Check size={18} /></> : <>Add to bag <ShoppingBag size={18} /></>}</button>
            : <button type="button" className="pv-buy__cta" disabled>Coming soon</button>}
        {added && <Link className="pv-buy__bag" to={variant === 'men' ? '/men/bag' : '/bag'}>View bag & checkout <ArrowRight size={14} /></Link>}
        <p className="pv-buy__note">{canBuy ? 'Sizes, stock and price are rechecked at secure checkout.' : 'We’re still confirming sizes, stock and delivery for this piece.'}</p>
        <details><summary>Delivery & returns</summary><p>Delivery options and our return policy are shown before you pay. See <Link to="/shipping">shipping</Link> and <Link to="/returns">returns</Link>.</p></details>
      </aside>
    </div>

    {related.length > 0 && <div className="pv-related">
      <h2>Complete the <b>look</b></h2>
      <div className="pv-related__rail">{related.map((item) => <Link key={item.id} to={productPath(item)} className="pv-related__item"><span><img src={item.images[0].url} alt="" loading="lazy" /></span><strong>{item.title}</strong></Link>)}</div>
    </div>}
  </section>;
}
