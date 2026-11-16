import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, ChevronLeft, ChevronRight, Plus, ShoppingBag, X } from 'lucide-react';
import type { Product, ProductSize } from '../../types/product';
import { useCatalogProducts } from '../../lib/useCatalogProducts';
import { useCutouts, isFullLook } from '../../lib/useCutouts';
import { TRENDING_LOOKS } from '../../lib/trendingLooks';
import { ITEM_BOX, LOOK_FIT, WEARABLE } from '../../lib/lookHands';
import { JEWELRY_COLLECTION, WOMEN_BAGS, WOMEN_SHOES } from '../../lib/storeCollectionTaxonomy';
import { isKidsPiece } from '../../lib/kids';
import { formatMoney } from '../../lib/format';
import { productPath } from '../../lib/storefront';
import { useCart } from '../../store/cart';
import '../../styles/looks.css';

type Dept = 'women' | 'men';
/** Where a piece is worn on the model, as a share of the model photo (x from left, y from top). */
interface Slot { key: string; label: string; side: 'left' | 'right'; at: [number, number]; pick: (product: Product) => boolean }

const sub = (collection: string, ...subs: string[]) => (product: Product) => product.storeCollection === collection && subs.includes(product.storeSubcategory ?? '');

// The reference: glowing glass cards on both sides of the model, each joined by a light line to where the piece is worn.
const SLOTS: Record<Dept, Slot[]> = {
  women: [
    { key: 'necklace', label: 'Necklace', side: 'left', at: [0.5, 0.2], pick: (product) => Boolean(WEARABLE.women.necklace?.includes(product.id)) },
    { key: 'bag', label: 'Bag', side: 'left', at: [0.3, 0.5], pick: (product) => product.storeCollection === WOMEN_BAGS && Boolean(WEARABLE.women.bag?.includes(product.id)) },
    { key: 'shoes', label: 'Heels', side: 'left', at: [0.45, 0.95], pick: sub(WOMEN_SHOES, 'pumps', 'woman-sandals') },
    { key: 'hair', label: 'Hair jewel', side: 'right', at: [0.55, 0.05], pick: (product) => Boolean(WEARABLE.women.hair?.includes(product.id)) },
    { key: 'bracelet', label: 'Bracelet', side: 'right', at: [0.7, 0.48], pick: (product) => Boolean(WEARABLE.women.bracelet?.includes(product.id)) },
    { key: 'watch', label: 'Watch', side: 'right', at: [0.68, 0.52], pick: (product) => Boolean(WEARABLE.women.watch?.includes(product.id)) },
  ],
  men: [
    { key: 'tie', label: 'Tie', side: 'left', at: [0.5, 0.24], pick: sub('mens-accessories', 'ties-and-bow-ties') },
    { key: 'belt', label: 'Belt', side: 'left', at: [0.5, 0.45], pick: sub('mens-accessories', 'belts-and-suspenders') },
    { key: 'shoes', label: 'Shoes', side: 'left', at: [0.45, 0.96], pick: sub('mens-accessories', 'formal-shoes') },
    { key: 'cufflinks', label: 'Cufflinks', side: 'right', at: [0.27, 0.53], pick: sub(JEWELRY_COLLECTION, 'cufflinks') },
    { key: 'watch', label: 'Watch', side: 'right', at: [0.73, 0.52], pick: (product) => Boolean(WEARABLE.men.watch?.includes(product.id)) },
    { key: 'bag', label: 'Briefcase', side: 'right', at: [0.78, 0.62], pick: (product) => Boolean(WEARABLE.men.bag?.includes(product.id)) },
  ],
};

const COLOURS = ['black', 'white', 'ivory', 'cream', 'beige', 'nude', 'champagne', 'gold', 'silver', 'red', 'burgundy', 'wine', 'pink', 'blush', 'purple', 'lavender', 'blue', 'navy', 'green', 'emerald', 'sage', 'brown', 'tan', 'camel', 'khaki', 'grey', 'gray', 'orange', 'yellow'];
const NEUTRAL = /\b(black|white|silver|gold|nude|beige|champagne|ivory|clear)\b/i;
const colourOf = (product: Product) => COLOURS.find((colour) => new RegExp(`\\b${colour}\\b`, 'i').test(`${product.title} ${product.color}`));

