# 21st.dev component audit

Reviewed: 13 October 2026

The public 21st.dev catalogue now has dedicated collections for liquid-glass surfaces, e-commerce UI, motion heroes, card interactions and image transitions.

## Selected references

- [Liquid Glass & Glassmorphism](https://21st.dev/community/components/explore/liquid-glass-components) — useful reference for translucent surfaces, blur and layered borders.
- [Glass Card by Smit Prajapati](https://21st.dev/%40Smit-Prajapati/components/glass-card) — compact 3D glass-card reference; the catalogue lists `lucide-react` as its dependency, which is already present in Davinova. We have not copied its source component.
- [Glass Cards by Kedhareswer Naidu](https://mcp.21st.dev/%40kedhareswer/components/glass-cards) — stacked glass/neumorphic cards animated with GSAP. Not selected because it adds another animation system alongside Davinova's existing Framer Motion.
- [Glass Checkout Card by Moumen Soliman](https://21st.dev/%40moumensoliman/components/glass-checkout-card-shadcnui) — a future visual reference for an order summary, not a live checkout integration. The catalogue page lists Framer Motion and an MIT license; payment, cart and order behavior would still need to be wired to real commerce data.
- [E-commerce components](https://21st.dev/community/components/explore/ecommerce-components) — product cards, checkout patterns and other shopping UI references.
- [Motion hero section](https://21st.dev/community/components/explore/motion-hero-section) and [scroll-driven hero](https://21st.dev/community/components/explore/scroll-driven-hero-template) — possible future directions for scroll-based campaign imagery.
- [Spotlight Card article](https://21st.dev/blog/react-spotlight-effect-components) — performance guidance recommends CSS custom properties and avoiding unnecessary stacked pointer effects.

## What changed in Davinova

A small, dependency-free glass treatment was applied to existing UI in `src/styles/editorial.css`: the hero photo labels, fabric-image stamps, and product image badges/arrows. This borrows the broad visual technique rather than copying a community component. Existing product-card interactions, hero composition and accessible text remain in place.

The glass effect is intentionally limited to photography overlays and small labels. Product titles, prices, sizing information and shopping actions remain plain and legible. Browsers without backdrop-filter retain a more opaque background fallback.

## What was not installed

No component has been installed through the 21st.dev CLI in this pass. The component pages were audited as design/source references; source, responsive behavior, dependencies and licensing should be checked individually before importing a full community component. The project notes already document the authenticated CLI workflow in [visual-direction.md](./visual-direction.md).
