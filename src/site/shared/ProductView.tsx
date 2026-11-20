import { LEGAL } from '../../config/legal';
import { useRegion } from '../../lib/useRegion';
import { cleanDescription } from './cleanDescription';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check, Lock, RotateCcw, ShoppingBag, Truck } from 'lucide-react';
import { useCatalogProducts } from '../../lib/useCatalogProducts';
import { formatMoney } from '../../lib/format';
import { isProductPurchasable, isWooCommerceProduct } from '../../lib/woocommerce';
import { productPath } from '../../lib/storefront';
import { isCurvyLook } from '../../lib/curvyLooks';
import { isGoldVermeil } from './jewelry';
import { useCart } from '../../store/cart';
import { useRecent } from '../../store/recent';
import { deliveryWindow, formatWindow } from '../../lib/delivery';
import { useCutouts } from '../../lib/useCutouts';
import type { Product, ProductSize } from '../../types/product';
import { WishButton } from './WishButton';
import { colourLabel } from '../../lib/productText';

/** Campaign photos the owner picked for certain product types: hoodies get one, jackets and vests another. */
function productBanner(title: string) {
  if (/\bhood(ie|y|ed)\b/i.test(title)) return { src: '/images/banner-hoodie.webp', alt: 'White hoodie with a signature print, shown front and back' };
  if (/\b(jacket|vest|puffer|parka|gilet)\b/i.test(title) && !/\b(suit|tuxedo|waistcoat|blazer)\b/i.test(title)) return { src: '/images/banner-jacket.webp', alt: 'Olive-brown puffer jacket on a model' };
  return null;
}

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
  'date-night-and-party': ['for date night', 'for the party', 'for the club'],
  'formal-wear': ['for the office', 'for the ceremony', 'for the gala'],
  'couple-parent-child-clothing': ['for date night', 'for the holidays', 'for days out together'],
  'parent-child-clothing': ['for family photos', 'for the holidays', 'for days out together'],
  weddings: ['for the ceremony', 'for the first dance', 'for the photos'],
  'womens-sweaters': ['for cool evenings', 'for the weekend', 'for travel'],
  'womens-denim': ['for brunch', 'for the weekend', 'for travel'],
  'tops-and-sets': ['for brunch', 'for the office', 'for the weekend'],
  watches: ['for every day', 'for the occasion', 'as a gift'],
};
const wordByCollection: Record<string, string> = {
  'cocktail-dresses': 'Cocktail', 'evening-dresses': 'Evening', 'wedding-dresses': 'Bridal', 'bridesmaid-dresses': 'Bridesmaid', 'prom-dresses': 'Prom', 'flower-girl-dresses': 'Flower girl',
  'weddings-and-events': 'Occasion', 'date-night-and-party': 'Night out', 'formal-wear': 'Tailored', 'couple-parent-child-clothing': 'Together', 'parent-child-clothing': 'Family', weddings: 'Bridal', 'womens-sweaters': 'Knit', 'womens-denim': 'Denim', 'tops-and-sets': 'Everyday', accessories: 'Finish', watches: 'Time',
};
const keysOf = (item: Product) => [item.storeSubcategory, item.storeCollection, item.shelf].filter((key): key is string => Boolean(key));
const lookup = <T,>(table: Record<string, T>, item: Product) => keysOf(item).map((key) => table[key]).find((value) => value !== undefined);

/** Product page shared by both storefronts: the photo with a frosted glass panel over its left half. */
export function ProductView({ variant }: { variant: Variant }) {
  const { slug } = useParams();
  const { products, loading } = useCatalogProducts();
  const listed = products.find((item) => item.slug === slug);
  const detail = useProductDetail(slug);
  // The shop list is kept light; this page adds the full photo set, colour photos and description.
  const product = listed && detail?.id === listed.id ? { ...listed, images: detail.images.length ? detail.images : listed.images, description: detail.description, colourImages: detail.colourImages } : listed;
  const shopPath = variant === 'men' ? '/men/shop' : '/shop';

  if (!product) {
    return <section className={`pv pv--${variant} pv--empty`}>
      <h1>{loading ? 'Opening this look…' : 'We couldn’t find that look.'}</h1>
      {!loading && <Link className="pv-back" to={shopPath}><ArrowLeft size={15} /> Back to the shop</Link>}
    </section>;
  }
  return <ProductBody key={product.id} product={product} products={products} variant={variant} shopPath={shopPath} />;
}

