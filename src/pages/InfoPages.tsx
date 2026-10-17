import { Link, useLocation } from 'react-router-dom';

const content: Record<string, { title: string; text: string }> = {
  about: { title: 'A feeling, not just a dress.', text: 'Davinova is an occasionwear edit for weddings, celebrations and evenings that call for something special. We are carefully sourcing each style and checking its fit, availability and delivery details before opening orders.' },
  shipping: { title: 'Shipping, with care.', text: 'We are verifying delivery services, costs, customs details and realistic delivery windows with our fulfilment partner. Confirmed shipping information will be published here before checkout opens.' },
  returns: { title: 'A little more clarity.', text: 'Our return and refund terms are being finalised for the markets we will serve. We will publish the complete policy, time limits, conditions and return instructions before accepting orders.' },
  privacy: { title: 'Your privacy matters.', text: 'This preview is not accepting orders. Before launch, Davinova will publish a complete privacy notice identifying the data controller, the data collected, its uses, retention periods, service providers and how customers can exercise their rights.' },
  contact: { title: 'We’re here to help.', text: 'Davinova customer support details are being set up. A monitored support address and contact process will be published before the store opens for orders.' },
};
export function InfoPage() {
  const slug = useLocation().pathname.split('/').filter(Boolean).pop() ?? 'about';
  const page = content[slug] ?? content.about;
  return <section className="info-page section"><p className="eyebrow">Davinova notes</p><h1>{page.title}</h1><p>{page.text}</p><Link className="button button--dark" to="/shop">Explore the collection</Link></section>;
}
export function NotFoundPage() {
  return <section className="info-page section not-found"><p className="eyebrow">404 · A little detour</p><h1>This page took the scenic route.</h1><p>Let’s get you back to something lovely.</p><Link className="button button--dark" to="/">Return home</Link></section>;
}
