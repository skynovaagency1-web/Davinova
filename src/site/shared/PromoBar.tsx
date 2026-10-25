import { useEffect, useState } from 'react';
import { BUNDLE_TIERS, FREE_GIFT } from '../../lib/offers';
import { formatMoney } from '../../lib/format';

const MESSAGES = [
  'Free shipping on every order',
  `Buy ${BUNDLE_TIERS[1].minItems}, save ${BUNDLE_TIERS[1].percent}% · ${BUNDLE_TIERS[0].minItems}+, save ${BUNDLE_TIERS[0].percent}%`,
  `Free ${FREE_GIFT.title.toLowerCase()} with orders over ${formatMoney(FREE_GIFT.thresholdCents, 'USD').replace('.00', '')}`,
  '10% off your first order when you join the list',
];

/** Thin glass announcement bar above the header; the message changes every few seconds. */
export function PromoBar({ dept }: { dept: 'women' | 'men' }) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => setIndex((value) => (value + 1) % MESSAGES.length), 4200);
    return () => window.clearInterval(timer);
  }, []);
  return <div className={`promo-bar promo-bar--${dept}`} role="region" aria-label="Offers">
    <span key={index} className="promo-bar__msg">{MESSAGES[index]}</span>
  </div>;
}
