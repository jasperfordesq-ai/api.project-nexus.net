# Dependabot Triage Notes

GitHub reports **37 open Dependabot vulnerabilities** on `main` (15 high, 20
moderate, 2 low) — visible at
<https://github.com/jasperfordesq-ai/api.project-nexus.net/security/dependabot>.

The Dependabot alerts API requires elevated permissions on the personal
access token used by automated tooling, so the alert list isn't available
to script-driven triage. This doc is the manual playbook for working
through them safely.

## Why this is deferred to a CI-equipped session

Blind dependency bumps are a common production-incident root cause. Without
a CI pipeline that runs the test suite on each `package.json` / `.csproj`
change, a "fix" can quietly regress a real flow. **Do not bump
dependencies without verification.**

What "verification" means concretely:

1. The full backend integration suite (`Nexus.Api.Tests`) passes on the
   bumped tree.
2. The `react-frontend` `tsc --noEmit` passes (currently clean for src code
   per session 11).
3. A staging deploy survives the diagnostics page's "Run live probes"
   button (Stripe / AI / SendGrid / DB all green).

Until that pipeline exists, bumps go through this manual triage.

## Surface area

| Project | Manifest | Direct deps |
|---|---|---|
| Backend API | `src/Nexus.Api/Nexus.Api.csproj` | 24 NuGet packages |
| Messaging | `src/Nexus.Messaging/*.csproj` | ~7 NuGet packages |
| Backend tests | `tests/Nexus.Api.Tests/*.csproj` | (not in production runtime) |
| React frontend | `apps/react-frontend/package.json` | 34 deps + 25 devDeps |
| Admin app | `apps/admin/package.json` | (separate Refine app) |
| GOV.UK frontend | `apps/web-uk/package.json` | (Express/Node) |

The 37 vulnerabilities are almost certainly concentrated in
**transitive npm dependencies** of `react-frontend` / `admin` / `web-uk`.
The .NET surface is small (24 + 7 packages, mostly Microsoft-published)
and unlikely to account for >5 of the 37.

## Triage procedure (per alert)

1. **Identify the alert** in the GitHub Security → Dependabot tab. Note:
   - Severity (focus on Critical + High first)
   - The vulnerable package + version range
   - The advisory's `Patched in` version
   - **Exploit prerequisites** — many "high" vulnerabilities only fire in
     specific config (e.g. only when running as root, only when feature X
     is enabled). Read the GHSA detail; many high-severity vulns are
     non-applicable to our usage.

2. **Find the dependency root** — direct or transitive?
   ```
   # npm: shows the chain
   npm why <package>
   # NuGet: dotnet list package --include-transitive
   dotnet list src/Nexus.Api/Nexus.Api.csproj package --include-transitive
   ```

3. **Pick a fix strategy:**
   - **Direct dep, semver-compatible patch** (e.g. `4.1.2` → `4.1.7`):
     bump the version in the manifest. Run tests + tsc.
   - **Direct dep, breaking change required**: open a backlog item; do not
     bump in this triage.
   - **Transitive via outdated direct dep**: bump the direct parent's
     minor version. If parent has its own breaking change, backlog.
   - **Transitive via up-to-date direct dep**: use npm `overrides` /
     pnpm `overrides` to pin the transitive child to the patched version.
     This is brittle — verify nothing relies on the old child API.
   - **Not exploitable in our config**: dismiss with a documented reason
     in the GitHub Dependabot tab.

4. **Verify the bump:**
   ```
   # Backend
   dotnet build src/Nexus.Api/Nexus.Api.csproj --nologo -v quiet
   dotnet build tests/Nexus.Api.Tests/Nexus.Api.Tests.csproj --nologo -v quiet
   dotnet test tests/Nexus.Api.Tests/Nexus.Api.Tests.csproj --nologo --filter Category!=Integration

   # Frontend
   cd apps/react-frontend
   npm install                       # regenerates lockfile
   npx tsc --noEmit -p .              # type-check
   npm run build                     # production bundle
   ```

5. **Smoke test in dev Docker:**
   ```
   docker compose up -d --build api
   curl http://localhost:5080/health   # expect Healthy
   ```

