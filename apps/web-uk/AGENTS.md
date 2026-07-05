# Agent Instructions For apps/web-uk

Authoritative instructions for this accessible frontend live in
[CLAUDE.md](./CLAUDE.md). Read that file before editing.

Urgent first-read rules:

- `apps/web-uk` is the future shared accessible frontend candidate, not the
  current production accessible frontend.
- The Laravel Blade accessible frontend is the visual and workflow source of
  truth:
  `C:\platforms\htdocs\staging\accessible-frontend`.
- Do not claim production readiness or shared-frontend readiness from skeleton
  work.
- Use GOV.UK Frontend and GOV.UK Design System patterns, but do not use GOV.UK
  crown, logotype, `govukHeader`, `govukFooter`, Open Government Licence blocks,
  Crown copyright wording, or any copy implying this is a government service.
- Keep the app HTML-first and progressively enhanced. No React, Vue, Next.js, or
  client-side routing.
- Run brand checks and focused tests after shell/layout changes.

Preparation docs that future agents must keep current:

- `docs/LARAVEL_ACCESSIBLE_ROUTE_MATRIX.md`
- `docs/BLADE_COMPONENT_PORT_AUDIT.md`
- `docs/BACKEND_SWITCHING_CONTRACT.md`
