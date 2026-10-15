import { useRef, useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import type { Product } from '../types/product';
import { formatMoney } from '../lib/format';
import { fullSizeImage } from '../lib/images';
import { editorialImageFor } from '../lib/editorialImages';
import { productBackdropFor } from '../lib/productBackdrop';

const spring = { stiffness: 180, damping: 18, mass: 0.6 };

export function ProductCard({ product, index = 0 }: { product: Product; index?: number }) {
  const frame = useRef<HTMLAnchorElement>(null);
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const rotateX = useSpring(useTransform(py, [0, 1], [7, -7]), spring);
  const rotateY = useSpring(useTransform(px, [0, 1], [-9, 9]), spring);
  const glare = useTransform([px, py], ([x, y]: number[]) => `radial-gradient(circle at ${x * 100}% ${y * 100}%, rgba(255,255,255,.38), rgba(255,255,255,0) 55%)`);
  const initialImage = fullSizeImage(product.images[0]?.url);
  const [usingEditorial, setUsingEditorial] = useState(!initialImage);
  const [src, setSrc] = useState(initialImage || editorialImageFor(product.color));
  const [fallbackFailed, setFallbackFailed] = useState(false);
  const second = product.images[1];

  function handleImageError() {
    if (!usingEditorial) {
      setUsingEditorial(true);
      setSrc(editorialImageFor(product.color));
      return;
    }
    setFallbackFailed(true);
  }

  function onMove(event: React.PointerEvent) {
    if (event.pointerType !== 'mouse' || !frame.current) return;
    const box = frame.current.getBoundingClientRect();
    px.set((event.clientX - box.left) / box.width);
    py.set((event.clientY - box.top) / box.height);
  }
  function onLeave() { px.set(0.5); py.set(0.5); }

  return (
    <motion.article
      className="product-card"
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.1 }}
      transition={{ duration: 0.7, delay: (index % 4) * 0.08, ease: [0.22, 1, 0.36, 1] }}
      layout
    >
      <motion.div className="product-card__stage" style={{ rotateX, rotateY, transformPerspective: 900 }}>
        <Link ref={frame} to={`/product/${product.slug}`} className="product-card__image" style={{ background: productBackdropFor(product.color, product.title) }} aria-label={`View ${product.title}`} onPointerMove={onMove} onPointerLeave={onLeave}>
          {!fallbackFailed
            ? <img
                className={usingEditorial ? 'product-card__photo product-card__photo--editorial' : 'product-card__photo product-card__photo--supplier'}
                src={src}
                alt={usingEditorial
                  ? `Editorial inspiration for ${product.title}; this is not an exact product photograph`
                  : product.images[0]?.alt ?? product.title}
                loading="lazy"
                onError={handleImageError}
              />
            : <div style={{ display: 'grid', placeItems: 'center', width: '100%', height: '100%', minHeight: 280, background: 'linear-gradient(145deg, #eee2d8, #c9b0a2)', color: '#4d4038', textAlign: 'center', padding: 24 }}>
                <span style={{ letterSpacing: '.18em', fontSize: 11 }}>DAVINOVA</span>
                <span style={{ marginTop: 8, fontFamily: 'Georgia, serif', fontSize: 23 }}>The occasion edit</span>
                <span style={{ marginTop: 10, fontSize: 11 }}>Image coming soon</span>
              </div>}
          {usingEditorial && !fallbackFailed && <span style={{ position: 'absolute', left: 12, bottom: 12, zIndex: 3, background: 'rgba(255,253,251,.92)', color: '#5d4b42', padding: '7px 9px', fontSize: 9, letterSpacing: '.08em' }}>EDITORIAL INSPIRATION · NOT EXACT ITEM</span>}
          {second && !usingEditorial && <img className="product-card__photo product-card__photo--supplier product-card__alt" src={fullSizeImage(second.url)} alt="" loading="lazy" aria-hidden="true" />}
          <motion.span className="product-card__glare" style={{ background: glare }} aria-hidden="true" />
          {(product.browseOnly || !product.supplierVerified) && <span className="product-card__badge">Coming soon</span>}
          {!(product.browseOnly || !product.supplierVerified) && product.compareAtCents && <span className="product-card__badge">A considered find</span>}
          {!(product.browseOnly || !product.supplierVerified) && product.featured && !product.compareAtCents && <span className="product-card__badge">Editor’s pick</span>}
          <span className="product-card__arrow" aria-hidden="true"><ArrowUpRight size={18} /></span>
        </Link>
      </motion.div>
      <div className="product-card__meta"><div><p className="eyebrow">{product.browseOnly || !product.supplierVerified ? 'A new selection · Details to follow' : product.length ? `${product.color} · ${product.length}` : product.color}</p><h3><Link to={`/product/${product.slug}`}>{product.title}</Link></h3></div><p className="product-card__price">{product.browseOnly || !product.supplierVerified ? 'Coming soon' : <>{formatMoney(product.priceCents)}{product.compareAtCents && <del>{formatMoney(product.compareAtCents)}</del>}</>}</p></div>
    </motion.article>
  );
}
