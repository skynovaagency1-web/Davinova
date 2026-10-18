import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { menCategoryPath } from './menFormal';

/** "New Generation" campaign (the owner's ChatGPT poster with one of our dress shoes); it opens the men's shoes. */
export function ShoePoster() {
  return <Link to={menCategoryPath('dress-shoes')} className="watch-poster shoe-poster">
    <img src="/images/shoe-poster-men.jpg" alt="A man in a charcoal three-piece suit sits on a marble floor in glossy black Davinova dress shoes" loading="lazy" />
    <span className="watch-poster__go">Discover shoes <ArrowUpRight size={18} /></span>
  </Link>;
}
