const CJ_API_BASE = 'https://developers.cjdropshipping.com/api2.0/v1';
const TOKEN_CACHE_KEY = 'cj_auth_tokens';
const encoder = new TextEncoder();

export interface CJEnv {
  DB: D1Database;
  CJ_API_KEY?: string;
  CJ_TOKEN_ENCRYPTION_KEY?: string;
  CJ_LOGISTIC_NAME?: string;
  CJ_FROM_COUNTRY_CODE?: string;
  CJ_SANDBOX?: string;
  CJ_LIVE_ORDERS_ENABLED?: string;
  DRY_RUN?: string;
}

export interface CJShippingAddress {
  name: string; address1: string; address2?: string; city: string; province: string;
  country: string; countryCode: string; postalCode?: string; phone?: string; email: string; county?: string;
}
export interface CJOrderLine {
  orderItemId: string; cjProductId: string; cjVariantId: string; quantity: number;
  variantOptions: string; storeProductId: string; storeProductImg?: string; storeProductName: string;
}
export interface CJOrderInput { orderNumber: string; shipping: CJShippingAddress; products: CJOrderLine[] }
export interface CJOrderProgress {
  step: 'created' | 'cart_added' | 'confirmed' | 'parent_generated' | 'paid';
  cjOrderId?: string; shipmentOrderId?: string; payId?: string;
}
export interface CJOrderResult {
  mode: 'dry_run' | 'sandbox' | 'live'; status: 'dry_run' | 'sandbox_order' | 'ordered';
  orderNumber: string; cjOrderId?: string; shipmentOrderId?: string; payId?: string;
}
interface CJEnvelope<T> { code?: number | string; success?: boolean; result?: boolean; message?: string; requestId?: string; data?: T }
interface TokenPair { accessToken: string; refreshToken: string; accessTokenExpiryDate: string; refreshTokenExpiryDate: string }
interface EncryptedValue { version: 1; iv: string; ciphertext: string }
interface CreateOrderData { orderId?: string; shipmentOrderId?: string; orderStatus?: string; interceptOrderReasons?: {code?:number;message?:string}[] }
interface CartData { successCount?: number; addSuccessOrders?: string[]; interceptOrders?: unknown[] }
interface ConfirmData { successCount?: number; submitSuccess?: boolean; shipmentsId?: string; interceptOrders?: unknown[] }
interface ParentData { payId?: string; submitSuccess?: boolean; successOrders?: string[]; interceptOrders?: unknown[] }
export interface CJOrderDetail {
  orderId?: string; orderNum?: string; orderStatus?: string;
  trackNumber?: string | null; trackingUrl?: string | null; trackingProvider?: string | null; logisticName?: string | null;
}
export interface CJVariantStockRow {
  vid?: string; countryCode?: string; totalInventoryNum?: number; cjInventoryNum?: number; factoryInventoryNum?: number;
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
export function isCJDryRun(env: Pick<CJEnv, 'DRY_RUN'>): boolean {
  return (env.DRY_RUN ?? 'true').trim().toLowerCase() !== 'false';
}
function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}
function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}
async function aesKey(secret: string): Promise<CryptoKey> {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(secret));
  return crypto.subtle.importKey('raw', digest, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}
