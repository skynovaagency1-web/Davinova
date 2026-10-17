import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';

export const WATCH_POSTER = '/images/watch-poster.jpg';

/** The "reach for it" watch campaign: the poster, a headline over it, and a link into the Watches page. */
export function WatchPoster({ linked = true }: { linked?: boolean }) {
  const body = <>
    <img src={WATCH_POSTER} alt="A woman leans out of a phone screen to reach for a gold watch" loading="lazy" />
    <span className="watch-poster__head">Time you can <em>reach.</em></span>
    {linked && <span className="watch-poster__go">Discover watches <ArrowUpRight size={18} /></span>}
  </>;
  return linked
    ? <Link to="/watches" className="watch-poster">{body}</Link>
    : <div className="watch-poster">{body}</div>;
}
