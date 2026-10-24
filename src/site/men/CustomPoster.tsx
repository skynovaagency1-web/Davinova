import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';

const ART = '/images/pod-poster-men-v2.webp';

/** Print on demand poster for the men's home (owner's "Resort Luxe" picture, background removed), with the footer's light sweep. */
export function CustomPoster() {
  return <Link to="/men/custom" className="pod-pop" style={{ '--art': `url(${ART})` } as CSSProperties}>
    <img src={ART} alt="A man in a sage shirt and panama hat sitting on giant PRINT ON DEMAND letters" width="1672" height="941" loading="lazy" />
    <span className="w-footer__sweep" aria-hidden="true" />
    <span className="pod-pop__go">Design yours <ArrowUpRight size={16} /></span>
  </Link>;
}
