import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import type { Dept } from './jewelry';

const SUPPORT_EMAIL = 'hello@davinova.com';

type Page = { slug: string; label: string; title: string; intro: string; body: (dept: Dept) => ReactNode };

const base = (dept: Dept) => (dept === 'men' ? '/men' : '');

const WOMEN_SIZES = [
  ['XS', '78–82', '60–64', '84–88'],
  ['S', '83–87', '65–69', '89–93'],
  ['M', '88–92', '70–74', '94–98'],
  ['L', '93–98', '75–80', '99–104'],
  ['XL', '99–104', '81–86', '105–110'],
  ['2XL', '105–111', '87–93', '111–117'],
  ['3XL', '112–118', '94–100', '118–124'],
  ['4XL', '119–126', '101–108', '125–132'],
];

const MEN_SIZES = [
  ['S', '86–91', '71–76', '44'],
  ['M', '92–97', '77–82', '46–48'],
  ['L', '98–103', '83–88', '50'],
  ['XL', '104–109', '89–94', '52'],
  ['2XL', '110–116', '95–101', '54'],
  ['3XL', '117–123', '102–108', '56'],
];

const SHOE_SIZES: Record<Dept, string[][]> = {
  women: [['36', '5.5', '3.5', '22.5'], ['37', '6.5', '4', '23.5'], ['38', '7.5', '5', '24'], ['39', '8.5', '6', '25'], ['40', '9', '6.5', '25.5'], ['41', '9.5', '7', '26'], ['42', '10.5', '8', '26.5']],
  men: [['39', '6.5', '6', '24.5'], ['40', '7', '6.5', '25'], ['41', '8', '7', '26'], ['42', '8.5', '8', '26.5'], ['43', '9.5', '9', '27.5'], ['44', '10', '9.5', '28'], ['45', '11', '10.5', '29'], ['46', '12', '11', '29.5']],
};

function Table({ head, rows }: { head: string[]; rows: string[][] }) {
  return <div className="help__table"><table>
    <thead><tr>{head.map((cell) => <th key={cell} scope="col">{cell}</th>)}</tr></thead>
    <tbody>{rows.map((row) => <tr key={row[0]}>{row.map((cell, index) => index ? <td key={index}>{cell}</td> : <th key={index} scope="row">{cell}</th>)}</tr>)}</tbody>
  </table></div>;
}

const Mail = () => <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>;

