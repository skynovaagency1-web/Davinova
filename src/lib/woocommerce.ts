import type { CollectionCategory, DressSize, Product } from '../types/product';

const rawStoreUrl = (import.meta.env.VITE_WOOCOMMERCE_URL as string | undefined)?.trim();
const storeUrl = rawStoreUrl ? rawStoreUrl.replace(/\/+$/, '') : '';

export function isWooCommerceConfigured(): boolean {
  return Boolean(storeUrl);
}

export function getWooCommerceBaseUrl(): string | null {
  return storeUrl || null;
}

export function getWooCommercePageUrl(path: 'shop' | 'cart' | 'checkout'): string | null {
  if (!storeUrl) return null;
  const paths = {
    shop: import.meta.env.VITE_WOOCOMMERCE_SHOP_PATH || '/shop/',
    cart: import.meta.env.VITE_WOOCOMMERCE_CART_PATH || '/cart/',
    checkout: import.meta.env.VITE_WOOCOMMERCE_CHECKOUT_PATH || '/checkout/',
  };
  const suffix = String(paths[path]).startsWith('/') ? String(paths[path]) : '/' + String(paths[path]);
  return storeUrl + (suffix.endsWith('/') ? suffix : suffix + '/');
}

interface WooAttributeTerm {
  name?: string;
  slug?: string;
}

interface WooAttribute {
  name?: string;
  taxonomy?: string;
  terms?: WooAttributeTerm[];
  options?: string[];
}

export interface WooStoreProduct {
  id: number;
  name: string;
  slug: string;
  permalink: string;
  type?: string;
  description?: string;
  short_description?: string;
  featured?: boolean;
  on_sale?: boolean;
  prices?: {
    price?: string;
    regular_price?: string;
    currency_code?: string;
    currency_minor_unit?: number;
  };
  images?: Array<{ src?: string; alt?: string; name?: string }>;
  attributes?: WooAttribute[];
  categories?: Array<{ name?: string; slug?: string }>;
  tags?: Array<{ name?: string; slug?: string }>;
  is_in_stock?: boolean;
  is_purchasable?: boolean;
}

function cleanText(value: string | undefined): string {
  return (value ?? '')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#039;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function toCents(value: string | undefined, minorUnit = 2): number {
  const amountInMinorUnits = Number(value ?? 0);
  if (!Number.isFinite(amountInMinorUnits)) return 0;
  return Math.round((amountInMinorUnits / 10 ** minorUnit) * 100);
}

function attributeValues(attribute: WooAttribute | undefined): string[] {
  if (!attribute) return [];
  const terms = attribute.terms?.map((term) => term.name ?? '').filter(Boolean);
  return terms?.length ? terms : (attribute.options ?? []).filter(Boolean);
}

/**
 * Straight sizes (XS-XL) and extended/curve sizes (1X/1XL through 6X/6XL) are
 * distinct labels, not synonyms of each other: '1XL' is not the same size as
 * 'XL'. Only the conventional "repeated X" spellings (XXL, XXXL, ...) are
 * aliased to their '<n>XL' equivalent; every '<n>X' and '<n>XL' label is
 * otherwise recognized as itself.
 */
export function normaliseSize(value: string): DressSize | undefined {
  const size = value.trim().toUpperCase().replace(/[\s_-]/g, '');
  const aliases: Record<string, DressSize> = {
    XS: 'XS', XSMALL: 'XS',
    S: 'S', SMALL: 'S',
    M: 'M', MEDIUM: 'M', MED: 'M',
    L: 'L', LARGE: 'L',
    XL: 'XL', XLARGE: 'XL',
    '1XL': '1XL',
    XXL: '2XL', '2XL': '2XL',
    XXXL: '3XL', '3XL': '3XL',
    XXXXL: '4XL', '4XL': '4XL',
    XXXXXL: '5XL', '5XL': '5XL',
    XXXXXXL: '6XL', '6XL': '6XL',
    '1X': '1X', '2X': '2X', '3X': '3X', '4X': '4X', '5X': '5X', '6X': '6X',
  };
  return aliases[size];
}

function productCollection(product: WooStoreProduct): CollectionCategory {
  const labels = [
    ...(product.categories ?? []).flatMap((item) => [item.slug, item.name]),
    ...(product.tags ?? []).flatMap((item) => [item.slug, item.name]),
    product.name,
  ].filter(Boolean).join(' ').toLowerCase().replace(/[_-]/g, ' ');

  if (/cocktail|party|occasion/.test(labels)) return 'cocktail-party';
  if (/maxi|holiday|resort|vacation|beach/.test(labels)) return 'maxi-holiday';
  if (/dress|wedding|guest|formal|evening|gown|bridesmaid/.test(labels)) return 'wedding-guest';
  return 'unassigned';
}

