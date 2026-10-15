# Supplier and commerce plan for Davinova

Updated: 13 October 2026

## Decision
- **CJ Dropshipping is the primary fulfilment supplier.** Use its documented Open API V2.0 only after a CJ account, API key, mapped product/variant IDs, current item costs and a suitable shipping option are confirmed.
- **FondMart is a style-discovery catalog.** Send desired listing URLs as free CJ sourcing requests. The custom store assumes no FondMart order API; an exceptional FondMart fallback is placed manually by the owner.
- Keep React/Vite on Cloudflare Pages and operational records in Cloudflare D1. Keep CJ secrets server-side.
- Require one-tap owner approval before each supplier purchase. Keep DRY_RUN=true, CJ_SANDBOX=true and CJ_LIVE_ORDERS_ENABLED=false until tests and price checks pass.
- Only a signature-verified and idempotently stored Stripe/PayPal paid event may create the owner approval request. Checkout and payment webhooks are currently disabled, so do not accept payments yet.

## Pricing and sourcing
The plan proposes a $55-$70 retail target. Previous FondMart catalog observations ($8-$27) are not CJ prices. Calculate final prices from actual CJ item cost, selected shipping, payment fees, expected returns/advertising, taxes and other operating costs. Never sell until CJ confirms the exact dress, variant/size, stock, shipping quote and authorized image use.

FondMart source IDs, URLs and source costs must be stored separately from CJ product and variant IDs. All existing items are unverified sourcing candidates.

## Categories
1. Wedding Guest (first niche).
2. Cocktail & Party (next).
3. Maxi & Holiday (add before spring/summer once verified).
4. Bridesmaid and Prom/Homecoming hidden for now. Plus-size and modest collections deferred.

## CJ order lifecycle
CJ's API documents a multi-step purchase: create order, add to CJ cart, confirm cart, generate a parent order/payment ID, then pay CJ balance. Record external IDs and progress in D1. After a partial failure, flag for manual reconciliation rather than blindly repeating a purchase. Tracking should be checked after the supplier order is placed and emailed through a configured sender.

## Launch gates
- Create a CJ account/API key; validate authentication, stock and order API in CJ sandbox.
- Source styles from FondMart and verify actual CJ SKU, variant/size, inventory, price, logistics and image rights.
- Finish Stripe/PayPal checkout and verified webhooks; only then send owner approval email.
- Verify one-time approval, DRY_RUN behavior, supplier sandbox order, failure reconciliation and duplicate-click protection.
- Configure Resend verified sender and tracking mail.
- Finalize prices, shipping, returns/refunds, privacy and support information.
- Leave customer payments and live supplier purchasing disabled until all end-to-end tests pass.
