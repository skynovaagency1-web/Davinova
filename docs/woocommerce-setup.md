# Connect Davinova to WooCommerce

This connection keeps the Davinova React storefront design while WooCommerce remains the source of truth for product pricing, purchase availability, cart, shipping, taxes, orders, and payment.

## Step 1 — Confirm the actual WooCommerce store

The WordPress/WooCommerce site must exist separately from the Davinova Pages storefront, and WooCommerce must be active.

Open this in a browser, replacing the example host with your actual WordPress store root:

`https://YOUR-WOOCOMMERCE-HOST/wp-json/wc/store/v1/products?per_page=1`

A working public Store API returns a JSON array. If it redirects to a login, shows a 404, or returns an error, finish the WooCommerce installation / permalink / Store API setup before proceeding. Do not send WordPress passwords or API secrets in chat.

## Step 2 — Set public build variables in Cloudflare Pages

In the Cloudflare dashboard, open **Workers & Pages → davinova → Settings → Build & deployments → Environment variables**. Add the variables for the production build and preview build as appropriate, then trigger a new deployment.

- `VITE_WOOCOMMERCE_URL`: the WordPress/WooCommerce site root, with no trailing slash, for example `https://shop.example.com`.
- `VITE_CURRENCY`: a fallback ISO currency code, e.g. `EUR`. WooCommerce's Store API currency is used when supplied.
- `VITE_WOOCOMMERCE_SHOP_PATH`: shop page path, default `/shop/`.
- `VITE_WOOCOMMERCE_CART_PATH`: basket path, default `/cart/`.
- `VITE_WOOCOMMERCE_CHECKOUT_PATH`: checkout path, default `/checkout/`.

These are public build variables, not secrets. Do not put WooCommerce REST API consumer keys or consumer secrets in any `VITE_*` value; this integration uses the public Store API to read products and the native WooCommerce pages for buying.

## Step 3 — Allow public catalogue reads

Davinova fetches published products from `/wp-json/wc/store/v1/products`. If DevTools shows a browser CORS error, configure the WordPress host or a trusted CORS plugin to allow the **exact deployed Davinova origin** to make public GET requests to the Store API. Do not open authenticated WordPress admin or order endpoints to public cross-origin access.

## Step 4 — Configure the native WooCommerce shop

Check that WordPress has the intended shop, cart, and checkout page slugs. Change the path variables above if you use a different path. Confirm shipping zones, France / destination coverage, tax settings, currency, product variations and stock. Configure at least one payment gateway in test mode and run a test order on the WooCommerce domain.

## Step 5 — Verify from Davinova

After Cloudflare has rebuilt the site with the public store root:

1. Open Davinova `/shop`; published WooCommerce products should replace the local CJ/D1 catalogue. The integration does not mix the two catalogues.
2. Open a product: the purchase action should go to that product's WooCommerce permalink so variable sizes/colours are chosen in the native store.
3. Use the Davinova bag and checkout links; they should open the WooCommerce cart and checkout pages.
4. Test an order with test payment credentials. Only enable live payment methods when taxes, shipping, stock, order emails, refunds and returns are correct.

## Important distinction: CJ sourcing and WooCommerce products

The CJ importer and WooCommerce catalogue are separate steps. Saving a dress into Davinova's D1 catalogue does not automatically create a WordPress/WooCommerce product. Import the agreed CJ dress into WooCommerce (WooCommerce → Products → Import) only after converting the source data to the WooCommerce CSV format and verifying its product photos, price, size variations, stock and delivery. Keep it unpublished or not purchasable until those details are confirmed.


## Step 6 — Connect this WooCommerce store to CJ Dropshipping

Use CJ's current WooCommerce store authorization rather than exposing CJ credentials or WooCommerce API credentials to the Davinova browser.

1. Sign in to the CJ Dropshipping dashboard and open the WooCommerce authorization / store-connection area.
2. Choose the default WooCommerce authorization flow and enter the real WordPress/WooCommerce store URL. CJ should redirect you to your own WordPress site to approve access. Review the permissions and approve only for the store you control.
3. Return to CJ and confirm the WooCommerce store reports Authorized / Activated.
4. In CJ, list the agreed CJ dress to WooCommerce or open the Unconnected area and manually connect the exact WooCommerce product and each colour/size variation to the correct CJ product variant. Do not assume that matching product titles alone are enough.
5. Verify prices, variant SKUs, stock settings, shipping method to the customer's destination, and the product image set in WooCommerce before publishing a sellable product.
6. Run one end-to-end order using test payment first. CJ's current guidance says store orders need a valid paid order, an eligible processing status, an authorized store and connected products; test this exact path from WooCommerce to CJ before relying on automation.

Never paste WooCommerce API keys or CJ API keys into Davinova's frontend build variables or a chat message. If the default CJ authorization fails, stop and use CJ's documented OAuth-plugin alternative rather than weakening WordPress permissions.

