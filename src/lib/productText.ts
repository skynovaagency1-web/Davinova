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
