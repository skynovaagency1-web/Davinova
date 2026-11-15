import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Play, RotateCcw, X } from 'lucide-react';
import type { Product } from '../../types/product';
import { JEWELRY_COLLECTION } from '../../lib/storeCollectionTaxonomy';
import '../../styles/watch-explode.css';

/** Watches only: the jewelry collection's watch shelves, or a title that says watch. */
export const isWatch = (product: Product) =>
  (product.storeCollection === JEWELRY_COLLECTION && /watches/.test(product.storeSubcategory ?? '')) || /\bwatch(es)?\b/i.test(product.title);

/**
 * The owner's reference (a watch film where the piece comes apart along its axis and builds itself again),
 * made from the product photo itself: the photo is cut into rings around the dial (strap, case, bezel, dial,
 * hands), the stack turns side-on, the rings spread apart in 3D, hold, then fly back together.
 * Watches are photographed upright with the dial facing us, so the dial sits in the middle of the photo.
 */
const LAYERS = [
  { key: 'strap', label: 'Strap', mask: 'radial-gradient(circle at 50% 50%, transparent 0 31%, #000 31.4%)' },
  { key: 'case', label: 'Case', mask: 'radial-gradient(circle at 50% 50%, transparent 0 25%, #000 25.4% 31.4%, transparent 31.8%)' },
  { key: 'bezel', label: 'Bezel', mask: 'radial-gradient(circle at 50% 50%, transparent 0 20%, #000 20.4% 25.4%, transparent 25.8%)' },
  { key: 'dial', label: 'Dial', mask: 'radial-gradient(circle at 50% 50%, transparent 0 7%, #000 7.4% 20.4%, transparent 20.8%)' },
  { key: 'hands', label: 'Hands', mask: 'radial-gradient(circle at 50% 50%, #000 0 7.4%, transparent 7.8%)' },
];
/** One loop: turn side-on, come apart, hold, come back together, turn to face us. */
const TIMES = [0, 0.14, 0.34, 0.62, 0.84, 1];
const DURATION = 7.5;

export function WatchExplode({ product, src, variant }: { product: Product; src?: string; variant: 'women' | 'men' }) {
  const [open, setOpen] = useState(false);
  const [run, setRun] = useState(0);
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = overflow; };
  }, [open]);
  if (!src) return null;
  // Cut-outs have no background, so they float on black like the film; plain photos sit on a light stage where white disappears.
  const clean = /\/cutouts\//.test(src);
  // Spread the rings less on phones so the whole watch stays on screen.
  const gap = typeof window === 'undefined' ? 120 : Math.min(120, window.innerWidth / 7);

  return <>
    <button type="button" className={`wx-open wx-open--${variant}`} onClick={() => { setRun((value) => value + 1); setOpen(true); }}>
      <span className="wx-open__ring"><Play size={16} /></span>
      <span>See inside</span>
    </button>
    {typeof document !== 'undefined' && createPortal(<AnimatePresence>
      {open && <motion.div className={`wx wx--${variant}${clean ? '' : ' wx--light'}`} role="dialog" aria-modal="true" aria-label={`${product.title}, piece by piece`}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }} onClick={() => setOpen(false)}>
        <div className="wx__bar" onClick={(event) => event.stopPropagation()}>
          <span className="wx__brand">DAVINOVA · Piece by piece</span>
          <div className="wx__actions">
            <button type="button" onClick={() => setRun((value) => value + 1)} aria-label="Play again"><RotateCcw size={16} /></button>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close"><X size={18} /></button>
          </div>
        </div>
        <div className="wx__scene" onClick={(event) => event.stopPropagation()}>
          <motion.div key={run} className="wx__stack" initial={{ rotateY: 0, rotateX: 0 }}
            animate={{ rotateY: [0, -62, -62, -62, -62, 0], rotateX: [0, 8, 8, 8, 8, 0] }}
            transition={{ duration: DURATION, times: TIMES, ease: 'easeInOut', repeat: 1 }}>
            {LAYERS.map((layer, i) => {
              const z = (i - (LAYERS.length - 1) / 2) * gap;
              return <motion.div key={layer.key} className="wx__layer" initial={{ z: 0 }}
                animate={{ z: [0, 0, z, z, 0, 0], rotateZ: [0, 0, (i % 2 ? 1 : -1) * 18, (i % 2 ? 1 : -1) * 24, 0, 0] }}
                transition={{ duration: DURATION, times: TIMES, ease: [0.65, 0, 0.35, 1], repeat: 1, delay: i * 0.04 }}>
                <img src={src} alt={i === 0 ? product.title : ''} style={{ WebkitMaskImage: layer.mask, maskImage: layer.mask }} draggable={false} />
                <motion.span className="wx__tag" initial={{ opacity: 0 }} animate={{ opacity: [0, 0, 0, 1, 0, 0] }}
                  transition={{ duration: DURATION, times: TIMES, repeat: 1, delay: 0.1 + i * 0.06 }}>{layer.label}</motion.span>
              </motion.div>;
            })}
          </motion.div>
          <span className="wx__sweep" key={`s${run}`} aria-hidden="true" />
        </div>
        <p className="wx__caption" onClick={(event) => event.stopPropagation()}>{product.title}</p>
      </motion.div>}
    </AnimatePresence>, document.body)}
  </>;
}
