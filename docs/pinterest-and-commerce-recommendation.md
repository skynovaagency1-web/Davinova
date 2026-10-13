# Pinterest research and commerce architecture for Davinova

Research date: 13 October 2026

## Pinterest inspiration references

These are references for art direction and interaction patterns, not assets to copy or a mandate to reproduce any one design.

1. [High-end designer boutique — warm pink/white art direction](https://www.pinterest.com/pin/305048574772212242/). Notes on the pin describe blush/rose-gold color, watercolor texture, and clean typography. Use only a small muted rose accent from this reference; avoid making every surface pink.
2. [Moody luxury fashion boutique campaign](https://www.pinterest.com/pin/402368547979155421/). Reference for richer contrast, fashion-campaign atmosphere, product/lifestyle photography and a more dramatic visual moment. Borrow the atmosphere rather than filling the entire interface with black and gold.
3. [Ethereal Shopify boutique design for LILLOU](https://www.pinterest.com/pin/68187381854966297/). Reference for soft, feminine ecommerce styling and clean product presentation.
4. [Luxury clothing-boutique Shopify design](https://uk.pinterest.com/pin/shopify-theme-clothing-boutique-website-for-fashion-boutique-aesthetic-luxury-website-design-luxury-fa-in-2025--974325700637389924/). Reference for luxury fashion-brand layout and e-commerce visual hierarchy.

## Recommended combined direction

- Palette: warm ivory and stone, espresso/near-black for legible contrast, muted rose as a restrained accent, and champagne used sparingly.
- Typography: expressive fashion-editorial serif for headlines; straightforward sans serif for prices, navigation, filters and size information.
- Homepage: one strong editorial hero with real dress photography; selected dresses near the top; a focused occasion-led collection navigator; one tactile fabric/image interaction; simple footer.
- Product cards: consistent photography crops, clear price and product title, subtle alternate-image hover where verified images exist, calm entrance transitions.
- Product detail: real gallery first; clear color and size variants, fit details, shipping/returns, and a visible availability state. Don't advertise variants until FondMart confirms them.
- Motion: restrained image reveals, soft page transitions, pointer-responsive product tilt on desktop only, and Canvas UI fabric movement in one feature area. Respect reduced-motion preference and keep touch interactions simple.
- Do not imitate a Pinterest seller's complete template, copy its brand assets or use its images as Davinova product photography. Use only the visual principles; source original or authorized campaign/product images.

## WooCommerce recommendation

**Recommendation: use WooCommerce as a candidate commerce backend while retaining the custom React/Vite front end (headless WooCommerce), subject to testing FondMart's connection and checkout.**

Why:
- [FondMart's official WooCommerce connection guide](https://fondmart.com/faq/how-do-i-connect-woocommerce-stores-to-fondmart-.html) says the merchant connects a WooCommerce domain with a WooCommerce API key and secret, then imports FondMart products into the WooCommerce store.
- [FondMart's auto-sync guide](https://fondmart.com/blog/how-to-associate-my-shopify-store-with-fondmart-app-.html) describes WooCommerce/Shopify sync for products, orders, shipping and inventory. Validate current plan support and exact behavior in the merchant account before relying on it.
- [WooCommerce Store API documentation](https://woocommerce.com/document/woocommerce-store-api/) describes public, customer-facing endpoints for products, cart, shipping rates and checkout, enabling custom JavaScript storefronts.

What this means for the architecture:
- React/Vite + 21st.dev-inspired components + Canvas UI can remain the visual storefront.
- WordPress/WooCommerce becomes the source of truth for real product variants, stock data, orders, discounts and customer checkout.
- FondMart connects to WooCommerce via its supported integration. The custom front end talks to the WooCommerce Store API for products/cart/checkout.
- Keep administrative credentials and WooCommerce REST API secrets on the server only; never embed them in Vite client-side code.

Caveats:
- A headless setup is more technical than installing a WooCommerce theme: product mapping, customer cart/session behavior, checkout, payment configuration, tax/shipping, CORS/domain routing and order-state tests must be implemented and tested.
- WooCommerce by itself does not guarantee that FondMart has imported verified size variants, live stock, or that supplier-order forwarding works; verify this in a test order.
- The current React storefront's locally defined product list and disabled checkout must not be treated as production commerce.
- If minimizing ongoing technical complexity is more important than keeping a bespoke React front end, a conventional WordPress + WooCommerce theme is a simpler alternative, but would mean rebuilding the storefront in WordPress.

## Next implementation gates

1. Create a staging WordPress/WooCommerce store on managed hosting.
2. Connect it to FondMart and test import, size/color variants, stock updates, order forwarding, shipping/tracking and cancellation/refund behavior using a test product/order.
3. Confirm the chosen payment provider, currency, tax, delivery/returns policy and final prices.
4. Implement the React-to-WooCommerce Store API integration, preserving API secrets on the server.
5. Run end-to-end tests from browsing a real size variant through payment and a visible order in WooCommerce/FondMart before launch.
