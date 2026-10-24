import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDown, ArrowUp, ArrowUpRight } from 'lucide-react';
import type { Product } from '../../types/product';
import { isCurvyLook } from '../../lib/curvyLooks';
import { useCutouts } from '../../lib/useCutouts';
import { productPath } from '../../lib/storefront';

const SIDE = 2; // panels shown above and below the front one
const TONES = ['#e3d2bd', '#5a4536', '#2e2019', '#cdb69e', '#8e735b'];

/**
 * The curve edit (owner 2026-10-24): copy on a cream card, curvy looks on panels around an arc.
 * The arc turns like the Fashion show ring: on its own, with the wheel, a swipe, the arrows or a tap.
 */
export function CurvyEdit({ products }: { products: Product[] }) {
  const cutoutFor = useCutouts();
  const curvy = products.filter((product) => isCurvyLook(product) && cutoutFor(product.id));
  const total = curvy.length;
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const drag = useRef<{ y: number; x: number } | null>(null);
  const wheelLock = useRef(0);
  const go = useCallback((step: number) => setActive((index) => (index + step + total) % Math.max(total, 1)), [total]);

  useEffect(() => {
    if (paused || total < 2) return;
    const timer = window.setInterval(() => go(1), 4000);
    return () => window.clearInterval(timer);
  }, [paused, total, go]);

  if (total < 3) return null;
  const look = curvy[active % total];

  const onWheel = (event: React.WheelEvent) => {
    const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : 0;
    if (Math.abs(delta) < 12 || Date.now() - wheelLock.current < 450) return;
    wheelLock.current = Date.now();
    go(delta > 0 ? 1 : -1);
  };
  const onDown = (event: ReactPointerEvent) => { drag.current = { x: event.clientX, y: event.clientY }; };
  const onUp = (event: ReactPointerEvent) => {
    const start = drag.current;
    drag.current = null;
    if (!start) return;
    const dx = event.clientX - start.x, dy = event.clientY - start.y;
    const move = Math.abs(dx) > Math.abs(dy) ? -dx : -dy;
    if (Math.abs(move) > 40) go(move > 0 ? 1 : -1);
  };

  return <section className="w-curvy" aria-roledescription="carousel" aria-label="The curve edit"
    onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
    <div className="w-curvy__copy">
      <span className="w-curvy__brand">DAVINOVA <small>CURVE EDIT</small></span>
      <i className="w-curvy__rule" />
      <h2>Every occasion, <b>every size</b></h2>
      <p>{total} looks cut for curves, from wedding guest gowns to party dresses.</p>
      <i className="w-curvy__rule" />
      <div className="w-curvy__now" aria-live="polite">
        <span>{String(active + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}</span>
        <strong>{look.title}</strong>
      </div>
      <div className="w-curvy__ctas">
        <Link to={productPath(look)} className="nova-pill-button">Wear this look <ArrowUpRight size={16} /></Link>
        <Link to="/shop?fit=curvy" className="w-curvy__all">Shop curvy →</Link>
      </div>
    </div>

    <div className="w-curvy__arc" onWheel={onWheel} onPointerDown={onDown} onPointerUp={onUp} onPointerCancel={() => { drag.current = null; }}
      tabIndex={0} onKeyDown={(event) => { if (event.key === 'ArrowDown' || event.key === 'ArrowRight') go(1); if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') go(-1); }}>
      {curvy.map((product, index) => {
        let offset = index - active;
        if (offset > total / 2) offset -= total;
        if (offset < -total / 2) offset += total;
        const far = Math.abs(offset);
        if (far > SIDE) return null;
        return <button key={product.id} type="button" className={`w-curvy__panel${offset === 0 ? ' is-active' : ''}`}
          style={{ '--o': offset, '--a': far, '--tone': TONES[index % TONES.length], zIndex: 10 - far } as CSSProperties}
          aria-label={offset === 0 ? `${product.title} (shown)` : `Show ${product.title}`} aria-current={offset === 0}
          onClick={() => setActive(index)}>
          <img src={cutoutFor(product.id)} alt="" loading="lazy" draggable={false} />
        </button>;
      })}
      <button type="button" className="w-curvy__nav w-curvy__nav--prev" aria-label="Previous look" onClick={() => go(-1)}><ArrowUp size={16} /></button>
      <button type="button" className="w-curvy__nav w-curvy__nav--next" aria-label="Next look" onClick={() => go(1)}><ArrowDown size={16} /></button>
    </div>
  </section>;
}
