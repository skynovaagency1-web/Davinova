import { useId } from 'react';

type Tone = 'brand' | 'metal';

const stops: Record<Tone, string[]> = {
  brand: ['#5b3fd1', '#9b5cf0', '#e86fc0', '#ff9a8b'],
  metal: ['#ffffff', '#b9b9bd', '#5e5e62', '#d8d8db'],
};

/**
 * The Davinova mark: a "D" drawn in one stroke with a four-point star (the "nova") in its counter.
 * Pure SVG + CSS, so it animates the same on phones and desktops; motion stops for reduced-motion users.
 */
export function LogoMark({ tone = 'brand', size = 34, title }: { tone?: Tone; size?: number; title?: string }) {
  const id = useId().replace(/:/g, '');
  const [a, b, c, d] = stops[tone];
  return <svg className={`logo-mark logo-mark--${tone}`} width={size} height={size} viewBox="0 0 64 64" role={title ? 'img' : undefined} aria-hidden={title ? undefined : true} aria-label={title}>
    <defs>
      <linearGradient id={`g${id}`} x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor={a} /><stop offset=".4" stopColor={b} /><stop offset=".75" stopColor={c} /><stop offset="1" stopColor={d} />
        <animateTransform attributeName="gradientTransform" type="rotate" values="0 32 32;360 32 32" dur="9s" repeatCount="indefinite" />
      </linearGradient>
    </defs>
    <path className="logo-mark__d" d="M17 9 V55 H29 C45.5 55 55 45 55 32 C55 19 45.5 9 29 9 Z" fill="none" stroke={`url(#g${id})`} strokeWidth="5.5" strokeLinejoin="round" pathLength={100} />
    <path className="logo-mark__star" d="M33 19 C34 27.5 36.5 30.5 45 32 C36.5 33.5 34 36.5 33 45 C32 36.5 29.5 33.5 21 32 C29.5 30.5 32 27.5 33 19 Z" fill={`url(#g${id})`} />
    <circle className="logo-mark__spark" cx="46" cy="18" r="2.2" fill={c} />
  </svg>;
}

/** Mark plus wordmark; the word shimmers with the same gradient. */
export function Logo({ tone = 'brand', sub }: { tone?: Tone; sub?: string }) {
  return <span className={`logo logo--${tone}`}>
    <LogoMark tone={tone} />
    <span className="logo__word">DAVINOVA{sub && <i>{sub}</i>}</span>
  </span>;
}
