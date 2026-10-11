# Davinova — occasion dress boutique

A mobile-first, luxury-inspired dropshipping storefront for women's wedding-guest and occasion dresses. This repository is a staged handover project. The current scaffold includes the React storefront foundation, D1 schema/seed data, Cloudflare Pages Functions skeleton, and safe integration placeholders.

> **Important:** This is a development scaffold, not yet production-ready. Do not accept live payments or place live supplier orders until the TODOs and verification steps below are complete. `DRY_RUN=true` is the default.

## Architecture

```text
Browser (React + Vite + TypeScript + Tailwind)
  ├─ Public pages / product catalogue / local cart
  └─ /api/* → Cloudflare Pages Functions
                 ├─ Cloudflare D1 (products, orders, settings, audit trail)
                 ├─ Stripe Checkout + verified webhook (TODO: complete integration)
                 ├─ PayPal Checkout + verified webhook (TODO: complete integration)
                 ├─ FondMart supplier workflow (product package import now; order/tracking integration TODO)
                 └─ Resend email API (TODO: implement templates + delivery)
```

## Requirements

- Node.js 20+
- npm
- Optional for local Cloudflare runtime: Wrangler CLI (installed through project dependencies)

## Local setup

1. `npm install`
2. Copy `.env.example` to `.dev.vars` and leave all payment/supplier keys unset while developing.
3. `npm run dev` to start Vite.
4. `npm run typecheck && npm run lint && npm test` for checks.

To develop Pages Functions locally, use `npx wrangler pages dev dist` after `npm run build`. D1 local database setup:

```bash
npx wrangler d1 create davinova-db
# Update database_id in wrangler.toml with the returned ID.
npx wrangler d1 execute davinova-db --local --file=./schema.sql
npx wrangler d1 execute davinova-db --local --file=./seed/seed.sql
```

Wrangler configuration is a template. Review the D1 database ID and binding before use.

## Deploy to Cloudflare Pages

1. Push this repository to GitHub.
2. In Cloudflare Dashboard, create a Pages project connected to the repo.
3. Build command: `npm run build`; output directory: `dist`.
4. Create a D1 database and replace the placeholder `database_id` in `wrangler.toml`.
5. Apply `schema.sql` and `seed/seed.sql` to the production database after reviewing them.
6. Add environment variables and secrets in Pages settings. Never commit `.dev.vars` or real credentials.
7. Configure a custom domain and verify DNS/TLS.
8. Configure Cron Triggers only after `functions/scheduled.ts` is implemented and tested.

## Environment variables

See `.env.example` for all expected names. In Cloudflare, use **Secrets** for private keys such as `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `PAYPAL_CLIENT_SECRET`, FondMart integration credentials (only after FondMart confirms the supported API/access method), `RESEND_API_KEY`, `ADMIN_PASSWORD`, and `APPROVAL_SECRET`.

## Integrations and webhooks

The initial scaffold does not claim that payment verification or supplier order placement is complete. Before going live:

- Implement Stripe webhook signature verification using the raw request body and test `checkout.session.completed` and refund events.
- Implement PayPal webhook verification against PayPal's verification API and configure `PAYMENT.CAPTURE.COMPLETED` plus any additional event types required by the chosen checkout flow. Confirm event names against current PayPal docs.
- For this custom React store, use FondMart's product data package to import supplier-approved product details and images. FondMart documents one-click automatic import for Shopify and a downloadable product-data package for third-party stores; confirm the package format and image usage permissions in your account before importing.\n- Confirm whether FondMart provides API access/order forwarding for this custom store. Do not invent endpoints or enable live supplier orders until FondMart provides current documentation and credentials. Keep `DRY_RUN=true`.
- Implement Resend templates and handle delivery failures.
- Add idempotency constraints for provider webhook event IDs before processing an event.

## Netlify portability

Keep business logic in `functions/lib` and avoid Cloudflare-specific APIs outside thin adapters. To move to Netlify, add a Netlify Functions adapter for each route, map environment variables, replace the D1 adapter with a compatible SQLite/hosted database strategy, and move scheduled work to Netlify Scheduled Functions. D1 itself is Cloudflare-specific, so database portability requires deliberate migration rather than a config-only change.

## Rebranding

Edit `src/config/brand.ts` and replace files under `public/brand`. Product imagery and GLB models belong under `public/images` and `public/models`.

## Handover TODO

- [ ] Complete and test checkout creation and webhook signature verification.
- [ ] Complete PayPal webhook verification and refund flow.
- [ ] Complete approval-token signing, expiry, single-use semantics, and owner approval UI.
- [ ] Verify FondMart's supported integration method and mapping against live official documentation.
- [ ] Implement supplier retries/backoff and scheduled tracking synchronization.
- [ ] Implement Cloudflare Access + server-side admin password fallback and rate limiting.
- [ ] Implement product/admin CRUD, image upload to R2, discount codes, newsletter, and contact email.
- [ ] Replace all policy placeholders and confirm legal obligations for the markets served.
- [ ] Replace sample product data and placeholder imagery with licensed supplier content.
- [ ] Run Lighthouse and security review; add end-to-end tests before production.
