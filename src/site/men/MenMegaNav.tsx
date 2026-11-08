import { useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Link, useLocation } from 'react-router-dom';
import { useCatalogProducts } from '../../lib/useCatalogProducts';
import { JEWELRY_TYPES, jewelryMenu, jewelryPath } from '../shared/jewelry';
import { MEN_CATEGORIES, MEN_OCCASIONS, formalMen, menCategoryPath, menOccasionPath } from './menFormal';

// Same animated panel as the women's menu (WomenMegaNav): one shared panel springs between items on hover.
const spring = { type: 'spring', mass: 0.5, damping: 11.5, stiffness: 100, restDelta: 0.001, restSpeed: 0.001 } as const;

/** Men's categories grouped the way the women's menu groups them; order follows the owner's menu order. */
const GROUPS: { label: string; subs: string[] }[] = [
  { label: 'Tailoring', subs: ['wedding-suits', 'tuxedos-and-dinner-jackets', 'linen-and-summer-suits', 'blazers-and-waistcoats', 'dress-shirts'] },
  { label: 'Everyday', subs: ['outerwear-and-jackets', 'bottoms', 't-shirts', 'shorts'] },
  { label: 'Lounge & underwear', subs: ['mens-sleep-and-lounge', 'robes', 'man-pajama-sets', 'boxers', 'briefs', 'long-johns'] },
  { label: 'Shoes', subs: ['formal-shoes', 'casual-shoes', 'vulcanize-shoe', 'man-boots', 'man-sandals', 'man-slippers', 'mens-insoles'] },
  { label: 'Accessories', subs: ['ties-and-bow-ties', 'belts-and-suspenders', 'hats-and-caps', 'man-wallets'] },
  { label: 'Bags', subs: ['briefcases', 'messenger-bags-and-backpacks', 'mens-backpacks', 'crossbody-bags', 'waist-bags', 'luggage-and-travel-bags'] },
];
const SHORT = Object.fromEntries(MEN_CATEGORIES.map((item) => [item.sub, item.short])) as Record<string, string>;

function Item({ no, label, to, isCurrent, active, setActive, children }: { no: string; label: string; to: string; isCurrent: boolean; active: string | null; setActive: (value: string) => void; children: ReactNode }) {
  return <div className="w-mega__item" onMouseEnter={() => setActive(label)} onFocus={() => setActive(label)}>
    <Link to={to} className={`w-mega__trigger${active === label || isCurrent ? ' active' : ''}`} aria-expanded={active === label}><i>{no}</i>{label}</Link>
    {active !== null && <motion.div initial={{ opacity: 0, scale: 0.85, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={spring}>
      {active === label && <div className="w-mega__anchor">
        <motion.div layoutId="m-mega-panel" transition={spring} className="w-mega__panel">
          <motion.div layout className="w-mega__inner">{children}</motion.div>
        </motion.div>
      </div>}
    </motion.div>}
  </div>;
}

/** Men's desktop navigation, built like the women's: animated dropdown panels with grouped categories. */
export function MenMegaNav() {
  const [active, setActive] = useState<string | null>(null);
  const { pathname, search } = useLocation();
  const { products } = useCatalogProducts();
  const men = formalMen(products);
  const has = (sub: string) => men.some((product) => product.storeSubcategory === sub);
  const groups = GROUPS.map((group) => ({ ...group, subs: group.subs.filter(has) })).filter((group) => group.subs.length);
  const occasion = new URLSearchParams(search).get('occasion');

  return <nav className="w-mega m-mega" aria-label="Men's navigation" onMouseLeave={() => setActive(null)} onClick={() => setActive(null)}>
    <Item no="01" label="Shop" to="/men/shop" isCurrent={pathname === '/men/shop' && !occasion && !search.includes('cat=')} active={active} setActive={setActive}>
      <div className="w-mega__links">
        <Link to="/men/shop">Everything</Link>
        <Link to="/men/shop?sort=price-low">Under budget first</Link>
        <Link to="/men/categories">All categories</Link>
        <Link to={jewelryPath('men')}>Jewelry &amp; Watches</Link>
      </div>
    </Item>
    <Item no="02" label="Occasions" to={menOccasionPath(MEN_OCCASIONS[0].key)} isCurrent={Boolean(occasion)} active={active} setActive={setActive}>
      <div className="w-mega__links">
        {MEN_OCCASIONS.map((item) => <Link key={item.key} to={menOccasionPath(item.key)}><b>{item.title}</b><small>{item.line}</small></Link>)}
      </div>
    </Item>
    <Item no="03" label="Categories" to="/men/categories" isCurrent={pathname.startsWith('/men/categories') || pathname.startsWith('/men/jewelry') || search.includes('cat=')} active={active} setActive={setActive}>
      <div className="w-mega__cols w-mega__cols--cats m-mega__cats">
        {groups.map((group) => <div key={group.label} className="w-mega__links">
          <span className="w-mega__group">{group.label}</span>
          {group.subs.map((sub) => <Link key={sub} to={menCategoryPath(sub)}>{SHORT[sub]}</Link>)}
        </div>)}
        <div className="w-mega__links">
          <Link to={jewelryPath('men')} className="w-mega__group">Jewelry &amp; Watches</Link>
          {jewelryMenu('men').flatMap((group) => group.items).map((item) => <Link key={item} to={jewelryPath('men', item)}>{JEWELRY_TYPES[item].label}</Link>)}
        </div>
      </div>
    </Item>
    <Link to="/men/custom/design" className={`w-mega__trigger${pathname.startsWith('/men/custom') ? ' active' : ''}`}><i>04</i>Design yours</Link>
    <Link to="/men/about" className={`w-mega__trigger${pathname.startsWith('/men/about') ? ' active' : ''}`}><i>05</i>About</Link>
  </nav>;
}