type Detail = Pick<Product, 'id' | 'images' | 'description' | 'colourImages'>;
const details = new Map<string, Promise<Detail | undefined>>();

/** Full photos and description for one product, fetched once per visit. */
function useProductDetail(slug: string | undefined) {
  const [detail, setDetail] = useState<Detail>();
  useEffect(() => {
    if (!slug) return;
    let alive = true;
    if (!details.has(slug)) details.set(slug, fetch(`/api/catalog?slug=${encodeURIComponent(slug)}`)
      .then((response) => (response.ok ? response.json() : { products: [] }))
      .then((data: { products?: Detail[] }) => data.products?.[0])
      .catch(() => { details.delete(slug); return undefined; }));
    details.get(slug)!.then((value) => { if (alive) setDetail(value); });
    return () => { alive = false; };
  }, [slug]);
  return detail;
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
  // The jacket-page layout (glass card, photo counter, next-piece card) is only for floating clothes with no model (owner, 2026-11-15).
  const floating = Boolean(cutout?.endsWith('.float.webp'));
  const recentIds = useRecent((state) => state.ids);
  const seen = useRecent((state) => state.seen);
  // Read the list as it was before this visit, then record this product.
  const [recentBefore] = useState(recentIds);
  useEffect(() => { window.scrollTo({ top: 0 }); seen(product.id); }, [product.id, seen]);
  const prefix = variant === 'men' ? '/men' : '';
  const arrival = formatWindow(deliveryWindow());

  const [colour, setColour] = useState('');
  // After a colour is picked the big photo shows that colour, until a thumbnail is clicked.
  const [showColour, setShowColour] = useState(false);
  const colourPhoto = showColour && colour ? product.colourImages?.[colour] : undefined;
  const photos = product.images;
  // The first view uses the cut-out (if one exists) so the dress stands out of the poster.
  const photo = colourPhoto ? { url: colourPhoto, alt: `${product.title} in ${colourLabel(colour)}` }
    : index === 0 && cutout ? { url: cutout, alt: photos[0]?.alt ?? product.title } : photos[index] ?? photos[0];
  const isWoo = isWooCommerceProduct(product);
  const canBuy = isWoo ? isProductPurchasable(product) : !product.browseOnly && product.supplierVerified && product.sizes.length > 0;
  const word = variant === 'men' ? 'Formal' : lookup(wordByCollection, product) ?? 'Occasion';
  const uses = variant === 'men' ? ['for the wedding', 'for the dinner', 'for the gala'] : lookup(usesByCollection, product) ?? usesByCollection['weddings-and-events'];
  const specs = ([['Colour', product.color], ['Length', product.length], ['Neckline', product.neckline], ['Sleeve', product.sleeve]] as [string, string | undefined][])
    .filter((entry): entry is [string, string] => Boolean(entry[1]));
  const banner = productBanner(product.title);
  const related = products.filter((item) => item.id !== product.id && item.department === product.department && (product.storeCollection ? item.storeCollection === product.storeCollection : item.shelf === product.shelf) && item.images[0]?.url).slice(0, 8);
  const recent = recentBefore.filter((id) => id !== product.id).map((id) => products.find((item) => item.id === id)).filter((item): item is Product => Boolean(item?.images[0]?.url)).slice(0, 8);
  const region = useRegion();
  const price = canBuy || isWoo ? formatMoney(product.priceCents, product.currency) : 'Coming soon';
  // CJ labels look like "M", "38" or "Black / M"; split colour from size so each gets its own row of buttons.
  const options = product.sizes.map((label) => {
    const cut = label.indexOf(' / ');
    return cut < 0 ? { label, colour: '', size: label } : { label, colour: label.slice(0, cut), size: label.slice(cut + 3) };
  });
  const colours = [...new Set(options.map((option) => option.colour).filter(Boolean))];
  const sizeCount = new Set(options.map((option) => option.size)).size;
  // Big figures on the photo, like the fabric percentages in the owner's reference layout.
  const stats = [
    colours.length > 1 && { value: colours.length, label: 'colours' },
    sizeCount > 1 && { value: sizeCount, label: 'sizes' },
    photos.length > 1 && { value: photos.length, label: 'angles' },
  ].filter((stat): stat is { value: number; label: string } => Boolean(stat)).slice(0, 2);
  const sizeChoices = sortSizes(options.filter((option) => !colours.length || option.colour === colour));

  /** Arrows under the photo walk through the first six photos, like the reference's 01 / 05 counter. */
  function step(by: number) { const count = Math.min(photos.length, 6); setIndex((current) => (current + by + count) % count); setShowColour(false); setBroken(false); }
  function pickColour(item: string) { setColour(item); setShowColour(true); setBroken(false); setSize(''); setAdded(false); setSizeHint(false); }
  // The small tile in the corner shows the next style that has its own photo, like the owner's reference.
  const withPhoto = colours.filter((item) => product.colourImages?.[item]);
  const nextColour = withPhoto.length > 1 ? withPhoto[(withPhoto.indexOf(colour) + 1) % withPhoto.length] : undefined;

  function addToBag() {
    if (!size) { setSizeHint(true); return; }
    add(product, size);
    setAdded(true);
  }

  return <section className={`pv pv--${variant}`}>
    <Link className="pv-back" to={shopPath}><ArrowLeft size={15} /> Back to the shop</Link>
    <div className={`pv2${!colourPhoto && index === 0 && cutout ? ' pv2--pop' : ''}${floating ? ' pv2--float' : ''}`}>
      {/* The blurred copy tints the whole stage in the chosen style's colour (owner's reference: the background follows the colour). */}
      <AnimatePresence initial={false}>
        {photo?.url && !broken && <motion.img key={photo.url} className="pv2__blur" src={photo.url} alt="" aria-hidden="true" initial={{ opacity: 0 }} animate={{ opacity: 0.75 }} exit={{ opacity: 0 }} transition={{ duration: 0.7 }} />}
      </AnimatePresence>
      <div className="pv2__photo">
        {/* The piece stands on a tall glass card and breaks out over its top edge (owner's reference, 2026-11-15). */}
        {floating && photo?.url && !broken && <span className="pv2__card" aria-hidden="true" />}
        <AnimatePresence initial={false} mode="popLayout">
          {photo?.url && !broken
            // A new style flies in from the next-style tile (bottom right) while the old one lifts away.
            ? <motion.div key={photo.url} className="pv2__shot" initial={{ opacity: 0, x: 140, y: 120, scale: 0.55, rotate: 6 }} animate={{ opacity: 1, x: 0, y: 0, scale: 1, rotate: 0 }} exit={{ opacity: 0, x: -120, y: -140, scale: 0.6, rotate: -6 }} transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}>
              {/* Floating loop adapted from "Product Bounce Card" (ruixen.ui, 21st.dev), slowed down for clothing. */}
              <motion.img src={photo.url} alt={photo.alt || product.title} onError={() => setBroken(true)} animate={still ? undefined : { y: [0, -10, 0] }} transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }} />
            </motion.div>
            : <div key="missing" className="pv-stage__missing">Photo coming soon</div>}
        </AnimatePresence>
        {floating && photos.length > 1 && <div className="pv2__count">
          <button type="button" onClick={() => step(-1)} aria-label="Previous photo"><ArrowLeft size={16} /></button>
          <span>{String(index + 1).padStart(2, '0')} / {String(Math.min(photos.length, 6)).padStart(2, '0')}</span>
          <button type="button" onClick={() => step(1)} aria-label="Next photo"><ArrowRight size={16} /></button>
        </div>}
        {floating && !nextColour && related[0] && <Link className="pv2__teaser" to={productPath(related[0])}>
          <span><b>{related[0].title}</b><small>From {formatMoney(related[0].priceCents, related[0].currency)}</small><em>See it <ArrowRight size={12} /></em></span>
          <img src={related[0].images[0].url} alt="" loading="lazy" />
        </Link>}
        {nextColour && product.colourImages?.[nextColour] && <button type="button" className="pv2__next" onClick={() => pickColour(nextColour)} aria-label={`Show ${colourLabel(nextColour)}`}>
          <img src={product.colourImages[nextColour]} alt="" />
          <span>{colourLabel(nextColour)}</span>
        </button>}
        <WishButton productId={product.id} title={product.title} className="pv-wish pv2__heart" />
        {stats.length > 0 && <ul className="pv2__stats">{stats.map((stat) => <li key={stat.label}><b>{stat.value}</b>{stat.label}</li>)}</ul>}
      </div>

      <div className="pv2__panel">
        <nav className="pv2__tabs" aria-label="Collection">
          <Link to={shopPath}>New collection</Link>
          <span>{variant === 'men' ? 'Davinova Homme' : (product.storeSubcategoryLabel ?? product.storeCollectionLabel ?? 'Occasion')}</span>
          <span>{variant === 'men' ? 'Formal' : isCurvyLook(product) ? 'Curve edit' : 'Trend'}</span>
        </nav>

        <div className="pv2__feature">
          <h2>{word} <small>[ new ]</small></h2>
          <p>{uses.join(', ').replace(/^for/, 'Made for')}.</p>
          {specs.length > 0 && <dl>{specs.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>}
        </div>

        {photos.length > 1 && <div className="pv2__angles">
          <h2>Every angle</h2>
          <div aria-label="Product photos">
            {photos.slice(0, 6).map((image, i) => <button key={image.url + i} type="button" className={!colourPhoto && i === index ? 'active' : ''} onClick={() => { setIndex(i); setShowColour(false); setBroken(false); }} aria-label={`Photo ${i + 1}`} aria-pressed={i === index}><img src={image.url} alt="" loading="lazy" /></button>)}
          </div>
        </div>}

        <div className="pv-buy">
          <div className="pv-buy__price">{price}{canBuy && product.compareAtCents && <del>{formatMoney(product.compareAtCents, product.currency)}</del>}</div>
          {!isWoo && canBuy && <div className="pv-buy__sizes">
            {colours.length > 0 && <>
              <span>Choose your colour {sizeHint && !colour && <em>· pick one first</em>}</span>
              <div role="group" aria-label="Colours">{colours.map((item) => <button key={item} type="button" className={colour === item ? 'active' : ''} aria-pressed={colour === item} onClick={() => pickColour(item)}>{product.colourImages?.[item] && <img src={product.colourImages[item]} alt="" loading="lazy" />}{colourLabel(item)}</button>)}</div>
            </>}
            {(!colours.length || colour) && <>
              <span>Choose your size {sizeHint && !size && <em>· pick one first</em>}<Link className="pv-buy__guide" to={`${prefix}/size-guide`}>Size guide</Link></span>
              <div role="group" aria-label="Sizes">{sizeChoices.map((item) => <button key={item.label} type="button" className={size === item.label ? 'active' : ''} aria-pressed={size === item.label} onClick={() => { setSize(item.label); setShowColour(true); setAdded(false); setSizeHint(false); }}>{item.size}</button>)}</div>
            </>}
          </div>}
          {isWoo
            ? (canBuy && product.woocommercePermalink
              ? <a className="pv-buy__cta" href={product.woocommercePermalink}>Choose options <ArrowRight size={18} /></a>
              : <button type="button" className="pv-buy__cta" disabled>Unavailable</button>)
            : canBuy
              ? <button type="button" className="pv-buy__cta" onClick={addToBag}>{added ? <>Added to bag <Check size={18} /></> : <>Add to bag <ShoppingBag size={18} /></>}</button>
              : <button type="button" className="pv-buy__cta" disabled>Coming soon</button>}
          {added && <Link className="pv-buy__bag" to={variant === 'men' ? '/men/bag' : '/bag'}>View bag & checkout <ArrowRight size={14} /></Link>}
          {canBuy && <p className="pv-buy__eta"><Truck size={15} aria-hidden="true" /> Order today, arrives <b>{arrival}</b></p>}
          {canBuy && <ul className="pv-buy__trust">
            <li><Truck size={14} aria-hidden="true" />Free shipping</li>
            <li><RotateCcw size={14} aria-hidden="true" />30-day returns</li>
            <li><Lock size={14} aria-hidden="true" />Secure checkout</li>
          </ul>}
          {isGoldVermeil(product) && <p className="pv-buy__vermeil" role="note"><b>Gold vermeil, not solid gold.</b> A layer of real gold over 925 sterling silver. Keep it away from water, perfume and polish so the gold lasts.</p>}
          {canBuy && region?.eu && <p className="pv-buy__note pv-buy__note--eu">{region.euOpen ? 'Price includes VAT. Free delivery, nothing more to pay on arrival.' : 'Delivery to Europe opens soon. Join the list below to hear first.'}</p>}
          <p className="pv-buy__note">{canBuy ? 'Sizes, stock and price are rechecked at secure checkout.' : 'We’re still confirming sizes, stock and delivery for this piece.'}</p>
          {product.description && <details><summary>About this piece</summary><p>{cleanDescription(product.description)}</p></details>}
          <details><summary>Product safety</summary><p>Responsible person in the EU: {LEGAL.owner} ({LEGAL.tradeName}), {LEGAL.address}. Questions or a safety concern? Email <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>.</p></details>
          <details><summary>Delivery & returns</summary><p>Delivery options and our return policy are shown before you pay. See <Link to={`${prefix}/shipping`}>shipping</Link> and <Link to={`${prefix}/returns`}>returns</Link>.</p></details>
        </div>

        <div className="pv2__name"><strong>{word}</strong><h1>{product.title}</h1></div>
      </div>
    </div>

    {canBuy && !isWoo && <div className="pv-sticky">
      <img src={product.images[0]?.url} alt="" />
      <div><strong>{product.title}</strong><span>{price}</span></div>
      <button type="button" onClick={() => { if (size) addToBag(); else { setSizeHint(true); document.querySelector('.pv-buy__sizes')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); } }}>{added ? 'Added' : size ? 'Add to bag' : 'Choose size'}</button>
    </div>}
    {banner && <figure className="pv-banner"><img src={banner.src} alt={banner.alt} loading="lazy" /></figure>}
    {related.length > 0 && <div className="pv-related">
      <h2>Complete the <b>look</b></h2>
      <div className="pv-related__rail">{related.map((item) => <Link key={item.id} to={productPath(item)} className="pv-related__item"><span><img src={item.images[0].url} alt="" loading="lazy" /></span><strong>{item.title}</strong></Link>)}</div>
    </div>}
    {recent.length > 0 && <div className="pv-related pv-recent">
      <h2>Recently <b>viewed</b></h2>
      <div className="pv-related__rail">{recent.map((item) => <Link key={item.id} to={productPath(item)} className="pv-related__item"><span><img src={item.images[0].url} alt="" loading="lazy" /></span><strong>{item.title}</strong></Link>)}</div>
    </div>}
  </section>;
}
