# Coded direction options — design evidence

This document records the design evidence for the noindex coded direction prototypes under `/look/directions/`: signal objects, clay observatory and spectrum console.

## Sources

- `src/pages/index.astro:1` — current homepage structure and factual product copy.
- `src/claims.ts:1` — product claims reused without inventing counts, prices, quotes or logos.
- `src/styles/tokens.css:1` — spacing, type, motion and theme-token baseline.
- https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/ — disclosure behaviour for connector details and navigation.
- https://www.w3.org/WAI/ARIA/apg/patterns/tabs/ — keyboard-reachable tab semantics for the console-tab prototype.
- https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion — reduced-motion media behaviour.
- https://docs.astro.build/en/guides/client-side-scripts/ — Astro inline script behaviour used for small page-local interactions.

## Findings

1. The prototypes are running code rather than static mockups: real routes, working controls, responsive layout, light/dark values and reduced-motion fallbacks.
2. Product facts stay constant so the comparison is about execution: the same claims, sample policy rows, connector descriptions and console proof assets.
3. The three directions cover distinct axes rather than minor reskins: object/raw typographic discipline, warm calm product surface, and dense product-first console colour.
4. `/look/` is disallowed in `public/robots.txt`, so prototypes can exist in the real app without becoming crawlable site content.
5. No external icon library, remote font, remote image, fake testimonial, invented client or invented usage number is needed.

## Negative controls

- No option reuses the retired staged-scroll/capsule structure.
- No option uses orange, glow-led neon, generic icon grids or marketing-logo walls.
- Interactive controls are native buttons, summaries or links; there are no dead controls.
