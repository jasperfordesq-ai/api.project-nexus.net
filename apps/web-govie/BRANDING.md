# Branding and Non-Affiliation Disclaimer

## IMPORTANT: This is not a government service

**Nexus Community is NOT affiliated with, endorsed by, or operated by:**
- The Government of Ireland
- Any Irish government department or ministry
- Any Irish state agency or public body
- The Office of the Government Chief Information Officer (OGCIO)
- Any official Irish public-sector service

## What this project IS

Nexus Community is an independent, privately operated community time-exchange platform.

## GOV.IE Design System Usage

This frontend uses the following publicly available open-source packages:

| Package | Source | Purpose |
|---|---|---|
| `@govie-ds/react` | [npmjs.com/package/@govie-ds/react](https://www.npmjs.com/package/@govie-ds/react) | React UI components |
| `@govie-ds/theme-govie` | [npmjs.com/package/@govie-ds/theme-govie](https://www.npmjs.com/package/@govie-ds/theme-govie) | Theme CSS |

These packages are published under an open-source licence and are available for use by anyone.
See [github.com/ogcio/govie-ds](https://github.com/ogcio/govie-ds) for the upstream repository.

## What is INTENTIONALLY EXCLUDED

The following are deliberately not used in this project:

- Irish government logos or wordmarks
- The Irish state emblem (harp)
- Shamrock symbols or national symbols
- Official government colour palette (government gold `#FFDD00`)
- GOV.IE header/footer branding elements
- Any wording implying this is an official public service
- Any wording implying government endorsement
- Domain names or URLs associated with gov.ie

## Colour and Theme Overrides

The Nexus Community brand uses a **teal/amber** colour palette that is visually
distinct from any Irish government design palette:

- Primary: `#006B6B` (deep teal)
- Accent: `#C8640C` (warm amber)

These overrides are applied in `src/styles/main.css` via CSS custom properties.

## Legal

Use of open-source GOV.IE Design System packages does not imply any relationship
with or endorsement by the Irish government. The packages are licensed separately
from any trademark or trade dress of the Irish state.

## Developer Checklist

Before any deployment, verify:

- [ ] No Irish harp imagery present
- [ ] No official government wordmarks or logos present
- [ ] Footer non-affiliation disclaimer is visible on every page
- [ ] Phase banner ("Not a government service") is present
- [ ] No `gov.ie` domain references in outbound links
- [ ] App name and branding clearly identifies as "Nexus Community", not a government entity
