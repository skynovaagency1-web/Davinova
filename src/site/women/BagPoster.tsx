import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { WOMEN_BAGS } from '../../lib/storeCollectionTaxonomy';
import { categoryPath } from '../../lib/categories';
import { WATCH_POSTER } from './WatchPoster';

// If the bag poster fails to load, the watch poster stands in.
export const BAG_POSTER = '/images/bag-poster.webp';

/** The "reach for it" campaign, now with one of our bags in place of the watch; it opens the Bags page. */
export function BagPoster() {
  return <Link to={categoryPath(WOMEN_BAGS)} className="watch-poster bag-poster poster-pop">
    <img src={BAG_POSTER} alt="A curvy woman reaches out of a phone screen for a camel Davinova handbag" loading="lazy"
      onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = WATCH_POSTER; }} />
    <span className="watch-poster__head">The bag you <em>reach for.</em></span>
    <span className="watch-poster__go">Discover bags <ArrowUpRight size={18} /></span>
  </Link>;
}
