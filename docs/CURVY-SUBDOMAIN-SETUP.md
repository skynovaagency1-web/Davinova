# Davinova Curvy subdomain

The code supports two storefront experiences on the same React application:

- `https://davinova.com` — standard collection and storefront chooser.
- `https://curvy.davinova.com` — the dedicated Plus Size & Curvy storefront.

## Required hosting step

The Curvy hostname will not resolve publicly until it is attached to the Cloudflare Pages project serving Davinova.

1. Open Cloudflare Dashboard and select the **Pages project that serves `davinova.com`**.
2. Open **Custom domains** and add `curvy.davinova.com` to that same Pages project.
3. Follow Cloudflare's DNS and domain-verification prompts, then wait for the certificate and domain status to become active.
4. Verify the Curvy hostname loads the Curvy homepage and that `/shop` and product detail routes remain on the Curvy hostname.
5. Verify the standard domain continues to show the standard storefront.

Do not merge or deploy unrelated Worker configuration as part of this domain step. The Curvy storefront is designed to run in the existing Pages application; it does not require a second store or a second codebase.

## Product separation

The Curvy storefront displays products explicitly tagged as plus-size/curvy/extended-size, or whose size metadata includes common plus-size labels from 1X/1XL through 6X/6XL. Products with unknown fit metadata are not automatically classified as Curvy. Supplier availability, sizing, prices and shipping still need to be verified before a product can become purchasable.
