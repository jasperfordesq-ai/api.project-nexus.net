# Agent Instructions

This file exists for agentic tools (OpenAI Codex, etc.) that read `AGENTS.md` by convention.

**Authoritative project instructions live in [CLAUDE.md](./CLAUDE.md).** Read that
file. It is the single source of truth for:

- What this project is and what's out of scope
- Architectural invariants (JWT, tenant isolation, CORS, FIDO2)
- Current phase status and module-by-module implementation
- Database, commands, local-dev setup, API endpoints
- Frontend parity target and admin panel guidance

This pointer exists because keeping `AGENTS.md` and `CLAUDE.md` in sync as
separate copies caused drift. Edit `CLAUDE.md` only.
