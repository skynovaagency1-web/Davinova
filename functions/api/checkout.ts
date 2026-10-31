import { queryCJVariantStock } from '../../server/cj';
import { currentCustomer } from '../../server/accounts';
import type { CJEnv, CJVariantStockRow } from '../../server/cj';
import { loadDiscountCode } from '../../server/offers';
import { FREE_GIFT, computeOffer, type Offer } from '../../src/lib/offers';
import { giftCardUse } from '../../src/lib/giftCards';
import { loadGiftCard } from '../../server/giftCards';

type Env = CJEnv & {
  STRIPE_SECRET_KEY?: string;
  STRIPE_MODE?: string;
  STRIPE_SHIPPING_COUNTRIES?: string;
  STRIPE_SHIPPING_FEE_CENTS?: string;
  STRIPE_SHIPPING_LABEL?: string;
  STRIPE_AUTOMATIC_TAX?: string;
  SITE_URL?: string;
};

interface CartLineInput {
  productId: string;
  size: string;
  quantity: number;
}

interface CheckoutProduct {
  product_id: string;
  product_title: string;
  product_slug: string;
  price_cents: number;
  cost_cents: number;
  currency: string;
  supplier: string;
  supplier_verified: number;
  product_active: number;
  catalog_source: string;
  cj_product_id: string | null;
  variant_id: string;
  size: string;
  color: string;
  sku: string | null;
  cj_variant_id: string | null;
  variant_active: number;
  available_stock: number | null;
  image_url: string | null;
}

interface StripeCheckoutSession {
  id?: string;
  url?: string | null;
  currency?: string | null;
  amount_subtotal?: number | null;
  amount_total?: number | null;
  total_details?: { amount_shipping?: number | null; amount_tax?: number | null; amount_discount?: number | null } | null;
  error?: { message?: string };
}

function reply(data: unknown, status = 200): Response {
  return Response.json(data, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
    },
  });
}

export function stripeConfiguration(env: Env): { mode: 'test' | 'live'; secret: string } | Response {
  const secret = env.STRIPE_SECRET_KEY || '';
  const mode = env.STRIPE_MODE;
  if (mode !== 'test' && mode !== 'live') {
    return reply({ error: 'Stripe checkout is not configured. Set STRIPE_MODE to test or live.' }, 503);
  }
  // Standard (sk_) or restricted (rk_) keys; a restricted key needs Checkout Sessions and Coupons write access.
  if (!secret || (mode === 'test' && !/^[sr]k_test_/.test(secret)) || (mode === 'live' && !/^[sr]k_live_/.test(secret))) {
    return reply({ error: 'Stripe key does not match the configured payment mode.' }, 503);
  }
  // Live customer payments require deliberate enablement of the tested CJ order path.
  if (mode === 'live' && (
    (env.CJ_LIVE_ORDERS_ENABLED || '').toLowerCase() !== 'true' ||
    (env.CJ_SANDBOX ?? 'true').toLowerCase() !== 'false' ||
    (env.DRY_RUN ?? 'true').toLowerCase() !== 'false'
  )) {
    return reply({ error: 'Live checkout is disabled until CJ live orders are deliberately enabled after end-to-end testing.' }, 503);
  }
  return { mode, secret };
}

