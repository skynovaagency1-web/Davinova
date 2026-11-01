/**
 * Supplier boilerplate that doesn't belong on a Davinova product page, shared by the page, the SEO tags and the
 * Merchant feed. Sizing advice is kept but reworded; screen-colour, measuring and packing notes are dropped.
 */
const DROP = [
  /manual(ly)? measure/i,
  /\b(computer|monitor|screen|display|light(ing)?)s?\b.*\bcolou?rs?\b|\bcolou?rs?\b.*\b(computer|monitor|screen|display|light(ing)?)s?\b/i,
  /^\s*(packing|package|packaging) (list|includes?|contents?)\b/i,
  /^\s*product images?\s*:?\s*$/i,
];
const SMALL_SIZES = /\basian siz(e|es|ing)\b|\bsizes? (run|are) (1|one)[- ]?(to|-)[- ]?(2|two) sizes? small/i;

export function cleanSupplierText(raw: string): string {
  const text = raw.replace(/<img\b[^>]*(?:>|$)/gi, '').replace(/\s+\n/g, '\n').trim();
  let sizeNote = false;
  const kept = text.split(/(?<=[.!?])\s+|\n+/).filter((sentence) => {
    if (SMALL_SIZES.test(sentence)) { sizeNote = true; return false; }
    return sentence.trim() && !DROP.some((pattern) => pattern.test(sentence));
  });
  if (sizeNote) kept.push('Runs small: we suggest one size up. See the size guide for exact measurements.');
  return kept.join(' ').replace(/\s+/g, ' ').trim();
}

/** Old CJ imports stored "CJ catalogue image for …; commercial use rights not verified" as the photo text. */
export function imageAlt(alt: string | null | undefined, title: string): string {
  const old = /^CJ catalogue image for (.*?); commercial use rights not verified$/i.exec(alt ?? '');
  if (old) return `${old[1]} | Davinova`;
  return alt?.trim() || title;
}

/*
 * CJ titles are keyword strings ("Straw Crossbody Bags For Women Beach Crescent Bag Summer Chic Woven Handbag…").
 * cleanTitle keeps the first real product name ("Straw Crossbody Bag") and drops sales filler, so every page, the
 * SEO tags, the Merchant feed and Stripe show the same short name. The stored title is left as CJ sent it.
 */
