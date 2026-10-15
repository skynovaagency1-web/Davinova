# Davinova — occasionwear boutique

React + Vite + TypeScript storefront, Cloudflare Pages Functions and D1. Development preview only — **not production-ready**. Do not accept customer payments or place live supplier orders yet.

## Current plan
- Primary fulfilment supplier: CJ Dropshipping Open API V2.0.
- FondMart is a style-discovery catalog used to submit free CJ sourcing requests. No FondMart auto-order API is assumed; any rare fallback is an owner-placed manual order.
- Frontend: Cloudflare Pages. Orders/catalog: D1. Email: Resend.
- Safety defaults: DRY_RUN=true, CJ_SANDBOX=true and CJ_LIVE_ORDERS_ENABLED=false. One-tap owner approval is required before each supplier purchase.

## Launch categories
1. Wedding Guest (first niche).
2. Cocktail & Party (next).
3. Maxi & Holiday (add before spring/summer when sourced products are verified).
4. Bridesmaid and Prom/Homecoming hidden for now. Plus sizes and modest dresses deferred.

The eight current dresses are FondMart style references, not verified CJ products. Do not sell any item until CJ confirms the exact match and provides CJ product/variant IDs, actual sizes, stock, current item/shipping costs and commercial image permission. $55-$70 is a draft retail target, not final verified pricing.

## Local setup
Node.js 20+ and npm are required.
```sh
npm install
npm run dev
npm run typecheck
npm run lint
npm test
npm run build
```
To test Pages Functions locally after build, use `npx wrangler pages dev dist`. Keep all supplier/payment credentials unset during local design work.

## Cloudflare
1. Connect this repository to Cloudflare Pages; build command `npm run build`, output directory `dist`.
2. The existing D1 database is `davinova-store-db`; the `DB` binding and database ID are recorded in `wrangler.toml`.
3. Apply numbered migrations with `npx wrangler d1 migrations apply davinova-store-db --remote`. Do not run `schema.sql` on top of the numbered migrations.
4. Configure secrets in the Cloudflare dashboard, not Git.
5. Attach your custom domain only after preview and security checks.

The tracking-sync handler is prepared in `server/scheduled.ts`, but Cloudflare Pages does not support Worker Cron Triggers. Deploy it as a separate Worker before relying on automated tracking emails.

## CJ API references
- https://developers.cjdropshipping.com/en/api/api2/
- https://developers.cjdropshipping.com/en/api/api2/api/auth.html
- https://developers.cjdropshipping.com/en/api/start/Orders-Synchronization-Processing.html
- https://developers.cjdropshipping.com/en/api/api2/api/shopping.html
- https://developers.cjdropshipping.com/en/api/api2/api/logistic.html

Never expose CJ secrets in React or VITE_ variables. Configure server-side secrets only after creating the CJ account: CJ_API_KEY, CJ_TOKEN_ENCRYPTION_KEY, CJ_LOGISTIC_NAME (verified in CJ), CJ_FROM_COUNTRY_CODE=CN, CJ_SANDBOX=true, CJ_LIVE_ORDERS_ENABLED=false, DRY_RUN=true, RESEND_API_KEY, EMAIL_FROM, OWNER_EMAIL, SITE_URL.

CJ's order flow is multi-step: create order, add to cart, confirm, generate the parent payment ID, then pay CJ balance. Save each external ID and step. If a provider call fails after a supplier order may have been created, flag for manual reconciliation rather than blindly retrying.

The public products endpoint returns only CJ-verified active products with a mapped active variant and positive stock; it does not return wholesale costs or provider IDs.

## Launch gates
- [ ] Create CJ account/API key and validate auth, stock and ordering in sandbox.
- [ ] Submit styles from FondMart and verify exact CJ model, variant/sizes, inventory, landed cost and image rights.
- [ ] Finish Stripe Checkout + verified webhook and PayPal create/capture + verified webhook.
- [ ] Trigger one-time owner approval only after verified payment is idempotently recorded.
- [ ] Test CJ sandbox purchase, DRY_RUN, approval token expiry/replay, failure reconciliation and duplicate clicks.
- [ ] Configure Resend verified sender and tracking emails.
- [ ] Finalize pricing, shipping, returns/refunds, privacy and support policy.
- [ ] Run end-to-end, security, accessibility and performance tests.

Related: [visual direction](docs/visual-direction.md), [supplier plan](docs/pinterest-and-commerce-recommendation.md).
