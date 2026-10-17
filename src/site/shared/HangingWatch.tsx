import { Link } from 'react-router-dom';

const TICKS = Array.from({ length: 60 }, (_, i) => i);

/** A steel pocket watch on its chain, swinging from the top of the men's footer. Its hands keep real time. Links to men's watches. */
export function HangingWatch({ to }: { to: string }) {
  const now = new Date();
  const seconds = now.getSeconds();
  const minutes = now.getMinutes() + seconds / 60;
  const hours = (now.getHours() % 12) + minutes / 60;
  // Negative delays start each hand where the clock is now; the CSS turns them at real speed.
  const hand = (period: number, done: number) => ({ animationDuration: `${period}s`, animationDelay: `-${done}s` });
  return <Link to={to} className="hang-bag hang-watch" aria-label="Shop men's watches">
    <svg viewBox="0 0 220 420" aria-hidden="true">
      <defs>
        <linearGradient id="hw-steel" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ffffff" /><stop offset=".4" stopColor="#c9c9cd" /><stop offset=".7" stopColor="#7d7d82" /><stop offset="1" stopColor="#e6e6e8" /></linearGradient>
        <radialGradient id="hw-dial" cx=".4" cy=".35" r=".75"><stop offset="0" stopColor="#fdfdfb" /><stop offset=".8" stopColor="#e9e7e1" /><stop offset="1" stopColor="#cfccc4" /></radialGradient>
        <radialGradient id="hw-glass" cx=".3" cy=".25" r=".6"><stop offset="0" stopColor="#fff" stopOpacity=".55" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></radialGradient>
      </defs>
      {/* chain */}
      <g fill="none" stroke="url(#hw-steel)" strokeWidth="3">
        {Array.from({ length: 13 }, (_, i) => <ellipse key={i} cx="110" cy={8 + i * 12} rx={i % 2 ? 2.4 : 4.2} ry="6.5" />)}
      </g>
      {/* bow and crown */}
      <circle cx="110" cy="176" r="14" fill="none" stroke="url(#hw-steel)" strokeWidth="6" />
      <rect x="99" y="188" width="22" height="20" rx="4" fill="url(#hw-steel)" />
      <g stroke="#6d6d72" strokeWidth="1.2">{[103, 108, 113, 118].map((x) => <line key={x} x1={x} y1="190" x2={x} y2="206" />)}</g>
      {/* case */}
      <circle cx="110" cy="300" r="96" fill="url(#hw-steel)" />
      <circle cx="110" cy="300" r="84" fill="#2a2a2d" />
      <circle cx="110" cy="300" r="80" fill="url(#hw-dial)" />
      {/* minute track and hour marks */}
      <g stroke="#2b2b2e">{TICKS.map((i) => {
        const a = (i * 6 * Math.PI) / 180;
        const long = i % 5 === 0;
        const r1 = long ? 64 : 70;
        return <line key={i} x1={110 + Math.sin(a) * r1} y1={300 - Math.cos(a) * r1} x2={110 + Math.sin(a) * 75} y2={300 - Math.cos(a) * 75} strokeWidth={long ? 3 : 1} />;
      })}</g>
      <text x="110" y="268" textAnchor="middle" fill="#2b2b2e" style={{ font: '600 9px Archivo, sans-serif', letterSpacing: '4px' }}>DAVINOVA</text>
      <text x="110" y="344" textAnchor="middle" fill="#7a7a7e" style={{ font: '500 7px "IBM Plex Mono", monospace', letterSpacing: '3px' }}>HOMME</text>
      {/* hands */}
      <g className="hang-watch__hand" style={hand(43200, hours * 3600)}><path d="M107 300 L110 252 L113 300 Z" fill="#1b1b1d" /></g>
      <g className="hang-watch__hand" style={hand(3600, minutes * 60)}><path d="M108.5 300 L110 236 L111.5 300 Z" fill="#1b1b1d" /></g>
      <g className="hang-watch__hand hang-watch__hand--sec" style={hand(60, seconds)}><line x1="110" y1="314" x2="110" y2="234" stroke="#a8323a" strokeWidth="1.4" /></g>
      <circle cx="110" cy="300" r="4" fill="#1b1b1d" />
      <circle cx="110" cy="300" r="80" fill="url(#hw-glass)" />
    </svg>
    <span className="hang-bag__tag">Watches</span>
  </Link>;
}
