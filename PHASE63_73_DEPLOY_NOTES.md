# Phase 63-73 Deploy Notes

Operator addendum to `MASTER_DEPLOYMENT_CHECKLIST.md`. Read this **before**
deploying any commit from `fb4fcce` onward (2026-05-09 production-readiness
push). Lists everything that changed from a fresh-deploy perspective: new
env vars, new database migrations, new endpoints to verify, and rollback
notes.

If you're upgrading an existing deploy, run through the **Pre-deploy** and
**Verify post-deploy** sections. If you're doing a fresh deploy, follow
`MASTER_DEPLOYMENT_CHECKLIST.md` first, then this doc.

---

## What changed at a glance

| Subsystem | Status |
|---|---|
| Cron / scheduled jobs | **9 new BackgroundService instances auto-register at startup** |
| Email transport | **SendGrid + Gmail SMTP fallback** (Mailchimp removed) |
| ID verification | **Stripe Identity is sole production provider** |
| AI providers | **Multi-provider abstraction** (Ollama / Anthropic / OpenAI / Gemini) |
| Federation protocols | **CreditCommons + Komunitin clients + native ingest + hour-transfer reconciliation** |
| Donations | **New Stripe Checkout fiat-donation flow** + webhook reconciliation |
| Push notifications | **Native FCM + Web-Push provider routing** |
| Email templates | **Versioned templates** under `/api/admin/email-templates/v2` |
| Volunteer long-tail | **Expenses, Wellbeing, Certificates, Emergency Alerts** |
| Generic bookmarks | New cross-content-type bookmark system |
| Peer endorsements | New "I vouch for this person" flow |
| Presence | New heartbeat-based last-seen system |
| Sitemap / SEO | New `/sitemap.xml` + `/robots.txt` + `/api/seo/canonical` |
| Observability | **Request correlation middleware** + **/api/admin/system/diagnostics** |

---

## EF Core migrations

The app auto-applies migrations on startup via `db.Database.MigrateAsync()`.
**Four new migrations** must run on first boot of this version:

1. `20260509091250_Phase65VolunteerLongTail` — adds `volunteer_expenses`,
   `volunteer_wellbeing`, `volunteer_certificates`,
   `volunteer_emergency_alerts` + version columns on `email_templates`
2. `20260509094316_Phase68FederationProtocols` — adds
   `federated_hour_transfers`
3. `20260509095935_Phase72LongTail` — adds `money_donations`, `bookmarks`,
   `bookmark_collections`, `peer_endorsements`, `user_presence`

> **Pre-deploy DB check**: `docker compose exec api dotnet ef migrations list`
> should show all three pending. After deploy, the new admin diagnostics
> page (`/admin/system/diagnostics`) shows applied + pending migrations.

> **Rollback note**: each migration is reversible
> (`docker compose exec api dotnet ef database update <previous-migration>`).
> No data loss for the new tables (they start empty).

---

## New environment variables

All optional — features degrade gracefully when unset. Existing deploys keep
working with the existing config.

### Email (SendGrid + Gmail fallback)

```bash
# Enable SendGrid as primary (else Gmail is used directly)
SendGrid__Enabled=true
SendGrid__ApiKey=<your-sendgrid-api-key>

# Gmail fallback already configured in your existing deploy
# (Gmail__RefreshToken etc. — no change)
```

**Test post-deploy**: trigger any email (e.g. password reset). If SendGrid
is configured + healthy, it delivers. If SendGrid 5xx's, FallbackEmailService
silently retries via Gmail. Both paths log to `EmailLogs` (visible in the
admin Email Templates UI).

### Stripe (donations + ID verification)

```bash
Stripe__SecretKey=<your-stripe-secret-key>      # sk_live_ prefix in production
# Webhook signature verification (production-required for security):
Stripe__WebhookSecret=<your-stripe-webhook-secret>     # whsec_ prefix
# OR per-endpoint:
Stripe__WebhookSecret_Donations=<per-endpoint-secret>
```

**Webhook URL to register in Stripe dashboard**:
`https://api.project-nexus.net/api/webhooks/stripe/donations`

**Events to subscribe**:
- `checkout.session.completed`
- `payment_intent.payment_failed`
- `charge.refunded`

