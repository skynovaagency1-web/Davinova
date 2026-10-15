# Davinova WooCommerce connection

Davinova's visual storefront is a React app deployed separately from WordPress. WooCommerce becomes the source of truth for the catalogue and the native product/cart/checkout/payment flow.

## 1. Prepare WordPress and WooCommerce

1. Install and activate WooCommerce on the WordPress store.
2. Set the store currency, shipping zones, tax settings, store address, and product permalink structure in WooCommerce settings.
3. Configure at least one payment gateway inside WooCommerce (for example, Stripe or PayPal) and complete its test-mode checks before enabling live payments.
4. Import products in **WooCommerce → Products → Import**. The built-in importer accepts WooCommerce's documented column format; CJ CSV exports may need a column-mapping/conversion step first. Publish only after checking images, prices, stock, sizes, colours, and variable-product variants.
5. Test the public Store API in a browser: `https://YOUR-WORDPRESS-STORE/wp-json/wc/store/v1/products`. It should return a JSON array of published products.

## 2. Configure Davinova

Set these variables in the Cloudflare Pages project's build environment, then trigger a new deployment:

- `VITE_WOOCOMMERCE_URL=https://YOUR-WORDPRESS-STORE` (the WordPress site root; no trailing slash)
- `VITE_CURRENCY=EUR` if your WooCommerce store uses euros, or set the matching ISO currency code.

The public Store API is used only to read published products; no WooCommerce consumer key or secret is exposed in the browser. If WordPress is in a subdirectory, include that path in `VITE_WOOCOMMERCE_URL`.

## 3. Cross-origin access

Because the React storefront and WordPress store may use different origins, the WordPress host must allow the Davinova storefront origin to read the public WooCommerce Store API. Allow only the real storefront origin where possible, rather than opening authenticated/admin endpoints to arbitrary origins. If the browser reports a CORS error, configure the WordPress host or a vetted CORS plugin to allow the storefront origin for the public `GET /wp-json/wc/store/v1/products` endpoint.

## 4. Purchasing and payments

Product detail pages link to the matching native WooCommerce product page. The basket link and checkout link use WooCommerce's native pages so WooCommerce controls variable-product selection, stock checks, shipping, taxes, order creation, payment gateway processing, and receipts. This avoids using the local demo cart as if it were a live order system.

Before launch, test a complete order using each enabled payment gateway in test mode, confirm tax/shipping calculations, verify confirmation emails, and only then enable live payment credentials.
