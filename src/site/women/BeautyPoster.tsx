import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';

export const BEAUTY_POSTER = '/images/beauty-poster.jpg';

/** The "hand it down" beauty campaign: the poster, a headline over it, and a link into the Beauty page. */
export function BeautyPoster({ linked = true }: { linked?: boolean }) {
  const body = <>
    <img src={BEAUTY_POSTER} alt="One woman hands a gold perfume bottle down to another through a social post" loading="lazy" />
    <span className="watch-poster__head beauty-poster__head">Beauty, <em>passed on.</em></span>
    {linked && <span className="watch-poster__go">Discover beauty <ArrowUpRight size={18} /></span>}
  </>;
  return linked
    ? <Link to="/beauty" className="watch-poster beauty-poster">{body}</Link>
    : <div className="watch-poster beauty-poster">{body}</div>;
}