6. **Commit per package** — never batch unrelated bumps. The commit
   message should reference the GHSA / CVE id so the security tab can be
   updated by the bot.

## Triage priority by domain

When the alert list is available, work through it in this order. Each row
roughly corresponds to "blast radius if exploited".

| Tier | Domain | Rationale |
|---|---|---|
| 1 | Auth-related (`System.IdentityModel.Tokens.Jwt`, JWT libraries) | Token forgery → full account takeover |
| 1 | DB driver (`Npgsql.EntityFrameworkCore.PostgreSQL`) | SQL injection / RCE in driver |
| 1 | HTTP servers (Kestrel — bundled with .NET; rare) | RCE / DoS at the entry point |
| 1 | Cryptography helpers | Signature bypass / key leak |
| 2 | JSON / serialization | Deserialization gadgets |
| 2 | Stripe / payment SDK | Webhook spoof / refund bypass |
| 2 | Email — SendGrid / MimeKit | Spoofing / template injection |
| 2 | Sentry | Sensitive-data leak in error reports |
| 3 | UI libraries (`@heroui/react`, `@dnd-kit/*`) | Mostly XSS, scoped to admin who is already authenticated |
| 3 | Build tooling (`vite`, `vitest`, `eslint`) | Dev-only, not production |
| 4 | Type definitions (`@types/*`) | Compile-only, no runtime |

## Known good versions (as of 2026-05-09)

These are the explicit versions in the .NET project files. Matches against
upstream advisories should target these or higher:

```
Npgsql.EntityFrameworkCore.PostgreSQL  8.0.11
Microsoft.EntityFrameworkCore.Design   8.0.11
Microsoft.AspNetCore.Authentication.JwtBearer  8.0.11
System.IdentityModel.Tokens.Jwt        8.16.0
AspNetCore.HealthChecks.NpgSql         8.0.2
BCrypt.Net-Next                        4.1.0
Swashbuckle.AspNetCore                 6.5.0
System.Threading.RateLimiting          8.0.0
Microsoft.Extensions.Http.Polly        8.0.11
Polly.Extensions.Http                  3.0.0
Asp.Versioning.Mvc                     8.1.1
Asp.Versioning.Mvc.ApiExplorer         8.1.1
Serilog.AspNetCore                     8.0.0
Serilog.Sinks.Console                  5.0.1
Serilog.Sinks.File                     5.0.0
Serilog.Enrichers.Environment          2.3.0
Serilog.Enrichers.Thread               3.1.0
Microsoft.AspNetCore.SignalR.Common    8.0.11
MimeKit                                4.15.1
Fido2.AspNet                           4.0.0
Otp.NET                                1.4.1
SendGrid                               9.29.3
Sentry.AspNetCore                      4.12.1
```

`Microsoft.AspNetCore.*` 8.0.11 is the latest 8.0 LTS patch as of the
ecosystem snapshot used here. If a Dependabot alert recommends 8.0.x for
x > 11, bump.

## Frontend overrides hint

If the alert is on a transitive npm dep that the direct parent hasn't yet
upgraded, the safest mechanical fix is an `overrides` block in
`apps/react-frontend/package.json`:

```json
{
  "overrides": {
    "<vulnerable-package>": "<patched-version>"
  }
}
```

After adding, run `npm install` to regenerate `package-lock.json` and
verify both `tsc --noEmit` and `npm run build` still pass. If the
override breaks anything, the upstream parent really did need that older
version — back it out and backlog the alert with that note.

## Action items (when CI is available)

- [ ] Pull the 37-alert list from `github.com/.../dependabot` UI.
- [ ] Categorize by tier (table above).
- [ ] Bump tier-1 alerts first, one per commit, with full verification.
- [ ] For tier-3 + tier-4, batch-update via `npm-check-updates` then
      verify in one CI run.
- [ ] Document any dismissals in the GitHub UI with rationale.

---

Last updated: 2026-05-09 (session 12 production-readiness pass).
Linked from `CLAUDE.md` Documentation section.
