import { Link } from 'react-router-dom';
import type { Dept } from './jewelry';

const FOUNDER_PHOTO = '/images/men-model.webp';

/** About: the founder's photo popping out of a glass card, with a short note in his own voice. */
export function AboutPage({ dept }: { dept: Dept }) {
  return <section className={`about about--${dept}`}>
    <div className="about__photo"><img src={FOUNDER_PHOTO} alt="The founder of Davinova" /></div>
    <div className="about__note">
      <span className="about__kicker">About Davinova</span>
      <h1>A note from the <b>founder</b></h1>
      <p>I started Davinova for the moments we plan our outfits around: the wedding, the engagement party, the night that deserves something special. Finding the right look for those days often meant too much searching and too much guessing about fit.</p>
      <p>So we are building one house with two shops, women's dresses and men's formalwear, plus the jewelry and watches that finish the look. Every style is checked for fit, stock and delivery before we open orders, so what arrives is what you hoped for.</p>
      <p>Thank you for being here at the start. Dress the moment, and own the room.</p>
      <span className="about__sign">Founder, Davinova</span>
      <Link to={dept === 'men' ? '/men/shop' : '/shop'} className="about__go">{dept === 'men' ? 'Shop formalwear' : 'Shop the collection'} →</Link>
    </div>
  </section>;
}
