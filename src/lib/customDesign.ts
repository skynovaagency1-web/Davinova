/**
 * Design-your-own pieces, printed per order by Printify. Shared by the design maker page
 * and the Worker, so the price a customer sees is the price the server charges.
 * Prices follow the store rule (about 2.5x Printify cost + US shipping), owner to confirm.
 */
export type CustomProductKey = 'tee' | 'hoodie' | 'tote' | 'mug' | 'cap' | 'joggers' | 'set' | 'couple';
/** Pieces Printify prints directly; 'set' and 'couple' are bundles of them. */
export type PrintableKey = Exclude<CustomProductKey, 'set' | 'couple'>;

export interface CustomColor { name: string; hex: string; ink: string }
export interface CustomProduct {
  key: CustomProductKey;
  name: string;
  /** Short name on the piece picker. */
  label: string;
  line: string;
  priceCents: number;
  colors: CustomColor[];
  /** Empty for one-size pieces. */
  sizes: string[];
  /** Print area in pixels at about 300 dpi (Printify's front placeholder). */
  print: { width: number; height: number; inches: number };
  /** Bundles: the pieces printed with the same design, per person. */
  parts?: PrintableKey[];
  /** Bundles: how many people (a couple set is 2), each with their own sizes. */
  people?: number;
}

const CREAM = '#FBF1E2';
const ESPRESSO = '#2E2019';
// Jogging-set colours: offered on both the hoodie and the joggers (Gildan names, as Printify lists them).
const SET_COLORS: CustomColor[] = [{ name: 'Black', hex: '#1b1a19', ink: CREAM }, { name: 'Sport Grey', hex: '#a3a3a0', ink: ESPRESSO }, { name: 'Navy', hex: '#1f2a44', ink: CREAM }];
const APPAREL_SIZES = ['S', 'M', 'L', 'XL', '2XL', '3XL'];

export const CUSTOM_PRODUCTS: CustomProduct[] = [
  {
    key: 'tee', name: 'Custom tee', label: 'Tee', line: 'Soft cotton jersey, unisex fit', priceCents: 3999,
    colors: [{ name: 'White', hex: '#f7f5f0', ink: ESPRESSO }, { name: 'Black', hex: '#1d1b1a', ink: CREAM }, { name: 'Natural', hex: '#e9dfcc', ink: ESPRESSO }],
    sizes: ['S', 'M', 'L', 'XL', '2XL', '3XL'], print: { width: 4500, height: 5400, inches: 12 },
  },
  {
    key: 'hoodie', name: 'Custom hoodie', label: 'Hoodie', line: 'Heavy blend fleece, unisex fit', priceCents: 7499,
    colors: [{ name: 'White', hex: '#f4f2ee', ink: ESPRESSO }, { name: 'Black', hex: '#1b1a19', ink: CREAM }, { name: 'Sand', hex: '#d8c8ab', ink: ESPRESSO }, SET_COLORS[1], SET_COLORS[2]],
    sizes: ['S', 'M', 'L', 'XL', '2XL', '3XL'], print: { width: 4500, height: 4500, inches: 12 },
  },
  {
    key: 'tote', name: 'Custom tote', label: 'Tote', line: 'Sturdy cotton canvas, long handles', priceCents: 4499,
    colors: [{ name: 'Natural', hex: '#ece2cf', ink: ESPRESSO }, { name: 'Black', hex: '#1d1b1a', ink: CREAM }],
    sizes: [], print: { width: 3600, height: 3600, inches: 12 },
  },
  {
    key: 'mug', name: 'Custom mug', label: 'Mug', line: '11 oz white ceramic, dishwasher safe', priceCents: 3299,
    colors: [{ name: 'White', hex: '#fbfaf7', ink: ESPRESSO }],
    sizes: [], print: { width: 2475, height: 1155, inches: 8.5 },
  },
  {
    key: 'cap', name: 'Custom baseball cap', label: 'Cap', line: 'Trucker cap, printed front, adjustable snap back', priceCents: 4299,
    colors: [{ name: 'White', hex: '#f4f2ee', ink: ESPRESSO }, { name: 'Black', hex: '#1b1a19', ink: CREAM }],
    sizes: [], print: { width: 1350, height: 690, inches: 4.5 },
  },
  {
    key: 'joggers', name: 'Custom joggers', label: 'Joggers', line: 'Fleece sweatpants, unisex fit, printed on the leg', priceCents: 6499,
    colors: SET_COLORS, sizes: APPAREL_SIZES, print: { width: 1200, height: 2400, inches: 4 },
  },
  {
    key: 'set', name: 'Custom jogging set', label: 'Jogging set', line: 'Hoodie + joggers with your design, pick each size', priceCents: 11999,
    colors: SET_COLORS, sizes: APPAREL_SIZES, print: { width: 4500, height: 4500, inches: 12 }, parts: ['hoodie', 'joggers'], people: 1,
  },
  {
    key: 'couple', name: 'Custom couple jogging sets', label: 'Couple set', line: 'Two matching hoodie + joggers sets, sizes for each of you', priceCents: 21999,
    colors: SET_COLORS, sizes: APPAREL_SIZES, print: { width: 4500, height: 4500, inches: 12 }, parts: ['hoodie', 'joggers'], people: 2,
  },
];

export const MAX_CUSTOM_QUANTITY = 10;

export function customProduct(key: unknown): CustomProduct | undefined {
  return CUSTOM_PRODUCTS.find((product) => product.key === key);
}

/** A bundle's pieces with their sizes. Sizes are stored as "M/L" (top/bottom) per person, people joined by "+". */
export function bundlePieces(product: CustomProduct, size: string): { key: PrintableKey; size: string; person: number }[] | null {
  if (!product.parts) return null;
  const people = size.split('+');
  if (people.length !== (product.people ?? 1)) return null;
  const pieces: { key: PrintableKey; size: string; person: number }[] = [];
  for (const [person, sizes] of people.entries()) {
    const each = sizes.split('/');
    if (each.length !== product.parts.length || each.some((item) => !product.sizes.includes(item))) return null;
    product.parts.forEach((key, index) => pieces.push({ key, size: each[index], person: person + 1 }));
  }
  return pieces;
}

/** "Top M, bottom L" (and "You: … · Partner: …" for a couple) for order titles. */
export function bundleSizeLabel(size: string): string {
  const people = size.split('+').map((sizes) => { const [top, bottom] = sizes.split('/'); return `top ${top}, bottom ${bottom}`; });
  return people.length > 1 ? people.map((text, i) => `${i ? 'Partner' : 'You'}: ${text}`).join(' · ') : people[0].replace(/^t/, 'T');
}

/** Size label for a one-size piece, as stored on the order. */
export const ONE_SIZE = 'One size';
