import { Link } from 'react-router-dom';

/** The bar above both headers: two shops, always one tap apart. */
export function DeptSwitch({ active }: { active: 'women' | 'men' }) {
  return <nav className={`dept dept--${active}`} aria-label="Choose a shop">
    <span className="dept__note">Two shops · one house</span>
    <div className="dept__tabs">
      <Link to="/" className={active === 'women' ? 'active' : ''} aria-current={active === 'women' ? 'page' : undefined}>Women</Link>
      <Link to="/men" className={active === 'men' ? 'active' : ''} aria-current={active === 'men' ? 'page' : undefined}>Men</Link>
    </div>
    <span className="dept__note dept__note--end">Occasion wear for both</span>
  </nav>;
}