const FILLER = [
  /\bOEM\b/gi, /\bcustom(ized)? logo\b/gi, /\bwholesale\b/gi, /\bhot[- ]sell(ing|er)?\b/gi, /\bbest[- ]sell(ing|er)\b/gi,
  /\boverseas style\b/gi, /\bcross[- ]border\b/gi, /\bforeign trade\b/gi, /\beuropean and american( style)?\b/gi,
  /\bamazon\b/gi, /\bins( style)?\b/gi, /\bexplosive( models?)?\b/gi, /\bnew( arrivals?| style| styles)?\b/gi,
  /\b20[12]\d\b/g, /\bfashion(able)?\b/gi, /\btrendy\b/gi, /\bpopular\b/gi, /\bhigh[- ]quality\b/gi,
  /\b(stylish|simple|all[- ]match)( and | & )?versatile\b/gi, /\bversatile\b/gi, /\bniche\b/gi, /\bexclusive supply\b/gi, /\bspot sales\b/gi, /\bfactory( direct)?\b/gi, /\bpersonality\b/gi, /\bbrand\b/gi, /\bsolid colou?r\b/gi, /\b\d+ ?(pieces?|pcs)\b/gi, /\b(one|two|single|double)[- ]buttons?\b/gi, /\bgifts?\b(?! (box|card|set))/gi,
  /\bfor (women|men|ladies|girls|boys|female|male)( (and|&) (women|men|girls|boys))?\b/gi,
  /\b(women|woman|men|man|ladies|lady|girls?|female|male)['’]?s?\b/gi, /\bwomens\b/gi, /\bmens\b/gi, /\bUS\b/g,
];
const KEEP_PLURAL = new Set(['boots', 'heels', 'shoes', 'sandals', 'loafers', 'sneakers', 'trousers', 'pants', 'jeans', 'earrings',
  'glasses', 'sunglasses', 'socks', 'flats', 'pumps', 'shorts', 'joggers', 'slippers', 'mules', 'leggings', 'cufflinks', 'oxfords',
  'brogues', 'trainers', 'pajamas', 'pyjamas', 'gloves', 'studs', 'hoops', 'lashes', 'extensions', 'bundles', 'briefs', 'boxers']);
const HEADS = new Set([...KEEP_PLURAL, 'dress', 'gown', 'skirt', 'top', 'blouse', 'shirt', 't-shirt', 'tee', 'sweater', 'cardigan', 'hoodie',
  'sweatshirt', 'jacket', 'coat', 'blazer', 'suit', 'tuxedo', 'vest', 'waistcoat', 'jumpsuit', 'romper', 'bodysuit', 'set', 'outfit', 'robe',
  'bathrobe', 'nightgown', 'kimono', 'cape', 'shawl', 'scarf', 'tie', 'bowtie', 'belt', 'hat', 'cap', 'beanie', 'beret', 'bag', 'handbag',
  'clutch', 'tote', 'purse', 'wallet', 'backpack', 'briefcase', 'crossbody', 'watch', 'necklace', 'bracelet', 'bangle', 'ring', 'pendant',
  'choker', 'anklet', 'brooch', 'tiara', 'crown', 'headband', 'hairband', 'clip', 'comb', 'veil', 'wig', 'mask', 'mirror', 'kit', 'lipstick',
  'gloss', 'glaze', 'eyeliner', 'mascara', 'palette', 'brush', 'perfume', 'massager', 'curler', 'straightener', 'trimmer', 'epilator',
  'parka', 'puffer', 'trench', 'overcoat', 'gilet', 'pullover', 'polo', 'camisole', 'cami', 'corset', 'bra', 'lingerie', 'swimsuit',
  'bikini', 'kaftan', 'sarong', 'pouch', 'satchel', 'bucket', 'duffel', 'umbrella', 'brogue', 'oxford', 'loafer', 'sneaker', 'sandal',
  'boot', 'heel', 'shoe', 'slipper', 'pump', 'mule', 'holder', 'shadow', 'eyeshadow', 'lamp', 'serum', 'lotion', 'essence']);
/** A garment word that only describes a detail: "Shawl Lapel", "Top Layer", "Heel Splicing". */
const DETAIL_AFTER = /^(lapel|collar|neck|layer|sleeves?|toe|splicing|strap|buckle|mouth|design|pattern)$/i;
/** Nouns that are often adjectives for the next noun: "Crossbody Bag", "Shirt Dress", "Dress Shoes". */
const LEADS_INTO = /^(crossbody|bucket|tote|top|watch|hat|dress|shirt|card|chest|waist|belt|shoulder|evening|suit|tuxedo|pocket|ring|hair|lace)$/i;
const SMALL = new Set(['and', 'with', 'of', 'in', 'on', 'for', 'the', 'a', 'to', '&']);

function titleWord(word: string, first: boolean): string {
  if (/\d/.test(word) || (/^[A-Z]{2,4}$/.test(word) && !SMALL.has(word.toLowerCase()))) return word;
  const lower = word.toLowerCase();
  if (!first && SMALL.has(lower)) return lower;
  return lower.replace(/(^|[-'])([a-z])/g, (_, sep, ch) => sep + ch.toUpperCase());
}

export function cleanTitle(raw: string): string {
  const original = raw.replace(/\s+/g, ' ').trim();
  if (!original) return original;
  let text = original.replace(/[([{【].*?[)\]}】]/g, ' ').replace(/[,|/;:+]+/g, ' ');
  for (const pattern of FILLER) text = text.replace(pattern, ' ');
  let words = text.split(/\s+/).filter((word) => word && !/^[-&]+$/.test(word) && !/^[b-z]$/i.test(word));
  words = words.filter((word, i) => i === 0 || word.toLowerCase() !== words[i - 1].toLowerCase());
  // Repeated pairs: "Card Holder Card Holder Wallet".
  for (let i = 0; i + 3 < words.length; i += 1) {
    if (words[i].toLowerCase() === words[i + 2].toLowerCase() && words[i + 1].toLowerCase() === words[i + 3].toLowerCase()) { words.splice(i + 2, 2); i -= 1; }
  }
  while (words.length && SMALL.has(words[0].toLowerCase())) words.shift();
  if (!words.length) return original;
  const head = (word: string) => {
    const key = word.toLowerCase().replace(/[^a-z-]/g, '');
    return HEADS.has(key) || (key.endsWith('s') && HEADS.has(key.slice(0, -1)));
  };
  const shoes = /\b(shoes?|oxfords?|loafers?|brogues?|heels|pumps|boots)\b/i.test(words.join(' '));
  // "Dress" before shoes means formal shoes, not a dress.
  const isHead = (word: string, i: number) => head(word) && !DETAIL_AFTER.test(words[i + 1] ?? '') && !(shoes && /^dress$/i.test(word));
  const heads = words.map((word, i) => (isHead(word, i) ? i : -1)).filter((i) => i >= 0);
  let picked = words.slice(0, 6);
  if (heads.length) {
    let at = heads[0];
    if (at === 0 && heads.length > 1 && heads[1] <= 6) at = heads[1];
    // "Crossbody" and "Bucket" are often an adjective for the bag that follows.
    while (LEADS_INTO.test(words[at]) && words[at + 1] && head(words[at + 1]) && at < 7
      && !words.slice(0, at + 1).some((word) => word.toLowerCase() === words[at + 1].toLowerCase())) at += 1;
    const start = Math.max(0, at - 6);
    picked = words.slice(start, at + 1);
    if (picked.length > 2 && head(picked[0]) && !LEADS_INTO.test(picked[0])) picked = picked.slice(1);
    else if (picked.length > 1 && picked[0].toLowerCase() === picked[picked.length - 1].toLowerCase()) picked = picked.slice(1);
    // A lone noun ("Watch") reads better with what follows it: "Watch with Diamonds".
    if (picked.length === 1 && /^with$/i.test(words[at + 1] ?? '') && words[at + 2]) picked = words.slice(at, at + 3);
    const last = picked[picked.length - 1];
    const lower = last.toLowerCase();
    if (lower.endsWith('s') && !KEEP_PLURAL.has(lower) && HEADS.has(lower.slice(0, -1)) && !/ss$/.test(lower)) picked[picked.length - 1] = last.slice(0, -1);
  }
  while (picked.length > 1 && SMALL.has(picked[picked.length - 1].toLowerCase())) picked.pop();
  while (picked.length > 1 && SMALL.has(picked[0].toLowerCase())) picked.shift();
  const out = picked.map((word, i) => titleWord(word, i === 0)).join(' ').replace(/\ba line\b/gi, 'A-Line').replace(/\s+/g, ' ').trim();
  return out.length >= 3 ? out : original;
}

/** Colour labels as CJ sends them ("picture color", "wine red", "offwhite", "A") made readable on the buttons. */
export function colourLabel(raw: string): string {
  const value = raw.trim();
  const lower = value.toLowerCase().replace(/\s+/g, ' ');
  if (!lower) return value;
  if (/^(picture|photo|image|as (shown|picture))( colou?r)?$/.test(lower)) return 'As pictured';
  if (/^([a-h]|\d{1,2})$/.test(lower)) return `Style ${value.toUpperCase()}`;
  if (/^(style|model) ?\d+$|^\d+ ?style$/.test(lower)) return `Style ${lower.replace(/\D/g, '')}`;
  const named: Record<string, string> = {
    'skin color': 'Nude', 'skin colour': 'Nude', offwhite: 'Off-white', 'off white': 'Off-white', golden: 'Gold',
    'red wine': 'Wine red', 'army green': 'Olive green', 'rose red': 'Rose', 'caramel color': 'Caramel', 'coffee': 'Coffee brown',
  };
  if (named[lower]) return named[lower];
  const tidy = lower.replace(/\bcolou?r\b/g, '').replace(/\s+/g, ' ').trim() || lower;
  return tidy.charAt(0).toUpperCase() + tidy.slice(1);
}
