import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { Product } from '../../types/product';
import { heroFor, type HeroIcon } from '../../lib/categoryHeroes';
import { useCutouts } from '../../lib/useCutouts';
import { TRENDING_LOOKS } from '../../lib/trendingLooks';
import '../../styles/hero.css';

type Props = {
  dept: 'women' | 'men';
  /** Most specific first: sub-category, then category. */
  keys: (string | undefined)[];
  label: string;
  products: Product[];
  count?: string;
  /** Where "Shop now" goes; without it the button scrolls to what follows the hero. */
  to?: string;
};

const PERKS = [['truck', 'Free shipping', 'On every order'], ['gem', 'Premium quality', 'Checked piece by piece'], ['return', 'Easy returns', 'Within 30 days'], ['lock', 'Secure payment', 'Protected checkout']] as const;

/** Category page hero in the owner's three reference styles (stage, pedestal, mono). Product photos come from the page's own list. */
export function CategoryHero({ dept, keys, label, products, count, to }: Props) {
  const hero = heroFor(keys, label, dept);
  const cutoutFor = useCutouts();
  const ref = useRef<HTMLElement>(null);
  // Background-free photos only: hand-checked whole looks first, then floating pieces; never a headless model cut.
  const photos = useMemo(() => {
    const usable = products.filter((product) => { const cut = cutoutFor(product.id); return cut && !cut.endsWith('.model.webp'); });
    const picked = (hero.picks ?? []).map((id) => usable.find((product) => product.id === id)).filter((product): product is Product => Boolean(product));
    if (picked.length) return picked.map((product) => ({ id: product.id, src: cutoutFor(product.id)!, alt: product.title }));
    const ranked = [...usable.filter((product) => TRENDING_LOOKS.has(product.id)), ...usable.filter((product) => !TRENDING_LOOKS.has(product.id))];
    return ranked.slice(0, 5).map((product) => ({ id: product.id, src: cutoutFor(product.id)!, alt: product.title }));
  }, [products, cutoutFor, hero.picks]);
  const [shown, setShown] = useState(0);
  useEffect(() => {
    setShown(0);
    if (photos.length < 2) return;
    const timer = window.setInterval(() => setShown((index) => (index + 1) % photos.length), 5200);
    return () => window.clearInterval(timer);
  }, [photos]);

  const lines = hero.title.split('/').map((line) => line.trim());
  const cta = <>Shop now <span aria-hidden="true">→</span></>;
  const scroll = () => (ref.current?.nextElementSibling as HTMLElement | null)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return <section ref={ref} className={`chero chero--${hero.scene} chero--${dept}`} aria-label={label}>
    {hero.scene === 'mono' && <span className="chero__ghost" aria-hidden="true">{hero.ghost ?? label.toUpperCase()}</span>}
    <div className="chero__copy">
      <span className="chero__kicker">Davinova · {label}</span>
      <h1 className="chero__title">{lines.map((line, index) => <span key={index}>{gold(line)}</span>)}</h1>
      <p className="chero__text">{hero.text}</p>
      <div className="chero__actions">
        {to ? <Link to={to} className="chero__cta">{cta}</Link> : <button type="button" className="chero__cta" onClick={scroll}>{cta}</button>}
        {count && <span className="chero__count">{count}</span>}
      </div>
      {hero.features && <ul className="chero__features">{hero.features.map(([icon, title, line]) => <li key={title}><Icon name={icon} /><span><strong>{title}</strong><small>{line}</small></span></li>)}</ul>}
    </div>
    <div className="chero__scene" aria-hidden={photos.length ? undefined : true}>
      {hero.scene === 'stage' && <><svg className="chero__arc" viewBox="0 0 400 400"><circle cx="200" cy="200" r="190" /><circle cx="200" cy="200" r="160" /></svg><span className="chero__rock" /></>}
      {hero.scene === 'pedestal' && <><svg className="chero__curves" viewBox="0 0 400 400"><path d="M-20 300C80 180 160 380 260 250S380 90 430 140" /><path d="M-20 330C90 220 170 400 270 280S390 130 430 180" /></svg><Flower className="chero__flower chero__flower--a" /><Flower className="chero__flower chero__flower--b" /><Flower className="chero__flower chero__flower--c" /><span className="chero__pedestal" /></>}
      {hero.scene === 'mono' && <><Gear className="chero__gear chero__gear--a" teeth={14} /><Gear className="chero__gear chero__gear--b" teeth={10} /><Gear className="chero__gear chero__gear--c" teeth={8} /><span className="chero__screw chero__screw--a" /><span className="chero__screw chero__screw--b" /><span className="chero__glow" /></>}
      {photos.map((photo, index) => <img key={photo.id} className={`chero__product${index === shown ? ' is-on' : ''}`} src={photo.src} alt={index === shown ? photo.alt : ''} loading={index ? 'lazy' : 'eager'} decoding="async" />)}
    </div>
    {hero.scene === 'mono' && <span className="chero__label">Davinova · Atelier {new Date().getFullYear()}</span>}
    {hero.scene === 'stage' && <ul className="chero__perks">{PERKS.map(([icon, title, line]) => <li key={title}><Icon name={icon} /><span><strong>{title}</strong><small>{line}</small></span></li>)}</ul>}
  </section>;
}

