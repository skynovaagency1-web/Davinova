import { Link } from 'react-router-dom';
import { useCatalogProducts } from '../../lib/useCatalogProducts';
import { WomenCard } from './WomenCard';

/** Products filed under this collection are the print-on-demand range. */
export const CUSTOM_COLLECTION = 'davinova-custom';

const promises = [
  ['Printed for you', 'Every piece is printed when you order it, never sitting in a warehouse.'],
  ['For the whole party', 'Matching pieces for the bride, her bridesmaids and the groom’s crew.'],
  ['Same free express delivery', 'Tracked to your door, like everything at Davinova.'],
] as const;

const designs = [
  { word: 'Bride', item: 'Satin robe' },
  { word: 'Bridesmaid', item: 'Tee' },
  { word: 'Maid of Honor', item: 'Tote bag' },
  { word: 'Mother of the Bride', item: 'Tee' },
  { word: 'Groom', item: 'Tee' },
  { word: 'Groom Crew', item: 'Tee' },
] as const;

function Print({ word, y }: { word: string; y: number }) {
  return <text x="60" y={y} textAnchor="middle" className="w-custom__print" fontSize={word.length > 12 ? 7 : word.length > 6 ? 10 : 14}>{word}</text>;
}

function Garment({ item, word }: { item: string; word: string }) {
  if (item === 'Tote bag') return <svg viewBox="0 0 120 120" aria-hidden="true" data-no-translate><path d="M44 34c0-12 7-20 16-20s16 8 16 20" fill="none" stroke="currentColor" strokeWidth="3" /><rect x="24" y="34" width="72" height="76" rx="4" /><Print word={word} y={76} /></svg>;
  if (item === 'Satin robe') return <svg viewBox="0 0 120 120" aria-hidden="true" data-no-translate><path d="M42 10h36l28 26-12 12-8-8v72H34V40l-8 8-12-12z" /><path d="M42 10l18 34 18-34" fill="none" stroke="currentColor" strokeWidth="2" /><Print word={word} y={80} /></svg>;
  return <svg viewBox="0 0 120 120" aria-hidden="true" data-no-translate><path d="M42 12h36l30 20-12 18-12-8v70H36V42l-12 8-12-18z" /><Print word={word} y={64} /></svg>;
}

/** The two looping photos (owner's pick): clothes pouring from a box, and thread spun into a shirt. */
const loops = [
  { src: '/images/pod-loop-falling.webp', alt: 'Colourful shirts falling out of an open box onto a pile', caption: 'Printed when you order', motion: 'fall' },
  { src: '/images/pod-loop-recycle.webp', alt: 'A bottle turning into thread, and the thread into a black polo shirt', caption: 'Made to order, less waste', motion: 'flow' },
] as const;

/** Custom: Davinova's own print-on-demand designs for the wedding party. */
export function CustomPage({ dept }: { dept: 'women' | 'men' }) {
  const { products, loading } = useCatalogProducts();
  const custom = products.filter((product) => product.storeCollection === CUSTOM_COLLECTION);

  return <section className="w-watches w-custom">
    <div className="w-watches__hero">
      <div className="w-watches__copy">
        <span className="nova-chip">New · Davinova Custom</span>
        <h1>Made for <b>the party</b></h1>
        <p>Our own designs, printed on demand for the bride, her bridesmaids and the groom’s crew.</p>
        <ul>{promises.map(([title, line]) => <li key={title}><strong>{title}</strong><span>{line}</span></li>)}</ul>
        <Link className="dm-cta-link" to={dept === 'men' ? '/men/custom/design' : '/custom/design'}>Design your own →<small>Tee, hoodie, tote or mug with your picture or words</small></Link>
      </div>
      <div className="w-custom__wall">
        {designs.map((design) => <figure key={design.word} className="w-custom__piece">
          <Garment item={design.item} word={design.word} />
          <figcaption><b>{design.word}</b><span>{design.item}</span></figcaption>
        </figure>)}
      </div>
    </div>

    <div className="pod-loop">
      {loops.map((loop) => <figure key={loop.src} className={`pod-loop__frame pod-loop__frame--${loop.motion}`}>
        <img src={loop.src} alt={loop.alt} loading="lazy" />
        <figcaption>{loop.caption}</figcaption>
      </figure>)}
    </div>

    <div className="w-sec-head"><h2>All <b>custom</b></h2><p className="w-sec-head__note">{loading ? 'Loading…' : `${custom.length} pieces`}</p></div>
    {custom.length > 0
      ? <div className="w-grid">{custom.map((product, index) => <WomenCard key={product.id} product={product} index={index} />)}</div>
      : !loading && <div className="w-watches__empty">
        <strong>The first designs are being printed.</strong>
        <span>{dept === 'men' ? 'Join the list at the bottom of the page to hear first. In the meantime, find the suit to wear on the day.' : 'Join the list at the bottom of the page to hear first. In the meantime, find the dress to wear on the day.'}</span>
        <Link to={dept === 'men' ? '/men/shop' : '/shop'}>{dept === 'men' ? 'Shop suits →' : 'Shop dresses →'}</Link>
      </div>}
  </section>;
}
