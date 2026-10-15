# Stripe Checkout and CJ handoff

This integration is implemented in the current development branch using Davinova's existing Cloudflare Pages Functions, D1 schema, encrypted CJ token storage, and owner approval flow. It does not require a separate Worker script, KV namespace, or Queue for the present order workflow.

## What changed

- `POST /api/checkout` accepts only product ID, selected size and quantity from the browser.
- The function reads prices, product status, supplier mapping, exact CJ variant, and stock from D1 / the CJ stock API. The browser never sets a price or CJ ID.
- It creates a Stripe-hosted Checkout Session and records the session ID and server-calculated totals on the D1 order.
- `POST /api/webhooks/stripe` verifies Stripe's HMAC signature over the unmodified request bytes, checks mode, payment state, currency, subtotal, shipping and total, then records the collected delivery details.
- After successful payment verification, the Worker sends a one-time owner-approval link via the existing Resend configuration. Supplier fulfilment is not started by the Stripe webhook; the existing `/api/admin/cj-approve` endpoint and safety checks remain in control.
- The order-confirmation page is only a customer-facing return page. It is not treated as evidence of payment or dispatch.

Stripe recommends using webhook events to verify payment and start fulfilment, not relying on the browser redirect. This implementation follows that model.

## Cloudflare Pages configuration — TEST ONLY

Under the Davinova Pages project's production and preview environment settings, configure the following for the environment you are testing. Keep Stripe and CJ credentials as secrets rather than frontend `VITE_*` variables.

Required secrets:
- `STRIPE_SECRET_KEY`: Stripe test secret, beginning with `sk_test_`.
- `STRIPE_WEBHOOK_SECRET`: the signing secret beginning with `whsec_` for the test webhook endpoint.
- `CJ_API_KEY` and `CJ_TOKEN_ENCRYPTION_KEY`: needed for live CJ inventory checks through `server/cj.ts`.
- `RESEND_API_KEY`: needed to email the owner the one-time approval link.

Required environment variables:
- `STRIPE_MODE=test`
- `SITE_URL=https://davinova.com` for the deployed site; local test URLs must be localhost and Stripe test mode.
- `STRIPE_SHIPPING_COUNTRIES`: comma-separated ISO-3166 two-letter country codes that Davinova has actually configured to serve.
- `STRIPE_SHIPPING_FEE_CENTS`: customer delivery charge as an integer number of cents in the product currency. Use `0` only if you deliberately offer free shipping.
- `STRIPE_SHIPPING_LABEL`: customer-facing label, e.g. `Standard delivery`.
- `STRIPE_AUTOMATIC_TAX=false` unless Stripe Tax is configured for your business, registrations and destinations.
- `OWNER_EMAIL` and `EMAIL_FROM`: a monitored owner inbox and a verified sender address for Resend.

Keep the existing `DB` D1 binding. The CJ API helper caches encrypted tokens in D1 and respects the account-level rate limiting; it does not require the KV binding used in the earlier standalone example.

## Stripe webhook endpoint

In the Stripe Dashboard, create a webhook endpoint with this exact deployed URL:

`https://davinova.com/api/webhooks/stripe`

Select these events:
- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `checkout.session.async_payment_failed`

Save the endpoint's signing secret to `STRIPE_WEBHOOK_SECRET` in Cloudflare. Test-mode and live-mode webhook secrets are different. Redeploy after setting or updating variables.

## Product readiness

A product cannot be checked out unless its current D1 product is active, supplier is CJ, catalogue source is CJ, supplier verification is complete, retail price and CJ cost are positive, and the selected active variant has an exact CJ variant ID and positive stock. The checkout endpoint also asks CJ for current stock before creating a session.

The currently seeded first dress remains browse-only: its retail price is zero, supplier verification is false and the known White/XS variant is inactive with unknown stock. A checkout attempt for that dress should fail closed until those facts are verified and the catalogue is updated. Do not alter those guards just to make a test checkout button work.

## Verify in test mode

1. Confirm Stripe test key and matching test webhook secret.
2. Confirm Resend sender and owner inbox work. Paid webhook processing needs to deliver the one-time owner approval link.
3. Activate only a product and variant whose CJ mapping, inventory, price, image permissions and delivery terms you have actually confirmed.
4. Use Stripe's test-card documentation in a test checkout. Confirm the matching D1 order receives the Stripe Checkout Session ID.
5. Confirm Stripe's event delivery reports success and the order transitions to `pending_approval` only after amount and shipping validation.
6. Confirm the approval email arrives and the approval page reports the correct product mapping.
7. With `DRY_RUN=true`, owner approval must record a dry-run without making a supplier order request. Then test the CJ sandbox flow only after CJ sandbox credentials and logistics are configured.
8. Test duplicate webhook deliveries, invalid signatures, unpaid sessions, wrong amounts, out-of-stock variants and Resend failures.

## Live payments and supplier purchases are separate switches

This change deliberately does not enable production sales. Live Stripe checkout is refused unless all of the following are explicitly configured after end-to-end tests:
- `STRIPE_MODE=live` and an `sk_live_` key.
- `CJ_SANDBOX=false`.
- `DRY_RUN=false`.
- `CJ_LIVE_ORDERS_ENABLED=true`.
- Verified destinations, prices, taxes, delivery charge, returns and customer support policies.
- Working verified webhook and owner-approval email.

The owner must still explicitly approve each paid order. If CJ creates an order but later steps fail, use the existing `needs_attention` state and reconcile against the CJ dashboard before attempting again. No automatic refund is implemented; add and test a documented refund/manual-reconciliation policy before opening checkout to real customers.
