# Davinova visual direction

This redesign uses three distinct sources with one consistent art direction.

## 21st.dev — component research

Explore the [animated hero catalogue](https://21st.dev/community/components/explore/hero-section-animation), [motion hero catalogue](https://21st.dev/community/components/explore/motion-hero-section), and [e-commerce components](https://21st.dev/community/components/explore/ecommerce-components). The implementation adopts the relevant patterns—layered editorial photography, staged entrances, product-image hover reveals, and restrained scroll choreography—within Davinova's existing React Router and Framer Motion setup.

The 21st CLI is account-authenticated. To browse/install an actual catalogue component in the local checkout, use:

```sh
npx @21st-dev/cli login
npx @21st-dev/cli search "editorial fashion hero image gallery"
npx @21st-dev/cli search "fashion product reveal card hover"
```

Review preview, source, dependencies, responsiveness and reduced-motion behavior before adding any community component. Public documentation says search is free; component installs are limited by plan and login. Do not put an API key in this repository.

## Canvas UI — tactile movement

The homepage uses Canvas UI's Cloth React component around a single dress image, with deliberately low wind, amplitude and sheen settings. This is a focused interaction, not a full-site shader. The source and required helper files live under `src/components/canvasui/`; attribution and the upstream license are included beside them.

Component details: [Cloth documentation](https://canvasui.dev/docs/components/cloth). HTML-in-canvas is experimental in Chrome, so the original image remains normal DOM content when the feature is unavailable; test the WebGL fallback on the target browsers.

## Collect UI — layout and interaction references

Use [landing-page inspiration](https://collectui.com/designs/landing-page-ui-design-inspiration), [scroll-animation inspiration](https://collectui.com/designs/scroll-animation-ui-design-inspiration), and the [e-commerce design challenge](https://collectui.com/challenges/landing-page) as references for spacing, hierarchy, scroll reveals and interactions. These are design references, not assets to copy verbatim.

## Art direction

- Warm ivory, stone, cocoa and muted rose; editorial serif display type with quiet sans-serif utility labels.
- Real product photography in a layered campaign-style composition, not a CSS dress illustration.
- Smooth, brief page transitions and tactile image hover states; no scroll hijacking or constant high-intensity effects.
- Motion must respect reduced-motion preferences and mobile performance.
- Do not make unverified claims about size range, live stock, shipping, returns or checkout. Confirm supplier image rights before launch.

## Current launch blockers

CJ has not verified the eight FondMart-discovered style candidates, product/variant IDs, sizes, inventory, or delivered costs. The $55-$70 prices are draft targets. Stripe/PayPal checkout and verified payment webhooks remain disabled; final shipping/returns/privacy/support policies need owner review. The interface is a development preview until those workflows are implemented.
