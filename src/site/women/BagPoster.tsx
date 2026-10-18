import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { WOMEN_BAGS } from '../../lib/storeCollectionTaxonomy';
import { categoryPath } from '../../lib/categories';
import { WATCH_POSTER } from './WatchPoster';

// Until the bag version of the poster exists, the watch poster stands in.
export const BAG_POSTER = '/images/bag-poster.jpg';

/** The "reach for it" campaign, now with one of our bags in place of the watch; it opens the Bags page. */
export function BagPoster() {
  return <Link to={categoryPath(WOMEN_BAGS)} className="watch-poster">
    <img src={BAG_POSTER} alt="A woman leans out of a phone screen to reach for a Davinova bag" loading="lazy"
      onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = WATCH_POSTER; }} />
    <span className="watch-poster__head">The bag you <em>reach for.</em></span>
    <span className="watch-poster__go">Discover bags <ArrowUpRight size={18} /></span>
  </Link>;
}
