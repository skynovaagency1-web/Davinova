/**
 * Hero banners for the category pages (owner's three reference pictures, 2026-11-02):
 * - stage: product on a dark rock with a gold arc, outline "Shop now" and a perks bar (bags).
 * - pedestal: title, short text and a feature list; product on a marble pedestal with bronze flowers (shoes).
 * - mono: giant word behind the product with floating gears (watches).
 * Titles: "/" breaks a line, *word* is the gold word.
 */
export type HeroScene = 'stage' | 'pedestal' | 'mono';
export type HeroIcon = 'heel' | 'leather' | 'hand' | 'ruler' | 'gem' | 'spark' | 'drop' | 'leaf' | 'gear' | 'shield' | 'needle' | 'heart';
export type HeroCopy = {
  scene: HeroScene;
  title: string;
  text: string;
  ghost?: string;
  features?: [HeroIcon, string, string][];
  /** Hand-picked photos (checked by eye), used when they are on the page. */
  picks?: string[];
};

const SHOE_FEATURES: [HeroIcon, string, string][] = [
  ['heel', 'Made to walk in', 'Heights picked for a long day'],
  ['leather', 'Fine finishes', 'Satin, suede and patent'],
  ['ruler', 'True to size', 'A size guide on every pair'],
];
const DRESS_FEATURES: [HeroIcon, string, string][] = [
  ['spark', 'Shown on the model', 'See the real fit before you buy'],
  ['ruler', 'Slim and curvy', 'Sizes for every figure'],
  ['heart', '30-day returns', 'Easy if it is not the one'],
];
const BEAUTY_FEATURES: [HeroIcon, string, string][] = [
  ['drop', 'Every shade', 'Picked for every skin tone'],
  ['spark', 'The finishing touch', 'Made to go with the dress'],
  ['heart', 'Gift-ready', 'To give, or to keep'],
];
const JEWEL_FEATURES: [HeroIcon, string, string][] = [
  ['gem', 'Hand-picked', 'Only pieces that pass our eye check'],
  ['shield', 'Made to last', 'Tarnish-resistant finishes'],
  ['heart', 'Gift-ready', 'To give, or to keep'],
];
const MEN_SHOE_FEATURES: [HeroIcon, string, string][] = [
  ['leather', 'Polished finish', 'Leather looks for the suit'],
  ['hand', 'All-day comfort', 'Cushioned for the long night'],
  ['ruler', 'True to size', 'A size guide on every pair'],
];
const TAILOR_FEATURES: [HeroIcon, string, string][] = [
  ['needle', 'Sharp tailoring', 'Clean lines that hold their shape'],
  ['ruler', 'Size guide', 'Find your fit in a minute'],
  ['shield', '30-day returns', 'Free tracked shipping'],
];

const WATCH: HeroCopy = { scene: 'mono', ghost: 'TIME', title: 'Time, / *beautifully* / kept', text: 'Gold, rose and steel watches chosen to sit with the look, from the ceremony to the Monday after.' };

