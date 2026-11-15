import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Bell, Download, Package, Share, Smartphone, Sparkles, Zap } from 'lucide-react';
import { useCatalogProducts } from '../../lib/useCatalogProducts';
import { PosterSides } from './PosterSides';
import { canInstall, isAppMode, onInstallChange, promptInstall } from '../../lib/installApp';
import { InstallSteps } from './InstallApp';

type Dept = 'women' | 'men';

// The pieces worn in each looks poster, so the side cards match the picture.
const LOOK_PIECES: Record<Dept, string[]> = {
  women: ['cj-2055164827548672001', 'cj-1386211650029359104', 'cj-2512240751361638400', 'cj-1410107800750788608'],
  men: ['cj-2412220511231619400', 'cj-1678683701007364096', 'cj-1368019439999651840', 'cj-2406070709501613400', 'cj-2601060935231615900'],
};

/** "Complete the look" poster: a model in our dress or suit with matching pieces; the button opens the looks page. */
export function LooksPoster({ dept }: { dept: Dept }) {
  const to = dept === 'men' ? '/men/looks' : '/looks';
  const { products } = useCatalogProducts();
  const pieces = LOOK_PIECES[dept].map((id) => products.find((product) => product.id === id)).filter((product): product is NonNullable<typeof product> => Boolean(product));
  return <section className="promo-wrap"><PosterSides products={pieces} picks={LOOK_PIECES[dept]}><div className={`promo-poster promo-poster--${dept}`}>
    <Link to={to} className="promo-poster__art" aria-label="Complete the look">
      <img src={dept === 'men' ? '/images/looks-poster-men.webp' : '/images/looks-poster.webp'} width="1080" height="1350" loading="lazy"
        alt={dept === 'men' ? 'A man in a black three-piece suit with a matching tie, watch, cufflinks, briefcase and shoes' : 'A woman in a burgundy satin gown with a matching necklace, bag, watch and heels'} />
    </Link>
    <Link to={to} className="promo-poster__go">Build your look <ArrowUpRight size={18} /></Link>
  </div></PosterSides></section>;
}

/** "Get the app" poster (QR code for desktop visitors) with an Install button where the phone can install. */
export function AppPoster({ dept }: { dept: Dept }) {
  const [ok, setOk] = useState(canInstall);
  const [steps, setSteps] = useState(false);
  useEffect(() => onInstallChange(() => setOk(canInstall())), []);
  if (isAppMode()) return null;
  const tile = (Icon: typeof Zap, title: string, text: string) => <div className="app-side"><i><Icon size={20} /></i><strong>{title}</strong><span>{text}</span></div>;
  return <section className={`promo-wrap app-sides app-sides--${dept}`}>
    <div className="app-sides__col">
      <span className="app-sides__kicker">Install in two taps</span>
      {tile(Smartphone, 'Android', 'Open davinova.com in Chrome and tap Install.')}
      {tile(Share, 'iPhone', 'In Safari tap Share, then Add to Home Screen.')}
      {tile(Download, 'No store needed', 'Free, tiny, and always up to date.')}
    </div>
    <div className={`promo-poster promo-poster--app promo-poster--${dept}`}>
    <div className="promo-poster__art"><img src="/images/app-poster.webp" width="1080" height="1920" loading="lazy" alt="The Davinova app on a phone, surrounded by bags, jewelry, watches and shoes, with a QR code to install it" /></div>
    {ok
      ? <button type="button" className="promo-poster__go" onClick={async () => { if ((await promptInstall()) === 'ios') setSteps(true); }}><Download size={18} /> Install the app</button>
      : <a className="promo-poster__go" href="/images/app-poster.webp" download="davinova-app.webp">Save the poster</a>}
    {steps && <InstallSteps dept={dept} onClose={() => setSteps(false)} />}
    </div>
    <div className="app-sides__col">
      <span className="app-sides__kicker">Why the app</span>
      {tile(Zap, 'Faster', 'Opens full screen in a second, even on slow networks.')}
      {tile(Package, 'Your bag and orders', 'Bag, wishlist and tracking one tap away.')}
      {tile(Sparkles, 'New drops first', 'See new looks and Club rewards as they land.')}
      {tile(Bell, 'Free shipping', 'On every order, tracked to your door.')}
    </div>
  </section>;
}