export function checkoutSettings(env: Env): { site: string; countries: string[]; shippingFeeCents: number; shippingLabel: string; autoTax: boolean } | Response {
  let site: URL;
  try {
    site = new URL(env.SITE_URL || '');
  } catch {
    return reply({ error: 'SITE_URL must be configured before checkout can open.' }, 503);
  }

  const mode = env.STRIPE_MODE;
  const isLocal = ['localhost', '127.0.0.1'].includes(site.hostname);
  if (site.protocol !== 'https:' && !(mode === 'test' && site.protocol === 'http:' && isLocal)) {
    return reply({ error: 'SITE_URL must use HTTPS (HTTP is only allowed for local Stripe tests).' }, 503);
  }

  const countries = (env.STRIPE_SHIPPING_COUNTRIES || '')
    .split(',')
    .map((value) => value.trim().toUpperCase())
    .filter(Boolean);

  if (countries.length === 0 || countries.some((code) => !/^[A-Z]{2}$/.test(code))) {
    return reply({ error: 'Configure STRIPE_SHIPPING_COUNTRIES with the destinations you actually serve.' }, 503);
  }

  if (new Set(countries).size !== countries.length || countries.length > 100) {
    return reply({ error: 'STRIPE_SHIPPING_COUNTRIES must contain unique country codes.' }, 503);
  }

  if (env.STRIPE_SHIPPING_FEE_CENTS === undefined || env.STRIPE_SHIPPING_FEE_CENTS.trim() === '') {
    return reply({ error: 'Configure STRIPE_SHIPPING_FEE_CENTS before accepting payments.' }, 503);
  }

  const shippingFeeCents = Number(env.STRIPE_SHIPPING_FEE_CENTS);
  if (!Number.isSafeInteger(shippingFeeCents) || shippingFeeCents < 0) {
    return reply({ error: 'STRIPE_SHIPPING_FEE_CENTS must be a non-negative integer number of cents.' }, 503);
  }

  if (env.STRIPE_AUTOMATIC_TAX === 'true' && mode !== 'test' && mode !== 'live') {
    return reply({ error: 'Invalid Stripe Tax configuration.' }, 503);
  }

  return {
    site: site.origin,
    countries,
    shippingFeeCents,
    shippingLabel: (env.STRIPE_SHIPPING_LABEL || 'Standard delivery').slice(0, 100),
    autoTax: env.STRIPE_AUTOMATIC_TAX === 'true',
  };
}

export function resolveCheckoutReturnOrigin(requestUrl: string, canonicalSite: string, mode: 'test' | 'live'): string {
  const requested = new URL(requestUrl);
  const canonical = new URL(canonicalSite);
  const baseHost = canonical.hostname.startsWith('www.') ? canonical.hostname.slice(4) : canonical.hostname;
  const allowedHttpsOrigins = new Set([
    `https://${baseHost}`,
    `https://www.${baseHost}`,
    `https://curvy.${baseHost}`,
  ]);

  if (requested.protocol === 'https:' && allowedHttpsOrigins.has(requested.origin)) {
    return requested.origin;
  }
  if (mode === 'test' && requested.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(requested.hostname)) {
    return requested.origin;
  }
  return canonical.origin;
}

function normalizeCart(value: unknown): CartLineInput[] | null {
  if (!Array.isArray(value) || value.length < 1 || value.length > 5) return null;
  const result: CartLineInput[] = [];
  const seen = new Set<string>();

  for (const item of value) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
    const row = item as Record<string, unknown>;
    if (typeof row.productId !== 'string' || !row.productId.trim() || row.productId.length > 120) return null;
    if (typeof row.size !== 'string' || !row.size.trim() || row.size.length > 40) return null;
    if (typeof row.quantity !== 'number' || !Number.isSafeInteger(row.quantity) || row.quantity < 1 || row.quantity > 10) return null;

    const key = `${row.productId.trim()}::${row.size.trim().toLowerCase()}`;
    if (seen.has(key)) return null;
    seen.add(key);
    result.push({ productId: row.productId.trim(), size: row.size.trim(), quantity: Number(row.quantity) });
  }

  return result;
}

function availableForVariant(rows: CJVariantStockRow[]): number {
  return rows.reduce((total, row) => {
    const value = Number(row.totalInventoryNum ?? row.cjInventoryNum ?? 0);
    return total + (Number.isFinite(value) && value > 0 ? value : 0);
  }, 0);
}

