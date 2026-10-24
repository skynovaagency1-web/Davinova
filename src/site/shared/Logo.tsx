import { useId } from 'react';

type Tone = 'brand' | 'metal';

const stops: Record<Tone, string[]> = {
  // Women: Bronze Eclipse (user's palette pick, 2026-10-18).
  brand: ['#3c2a21', '#8e735b', '#cdb69e', '#f2e6d8'],
  // Men: silver-sage, from the charcoal & sage palette.
  metal: ['#6f736d', '#a5aaa3', '#e8ebe6', '#8d8d8d'],
};

const STAR = 'M33 19 C34 27.5 36.5 30.5 45 32 C36.5 33.5 34 36.5 33 45 C32 36.5 29.5 33.5 21 32 C29.5 30.5 32 27.5 33 19 Z';
const starAt = (cx: number, cy: number, s: number) => `translate(${cx - 33 * s} ${cy - 32 * s}) scale(${s})`;

// The star's position lives on a wrapping <g>, because the CSS twinkle animation replaces a transform set on the path itself.
// Monoline letters on a 40-unit cap height: straight lines and arcs at one stroke weight; A is a crossbar-less Λ.
const LETTERS: Record<string, [number, (x: number) => string]> = {
  D: [28, (x) => `M${x} 12 V52 H${x + 8} C${x + 22} 52 ${x + 28} 44 ${x + 28} 32 C${x + 28} 20 ${x + 22} 12 ${x + 8} 12 Z`],
  A: [28, (x) => `M${x} 52 L${x + 14} 12 L${x + 28} 52`],
  V: [28, (x) => `M${x} 12 L${x + 14} 52 L${x + 28} 12`],
  I: [0, (x) => `M${x} 12 V52`],
  N: [26, (x) => `M${x} 52 V12 L${x + 26} 52 V12`],
  O: [40, (x) => `M${x} 32 A20 20 0 1 1 ${x + 40} 32 A20 20 0 1 1 ${x} 32`],
};
const GLYPHS = (() => {
  let x = 0;
  return [...'DAVINOVA'].map((ch) => { const glyph = { ch, x, d: LETTERS[ch][1](x) }; x += LETTERS[ch][0] + 13; return glyph; });
})();

function Gradient({ id, tone }: { id: string; tone: Tone }) {
  const [a, b, c, d] = stops[tone];
  return <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
    {/* --logo-1..4 follow the shop's colour mood when one is set (see Mood.tsx). */}
    <stop offset="0" stopColor={a} style={{ stopColor: `var(--logo-1, ${a})` }} /><stop offset=".4" stopColor={b} style={{ stopColor: `var(--logo-2, ${b})` }} />
    <stop offset=".75" stopColor={c} style={{ stopColor: `var(--logo-3, ${c})` }} /><stop offset="1" stopColor={d} style={{ stopColor: `var(--logo-4, ${d})` }} />
    <animateTransform attributeName="gradientTransform" type="rotate" values="0 .5 .5;360 .5 .5" dur="9s" repeatCount="indefinite" />
  </linearGradient>;
}

/** A band of the brand gradient that sweeps across the ink-coloured letters, over and over. */
const sweep: Record<Tone, [string, string]> = { brand: ['#8e735b', '#e8d8c4'], metal: ['#a5aaa3', '#ffffff'] };

function Shimmer({ id, tone }: { id: string; tone: Tone }) {
  const [a, b] = sweep[tone];
  return <linearGradient id={id} gradientUnits="userSpaceOnUse" x1="-120" y1="0" x2="0" y2="0" spreadMethod="pad">
    <stop offset="0" stopColor="currentColor" /><stop offset=".35" stopColor="currentColor" />
    <stop offset=".5" stopColor={a} style={{ stopColor: `var(--logo-2, ${a})` }} /><stop offset=".6" stopColor={b} style={{ stopColor: `var(--logo-3, ${b})` }} />
    <stop offset=".75" stopColor="currentColor" /><stop offset="1" stopColor="currentColor" />
    <animateTransform attributeName="gradientTransform" type="translate" values="-40 0;440 0;440 0" keyTimes="0;.55;1" dur="4.5s" repeatCount="indefinite" />
  </linearGradient>;
}

/** The Davinova mark on its own: the gradient O ring holding the four-point star. Used for icons. */
export function LogoMark({ tone = 'brand', size = 34, title }: { tone?: Tone; size?: number; title?: string }) {
  const id = useId().replace(/:/g, '');
  return <svg className={`logo-mark logo-mark--${tone}`} width={size} height={size} viewBox="0 0 64 64" role={title ? 'img' : undefined} aria-hidden={title ? undefined : true} aria-label={title}>
    <defs><Gradient id={`g${id}`} tone={tone} /></defs>
    <path className="logo-orbit" d="M12 32 A20 20 0 1 1 52 32 A20 20 0 1 1 12 32" fill="none" stroke={`url(#g${id})`} strokeWidth="4" strokeLinecap="round" pathLength={100} />
    <g transform={starAt(32, 32, .55)}><path className="logo-star" d={STAR} fill={`url(#g${id})`} /></g>
  </svg>;
}

/**
 * The Davinova wordmark: a custom monoline DAVINOVA that draws itself letter by letter, with the O in gradient
 * holding the star. Letters use currentColor, so each header and footer sets the ink. Pure SVG + CSS, so it
 * keeps moving on phones and desktops: a colour sweep runs through the letters, the O orbits and the star twinkles.
 */
export function Logo({ tone = 'brand', sub }: { tone?: Tone; sub?: string }) {
  const id = useId().replace(/:/g, '');
  return <span className={`logo logo--${tone}`}>
    <svg className="logo__word" viewBox="-2 10 301 44" role="img" aria-label={sub ? `Davinova ${sub}` : 'Davinova'}>
      <defs><Gradient id={`g${id}`} tone={tone} /><Shimmer id={`s${id}`} tone={tone} /></defs>
      {GLYPHS.map(({ ch, x, d }, i) => <g key={i}>
        <path className={ch === 'O' ? 'logo-orbit' : 'logo-line'} d={d} fill="none" stroke={ch === 'O' ? `url(#g${id})` : `url(#s${id})`} strokeWidth="3.6" strokeLinecap={ch === 'O' ? 'round' : undefined} pathLength={100} style={{ animationDelay: `${i * 0.1}s` }} />
        {ch === 'O' && <g transform={starAt(x + 20, 32, .62)}><path className="logo-star" d={STAR} fill={`url(#g${id})`} /></g>}
      </g>)}
    </svg>
    {sub && <i className="logo__sub">{sub}</i>}
  </span>;
}
