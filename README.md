# Davinova — occasion dress boutique

A mobile-first, luxury-inspired dropshipping storefront for women's wedding-guest and occasion dresses. This repository is a staged handover project. The current scaffold includes the React storefront foundation, D1 schema/seed data, Cloudflare Pages Functions skeleton, and safe integration placeholders.

> **Important:** This is a development scaffold, not yet production-ready. Do not accept live payments or place live supplier orders until the TODOs and verification steps below are complete. `DRY_RUN=true` is the default.

## Architecture

```text
Browser (React + Vite + TypeScript + Tailwind)
  ├─ Davinova-branded catalogue and product discovery
  ├─ WooCommerce Store API → published product catalogue
  └─ WooCommerce native product/cart/checkout pages → taxes, shipping, gateways, order records
```

## Requirements

- Node.js 20+
- npm
- Optional for local Cloudflare runtime: Wrangler CLI (installed through project dependencies)

## Local setup

1. `npm install`
2. Copy `.env.example` to `.dev.vars` and leave all payment/supplier keys unset while developing.
3. `npm run dev` to start Vite.
4. `npm run typecheck && npm run lint && npm test && npm run build` for checks.

To develop Pages Functions locally, use `npx wrangler pages dev dist` after `npm run build`. D1 local database setup:

```bash
npx wrangler d1 create davinova-db
# Update database_id in wrangler.toml with the returned ID.
npx wrangler d1 execute davinova-db --local --file=./schema.sql
npx wrangler d1 execute davinova-db --local --file=./seed/seed.sql
```

Wrangler configuration is a template. Review the D1 database ID and binding before use.

## WooCommerce connection

The React storefront is separate from WordPress. The WooCommerce integration is prepared on the `feature/woocommerce-headless-catalog` branch. Follow [docs/woocommerce-setup.md](docs/woocommerce-setup.md) to configure the WordPress store and Cloudflare Pages environment.

Required public build variables:

- `VITE_WOOCOMMERCE_URL`: root URL of the WordPress/WooCommerce site, with no trailing slash.
- `VITE_CURRENCY`: the store currency fallback, such as `EUR` or `USD`.

When configured, the public Store API supplies product descriptions, prices, categories, sizes/colours where available, and product images. Product purchase buttons open WooCommerce's native product page; basket and checkout links go to WooCommerce's native pages. This lets WooCommerce handle variable options, live stock, shipping, taxes, payment gateways, and order records. No WooCommerce API secret is exposed in the storefront. With no URL configured, demo dresses appear only in development; production intentionally does not present demo dresses as real catalogue items.

## Deploy to Cloudflare Pages

1. Push this repository to GitHub.
2. In Cloudflare Dashboard, create a Pages project connected to the repo.
3. Build command: `npm run build`; output directory: `dist`.
4. Create a D1 database and replace the placeholder `database_id` in `wrangler.toml` if you use the separate D1 backend.
5. Add environment variables and secrets in Pages settings. Never commit `.dev.vars` or real credentials.
6. Configure a custom domain and verify DNS/TLS.
7. Configure Cron Triggers only after `functions/scheduled.ts` is implemented and tested.

## Environment variables

See `.env.example` for all expected names. In Cloudflare, use **Secrets** for private keys such as `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `PAYPAL_CLIENT_SECRET`, `CJ_API_KEY`, `RESEND_API_KEY`, `ADMIN_PASSWORD`, and `APPROVAL_SECRET`.

## Integrations and webhooks

The initial scaffold does not claim that payment verification or supplier order placement is complete. Before using the separate D1/API checkout path:

- Implement Stripe webhook signature verification using the raw request body and test `checkout.session.completed` and refund events.
- Implement PayPal webhook verification against PayPal's verification API and configure `PAYMENT.CAPTURE.COMPLETED` plus any additional event types required by the chosen checkout flow. Confirm event names against current PayPal docs.
- Verify all CJ API v2 endpoints, token lifecycle, variant mapping, logistics, and payment requirements against https://developers.cjdropshipping.com/. The code must not make live calls while `DRY_RUN=true`.
- Implement Resend templates and handle delivery failures.
- Add idempotency constraints for provider webhook event IDs before processing an event.

## Netlify portability

Keep business logic in `functions/lib` and avoid Cloudflare-specific APIs outside thin adapters. To move to Netlify, add a Netlify Functions adapter for each route, map environment variables, replace the D1 adapter with a compatible SQLite/hosted database strategy, and move scheduled work to Netlify Scheduled Functions. D1 itself is Cloudflare-specific, so database portability requires deliberate migration rather than a config-only change.

## Rebranding

Edit `src/config/brand.ts` and replace files under `public/brand`. Product imagery and GLB models belong under `public/images` and `public/models`.

## Handover TODO

- [ ] Complete and test checkout creation and webhook signature verification for the separate D1 checkout path.
- [ ] Complete PayPal webhook verification and refund flow for the separate D1 checkout path.
- [ ] Complete approval-token signing, expiry, single-use semantics, and owner approval UI.
- [ ] Verify CJ API v2 endpoints and mapping against live official documentation.
- [ ] Implement supplier retries/backoff and scheduled tracking synchronization.
- [ ] Implement Cloudflare Access + server-side admin password fallback and rate limiting.
- [ ] Implement product/admin CRUD, image upload to R2, discount codes, newsletter, and contact email.
- [ ] Replace all policy placeholders and confirm legal obligations for the markets served.
- [ ] Replace sample product data and placeholder imagery with licensed supplier content.
- [ ] Run Lighthouse and security review; add end-to-end tests before production.
