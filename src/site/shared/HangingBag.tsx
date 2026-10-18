import { Link } from 'react-router-dom';

/** A black leather handbag on a gold chain, swinging from the top of the footer. Links to the bag (cart). */
export function HangingBag({ to = '/bag' }: { to?: string }) {
  return <Link to={to} className="hang-bag" aria-label="Open your bag">
    <svg viewBox="0 0 220 420" aria-hidden="true">
      <defs>
        <linearGradient id="hb-gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#f5ebe0" /><stop offset=".45" stopColor="#b89a7e" /><stop offset="1" stopColor="#6b5444" /></linearGradient>
        <linearGradient id="hb-leather" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#3a3330" /><stop offset=".35" stopColor="#141110" /><stop offset="1" stopColor="#050404" /></linearGradient>
        <linearGradient id="hb-flap" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2c2624" /><stop offset="1" stopColor="#0b0909" /></linearGradient>
        <radialGradient id="hb-shine" cx=".3" cy=".25" r=".6"><stop offset="0" stopColor="#fff" stopOpacity=".28" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></radialGradient>
      </defs>
      {/* chain */}
      <g fill="none" stroke="url(#hb-gold)" strokeWidth="3">
        {Array.from({ length: 14 }, (_, i) => <ellipse key={i} cx="110" cy={8 + i * 12} rx={i % 2 ? 2.4 : 4.2} ry="6.5" />)}
      </g>
      {/* handle */}
      <path d="M62 236 C62 160 158 160 158 236" fill="none" stroke="url(#hb-gold)" strokeWidth="7" strokeLinecap="round" />
      <circle cx="110" cy="174" r="6" fill="url(#hb-gold)" />
      {/* body */}
      <path d="M36 236 H184 L200 392 C201 404 194 412 182 412 H38 C26 412 19 404 20 392 Z" fill="url(#hb-leather)" />
      <path d="M36 236 H184 L200 392 C201 404 194 412 182 412 H38 C26 412 19 404 20 392 Z" fill="url(#hb-shine)" />
      {/* quilting */}
      <g stroke="#fff" strokeOpacity=".07" strokeWidth="1.2">
        <path d="M30 300 L120 410 M60 240 L190 400 M110 238 L196 345 M30 360 L70 410 M190 300 L110 410 M160 238 L30 400 M110 238 L26 345 M190 360 L150 410" />
      </g>
      {/* flap + clasp */}
      <path d="M36 236 H184 L178 300 C150 322 70 322 42 300 Z" fill="url(#hb-flap)" />
      <path d="M42 300 C70 322 150 322 178 300" fill="none" stroke="#fff" strokeOpacity=".12" strokeWidth="1.4" strokeDasharray="4 4" />
      <rect x="96" y="300" width="28" height="22" rx="5" fill="url(#hb-gold)" />
      <circle cx="110" cy="311" r="5" fill="#2a1206" />
      <text x="110" y="378" textAnchor="middle" fill="url(#hb-gold)" style={{ font: '600 13px Archivo, sans-serif', letterSpacing: '6px' }}>DAVINOVA</text>
    </svg>
    <span className="hang-bag__tag">Your bag</span>
  </Link>;
}