/** Men's looks need tailoring (a tie and dress shoes don't go with loungewear); suits and tuxedos lead. */
const TAILORING = ['wedding-suits', 'tuxedos-and-dinner-jackets', 'linen-and-summer-suits', 'blazers-and-waistcoats'];
const heroRank = (product: Product, dept: Dept) => dept === 'women' ? 0 : TAILORING.indexOf(product.storeSubcategory ?? '');

/** A small seeded random, so the looks change once a day but stay the same all day for everyone. */
function seeded(seed: number) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const shuffle = <T,>(list: T[], random: () => number) => { const copy = [...list]; for (let i = copy.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [copy[i], copy[j]] = [copy[j], copy[i]]; } return copy; };
/** Today's number (UTC), which picks today's outfits. */
export const lookDay = () => Math.floor(Date.now() / 86_400_000);

export interface LookPiece { slot: Slot; options: Product[]; start: number }
/** Today's looks: outfits on a model, each with every matching piece per slot (best match first) so customers can swap. */
function buildLooks(products: Product[], dept: Dept, hasCutout: (product: Product) => boolean, day: number) {
  const random = seeded(day * 31 + (dept === 'men' ? 7 : 3));
  const shop = products.filter((product) => product.department === dept && product.priceCents > 0 && !product.browseOnly);
  const heroes = shuffle(shop.filter((product) => TRENDING_LOOKS.has(product.id) && Boolean(LOOK_FIT[product.id]) && product.storeCollection !== JEWELRY_COLLECTION && !isKidsPiece(product) && hasCutout(product) && heroRank(product, dept) >= 0), random)
    .sort((a, b) => heroRank(a, dept) - heroRank(b, dept));
  const pools = SLOTS[dept].map((slot) => shuffle(shop.filter((product) => slot.pick(product) && product.images[0]?.url), random));
  return heroes.slice(0, 24).map((hero, index) => {
    const colour = colourOf(hero);
    const pieces: LookPiece[] = SLOTS[dept].map((slot, s) => {
      // Same colour first, then neutrals (black, silver, gold...), then the rest; the top few take turns across looks.
      // Bags skip the neutral tier so all the hand-picked bags take turns.
      const score = (product: Product) => (colour && colourOf(product) === colour ? 0 : slot.key !== 'bag' && NEUTRAL.test(product.title) ? 1 : 2);
      const options = [...pools[s]].sort((a, b) => score(a) - score(b));
      return { slot, options, start: options.length ? (index * 3 + s * 7) % Math.min(options.length, 10) : 0 };
    }).filter((piece) => piece.options.length > 0);
    return { hero, pieces };
  });
}

const SWATCH: Record<string, string> = { black: '#141414', white: '#f7f5f0', ivory: '#f4ecd8', cream: '#efe3c8', beige: '#d9c3a1', nude: '#d8b39a', champagne: '#e8d3a8', gold: '#c9a24a', silver: '#c0c3c6', red: '#b3202a', burgundy: '#6d1a2a', wine: '#6d1a2a', pink: '#e9a1b4', blush: '#efc1c6', purple: '#6c3c8c', lavender: '#b9a5d6', blue: '#3b6fb6', navy: '#1f2a4a', green: '#2f6b45', emerald: '#1f6b4f', sage: '#a5aaa3', brown: '#6b4630', tan: '#b8865a', camel: '#b9875a', khaki: '#a99c74', grey: '#8d8d8d', gray: '#8d8d8d', orange: '#d9772f', yellow: '#e2c044' };
const title = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
/** Variants read "White / XS": keep the colour that matches the look and show only the size part. */
function sizeOptions(product: Product, colour?: string) {
  const split = product.sizes.map((value) => { const parts = String(value).split(' / '); return { value, colour: parts.length > 1 ? parts[0] : '', size: parts[parts.length - 1] }; });
  const colours = [...new Set(split.map((option) => option.colour))];
  const want = colours.find((name) => colour && new RegExp(`\\b${colour}\\b`, 'i').test(name)) ?? colours[0];
  return split.filter((option) => option.colour === want);
}
/** Only the outfit and the shoes ask for a size; bags, ties and jewellery take the matching colour. */
const asksSize = (key: string) => key === 'outfit' || key === 'shoes';

