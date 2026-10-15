// Editorial inspiration imagery for the storefront layout only.
// These are not exact photographs of any supplier product. Product-specific
// images must be verified and approved before a dress is sold.
export const editorialImages = {
  black: 'https://images.unsplash.com/photo-1568251188392-ae32f898cb3b?auto=format&fit=crop&w=900&q=80',
  blue: 'https://images.unsplash.com/photo-1759349394750-f85f5c3fc4b2?auto=format&fit=crop&w=900&q=80',
  burgundy: 'https://images.unsplash.com/photo-1763559046515-1b98e82bc6d4?auto=format&fit=crop&w=900&q=80',
} as const;

export function editorialImageFor(color: string | undefined): string {
  const value = (color ?? '').toLowerCase();
  if (/blue|navy|green|sage|emerald|teal/.test(value)) return editorialImages.blue;
  if (/burgundy|wine|red|pink|blush|apricot|rose/.test(value)) return editorialImages.burgundy;
  return editorialImages.black;
}