const HELP_PAGES: Page[] = [
  {
    slug: 'shipping', label: 'Shipping', title: 'Shipping', intro: 'Every order ships with tracking, from our partner warehouses straight to your door.',
    body: () => <>
      <h2>How long it takes</h2>
      <p>We prepare and hand your order to the carrier within 1–3 business days. Delivery then usually takes 7–15 business days, depending on where you live and the shipping method shown at checkout.</p>
      <h2>Tracking</h2>
      <p>As soon as your order leaves the warehouse we email you a tracking number. Tracking can take a day or two to show its first update.</p>
      <h2>Cost</h2>
      <p>The shipping cost for your address is shown at checkout before you pay. There are no hidden fees from us.</p>
      <h2>Customs and duties</h2>
      <p>Some countries charge import duties or taxes on arrival. These are set by your country, not by Davinova, and are paid to the carrier if they apply.</p>
      <h2>Planning for an event?</h2>
      <p>Order at least three weeks before the day so there is time for delivery and, if needed, an exchange.</p>
    </>,
  },
  {
    slug: 'returns', label: 'Returns', title: 'Returns & refunds', intro: 'Changed your mind, or the fit is not right? You have 30 days.',
    body: () => <>
      <h2>Our return window</h2>
      <p>You can return items within 30 days of delivery. They must be unworn, unwashed and in their original condition with tags attached.</p>
      <h2>What we can't take back</h2>
      <p>For hygiene reasons, underwear, swimwear, earrings and beauty products can only be returned if they arrive faulty. Personalised items can't be returned.</p>
      <h2>How to return</h2>
      <p>Email <Mail /> with your order number and the items you'd like to return. We'll reply with the return address and instructions. Please don't send items back before we confirm, so they reach the right place.</p>
      <h2>Refunds</h2>
      <p>Once your return arrives and is checked, we refund the original payment method within 5–10 business days. Return shipping is paid by you, unless the item arrived damaged, faulty or not as described.</p>
      <h2>Damaged or wrong item?</h2>
      <p>Email us within 7 days of delivery with a photo, and we'll send a replacement or a full refund, including shipping.</p>
    </>,
  },
  {
    slug: 'size-guide', label: 'Size guide', title: 'Size guide', intro: 'Measure over light clothing and compare with the chart. Between two sizes? Take the larger one.',
    body: (dept) => <>
      <h2>{dept === 'men' ? 'Suits, shirts and tops' : 'Dresses and tops'} (cm)</h2>
      {dept === 'men'
        ? <Table head={['Size', 'Chest', 'Waist', 'EU suit']} rows={MEN_SIZES} />
        : <Table head={['Size', 'Bust', 'Waist', 'Hips']} rows={WOMEN_SIZES} />}
      <h2>Shoes</h2>
      <Table head={['EU', 'US', 'UK', 'Foot (cm)']} rows={SHOE_SIZES[dept]} />
      <h2>How to measure</h2>
      <ul>
        <li><b>{dept === 'men' ? 'Chest' : 'Bust'}:</b> around the fullest part, keeping the tape level.</li>
        <li><b>Waist:</b> around the narrowest part of your natural waist.</li>
        {dept === 'men' ? <li><b>Sleeve:</b> from the shoulder seam to the wrist bone.</li> : <li><b>Hips:</b> around the fullest part of your hips.</li>}
        <li><b>Foot:</b> heel to longest toe, standing on paper.</li>
      </ul>
      <p className="help__note">Sizes can vary a little between styles. When a product has its own measurements, they are shown on its page and take priority over this chart.</p>
    </>,
  },
  {
    slug: 'faq', label: 'FAQ', title: 'Questions, answered', intro: 'The things people ask us most.',
    body: (dept) => <>
      <h2>When can I order?</h2>
      <p>We are checking fit, stock and delivery for every style before checkout opens. Items marked "Coming soon" will open for orders once that check is done.</p>
      <h2>Will it arrive in time for my event?</h2>
      <p>Delivery usually takes 7–15 business days after a 1–3 day preparation time. Order at least three weeks ahead to be safe. See <Link to={`${base(dept)}/shipping`}>Shipping</Link>.</p>
      <h2>How do I choose my size?</h2>
      <p>Use our <Link to={`${base(dept)}/size-guide`}>Size guide</Link>. If you're between sizes, take the larger one.</p>
      <h2>Can I return or exchange?</h2>
      <p>Yes, within 30 days of delivery, unworn and with tags. See <Link to={`${base(dept)}/returns`}>Returns</Link>.</p>
      <h2>How do I pay?</h2>
      <p>Checkout will accept major cards through a secure payment provider. We never see or store your full card number.</p>
      <h2>Do the photos show the real product?</h2>
      <p>Product photos come from our suppliers, and we only show styles whose photos give a true view of the piece. Colours can look slightly different on different screens.</p>
    </>,
  },
  {
    slug: 'contact', label: 'Contact', title: 'Contact us', intro: 'A real person reads every message.',
    body: (dept) => <>
      <h2>Email</h2>
      <p className="help__big"><Mail /></p>
      <p>We reply within 1–2 business days. For an order, please include your order number.</p>
      <h2>Before you write</h2>
      <p>Most answers about delivery, sizes and returns are in our <Link to={`${base(dept)}/faq`}>FAQ</Link>.</p>
    </>,
  },
  {
    slug: 'privacy', label: 'Privacy', title: 'Privacy policy', intro: 'What we collect, why, and the choices you have.',
    body: () => <>
      <h2>What we collect</h2>
      <p>When you order, we collect your name, email, delivery address, phone number and the items you buy. Payments are handled by our payment provider; we never receive your full card number.</p>
      <h2>Why we use it</h2>
      <p>To process and deliver your order, send order and tracking emails, handle returns, answer your messages, and meet our legal and tax obligations.</p>
      <h2>Who we share it with</h2>
      <p>Only with the services needed to fulfil your order: our payment provider, our fulfilment partner and the shipping carrier. We don't sell your data.</p>
      <h2>How long we keep it</h2>
      <p>Order records are kept for as long as tax and accounting law requires, then deleted.</p>
      <h2>Your rights</h2>
      <p>You can ask to see, correct or delete your personal data, or object to how it's used, by emailing <Mail />.</p>
      <h2>Cookies</h2>
      <p>We use only the storage needed for the site to work, such as remembering your shopping bag.</p>
    </>,
  },
  {
    slug: 'terms', label: 'Terms', title: 'Terms of sale', intro: 'The short version of the agreement when you shop with us.',
    body: (dept) => <>
      <h2>Orders</h2>
      <p>An order is confirmed when you receive our confirmation email. If an item becomes unavailable, we'll let you know and refund it in full.</p>
      <h2>Prices</h2>
      <p>Prices are shown in US dollars. Shipping is added at checkout, and any import duties are set by your country.</p>
      <h2>Delivery and returns</h2>
      <p>Delivery times are estimates; see <Link to={`${base(dept)}/shipping`}>Shipping</Link>. Returns follow our <Link to={`${base(dept)}/returns`}>Returns policy</Link>.</p>
      <h2>Product information</h2>
      <p>We describe and photograph products as accurately as we can. Small differences in colour and measurements can occur.</p>
      <h2>Questions</h2>
      <p>Email <Mail /> and we'll help.</p>
    </>,
  },
];

/** Shipping, returns, sizes, FAQ, contact and policies: one page per topic, with tabs for the rest, in either shop's style. */
export function HelpPage({ dept, slug }: { dept: Dept; slug: string }) {
  const page = HELP_PAGES.find((item) => item.slug === slug) ?? HELP_PAGES[0];
  return <section className={`jw jw--${dept} help`}>
    <header className="jw__head">
      <span className="jw__kicker">Davinova · Help</span>
      <h1>{page.title}</h1>
      <p>{page.intro}</p>
    </header>
    <nav className="jw__groups help__tabs" aria-label="Help topics">
      {HELP_PAGES.map((item) => <Link key={item.slug} to={`${base(dept)}/${item.slug}`} className={item.slug === page.slug ? 'active' : ''}>{item.label}</Link>)}
    </nav>
    <article className="help__body">{page.body(dept)}</article>
  </section>;
}