/** "Complete the look": a whole outfit on a model with every piece around it, added to the bag in one tap. */
export function LooksPage({ dept }: { dept: Dept }) {
  const { products, loading } = useCatalogProducts();
  const cutoutFor = useCutouts();
  const [params, setParams] = useSearchParams();
  const [day] = useState(lookDay);
  const looks = useMemo(() => buildLooks(products, dept, (product) => isFullLook(cutoutFor(product.id), product.storeCollection), day), [products, dept, cutoutFor, day]);
  const index = Math.min(Math.max(0, Number(params.get('look') ?? 1) - 1 || 0), Math.max(0, looks.length - 1));
  const look = looks[index];
  const go = (next: number) => setParams((current) => { const copy = new URLSearchParams(current); copy.set('look', String(((next + looks.length) % looks.length) + 1)); return copy; }, { replace: true });

  const [sizes, setSizes] = useState<Record<string, ProductSize>>({});
  const [added, setAdded] = useState(false);
  // "Build your look": each slot can be swapped for another matching piece, or taken off the model.
  const [turn, setTurn] = useState<Record<string, number>>({});
  const [off, setOff] = useState<Record<string, boolean>>({});
  const add = useCart((state) => state.add);
  useEffect(() => { setSizes({}); setAdded(false); setTurn({}); setOff({}); }, [index, dept]);

  const base = dept === 'men' ? '/men' : '';
  if (!look) return <section className={`looks looks--${dept}`}><div className="looks__empty">{loading ? 'Loading the looks…' : 'New looks are on their way.'}</div></section>;

  const colour = colourOf(look.hero);
  const chosen = look.pieces.map(({ slot, options, start }) => ({ slot, options, product: options[(((start + (turn[slot.key] ?? 0)) % options.length) + options.length) % options.length], on: !off[slot.key] }));
  const swap = (key: string, by: number) => { setTurn((current) => ({ ...current, [key]: (current[key] ?? 0) + by })); setAdded(false); };
  const toggle = (key: string) => { setOff((current) => ({ ...current, [key]: !current[key] })); setAdded(false); };
  const items = [{ key: 'outfit', label: 'Outfit', product: look.hero }, ...chosen.filter((piece) => piece.on).map(({ slot, product }) => ({ key: slot.key, label: slot.label, product }))]
    .map((item) => ({ ...item, options: sizeOptions(item.product, colourOf(item.product) ?? colour) }));
  const all = items.map((item) => item.product);
  const sized = items.filter((item) => asksSize(item.key) && item.options.length > 1);
  const total = all.reduce((sum, product) => sum + product.priceCents, 0);
  const missing = sized.filter((item) => !sizes[item.product.id]);
  const swatches = [...new Set(all.map(colourOf).filter((value): value is string => Boolean(value)))].slice(0, 5);
  const addAll = () => {
    if (missing.length) return;
    items.forEach((item) => add(item.product, sizes[item.product.id] ?? item.options[0]?.value ?? item.product.sizes[0]));
    setAdded(true);
  };

  const panel = <aside className="looks__panel">
    <span className="looks__eyebrow">Look {String(index + 1).padStart(2, '0')} / {String(looks.length).padStart(2, '0')}</span>
    <h2>{colour ? `The ${title(colour)} Look` : 'The Signature Look'}</h2>
    <span className="looks__edition">— {all.length} pieces, styled together —</span>
    <strong className="looks__price">{formatMoney(total, look.hero.currency)}</strong>
    {sized.map(({ product, label, options }) => <div key={product.id} className="looks__size-row">
      <span>{label} size</span>
      <div className="looks__chips">{options.slice(0, 9).map((option) => <button key={option.value} type="button" className={sizes[product.id] === option.value ? 'active' : ''} onClick={() => { setSizes((current) => ({ ...current, [product.id]: option.value })); setAdded(false); }}>{option.size}</button>)}</div>
    </div>)}
    {swatches.length > 0 && <div className="looks__swatches"><span>Colours: {swatches.join(' / ')}</span><div>{swatches.map((name) => <i key={name} style={{ background: SWATCH[name] }} title={title(name)} />)}</div></div>}
    {added
      ? <Link to={`${base}/bag`} className="looks__add looks__add--done"><Check size={16} />In your bag · view</Link>
      : <button type="button" className="looks__add" onClick={addAll} disabled={missing.length > 0}><ShoppingBag size={16} />{missing.length ? `Choose ${missing.length} size${missing.length > 1 ? 's' : ''}` : 'Add the whole look'}</button>}
    <Link to={productPath(look.hero)} className="looks__ghost">View the outfit</Link>
    <Link to={`${base}/shop`} className="looks__ghost">Explore the collection</Link>
    <div className="looks__arrows">
      <button type="button" className="looks__nav" onClick={() => go(index - 1)} aria-label="Previous look"><ArrowLeft size={18} /></button>
      <button type="button" className="looks__nav" onClick={() => go(index + 1)} aria-label="Next look"><ArrowRight size={18} /></button>
    </div>
  </aside>;

  return <section className={`looks looks--${dept}`}>
    <span className="looks__arch looks__arch--a" aria-hidden="true" /><span className="looks__arch looks__arch--b" aria-hidden="true" />
    <header className="looks__head">
      <span className="looks__eyebrow looks__eyebrow--new">New fashion · today's looks</span>
      <h1>{dept === 'men' ? 'Dressed, head to toe' : 'The whole look, ready to wear'}</h1>
      <p>New outfits every day. Build your own look: swap any piece with the arrows, take it off or put it back, then add it all in one tap.</p>
    </header>

    <AnimatePresence mode="wait">
      <motion.div key={look.hero.id} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}>
        <Stage dept={dept} hero={look.hero} pieces={chosen} onSwap={swap} onToggle={toggle} cutout={cutoutFor(look.hero.id) ?? look.hero.images[0]?.url} photoOf={(product) => cutoutFor(product.id) ?? product.images[0]?.url} panel={panel} />
      </motion.div>
    </AnimatePresence>

    <div className="looks__dots" role="tablist" aria-label="Looks">
      {looks.map((item, i) => <button key={item.hero.id} type="button" role="tab" aria-selected={i === index} aria-label={`Look ${i + 1}`} className={i === index ? 'active' : ''} onClick={() => go(i)} />)}
    </div>
  </section>;
}