async function loadApprovedProduct(env: Env, item: CartLineInput): Promise<CheckoutProduct> {
  const row = await env.DB.prepare(`
    SELECT p.id AS product_id, p.title AS product_title, p.slug AS product_slug,
      p.price_cents, p.cost_cents, p.currency, p.supplier, p.supplier_verified,
      p.active AS product_active, p.catalog_source, p.cj_product_id,
      v.id AS variant_id, v.size, v.color, v.sku, v.cj_sku, v.cj_variant_id,
      v.active AS variant_active, v.available_stock,
      (SELECT i.url FROM product_images i WHERE i.product_id=p.id
       ORDER BY i.is_primary DESC, i.position LIMIT 1) AS image_url
    FROM products p
    JOIN product_variants v ON v.product_id=p.id
    WHERE p.id=? AND v.size=? COLLATE NOCASE
    -- Older, switched-off variants can share a label with the one on sale; always pick the one on sale.
    ORDER BY v.active DESC, COALESCE(v.available_stock, 0) DESC
    LIMIT 1
  `).bind(item.productId, item.size).first<CheckoutProduct>();

  if (
    !row ||
    row.product_active !== 1 ||
    row.variant_active !== 1 ||
    row.supplier !== 'cj' ||
    row.catalog_source !== 'cj' ||
    row.supplier_verified !== 1 ||
    !row.cj_product_id ||
    !row.cj_variant_id ||
    !Number.isSafeInteger(row.price_cents) ||
    row.price_cents <= 0 ||
    !Number.isSafeInteger(row.cost_cents) ||
    row.cost_cents <= 0 ||
    !row.currency ||
    !/^[A-Z]{3}$/i.test(row.currency)
  ) {
    throw new Error('A product or size in your bag is not verified for purchase yet.');
  }
  return row;
}

async function createStripeSession(
  secret: string,
  site: string,
  countries: string[],
  shippingFeeCents: number,
  shippingLabel: string,
  autoTax: boolean,
  orderId: string,
  orderNumber: string,
  products: Array<{ product: CheckoutProduct; quantity: number }>,
  customerEmail = '',
  couponId = '',
): Promise<StripeCheckoutSession> {
  const currency = products[0].product.currency.toLowerCase();
  const form = new URLSearchParams();

  form.set('mode', 'payment');
  form.set('locale', 'auto');
  form.set('client_reference_id', orderId);
  // Signed-in customers get their account email filled in, so the order lands in their account.
  if (customerEmail) form.set('customer_email', customerEmail);
  form.set('success_url', `${site}/order-confirmation?session_id={CHECKOUT_SESSION_ID}`);
  form.set('cancel_url', `${site}/cart?checkout=cancelled`);
  form.set('phone_number_collection[enabled]', 'true');
  form.set('billing_address_collection', 'required');

  countries.forEach((country, index) => form.set(`shipping_address_collection[allowed_countries][${index}]`, country));

  form.set('shipping_options[0][shipping_rate_data][type]', 'fixed_amount');
  form.set('shipping_options[0][shipping_rate_data][fixed_amount][amount]', String(shippingFeeCents));
  form.set('shipping_options[0][shipping_rate_data][fixed_amount][currency]', currency);
  form.set('shipping_options[0][shipping_rate_data][display_name]', shippingLabel);

  if (autoTax) form.set('automatic_tax[enabled]', 'true');
  if (couponId) form.set('discounts[0][coupon]', couponId);

  form.set('metadata[order_id]', orderId);
  form.set('metadata[order_number]', orderNumber);
  form.set('payment_intent_data[metadata][order_id]', orderId);
  form.set('payment_intent_data[metadata][order_number]', orderNumber);

  products.forEach(({ product, quantity }, index) => {
    form.set(`line_items[${index}][quantity]`, String(quantity));
    form.set(`line_items[${index}][price_data][currency]`, product.currency.toLowerCase());
    form.set(`line_items[${index}][price_data][unit_amount]`, String(product.price_cents));
    form.set(`line_items[${index}][price_data][product_data][name]`, product.product_title.slice(0, 200));
    form.set(`line_items[${index}][price_data][product_data][metadata][product_id]`, product.product_id);
    form.set(`line_items[${index}][price_data][product_data][metadata][variant_id]`, product.variant_id);
    form.set(`line_items[${index}][price_data][product_data][metadata][sku]`, product.cj_sku || product.sku || '');
    if (product.image_url?.startsWith('https://')) {
      form.set(`line_items[${index}][price_data][product_data][images][0]`, product.image_url);
    }
  });

  const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secret}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Idempotency-Key': `davinova-checkout-${orderId}`,
    },
    body: form.toString(),
  });

  const data = await response.json() as StripeCheckoutSession;
  if (!response.ok || !data.id || !data.url || !data.amount_total || !data.amount_subtotal) {
    throw new Error('Stripe could not create a Checkout Session.');
  }
  if (!data.url.startsWith('https://checkout.stripe.com/')) {
    throw new Error('Stripe returned an unexpected Checkout URL.');
  }
  return data;
}

