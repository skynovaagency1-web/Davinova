import { Link } from 'react-router-dom';
import { CUSTOM_PRODUCTS } from '../../lib/customDesign';

/** Home-page banner for the design maker (owner, 2026-10-27: it was too hard to find). */
export function DesignBanner({ dept }: { dept: 'women' | 'men' }) {
  const from = Math.min(...CUSTOM_PRODUCTS.map((product) => product.priceCents)) / 100;
  return <section className={`dm-banner${dept === 'men' ? ' dm-banner--men' : ''}`}>
    <div className="dm-banner__copy">
      <span className="nova-chip">New · Design your own</span>
      <h2>Your picture. <b>Your words.</b></h2>
      <p>Put your own photo or text on a tee, hoodie, cap, joggers, a matching set, a tote or a mug. See it live, then we print it just for you. From ${from.toFixed(2)}.</p>
    </div>
    <Link className="dm-cta-link" to={dept === 'men' ? '/men/custom/design' : '/custom/design'}>Start designing →<small>{CUSTOM_PRODUCTS.map((product) => product.label).join(' · ')}</small></Link>
  </section>;
}
