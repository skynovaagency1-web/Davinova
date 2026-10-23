import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check, ChevronRight, ShoppingBag } from 'lucide-react';
import { useCatalogProducts } from '../../lib/useCatalogProducts';
import { formatMoney } from '../../lib/format';
import { isProductPurchasable, isWooCommerceProduct } from '../../lib/woocommerce';
import { productPath } from '../../lib/storefront';
import { isCurvyLook } from '../../lib/curvyLooks';
import { useCart } from '../../store/cart';
import { useCutouts } from '../../lib/useCutouts';
import type { Product, ProductSize } from '../../types/product';
import { WishButton } from './WishButton';

type Variant = 'women' | 'men';

// Keyed by the product's sub-category, then its category, then the shelf (watches, jewelry).
const usesByCollection: Record<string, string[]> = {
  'cocktail-dresses': ['for cocktail hour', 'for the party', 'for date night'],
  'evening-dresses': ['for black tie', 'for the gala', 'for the reception'],
  'wedding-dresses': ['for the ceremony', 'for the photos', 'for your first dance'],
  'bridesmaid-dresses': ['for the ceremony', 'for the reception', 'for the photos'],
  'prom-dresses': ['for prom night', 'for the photos', 'for the after-party'],
  'flower-girl-dresses': ['for the aisle', 'for the photos', 'for the reception'],
  'weddings-and-events': ['for the ceremony', 'for the reception', 'for the after-party'],
  'couple-parent-child-clothing': ['for family photos', 'for the holidays', 'for days out together'],
  'womens-sweaters': ['for cool evenings', 'for the weekend', 'for travel'],
  'womens-denim': ['for brunch', 'for the weekend', 'for travel'],
  'tops-and-sets': ['for brunch', 'for the office', 'for the weekend'],
  watches: ['for every day', 'for the occasion', 'as a gift'],
};
const wordByCollection: Record<string, string> = {
  'cocktail-dresses': 'Cocktail', 'evening-dresses': 'Evening', 'wedding-dresses': 'Bridal', 'bridesmaid-dresses': 'Bridesmaid', 'prom-dresses': 'Prom', 'flower-girl-dresses': 'Flower girl',
  'weddings-and-events': 'Occasion', 'couple-parent-child-clothing': 'Together', 'womens-sweaters': 'Knit', 'womens-denim': 'Denim', 'tops-and-sets': 'Everyday', accessories: 'Finish', watches: 'Time',
};
const keysOf = (item: Product) => [item.storeSubcategory, item.storeCollection, item.shelf].filter((key): key is string => Boolean(key));
const lookup = <T,>(table: Record<string, T>, item: Product) => keysOf(item).map((key) => table[key]).find((value) => value !== undefined);

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

const sizeOrder = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '1XL', '2XL', 'XXXL', '3XL', '4XL', '5XL', '6XL'];

/** Letter sizes in wearing order, then numeric sizes low to high, then anything else as CJ listed it. */
function sortSizes<T extends { size: string }>(items: T[]): T[] {
  const rank = (size: string) => {
    const letter = sizeOrder.indexOf(size.toUpperCase());
    if (letter >= 0) return letter;
    const number = parseFloat(size.replace(/[^0-9.]/g, ''));
    return Number.isFinite(number) ? 100 + number : 10000;
  };
  return items.map((item, index) => ({ item, index })).sort((a, b) => rank(a.item.size) - rank(b.item.size) || a.index - b.index).map(({ item }) => item);
}

