import { menStoreCollectionGroups, storeCollectionGroups } from './storeCollectionTaxonomy';

/** Title and search description for each fixed page, shared by the server (first load) and the browser tab (later pages). */
export const STATIC_PAGES: Record<string, [string, string]> = {
  '/': ['Davinova — Occasion dresses, bags, shoes & beauty', 'Wedding guest, cocktail and evening dresses, bags, shoes, jewelry and beauty, with free tracked shipping.'],
  '/looks': ['New fashion — Davinova', 'Whole outfits styled head to toe: the dress, heels, bag and jewelry, added to your bag in one tap.'],
  '/men/looks': ['New fashion — Davinova Homme', 'Whole outfits styled head to toe: the suit, shoes, tie, belt and watch, added to your bag in one tap.'],
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
  '/fits': ['Shop by fit — Davinova', 'Occasion dresses by fit: slim and standard sizes, or curvy and plus-size looks on real models.'],
  '/slim': ['Slim & standard fit dresses — Davinova', 'Wedding guest, cocktail and evening dresses in slim and standard sizes.'],
  '/accessories': ['Accessories — Davinova', 'Belts, scarves, hats, sunglasses and small finishing touches for the occasion.'],
  '/couple': ['Couple & family outfits — Davinova', 'Matching outfits for couples and parents with children, for weddings, photos and holidays.'],
  '/gift-cards': ['Gift cards — Davinova', 'Give a Davinova gift card by email, from $25, to spend on any dress, suit, bag or piece of jewelry.'],
  '/refer': ['Refer a friend — Davinova', 'Share Davinova with a friend: they save on their first order and you earn credit.'],
  '/privacy': ['Privacy — Davinova', 'How Davinova collects, uses and protects your personal data.'],
  '/terms': ['Terms — Davinova', 'The terms of sale and use of the Davinova shop.'],
  '/men': ['Davinova Men — suits, tuxedos & formalwear', 'Wedding suits, tuxedos, blazers, shirts, shoes, watches and accessories for every occasion.'],
  '/men/shop': ['Shop men — Davinova', 'Every Davinova menswear piece: suits, tuxedos, shirts, outerwear, shoes and bags.'],
  '/men/categories': ['Men’s categories — Davinova', 'Browse Davinova menswear by category.'],
  '/men/custom': ['Davinova Custom for men — tees for the groom’s crew', 'Blank tees with your print or ours, made when you order.'],
  '/men/jewelry': ['Men’s jewelry & watches — Davinova', 'Wedding bands, cufflinks, chains and men’s watches.'],
  '/men/gift-cards': ['Gift cards for men — Davinova', 'Give a Davinova gift card by email, to spend on suits, shoes, watches and more.'],
  '/men/refer': ['Refer a friend — Davinova Men', 'Share Davinova with a friend: they save on their first order and you earn credit.'],
  '/men/about': ['About — Davinova Men', 'Davinova: occasion wear for him and for her, chosen piece by piece.'],
  '/men/shipping': ['Shipping — Davinova Men', 'Free tracked shipping on suits, shoes and accessories.'],
  '/men/returns': ['Returns — Davinova Men', 'How returns work at Davinova.'],
  '/men/size-guide': ['Men’s size guide — Davinova', 'Find your size for Davinova suits, shirts and shoes.'],
  '/men/faq': ['FAQ — Davinova Men', 'Answers about orders, shipping, sizes, returns and payment.'],
  '/men/contact': ['Contact — Davinova Men', 'Get in touch with Davinova.'],
};

/** "/shop?category=dresses&sub=maxi" → "Maxi dresses — Davinova"; null when the page isn't a category. */
export function categoryTitle(pathname: string, params: URLSearchParams): string | null {
  if (pathname === '/shop' && params.get('category')) {
    const group = storeCollectionGroups.find((item) => item.slug === params.get('category'));
    if (!group) return null;
    const sub = group.subcategories.find((item) => item.slug === params.get('sub'));
    return `${sub ? `${sub.label} · ${group.label}` : group.label} — Davinova`;
  }
  if (pathname === '/men/shop' && params.get('cat')) {
    const sub = menStoreCollectionGroups.flatMap((group) => group.subcategories).find((item) => item.slug === params.get('cat'));
    return sub ? `${sub.label} for men — Davinova` : null;
  }
  return null;
}

/** The browser tab title for any page; product pages pass their product name. */
export function pageTitle(pathname: string, search: string, productName?: string): string | null {
  const bare = pathname.replace(/^\/(fr|es)(?=\/|$)/, '') || '/';
  if (productName && /\/product\//.test(bare)) return `${productName} — Davinova`;
  return categoryTitle(bare, new URLSearchParams(search)) ?? STATIC_PAGES[bare]?.[0] ?? null;
}
