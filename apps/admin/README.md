# NEXUS Admin Panel

Last reviewed: 2026-07-14

Status: **Maintained reference — secondary admin surface, not a parity authority**

This is the repository's standalone React/TypeScript administration client. It
is a secondary surface: Laravel and its canonical React client define product
and API-contract behavior, while the two primary unchanged-client switching
targets are documented in [`../../docs/ARCHITECTURE.md`](../../docs/ARCHITECTURE.md).
The existence of an admin route or page module does not certify its payload,
authorization, tenant, error, side-effect, or runtime parity.

## Local Development

From `apps/admin`:

```bash
npm install
npm run dev
```

The Vite development server uses port `5190`. Its default API target is
`http://localhost:5080`; start a suitable local ASP.NET backend separately.

The local Compose file offers development and production-image test profiles:

```bash
docker compose up
docker compose --profile production up
```

Both commands are **local only**. The second builds the production image on
local port `5191`; it is not a production deployment procedure. Before any real
production-container action, obtain explicit authorization and read
[`../../.claude/production-containers.md`](../../.claude/production-containers.md).

## Verification

```bash
npm test
npm run build
```

## Current Source Inventory

Snapshot: repository commit
`9c5fb1a46c40e4986c8f973075164b1d74bd101d`, inspected 2026-07-14.

- `src/App.tsx` is the route-registration source.
- `src/pages/` contains 55 page source files in this snapshot.
- CRM, Blog, Broker, Email Templates, Events, Gamification, Groups, Matching,
  Jobs, Notifications, Organisations, Pages CMS, Search Admin, Translations,
  Vetting, and the other modules imported under the `Full pages` block are real
  routed page modules, not the old stub list.
- `src/components/common/page-stub.tsx` remains in the tree but has no source
  consumer. Do not infer a live stub route from that unused component.
- Several compatibility routes intentionally reuse a shared full page or
  `CompatAdminPage`; route presence still is not workflow certification.

Regenerate these observations from `src/App.tsx` and `src/pages/` after either
moves; do not manually preserve the file count as a completion percentage.

## Stack And Contract Boundary

The checked-in package currently uses React 18, TypeScript 5.6, Vite 6, Refine
4/5 packages, Ant Design 5, React Router 6, Axios, and Vitest. Authentication is
JWT-based, and tenant/role behavior must be verified against the current
backend contract rather than inferred from this README.

Local seeded credentials, when the matching development fixtures are loaded,
are environment fixtures rather than production accounts. Consult the active
local setup documentation before relying on them.

## License

AGPL-3.0-or-later. See [`LICENSE`](../../LICENSE) and
[`NOTICE`](../../NOTICE).
