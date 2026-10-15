# CJ European shipping checks

This workspace is for read-only product sourcing research. A shipping estimate never creates an order, imports a product, publishes a listing, or charges money.

## Preview setup

The Cloudflare Pages **Preview** environment needs these secrets set independently of Production:

- `ADMIN_PASSWORD`
- `CJ_API_KEY`
- `CJ_TOKEN_ENCRYPTION_KEY`

Never put secret values in source control or in support messages. After changing Preview secrets, start a fresh Preview deployment so the deployment picks up the new configuration.

## How to check a product

1. Open `/admin/cj-catalog` on the Preview URL and enter the saved `ADMIN_PASSWORD`.
2. Search CJ for a product.
3. Use **Inspect sizes & variants** and select the specific variant ID (VID) to check.
4. Choose the actual warehouse origin shown in CJ when it is known. If inventory records did not identify a warehouse, the origin is only an assumption.
5. Choose a European destination and select **Check shipping** for the variant.

The endpoint requests a preliminary estimate from CJ's freight-calculation API for one item. Results can include logistics method, postage amount, and a delivery-time window when CJ supplies those fields. Quotes are not guaranteed delivery promises and do not confirm stock. If CJ returns no priced method, that does not necessarily prove the route is permanently unavailable.

Repeat the destination check for the European countries Davinova intends to serve. Do not advertise a country as supported until a viable route and final supplier quote have been verified. Include applicable taxes, customs/clearance fees, payment fees, returns, and other costs when calculating the retail price.

## Safety

Keep `DRY_RUN=true`. Do not enable live supplier purchasing during shipping research. Product listings must remain inactive until variant, stock, image-use rights, shipping coverage, landed cost, and sizing information are verified.
