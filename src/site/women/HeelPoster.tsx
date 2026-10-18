import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { WOMEN_SHOES } from '../../lib/storeCollectionTaxonomy';
import { categoryPath } from '../../lib/categories';

/** "Step into power" campaign (the owner's ChatGPT poster with our red patent pumps); it opens the Heels page. */
export function HeelPoster() {
  return <Link to={categoryPath(WOMEN_SHOES, 'heels')} className="watch-poster heel-poster">
    <img src="/images/heel-poster.jpg" alt="A curvy woman in a satin dress leans on a giant red patent Davinova stiletto" loading="lazy" />
    <span className="watch-poster__go">Discover heels <ArrowUpRight size={18} /></span>
  </Link>;
}