**Without webhook secret**: the controller logs a warning and accepts
unsigned payloads (preserves local-dev). **In production, set the secret**
or you risk forged donation completions.

### AI providers (Phase 69)

```bash
# Pick one to be the active resolver. "ollama" (default) needs no API key.
Ai__Provider=anthropic   # or openai / gemini / ollama

Ai__Anthropic__ApiKey=<your-anthropic-key>     # sk-ant- prefix
Ai__Anthropic__Model=claude-3-5-sonnet-latest
Ai__Anthropic__MaxTokens=1024

Ai__OpenAI__ApiKey=<your-openai-key>            # sk- prefix
Ai__OpenAI__Model=gpt-4o-mini

Ai__Gemini__ApiKey=<your-gemini-key>
Ai__Gemini__Model=gemini-1.5-flash-latest
```

**Test post-deploy**: open `/admin/ai-providers` → click "Run test" → expect
a successful response from the configured provider. If any returns
"provider_not_configured", set the corresponding API key.

### Push notifications (FCM + Web-Push)

```bash
# FCM (Android, iOS via Firebase Cloud Messaging)
Firebase__ServerKey=<your-firebase-server-key>
# (or legacy: Fcm__ServerKey)

# Web-Push (browser, RFC 8030 — VAPID minimal mode)
Vapid__PublicKey=<your-vapid-public-key>
Vapid__PrivateKey=<your-vapid-private-key>
```

**Note on Web-Push**: V2 currently sends the empty-body Web-Push pattern
(service worker fetches payload via a separate authenticated route). Full
VAPID JWT signing + ECE encryption is on the roadmap.

### Scheduled jobs (Phase 63)

All 9 hosted services auto-register and start on container boot. They
respect per-job kill switches:

```bash
# Disable any individual job
Scheduled__SyncFederationPartners__Enabled=false
Scheduled__PruneFederationLogs__Enabled=false
Scheduled__CheckInactiveGroups__Enabled=false
Scheduled__PollStuckIdentityVerifications__Enabled=false
Scheduled__SafeguardingSlaEscalate__Enabled=false
Scheduled__MarkOverdueDues__Enabled=false
Scheduled__PruneLogs__Enabled=false
Scheduled__GenerateMonthlyReports__Enabled=false
Scheduled__ReconcileFederatedHourTransfers__Enabled=false

# Override interval (minutes)
Scheduled__SyncFederationPartners__IntervalMinutes=120

# PruneLogs retention (days)
Scheduled__PruneLogs__NotificationDays=180
Scheduled__PruneLogs__EmailLogDays=90
Scheduled__PruneLogs__AuditDays=365
```

**Default intervals**: Reconcile 5min · Federation sync 1h · ID verify poll
30min · Safeguarding SLA 1h · Overdue dues 6h · Inactive groups + log prune
+ monthly reports 24h.

### Sentry (already configured)

```bash
Sentry__Dsn=<your-sentry-dsn>
Sentry__TracesSampleRate=0.1
Sentry__SendDefaultPii=false   # leave false in production
```

---

## Verify post-deploy

### 1. Health check (load balancer probe)

```bash
curl https://api.project-nexus.net/health
# Expect: {"status":"Healthy","checks":[{"name":"npgsql","status":"Healthy",...}]}
```

If status is `Unhealthy` for npgsql, the database is unreachable. Stop the
deploy and investigate before letting traffic in.

### 2. Request correlation working

```bash
curl -H "X-Request-Id: deploy-test-$(date +%s)" -i https://api.project-nexus.net/health
# Response should echo the same X-Request-Id header back.
```

### 3. Admin diagnostics endpoint (the deploy ground-truth view)

Open `https://platform.project-nexus.net/admin/system/diagnostics` as an
admin. Verify:

- **Verdict banner = green "All systems operational"**
- **Database** section: `Connected: Yes`, `Pending migrations: 0`. If you
  see pending migrations, the auto-migrate didn't run — investigate
  before continuing.
