import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { jewelryPath } from '../shared/jewelry';

/** "TIME" campaign (the owner's ChatGPT poster with one of our rose gold watches); it opens the men's watches. */
export function MenWatchPoster() {
  return <Link to={jewelryPath('men', 'mens-watches')} className="watch-poster shoe-poster">
    <img src="/images/watch-poster-men.jpg" alt="A man in a charcoal three-piece suit leans on a giant rose gold Davinova watch" loading="lazy" />
    <span className="watch-poster__go">Discover watches <ArrowUpRight size={18} /></span>
  </Link>;
}
