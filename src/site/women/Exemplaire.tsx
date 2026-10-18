import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, ArrowUpRight } from 'lucide-react';
import type { Product } from '../../types/product';
import { productPath } from '../../lib/storefront';
import { useCutouts } from '../../lib/useCutouts';

const COUNT = 11;
const SIDE = 4; // cards visible on each side of the centre

/**
 * "L'Exemplaire": a curved ring of looks around one model. Scroll, swipe, use the arrows or tap a card;
 * whichever look stops in the centre becomes the full-size model behind the ring.
 */
export function Exemplaire({ products }: { products: Product[] }) {
  const cutoutFor = useCutouts();
  const looks = useMemo(() => {
    const worn = products.filter((product) => cutoutFor(product.id) && !cutoutFor(product.id)?.endsWith('.float.webp'));
    const dresses = worn.filter((product) => product.storeCollection === 'weddings-and-events');
    return [...dresses, ...worn.filter((product) => !dresses.includes(product))].slice(0, COUNT);
  }, [products, cutoutFor]);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const drag = useRef<{ x: number; moved: boolean } | null>(null);
  const wheelLock = useRef(0);
  const total = looks.length;

  const go = useCallback((step: number) => setActive((index) => (index + step + total) % Math.max(total, 1)), [total]);

  useEffect(() => {
    if (paused || total < 2) return;
    const timer = window.setInterval(() => go(1), 4500);
    return () => window.clearInterval(timer);
  }, [paused, total, go]);

  if (total < 3) return null;
  const look = looks[active];

  const onWheel = (event: React.WheelEvent) => {
    const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : 0;
    if (Math.abs(delta) < 12 || Date.now() - wheelLock.current < 450) return;
    wheelLock.current = Date.now();
    go(delta > 0 ? 1 : -1);
  };
  const onDown = (event: ReactPointerEvent) => { drag.current = { x: event.clientX, moved: false }; };
  const onUp = (event: ReactPointerEvent) => {
    const start = drag.current;
    drag.current = null;
    if (!start) return;
    const dx = event.clientX - start.x;
    if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
  };

  return <section className="w-exem" aria-roledescription="carousel" aria-label="L'Exemplaire: choose a look"
    onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
    <div className="w-sec-head">
      <h2>L'<b>Exemplaire</b></h2>
      <p className="w-sec-head__note">Turn the ring. The look that stops in front of you is the one you wear.</p>
    </div>

    <div className="w-exem__stage" onWheel={onWheel} onPointerDown={onDown} onPointerUp={onUp} onPointerCancel={() => { drag.current = null; }}
      tabIndex={0} onKeyDown={(event) => { if (event.key === 'ArrowRight') go(1); if (event.key === 'ArrowLeft') go(-1); }}>
      <AnimatePresence mode="popLayout">
        <motion.img key={look.id} className="w-exem__model" src={cutoutFor(look.id)} alt={look.title} draggable={false}
          initial={{ opacity: 0, scale: 0.96, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 1.02 }} transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }} />
      </AnimatePresence>

      <div className="w-exem__ring">
        {looks.map((product, index) => {
          let offset = index - active;
          if (offset > total / 2) offset -= total;
          if (offset < -total / 2) offset += total;
          const far = Math.abs(offset);
          if (far > SIDE) return null;
          return <button key={product.id} type="button" className={`w-exem__card${offset === 0 ? ' is-active' : ''}`}
            style={{ '--o': offset, '--a': far, zIndex: 10 - far } as CSSProperties}
            aria-label={offset === 0 ? `${product.title} (shown)` : `Show ${product.title}`} aria-current={offset === 0}
            onClick={() => setActive(index)}>
            <img src={cutoutFor(product.id)} alt="" loading="lazy" draggable={false} />
          </button>;
        })}
      </div>

      <button type="button" className="w-exem__nav w-exem__nav--prev" aria-label="Previous look" onClick={() => go(-1)}><ArrowLeft size={18} /></button>
      <button type="button" className="w-exem__nav w-exem__nav--next" aria-label="Next look" onClick={() => go(1)}><ArrowRight size={18} /></button>
    </div>

    <div className="w-exem__caption" aria-live="polite">
      <span className="w-exem__count">{String(active + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}</span>
      <strong>{look.title}</strong>
      <Link to={productPath(look)} className="w-exem__go">Wear this look <ArrowUpRight size={16} /></Link>
    </div>
  </section>;
}