- **Hosted services** table: all 9 jobs visible. After ~5 minutes
  (StartupDelay), each should show `Last started` ≠ "never". `Status` should
  be `idle` (just finished a tick) or `running` (currently in a tick).
  **`Consecutive failures` should be 0** for every job. If any shows ≥1,
  click through to the relevant feature page to see the error context.
- **External services**: confirm the providers you set above show
  `configured: true` for the keys you populated.

### 4. Smoke test the new write paths

| Path | Test |
|---|---|
| Stripe donations | Trigger a test donation via `/donate` → `/api/donations/checkout`. Stripe redirects to success URL. Webhook arrives → admin `/admin/donations` shows `Succeeded`. |
| Email fallback | Trigger password reset. `EmailLogs` table gets a new row. |
| AI provider | `/admin/ai-providers` → "Run test" → response in the success pane. |
| Federation hour transfer | `/admin/federation/transfers` → "Reconcile now". Result shows `advanced/failed/givenUp` counts. |
| Volunteer expenses | Submit a test expense as a member, approve as admin → status = Reimbursed. |

### 5. Auth gate spot-checks

```bash
# Anonymous → 401
curl -i https://api.project-nexus.net/api/admin/system/diagnostics
# Member token → 403 (substitute a real member token)
curl -i -H "Authorization: Bearer <member>" https://api.project-nexus.net/api/admin/system/diagnostics
# Admin token → 200
curl -i -H "Authorization: Bearer <admin>" https://api.project-nexus.net/api/admin/system/diagnostics
```

---

## Rollback

If anything goes wrong:

```bash
# 1. Revert the deploy
ssh <user>@<production-host>
cd /opt/nexus-backend
sudo git log --oneline -5  # find the previous good commit
sudo git checkout <previous-commit>
sudo docker compose build api
sudo docker compose up -d api

# 2. Roll back migrations IF the new code wrote rows the old code can't read
# (extremely unlikely — Phase 63-73 only ADDS tables/columns; no schema changes
# to existing tables). Only needed if a Phase 63-73 hotfix is reverted.
docker compose exec api dotnet ef database update 20260508161219_AddStoriesParity
```

**Forward-compatible**: the new tables (`volunteer_*`, `federated_hour_transfers`,
`money_donations`, `bookmarks`, `bookmark_collections`, `peer_endorsements`,
`user_presence`) are NOT read by the old code path; rolling back the
container without rolling back the schema is safe.

---

## Known limitations / not yet production-grade

| Item | Workaround until shipped |
|---|---|
| Web-Push full VAPID JWT + ECE encryption | Push delivers an empty notification; service worker fetches payload via separate authed route. Functional but suboptimal. |
| Real audit trail for parity controller writes | Some `AdminCompatibility*` writes persist as JSON in `TenantConfig` instead of typed entities. Read paths work; long-term, replace with real entities. |
| 8 of the 22 admin parity stubs still unwired | Backend exists for half of these — no functional impact for tenants who don't use those features. |
| Marketplace / Caring Community / Verein-Clubs / Regional Analytics | All explicitly OOS. Ignore the related sidebar entries (most are gated by feature flags). |

---

## Operator runbook: what to do when something is wrong

| Symptom | First check | Then |
|---|---|---|
| Verdict = `degraded` on diagnostics | Pending migrations? Failing jobs? | If migrations: restart container. If jobs: click through to the failing job's domain page. |
| Verdict = `critical` | DB connection (Phase 1: is the postgres container running?) | `docker compose logs api \| tail -100` to find the real error. |
| Donations stuck in `Pending` | Stripe webhook reaching the API? Signature configured? | Inspect `/admin/donations` for the row's `failure_reason`. Re-deliver from Stripe dashboard. |
| Federated hour transfer stuck | `/admin/federation/transfers` shows `failure_reason` per row | Common: `partner_endpoint_not_configured` (set TenantConfig key `federation.partner.{id}.endpoint`). |
| Admin reports an error | They include the `X-Request-Id` from their browser network tab | `docker compose logs api \| grep <request-id>` — every entry from auth → controller → DB carries the same id. |
| AI feature fails silently | `/admin/ai-providers` → click "Run test" on each | Surfaces `provider_not_configured` or transport errors. |

---

Last updated: 2026-05-09 (sessions 1-11 production-readiness push).
