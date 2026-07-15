# Agent Instructions

> 🚨 **Before deploying or touching any production container**, read [.claude/production-containers.md](./.claude/production-containers.md).
> The currently deployed .NET Edition SPA is the `nexus-react-frontend`
> container on port `5210`, image `nexus-react-frontend:prod`, built from
> `apps/react-frontend/Dockerfile.prod`. That is an operational fact, not a
> source-of-truth decision: `apps/react-frontend` is frozen and the canonical
> React client lives in the Laravel repository. Any explicitly authorized
> redeploy uses raw `docker run`, **not** `docker compose`. Never touch the
> Laravel Edition (blue/green PHP) containers from this repo.

This file exists for agentic tools (OpenAI Codex, etc.) that read `AGENTS.md` by convention.

**Authoritative project instructions live in [CLAUDE.md](./CLAUDE.md).** Read that
file. It is the single source of truth for:

- What this project is and what's out of scope
- Architectural invariants (JWT, tenant isolation, CORS, FIDO2)
- Current phase status and module-by-module implementation
- Database, commands, local-dev setup, API endpoints
- Frontend parity target and admin panel guidance

## Emergency Frontend Guardrail

The React frontend in this repo (`apps/react-frontend/`) is now a legacy,
frozen copy. Do not modify frontend files unless the user explicitly approves
that specific frontend change.

The canonical React frontend lives in the Laravel repo at
`C:\platforms\htdocs\staging\react-frontend`. Laravel is the source of truth.
Make the ASP.NET backend externally contract-identical to the Laravel contracts
consumed by the React frontend:
same methods, paths, `/api/v2` aliases where expected, request/response shapes,
auth/tenant/upload behavior, status codes, and validation/error envelopes.
Prove contract identity with a route/API matrix and runtime smoke tests.

The binding definition is
[`docs/decisions/ADR-0001-contract-identical-backends.md`](./docs/decisions/ADR-0001-contract-identical-backends.md).
Historical "parity" or "compatible" wording is shorthand only; it does not
permit observable differences or frontend workarounds.

The separate `apps/web-uk/` surface is the explicitly approved shared
accessible frontend implementation target. For that workstream, Laravel Blade
defines the browser experience and the Laravel backend defines the API
contract. ASP.NET is incomplete and is not a source of truth for Web UK. Web UK
work must not modify ASP.NET backend source/migrations or Laravel source/schema/
ordinary local database, and it must not introduce backend-specific frontend
branches.

The ordinary local Laravel database is a confidential production-derived
snapshot. Never run Laravel migrations or live mutation/upload/download/delete
tests against it, even when a test claims to use disposable rows or cleanup.
Use mocked frontend contract tests or a separately provisioned disposable
Laravel environment. The canonical Hour Timebank URL is
`/hour-timebank/accessible`; `/hour-timebank/alpha` is redirect-only.

Before starting or resuming `apps/web-uk` work, read
[`apps/web-uk/docs/CURRENT_LARAVEL_FIRST_PARITY_STATUS.md`](./apps/web-uk/docs/CURRENT_LARAVEL_FIRST_PARITY_STATUS.md).
It contains the current blocker set, concurrent-session ownership boundaries,
and ordered Laravel-first completion queue. Older handoffs contain useful
history but stale live metrics.

This pointer exists because keeping `AGENTS.md` and `CLAUDE.md` in sync as
separate copies caused drift. Edit `CLAUDE.md` for authoritative project
instructions. Keep only urgent first-read guardrails duplicated here.

Current workstream status is intentionally split. Read
[`docs/CURRENT_ASPNET_CONTRACT_STATUS.md`](./docs/CURRENT_ASPNET_CONTRACT_STATUS.md)
for the backend banked score/evidence boundary and
[`apps/web-uk/docs/CURRENT_LARAVEL_FIRST_PARITY_STATUS.md`](./apps/web-uk/docs/CURRENT_LARAVEL_FIRST_PARITY_STATUS.md)
for Web UK. The older `CURRENT_*_HANDOFF.md` files are historical archives and
must not supply a current score or resume queue.