export const CATEGORY_HEROES: Record<string, HeroCopy> = {
  // Women: bags
  'womens-bags': { scene: 'stage', picks: ['cj-1797118928032903168', 'cj-1654868512030068736', 'cj-1731879208583958528', 'cj-1535808011275612160'], title: 'Where elegance / meets / *timeless*', text: 'Clutches, handbags and totes made to finish the look, from the ceremony to the after-party.' },
  clutches: { scene: 'stage', picks: ['cj-1731879208583958528'], title: 'Small bag, / *big* / entrance', text: 'Beaded, satin and metallic clutches made for the evening.' },
  'evening-bags': { scene: 'stage', picks: ['cj-1731879208583958528'], title: 'After dark, / in *gold*', text: 'Evening bags that catch the light, sized for the essentials.' },
  totes: { scene: 'stage', picks: ['cj-1654868512030068736', 'cj-1797118928032903168'], title: 'Carry it all, / *beautifully*', text: 'Roomy totes for the day around the wedding, and every day after.' },
  'shoulder-bags': { scene: 'stage', picks: ['cj-1797118928032903168', 'cj-1535808011275612160'], title: 'Hands free, / *always* / elegant', text: 'Shoulder bags in clean shapes and soft leather looks.' },
  'womens-crossbody-bags': { scene: 'stage', picks: ['cj-1535808011275612160', 'cj-1539159515470508032', 'cj-1797118928032903168'], title: 'Hands free, / *always* / elegant', text: 'Crossbody bags that keep up with the dance floor.' },
  'woman-wallets': { scene: 'stage', picks: ['cj-1526438387480276992', 'cj-2407310248301620700', 'cj-1380432681308917760'], title: 'Small, / *essential*', text: 'Wallets and card holders to match the bag.' },
  'fashion-backpacks': { scene: 'stage', title: 'The *chic* / backpack', text: 'Backpacks with a polished finish, for travel days.' },
  'bag-accessories': { scene: 'stage', title: 'The *finishing* / detail', text: 'Straps, charms and extras to make the bag yours.' },
  // Women: shoes
  'womens-shoes': { scene: 'pedestal', picks: ['cj-2406080543561613000', 'cj-2406080319241618000', 'cj-2406261520121622800', 'cj-2411110251451625200'], title: 'The *evening* / heel', text: 'Heels, flats, sandals and boots picked to go with the dress.', features: SHOE_FEATURES },
  pumps: { scene: 'pedestal', picks: ['cj-2406080543561613000', 'cj-2406080319241618000', 'cj-2406261520121622800', 'cj-2406180559271624200'], title: 'The *Nova* / stiletto', text: 'A sculpted heel, a clean line and a shine made for the aisle.', features: SHOE_FEATURES },
  'woman-sandals': { scene: 'pedestal', picks: ['cj-1630388438891909120', 'cj-1783680345863368704'], title: 'The *summer* / sandal', text: 'Strappy sandals for garden weddings and warm evenings.', features: SHOE_FEATURES },
  flats: { scene: 'pedestal', title: 'The *easy* / flat', text: 'Flats for dancing all night, without giving up the look.', features: SHOE_FEATURES },
  'woman-boots': { scene: 'pedestal', picks: ['cj-2411110251451625200', 'cj-2410200900451607100', 'cj-2506051526231611000', 'cj-2501251235371629500'], title: 'The *city* / boot', text: 'Ankle and knee boots for the colder months.', features: SHOE_FEATURES },
  'vulcanize-shoes': { scene: 'pedestal', picks: ['cj-1773307956126289920', 'cj-1381909663775330304', 'cj-2406150621011628600'], title: 'The *off-duty* / sneaker', text: 'Clean sneakers for the days around the event.', features: SHOE_FEATURES },
  'woman-slippers': { scene: 'pedestal', title: 'The *soft* / slipper', text: 'Slippers for getting ready, and the morning after.', features: SHOE_FEATURES },
  // Women: dresses and clothes
  'weddings-and-events': { scene: 'pedestal', title: 'Dressed / for the / *moment*', text: 'Wedding guest, cocktail and evening dresses chosen piece by piece.', features: DRESS_FEATURES },
  'cocktail-dresses': { scene: 'pedestal', title: 'Made for / the *toast*', text: 'Cocktail dresses for the party after the vows.', features: DRESS_FEATURES },
  'evening-dresses': { scene: 'pedestal', title: 'After / *dark*', text: 'Long evening dresses for black tie and the grand entrance.', features: DRESS_FEATURES },
  'bridesmaid-dresses': { scene: 'pedestal', title: 'Side by side, / in *style*', text: 'Bridesmaid dresses that flatter every figure in the line-up.', features: DRESS_FEATURES },
  'wedding-dresses': { scene: 'pedestal', title: 'Your / *forever* / dress', text: 'Wedding dresses for the day you say yes.', features: DRESS_FEATURES },
  'flower-girl-dresses': { scene: 'pedestal', title: 'Little / *petals*', text: 'Flower girl dresses for the smallest guests.', features: DRESS_FEATURES },
  'prom-dresses': { scene: 'pedestal', title: 'Your / *night*', text: 'Dresses for the dance of the year.', features: DRESS_FEATURES },
  'lady-dresses': { scene: 'pedestal', title: 'The *perfect* / dress', text: 'Dresses for every occasion on the calendar.', features: DRESS_FEATURES },
  'tops-and-sets': { scene: 'pedestal', title: 'The *perfect* / pairing', text: 'Blouses, tops and matching sets for the days around the wedding.', features: DRESS_FEATURES },
  bottoms: { scene: 'mono', ghost: 'LINE', title: 'The *line* / that flatters', text: 'Skirts, trousers and wide-leg pants that pair with our tops and sets.' },
  'outerwear-and-jackets': { scene: 'mono', ghost: 'LAYER', title: 'Layer / it *well*', text: 'Coats, blazers and jackets to wear over an occasion dress.' },
  'womens-jackets': { scene: 'mono', ghost: 'LAYER', title: 'Layer / it *well*', text: 'Easy jackets for cool evenings and travel days.' },
  'womens-sweatshirts-hoodies': { scene: 'mono', ghost: 'SOFT', title: 'Soft, / *off-duty*', text: 'Sweatshirts, hoodies and sets for the days off.' },
  'womens-sweaters': { scene: 'mono', ghost: 'KNIT', title: 'Knit / *together*', text: 'Cardigans, knit sets and sweater dresses.' },
  'womens-denim': { scene: 'mono', ghost: 'DENIM', title: 'Blue, / *reborn*', text: 'Denim tops, jackets, skirts and dresses.' },
  accessories: { scene: 'stage', title: 'The *finishing* / touch', text: 'Scarves, belts, hats and the last details of the look.' },
  'couple-parent-child-clothing': { scene: 'stage', title: 'Better / *together*', text: 'Matching looks for couples, parents and little ones.' },
  // Women: beauty
  beauty: { scene: 'pedestal', title: 'Beauty, / *passed on*', text: 'Nails, glow and hair to finish every look, for every woman.', features: BEAUTY_FEATURES },
  makeup: { scene: 'pedestal', title: 'Glow / *on cue*', text: 'Lipsticks, palettes and brushes for the big day.', features: BEAUTY_FEATURES },
  'skin-care': { scene: 'pedestal', title: 'Skin, / *first*', text: 'Masks, oils and care for a glow that lasts all night.', features: BEAUTY_FEATURES },
  'nail-art-and-tools': { scene: 'pedestal', title: 'Nails, / *done*', text: 'Gel, glitter and art kits to match the dress.', features: BEAUTY_FEATURES },
  'hair-and-accessories': { scene: 'pedestal', title: 'Crowning / *glory*', text: 'Hair pins, bands and pieces for the up-do.', features: BEAUTY_FEATURES },
  'hair-weaves': { scene: 'pedestal', title: 'Crowning / *glory*', text: 'Hair weaves and bundles for your look.', features: BEAUTY_FEATURES },
  'beauty-tools': { scene: 'pedestal', title: 'Tools / of the *trade*', text: 'Irons, mirrors and skin tools for getting ready.', features: BEAUTY_FEATURES },
  'food-and-health': { scene: 'pedestal', title: 'Feel / *well*', text: 'Care for before and after the big day.', features: BEAUTY_FEATURES },
  // Jewelry & watches
  'womens-watches': WATCH,
  'mens-watches': { ...WATCH, text: 'Steel, gold and leather watches for the suit, the ceremony and every day after.' },
  'jewelry-women': { scene: 'stage', title: 'Jewelry / & *watches*', text: 'Wedding sets, rings and watches to finish the look.' },
  'jewelry-men': { scene: 'mono', ghost: 'DETAIL', title: 'The *details* / matter', text: 'Watches, bands, cufflinks and chains for the suit.' },
  'bridal-sets': { scene: 'stage', title: 'Made for / *I do*', text: 'Matching necklace, earrings and bracelet for the day.' },
  'wedding-hair': { scene: 'stage', title: 'Crowned / in *light*', text: 'Tiaras, combs and pins for the hair.' },
  'engagement-rings': { scene: 'mono', ghost: 'YES', title: 'For the / *yes*', text: 'Rings for the question, and the answer.' },
  fashion: { scene: 'stage', title: 'Shine / *loud*', text: 'Statement pieces for the party.' },
  fine: { scene: 'pedestal', title: 'Made / to *keep*', text: 'Gold, silver and stones to wear for years.', features: JEWEL_FEATURES },
  'silver-necklaces': { scene: 'pedestal', title: 'Pure / *silver*', text: 'Real 925 sterling silver and gold vermeil necklaces.', features: JEWEL_FEATURES },
  'silver-bracelets': { scene: 'pedestal', title: 'Pure / *silver*', text: 'Real 925 sterling silver and gold vermeil bracelets.', features: JEWEL_FEATURES },
  'mens-silver-chains': { scene: 'pedestal', title: 'Pure / *silver*', text: 'Real 925 sterling silver chains and pendants.', features: JEWEL_FEATURES },
  'mens-silver-bracelets': { scene: 'pedestal', title: 'Pure / *silver*', text: 'Real 925 sterling silver for the wrist.', features: JEWEL_FEATURES },
  'mens-wedding-bands': { scene: 'mono', ghost: 'VOWS', title: 'The ring / he wears *home*', text: 'Wedding bands in steel, tungsten and gold tones.' },
  cufflinks: { scene: 'mono', ghost: 'DETAIL', title: 'The *details* / matter', text: 'Cufflinks and tie clips for the suit.' },
  'mens-chains-bracelets': { scene: 'stage', title: 'Steel / & *gold*', text: 'Chains and bracelets for every day.' },
  // Men
  'men-all': { scene: 'stage', title: 'Sharp / for the / *occasion*', text: 'Suits, tuxedos, shoes and the details, chosen for the wedding and the night after.' },
  'wedding-suits': { scene: 'pedestal', title: 'Sharp / for the *vows*', text: 'Wedding suits cut clean, for the groom and the guests.', features: TAILOR_FEATURES },
  'tuxedos-and-dinner-jackets': { scene: 'mono', ghost: 'BLACK TIE', title: 'After / *dark*', text: 'Tuxedos and dinner jackets for black tie.' },
  'linen-and-summer-suits': { scene: 'pedestal', title: 'Light / *tailoring*', text: 'Linen and summer suits for beach and garden weddings.', features: TAILOR_FEATURES },
  'blazers-and-waistcoats': { scene: 'pedestal', title: 'Tailored / to *you*', text: 'Blazers and waistcoats to mix with the suit.', features: TAILOR_FEATURES },
  'dress-shirts': { scene: 'pedestal', title: 'Crisp, / *always*', text: 'Dress shirts that sit right under the jacket.', features: TAILOR_FEATURES },
  'men-outerwear': { scene: 'mono', ghost: 'LAYER', title: 'Built / for *weather*', text: 'Coats and jackets to wear over the suit.' },
  'men-bottoms': { scene: 'mono', ghost: 'LINE', title: 'The *right* / trouser', text: 'Trousers and chinos with a clean line.' },
  'men-tees': { scene: 'mono', ghost: 'EASY', title: 'Easy / *essentials*', text: 'T-shirts and shorts for the days off.' },
  'men-lounge': { scene: 'mono', ghost: 'REST', title: 'Off / the *clock*', text: 'Loungewear, sleepwear and underwear.' },
  'men-shoes': { scene: 'pedestal', picks: ['cj-1635838320024498176', 'cj-2412140757471601200', 'cj-2412150328461613400', 'cj-1643103041245155328'], title: 'The *gentleman’s* / shoe', text: 'Dress shoes, loafers and sneakers to finish the suit.', features: MEN_SHOE_FEATURES },
  'ties-and-bow-ties': { scene: 'stage', title: 'The *knot* / that counts', text: 'Ties and bow ties in silk looks and wedding colours.' },
  'belts-and-suspenders': { scene: 'stage', title: 'Hold it / *together*', text: 'Belts and suspenders for the suit.' },
  'hats-and-caps': { scene: 'stage', title: 'Top it / *off*', text: 'Hats and caps for the day.' },
  'men-bags': { scene: 'stage', picks: ['cj-2504061001411614200', 'cj-4F5CC0F9-07C4-488B-AE30-66E77CA22636', 'cj-2406120558161625400'], title: 'Carry / with *purpose*', text: 'Briefcases, messengers and backpacks for work and travel.' },
  'man-wallets': { scene: 'stage', picks: ['cj-1629691482875637760', 'cj-1504862872378290176', 'cj-CCFA09F7-6E32-41E0-8BC2-36CA53FB5416'], title: 'Small, / *essential*', text: 'Wallets and card holders in leather looks.' },
};

