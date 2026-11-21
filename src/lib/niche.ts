/**
 * Davinova sells occasion dresses, suits, jewellery, watches, bags, shoes and the accessories that go with them.
 * Gadgets, hair tools, nail kits, massagers, wigs and lounge/athleisure pieces that CJ imports dragged in are kept
 * in the database but never shown (owner, 2026-11-18: "the catalogue is too broad").
 */
const OFF_COLLECTIONS = new Set(['beauty-tools', 'nail-art-and-tools', 'hair-weaves', 'food-and-health', 'skin-care']);
const OFF_SUBCATEGORIES = new Set([
  'human-hair', 'salon-bundle-hair', 'hair-weaving', 'pre-colored-one-pack', 'hair-styling',
  'womens-activewear-sets', 'leggings', 'womens-sweatpants', 'womens-sweatsuit-sets', 'womens-zip-up-hoodies',
  'womens-overalls', 'woman-slippers', 'man-slippers', 'mens-insoles', 'family-matching-tops', 'mens-sleep-and-lounge',
  'couple-and-parent-child-suits', 'makeup-set',
]);
const OFF_TITLE = /\b(speakers?|bluetooth|usb|charg(er|ing)|rechargeable|massager?|curl(er|ing iron)|straighten(er|ing)|hair dryer|trimmer|epilator|razor|steamer|diffuser|difuser|wigs?|nail (lamp|light|dryer|drill|clippers?|art|gel|polish)|manicure|phototherapy|led light|insoles?|pajamas?|pyjamas?|sweatpants|scrubber|fur ball)\b/i;

export function isOffNiche(title: string, collection?: string, subcategory?: string): boolean {
  if (collection && OFF_COLLECTIONS.has(collection)) return true;
  if (subcategory && OFF_SUBCATEGORIES.has(subcategory)) return true;
  // Watches keep words like "LED" or "charging" (solar watches); everything else with gadget words goes.
  if (/\bwatch(es)?\b/i.test(title) || subcategory?.includes('watches')) return false;
  return OFF_TITLE.test(title);
}
