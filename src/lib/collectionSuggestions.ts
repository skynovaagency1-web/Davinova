export const collectionOptions = [
  { value: 'wedding-guest', label: 'Wedding Guest' },
  { value: 'cocktail-party', label: 'Cocktail & Party' },
  { value: 'maxi-holiday', label: 'Maxi & Holiday' },
] as const;

export type StoreCollectionCategory = typeof collectionOptions[number]['value'];

/**
 * Suggest only when the supplier title/category/description contains a useful clue.
 * Ambiguous listings remain unclassified so the owner can choose instead of silently
 * putting every dress into the default Wedding Guest collection.
 */
export function suggestCollectionCategory(
  title: string,
  sourceCategory = '',
  description = '',
): StoreCollectionCategory | undefined {
  const text = [title, sourceCategory, description]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Occasion clues take priority over length, e.g. "maxi wedding guest dress".
  if (/\b(wedding guest|guest dress|bridesmaid|mother of the bride|mother of the groom)\b/.test(text)) {
    return 'wedding-guest';
  }
  if (/\b(cocktail|party|partywear|clubwear|club dress|night out|birthday dress|disco dress)\b/.test(text)) {
    return 'cocktail-party';
  }
  if (/\b(maxi|holiday|vacation|resort|beach|sundress|summer dress|cover up)\b/.test(text)) {
    return 'maxi-holiday';
  }

  return undefined;
}
