import { useId } from 'react';

const PUFFS = [
  [300, 210, 150, 110], [200, 240, 110, 80], [410, 230, 120, 90], [300, 140, 110, 80],
  [240, 170, 80, 60], [370, 170, 90, 70], [300, 280, 140, 60],
] as const;

/**
 * Soft white steam, drawn in SVG: blobs pushed around by fractal noise and blurred, so it reads as smoke
 * rather than circles. The noise is static (cheap on phones); the drift is a CSS transform on the wrapper.
 */
export function Cloud({ className = '', seed = 3 }: { className?: string; seed?: number }) {
  const id = useId().replace(/:/g, '');
  return <div className={`cloud ${className}`} aria-hidden="true">
    <svg viewBox="0 0 600 420" preserveAspectRatio="xMidYMid meet">
      <defs>
        <filter id={`smoke${id}`} x="-40%" y="-40%" width="180%" height="180%">
          <feTurbulence type="fractalNoise" baseFrequency="0.011" numOctaves="4" seed={seed} result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="150" xChannelSelector="R" yChannelSelector="G" result="pushed" />
          <feGaussianBlur in="pushed" stdDeviation="9" />
        </filter>
        <radialGradient id={`puff${id}`}>
          <stop offset="0" stopColor="#fff" stopOpacity=".95" />
          <stop offset=".6" stopColor="#fff" stopOpacity=".55" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <g filter={`url(#smoke${id})`}>{PUFFS.map(([cx, cy, rx, ry], i) => <ellipse key={i} cx={cx} cy={cy} rx={rx} ry={ry} fill={`url(#puff${id})`} />)}</g>
    </svg>
  </div>;
}

/** A fixed sky of drifting steam behind the whole women's shop; glass cards blur it as they pass over. */
export function CloudSky() {
  return <div className="cloud-sky" aria-hidden="true">
    <Cloud className="cloud--a" seed={3} />
    <Cloud className="cloud--b" seed={8} />
    <Cloud className="cloud--c" seed={14} />
  </div>;
}
