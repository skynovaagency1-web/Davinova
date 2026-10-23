/**
 * Fills empty sub-categories with CJ products, dresses first.
 *
 * Runs in GitHub Actions ("Fill categories from CJ"), through the live site's own admin endpoints, so the CJ
 * key never leaves Cloudflare. For every sub-category in the owner's list that shows fewer than TARGET
 * products, it searches CJ with the sub-category's own words and imports products whose title sorts into
 * that same sub-category. The photo check (scripts/cutouts.py) runs afterwards and hides any import
 * without a flawless photo, so this imports a few extra.
 *
 * Env: SITE, ADMIN_PASSWORD (GitHub secret DAVINOVA_ADMIN_PASSWORD), TARGET (default 6), MAX_IMPORTS (default 120),
 * ONLY (optional comma-separated sub-category slugs), MEN=1 (men's formal list), JEWELRY=1 (Jewelry & Watches list).
 */
import { readFileSync } from 'node:fs';
import { jewelryStoreCollectionGroups, menStoreCollectionGroups, storeCollectionGroups, suggestStoreCollection } from '../src/lib/storeCollectionTaxonomy.ts';

const SITE = process.env.SITE ?? 'https://feature-3d-fashion-storefron.davinova.pages.dev';
const PASSWORD = process.env.ADMIN_PASSWORD ?? '';
const TARGET = Number(process.env.TARGET ?? 6);
const MAX_IMPORTS = Number(process.env.MAX_IMPORTS ?? 120);
// PLUS=1 looks only for plus-size versions (titles must say so); the curvy section is then picked by eye.
const PLUS = process.env.PLUS === '1';
const PLUS_SEARCH = ['plus size dress', 'plus size women dress', 'plus size maxi dress', 'plus size party dress', 'plus size bodycon dress', 'plus size evening gown', 'plus size african dress', 'curvy women dress', 'plus size wedding guest dress', 'plus size mermaid dress'];
const PLUS_TITLE = /\b(plus[ -]size|curvy|curve)\b/i;
// MEN=1 fills the men's formal list instead: titles must name men and the sub-category's own garment.
const MEN = process.env.MEN === '1';
const MEN_TITLE = /\b(men|mens|men's|male|groom|groomsman|groomsmen|gentleman|gentlemen)\b/i;
const WOMEN_TITLE = /\b(women|womens|women's|woman|ladies|lady|female|girls?)\b/i;
const MEN_SEARCH: Record<string, string[]> = {
  'wedding-suits': ['men wedding suit', 'groom suit', 'men slim fit suit', 'men three piece suit'],
  'tuxedos-and-dinner-jackets': ['men tuxedo', 'men dinner jacket', 'men velvet blazer', 'men tuxedo suit'],
  'linen-and-summer-suits': ['men linen suit', 'men summer suit', 'men linen blazer', 'men beach wedding suit'],
  'blazers-and-waistcoats': ['men blazer', 'men sport coat', 'men waistcoat', 'men suit vest'],
  'dress-shirts': ['men dress shirt', 'men formal shirt', 'men tuxedo shirt', 'men slim fit shirt'],
  'ties-and-bow-ties': ['men necktie', 'men bow tie', 'men tie set pocket square', 'men silk tie'],
  'formal-shoes': ['men oxford shoes', 'men leather dress shoes', 'men derby shoes', 'men brogues'],
  'casual-shoes': ['men loafers', 'men penny loafers', 'men boat shoes', 'men casual leather shoes'],
  'vulcanize-shoe': ['men canvas shoes', 'men vulcanized sneakers', 'men white sneakers', 'men casual sneakers'],
  'man-boots': ['men chelsea boots', 'men ankle boots', 'men leather boots', 'men work boots'],
  'man-sandals': ['men sandals', 'men leather sandals', 'men beach sandals'],
  'man-slippers': ['men slippers', 'men house slippers', 'men slides'],
  'mens-insoles': ['men insoles', 'arch support insoles', 'height increase insoles', 'gel insoles'],
  'belts-and-suspenders': ['men leather belt', 'men suspenders', 'men dress belt'],
  briefcases: ['men leather briefcase', 'men business bag', 'men laptop bag'],
  'messenger-bags-and-backpacks': ['men messenger bag', 'men leather backpack', 'men crossbody bag'],
  'waist-bags': ['men waist bag', 'men belt bag', 'men chest bag', 'men fanny pack'],
  'mens-backpacks': ['men backpack', 'men laptop backpack', 'men leather backpack', 'men travel backpack'],
  'luggage-and-travel-bags': ['men travel bag', 'men duffel bag', 'men weekender bag', 'luggage suitcase men'],
  'crossbody-bags': ['men crossbody bag', 'men sling bag', 'men shoulder bag'],
  'man-wallets': ['men wallet', 'men leather wallet', 'men card holder', 'men slim wallet'],
  'hats-and-caps': ['men baseball cap', 'men fedora hat', 'men beanie', 'men bucket hat'],
  // Named after CJ's Men's Clothing categories (user, 2026-10-18).
  'outerwear-and-jackets': ['men jacket', 'men coat', 'men bomber jacket', 'men puffer jacket', 'men windbreaker'],
  bottoms: ['men pants', 'men cargo pants', 'men jeans', 'men trousers', 'men joggers'],
  't-shirts': ['men t-shirt', 'men oversized t-shirt', 'men polo shirt', 'men graphic tee'],
  'mens-sleep-and-lounge': ['men loungewear set', 'men home wear', 'men lounge set'],
  shorts: ['men lounge shorts', 'men sleep shorts', 'men casual shorts', 'men home shorts'],
  briefs: ['men briefs', 'men underwear briefs'],
  robes: ['men bathrobe', 'men robe', 'men kimono robe'],
  'man-pajama-sets': ['men pajama set', 'men pajamas', 'men sleepwear set'],
  boxers: ['men boxers', 'men boxer briefs', 'men boxer shorts'],
  'long-johns': ['men long johns', 'men thermal underwear set', 'men thermal base layer'],
};
const MEN_FITS: Record<string, RegExp> = {
  'wedding-suits': /\bsuits?\b/i,
  'tuxedos-and-dinner-jackets': /\b(tuxedos?|dinner jackets?|smoking jackets?|velvet (blazer|suit)s?)\b/i,
  'linen-and-summer-suits': /\blinen\b.*\b(suits?|blazers?)\b|\b(suits?|blazers?)\b.*\blinen\b/i,
  'blazers-and-waistcoats': /\b(blazers?|sport coats?|suit jackets?|waistcoats?|suit vests?|vests?)\b/i,
  'dress-shirts': /\b(dress|formal|tuxedo|business|office) shirts?\b|\bshirts?\b.*\b(formal|business|wedding)\b/i,
  'ties-and-bow-ties': /\b(neck ?ties?|bow ?ties?|ties?|pocket squares?|cravats?)\b/i,
  'formal-shoes': /\b(oxfords?|brogues?|derby|dress shoes|formal shoes|business shoes)\b/i,
  'casual-shoes': /\b(loafers?|boat shoes|moccasins?|casual (leather )?shoes|slip-?on)\b/i,
  'vulcanize-shoe': /\b(sneakers?|canvas shoes|vulcani[sz]ed?|trainers?)\b/i,
  'man-boots': /\bboots?\b/i,
  'man-sandals': /\bsandals?\b/i,
  'man-slippers': /\b(slippers?|slides?)\b/i,
  'mens-insoles': /\binsoles?\b/i,
  'belts-and-suspenders': /\b(belts?|suspenders?|braces)\b/i,
  'hats-and-caps': /\b(hats?|caps?|fedoras?|beanies?|berets?)\b/i,
  briefcases: /\b(briefcases?|business bags?|laptop bags?|handbags?)\b/i,
  'messenger-bags-and-backpacks': /\b(messenger|backpacks?|crossbody|shoulder bags?|sling bags?)\b/i,
  'waist-bags': /\b(waist|belt|chest|fanny) (bags?|packs?)\b/i,
  'mens-backpacks': /\bbackpacks?\b/i,
  'luggage-and-travel-bags': /\b(luggage|suitcases?|travel bags?|duffel|duffle|weekender|trolley)\b/i,
  'crossbody-bags': /\b(crossbody|cross-body|sling bags?|shoulder bags?)\b/i,
  'man-wallets': /\b(wallets?|card (holder|case)s?|money clips?|purses?)\b/i,
  'outerwear-and-jackets': /\b(jackets?|coats?|bombers?|parkas?|windbreakers?|puffers?|overcoats?|trench)\b/i,
  bottoms: /\b(pants|trousers|jeans|joggers|chinos|sweatpants)\b/i,
  't-shirts': /\b(t-?shirts?|tees?|polo)\b/i,
  'mens-sleep-and-lounge': /\b(lounge(wear)?|home ?wear|homewear|sleepwear|nightwear)\b/i,
  shorts: /\bshorts\b/i,
  briefs: /\bbriefs?\b/i,
  robes: /\b(robes?|bathrobes?|night ?gowns?)\b/i,
  'man-pajama-sets': /\b(pajamas?|pyjamas?|sleepwear)\b/i,
  boxers: /\bboxers?\b/i,
  'long-johns': /\b(long johns|thermal|base ?layer)\b/i,
};
const MEN_SHOES = ['formal-shoes', 'casual-shoes', 'vulcanize-shoe', 'man-boots', 'man-sandals', 'man-slippers', 'mens-insoles'];
// Accessories that only borrow a word (tie clips belong with cufflinks; shoe care is not shoes).
const NOT_ACCESSORY = /\b(tie ?(clip|bar|pin)s?|cufflinks?|shoe ?(polish|brush|horn|tree|lace)s?|insoles?|belt ?buckles? only|seat ?belt|sneakers?|sandals?|slippers?|boots?)\b/i;
// Casual pieces that only borrow the word "suit".
const NOT_TAILORING = /\b(tracksuit|sweatsuit|swimsuit|jogging|sports? suit|pajama|hoodie|sweat|shorts? suit|t-?shirt)\b/i;
// Women's bags and shoes (run without MEN or JEWELRY, with only= these slugs): explicit searches, like the men's list.
const WOMEN_OBJECTS: Record<string, { search: string[]; fit: RegExp }> = {
  'clutches-and-evening-bags': { search: ['women evening clutch', 'wedding clutch bag', 'rhinestone evening bag', 'women party clutch'], fit: /\b(clutch(es)?|evening bags?|party bags?)\b/i },
  handbags: { search: ['women leather handbag', 'women shoulder bag', 'women crossbody bag'], fit: /\b(handbags?|shoulder bags?|crossbody|top handle)\b/i },
  totes: { search: ['women tote bag', 'women leather tote'], fit: /\btotes?\b/i },
  // Women's Luggage & Bags, named like CJ's categories (user, 2026-10-23).
  'woman-wallets': { search: ['women wallet', 'women long wallet', 'women card holder', 'women coin purse'], fit: /\b(wallets?|card (holder|case)s?|coin purses?|purses?)\b/i },
  'womens-crossbody-bags': { search: ['women crossbody bag', 'women sling bag', 'women small crossbody bag'], fit: /\b(crossbody|cross-body|sling bags?)\b/i },
  'bag-accessories': { search: ['bag strap replacement', 'bag charm pendant', 'purse organizer insert', 'bag chain strap'], fit: /\b(bag (straps?|charms?|chains?|organi[sz]ers?)|straps? for bags?|purse (organi[sz]ers?|inserts?|charms?))\b/i },
  'evening-bags': { search: ['women evening bag', 'rhinestone evening bag', 'women party bag', 'pearl evening bag'], fit: /\b(evening bags?|party bags?|dinner bags?|banquet bags?)\b/i },
  'fashion-backpacks': { search: ['women fashion backpack', 'women mini backpack', 'women leather backpack'], fit: /\bbackpacks?\b/i },
  'shoulder-bags': { search: ['women shoulder bag', 'women leather handbag', 'women top handle bag', 'women underarm bag'], fit: /\b(shoulder bags?|handbags?|top handle|underarm bags?|hobo)\b/i },
  clutches: { search: ['women evening clutch', 'wedding clutch bag', 'women envelope clutch', 'women party clutch'], fit: /\bclutch(es)?\b/i },
  // Health, Beauty & Hair: Nail Art & Tools (user, 2026-10-23).
  'nail-glitters': { search: ['nail glitter powder', 'chrome nail powder', 'holographic nail glitter', 'nail sequins flakes'], fit: /\bnails?\b.*\b(glitter|powder|chrome|sequins?|flakes?)\b|\b(glitter|chrome|holographic)\b.*\bnails?\b/i },
  'stickers-and-decals': { search: ['nail stickers', 'nail art decals', 'nail wraps', '3d nail stickers'], fit: /\bnails?\b.*\b(stickers?|decals?|wraps?|transfer)\b|\b(stickers?|decals?)\b.*\bnails?\b/i },
  'nail-decorations': { search: ['nail rhinestones', 'nail charms', 'nail pearls decoration', '3d nail art decoration'], fit: /\bnails?\b.*\b(rhinestones?|charms?|pearls?|gems?|crystals?|decorations?|studs?)\b|\b(rhinestones?|charms?|decorations?)\b.*\bnails?\b/i },
  'nail-gel': { search: ['gel nail polish', 'uv gel polish', 'builder gel nails', 'gel polish set'], fit: /\bgel\b.*\b(polish|nails?|varnish)\b|\bnails?\b.*\bgel\b|\bpoly ?gel\b/i },
  'nail-dryers': { search: ['uv led nail lamp', 'nail dryer', 'gel nail lamp', 'portable nail lamp'], fit: /\bnails?\b.*\b(lamps?|dryers?|lights?)\b|\b(uv|led)\b.*\b(lamps?|dryers?)\b/i },
  'nail-art-kits': { search: ['nail art kit', 'gel nail kit', 'manicure tool set', 'nail art brush set'], fit: /\bnails?\b.*\b(kits?|sets?)\b|\bmanicure\b.*\b(kits?|sets?|tools?)\b/i },
  // Food & Health: wellness tools only, never anything ingested or sold as medicine.
  'health-care-products': { search: ['neck massager', 'facial roller gua sha', 'posture corrector', 'eye massager', 'scalp massager'], fit: /^(?!.*\b(capsules?|tablets?|supplements?|vitamins?|pills?|tea|medicine|medical|drops|cream|ointment|plasters?|patch(es)?)\b).*\b(massagers?|gua sha|face rollers?|facial rollers?|posture correctors?|acupressure|heating pads?)\b/i },
  'headband-and-hair-band-and-hairpin': { search: ['women headband', 'pearl hair clip', 'satin scrunchie', 'rhinestone hairpin', 'padded headband'], fit: /\b(headbands?|hair ?bands?|hair ?pins?|hair ?clips?|barrettes?|scrunchies?|claw clips?|hair ?ties?)\b/i },
  'human-hair': { search: ['human hair wig', 'lace front wig human hair', 'human hair bundles', 'clip in human hair extensions'], fit: /\bhuman hair\b/i },
  // Skin Care: nothing sold as medicine (no SPF sunscreen, acne or whitening treatments).
  razor: { search: ['women facial razor', 'eyebrow razor', 'women electric shaver', 'dermaplaning tool'], fit: /^(?!.*\b(men|beard)\b).*\b(razors?|shavers?|epilators?|dermaplan\w*)\b/i },
  'face-masks': { search: ['sheet face mask', 'clay face mask', 'sleeping face mask', 'collagen face mask'], fit: /\b(sheet|clay|mud|sleeping|collagen|hydrating|facial|face) masks?\b/i },
  'sun-care': { search: ['after sun gel', 'aloe vera soothing gel', 'after sun lotion'], fit: /^(?!.*\b(spf|sunscreen|sunblock)\b).*\b(after ?sun|aloe vera)\b/i },
  'essential-oil': { search: ['essential oil set', 'lavender essential oil', 'aromatherapy essential oil'], fit: /\b(essential oils?|aromatherapy oils?)\b/i },
  'body-care': { search: ['body scrub', 'body butter', 'body lotion women', 'shower gel'], fit: /^(?!.*\b(whitening|bleach\w*|slimming|fat burn\w*)\b).*\b(body (scrub|butter|lotion|oil|wash|mist)|shower gel)\b/i },
  'facial-care': { search: ['face serum', 'face moisturizer cream', 'facial cleanser', 'eye cream'], fit: /^(?!.*\b(whitening|bleach\w*|acne|spf|sunscreen|freckle|melasma)\b).*\b(face|facial|eye) (serum|cream|moisturi[sz]er|cleanser|toner|essence)\b|\bserum\b/i },
  // Hair Weaves: bundles and wefts, never wigs (those sit under Human Hair).
  'pre-colored-one-pack': { search: ['ombre hair bundle one pack', 'colored human hair bundle', '613 blonde one bundle'], fit: /^(?!.*\bwigs?\b).*\b(ombre|colou?red|blonde|613|burgundy|highlight\w*|1b)\b.*\b(bundles?|weaves?|wefts?)\b/i },
  'hair-weaving': { search: ['hair weave bundles', 'human hair weft', 'body wave bundles', 'straight hair bundles'], fit: /^(?!.*\bwigs?\b).*\b(bundles?|weaves?|wefts?)\b/i },
  'hair-styling': { search: ['braiding hair', 'crochet braids hair', 'ponytail extension', 'drawstring ponytail'], fit: /^(?!.*\bwigs?\b).*\b(braiding hair|braids?|crochet|ponytails?|buns?|chignon)\b/i },
  'salon-bundle-hair': { search: ['bundles with closure', 'bundles with frontal', 'virgin hair bundles', 'brazilian hair bundles'], fit: /^(?!.*\bwigs?\b).*\b(bundles?)\b.*\b(closure|frontal|virgin|brazilian|peruvian|remy)\b|\b(virgin|brazilian|peruvian|remy)\b.*\bbundles?\b/i },
  'pre-colored-hair-weave': { search: ['ombre hair weave', 'highlight hair bundles', 'colored body wave bundles'], fit: /^(?!.*\bwigs?\b).*\b(ombre|colou?red|blonde|613|burgundy|highlight\w*|piano)\b.*\b(weaves?|bundles?|wefts?)\b/i },
  // Makeup.
  'eyebrow-pencil': { search: ['eyebrow pencil', 'waterproof brow pencil', 'microblading eyebrow pen'], fit: /\b(eye ?brow|brow)\b.*\b(pencils?|pens?|gels?|pomade)\b/i },
  'makeup-set': { search: ['makeup set', 'makeup kit women', 'cosmetics gift set'], fit: /\b(make ?up|cosmetics?)\b.*\b(sets?|kits?)\b/i },
  eyeshadow: { search: ['eyeshadow palette', 'glitter eyeshadow', 'matte eyeshadow palette'], fit: /\beye ?shadows?\b/i },
  'makeup-brushes': { search: ['makeup brush set', 'foundation brush', 'eyeshadow brush set', 'makeup sponge'], fit: /\b(make ?up|cosmetic|foundation|eyeshadow|blush|powder)\b.*\b(brush(es)?|sponges?|blenders?)\b/i },
  lipstick: { search: ['matte lipstick', 'lipstick set', 'lip gloss', 'liquid lipstick'], fit: /\b(lipsticks?|lip ?gloss|lip ?tint|lip ?liner|lip ?glaze)\b/i },
  'false-eyelashes': { search: ['false eyelashes', 'mink lashes', 'magnetic eyelashes', 'cluster lashes'], fit: /\b(false|fake|mink|magnetic|cluster|strip)?\s*(eye ?lash(es)?|lashes)\b/i },
  // Beauty Tools: plugged-in tools must not be EU/UK/AU plug only (orders go to the US first).
  mirrors: { search: ['led makeup mirror', 'vanity mirror with lights', 'compact makeup mirror', 'tri-fold makeup mirror'], fit: /\b(make ?up|vanity|cosmetic|compact|pocket|led)\b.*\bmirrors?\b|\bmirrors?\b.*\b(make ?up|vanity)\b/i },
  'straightening-irons': { search: ['hair straightener', 'flat iron hair', 'ceramic hair straightener', 'cordless hair straightener'], fit: /^(?!.*\b(eu|uk|au) plug\b).*\b(hair straighten\w*|straightening iron|flat irons?|straightener)\b/i },
  'electric-face-cleanser': { search: ['electric facial cleansing brush', 'silicone face cleansing brush', 'pore cleaner vacuum'], fit: /^(?!.*\b(eu|uk|au) plug\b).*\b(cleansing (brush|device|instrument)|face (cleanser|brush)|facial (cleanser|brush)|pore (cleaner|vacuum))\b/i },
  'face-skin-care-tools': { search: ['jade roller gua sha', 'ice roller face', 'microcurrent face lifting device', 'facial massager roller'], fit: /\b(jade|ice|face|facial|derma)\s*rollers?\b|\bgua sha\b|\b(face|facial) (lifting|massage) (device|instrument|tool)\b/i },
  'curling-iron': { search: ['curling iron', 'curling wand', 'automatic hair curler', 'cordless hair curler'], fit: /^(?!.*\b(eu|uk|au) plug\b).*\b(curling (irons?|wands?)|hair curlers?|curler)\b/i },
  'facial-steamer': { search: ['facial steamer', 'nano face steamer', 'nano mist sprayer face'], fit: /^(?!.*\b(eu|uk|au) plug\b).*\b(facial|face|nano)\b.*\b(steamers?|mist sprayers?|sprayers?|humidifiers?)\b/i },
  heels: { search: ['women high heels', 'women stiletto pumps', 'women heeled sandals', 'wedding heels women'], fit: /\b(heels?|pumps?|stilettos?)\b/i },
  'flats-and-sandals': { search: ['women ballet flats', 'women flat sandals', 'women mules'], fit: /\b(flats?|sandals?|mules?|slingbacks?)\b/i },
  boots: { search: ['women ankle boots', 'women knee high boots', 'women heeled boots'], fit: /\bboots?\b/i },
  // Women's Shoes, named like CJ's categories (user, 2026-10-23).
  'woman-boots': { search: ['women ankle boots', 'women knee high boots', 'women heeled boots', 'women chelsea boots'], fit: /\bboots?\b/i },
  'vulcanize-shoes': { search: ['women canvas shoes', 'women vulcanized sneakers', 'women platform sneakers', 'women casual sneakers'], fit: /\b(sneakers?|canvas shoes|vulcani[sz]ed?|trainers?)\b/i },
  'womens-insoles': { search: ['women insoles', 'high heel insoles', 'arch support insoles women', 'gel insoles women'], fit: /\binsoles?\b/i },
  pumps: { search: ['women high heels', 'women stiletto pumps', 'women pointed toe pumps', 'wedding heels women'], fit: /\b(heels?|pumps?|stilettos?)\b/i },
  'woman-slippers': { search: ['women slippers', 'women house slippers', 'women fluffy slippers', 'women slides'], fit: /\b(slippers?|slides?)\b/i },
  'woman-sandals': { search: ['women sandals', 'women heeled sandals', 'women flat sandals', 'women wedge sandals'], fit: /\bsandals?\b/i },
  flats: { search: ['women ballet flats', 'women flat shoes', 'women mules', 'women pointed flats'], fit: /\b(flats?|ballet|mules?)\b/i },
};
// JEWELRY=1 fills Jewelry & Watches for both shops: titles must name the piece, and men's pieces must not say women.
const JEWELRY = process.env.JEWELRY === '1';
const JEWELRY_SEARCH: Record<string, string[]> = {
  'bridal-sets': ['bridal jewelry set', 'wedding jewelry set necklace earrings', 'rhinestone bridal necklace set'],
  'wedding-hair': ['bridal tiara', 'wedding crown', 'bridal hair comb', 'bridal hairpin pearl'],
  'engagement-rings': ['engagement ring', 'moissanite engagement ring', 'zircon engagement ring', 'wedding ring women'],
  fashion: ['statement earrings', 'statement necklace women', 'gold hoop earrings', 'women bracelet fashion'],
  fine: ['925 sterling silver necklace women', 'pearl earrings', '18k gold necklace women', 'sterling silver earrings'],
  'womens-watches': ['women watch', 'ladies quartz watch', 'women bracelet watch', 'ladies gold watch'],
  'mens-wedding-bands': ['men wedding band', 'men tungsten ring', 'men titanium ring', 'men wedding ring'],
  cufflinks: ['cufflinks', 'tie clip', 'cufflinks tie clip set'],
  'mens-chains-bracelets': ['men chain necklace', 'men cuban chain', 'men bracelet stainless steel', 'men beaded bracelet'],
  'mens-watches': ['men watch', 'men quartz watch', 'men luxury watch', 'men chronograph watch'],
};
const JEWELRY_FITS: Record<string, RegExp> = {
  'bridal-sets': /\b(bridal|wedding|bride)\b.*\b(sets?|necklace)\b|\b(sets?|necklace)\b.*\b(bridal|wedding|bride)\b/i,
  'wedding-hair': /\b(tiaras?|crowns?|hair ?(comb|pin|clip|vine|band)s?|hairpins?|headpieces?)\b/i,
  'engagement-rings': /\b(engagement|wedding|proposal|moissanite|solitaire)\b.*\brings?\b|\brings?\b.*\b(engagement|wedding|proposal)\b/i,
  fashion: /\b(earrings?|necklaces?|bracelets?|bangles?|pendants?|chokers?)\b/i,
  fine: /\b(925|sterling|18k|14k|solid gold|pearls?|moissanite)\b/i,
  'womens-watches': /\bwatch(es)?\b/i,
  'mens-wedding-bands': /\brings?\b|\bbands?\b/i,
  cufflinks: /\b(cuff ?links?|tie (clip|bar|pin)s?)\b/i,
  'mens-chains-bracelets': /\b(chains?|bracelets?|necklaces?)\b/i,
  'mens-watches': /\bwatch(es)?\b/i,
};
const MEN_PIECES = ['mens-wedding-bands', 'mens-chains-bracelets', 'mens-watches'];
// Things that share jewelry words but are not jewelry (or are for kids, pets, phones).
const NOT_JEWELRY = /\b(smart ?watch|watch ?band|watch ?strap|phone ?case|jewelry ?box|storage|display|stand|organizer|holder|tool|kit|beads? for|diy|keychain|key ?ring|nose|belly|tattoo|smart)\b/i;
const ONLY = (process.env.ONLY ?? '').split(',').map((value) => value.trim()).filter(Boolean);
const DRESS_FIRST = ['weddings-and-events', 'tops-and-sets:lady-dresses', 'womens-sweaters:womens-sweater-dresses', 'womens-denim:womens-denim-dresses', 'womens-sweatshirts-hoodies:womens-sweatshirt-dresses'];
const NOT_FOR_STORE = /\b(kids?|child|children|toddler|baby|boys?|pet|dog|cat|pajamas?|pyjamas?|lingerie|costume|cosplay|halloween)\b/i;

type Search = { items: { id: string; name: string; category: string }[] };
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function admin<T>(path: string, init: RequestInit = {}): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    const response = await fetch(SITE + path, { ...init, headers: { 'Content-Type': 'application/json', 'x-admin-password': PASSWORD, ...init.headers } });
    const data = await response.json().catch(() => ({})) as T & { error?: string };
    // CJ allows about one request a second; back off and retry when it says to slow down.
    if ((response.status === 429 || response.status === 502) && attempt < 3) { await sleep(5000 * (attempt + 1)); continue; }
    if (!response.ok) throw new Error(data.error ?? `HTTP ${response.status}`);
    return data;
  }
}

