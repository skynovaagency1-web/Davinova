import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';

const codes = [
  { no: '01', title: 'Black tie', tip: 'Floor-length, rich fabrics, minimal print. Think satin, velvet and sequins.', to: '/shop?category=weddings-and-events&sub=evening-dresses', tag: 'Evening Dresses' },
  { no: '02', title: 'Cocktail', tip: 'Knee to midi length, one statement detail: a bare shoulder, a slit, some shine.', to: '/shop?category=weddings-and-events&sub=cocktail-dresses', tag: 'Cocktail Dresses' },
  { no: '03', title: 'Garden wedding', tip: 'Soft colours, florals and lace. Avoid white and anything that competes with the bride.', to: '/shop?style=floral', tag: 'Floral & print' },
  { no: '04', title: 'Beach & destination', tip: 'Light, flowing maxis that move in the breeze and pack without creasing.', to: '/shop?category=tops-and-sets&sub=lady-dresses', tag: 'Lady Dresses' },
] as const;

/** "What to wear to…": a quick dress-code guide that sends each code to the matching edit. */
export function DressCodeGuide({ title = 'What to wear to' }: { title?: string }) {
  return <section className="w-codes">
    <div className="w-sec-head"><h2>{title} <b>…</b></h2><p className="w-sec-head__note">Not sure what the invitation means? Start here.</p></div>
    <div className="w-codes__grid">{codes.map((code) => <Link key={code.no} to={code.to} className="w-code">
      <span className="w-code__no">{code.no}</span>
      <strong>{code.title}</strong>
      <p>{code.tip}</p>
      <span className="w-code__tag">{code.tag} <ArrowUpRight size={15} /></span>
    </Link>)}</div>
  </section>;
}
