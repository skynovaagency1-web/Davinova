import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { Logo, LogoMark } from '../shared/Logo';

/** Where each tee's chest sits on the poster, so the Davinova mark lands where a print would go. */
const chests = [{ left: '67%', top: '11.5%' }, { left: '74.5%', top: '44.5%' }, { left: '67%', top: '77.5%' }];

/** Davinova Custom poster for the men's home (the owner's three-tee photo, cleaned of its old branding). */
export function CustomPoster() {
  return <Link to="/men/custom" className="pod-poster">
    <img src="/images/pod-poster-men.webp" alt="Three blank tees in sand, espresso and black, hanging on wooden hangers" loading="lazy" />
    {chests.map((spot, i) => <span key={i} className="pod-poster__print" style={{ ...spot, animationDelay: `${i * 0.6}s` }}><LogoMark size={26} /></span>)}
    <div className="pod-poster__copy">
      <Logo sub="Custom" />
      <hr />
      <strong>Your design.<br />Printed for you.</strong>
      <hr />
      <span className="pod-poster__go">Design yours <ArrowUpRight size={16} /></span>
    </div>
  </Link>;
}