/** Cut-outs vary in pose and width, so spots are pulled toward the centre line, which is always on the body. */
const onBody = (x: number) => 0.5 + (x - 0.5) * 0.55;

/** Photo 1's light lines run like circuit traces: straight out of the tile, a 45° run, then straight into the body, with soft corners. */
function circuit(x1: number, y1: number, x2: number, y2: number, lane: number) {
  const dy = y2 - y1;
  const span = x2 - x1;
  const run = Math.min(Math.abs(dy), Math.max(0, span * 0.6));
  const start = x1 + Math.max(14, (span - run) * (0.25 + (lane % 3) * 0.12));
  const knee = start + run;
  const dir = Math.sign(dy) || 1;
  const r = Math.min(10, run / 2, Math.abs(dy) / 2);
  if (run < 1) return `M${x1},${y1} H${x2}`;
  const k = r * 0.7071;
  return `M${x1},${y1} H${start - r} Q${start},${y1} ${start + k},${y1 + dir * k} L${knee - k},${y1 + dir * (Math.abs(dy) - k)} Q${knee},${y2} ${knee + r},${y2} H${x2}`;
}

/** Tile wall on the left, the model in the middle (with its reflection), the look panel on the right, light lines between. */
type Chosen = { slot: Slot; options: Product[]; product: Product; on: boolean };
function Stage({ dept, hero, pieces, onSwap, onToggle, cutout, photoOf, panel }: { dept: Dept; hero: Product; pieces: Chosen[]; onSwap: (key: string, by: number) => void; onToggle: (key: string) => void; cutout?: string; photoOf: (product: Product) => string | undefined; panel: ReactNode }) {
  // Every piece is put on the model (owner, 2026-11-16): bag in the free hand, necklace at the neck, hair jewel on the head,
  // watch and bracelet on the wrists. Shoes stay on their card: the gowns cover the feet.
  const fit = LOOK_FIT[hero.id];
  const wearing = (key: string) => pieces.find((piece) => piece.slot.key === key && piece.on && ITEM_BOX[piece.product.id]);
  const spot = (slot: Slot): [number, number] => {
    if (fit && wearing(slot.key)) {
      if (slot.key === 'bag') return [fit.hand[0], fit.hand[1] + 0.07];
      // Jewellery spots sit just beside the piece so they never cover it.
      const out = (x: number, w: number) => x + (x >= 0.5 ? 1 : -1) * (w / 2 + 0.035);
      if (slot.key === 'necklace') return [fit.neck[0] + fit.neck[2] / 2 + 0.04, fit.neck[1] + 0.03];
      if (slot.key === 'hair') return [fit.head[0] + fit.head[2] / 2 + 0.03, fit.head[1] - 0.02];
      if (slot.key === 'watch') return [out(fit.watch[0], fit.watch[2]), fit.watch[1]];
      if (slot.key === 'bracelet') return [out(fit.bracelet[0], fit.bracelet[2]), fit.bracelet[1]];
    }
    return [onBody(slot.at[0]), slot.at[1]];
  };
  /** Where and how big each worn piece is drawn: left/top in %, size, and how it hangs from that point. */
  const placements = fit ? ([
    ['bag', { left: fit.hand[0], top: fit.hand[1] }],
    ['necklace', { left: fit.neck[0], top: fit.neck[1], width: fit.neck[2] }],
    ['hair', { left: fit.head[0], top: fit.head[1], width: fit.head[2] }],
    ['watch', { left: fit.watch[0], top: fit.watch[1], width: fit.watch[2] }],
    ['bracelet', { left: fit.bracelet[0], top: fit.bracelet[1], width: fit.bracelet[2], rotate: fit.bracelet[3] }],
  ] as const) : [];
  const worn = pieces.filter((piece) => piece.on);
  const stage = useRef<HTMLDivElement>(null);
  const model = useRef<HTMLImageElement>(null);
  const cards = useRef<Record<string, HTMLAnchorElement | null>>({});
  const [paths, setPaths] = useState<{ key: string; d: string }[]>([]);
  const [box, setBox] = useState({ w: 0, h: 0 });
  // Hovering a piece (its tile or its spot on the body) lights the spot, the line and the tile together.
  const [active, setActive] = useState<string | null>(null);
  const hover = (id: string | null) => () => setActive(id);

  useLayoutEffect(() => {
    const draw = () => {
      const root = stage.current?.getBoundingClientRect();
      const body = model.current?.getBoundingClientRect();
      if (!root || !body || window.innerWidth < 980) { setPaths([]); return; }
      setBox({ w: root.width, h: root.height });
      setPaths(worn.map(({ slot, product }, i) => {
        const card = cards.current[product.id]?.getBoundingClientRect();
        if (!card) return { key: product.id, d: '' };
        const x1 = card.right - root.left;
        const y1 = card.top + card.height / 2 - root.top;
        const [sx, sy] = spot(slot);
        const x2 = body.left + body.width * sx - root.left;
        const y2 = body.top + body.height * sy - root.top;
        return { key: product.id, d: circuit(x1, y1, x2, y2, i) };
      }));
    };
    draw();
    const observer = new ResizeObserver(draw);
    if (stage.current) observer.observe(stage.current);
    const image = model.current;
    image?.addEventListener('load', draw);
    return () => { observer.disconnect(); image?.removeEventListener('load', draw); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hero, pieces.map((piece) => `${piece.product.id}${piece.on}`).join()]);

  return <div className="looks__stage" ref={stage}>
    <svg className={`looks__lines${active ? ' looks__lines--focus' : ''}`} width={box.w} height={box.h} viewBox={`0 0 ${box.w || 1} ${box.h || 1}`} aria-hidden="true">
      <defs>
        <linearGradient id="looks-line" x1="0" x2="1"><stop offset="0" className="looks__stop-a" /><stop offset="1" className="looks__stop-b" /></linearGradient>
        <filter id="looks-glow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="3" /></filter>
      </defs>
      {paths.filter((path) => path.d).map((path, i) => <g key={path.key} className={active === path.key ? 'is-active' : ''}>
        <path d={path.d} className="looks__line-glow" filter="url(#looks-glow)" />
        <path d={path.d} className="looks__line" stroke="url(#looks-line)" style={{ animationDelay: `${0.3 + i * 0.12}s` }} />
        <circle r="3.5" className="looks__dot"><animateMotion dur={`${3 + i * 0.4}s`} repeatCount="indefinite" path={path.d} /></circle>
      </g>)}
    </svg>
    <div className="looks__wall">
      {pieces.map(({ slot, product, options, on }, i) => {
        const colour = colourOf(product);
        return <motion.div key={slot.key} className={`looks__slot${on ? '' : ' is-off'}`} initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.12 + i * 0.08, duration: 0.5 }}>
          <Link ref={(node) => { cards.current[product.id] = node; }} to={productPath(product)} className={`looks__card${active === product.id ? ' is-active' : ''}`} onMouseEnter={hover(product.id)} onMouseLeave={hover(null)} onFocus={hover(product.id)} onBlur={hover(null)}>
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.img key={product.id} src={photoOf(product)} alt={product.title} loading="lazy" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.25 }} />
            </AnimatePresence>
            <span className="looks__card-meta"><b>{slot.label}</b><small>{colour ?? formatMoney(product.priceCents, product.currency)}</small></span>
            <span className="looks__card-price">{formatMoney(product.priceCents, product.currency)}</span>
          </Link>
          <div className="looks__swap">
            {options.length > 1 && <button type="button" onClick={() => onSwap(slot.key, -1)} aria-label={`Another ${slot.label.toLowerCase()}`}><ChevronLeft size={14} /></button>}
            <button type="button" className="looks__wear" onClick={() => onToggle(slot.key)} aria-pressed={on}>{on ? <><X size={12} />Take off</> : <><Plus size={12} />Put on</>}</button>
            {options.length > 1 && <button type="button" onClick={() => onSwap(slot.key, 1)} aria-label={`Next ${slot.label.toLowerCase()}`}><ChevronRight size={14} /></button>}
          </div>
        </motion.div>;
      })}
    </div>
    <div className="looks__model">
      <span className="looks__floor" aria-hidden="true" />
      {cutout && <div className="looks__figure">
        <img ref={model} className="looks__body" src={cutout} alt={hero.title} />
        <AnimatePresence>
          {placements.map(([key, at]) => {
            const piece = wearing(key);
            const box = piece && ITEM_BOX[piece.product.id];
            if (!piece || !box) return null;
            const size = key === 'bag'
              ? { height: `${Math.min(dept === 'men' ? 20 : 17, 22 / box[4])}%` }
              : { width: `${('width' in at ? at.width : 0) * 100}%` };
            const hang = key === 'bag' ? '-8%' : key === 'necklace' ? '0%' : key === 'hair' ? '-100%' : '-50%';
            return <motion.span key={`${key}-${piece.product.id}`} className={`looks__worn looks__worn--${key}`} style={{ left: `${at.left * 100}%`, top: `${at.top * 100}%`, ...size, aspectRatio: String(box[4]), x: '-50%', y: hang, rotate: 'rotate' in at ? at.rotate : 0, transformOrigin: '50% 0' }} initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.6 }} transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}>
              <img src={photoOf(piece.product)} alt="" style={{ height: `${100 / (box[3] - box[1])}%`, top: `${(-box[1] / (box[3] - box[1])) * 100}%`, left: `${(-box[0] / (box[2] - box[0])) * 100}%` }} />
            </motion.span>;
          })}
        </AnimatePresence>
        {worn.map(({ slot, product }) => <Link key={product.id} to={productPath(product)} className={`looks__spot${active === product.id ? ' is-active' : ''}`} style={{ left: `${spot(slot)[0] * 100}%`, top: `${spot(slot)[1] * 100}%` }} onMouseEnter={hover(product.id)} onMouseLeave={hover(null)} onFocus={hover(product.id)} onBlur={hover(null)} aria-label={`${slot.label}: ${product.title}`}>
          <span className="looks__spot-tip">{slot.label} · {formatMoney(product.priceCents, product.currency)}</span>
        </Link>)}
      </div>}
      {cutout && <img className="looks__reflection" src={cutout} alt="" aria-hidden="true" />}
    </div>
    {panel}
  </div>;
}
