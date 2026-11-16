// Children's pieces (flower girl, parent-child sets): the women's home shows adults only.
export const KIDS = /\b(girls?|girl's|kids?|child|children|baby|babies|toddlers?|infants?|princess|flower girl)\b/i;
/** Children's pieces (flower girl dresses, family sets) stay on their own pages, never on the home page. */
export const isKidsPiece = (product: { title: string; storeCollection?: string; storeSubcategory?: string }) =>
  product.storeSubcategory === 'flower-girl-dresses' || product.storeCollection === 'couple-parent-child-clothing' || product.storeCollection === 'parent-child-clothing' || KIDS.test(product.title);

/** No children's pieces in the Weddings category (owner, 2026-11-16): the catalogue never sends these. */
export const isChildrensWedding = (title: string, collection?: string, subcategory?: string) =>
  subcategory === 'flower-girl-dresses' || (collection === 'weddings' && KIDS.test(title));
