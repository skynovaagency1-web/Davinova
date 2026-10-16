import { ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { editorialImages } from '../lib/editorialImages';

export function StorefrontChooser() {
  return (
    <section id="storefront-chooser" className="storefront-chooser" aria-labelledby="storefront-chooser-title">
      <div className="storefront-chooser__heading">
        <p className="eyebrow">Two edits. One Davinova.</p>
        <h2 id="storefront-chooser-title">Find your <em>kind of fit.</em></h2>
        <p>Choose the collection that feels right for you. Each edit has its own dedicated shopping experience.</p>
      </div>

      <div className="storefront-chooser__grid">
        <article className="storefront-choice storefront-choice--standard">
          <img src={editorialImages.black} alt="" loading="lazy" aria-hidden="true" />
          <div className="storefront-choice__wash" />
          <div className="storefront-choice__content">
            <span className="storefront-choice__number">01 / THE MAIN EDIT</span>
            <h3>Standard <em>collection.</em></h3>
            <p>Considered occasionwear for weddings, celebrations, and the moments worth dressing for.</p>
            <Link className="storefront-choice__link" to="/shop?fit=standard">
              Explore the standard edit <ArrowUpRight size={17} />
            </Link>
          </div>
        </article>

        <article className="storefront-choice storefront-choice--curvy">
          <img src={editorialImages.burgundy} alt="" loading="lazy" aria-hidden="true" />
          <div className="storefront-choice__wash" />
          <div className="storefront-choice__content">
            <span className="storefront-choice__number">02 / THE CURVE EDIT</span>
            <h3>Plus Size <em>&amp; Curvy.</em></h3>
            <p>An independent, size-inclusive edit built around extended sizing and feeling wonderful in your fit.</p>
            <Link className="storefront-choice__link" to="/shop?fit=curvy">
              Explore the Curvy edit <ArrowUpRight size={17} />
            </Link>
          </div>
          <span className="storefront-choice__note">A DEDICATED EDIT · SAME DAVINOVA STORE</span>
        </article>
      </div>
    </section>
  );
}
