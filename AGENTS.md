# Agent Instructions

> 🚨 **Before deploying or touching any production container**, read [.claude/production-containers.md](./.claude/production-containers.md).
> .NET Edition user-facing SPA = `nexus-react-frontend` container on port `5210`, image `nexus-react-frontend:prod`, built from `apps/react-frontend/Dockerfile.prod`. Raw `docker run` — **not** `docker compose`. Never touch the Laravel Edition (blue/green PHP) containers from this repo.

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
Make the ASP.NET backend contract-compatible with the Laravel React frontend:
same methods, paths, `/api/v2` aliases where expected, request/response shapes,
auth/tenant/upload behavior, status codes, and validation/error envelopes.
Prove compatibility with a route/API matrix and runtime smoke tests.

The separate `apps/web-uk/` surface is the explicitly approved shared
accessible frontend implementation target. For that workstream, Laravel Blade
defines the browser experience and the Laravel backend defines the API
contract. ASP.NET is incomplete and is not a source of truth for Web UK. Web UK
work must not modify ASP.NET backend source/migrations or Laravel source/schema/
ordinary local database, and it must not introduce backend-specific frontend
branches.

Before starting or resuming `apps/web-uk` work, read
[`apps/web-uk/docs/CURRENT_LARAVEL_FIRST_PARITY_STATUS.md`](./apps/web-uk/docs/CURRENT_LARAVEL_FIRST_PARITY_STATUS.md).
It contains the current blocker set, concurrent-session ownership boundaries,
and ordered Laravel-first completion queue. Older handoffs contain useful
history but stale live metrics.

This pointer exists because keeping `AGENTS.md` and `CLAUDE.md` in sync as
separate copies caused drift. Edit `CLAUDE.md` for authoritative project
instructions. Keep only urgent first-read guardrails duplicated here.
