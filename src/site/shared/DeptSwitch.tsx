import { Link } from 'react-router-dom';
import { LangSwitch } from './LangSwitch';
import { MoodBar } from './Mood';

/** The bar above both headers: two shops, always one tap apart. */
export function DeptSwitch({ active }: { active: 'women' | 'men' }) {
  return <nav className={`dept dept--${active}`} aria-label="Choose a shop">
    <div className="dept__start"><MoodBar dept={active} className="mood-bar--dept" /><span className="dept__note">Two shops · one house</span></div>
    <div className="dept__tabs">
      <Link to="/" className={active === 'women' ? 'active' : ''} aria-current={active === 'women' ? 'page' : undefined}>Women</Link>
      <Link to="/men" className={active === 'men' ? 'active' : ''} aria-current={active === 'men' ? 'page' : undefined}>Men</Link>
    </div>
    <LangSwitch />
  </nav>;
}
