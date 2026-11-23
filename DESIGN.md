# ARMS site — design notes

Picked look (23 Nov 2026): **live wire + the map**. The site is the control room of the product:
the home hero shows the policy request log (the calls the gateway judged), and the connection
map below it shows which harness may reach which connector. Both figures are labelled samples
in the product's real data shapes — harness name, connector.tool, verdict, milliseconds.

## Type
- Display: **Rethink Sans** (`--font-outlier`, weight 560) — h1 and the wordmark.
- Body and UI: **Inter** (`--font-body`, 400–600).
- Figures: **JetBrains Mono** — request-log rows and map cells only.
- All faces self-hosted Latin woff2 subsets with OFL texts in `/fonts` (font-display: swap).

## Palette
Locked to `tokens.css` — the control-room scheme shared with the ARMS app (`ARMS-app/DESIGN.md`):
paper day + graphite night, one moss accent, hairline rules, `ok`/`no` verdict colours only.
No new colour is invented in page styles.

## The two figures
- `.trace` — a `figure`/list grid: harness (muted), call (ink), verdict (ok/no), ms (muted).
  Monospace rows, hairline row rules, card chrome.
- `.map` — a `figure`/table: harness rows × connector columns, each cell a pill
  (`allow`/`off`) in mono. `tabindex="0"` — it can overflow on narrow widths and must stay
  keyboard-scrollable.

## Motion
Press on press-down: small squash (~4%), restrained spring ≈5% overshoot settling ≈350 ms;
keyboard presses and `prefers-reduced-motion` never animate. Ghost buttons take the squash above;
the UIFoundry primary CTA settles 1px on press and otherwise only fades.

## Do / don't
- Do keep verdicts in the product's own words (ALLOWED, DENIED_TOOL, RATE_LIMITED_TOOL).
- Do keep every figure a real `figure` + `figcaption` with an aria-label.
- Don't invent numbers, quotes, logos or client names — the claim set lives in `src/claims.ts`.
- Don't add a third display face or a second accent.
- Don't ship a personal email anywhere; contact is the public issue page.
