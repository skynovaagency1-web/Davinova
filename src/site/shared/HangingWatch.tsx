import { Link } from 'react-router-dom';

/** One of our rose gold watches on a steel chain, swinging from the top of the men's footer. Opens the bag (cart). */
export function HangingWatch({ to }: { to: string }) {
  return <Link to={to} className="hang-bag hang-watch" aria-label="Open your bag">
    <svg className="hang-watch__chain" viewBox="0 0 40 126" aria-hidden="true">
      <defs><linearGradient id="hw-steel" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ffffff" /><stop offset=".4" stopColor="#c9c9cd" /><stop offset=".7" stopColor="#7d7d82" /><stop offset="1" stopColor="#e6e6e8" /></linearGradient></defs>
      <g fill="none" stroke="url(#hw-steel)" strokeWidth="3">
        {Array.from({ length: 10 }, (_, i) => <ellipse key={i} cx="20" cy={8 + i * 12} rx={i % 2 ? 2.4 : 4.2} ry="6.5" />)}
      </g>
    </svg>
    <img className="hang-watch__img" src="/images/footer-watch.webp" alt="" />
    <span className="hang-bag__tag">Your bag</span>
  </Link>;
}
