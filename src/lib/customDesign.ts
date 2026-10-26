/**
 * Design-your-own pieces, printed per order by Printify. Shared by the design maker page
 * and the Worker, so the price a customer sees is the price the server charges.
 * Prices follow the store rule (about 2.5x Printify cost + US shipping), owner to confirm.
 */
export type CustomProductKey = 'tee' | 'hoodie' | 'tote' | 'mug';

export interface CustomColor { name: string; hex: string; ink: string }
export interface CustomProduct {
  key: CustomProductKey;
  name: string;
  line: string;
  priceCents: number;
  colors: CustomColor[];
  /** Empty for one-size pieces. */
  sizes: string[];
  /** Print area in pixels at about 300 dpi (Printify's front placeholder). */
  print: { width: number; height: number; inches: number };
}

const CREAM = '#FBF1E2';
const ESPRESSO = '#2E2019';

export const CUSTOM_PRODUCTS: CustomProduct[] = [
  {
    key: 'tee', name: 'Custom tee', line: 'Soft cotton jersey, unisex fit', priceCents: 3999,
    colors: [{ name: 'White', hex: '#f7f5f0', ink: ESPRESSO }, { name: 'Black', hex: '#1d1b1a', ink: CREAM }, { name: 'Natural', hex: '#e9dfcc', ink: ESPRESSO }],
    sizes: ['S', 'M', 'L', 'XL', '2XL', '3XL'], print: { width: 4500, height: 5400, inches: 12 },
  },
  {
    key: 'hoodie', name: 'Custom hoodie', line: 'Heavy blend fleece, unisex fit', priceCents: 7499,
    colors: [{ name: 'White', hex: '#f4f2ee', ink: ESPRESSO }, { name: 'Black', hex: '#1b1a19', ink: CREAM }, { name: 'Sand', hex: '#d8c8ab', ink: ESPRESSO }],
    sizes: ['S', 'M', 'L', 'XL', '2XL', '3XL'], print: { width: 4500, height: 4500, inches: 12 },
  },
  {
    key: 'tote', name: 'Custom tote', line: 'Sturdy cotton canvas, long handles', priceCents: 4499,
    colors: [{ name: 'Natural', hex: '#ece2cf', ink: ESPRESSO }, { name: 'Black', hex: '#1d1b1a', ink: CREAM }],
    sizes: [], print: { width: 3600, height: 3600, inches: 12 },
  },
  {
    key: 'mug', name: 'Custom mug', line: '11 oz white ceramic, dishwasher safe', priceCents: 3299,
    colors: [{ name: 'White', hex: '#fbfaf7', ink: ESPRESSO }],
    sizes: [], print: { width: 2475, height: 1155, inches: 8.5 },
  },
];

export const MAX_CUSTOM_QUANTITY = 10;

export function customProduct(key: unknown): CustomProduct | undefined {
  return CUSTOM_PRODUCTS.find((product) => product.key === key);
}

/** Size label for a one-size piece, as stored on the order. */
export const ONE_SIZE = 'One size';