async function encryptTokens(tokens: TokenPair, secret: string): Promise<EncryptedValue> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await aesKey(secret);
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, key, encoder.encode(JSON.stringify(tokens)));
  return { version: 1, iv: toBase64(iv), ciphertext: toBase64(new Uint8Array(ciphertext)) };
}
async function decryptTokens(value: EncryptedValue, secret: string): Promise<TokenPair> {
  if (value.version !== 1) throw new Error('Unsupported CJ token cache version.');
  const key = await aesKey(secret);
  const clear = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromBase64(value.iv) }, key, fromBase64(value.ciphertext));
  return JSON.parse(new TextDecoder().decode(clear)) as TokenPair;
}
function expiry(value: string | undefined, defaultDays: number): string {
  const parsed = value ? Date.parse(value) : Number.NaN;
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : new Date(Date.now() + defaultDays * 86400000).toISOString();
}
function tokenPair(value: Partial<TokenPair>, previous?: TokenPair): TokenPair {
  if (!value.accessToken) throw new Error('CJ did not return an access token.');
  return {
    accessToken: value.accessToken,
    refreshToken: value.refreshToken || previous?.refreshToken || '',
    accessTokenExpiryDate: expiry(value.accessTokenExpiryDate, 14),
    refreshTokenExpiryDate: expiry(value.refreshTokenExpiryDate || previous?.refreshTokenExpiryDate, 170),
  };
}
async function saveTokens(env: CJEnv, tokens: TokenPair): Promise<void> {
  if (!env.CJ_TOKEN_ENCRYPTION_KEY) throw new Error('CJ_TOKEN_ENCRYPTION_KEY is required to encrypt cached CJ tokens.');
  const encrypted = await encryptTokens(tokens, env.CJ_TOKEN_ENCRYPTION_KEY);
  await env.DB.prepare("INSERT INTO settings (key,value_json,updated_at) VALUES (?,?,datetime('now')) ON CONFLICT(key) DO UPDATE SET value_json=excluded.value_json,updated_at=datetime('now')")
    .bind(TOKEN_CACHE_KEY, JSON.stringify(encrypted)).run();
}
async function loadTokens(env: CJEnv): Promise<TokenPair | null> {
  if (!env.CJ_TOKEN_ENCRYPTION_KEY) throw new Error('CJ_TOKEN_ENCRYPTION_KEY is required to encrypt cached CJ tokens.');
  const row = await env.DB.prepare('SELECT value_json FROM settings WHERE key=?').bind(TOKEN_CACHE_KEY).first<{value_json:string}>();
  if (!row) return null;
  try { return await decryptTokens(JSON.parse(row.value_json) as EncryptedValue, env.CJ_TOKEN_ENCRYPTION_KEY); }
  catch { throw new Error('Unable to decrypt cached CJ tokens. Check the CJ_TOKEN_ENCRYPTION_KEY secret.'); }
}
function failed(response: Response, envelope: CJEnvelope<unknown>): boolean {
  return !response.ok || envelope.success === false || envelope.result === false ||
    (envelope.code !== undefined && Number(envelope.code) !== 200);
}
function isAuthError(response: Response, envelope: CJEnvelope<unknown>): boolean {
  return response.status === 401 || Number(envelope.code) === 1601000 ||
    /authentication failed|access.?token|token.*expired/i.test(envelope.message || '');
}
function apiError(path: string, response: Response, envelope: CJEnvelope<unknown>): Error {
  const message = (envelope.message || 'CJ API request failed').slice(0, 220);
  return new Error('CJ ' + path + ' failed with HTTP ' + response.status + ': ' + message +
    (envelope.requestId ? ' (request ' + envelope.requestId + ')' : ''));
}
async function readEnvelope<T>(response: Response, path: string): Promise<CJEnvelope<T>> {
  try { return await response.json() as CJEnvelope<T>; }
  catch { throw new Error('CJ ' + path + ' returned a non-JSON response.'); }
}
async function postAuth<T>(path: string, body: unknown): Promise<T> {
  await delay(1050);
  const response = await fetch(CJ_API_BASE + path, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  const envelope = await readEnvelope<T>(response, path);
  if (failed(response, envelope)) throw apiError(path, response, envelope);
  return envelope.data as T;
}
async function obtainTokens(apiKey: string): Promise<TokenPair> {
  const data = await postAuth<Partial<TokenPair>>('/authentication/getAccessToken', { apiKey: apiKey });
  return tokenPair(data);
}
async function refreshTokens(old: TokenPair): Promise<TokenPair> {
  const data = await postAuth<Partial<TokenPair>>('/authentication/refreshAccessToken', { refreshToken: old.refreshToken });
  return tokenPair(data, old);
}
async function getToken(env: CJEnv, forceRefresh = false): Promise<string> {
  if (!env.DB) throw new Error('CJ API requires the Cloudflare D1 DB binding.');
  const cached = await loadTokens(env);
  const now = Date.now();
  if (!forceRefresh && cached?.accessToken && Date.parse(cached.accessTokenExpiryDate) > now + 60000) return cached.accessToken;
  if (cached?.refreshToken && Date.parse(cached.refreshTokenExpiryDate) > now + 60000) {
    try {
      const fresh = await refreshTokens(cached);
      await saveTokens(env, fresh);
      return fresh.accessToken;
    } catch (error) {
      if (!env.CJ_API_KEY) throw error;
    }
  }
  if (!env.CJ_API_KEY) throw new Error('CJ_API_KEY is not configured in Cloudflare secrets.');
  const fresh = await obtainTokens(env.CJ_API_KEY);
  await saveTokens(env, fresh);
  return fresh.accessToken;
}
async function request<T>(env: CJEnv, path: string, init: RequestInit = {}): Promise<T> {
  const send = async (accessToken: string) => {
    await delay(1050); // CJ documents an account-level limit of one API call per second.
    const headers = new Headers(init.headers);
    headers.set('CJ-Access-Token', accessToken);
    if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
    const response = await fetch(CJ_API_BASE + path, { ...init, headers: headers });
    const envelope = await readEnvelope<T>(response, path);
    return { response: response, envelope: envelope };
  };
  let result = await send(await getToken(env));
  if (failed(result.response, result.envelope) && isAuthError(result.response, result.envelope)) {
    result = await send(await getToken(env, true));
  }
  if (failed(result.response, result.envelope)) throw apiError(path, result.response, result.envelope);
  return result.envelope.data as T;
}

export function buildCJCreateOrderPayload(input: CJOrderInput, logisticName: string, sandbox: boolean, fromCountryCode = 'CN'): Record<string, unknown> {
  if (!input.orderNumber.trim() || input.products.length === 0) throw new Error('An order number and at least one product are required.');
  const address = input.shipping;
  if (!address.name.trim() || !address.address1.trim() || !address.city.trim() || !address.province.trim() ||
      !address.country.trim() || !/^[A-Z]{2}$/i.test(address.countryCode)) {
    throw new Error('Recipient name, street, city, province/state, country, and two-letter country code are required.');
  }
  if (!logisticName.trim()) throw new Error('Choose a CJ logistics method confirmed for the product and destination.');
  for (const line of input.products) {
    if (!line.cjProductId.trim() || !line.cjVariantId.trim()) throw new Error('Verified CJ product and variant IDs are required.');
    if (!Number.isSafeInteger(line.quantity) || line.quantity < 1 || line.quantity > 10) throw new Error('CJ item quantity must be between 1 and 10.');
  }
  return {
    orderNumber: input.orderNumber,
    shippingZip: address.postalCode || '',
    shippingCountryCode: address.countryCode.toUpperCase(),
    shippingCountry: address.country,
    shippingProvince: address.province,
    shippingCity: address.city,
    shippingCounty: address.county || '',
    shippingPhone: address.phone || '',
    shippingCustomerName: address.name,
    shippingAddress: address.address1,
    shippingAddress2: address.address2 || '',
    email: address.email,
    remark: 'Davinova customer order ' + input.orderNumber,
    logisticName: logisticName,
    fromCountryCode: fromCountryCode.toUpperCase(),
    platform: 'api',
    shopLogisticsType: 2,
    orderFlow: 1,
    isSandbox: sandbox ? 1 : 0,
    products: input.products.map((line) => ({
      vid: line.cjVariantId,
      quantity: line.quantity,
      variantOptions: line.variantOptions,
      storeLineItemId: line.orderItemId,
    })),
  };
}

export async function createCJOrder(
  env: CJEnv, input: CJOrderInput, ownerApproved: boolean,
  onProgress?: (progress: CJOrderProgress) => Promise<void>,
): Promise<CJOrderResult> {
  if (!ownerApproved) throw new Error('Owner approval is required before any CJ supplier purchase.');
  if (input.products.length === 0 || input.products.some((line) => !line.cjProductId || !line.cjVariantId)) {
    throw new Error('Verified CJ product and variant mappings are required before ordering.');
  }
  if (isCJDryRun(env)) return { mode: 'dry_run', status: 'dry_run', orderNumber: input.orderNumber };

  const sandbox = (env.CJ_SANDBOX ?? 'true').trim().toLowerCase() !== 'false';
  if (!sandbox && (env.CJ_LIVE_ORDERS_ENABLED ?? 'false').trim().toLowerCase() !== 'true') {
    throw new Error('Live supplier purchases are disabled. Enable CJ_LIVE_ORDERS_ENABLED only after sandbox and end-to-end tests.');
  }
  // Free express delivery: CJ_LOGISTIC_NAME can pin one line, otherwise pick the fast line quoted for these exact items and country.
  let logisticName = env.CJ_LOGISTIC_NAME?.trim() || '';
  if (!logisticName) {
    const quotes = await calculateCJOrderFreight(env, input.products, input.shipping.countryCode, env.CJ_FROM_COUNTRY_CODE || 'CN');
    logisticName = pickFastLine(quotes)?.name ?? '';
    if (!logisticName) throw new Error('CJ quoted no usable shipping line for ' + input.shipping.countryCode.toUpperCase() + '; choose one in CJ before ordering.');
  }
  const payload = buildCJCreateOrderPayload(input, logisticName, sandbox, env.CJ_FROM_COUNTRY_CODE || 'CN');

  // Every provider ID is persisted by onProgress before proceeding; partial failures require manual reconciliation.
  const created = await request<CreateOrderData>(env, '/shopping/order/createOrderV3', { method: 'POST', body: JSON.stringify(payload) });
  if (!created?.orderId) throw new Error('CJ did not return orderId; inspect your CJ order list before retrying.');
  await onProgress?.({ step: 'created', cjOrderId: created.orderId, shipmentOrderId: created.shipmentOrderId });

  const cart = await request<CartData>(env, '/shopping/order/addCart', {
    method: 'POST', body: JSON.stringify({ cjOrderIdList: [created.orderId] }),
  });
  if ((cart.successCount ?? 0) < 1 || (cart.interceptOrders?.length ?? 0) > 0) throw new Error('CJ add-to-cart was not fully successful; reconcile before retrying.');
  await onProgress?.({ step: 'cart_added', cjOrderId: created.orderId, shipmentOrderId: created.shipmentOrderId });

  const confirmed = await request<ConfirmData>(env, '/shopping/order/addCartConfirm', {
    method: 'POST', body: JSON.stringify({ cjOrderIdList: [created.orderId] }),
  });
  if (confirmed.submitSuccess === false || (confirmed.interceptOrders?.length ?? 0) > 0) throw new Error('CJ cart confirmation failed or was intercepted.');
  const shipmentOrderId = confirmed.shipmentsId || created.shipmentOrderId || '';
  if (!shipmentOrderId) throw new Error('CJ confirmed the cart but returned no shipmentOrderId; manually reconcile the CJ account.');
  await onProgress?.({ step: 'confirmed', cjOrderId: created.orderId, shipmentOrderId: shipmentOrderId });

  const parent = await request<ParentData>(env, '/shopping/order/saveGenerateParentOrder', {
    method: 'POST', body: JSON.stringify({ shipmentOrderId: shipmentOrderId }),
  });
  if (parent.submitSuccess === false || (parent.interceptOrders?.length ?? 0) > 0 || !parent.payId) {
    throw new Error('CJ parent order/payment ID could not be prepared; manually reconcile.');
  }
  await onProgress?.({ step: 'parent_generated', cjOrderId: created.orderId, shipmentOrderId: shipmentOrderId, payId: parent.payId });

  await request<unknown>(env, '/shopping/pay/payBalanceV2', {
    method: 'POST', body: JSON.stringify({ shipmentOrderId: shipmentOrderId, payId: parent.payId }),
  });
  await onProgress?.({ step: 'paid', cjOrderId: created.orderId, shipmentOrderId: shipmentOrderId, payId: parent.payId });

  return {
    mode: sandbox ? 'sandbox' : 'live',
    status: sandbox ? 'sandbox_order' : 'ordered',
    orderNumber: input.orderNumber,
    cjOrderId: created.orderId,
    shipmentOrderId: shipmentOrderId,
    payId: parent.payId,
  };
}

export async function getCJOrderDetails(env: CJEnv, orderId: string): Promise<CJOrderDetail> {
  const queryString = new URLSearchParams({ orderId: orderId }).toString();
  return request<CJOrderDetail>(env, '/shopping/order/getOrderDetail?' + queryString);
}

export async function queryCJVariantStock(env: CJEnv, variantId: string): Promise<CJVariantStockRow[]> {
  const data = await request<unknown>(env, '/product/stock/queryByVid?' + new URLSearchParams({ vid: variantId }).toString());
  if (Array.isArray(data)) return data as CJVariantStockRow[];
  if (data && typeof data === 'object') {
    const record = data as { list?: CJVariantStockRow[]; stockList?: CJVariantStockRow[]; inventoryList?: CJVariantStockRow[] };
    if (Array.isArray(record.stockList)) return record.stockList;
    if (Array.isArray(record.inventoryList)) return record.inventoryList;
    if (Array.isArray(record.list)) return record.list;
    if ('vid' in record) return [record as CJVariantStockRow];
  }
  return [];
}


export interface CJCatalogSearchProduct {
  id: string;
  name: string;
  sku: string;
  imageUrl: string;
  sellPriceUsd: number | null;
  minPriceUsd: number | null;
  discountPriceUsd: number | null;
  listedCount: number | null;
  inventoryTotal: number | null;
  verifiedInventory: number | null;
  category: string;
  freeShippingFlag: boolean | null;
  saleStatus: string;
  deliveryCycle: string;
}

interface CJListV2Product {
  id?: string;
  nameEn?: string;
  sku?: string;
  spu?: string;
  bigImage?: string;
  sellPrice?: string | number;
  nowPrice?: string | number | null;
  discountPrice?: string | number | null;
  listedNum?: number;
  warehouseInventoryNum?: number;
  totalVerifiedInventory?: number;
  categoryId?: string;
  oneCategoryName?: string;
  twoCategoryName?: string;
  threeCategoryName?: string;
  addMarkStatus?: number;
  saleStatus?: string | number;
  deliveryCycle?: string;
}

interface CJListV2Block { productList?: CJListV2Product[] }
interface CJListV2Response {
  pageSize?: number;
  pageNumber?: number;
  totalRecords?: number;
  totalPages?: number;
  content?: CJListV2Block[];
}
function numericValue(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function searchCJProducts(
  env: CJEnv,
  keyword: string,
  page = 1,
  size = 10,
  minPrice = 0,
): Promise<{ page: number; pageSize: number; totalRecords: number; items: CJCatalogSearchProduct[] }> {
  const cleanKeyword = keyword.trim();
  if (cleanKeyword.length < 2 || cleanKeyword.length > 100) {
    throw new Error('Search keyword must be between 2 and 100 characters.');
  }
  const safePage = Number.isInteger(page) ? Math.max(1, Math.min(1000, page)) : 1;
  const safeSize = Number.isInteger(size) ? Math.max(1, Math.min(10, size)) : 10;
  const params = new URLSearchParams({
    keyWord: cleanKeyword,
    page: String(safePage),
    size: String(safeSize),
    features: 'enable_category',
  });
  if (minPrice > 0) params.set('startSellPrice', String(minPrice));
  const data = await request<CJListV2Response>(env, '/product/listV2?' + params.toString());
  const products = (data.content ?? []).flatMap((block) => block.productList ?? []);
  const items = products.map((product) => ({
    id: product.id ?? '',
    name: product.nameEn ?? 'Unnamed CJ product',
    sku: product.spu ?? product.sku ?? '',
    imageUrl: product.bigImage ?? '',
    sellPriceUsd: numericValue(product.sellPrice),
    // sellPrice is a range like "3.20 -- 5.80" for products with several variants; keep the cheapest.
    minPriceUsd: numericValue(String(product.sellPrice ?? '').split('--')[0].trim()),
    discountPriceUsd: numericValue(product.nowPrice ?? product.discountPrice),
    listedCount: numericValue(product.listedNum),
    inventoryTotal: numericValue(product.warehouseInventoryNum),
    verifiedInventory: numericValue(product.totalVerifiedInventory),
    category: [product.oneCategoryName, product.twoCategoryName, product.threeCategoryName].filter(Boolean).join(' / '),
    freeShippingFlag: typeof product.addMarkStatus === 'number' ? product.addMarkStatus === 1 : null,
    saleStatus: String(product.saleStatus ?? ''),
    deliveryCycle: product.deliveryCycle ?? '',
  })).filter((product) => Boolean(product.id));
  return { page: safePage, pageSize: safeSize, totalRecords: data.totalRecords ?? items.length, items };
}

interface CJProductInventoryDetail {
  countryCode?: string;
  totalInventory?: number;
  cjInventory?: number;
  factoryInventory?: number;
  verifiedWarehouse?: number;
}
interface CJProductVariantDetail {
  vid?: string;
  variantNameEn?: string;
  variantSku?: string;
  variantKey?: string;
  variantImage?: string;
  variantSellPrice?: number | string;
  inventories?: CJProductInventoryDetail[];
}
interface CJProductDetailRecord {
  pid?: string;
  productNameEn?: string;
  productSku?: string;
  bigImage?: string;
  productImageSet?: string[];
  categoryName?: string;
  sellPrice?: number | string;
  description?: string;
  status?: string;
  variants?: CJProductVariantDetail[];
}
export async function getCJProductDetail(env: CJEnv, productId: string) {
  const pid = productId.trim();
  if (!pid || pid.length > 200 || !/^[a-zA-Z0-9-]+$/.test(pid)) {
    throw new Error('A valid CJ product ID is required.');
  }
  const params = new URLSearchParams({ pid });
  const data = await request<CJProductDetailRecord>(env, '/product/query?' + params.toString());
  return {
    id: data.pid ?? pid,
    name: data.productNameEn ?? 'Unnamed CJ product',
    sku: data.productSku ?? '',
    imageUrl: data.bigImage ?? '',
    imageUrls: Array.isArray(data.productImageSet) ? data.productImageSet.slice(0, 8) : [],
    category: data.categoryName ?? '',
    sellPriceUsd: numericValue(data.sellPrice),
    description: (data.description ?? '').slice(0, 1600),
    saleStatus: String(data.status ?? ''),
    variants: (data.variants ?? []).slice(0, 100).map((variant) => ({
      id: variant.vid ?? '',
      name: variant.variantNameEn ?? '',
      sku: variant.variantSku ?? '',
      options: variant.variantKey ?? '',
      imageUrl: variant.variantImage ?? '',
      sellPriceUsd: numericValue(variant.variantSellPrice),
      inventory: (variant.inventories ?? []).map((stock) => ({
        countryCode: stock.countryCode ?? '',
        total: numericValue(stock.totalInventory),
        cjStock: numericValue(stock.cjInventory),
        factoryStock: numericValue(stock.factoryInventory),
        verifiedWarehouse: stock.verifiedWarehouse === 1,
      })).slice(0, 20),
    })),
  };
}

/**
 * Straight sizes (XS-XL) and extended/curve sizes (1X/1XL through 6X/6XL) are
 * distinct labels, not synonyms of each other. Keep this in sync with
 * normaliseSize in src/lib/woocommerce.ts.
 */
const CJ_SIZE_ALIASES: Record<string, string> = {
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

/**
 * Men's formalwear uses plain letter sizing (S/M/L/XL/XXL) rather than the
 * women's XL/1XL/2XL curve scheme, so "XXL" means a distinct, larger size
 * than women's "2XL" rather than being the same label. Keep this in sync
 * with MensSize in src/types/product.ts.
 */
const CJ_MENS_SIZE_ALIASES: Record<string, string> = {
  S: 'S', SMALL: 'S',
  M: 'M', MEDIUM: 'M', MED: 'M',
  L: 'L', LARGE: 'L',
  XL: 'XL', XLARGE: 'XL',
  XXL: 'XXL', '2XL': 'XXL',
};

function normalizeCJSizeToken(token: string, department: 'women' | 'men' = 'women'): string | undefined {
  const key = token.trim().toUpperCase().replace(/[\s_-]/g, '');
  return department === 'men' ? CJ_MENS_SIZE_ALIASES[key] : CJ_SIZE_ALIASES[key];
}

export interface ParsedCJVariantOption {
  size: string;
  color: string;
}

/**
 * CJ returns a single combined option string per variant (its variantKey,
 * e.g. "Black / 2XL", "2XL - Black", or just "2XL"), with no fixed separator
 * or field order across products. Splitting it into separate size and colour
 * values lets a verified variant's stored size match the exact label the
 * storefront's size selector sends at checkout; storing the raw combined
 * string (the previous behaviour) means an exact-match lookup can never
 * succeed even after a human verifies and activates the variant.
 *
 * This only splits when the tokenized label contains exactly one recognized
 * size token: zero matches (no size present) or more than one (ambiguous)
 * both fall back to keeping the original string as-is for manual review,
 * rather than guessing which part is the size.
 */
export function parseCJVariantOption(raw: string, department: 'women' | 'men' = 'women'): ParsedCJVariantOption {
  const trimmed = raw.trim();
  const fallback: ParsedCJVariantOption = { size: trimmed || 'Not verified', color: 'Not verified' };
  if (!trimmed) return fallback;

  const tokens = trimmed.split(/[\s/,;_-]+/).map((token) => token.trim()).filter(Boolean);
  if (tokens.length === 0) return fallback;

  const sizeMatches = tokens
    .map((token, index) => ({ index, size: normalizeCJSizeToken(token, department) }))
    .filter((entry): entry is { index: number; size: string } => Boolean(entry.size));

  if (sizeMatches.length !== 1) return fallback;

  const { index: sizeIndex, size } = sizeMatches[0];
  const color = tokens.filter((_, index) => index !== sizeIndex).join(' ');
  return { size, color: color || 'Not verified' };
}

export interface CJFreightOption { name: string; priceUsd: number; days: string }

/** Shipping quotes for one unit of a variant, cheapest first. */
export async function calculateCJFreight(env: CJEnv, variantId: string, endCountryCode = 'US', startCountryCode = 'CN'): Promise<CJFreightOption[]> {
  const data = await request<{ logisticName?: string; logisticPrice?: number | string; logisticAging?: string }[]>(env, '/logistic/freightCalculate', {
    method: 'POST',
    body: JSON.stringify({ startCountryCode, endCountryCode, products: [{ quantity: 1, vid: variantId }] }),
  });
  return (Array.isArray(data) ? data : [])
    .map((row) => ({ name: row.logisticName ?? '', priceUsd: numericValue(row.logisticPrice) ?? Infinity, days: row.logisticAging ?? '' }))
    .filter((row) => Number.isFinite(row.priceUsd))
    .sort((a, b) => a.priceUsd - b.priceUsd);
}

/** Shipping quotes for a whole order (all lines together), cheapest first. */
export async function calculateCJOrderFreight(env: CJEnv, lines: { cjVariantId: string; quantity: number }[], endCountryCode: string, startCountryCode = 'CN'): Promise<CJFreightOption[]> {
  const data = await request<{ logisticName?: string; logisticPrice?: number | string; logisticAging?: string }[]>(env, '/logistic/freightCalculate', {
    method: 'POST',
    body: JSON.stringify({ startCountryCode, endCountryCode: endCountryCode.toUpperCase(), products: lines.map((line) => ({ quantity: line.quantity, vid: line.cjVariantId })) }),
  });
  return (Array.isArray(data) ? data : [])
    .map((row) => ({ name: row.logisticName ?? '', priceUsd: numericValue(row.logisticPrice) ?? Infinity, days: row.logisticAging ?? '' }))
    .filter((row) => Number.isFinite(row.priceUsd))
    .sort((a, b) => a.priceUsd - b.priceUsd);
}

// Lines we never use for clothing: special cargo, sea freight, remote-area surcharges, pricey couriers,
// and DDU postal lines where the customer could be billed import duties.
const SKIP_LINE = /electric|liquid|over ?length|oversize|sea|remote|dhl|fedex|ups|tnt|ems|eub|postal/i;

/** Longest promised transit in days ("4-7" gives 7), or Infinity when CJ gives none. */
export function maxTransitDays(days: string): number {
  const numbers = (days.match(/\d+/g) ?? []).map(Number);
  return numbers.length ? Math.max(...numbers) : Infinity;
}

/** Cheapest everyday line that arrives within maxDays; if none does, the fastest everyday line. */
export function pickFastLine(options: CJFreightOption[], maxDays = 7): CJFreightOption | null {
  const usable = options.filter((option) => option.name && !SKIP_LINE.test(option.name));
  const fast = usable.filter((option) => maxTransitDays(option.days) <= maxDays).sort((a, b) => a.priceUsd - b.priceUsd);
  if (fast[0]) return fast[0];
  return [...usable].sort((a, b) => maxTransitDays(a.days) - maxTransitDays(b.days) || a.priceUsd - b.priceUsd)[0] ?? null;
}

/** Total stock per variant (CJ warehouse + factory), keyed by variant ID. */
export async function getCJProductStock(env: CJEnv, productId: string): Promise<Record<string, number>> {
  const data = await request<{ variantInventories?: { vid?: string; inventory?: { totalInventory?: number | string }[] }[] }>(env, '/product/stock/getInventoryByPid?' + new URLSearchParams({ pid: productId }).toString());
  const stock: Record<string, number> = {};
  for (const row of data?.variantInventories ?? []) {
    if (!row.vid) continue;
    stock[row.vid] = (row.inventory ?? []).reduce((sum, place) => sum + (numericValue(place.totalInventory) ?? 0), 0);
  }
  return stock;
}
