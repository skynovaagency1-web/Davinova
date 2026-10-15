import { useRef, useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import type { Product } from '../types/product';
import { formatMoney } from '../lib/format';
import { fullSizeImage } from '../lib/images';

const spring = { stiffness: 180, damping: 18, mass: 0.6 };

export function ProductCard({ product, index = 0 }: { product: Product; index?: number }) {
  const frame = useRef<HTMLAnchorElement>(null);
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const rotateX = useSpring(useTransform(py, [0, 1], [7, -7]), spring);
  const rotateY = useSpring(useTransform(px, [0, 1], [-9, 9]), spring);
  const glare = useTransform([px, py], ([x, y]: number[]) => `radial-gradient(circle at ${x * 100}% ${y * 100}%, rgba(255,255,255,.38), rgba(255,255,255,0) 55%)`);
  const [src, setSrc] = useState(fullSizeImage(product.images[0]?.url));
  const second = product.images[1];

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
        <Link ref={frame} to={`/product/${product.slug}`} className="product-card__image" aria-label={`View ${product.title}`} onPointerMove={onMove} onPointerLeave={onLeave}>
          <img
            src={src}
            alt={product.images[0]?.alt ?? product.title}
            loading="lazy"
            onError={() => { if (src !== product.images[0]?.url) setSrc(product.images[0]?.url); }}
          />
          {second && <img className="product-card__alt" src={fullSizeImage(second.url)} alt="" loading="lazy" aria-hidden="true" />}
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