/** "*word*" becomes the gold word. */
function gold(line: string): ReactNode {
  return line.split(/(\*[^*]+\*)/).filter(Boolean).map((part, index) => part.startsWith('*') ? <em key={index}>{part.slice(1, -1)}</em> : part);
}

const ICONS: Record<HeroIcon | 'truck' | 'return' | 'lock', string> = {
  heel: 'M3 17h6l2-4 4 1c2 .5 4 2 5 4H3zM15 14l1 6',
  leather: 'M5 4c4 2 10 2 14 0v13c-4 2-10 2-14 0zM8 8v6M12 9v6M16 8v6',
  hand: 'M7 12V6a1.5 1.5 0 0 1 3 0v5m0-6a1.5 1.5 0 0 1 3 0v6m0-5a1.5 1.5 0 0 1 3 0v7c0 4-2 7-6 7s-6-3-7-6l-1-3a1.5 1.5 0 0 1 3-1l1 2',
  ruler: 'M3 16 16 3l5 5L8 21zM7 12l2 2M10 9l2 2M13 6l2 2',
  gem: 'M6 3h12l4 6-10 12L2 9zM2 9h20M9 3l3 18 3-18',
  spark: 'M12 2v6M12 16v6M2 12h6M16 12h6M5 5l3 3M16 16l3 3M19 5l-3 3M8 16l-3 3',
  drop: 'M12 3c4 5 6 8 6 11a6 6 0 0 1-12 0c0-3 2-6 6-11z',
  leaf: 'M5 19C5 9 11 4 20 4c0 9-5 15-15 15zM5 19l9-9',
  gear: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2',
  shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z',
  needle: 'M20 4 6 18M18 4h2v2M4 20l2-2M9 9c-3 0-5 2-5 4s2 3 4 2',
  heart: 'M12 20s-8-5-8-11a4 4 0 0 1 8-1 4 4 0 0 1 8 1c0 6-8 11-8 11z',
  truck: 'M2 6h11v10H2zM13 10h4l3 3v3h-7M6 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM17 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
  return: 'M4 9h11a5 5 0 0 1 0 10H8M4 9l4-4M4 9l4 4',
  lock: 'M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4',
};
function Icon({ name }: { name: keyof typeof ICONS }) {
  return <svg className="chero__icon" viewBox="0 0 24 24" aria-hidden="true"><path d={ICONS[name]} /></svg>;
}

function Gear({ teeth, className }: { teeth: number; className: string }) {
  const points: string[] = [];
  for (let i = 0; i < teeth * 4; i += 1) {
    const angle = (i / (teeth * 4)) * Math.PI * 2;
    const radius = i % 4 < 2 ? 48 : 40;
    points.push(`${(50 + radius * Math.cos(angle)).toFixed(1)},${(50 + radius * Math.sin(angle)).toFixed(1)}`);
  }
  return <svg className={className} viewBox="0 0 100 100" aria-hidden="true"><defs><linearGradient id={`g-${teeth}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="var(--hero-gold-hi)" /><stop offset=".5" stopColor="var(--hero-gold)" /><stop offset="1" stopColor="var(--hero-gold-lo)" /></linearGradient></defs><polygon points={points.join(' ')} fill={`url(#g-${teeth})`} /><circle cx="50" cy="50" r="22" fill="var(--hero-bg-deep)" /><circle cx="50" cy="50" r="9" fill={`url(#g-${teeth})`} /></svg>;
}

function Flower({ className }: { className: string }) {
  return <svg className={className} viewBox="0 0 100 100" aria-hidden="true"><defs><radialGradient id="petal" cx=".5" cy=".3" r=".8"><stop offset="0" stopColor="var(--hero-gold-hi)" /><stop offset=".6" stopColor="var(--hero-gold)" /><stop offset="1" stopColor="var(--hero-gold-lo)" /></radialGradient></defs>{[0, 72, 144, 216, 288].map((turn) => <ellipse key={turn} cx="50" cy="28" rx="13" ry="22" fill="url(#petal)" transform={`rotate(${turn} 50 50)`} />)}<circle cx="50" cy="50" r="9" fill="var(--hero-gold-lo)" /></svg>;
}