/** Men's sub-categories that share one hero. */
const MEN_FAMILY: Record<string, string> = {
  'outerwear-and-jackets': 'men-outerwear', bottoms: 'men-bottoms', 't-shirts': 'men-tees', shorts: 'men-tees',
  'mens-sleep-and-lounge': 'men-lounge', robes: 'men-lounge', 'man-pajama-sets': 'men-lounge', boxers: 'men-lounge', briefs: 'men-lounge', 'long-johns': 'men-lounge',
  'formal-shoes': 'men-shoes', 'casual-shoes': 'men-shoes', 'vulcanize-shoe': 'men-shoes', 'man-boots': 'men-shoes', 'man-sandals': 'men-shoes', 'man-slippers': 'men-shoes', 'mens-insoles': 'men-shoes',
  briefcases: 'men-bags', 'messenger-bags-and-backpacks': 'men-bags', 'mens-backpacks': 'men-bags', 'crossbody-bags': 'men-bags', 'waist-bags': 'men-bags', 'luggage-and-travel-bags': 'men-bags',
};

/** Picks the hero for a page: the most specific key that has copy, else a stage hero with the label. */
export function heroFor(keys: (string | undefined)[], label: string, dept: 'women' | 'men'): HeroCopy {
  for (const key of keys) {
    if (!key) continue;
    const id = dept === 'men' ? MEN_FAMILY[key] ?? key : key;
    if (CATEGORY_HEROES[id]) return CATEGORY_HEROES[id];
  }
  const words = label.split(' ');
  return { scene: 'stage', title: words.length > 1 ? `${words.slice(0, -1).join(' ')} / *${words[words.length - 1]}*` : `The / *${label}*`, text: 'Chosen piece by piece, with free tracked shipping and 30-day returns.' };
}