/** A one-time Stripe coupon carrying the bundle or code saving computed on the server. */
async function createCoupon(secret: string, orderId: string, offer: Pick<Offer, 'discountCents' | 'label'>, currency: string): Promise<string> {
  const form = new URLSearchParams({
    amount_off: String(offer.discountCents),
    currency: currency.toLowerCase(),
    duration: 'once',
    max_redemptions: '1',
    name: offer.label.slice(0, 40),
  });
  const response = await fetch('https://api.stripe.com/v1/coupons', {
    method: 'POST',
    headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/x-www-form-urlencoded', 'Idempotency-Key': `davinova-coupon-${orderId}` },
    body: form.toString(),
  });
  const data = await response.json() as { id?: string };
  if (!response.ok || !data.id) throw new Error('Stripe could not create the discount.');
  return data.id;
}

/**
 * Creates an order from server-validated D1 data, not prices or CJ IDs supplied
 * by the browser. Customer funds are collected by Stripe-hosted Checkout.
 * Paid webhooks move orders to pending_approval; the existing owner approval
 * endpoint remains the only route allowed to start CJ supplier ordering.
 */
export async function onRequestPost({ request, env }: { request: Request; env: Env }): Promise<Response> {
  if (request.headers.get('Origin') && request.headers.get('Origin') !== new URL(request.url).origin) {
    return reply({ error: 'Cross-origin checkout requests are not allowed.' }, 403);
  }

  const stripe = stripeConfiguration(env);
  if (stripe instanceof Response) return stripe;
  const settings = checkoutSettings(env);
  if (settings instanceof Response) return settings;
  const returnSite = resolveCheckoutReturnOrigin(request.url, settings.site, stripe.mode);
  if (!env.DB) return reply({ error: 'Commerce database is not configured.' }, 503);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return reply({ error: 'Invalid JSON request.' }, 400);
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return reply({ error: 'A cart is required.' }, 400);
  }

  const items = normalizeCart((body as Record<string, unknown>).items);
  if (!items) return reply({ error: 'Your bag is invalid. Check item sizes and quantities, then try again.' }, 400);

  try {
    const prepared: Array<{ product: CheckoutProduct; quantity: number }> = [];
    for (const item of items) {
      const product = await loadApprovedProduct(env, item);
      prepared.push({ product, quantity: item.quantity });
    }

    const currencies = new Set(prepared.map((line) => line.product.currency.toLowerCase()));
    if (currencies.size !== 1) return reply({ error: 'Your bag contains different currencies and cannot be checked out together.' }, 409);
    const currency = prepared[0].product.currency.toUpperCase();
    if (!/^[A-Z]{3}$/.test(currency)) return reply({ error: 'Product currency is invalid.' }, 503);

    // Re-check each unique CJ variant before charging the customer. CJ enforces
    // an account-level API rate limit; the cart is capped at five distinct lines.
    const stockByVariant = new Map<string, number>();
    for (const line of prepared) {
      const variantId = line.product.cj_variant_id!;
      let available = stockByVariant.get(variantId);
      if (available === undefined) {
        const rows = await queryCJVariantStock(env, variantId);
        available = availableForVariant(rows);
        stockByVariant.set(variantId, available);
        await env.DB.prepare(
          "UPDATE product_variants SET available_stock=?,stock_checked_at=datetime('now') WHERE cj_variant_id=?",
        ).bind(available, variantId).run();
      }
      if (available < line.quantity) {
        return reply({ error: `The selected size of ${line.product.product_title} is not currently available in that quantity.` }, 409);
      }
    }

    const subtotalCents = prepared.reduce((sum, line) => sum + line.product.price_cents * line.quantity, 0);
    if (!Number.isSafeInteger(subtotalCents) || subtotalCents <= 0) {
      return reply({ error: 'The bag total is invalid.' }, 409);
    }

    const code = await loadDiscountCode(env.DB, (body as Record<string, unknown>).code).catch(() => null);
    const offer = computeOffer(subtotalCents, prepared.reduce((sum, line) => sum + line.quantity, 0), code);
    // The free gift ships with the order at no charge; if it is unavailable the order simply goes without it.
    let gift: CheckoutProduct | null = null;
    if (offer.giftEligible) {
      gift = await loadApprovedProduct(env, { productId: FREE_GIFT.productId, size: FREE_GIFT.size, quantity: 1 }).catch(() => null);
      if (gift && gift.currency.toUpperCase() !== currency) gift = null;
    }

    // A gift card pays on top of any offer; it is taken off the card once Stripe confirms payment.
    const giftCard = await loadGiftCard(env.DB, (body as Record<string, unknown>).giftCode).catch(() => null);
    const giftCents = giftCard && currency === 'USD' ? giftCardUse(giftCard.balanceCents, subtotalCents - offer.discountCents) : 0;
    const discountCents = offer.discountCents + giftCents;
    const discountLabel = [offer.label, giftCents ? `Gift card ${giftCard!.code}` : ''].filter(Boolean).join(' + ');

    const orderId = crypto.randomUUID();
    const orderNumber = `DV-${crypto.randomUUID().replaceAll('-', '').slice(0, 12).toUpperCase()}`;
    const provisionalTotal = subtotalCents + settings.shippingFeeCents - discountCents;
    const placeholderEmail = `pending+${orderId}@checkout.invalid`;

    const statements = [
      env.DB.prepare(`
        INSERT INTO orders
          (id, order_number, email, status, payment_provider, payment_status,
           subtotal_cents, shipping_cents, discount_cents, total_cents, currency,
           shipping_address_json, shipping_method)
        VALUES (?, ?, ?, 'pending_payment', 'stripe', 'unpaid', ?, ?, ?, ?, ?, '{}', 'standard')
      `).bind(orderId, orderNumber, placeholderEmail, subtotalCents, settings.shippingFeeCents, discountCents, provisionalTotal, currency),
      ...(giftCents ? [env.DB.prepare('INSERT INTO gift_card_uses (id, gift_card_id, order_id, amount_cents) VALUES (?, ?, ?, ?)').bind(crypto.randomUUID(), giftCard!.id, orderId, giftCents)] : []),
      ...[...prepared, ...(gift ? [{ product: gift, quantity: 1, free: true }] : [])].map(({ product, quantity, ...rest }) => env.DB.prepare(`
        INSERT INTO order_items
          (id, order_id, product_id, variant_id, cj_product_id, cj_variant_id,
           product_title, sku, size, color, quantity, unit_price_cents,
           unit_cost_cents, supplier, supplier_product_url)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'cj', ?)
      `).bind(
        crypto.randomUUID(), orderId, product.product_id, product.variant_id,
        product.cj_product_id, product.cj_variant_id, product.product_title,
        product.cj_sku || product.sku || null, product.size, product.color,
        quantity, 'free' in rest ? 0 : product.price_cents, product.cost_cents,
        `https://www.cjdropshipping.com/product/${product.cj_product_id}.html`,
      )),
      env.DB.prepare(
        "INSERT INTO order_events (id, order_id, event_type, to_status, message, metadata_json) VALUES (?, ?, 'stripe_checkout_created', 'pending_payment', 'Stripe Checkout session requested.', ?)",
      ).bind(crypto.randomUUID(), orderId, JSON.stringify({ itemCount: prepared.length, offer: offer.source, offerLabel: offer.label, discountCents: offer.discountCents, code: offer.source === 'code' ? code?.code : undefined, freeGift: Boolean(gift), giftCard: giftCents ? giftCard!.code : undefined, giftCents: giftCents || undefined })),
    ];

    await env.DB.batch(statements);

    let session: StripeCheckoutSession;
    try {
      const couponId = discountCents > 0 ? await createCoupon(stripe.secret, orderId, { discountCents, label: discountLabel }, currency) : '';
      session = await createStripeSession(
        stripe.secret, returnSite, settings.countries,
        settings.shippingFeeCents, settings.shippingLabel, settings.autoTax,
        orderId, orderNumber, prepared,
        (await currentCustomer(request, env.DB).catch(() => null))?.email ?? '',
        couponId,
      );
    } catch (error) {
      await env.DB.prepare(
        "UPDATE orders SET status='cancelled', payment_status='unpaid', updated_at=datetime('now') WHERE id=? AND status='pending_payment'",
      ).bind(orderId).run();
      console.error('Stripe Checkout creation failed:', error instanceof Error ? error.message : 'Unknown Stripe failure');
      return reply({ error: 'Secure checkout could not be created. No payment was taken; please try again later.' }, 502);
    }

    const actualCurrency = String(session.currency || currency).toUpperCase();
    const actualSubtotal = Number(session.amount_subtotal);
    const actualTotal = Number(session.amount_total);
    const actualShipping = Number(session.total_details?.amount_shipping ?? 0);
    const actualTax = Number(session.total_details?.amount_tax ?? 0);
    const actualDiscount = Number(session.total_details?.amount_discount ?? 0);

    if (
      actualCurrency !== currency ||
      !Number.isSafeInteger(actualSubtotal) ||
      !Number.isSafeInteger(actualTotal) ||
      actualSubtotal !== subtotalCents ||
      actualShipping !== settings.shippingFeeCents ||
      actualDiscount !== discountCents ||
      actualTotal !== actualSubtotal + actualShipping + actualTax - actualDiscount
    ) {
      // Expire a session that does not match our order snapshot before exposing it.
      await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(session.id!)}/expire`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${stripe.secret}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          'Idempotency-Key': `davinova-expire-${session.id}`,
        },
        body: '',
      });
      await env.DB.prepare(
        "UPDATE orders SET status='needs_attention', updated_at=datetime('now') WHERE id=?",
      ).bind(orderId).run();
      return reply({ error: 'Checkout totals did not match the approved order. The session was not returned.' }, 502);
    }

    await env.DB.prepare(`
      UPDATE orders
      SET payment_reference=?, subtotal_cents=?, shipping_cents=?, discount_cents=?,
          total_cents=?, currency=?, updated_at=datetime('now')
      WHERE id=? AND status='pending_payment'
    `).bind(
      session.id!, actualSubtotal, actualShipping, actualDiscount,
      actualTotal, actualCurrency, orderId,
    ).run();

    if (offer.source === 'code' && code) {
      await env.DB.prepare('UPDATE discount_codes SET uses_count=uses_count+1 WHERE code=?').bind(code.code).run();
    }

    return reply({ url: session.url, sessionId: session.id, orderNumber: orderNumber });
  } catch (error) {
    if (error instanceof Error && /not verified for purchase yet/.test(error.message)) {
      return reply({ error: error.message }, 409);
    }
    console.error('Checkout request failed:', error instanceof Error ? error.message : 'Unknown checkout failure');
    return reply({ error: 'Checkout is temporarily unavailable. No payment was taken.' }, 503);
  }
}
