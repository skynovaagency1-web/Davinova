import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { Logo } from './Logo';

/** A big two-door banner so visitors see straight away that there is a women's shop and a men's shop. */
export function ShopSplit({ womenImage, womenCount, menCount }: { womenImage?: string; womenCount: number; menCount: number }) {
  return <section className="split" aria-label="Our two shops">
    <Link to="/shop" className="split__door split__door--women">
      {womenImage && <img src={womenImage} alt="" loading="lazy" />}
      <span className="split__kicker">Davinova</span>
      <strong>Women</strong>
      <span className="split__line">Dresses for weddings, cocktails and holidays{womenCount ? ` · ${womenCount} looks` : ''}</span>
      <span className="split__go">Shop women <ArrowUpRight size={18} /></span>
    </Link>
    <Link to="/men" className="split__door split__door--men">
      <span className="split__mark"><Logo tone="metal" sub="HOMME" /></span>
      <span className="split__kicker">Davinova Homme</span>
      <strong>Men</strong>
      <span className="split__line">Suits and formalwear for the same occasions{menCount ? ` · ${menCount} looks` : ' · first looks arriving soon'}</span>
      <span className="split__go">Shop men <ArrowUpRight size={18} /></span>
    </Link>
  </section>;
}