function ProductBody({ product, products, variant, shopPath }: { product: Product; products: Product[]; variant: Variant; shopPath: string }) {
  const [index, setIndex] = useState(0);
  const [broken, setBroken] = useState(false);
  const [size, setSize] = useState<ProductSize | ''>('');
  const [added, setAdded] = useState(false);
  const [sizeHint, setSizeHint] = useState(false);
  const add = useCart((state) => state.add);
  const still = false;
  const cutout = useCutouts()(product.id);
  useEffect(() => { window.scrollTo({ top: 0 }); }, []);

  const [colour, setColour] = useState('');
  // After a colour is picked the big photo shows that colour, until a thumbnail is clicked.
  const [showColour, setShowColour] = useState(false);
  const colourPhoto = showColour && colour ? product.colourImages?.[colour] : undefined;
  const photos = product.images;
  // The first view uses the cut-out (if one exists) so the dress stands out of the poster.
  const photo = colourPhoto ? { url: colourPhoto, alt: `${product.title} in ${colour}` }
    : index === 0 && cutout ? { url: cutout, alt: photos[0]?.alt ?? product.title } : photos[index] ?? photos[0];
  const isWoo = isWooCommerceProduct(product);
  const canBuy = isWoo ? isProductPurchasable(product) : !product.browseOnly && product.supplierVerified && product.sizes.length > 0;
  const word = variant === 'men' ? 'Formal' : lookup(wordByCollection, product) ?? 'Occasion';
  const uses = variant === 'men' ? ['for the wedding', 'for the dinner', 'for the gala'] : lookup(usesByCollection, product) ?? usesByCollection['weddings-and-events'];
  const specs = ([['Colour', product.color], ['Length', product.length], ['Neckline', product.neckline], ['Sleeve', product.sleeve]] as [string, string | undefined][])
    .filter((entry): entry is [string, string] => Boolean(entry[1]));
  const colourCount = new Set(product.sizes.filter((label) => label.includes(' / ')).map((label) => label.split(' / ')[0])).size;
  const bigNumber = colourCount > 1 ? { value: colourCount, label: 'colours to choose from' }
    : product.sizes.length > 1 ? { value: product.sizes.length, label: 'sizes to choose from' }
    : photos.length > 1 ? { value: photos.length, label: 'angles to explore' } : null;
  const related = products.filter((item) => item.id !== product.id && item.department === product.department && (product.storeCollection ? item.storeCollection === product.storeCollection : item.shelf === product.shelf) && item.images[0]?.url).slice(0, 8);
  const price = canBuy || isWoo ? formatMoney(product.priceCents, product.currency) : 'Coming soon';
  // CJ labels look like "M", "38" or "Black / M"; split colour from size so each gets its own row of buttons.
  const options = product.sizes.map((label) => {
    const cut = label.indexOf(' / ');
    return cut < 0 ? { label, colour: '', size: label } : { label, colour: label.slice(0, cut), size: label.slice(cut + 3) };
  });
  const colours = [...new Set(options.map((option) => option.colour).filter(Boolean))];
  const sizeChoices = sortSizes(options.filter((option) => !colours.length || option.colour === colour));

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
          <div><strong>{word}</strong><span>{variant === 'men' ? 'Davinova Homme' : isCurvyLook(product) ? 'The curve edit' : 'The occasion edit'}</span></div>
          <ul>{uses.map((use) => <li key={use}><ChevronRight size={14} />{use}</li>)}</ul>
        </div>
        <div className={`pv-stage__product${!colourPhoto && index === 0 && cutout ? ' pv-stage__product--pop' : ''}`}>
          {photo?.url && !broken
            // Floating loop adapted from "Product Bounce Card" (ruixen.ui, 21st.dev), slowed down for clothing.
            ? <motion.img key={photo.url} src={photo.url} alt={photo.alt || product.title} onError={() => setBroken(true)} animate={still ? undefined : { y: [0, -10, 0] }} transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }} />
            : <div className="pv-stage__missing">Photo coming soon</div>}
        </div>
        {specs.slice(0, 2).map(([label, value], i) => <span key={label} className={`pv-callout pv-callout--${i + 1}`}><b>{value}</b>{label}<svg viewBox="0 0 120 40" aria-hidden="true"><path d={i ? 'M4 6 C30 2 34 30 60 22 S100 30 116 36' : 'M4 30 C24 40 40 8 64 18 S98 4 116 10'} /></svg></span>)}
        {bigNumber && <span className="pv-stage__number"><b>{bigNumber.value}</b>{bigNumber.label}</span>}
        {photos.length > 1 && <div className="pv-stage__thumbs" aria-label="Product photos">
          {photos.slice(0, 6).map((image, i) => <button key={image.url + i} type="button" className={!colourPhoto && i === index ? 'active' : ''} onClick={() => { setIndex(i); setShowColour(false); setBroken(false); }} aria-label={`Photo ${i + 1}`} aria-pressed={i === index}><img src={image.url} alt="" loading="lazy" /><span>{String(i + 1).padStart(2, '0')}</span></button>)}
        </div>}
      </div>

      <aside className="pv-buy">
        <span className="pv-buy__tag">{variant === 'men' ? 'Men · Formal' : (product.storeSubcategoryLabel ?? product.storeCollectionLabel ?? 'Occasion')}</span>
        <h1>{product.title}</h1>
        <div className="pv-buy__price">{price}{canBuy && product.compareAtCents && <del>{formatMoney(product.compareAtCents, product.currency)}</del>}</div>
        {product.description && <p className="pv-buy__desc">{product.description}</p>}
        {specs.length > 0 && <dl className="pv-buy__specs">{specs.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>}
        {!isWoo && canBuy && <div className="pv-buy__sizes">
          {colours.length > 0 && <>
            <span>Choose your colour {sizeHint && !colour && <em>· pick one first</em>}</span>
            <div role="group" aria-label="Colours">{colours.map((item) => <button key={item} type="button" className={colour === item ? 'active' : ''} aria-pressed={colour === item} onClick={() => { setColour(item); setShowColour(true); setBroken(false); setSize(''); setAdded(false); setSizeHint(false); }}>{item}</button>)}</div>
          </>}
          {(!colours.length || colour) && <>
            <span>Choose your size {sizeHint && !size && <em>· pick one first</em>}</span>
            <div role="group" aria-label="Sizes">{sizeChoices.map((item) => <button key={item.label} type="button" className={size === item.label ? 'active' : ''} aria-pressed={size === item.label} onClick={() => { setSize(item.label); setAdded(false); setSizeHint(false); }}>{item.size}</button>)}</div>
          </>}
        </div>}
        <div className="pv-buy__row">{isWoo
          ? (canBuy && product.woocommercePermalink
            ? <a className="pv-buy__cta" href={product.woocommercePermalink}>Choose options <ArrowRight size={18} /></a>
            : <button type="button" className="pv-buy__cta" disabled>Unavailable</button>)
          : canBuy
            ? <button type="button" className="pv-buy__cta" onClick={addToBag}>{added ? <>Added to bag <Check size={18} /></> : <>Add to bag <ShoppingBag size={18} /></>}</button>
            : <button type="button" className="pv-buy__cta" disabled>Coming soon</button>}
          <WishButton productId={product.id} title={product.title} className="pv-wish" /></div>
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