async function main() {
  if (!PASSWORD) throw new Error('Add the DAVINOVA_ADMIN_PASSWORD secret to the GitHub repository first.');
  const catalog = await (await fetch(SITE + '/api/catalog?all=1')).json() as { products: { id: string; cjProductId?: string; storeCollection?: string; storeSubcategory?: string }[] };
  const manifest = JSON.parse(readFileSync('public/cutouts/manifest.json', 'utf8')) as Record<string, string | null>;
  const known = new Set(catalog.products.map((product) => product.cjProductId).filter(Boolean));
  // A product only counts once its photo passed the check (unchecked new imports count too, so re-runs don't over-import).
  const shown = (group: string, sub: string) => catalog.products.filter((product) => product.storeCollection === group && product.storeSubcategory === sub && manifest[product.id] !== null).length;

  // MEN=1 with only= may also name women's bags and shoes, so one run can fill both lists.
  const lists = JEWELRY ? jewelryStoreCollectionGroups : MEN ? [...menStoreCollectionGroups, ...(ONLY.length ? storeCollectionGroups.filter((group) => group.subcategories.some((sub) => WOMEN_OBJECTS[sub.slug])) : [])] : storeCollectionGroups;
  const slots = lists.flatMap((group) => group.subcategories.map((sub) => ({ group, sub })))
    .filter(({ sub }) => !ONLY.length || ONLY.includes(sub.slug))
    .sort((a, b) => rank(a.group.slug, a.sub.slug) - rank(b.group.slug, b.sub.slug));

  let imported = 0;
  const summary: string[] = [];
  for (const { group, sub } of slots) {
    if (imported >= MAX_IMPORTS) break;
    const have = PLUS ? 0 : shown(group.slug, sub.slug);
    let need = Math.max(0, TARGET - have) * 5; // extra, because the photo check hides most CJ photos
    if (!need) continue;
    let added = 0;
    const words = WOMEN_OBJECTS[sub.slug] && !menStoreCollectionGroups.includes(group) ? WOMEN_OBJECTS[sub.slug].search : JEWELRY ? JEWELRY_SEARCH[sub.slug] ?? [sub.label] : MEN ? MEN_SEARCH[sub.slug] ?? [sub.label] : PLUS ? [`plus size ${sub.label.replace(/Women’s|Woman|Ladies|Lady/g, '').trim()}`, ...PLUS_SEARCH] : [sub.label.replace(/Women’s|Woman|Ladies|Lady/g, 'women').replace(/&/g, ' ').replace(/\s+/g, ' ').trim(), ...sub.matchTerms.slice(1, 5)];
    for (const keyword of [...new Set(words)]) {
      for (let page = 1; page <= (PLUS ? 10 : 5) && need > 0 && imported < MAX_IMPORTS; page++) {
        await sleep(1200);
        let result: Search;
        try { result = await admin<Search>(`/api/admin/cj-catalog?q=${encodeURIComponent(keyword)}&page=${page}&size=10`); }
        catch (error) { console.log(`search "${keyword}" failed: ${(error as Error).message}`); break; }
        if (!result.items.length) break;
        for (const item of result.items) {
          if (need <= 0 || imported >= MAX_IMPORTS || known.has(item.id)) continue;
          if (PLUS && !PLUS_TITLE.test(item.name)) continue;
          if (NOT_FOR_STORE.test(item.name) && sub.slug !== 'flower-girl-dresses' && group.slug !== 'couple-parent-child-clothing') continue;
          if (JEWELRY) {
            if (NOT_JEWELRY.test(item.name) || !JEWELRY_FITS[sub.slug]?.test(item.name)) continue;
            if (MEN_PIECES.includes(sub.slug) && (!MEN_TITLE.test(item.name) || WOMEN_TITLE.test(item.name))) continue;
            if (sub.slug.startsWith('womens') && MEN_TITLE.test(item.name) && !WOMEN_TITLE.test(item.name)) continue;
          } else if (MEN && menStoreCollectionGroups.includes(group)) {
            if (!MEN_TITLE.test(item.name) || WOMEN_TITLE.test(item.name) || !MEN_FITS[sub.slug]?.test(item.name)) continue;
            if (group.slug === 'mens-formal' && NOT_TAILORING.test(item.name)) continue;
            if (group.slug === 'mens-accessories' && !MEN_SHOES.includes(sub.slug) && NOT_ACCESSORY.test(item.name)) continue;
            // Lounge shorts are not swim trunks; casual tees are not sets.
            if (sub.slug === 'shorts' && /\b(swim|board|beach)\b/i.test(item.name)) continue;
            // A tuxedo or linen suit belongs in its own sub-category, not under wedding suits.
            if (sub.slug === 'wedding-suits' && (MEN_FITS['tuxedos-and-dinner-jackets'].test(item.name) || /\blinen\b/i.test(item.name))) continue;
          }
          let target = { collection: group.slug, subcategory: sub.slug };
          if (WOMEN_OBJECTS[sub.slug] && !menStoreCollectionGroups.includes(group)) {
            // Bags and shoes: the title must name the piece, and not be made for men or children.
            if (!WOMEN_OBJECTS[sub.slug].fit.test(item.name) || (MEN_TITLE.test(item.name) && !WOMEN_TITLE.test(item.name)) || /\b(kids?|child|children|baby)\b/i.test(item.name)) continue;
          } else if (!JEWELRY && !MEN) {
            const fit = suggestStoreCollection(item.name, item.category);
            if (fit?.collection === group.slug && fit.subcategory === sub.slug) { /* fits the slot */ }
            // Plus-size dresses rarely sort into the exact slot searched; keep any dress, filed where its title says.
            else if (PLUS && fit?.subcategory && DRESS_FIRST.some((key) => key === fit.collection || key === `${fit.collection}:${fit.subcategory}`)) target = { collection: fit.collection, subcategory: fit.subcategory };
            else if (PLUS && /\b(dress|gown)\b/i.test(item.name)) target = { collection: 'tops-and-sets', subcategory: 'lady-dresses' };
            else continue;
          }
          await sleep(1200);
          try {
            await admin('/api/admin/cj-import', { method: 'POST', body: JSON.stringify({ productId: item.id, storeCollection: target.collection, storeSubcategory: target.subcategory }) });
            known.add(item.id); imported++; added++; need--;
            console.log(`+ ${sub.label}: ${item.name}`);
          } catch (error) { console.log(`  skip ${item.id}: ${(error as Error).message}`); }
        }
      }
      if (need <= 0) break;
    }
    summary.push(`${group.label} › ${sub.label}: had ${have}, imported ${added}`);
  }
  console.log('\n' + summary.join('\n') + `\n\nImported ${imported} products.`);
}

function rank(group: string, sub: string) {
  const index = DRESS_FIRST.findIndex((key) => key === group || key === `${group}:${sub}`);
  return index === -1 ? DRESS_FIRST.length : index;
}

main().catch((error) => { console.error(error); process.exit(1); });
