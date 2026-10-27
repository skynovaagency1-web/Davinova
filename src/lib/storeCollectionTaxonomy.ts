export interface StoreSubcategoryOption {
  slug: string;
  label: string;
  matchTerms: string[];
}

export interface StoreCollectionGroup {
  slug: string;
  label: string;
  subcategories: StoreSubcategoryOption[];
}

export interface StoreCollectionAssignment {
  collection: string;
  collectionLabel: string;
  subcategory?: string;
  subcategoryLabel?: string;
}

const COLLECTION_TAG_PREFIX = '__davinova_store_collection__:';
const SUBCATEGORY_TAG_PREFIX = '__davinova_store_subcategory__:';
const MANUAL_ASSIGNMENT_TAG = '__davinova_store_manual__:true';

function slugify(value: string): string {
  return value.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[’']/g, '').replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function subcategory(label: string, ...matchTerms: string[]): StoreSubcategoryOption {
  return {
    slug: slugify(label),
    label,
    matchTerms: [label, ...matchTerms],
  };
}

export const WOMEN_BAGS = 'womens-bags';
export const WOMEN_SHOES = 'womens-shoes';
/** Pieces shown floating on their own (never on a model): bags, shoes and men's accessories. */
export const BEAUTY_NAILS = 'nail-art-and-tools';
/** Shown on the Health, Beauty & Hair page, not in the clothing menus. */
export const BEAUTY_HEALTH = 'food-and-health';
export const BEAUTY_HAIR = 'hair-and-accessories';
export const BEAUTY_SKIN = 'skin-care';
export const BEAUTY_WEAVES = 'hair-weaves';
export const BEAUTY_MAKEUP = 'makeup';
export const BEAUTY_TOOLS = 'beauty-tools';
export const BEAUTY_COLLECTIONS = [BEAUTY_MAKEUP, BEAUTY_SKIN, BEAUTY_NAILS, BEAUTY_HAIR, BEAUTY_WEAVES, BEAUTY_TOOLS, BEAUTY_HEALTH];
export const FLOATING_COLLECTIONS = [WOMEN_BAGS, WOMEN_SHOES, 'mens-accessories', ...BEAUTY_COLLECTIONS];
export const storeCollectionGroups: StoreCollectionGroup[] = [
  {
    slug: WOMEN_BAGS,
    label: 'Bags',
    subcategories: [
      // Named like CJ's Women's Luggage & Bags categories (user, 2026-10-23).
      subcategory('Woman Wallets', 'wallet', 'card holder', 'coin purse'),
      subcategory('Women’s Crossbody Bags', 'crossbody bag', 'sling bag'),
      subcategory('Bag Accessories', 'bag strap', 'bag charm', 'bag organizer'),
      subcategory('Evening Bags', 'evening bag', 'party bag', 'wedding bag'),
      subcategory('Fashion Backpacks', 'backpack', 'mini backpack'),
      subcategory('Shoulder Bags', 'shoulder bag', 'handbag', 'top handle bag'),
      subcategory('Totes', 'tote bag', 'tote'),
      subcategory('Clutches', 'clutch', 'wedding clutch', 'envelope clutch'),
    ],
  },
  {
    slug: WOMEN_SHOES,
    label: 'Shoes',
    subcategories: [
      // Named like CJ's Women's Shoes categories (user, 2026-10-23).
      subcategory('Woman Boots', 'ankle boots', 'knee high boots', 'boots'),
      subcategory('Vulcanize Shoes', 'canvas shoes', 'sneakers', 'platform sneakers'),
      subcategory('Women’s Insoles', 'insoles', 'arch support'),
      subcategory('Pumps', 'high heels', 'pumps', 'stiletto'),
      subcategory('Woman Slippers', 'slippers', 'slides', 'house shoes'),
      subcategory('Woman Sandals', 'sandals', 'heeled sandals', 'wedge sandals'),
      subcategory('Flats', 'flats', 'ballet flats', 'mules'),
    ],
  },
  {
    // Named like CJ's Health, Beauty & Hair categories (user, 2026-10-23).
    slug: BEAUTY_NAILS,
    label: 'Nail Art & Tools',
    subcategories: [
      subcategory('Nail Glitters', 'nail glitter', 'glitter powder', 'chrome powder'),
      subcategory('Stickers & Decals', 'nail stickers', 'nail decals', 'nail wraps'),
      subcategory('Nail Decorations', 'nail rhinestones', 'nail charms', 'nail pearls'),
      subcategory('Nail Gel', 'gel polish', 'uv gel', 'builder gel'),
      subcategory('Nail Dryers', 'nail lamp', 'uv led lamp', 'nail dryer'),
      subcategory('Nail Art Kits', 'nail art kit', 'gel nail kit', 'manicure set'),
    ],
  },
  {
    slug: BEAUTY_HEALTH,
    label: 'Food & Health',
    subcategories: [
      // Wellness tools only: nothing to eat, drink or take as medicine.
      subcategory('Health Care Products', 'massager', 'posture corrector', 'facial roller', 'gua sha'),
    ],
  },
  {
    slug: BEAUTY_HAIR,
    label: 'Hair & Accessories',
    subcategories: [
      subcategory('Headband & Hair Band & Hairpin', 'headband', 'hair band', 'hairpin', 'hair clip', 'scrunchie'),
      subcategory('Human Hair', 'human hair wig', 'lace front wig', 'hair bundles', 'clip in extensions'),
    ],
  },
  {
    slug: BEAUTY_SKIN,
    label: 'Skin Care',
    subcategories: [
      subcategory('Razor', 'razor', 'facial razor', 'eyebrow razor', 'epilator'),
      subcategory('Face Masks', 'sheet mask', 'clay mask', 'sleeping mask'),
      // Sunscreen counts as a drug in the US, so only after-sun care is imported.
      subcategory('Sun Care', 'after sun gel', 'aloe vera gel'),
      subcategory('Essential Oil', 'essential oil', 'aromatherapy oil'),
      subcategory('Body Care', 'body scrub', 'body lotion', 'body butter'),
      subcategory('Facial Care', 'face serum', 'face cream', 'facial cleanser'),
    ],
  },
  {
    slug: BEAUTY_WEAVES,
    label: 'Hair Weaves',
    subcategories: [
      subcategory('Pre-Colored One Pack', 'colored hair bundle', 'ombre bundle', 'one pack'),
      subcategory('Hair Weaving', 'hair weave', 'weft', 'bundles'),
      subcategory('Hair Styling', 'braiding hair', 'crochet hair', 'ponytail'),
      subcategory('Salon Bundle Hair', 'bundles with closure', 'bundles with frontal', 'virgin hair bundles'),
      subcategory('Pre-Colored Hair Weave', 'ombre hair weave', 'highlight bundles', '613 blonde bundles'),
    ],
  },
  {
    slug: BEAUTY_MAKEUP,
    label: 'Makeup',
    subcategories: [
      subcategory('Eyebrow Pencil', 'eyebrow pencil', 'brow pencil', 'brow pen'),
      subcategory('Makeup Set', 'makeup set', 'makeup kit', 'cosmetic gift set'),
      subcategory('Eyeshadow', 'eyeshadow palette', 'eye shadow'),
      subcategory('Makeup Brushes', 'makeup brush set', 'foundation brush', 'blending sponge'),
      subcategory('Lipstick', 'lipstick', 'matte lipstick', 'lip gloss'),
      subcategory('False Eyelashes', 'false eyelashes', 'mink lashes', 'lash extensions'),
    ],
  },
  {
    slug: BEAUTY_TOOLS,
    label: 'Beauty Tools',
    subcategories: [
      subcategory('Mirrors', 'makeup mirror', 'led vanity mirror', 'compact mirror'),
      subcategory('Straightening Irons', 'hair straightener', 'flat iron'),
      subcategory('Electric Face Cleanser', 'facial cleansing brush', 'electric face brush'),
      subcategory('Face Skin Care Tools', 'jade roller', 'gua sha', 'microcurrent face device'),
      subcategory('Curling Iron', 'curling iron', 'curling wand', 'hair curler'),
      subcategory('Facial Steamer', 'facial steamer', 'face steamer', 'nano mist sprayer'),
    ],
  },
  {
    slug: 'accessories',
    label: 'Accessories',
    subcategories: [
      subcategory('Scarves & Wraps', 'scarf', 'scarves', 'wrap', 'wraps', 'shawl'),
      subcategory('Belts & Cummerbunds', 'belt', 'belts', 'cummerbund', 'cummerbunds'),
      subcategory('Women’s Hats & Caps', 'hat', 'hats', 'cap', 'caps', 'beanie', 'baseball cap'),
    ],
  },
  {
    slug: 'couple-parent-child-clothing',
    label: 'Couple & Parent-Child Clothing',
    subcategories: [
      subcategory('Couple & Parent-Child Sweatshirts', 'family sweatshirt', 'matching sweatshirt', 'parent child sweatshirt', 'couple sweatshirt'),
      subcategory('Couple & Parent-Child Short-Sleeves', 'family t shirt', 'matching t shirt', 'parent child t shirt', 'couple t shirt', 'short sleeve tee'),
      subcategory('Couple & Parent-Child Jackets', 'family jacket', 'matching jacket', 'parent child jacket', 'couple jacket'),
      subcategory('Couple & Parent-Child Tops', 'family top', 'matching top', 'parent child top', 'couple top'),
      subcategory('Couple & Parent-Child Suits', 'family suit', 'matching suit', 'parent child suit', 'couple suit'),
      subcategory('Couple & Parent-Child Pants', 'family pants', 'matching pants', 'parent child pants', 'couple pants'),
    ],
  },
  {
    slug: 'womens-jackets',
    label: 'Women’s Jackets',
    subcategories: [
      subcategory('Women’s Casual Jackets', 'womens casual jacket', 'women casual jacket', 'casual jacket'),
      subcategory('Women’s Baseball Jackets', 'womens baseball jacket', 'women baseball jacket', 'baseball jacket', 'varsity jacket'),
    ],
  },
  {
    slug: 'womens-sweatshirts-hoodies',
    label: 'Women’s Sweatshirts & Hoodies',
    subcategories: [
      subcategory('Women’s Sweatpants', 'womens sweatpants', 'women sweat pants', 'sweatpants', 'sweat pants', 'joggers'),
      subcategory('Women’s Sweatsuit Sets', 'womens sweatsuit set', 'sweatsuit', 'sweat suit set', 'matching sweatshirt set'),
      subcategory('Women’s Sweatshirt Dresses', 'sweatshirt dress', 'hoodie dress'),
      subcategory('Women’s Zip-Up Hoodies', 'zip up hoodie', 'zip-up hoodie', 'zip hoodie', 'zippered hoodie'),
    ],
  },
  {
    slug: 'womens-sweaters',
    label: 'Women’s Sweaters',
    subcategories: [
      subcategory('Women’s Cardigans', 'cardigan', 'cardigans'),
      subcategory('Women’s Knit Sets', 'womens knit set', 'women knit set', 'knit co ord set', 'knitted matching set'),
      subcategory('Women’s Knit Skirts', 'knit skirt', 'knitted skirt'),
      subcategory('Women’s Knit Bottoms', 'knit bottoms', 'knit pants', 'knitted pants', 'knitted trousers'),
      subcategory('Women’s Sweater Dresses', 'sweater dress', 'knitted dress'),
    ],
  },
  {
    slug: 'womens-denim',
    label: 'Women’s Denim',
    subcategories: [
      subcategory('Women’s Denim Tops', 'denim top', 'denim shirt', 'denim blouse'),
      subcategory('Women’s Denim Jackets', 'denim jacket', 'jean jacket', 'jeans jacket'),
      subcategory('Women’s Denim Sets', 'denim set', 'denim two piece', 'denim co ord'),
      subcategory('Women’s Denim Skirts', 'denim skirt', 'jean skirt'),
      subcategory('Women’s Denim Dresses', 'denim dress', 'jean dress'),
    ],
  },
  {
    slug: 'tops-and-sets',
    label: 'Tops & Sets',
    subcategories: [
      subcategory('Ladies Short Sleeve', 'ladies short sleeve', 'women short sleeve top', 'short sleeve top', 'short-sleeved top', 'short sleeve shirt', 'short-sleeved shirt', 't shirt', 'tee shirt', 'tee'),
      subcategory('Women’s Camis', 'cami', 'camis', 'camisole', 'camisoles'),
      subcategory('Women’s Vests', 'vest', 'vests', 'tank top'),
      subcategory('Women’s Short-Sleeved Shirts', 'short sleeve shirt', 'short-sleeved shirt', 'short sleeve blouse'),
      subcategory('Women’s Long-Sleeved Shirts', 'long sleeve shirt', 'long-sleeved shirt', 'long sleeve blouse'),
      subcategory('Women’s Suit Sets', 'womens suit set', 'women suit set', 'pantsuit set', 'skirt suit set'),
      subcategory('Women’s Activewear Sets', 'activewear set', 'workout set', 'gym set', 'sportswear set'),
      subcategory('Women’s Casual Sets', 'womens casual set', 'women casual set', 'casual two piece set', 'matching casual set'),
      subcategory('Women’s Three-Piece Sets', 'three piece set', '3 piece set', 'three-piece set'),
      subcategory('Women’s Tube Tops', 'tube top', 'strapless top'),
      subcategory('Women’s Sleeveless Tops', 'sleeveless top', 'sleeveless blouse'),
      subcategory('Blouses & Shirts', 'blouse', 'blouses', 'shirt', 'shirts', 'button down shirt', 'button-up shirt'),
      subcategory('Woman Hoodies & Sweatshirts', 'hoodie', 'hoodies', 'sweatshirt', 'sweatshirts', 'pullover hoodie'),
      subcategory('Jumpsuits', 'jumpsuit', 'jumpsuits', 'playsuit'),
      subcategory('Rompers', 'romper', 'rompers'),
      subcategory('Lady Dresses', 'dress', 'dresses', 'sundress'),
      subcategory('Sweaters', 'sweater', 'sweaters', 'pullover knit'),
      subcategory('Suits & Sets', 'suits and sets', 'two piece set', 'matching set'),
    ],
  },
  {
    slug: 'bottoms',
    label: 'Bottoms',
    subcategories: [
      subcategory('Women’s Skirts', 'womens skirt', 'women skirt', 'skirt', 'skirts'),
      subcategory('Women’s Overalls', 'overall', 'overalls', 'dungarees'),
      subcategory('Women’s Flare Pants', 'flare pants', 'flared pants', 'flare trousers', 'bell bottom pants'),
      subcategory('Women’s Straight-Leg Pants', 'straight leg pants', 'straight-leg pants', 'straight leg trousers'),
      subcategory('Women’s Suit Pants', 'suit pants', 'tailored trousers', 'formal pants'),
      subcategory('Women’s Cargo Pants', 'cargo pants', 'cargo trousers'),
      subcategory('Leggings', 'leggings', 'legging'),
      subcategory('Skirts', 'skirt', 'skirts'),
      subcategory('Woman Jeans', 'jeans', 'women jeans', 'womens jeans', 'denim jeans'),
      subcategory('Woman Shorts', 'shorts', 'women shorts', 'womens shorts'),
      subcategory('Pants & Capris', 'pants', 'trousers', 'capris', 'capri pants', 'cropped pants'),
      subcategory('Wide Leg Pants', 'wide leg pants', 'wide-leg pants', 'wide leg trousers', 'palazzo pants'),
    ],
  },
  {
    slug: 'outerwear-and-jackets',
    label: 'Outerwear & Jackets',
    subcategories: [
      subcategory('Blazers', 'blazer', 'blazers'),
      subcategory('Wool & Blend', 'wool blend', 'wool-blend', 'wool coat blend'),
      subcategory('Women’s Padded Jackets', 'padded jacket', 'puffer jacket', 'quilted jacket'),
      subcategory('Women’s Coats', 'womens coat', 'women coat', 'coat', 'coats'),
      subcategory('Women’s Sherpa Jackets', 'sherpa jacket', 'fleece lined jacket', 'teddy jacket'),
      subcategory('Women’s Fur Coats', 'fur coat', 'faux fur coat'),
      subcategory('Women’s Fur-Paneled Jackets', 'fur paneled jacket', 'fur trimmed jacket', 'fur trim jacket'),
      subcategory('Women’s Wool Coats', 'wool coat', 'woolen coat'),
      subcategory('Women’s Outerwear', 'outerwear', 'outer wear'),
      subcategory('Women’s Shell Jackets', 'shell jacket', 'softshell jacket', 'rain shell jacket'),
      subcategory('Women’s Blazers', 'womens blazer', 'women blazer'),
      subcategory('Women’s Capes', 'cape coat', 'capes', 'cape'),
      subcategory('Woman Trench', 'trench coat', 'womens trench', 'women trench'),
      subcategory('Basic Jacket', 'basic jacket', 'basic jackets'),
      subcategory('Leather & Suede', 'leather jacket', 'suede jacket', 'leather and suede'),
      subcategory('Real Fur', 'real fur', 'genuine fur'),
    ],
  },
  {
    slug: 'weddings-and-events',
    label: 'Weddings & Events',
    subcategories: [
      subcategory('Cocktail Dresses', 'cocktail dress', 'cocktail dresses', 'party dress', 'party dresses'),
      subcategory('Evening Dresses', 'evening dress', 'evening dresses', 'evening gown', 'formal gown', 'formal evening dress'),
      subcategory('Bridesmaid Dresses', 'bridesmaid', 'bridesmaid dress'),
      subcategory('Prom Dresses', 'prom dress', 'prom dresses'),
      subcategory('Wedding Dresses', 'wedding dress', 'wedding dresses', 'bridal gown', 'bride dress'),
      subcategory('Flower Girl Dresses', 'flower girl dress', 'flower-girl dress'),
    ],
  },
];

export function normalizeStoreText(value: string): string {
  return value.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[’']/g, '')
    .replace(/&/g, ' and ')
    .replace(/[-_/]+/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** The men's shop runs on its own list, kept apart so the women's menus and auto-sorting never see it. */
export const MEN_FORMAL = 'mens-formal';
export const MEN_ACCESSORIES = 'mens-accessories';
export const MEN_EVERYDAY = 'mens-everyday';
export const MEN_LOUNGE = 'mens-underwear-loungewear';
export const menStoreCollectionGroups: StoreCollectionGroup[] = [
  {
    slug: MEN_FORMAL,
    label: 'Men’s Formal',
    subcategories: [
      subcategory('Wedding Suits', 'wedding suit', 'groom suit', 'groomsmen suit', 'three piece suit', 'slim fit suit', 'business suit'),
      subcategory('Tuxedos & Dinner Jackets', 'tuxedo', 'dinner jacket', 'evening suit', 'velvet blazer', 'smoking jacket'),
      subcategory('Linen & Summer Suits', 'linen suit', 'summer suit', 'linen blazer', 'cotton linen suit', 'beach wedding suit'),
      subcategory('Blazers & Waistcoats', 'blazer', 'sport coat', 'waistcoat', 'suit vest'),
      subcategory('Dress Shirts', 'dress shirt', 'formal shirt', 'tuxedo shirt'),
    ],
  },
  {
    slug: MEN_ACCESSORIES,
    label: 'Men’s Accessories',
    subcategories: [
      // Named like CJ's Men's Shoes categories (user, 2026-10-23).
      subcategory('Formal Shoes', 'oxford shoes', 'derby shoes', 'brogues', 'dress shoes'),
      subcategory('Casual Shoes', 'loafers', 'boat shoes', 'slip-on shoes', 'casual shoes'),
      subcategory('Vulcanize Shoe', 'sneakers', 'canvas shoes', 'trainers'),
      subcategory('Man Boots', 'chelsea boots', 'ankle boots', 'work boots'),
      subcategory('Man Sandals', 'sandals', 'beach sandals'),
      subcategory('Man Slippers', 'slippers', 'slides', 'house shoes'),
      subcategory('Men’s Insoles', 'insoles', 'arch support'),
      subcategory('Ties & Bow Ties', 'necktie', 'bow tie', 'pocket square'),
      subcategory('Belts & Suspenders', 'leather belt', 'suspenders', 'braces'),
      subcategory('Hats & Caps', 'baseball cap', 'fedora', 'beanie', 'bucket hat'),
      subcategory('Briefcases', 'briefcase', 'laptop bag', 'business bag'),
      subcategory('Messenger Bags & Backpacks', 'messenger bag', 'backpack', 'crossbody bag'),
      // Named like CJ's Men's Luggage & Bags categories (user, 2026-10-23).
      subcategory('Waist Bags', 'waist bag', 'belt bag', 'fanny pack', 'chest bag'),
      subcategory('Men’s Backpacks', 'backpack', 'laptop backpack', 'travel backpack'),
      subcategory('Luggage & Travel Bags', 'luggage', 'suitcase', 'travel bag', 'duffel bag', 'weekender'),
      subcategory('Crossbody Bags', 'crossbody bag', 'sling bag', 'shoulder bag'),
      subcategory('Man Wallets', 'wallet', 'card holder', 'money clip'),
    ],
  },
  // Named like CJ's own Men's Clothing categories (user, 2026-10-18).
  {
    slug: MEN_EVERYDAY,
    label: 'Men’s Clothing',
    subcategories: [
      subcategory('Outerwear & Jackets', 'jacket', 'coat', 'bomber', 'windbreaker', 'puffer'),
      subcategory('Bottoms', 'pants', 'trousers', 'jeans', 'cargo pants', 'joggers'),
      subcategory('T-Shirts', 't-shirt', 'tee', 'polo shirt'),
    ],
  },
  {
    slug: MEN_LOUNGE,
    label: 'Underwear & Loungewear',
    subcategories: [
      subcategory('Men’s Sleep & Lounge', 'lounge set', 'loungewear', 'home wear'),
      subcategory('Shorts', 'lounge shorts', 'sleep shorts', 'home shorts'),
      subcategory('Briefs', 'briefs', 'underwear'),
      subcategory('Robes', 'bathrobe', 'robe', 'night gown'),
      subcategory('Man Pajama Sets', 'pajama set', 'pyjamas', 'sleepwear set'),
      subcategory('Boxers', 'boxers', 'boxer briefs', 'boxer shorts'),
      subcategory('Long Johns', 'long johns', 'thermal underwear', 'base layer'),
    ],
  },
];

/** Every men's collection: imports into these are filed under the men's department. */
export const MEN_COLLECTIONS = [MEN_FORMAL, MEN_ACCESSORIES, MEN_EVERYDAY, MEN_LOUNGE];

/** The men's occasion each men's sub-category belongs to (Wedding, Black tie, Holiday). */
export const MEN_OCCASION_BY_SUBCATEGORY: Record<string, 'wedding-guest' | 'cocktail-party' | 'maxi-holiday'> = {
  'wedding-suits': 'wedding-guest',
  'tuxedos-and-dinner-jackets': 'cocktail-party',
  'linen-and-summer-suits': 'maxi-holiday',
};

/** Jewelry & Watches for both shops, also kept apart from the women's clothing list. Slugs match the Jewelry & Watches menu. */
export const JEWELRY_COLLECTION = 'jewelry-and-watches';
const jewelrySub = (slug: string, label: string, ...matchTerms: string[]): StoreSubcategoryOption => ({ slug, label, matchTerms: [label, ...matchTerms] });
export const jewelryStoreCollectionGroups: StoreCollectionGroup[] = [
  {
    slug: JEWELRY_COLLECTION,
    label: 'Jewelry & Watches',
    subcategories: [
      jewelrySub('bridal-sets', 'Bridal Jewelry Sets', 'bridal jewelry set', 'wedding jewelry set'),
      jewelrySub('wedding-hair', 'Wedding Hair Jewelry', 'tiara', 'bridal hair comb', 'bridal hairpin'),
      jewelrySub('engagement-rings', 'Engagement Rings', 'engagement ring', 'moissanite ring'),
      jewelrySub('fashion', 'Fashion Jewelry', 'statement earrings', 'statement necklace'),
      jewelrySub('fine', 'Fine Jewelry', '925 silver necklace', 'pearl earrings'),
      jewelrySub('silver-necklaces', 'Silver Necklaces', '925 sterling silver necklace', 'gold vermeil necklace'),
      jewelrySub('silver-bracelets', 'Silver Bracelets', '925 sterling silver bracelet', 'gold vermeil bracelet'),
      jewelrySub('womens-watches', 'Women’s Watches', 'women watch', 'ladies watch'),
      jewelrySub('mens-wedding-bands', 'Men’s Wedding Bands', 'men wedding band', 'men ring'),
      jewelrySub('cufflinks', 'Cufflinks & Tie Clips', 'cufflinks', 'tie clip'),
      jewelrySub('mens-chains-bracelets', 'Men’s Chains & Bracelets', 'men chain necklace', 'men bracelet'),
      jewelrySub('mens-silver-chains', 'Men’s Silver Necklaces', 'men 925 sterling silver chain'),
      jewelrySub('mens-silver-bracelets', 'Men’s Silver Bracelets', 'men 925 sterling silver bracelet'),
      jewelrySub('mens-watches', 'Men’s Watches', 'men watch', 'men wrist watch'),
    ],
  },
];
export const MEN_JEWELRY = ['mens-wedding-bands', 'cufflinks', 'mens-chains-bracelets', 'mens-silver-chains', 'mens-silver-bracelets', 'mens-watches'];

function hasPhrase(text: string, phrase: string): boolean {
  const normalizedPhrase = normalizeStoreText(phrase);
  return Boolean(normalizedPhrase) && ((' ' + text + ' ').includes(' ' + normalizedPhrase + ' '));
}

function groupBySlug(slug: string): StoreCollectionGroup | undefined {
  return storeCollectionGroups.find((group) => group.slug === slug) ?? menStoreCollectionGroups.find((group) => group.slug === slug)
    ?? jewelryStoreCollectionGroups.find((group) => group.slug === slug);
}

function assignmentFor(groupSlug: string, subcategoryLabel?: string): StoreCollectionAssignment | undefined {
  const group = groupBySlug(groupSlug);
  if (!group) return undefined;
  const sub = subcategoryLabel ? group.subcategories.find((item) => item.label === subcategoryLabel) : undefined;
  if (subcategoryLabel && !sub) return undefined;
  return {
    collection: group.slug,
    collectionLabel: group.label,
    ...(sub ? { subcategory: sub.slug, subcategoryLabel: sub.label } : {}),
  };
}

export function suggestStoreCollection(
  title: string,
  sourceCategory = '',
  description = '',
  tags: string[] = [],
): StoreCollectionAssignment | undefined {
  const text = normalizeStoreText([title, sourceCategory, description, ...tags].filter(Boolean).join(' '));
  if (!text) return undefined;
  const hasAny = (...terms: string[]) => terms.some((term) => hasPhrase(text, term));

  // Family matching ranges belong in their own collection before matching the garment type.
  if (hasAny('couple parent child', 'parent child', 'parent and child', 'mommy and me', 'mom and me', 'matching family', 'family matching')) {
    const type = hasAny('sweatshirt', 'sweatshirts', 'hoodie', 'hoodies')
      ? 'Couple & Parent-Child Sweatshirts'
      : hasAny('short sleeve', 'short sleeved', 't shirt', 'tee shirt', 'short sleeve tee')
        ? 'Couple & Parent-Child Short-Sleeves'
        : hasAny('jacket', 'jackets')
          ? 'Couple & Parent-Child Jackets'
          : hasAny('suit', 'suits')
            ? 'Couple & Parent-Child Suits'
            : hasAny('pant', 'pants', 'trouser', 'trousers')
              ? 'Couple & Parent-Child Pants'
              : hasAny('top', 'tops', 'shirt', 'shirts', 'blouse', 'blouses')
                ? 'Couple & Parent-Child Tops'
                : undefined;
    return assignmentFor('couple-parent-child-clothing', type);
  }

  // Accessories should not be mistaken for garments when a listing mentions them as a free gift.
  const accessoryRules = [
    ['Scarves & Wraps', ['scarf', 'scarves', 'wrap', 'wraps', 'shawl']],
    ['Face Masks', ['face mask', 'face masks']],
    ['Belts & Cummerbunds', ['belt', 'belts', 'cummerbund', 'cummerbunds']],
    ['Women’s Gloves & Mittens', ['glove', 'gloves', 'mitten', 'mittens']],
    ['Women’s Socks', ['sock', 'socks', 'stockings']],
    ['Women’s Hats & Caps', ['hat', 'hats', 'cap', 'caps', 'beanie', 'baseball cap']],
  ] as const;
  const accessoryIsMainProduct = !hasAny('wrap dress', 'wrap dresses', 'scarf print', 'scarf pattern', 'cap sleeve', 'cap sleeves');
  if (accessoryIsMainProduct) {
    for (const [label, terms] of accessoryRules) {
      if (hasAny(...terms)) return assignmentFor('accessories', label);
    }
  }

  // "Wedding guest" is not one of the supplied event subcategories; leave it for manual review.
  if (hasAny('wedding guest', 'wedding guest dress', 'guest dress')) return undefined;

  // Preserve clear subtypes so denim/sweater/sweatshirt dresses aren't misfiled as occasion dresses.
  const clothingRules: Array<{ group: string; label?: string; terms: string[] }> = [
    { group: 'womens-denim', label: 'Women’s Denim Jackets', terms: ['denim jacket', 'jean jacket', 'jeans jacket'] },
    { group: 'womens-denim', label: 'Women’s Denim Dresses', terms: ['denim dress', 'jean dress'] },
    { group: 'womens-denim', label: 'Women’s Denim Skirts', terms: ['denim skirt', 'jean skirt'] },
    { group: 'bottoms', label: 'Woman Jeans', terms: ['denim jeans', 'women jeans', 'womens jeans', 'jeans'] },
    { group: 'womens-denim', label: 'Women’s Denim Sets', terms: ['denim set', 'denim two piece', 'denim co ord'] },
    { group: 'womens-denim', label: 'Women’s Denim Tops', terms: ['denim top', 'denim shirt', 'denim blouse'] },
    { group: 'womens-denim', terms: ['denim', 'jean fabric', 'jeans fabric'] },

    { group: 'womens-jackets', label: 'Women’s Baseball Jackets', terms: ['baseball jacket', 'varsity jacket'] },
    { group: 'womens-jackets', label: 'Women’s Casual Jackets', terms: ['casual jacket'] },
    { group: 'womens-jackets', terms: ['womens jacket', 'women jacket', 'womens jackets', 'women jackets'] },

    { group: 'womens-sweatshirts-hoodies', label: 'Women’s Sweatshirt Dresses', terms: ['sweatshirt dress', 'hoodie dress'] },
    { group: 'womens-sweatshirts-hoodies', label: 'Women’s Zip-Up Hoodies', terms: ['zip up hoodie', 'zip-up hoodie', 'zip hoodie', 'zippered hoodie'] },
    { group: 'womens-sweatshirts-hoodies', label: 'Women’s Sweatsuit Sets', terms: ['sweatsuit', 'sweat suit set', 'matching sweatshirt set'] },
    { group: 'womens-sweatshirts-hoodies', label: 'Women’s Sweatpants', terms: ['sweatpants', 'sweat pants', 'joggers'] },
    { group: 'womens-sweatshirts-hoodies', terms: ['hoodie', 'hoodies', 'sweatshirt', 'sweatshirts'] },

    { group: 'womens-sweaters', label: 'Women’s Sweater Dresses', terms: ['sweater dress', 'knitted dress'] },
    { group: 'womens-sweaters', label: 'Women’s Cardigans', terms: ['cardigan', 'cardigans'] },
    { group: 'womens-sweaters', label: 'Women’s Knit Sets', terms: ['knit set', 'knit co ord set', 'knitted matching set'] },
    { group: 'womens-sweaters', label: 'Women’s Knit Skirts', terms: ['knit skirt', 'knitted skirt'] },
    { group: 'womens-sweaters', label: 'Women’s Knit Bottoms', terms: ['knit bottoms', 'knit pants', 'knitted pants', 'knitted trousers'] },
    { group: 'womens-sweaters', terms: ['sweater', 'sweaters', 'pullover knit'] },

    { group: 'outerwear-and-jackets', label: 'Blazers', terms: ['blazer', 'blazers'] },
    { group: 'outerwear-and-jackets', label: 'Women’s Fur-Paneled Jackets', terms: ['fur paneled jacket', 'fur trimmed jacket', 'fur trim jacket'] },
    { group: 'outerwear-and-jackets', label: 'Women’s Sherpa Jackets', terms: ['sherpa jacket', 'fleece lined jacket', 'teddy jacket'] },
    { group: 'outerwear-and-jackets', label: 'Women’s Padded Jackets', terms: ['padded jacket', 'puffer jacket', 'quilted jacket'] },
    { group: 'outerwear-and-jackets', label: 'Women’s Shell Jackets', terms: ['shell jacket', 'softshell jacket', 'rain shell jacket'] },
    { group: 'outerwear-and-jackets', label: 'Woman Trench', terms: ['trench coat', 'womens trench', 'women trench'] },
    { group: 'outerwear-and-jackets', label: 'Women’s Wool Coats', terms: ['wool coat', 'woolen coat'] },
    { group: 'outerwear-and-jackets', label: 'Women’s Fur Coats', terms: ['fur coat', 'faux fur coat'] },
    { group: 'outerwear-and-jackets', label: 'Wool & Blend', terms: ['wool blend', 'wool-blend'] },
    { group: 'outerwear-and-jackets', label: 'Women’s Capes', terms: ['cape coat', 'cape', 'capes'] },
    { group: 'outerwear-and-jackets', label: 'Leather & Suede', terms: ['leather jacket', 'suede jacket', 'leather and suede'] },
    { group: 'outerwear-and-jackets', label: 'Women’s Coats', terms: ['coat', 'coats'] },
    { group: 'outerwear-and-jackets', label: 'Women’s Outerwear', terms: ['outerwear', 'outer wear'] },
    { group: 'outerwear-and-jackets', label: 'Basic Jacket', terms: ['basic jacket', 'basic jackets'] },
    { group: 'outerwear-and-jackets', label: 'Real Fur', terms: ['real fur', 'genuine fur'] },

    { group: 'weddings-and-events', label: 'Cocktail Dresses', terms: ['cocktail dress', 'cocktail dresses', 'party dress', 'party dresses'] },
    { group: 'weddings-and-events', label: 'Evening Dresses', terms: ['evening dress', 'evening dresses', 'evening gown', 'formal gown'] },
    { group: 'weddings-and-events', label: 'Bridesmaid Dresses', terms: ['bridesmaid', 'bridesmaid dress'] },
    { group: 'weddings-and-events', label: 'Prom Dresses', terms: ['prom dress', 'prom dresses'] },
    { group: 'weddings-and-events', label: 'Flower Girl Dresses', terms: ['flower girl dress', 'flower-girl dress'] },
    { group: 'weddings-and-events', label: 'Wedding Dresses', terms: ['wedding dress', 'wedding dresses', 'bridal gown', 'bride dress'] },

    { group: 'bottoms', label: 'Women’s Flare Pants', terms: ['flare pants', 'flared pants', 'flare trousers', 'bell bottom pants'] },
    { group: 'bottoms', label: 'Women’s Straight-Leg Pants', terms: ['straight leg pants', 'straight leg trousers'] },
    { group: 'bottoms', label: 'Women’s Suit Pants', terms: ['suit pants', 'tailored trousers', 'formal pants'] },
    { group: 'bottoms', label: 'Women’s Cargo Pants', terms: ['cargo pants', 'cargo trousers'] },
    { group: 'bottoms', label: 'Wide Leg Pants', terms: ['wide leg pants', 'wide leg trousers', 'palazzo pants'] },
    { group: 'bottoms', label: 'Pants & Capris', terms: ['capri pants', 'capris', 'cropped pants', 'trousers', 'pants'] },
    { group: 'bottoms', label: 'Women’s Overalls', terms: ['overall', 'overalls', 'dungarees'] },
    { group: 'bottoms', label: 'Leggings', terms: ['leggings', 'legging'] },
    { group: 'bottoms', label: 'Woman Shorts', terms: ['shorts', 'women shorts', 'womens shorts'] },
    { group: 'bottoms', label: 'Woman Jeans', terms: ['women jeans', 'womens jeans', 'jeans'] },
    { group: 'bottoms', label: 'Women’s Skirts', terms: ['womens skirt', 'women skirt', 'skirt', 'skirts'] },

    { group: 'tops-and-sets', label: 'Women’s Activewear Sets', terms: ['activewear set', 'workout set', 'gym set', 'sportswear set'] },
    { group: 'tops-and-sets', label: 'Women’s Three-Piece Sets', terms: ['three piece set', '3 piece set'] },
    { group: 'tops-and-sets', label: 'Women’s Suit Sets', terms: ['women suit set', 'womens suit set', 'pantsuit set', 'skirt suit set'] },
    { group: 'tops-and-sets', label: 'Women’s Casual Sets', terms: ['womens casual set', 'women casual set', 'casual two piece set'] },
    { group: 'tops-and-sets', label: 'Women’s Tube Tops', terms: ['tube top', 'strapless top'] },
    { group: 'tops-and-sets', label: 'Women’s Sleeveless Tops', terms: ['sleeveless top', 'sleeveless blouse'] },
    { group: 'tops-and-sets', label: 'Women’s Long-Sleeved Shirts', terms: ['long sleeve shirt', 'long sleeve blouse'] },
    { group: 'tops-and-sets', label: 'Women’s Short-Sleeved Shirts', terms: ['short sleeve shirt', 'short sleeve blouse'] },
    { group: 'tops-and-sets', label: 'Women’s Camis', terms: ['cami', 'camis', 'camisole', 'camisoles'] },
    { group: 'tops-and-sets', label: 'Women’s Vests', terms: ['vest', 'vests', 'tank top'] },
    { group: 'tops-and-sets', label: 'Ladies Short Sleeve', terms: ['ladies short sleeve', 'short sleeve top', 'short sleeve tee', 'short sleeve', 't shirt', 'tee shirt', 'tee'] },
    { group: 'tops-and-sets', label: 'Jumpsuits', terms: ['jumpsuit', 'jumpsuits', 'playsuit'] },
    { group: 'tops-and-sets', label: 'Rompers', terms: ['romper', 'rompers'] },
    { group: 'tops-and-sets', label: 'Blouses & Shirts', terms: ['blouse', 'blouses', 'button down shirt', 'button up shirt', 'shirt', 'shirts'] },
    { group: 'tops-and-sets', label: 'Suits & Sets', terms: ['suits and sets', 'matching set', 'two piece set'] },
    { group: 'tops-and-sets', label: 'Woman Hoodies & Sweatshirts', terms: ['hoodie', 'hoodies', 'sweatshirt', 'sweatshirts'] },
    { group: 'tops-and-sets', label: 'Sweaters', terms: ['sweater', 'sweaters'] },
    { group: 'tops-and-sets', label: 'Lady Dresses', terms: ['dress', 'dresses', 'sundress'] },
  ];

  for (const rule of clothingRules) {
    if (hasAny(...rule.terms)) {
      const result = assignmentFor(rule.group, rule.label);
      if (result) return result;
    }
  }

  return undefined;
}

export function assignmentFromStoreTags(tags: string[]): StoreCollectionAssignment | undefined {
  const collectionSlug = tags.find((tag) => tag.startsWith(COLLECTION_TAG_PREFIX))?.slice(COLLECTION_TAG_PREFIX.length);
  if (!collectionSlug) return undefined;
  const group = groupBySlug(collectionSlug);
  if (!group) return undefined;

  const subcategorySlug = tags.find((tag) => tag.startsWith(SUBCATEGORY_TAG_PREFIX))?.slice(SUBCATEGORY_TAG_PREFIX.length);
  const sub = subcategorySlug ? group.subcategories.find((item) => item.slug === subcategorySlug) : undefined;
  return {
    collection: group.slug,
    collectionLabel: group.label,
    ...(sub ? { subcategory: sub.slug, subcategoryLabel: sub.label } : {}),
  };
}

export function storeCollectionAssignmentIsValid(collection: string, subcategorySlug?: string): boolean {
  const group = groupBySlug(collection);
  if (!group) return false;
  if (!subcategorySlug) return true;
  return group.subcategories.some((subcategoryItem) => subcategoryItem.slug === subcategorySlug);
}

export function findStoreCollectionGroup(collection: string): StoreCollectionGroup | undefined {
  return groupBySlug(collection);
}

export function writeStoreCollectionTags(
  tags: string[],
  assignment: StoreCollectionAssignment,
  manual = false,
): string[] {
  const existing = tags.filter((tag) =>
    !tag.startsWith(COLLECTION_TAG_PREFIX)
    && !tag.startsWith(SUBCATEGORY_TAG_PREFIX)
    && tag !== MANUAL_ASSIGNMENT_TAG
  );
  return [
    ...existing,
    COLLECTION_TAG_PREFIX + assignment.collection,
    ...(assignment.subcategory ? [SUBCATEGORY_TAG_PREFIX + assignment.subcategory] : []),
    ...(manual ? [MANUAL_ASSIGNMENT_TAG] : []),
  ];
}

export function hasManualStoreCollectionAssignment(tags: string[]): boolean {
  return tags.includes(MANUAL_ASSIGNMENT_TAG);
}

export function publicProductTags(tags: string[]): string[] {
  return tags.filter((tag) => !tag.startsWith(COLLECTION_TAG_PREFIX) && !tag.startsWith(SUBCATEGORY_TAG_PREFIX) && tag !== MANUAL_ASSIGNMENT_TAG);
}

export function manualStoreCollectionAssignment(collection: string, subcategorySlug?: string): StoreCollectionAssignment | undefined {
  if (!storeCollectionAssignmentIsValid(collection, subcategorySlug)) return undefined;
  const group = groupBySlug(collection);
  if (!group) return undefined;
  const sub = subcategorySlug ? group.subcategories.find((item) => item.slug === subcategorySlug) : undefined;
  return {
    collection: group.slug,
    collectionLabel: group.label,
    ...(sub ? { subcategory: sub.slug, subcategoryLabel: sub.label } : {}),
  };
}
