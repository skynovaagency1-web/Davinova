import { Link, useParams } from 'react-router-dom';
const content: Record<string, { title: string; text: string }> = {
  about: { title: 'A feeling, not just a dress.', text: 'Davinova is a placeholder brand built around the idea that getting dressed for an occasion should feel joyful, personal, and considered. [EDIT ME: replace with the approved brand story.]' },
  shipping: { title: 'Shipping, with care.', text: 'Shipping times and costs depend on the supplier and destination. [EDIT ME: publish confirmed processing times, shipping rates, customs information, and tracking details before accepting orders.]' },
  returns: { title: 'A little more clarity.', text: ' [EDIT ME: define the return window, eligible conditions, return address, return shipping responsibility, refund timeline, and applicable consumer rights before launch.]' },
  privacy: { title: 'Your privacy matters.', text: '[EDIT ME: add a reviewed privacy notice explaining data controller identity, lawful bases, retention, processors, international transfers, and user rights for each market served.]' },
  contact: { title: 'We’re here to help.', text: 'For order questions, contact support@example.com. [EDIT ME: replace this placeholder with a monitored support address.]' },
};
export function InfoPage() { const { slug = 'about' } = useParams(); const page = content[slug] ?? content.about; return <section className="info-page section"><p className="eyebrow">Davinova notes</p><h1>{page.title}</h1><p>{page.text}</p><Link className="button button--dark" to="/shop">Explore the collection</Link></section>; }
export function NotFoundPage() { return <section className="info-page section"><p className="eyebrow">404 · A little detour</p><h1>This page took the scenic route.</h1><p>Let’s get you back to something lovely.</p><Link className="button button--dark" to="/">Return home</Link></section>; }
