# Project NEXUS - .NET Edition

> **Status: Experimental / Development Alpha** - under active development.
> APIs, schemas, and behavior may change without notice. Not recommended for
> production use.

The experimental ASP.NET Core 8 backend for Project NEXUS, a
timebanking/community platform. It is a next-generation .NET implementation that
shares frontend goals with the canonical Laravel Edition, which remains the
production source of truth.

Current local Laravel parity source: `C:\platforms\htdocs\staging`.

`apps/web-uk` is a distinct shared accessible frontend implementation stored in
this repository. Laravel Blade defines its browser experience and the Laravel
backend defines its API contract. The experimental ASP.NET backend is not a
source of truth for Web UK; a separate parity workstream must make ASP.NET
compatible before the same unchanged frontend can switch to it. See
[`apps/web-uk/docs/CURRENT_LARAVEL_FIRST_PARITY_STATUS.md`](apps/web-uk/docs/CURRENT_LARAVEL_FIRST_PARITY_STATUS.md).

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
- [docs/README.md](docs/README.md) - maintained documentation index.
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) - .NET architecture and runtime map.
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

```bash
docker compose up -d
open http://localhost:5080/swagger
```

## Source Code

The complete source code for this project is available at:
<https://github.com/jasperfordesq-ai/api.project-nexus.net>
