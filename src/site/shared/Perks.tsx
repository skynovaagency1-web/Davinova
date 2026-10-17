import { HelpCircle, Lock, Ruler, Truck } from 'lucide-react';

const perks = [
  [Lock, 'Secure checkout', 'Card payments through Stripe'],
  [Truck, 'Tracked delivery', 'Tracking emailed when your order ships'],
  [Ruler, 'Size help', 'Sizes rechecked before you pay'],
  [HelpCircle, 'Real support', 'Write to us any time'],
] as const;

/** Four reassurance points shown on both shops. */
export function Perks({ variant }: { variant: 'women' | 'men' }) {
  return <section className={`perks perks--${variant}`} aria-label="Shopping with Davinova">{perks.map(([Icon, title, line]) =>
    <div key={title} className="perk"><Icon size={20} /><strong>{title}</strong><span>{line}</span></div>)}
  </section>;
}
