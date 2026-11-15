import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Download } from 'lucide-react';
import { canInstall, isAppMode, onInstallChange, promptInstall } from '../../lib/installApp';
import { InstallSteps } from './InstallApp';

type Dept = 'women' | 'men';

/** "Complete the look" poster: a model in our dress or suit with matching pieces; the button opens the looks page. */
export function LooksPoster({ dept }: { dept: Dept }) {
  const to = dept === 'men' ? '/men/looks' : '/looks';
  return <section className={`promo-poster promo-poster--${dept}`}>
    <Link to={to} className="promo-poster__art" aria-label="Complete the look">
      <img src={dept === 'men' ? '/images/looks-poster-men.webp' : '/images/looks-poster.webp'} width="1080" height="1350" loading="lazy"
        alt={dept === 'men' ? 'A man in a black three-piece suit with a matching tie, watch, cufflinks, briefcase and shoes' : 'A woman in a burgundy satin gown with a matching necklace, bag, watch and heels'} />
    </Link>
    <Link to={to} className="promo-poster__go">Build your look <ArrowUpRight size={18} /></Link>
  </section>;
}

/** "Get the app" poster (QR code for desktop visitors) with an Install button where the phone can install. */
export function AppPoster({ dept }: { dept: Dept }) {
  const [ok, setOk] = useState(canInstall);
  const [steps, setSteps] = useState(false);
  useEffect(() => onInstallChange(() => setOk(canInstall())), []);
  if (isAppMode()) return null;
  return <section className={`promo-poster promo-poster--app promo-poster--${dept}`}>
    <div className="promo-poster__art"><img src="/images/app-poster.webp" width="1080" height="1920" loading="lazy" alt="The Davinova app on a phone, surrounded by bags, jewelry, watches and shoes, with a QR code to install it" /></div>
    {ok
      ? <button type="button" className="promo-poster__go" onClick={async () => { if ((await promptInstall()) === 'ios') setSteps(true); }}><Download size={18} /> Install the app</button>
      : <a className="promo-poster__go" href="/images/app-poster.webp" download="davinova-app.webp">Save the poster</a>}
    {steps && <InstallSteps dept={dept} onClose={() => setSteps(false)} />}
  </section>;
}
