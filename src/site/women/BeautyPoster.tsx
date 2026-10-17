import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';

export const BEAUTY_POSTER = '/images/beauty-poster-still.jpg';
const BEAUTY_VIDEO = '/images/beauty-poster';

/** The "hand it down" beauty campaign: the poster, a headline over it, and a link into the Beauty page. */
export function BeautyPoster({ linked = true }: { linked?: boolean }) {
  const body = <>
    <video poster={BEAUTY_POSTER} autoPlay muted loop playsInline preload="metadata" aria-label="One woman hands a gold perfume bottle down to another through a social post">
      <source src={`${BEAUTY_VIDEO}.mp4`} type="video/mp4" />
      <source src={`${BEAUTY_VIDEO}.webm`} type="video/webm" />
    </video>
    <span className="beauty-poster__sweep" aria-hidden="true" />
    <svg className="beauty-poster__heart" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7.5-4.6-10-9.2C.4 8.6 2.3 4.5 6.2 4.5c2.2 0 3.8 1.3 4.8 2.8 1-1.5 2.6-2.8 4.8-2.8 3.9 0 5.8 4.1 4.2 7.3C19.5 16.4 12 21 12 21z" /></svg>
    <span className="watch-poster__head beauty-poster__head">Beauty,<br /><em>passed on.</em></span>
    {linked && <span className="watch-poster__go">Discover beauty <ArrowUpRight size={18} /></span>}
  </>;
  return linked
    ? <Link to="/beauty" className="watch-poster beauty-poster">{body}</Link>
    : <div className="watch-poster beauty-poster">{body}</div>;
}
