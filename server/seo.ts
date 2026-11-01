/**
 * Search and share details for each page, added to the HTML before it leaves the server: a real title and
 * description per product and category, a share picture, and schema.org data (product price and stock, the
 * shop itself) so Google can show rich results without running the app first.
 */
import { cleanSupplierText, cleanTitle } from '../src/lib/productText';
import { brand } from '../src/config/brand';
import { menStoreCollectionGroups, storeCollectionGroups } from '../src/lib/storeCollectionTaxonomy';

export interface PageSeo { title: string; description: string; image: string; type: 'website' | 'product'; jsonLd: object[] }

const SITE = 'https://davinova.com';
const DEFAULT_IMAGE = `${SITE}/images/og-davinova.jpg`;
const BRAND = 'Davinova';

const STATIC: Record<string, [string, string]> = {
  '/': ['Davinova — Occasion dresses, bags, shoes & beauty', 'Wedding guest, cocktail and evening dresses, bags, shoes, jewelry and beauty, with free tracked shipping.'],
  '/shop': ['Shop all — Davinova', 'Every Davinova piece in one place: occasion dresses, tops, bottoms, outerwear, bags and shoes.'],
  '/categories': ['Categories — Davinova', 'Browse Davinova by category: dresses, tops and sets, bottoms, outerwear, bags, shoes and accessories.'],
  '/beauty': ['Health, beauty & hair — Davinova', 'Makeup, skin care, nail art, hair, wigs and beauty tools, picked to go with the dress.'],
  '/custom': ['Davinova Custom — wedding party tees, robes & totes', 'Our own designs for the bride, her bridesmaids and the groom’s crew, printed when you order.'],
  '/jewelry': ['Jewelry & watches — Davinova', 'Bridal sets, engagement rings, wedding hair pieces, fine and fashion jewelry, and women’s watches.'],
  '/watches': ['Watches — Davinova', 'Watches to finish the look, for her and for him.'],
  '/plus-size': ['Plus-size occasion wear — Davinova', 'Curvy wedding guest, cocktail and evening looks on real plus-size models.'],
  '/about': ['About — Davinova', 'Davinova: occasion wear for her and for him, chosen piece by piece.'],
  '/shipping': ['Shipping — Davinova', 'Free tracked shipping to the United States, Canada, New Zealand and the UAE.'],
  '/returns': ['Returns — Davinova', 'How returns work at Davinova.'],
  '/size-guide': ['Size guide — Davinova', 'Find your size for Davinova dresses, suits and shoes.'],
  '/faq': ['FAQ — Davinova', 'Answers about orders, shipping, sizes, returns and payment.'],
  '/contact': ['Contact — Davinova', 'Get in touch with Davinova.'],
  '/men': ['Davinova Men — suits, tuxedos & formalwear', 'Wedding suits, tuxedos, blazers, shirts, shoes, watches and accessories for every occasion.'],
  '/men/shop': ['Shop men — Davinova', 'Every Davinova menswear piece: suits, tuxedos, shirts, outerwear, shoes and bags.'],
  '/men/categories': ['Men’s categories — Davinova', 'Browse Davinova menswear by category.'],
  '/men/custom': ['Davinova Custom for men — tees for the groom’s crew', 'Blank tees with your print or ours, made when you order.'],
  '/men/jewelry': ['Men’s jewelry & watches — Davinova', 'Wedding bands, cufflinks, chains and men’s watches.'],
};

const esc = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const clip = (value: string, max = 158) => (value.length > max ? `${value.slice(0, max - 1).replace(/\s+\S*$/, '')}…` : value);
const plain = (html: string) => cleanSupplierText(html.replace(/<[^>]*>/g, ' '));

function organisation(): object[] {
  return [
    { '@context': 'https://schema.org', '@type': 'Organization', name: BRAND, url: SITE, logo: `${SITE}/favicon.svg`, email: 'contact@davinova.com', sameAs: Object.values(brand.socialLinks).filter(Boolean) },
    { '@context': 'https://schema.org', '@type': 'WebSite', name: BRAND, url: SITE, inLanguage: ['en', 'fr', 'es'] },
  ];
}

interface ProductRow { id: string; slug: string; title: string; description: string; price_cents: number; currency: string; department: string; image: string | null; in_stock: number }

