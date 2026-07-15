# Project NEXUS - .NET Edition

> **Status: Experimental / Development Alpha.** The repository is not
> production-ready. The development pause and cold-start handoff are recorded
> separately; APIs, schemas, and behavior may change in a future authorized
> phase.

The experimental ASP.NET Core 8 backend for Project NEXUS, a
timebanking/community platform. Laravel remains the production and contract
source of truth. This backend must become an externally contract-identical,
switchable implementation:
the unchanged canonical React frontend and the unchanged shared accessible Web
UK frontend must ultimately run against either Laravel or ASP.NET by changing
configuration only.

The binding decision is
[`ADR-0001`](docs/decisions/ADR-0001-contract-identical-backends.md). Historical
uses of "parity," "compatible," or "contract-correct" are shorthand for that
stronger externally observable identity standard, not permission for an
approximately similar API.

Current local Laravel parity source: `C:\platforms\htdocs\staging`.

`apps/web-uk` is a distinct shared accessible frontend implementation stored in
this repository. Laravel Blade defines its browser experience and the Laravel
backend defines its API contract. The experimental ASP.NET backend is not a
source of truth for Web UK; a separate contract-identity workstream must make
ASP.NET externally contract-identical before the same unchanged frontend can
switch to it. See
[`apps/web-uk/docs/CURRENT_LARAVEL_FIRST_PARITY_STATUS.md`](apps/web-uk/docs/CURRENT_LARAVEL_FIRST_PARITY_STATUS.md).

Current status is deliberately split by workstream:

- [`docs/PROJECT_PAUSE_HANDOFF_2026-07-15.md`](docs/PROJECT_PAUSE_HANDOFF_2026-07-15.md)
  is the first document to read after the 15 July 2026 development pause. It
  records the exact cold-start boundary and does not authorize resumption.
- [`docs/CURRENT_ASPNET_CONTRACT_STATUS.md`](docs/CURRENT_ASPNET_CONTRACT_STATUS.md)
  is the current ASP.NET contract-identity score, evidence boundary, and
  remaining queue.
- [`apps/web-uk/docs/CURRENT_LARAVEL_FIRST_PARITY_STATUS.md`](apps/web-uk/docs/CURRENT_LARAVEL_FIRST_PARITY_STATUS.md)
  is the current accessible-frontend score, evidence boundary, and remaining
  queue.
- [`docs/FULL_PARITY_REMEDIATION_RUNBOOK.md`](docs/FULL_PARITY_REMEDIATION_RUNBOOK.md)
  defines the fixed completion rubric and the end-to-end two-by-two gate.

## Credits and Origins

### Creator

This software was created by **Jasper Ford**.

### Founders

The originating time bank initiative [hOUR Timebank CLG](https://hour-timebank.ie)
was co-founded by:

- **Jasper Ford**
- **Mary Casey**

### Contributors

- **Steven J. Kelly** - Community insight, product thinking
- **Sarah Bird** - CEO, Timebanking UK

### Research Foundation

This software is informed by and builds upon a social impact study commissioned
by the **West Cork Development Partnership**.

### Acknowledgements

- **West Cork Development Partnership**
- **Fergal Conlon**, SICAP Manager

## License

This software is licensed under the **GNU Affero General Public License version
3** (AGPL-3.0-or-later).

The AGPL requires that if you run a modified version of this software on a
server and let others interact with it, you must make your source code available
to those users.

See [LICENSE](LICENSE) for the full license text and [NOTICE](NOTICE) for
attribution requirements.

## Documentation

- [CLAUDE.md](CLAUDE.md) - authoritative agent guide, invariants, commands, and parity policy.
- [docs/PROJECT_PAUSE_HANDOFF_2026-07-15.md](docs/PROJECT_PAUSE_HANDOFF_2026-07-15.md) - canonical pause boundary, cold-start read order, restart prompts, and freeze record.
- [docs/README.md](docs/README.md) - maintained documentation index.
- [docs/user/README.md](docs/user/README.md) - backend-neutral member and end-user guidance.
- [docs/admin/README.md](docs/admin/README.md) - tenant and community administrator guidance.
- [docs/api/README.md](docs/api/README.md) - API consumer and integration contract guidance.
- [docs/system/README.md](docs/system/README.md) - developer, tester, security, configuration, and operations hub.
- [SUPPORT.md](SUPPORT.md) - product-support and defect-reporting boundaries.
- [SECURITY.md](SECURITY.md) - private vulnerability-reporting and safe-testing policy.
- [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) - participation standards and private conduct-reporting path.
- [CHANGELOG.md](CHANGELOG.md) - curated direction and pause-history index; not a current score source.
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) - .NET architecture and runtime map.
- [docs/CURRENT_ASPNET_CONTRACT_STATUS.md](docs/CURRENT_ASPNET_CONTRACT_STATUS.md) - current ASP.NET contract-identity status.
- [docs/CURRENT_SCHEMA_READINESS.md](docs/CURRENT_SCHEMA_READINESS.md) - current schema-chain verdict, evidence boundary, and safe restart sequence.
- [docs/FULL_PARITY_REMEDIATION_RUNBOOK.md](docs/FULL_PARITY_REMEDIATION_RUNBOOK.md) - fixed rubric and cross-workstream completion gate.
- [docs/DOCUMENTATION_GOVERNANCE.md](docs/DOCUMENTATION_GOVERNANCE.md) - canonical status hierarchy and documentation consistency rules.
- [docs/decisions/README.md](docs/decisions/README.md) - accepted architecture decisions, including the contract-identity correction.
- [docs/MODULES.md](docs/MODULES.md) - Laravel-to-.NET module map.
- [docs/LARAVEL_PARITY_MAP.md](docs/LARAVEL_PARITY_MAP.md) - canonical full-parity gap register.
- [docs/PARITY_BACKLOG.md](docs/PARITY_BACKLOG.md) - generated parity backlog rollup and implementation queue rules.
- [docs/API_PARITY.md](docs/API_PARITY.md) - API contract comparison notes.
- [docs/SCHEMA_PARITY.md](docs/SCHEMA_PARITY.md) - database table/entity/migration parity notes.
- [docs/FRONTEND_PARITY.md](docs/FRONTEND_PARITY.md) - React and accessible frontend route parity notes.
- [docs/LOCALIZATION_PARITY.md](docs/LOCALIZATION_PARITY.md) - locale, namespace, and translation-key parity notes.
- [docs/database-migrations.md](docs/database-migrations.md) - EF Core migration workflow.
- [docs/REGISTRATION_POLICY_ENGINE.md](docs/REGISTRATION_POLICY_ENGINE.md) - registration and identity-verification architecture.

## Quick Start

```powershell
Copy-Item .env.example .env
# Replace JWT_SECRET in .env with a local-only random value.
docker compose up -d db rabbitmq api
Invoke-RestMethod http://127.0.0.1:5080/health
```

Development Swagger is at `http://127.0.0.1:5080/swagger`. The API applies EF
migrations and loads fictitious development seed data at local startup. Read
[the local-development guide](docs/system/LOCAL_DEVELOPMENT.md) before starting
optional clients, resetting volumes, or overriding database configuration.

## Source Code

The complete source code for this project is available at:
<https://github.com/jasperfordesq-ai/api.project-nexus.net>
