# Specification — coded direction options

This specification covers the noindex coded direction prototypes under `/look/directions/`: signal objects, clay observatory and spectrum console.

## Scope

Build three running prototypes:

1. Signal objects — strong type, mono truth, dense ordered rows, one accent, object-like panels.
2. Clay observatory — warm calm surfaces, generous breathing space, soft colour, crafted empty-state detail.
3. Spectrum console — dense product-first console, semantic spectrum colour, quiet chrome and no glow.

## Implementation shape

- `src/pages/look/directions/index.astro` is the option index.
- One Astro page per direction carries native interactive controls.
- `src/styles/directions/*.css` keeps each direction visually independent.
- Optimised real-console WebP proof assets live under `public/console-proof/`.
- `test/directions.ts` is part of the test gate.
- `/look/` stays noindexed and disallowed; production navigation is unchanged.

## Verification

The exact-sha project grade covers install, lint, types, build, tests, a11y, budget, structured data, links, performance and negative controls. Rendered proof covers desktop and 390px in light and dark before the round is presented.

## Non-goals

No public launch, analytics change, production secret write or replacement of the current homepage is included in this prototype unit.
