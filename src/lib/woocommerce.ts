import type { DressSize, Product } from '../types/product';

const storeUrl = (import.meta.env.VITE_WOOCOMMERCE_URL as string | undefined)?.trim().replace(/\/+$/, '');

export function isWooCommerceConfigured(): boolean {
  return Boolean(storeUrl);
}

export function getWooCommerceBaseUrl(): string | null {
  return storeUrl || null;
}

export function getWooCommercePageUrl(path: 'shop' | 'cart' | 'checkout'): string | null {
  if (!storeUrl) return null;
  const paths = { shop: '/shop/', cart: '/cart/', checkout: '/checkout/' };
  return `${storeUrl}${paths[path]}`;
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

interface WooStoreProduct {
  id: number;
  name: string;
  slug: string;
  permalink: string;
  type?: string;
  description?: string;
  short_description?: string;
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
  const values = attribute.terms?.map((term) => term.name ?? '').filter(Boolean);
  return values?.length ? values : (attribute.options ?? []).filter(Boolean);
}

function normaliseSize(value: string): DressSize | undefined {
  const size = value.trim().toUpperCase().replace(/[\s_-]/g, '');
  const aliases: Record<string, DressSize> = {
    XS: 'XS', XSMALL: 'XS', S: 'S', SMALL: 'S', M: 'M', MEDIUM: 'M',
    L: 'L', LARGE: 'L', XL: 'XL', X-LARGE: 'XL', XXL: '2XL', '2XL': '2XL',
    XXXL: '3XL', '3XL': '3XL', XXXXL: '4XL', '4XL': '4XL',
  };
  return aliases[size];
}

function productOccasion(product: WooStoreProduct): Product['occasion'] {
  const labels = [
    ...(product.categories ?? []).flatMap((item) => [item.slug, item.name]),
    ...(product.tags ?? []).flatMap((item) => [item.slug, item.name]),
    product.name,
  ].filter(Boolean).join(' ').toLowerCase().replace(/[_-]/g, ' ');

  if (labels.includes('bridesmaid')) return 'bridesmaid';
  if (labels.includes('cocktail')) return 'cocktail';
  if (labels.includes('evening') || labels.includes('formal') || labels.includes('gown')) return 'evening';
  return 'wedding-guest';
}

function mapWooProduct(item: WooStoreProduct): Product {
  const attributes = item.attributes ?? [];
  const findAttribute = (pattern: RegExp) =>
    attributes.find((attribute) => pattern.test(`${attribute.name ?? ''} ${attribute.taxonomy ?? ''}`));
  const sizes = [...new Set((attributeValues(findAttribute(/size/i))).map(normaliseSize).filter((size): size is DressSize => Boolean(size)))];
  const colorValues = attributeValues(findAttribute(/colou?r/i));
  const color = colorValues[0] ?? 'As shown';
  const length = attributeValues(findAttribute(/length/i))[0] ?? 'Midi';
  const sleeve = attributeValues(findAttribute(/sleeve/i))[0] ?? '';
  const neckline = attributeValues(findAttribute(/neckline/i))[0] ?? '';
  const priceCents = toCents(item.prices?.price, item.prices?.currency_minor_unit ?? 2);
  const regularPriceCents = toCents(item.prices?.regular_price, item.prices?.currency_minor_unit ?? 2);
  const description = cleanText(item.short_description) || cleanText(item.description);
  const tags = [
    ...(item.tags ?? []).map((tag) => tag.name ?? tag.slug ?? ''),
    ...attributes.flatMap((attribute) => attributeValues(attribute)),
  ].filter(Boolean);

  return {
    id: String(item.id),
    slug: item.slug,
    title: item.name,
    description,
    priceCents,
    compareAtCents: regularPriceCents > priceCents ? regularPriceCents : undefined,
    supplier: 'cj',
    occasion: productOccasion(item),
    color,
    length: /^(mini|midi|maxi)$/i.test(length) ? (length[0].toUpperCase() + length.slice(1).toLowerCase()) as Product['length'] : 'Midi',
    sleeve,
    neckline,
    tags,
    sizes,
    images: (item.images ?? []).filter((image) => Boolean(image.src)).map((image) => ({
      url: image.src!,
      alt: image.alt || image.name || item.name,
    })),
    currency: item.prices?.currency_code || (import.meta.env.VITE_CURRENCY as string | undefined) || 'USD',
    woocommerceProductId: item.id,
    woocommercePermalink: item.permalink,
    woocommerceType: item.type === 'variable' ? 'variable' : 'simple',
    inStock: item.is_in_stock !== false,
  };
}

export async function fetchWooCommerceProducts(signal?: AbortSignal): Promise<Product[]> {
  if (!storeUrl) throw new Error('WooCommerce is not configured. Set VITE_WOOCOMMERCE_URL to your WordPress store URL.');

  const products: Product[] = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    const endpoint = `${storeUrl}/wp-json/wc/store/v1/products?per_page=100&page=${page}`;
    const response = await fetch(endpoint, { method: 'GET', signal, headers: { Accept: 'application/json' } });
    if (!response.ok) {
      throw new Error(`WooCommerce catalogue request failed (HTTP ${response.status}). Check the store URL, Store API, and cross-origin access settings.`);
    }
    const result: unknown = await response.json();
    if (!Array.isArray(result)) throw new Error('WooCommerce returned an unexpected product response.');
    products.push(...result.map((item) => mapWooProduct(item as WooStoreProduct)));
    totalPages = Math.max(1, Number(response.headers.get('X-WP-TotalPages') ?? 1) || 1);
    page += 1;
  }

  return products.filter((product) => product.inStock !== false);
}