async function productSeo(db: D1Database, slug: string, canonical: string): Promise<PageSeo | null> {
  const row = await db.prepare(`SELECT p.id, p.slug, p.title, p.description, p.price_cents, p.currency, p.department,
      (SELECT url FROM product_images i WHERE i.product_id = p.id ORDER BY i.is_primary DESC, i.position LIMIT 1) AS image,
      (SELECT COUNT(*) FROM product_variants v WHERE v.product_id = p.id AND v.active = 1) AS in_stock
    FROM products p WHERE p.slug = ? AND p.active = 1`).bind(slug).first<ProductRow>();
  if (!row) return null;
  row.title = cleanTitle(row.title);
  const description = clip(plain(row.description) || `${row.title}, with free tracked shipping from ${BRAND}.`);
  const image = row.image ?? DEFAULT_IMAGE;
  const product: Record<string, unknown> = {
    '@context': 'https://schema.org', '@type': 'Product', name: row.title, description, image: [image], sku: row.id,
    brand: { '@type': 'Brand', name: BRAND }, url: canonical,
  };
  if (row.price_cents > 0) {
    product.offers = {
      '@type': 'Offer', url: canonical, priceCurrency: row.currency || 'USD', price: (row.price_cents / 100).toFixed(2),
      availability: row.in_stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      itemCondition: 'https://schema.org/NewCondition',
      shippingDetails: { '@type': 'OfferShippingDetails', shippingRate: { '@type': 'MonetaryAmount', value: '0', currency: row.currency || 'USD' }, shippingDestination: { '@type': 'DefinedRegion', addressCountry: 'US' } },
    };
  }
  const shop = row.department === 'men' ? '/men' : '/';
  const crumbs = { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
    { '@type': 'ListItem', position: 1, name: row.department === 'men' ? 'Men' : 'Women', item: `${SITE}${shop}` },
    { '@type': 'ListItem', position: 2, name: row.title, item: canonical },
  ] };
  return { title: `${row.title} — ${BRAND}`, description, image, type: 'product', jsonLd: [product, crumbs] };
}

function categorySeo(bare: string, params: URLSearchParams): PageSeo | null {
  if (bare === '/shop' && params.get('category')) {
    const group = storeCollectionGroups.find((item) => item.slug === params.get('category'));
    if (!group) return null;
    const sub = group.subcategories.find((item) => item.slug === params.get('sub'));
    const name = sub ? sub.label : group.label;
    return { title: `${name} — ${BRAND}`, description: `Shop ${name.toLowerCase()} at ${BRAND}${sub ? `, part of ${group.label.toLowerCase()}` : ''}. Free tracked shipping.`, image: DEFAULT_IMAGE, type: 'website', jsonLd: [] };
  }
  if (bare === '/men/shop' && params.get('cat')) {
    const sub = menStoreCollectionGroups.flatMap((group) => group.subcategories).find((item) => item.slug === params.get('cat'));
    if (!sub) return null;
    return { title: `${sub.label} for men — ${BRAND}`, description: `Shop men’s ${sub.label.toLowerCase()} at ${BRAND}. Free tracked shipping.`, image: DEFAULT_IMAGE, type: 'website', jsonLd: [] };
  }
  return null;
}

/** The search and share details for one page, or null to keep the defaults in index.html. */
export async function pageSeo(db: D1Database | undefined, bare: string, params: URLSearchParams, canonical: string): Promise<PageSeo | null> {
  const product = bare.match(/^\/(?:men\/)?product\/([^/]+)$/);
  if (product && db) {
    try { return await productSeo(db, decodeURIComponent(product[1]), canonical); } catch { return null; }
  }
  const category = categorySeo(bare, params);
  if (category) return category;
  const known = STATIC[bare];
  if (!known) return null;
  return { title: known[0], description: known[1], image: DEFAULT_IMAGE, type: 'website', jsonLd: bare === '/' ? organisation() : [] };
}

export function seoTags(seo: PageSeo, canonical: string): string {
  return `<meta property="og:type" content="${seo.type}" /><meta property="og:site_name" content="${BRAND}" />`
    + `<meta property="og:title" content="${esc(seo.title)}" /><meta property="og:description" content="${esc(seo.description)}" />`
    + `<meta property="og:url" content="${esc(canonical)}" /><meta property="og:image" content="${esc(seo.image)}" />`
    + `<meta name="twitter:card" content="summary_large_image" /><meta name="twitter:title" content="${esc(seo.title)}" />`
    + `<meta name="twitter:description" content="${esc(seo.description)}" /><meta name="twitter:image" content="${esc(seo.image)}" />`
    + seo.jsonLd.map((data) => `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`).join('');
}