function productOccasion(product: WooStoreProduct): Product['occasion'] {
  const labels = [
    ...(product.categories ?? []).flatMap((item) => [item.slug, item.name]),
    ...(product.tags ?? []).flatMap((item) => [item.slug, item.name]),
    product.name,
  ].filter(Boolean).join(' ').toLowerCase().replace(/[_-]/g, ' ');

  if (labels.includes('bridesmaid')) return 'bridesmaid';
  if (labels.includes('cocktail') || labels.includes('party')) return 'cocktail';
  if (labels.includes('evening') || labels.includes('formal') || labels.includes('gown')) return 'evening';
  return 'wedding-guest';
}

function validStoreLink(value: string | undefined): string | undefined {
  if (!value) return undefined;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed.toString() : undefined;
  } catch {
    return undefined;
  }
}

export function mapWooCommerceProduct(item: WooStoreProduct): Product {
  const attributes = item.attributes ?? [];
  const findAttribute = (pattern: RegExp) =>
    attributes.find((attribute) => pattern.test(`${attribute.name ?? ''} ${attribute.taxonomy ?? ''}`));
  const sizes = [...new Set(attributeValues(findAttribute(/size/i)).map(normaliseSize).filter((size): size is DressSize => Boolean(size)))];
  const colorValues = attributeValues(findAttribute(/colou?r/i));
  const color = colorValues[0] ?? 'As shown';
  const lengthValue = attributeValues(findAttribute(/length/i))[0] ?? (/\bmaxi\b/i.test(item.name) ? 'Maxi' : 'Midi');
  const sleeve = attributeValues(findAttribute(/sleeve/i))[0] ?? '';
  const neckline = attributeValues(findAttribute(/neckline/i))[0] ?? '';
  const minorUnit = item.prices?.currency_minor_unit ?? 2;
  const priceCents = toCents(item.prices?.price, minorUnit);
  const regularPriceCents = toCents(item.prices?.regular_price, minorUnit);
  const inStock = item.is_in_stock === true;
  const isPurchasable = item.is_purchasable === true;
  const images = (item.images ?? []).filter((image) => Boolean(validStoreLink(image.src)))
    .map((image) => ({ url: validStoreLink(image.src)!, alt: cleanText(image.alt) || cleanText(image.name) || item.name }));
  const permalink = validStoreLink(item.permalink);
  const collectionCategory = productCollection(item);

  return {
    id: `woo-${item.id}`,
    slug: item.slug,
    title: cleanText(item.name),
    description: cleanText(item.short_description) || cleanText(item.description),
    priceCents,
    compareAtCents: regularPriceCents > priceCents ? regularPriceCents : undefined,
    currency: item.prices?.currency_code || (import.meta.env.VITE_CURRENCY as string | undefined) || 'EUR',
    supplier: 'cj',
    supplierVerified: false,
    sourceSupplier: 'cj',
    collectionCategory,
    occasion: productOccasion(item),
    color,
    length: /^(mini|midi|maxi)$/i.test(lengthValue) ? (lengthValue[0].toUpperCase() + lengthValue.slice(1).toLowerCase()) as Product['length'] : 'Midi',
    sleeve,
    neckline,
    tags: [
      ...(item.tags ?? []).map((tag) => tag.name ?? tag.slug ?? ''),
      ...attributes.flatMap((attribute) => attributeValues(attribute)),
    ].filter(Boolean),
    sizes,
    images,
    featured: item.featured === true || item.on_sale === true,
    browseOnly: !(inStock && isPurchasable && Boolean(permalink)),
    woocommerceProductId: item.id,
    woocommercePermalink: permalink,
    woocommerceType: item.type === 'variable' ? 'variable' : 'simple',
    inStock,
    isPurchasable,
  };
}

export function isWooCommerceProduct(product: Product): boolean {
  return Boolean(product.woocommerceProductId && product.woocommercePermalink);
}

export function isProductPurchasable(product: Product): boolean {
  if (isWooCommerceProduct(product)) return product.inStock === true && product.isPurchasable === true;
  return product.browseOnly === false && product.supplierVerified && product.sizes.length > 0;
}

export async function fetchWooCommerceProducts(signal?: AbortSignal): Promise<Product[]> {
  if (!storeUrl) throw new Error('WooCommerce is not configured. Set VITE_WOOCOMMERCE_URL to your WordPress/WooCommerce site root.');

  const products: Product[] = [];
  let page = 1;
  const pageSize = 100;
  while (page <= 100) {
    const endpoint = `${storeUrl}/wp-json/wc/store/v1/products?per_page=${pageSize}&page=${page}`;
    const response = await fetch(endpoint, { method: 'GET', signal, headers: { Accept: 'application/json' } });
    if (!response.ok) {
      throw new Error(`WooCommerce catalogue request failed (HTTP ${response.status}). Check the store URL, public Store API and cross-origin access.`);
    }
    const result: unknown = await response.json();
    if (!Array.isArray(result)) throw new Error('WooCommerce returned an unexpected product response.');
    products.push(...result.map((item) => mapWooCommerceProduct(item as WooStoreProduct)));
    if (result.length < pageSize) return products;
    page += 1;
  }
  throw new Error('The WooCommerce catalogue exceeded the pagination safety limit.');
}
