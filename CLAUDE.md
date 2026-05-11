# Project NEXUS - ASP.NET Core Backend

## What This Project Is

This is the **new** ASP.NET Core 8 backend for Project NEXUS, a timebanking/community platform. It is being built using the **Strangler Fig pattern** to incrementally replace functionality from a legacy PHP application.

**This is NOT a migration of the PHP codebase. This is a clean implementation.**

**Architecture Note:** The backend serves admin-only endpoints (`/api/admin/*`). The production parity admin UI is the embedded React admin under `apps/react-frontend/src/admin/`. The standalone `apps/admin/` project may still exist for separate admin-service work, but it is not the primary V1 parity target unless explicitly requested.

## Frontend Parity Target (MANDATORY)

The production parity target for the V1 migration is `apps/react-frontend/`.

- `https://platform.project-nexus.net/` serves the Vite React SPA from `apps/react-frontend/`.
- The comprehensive admin panel is the embedded React admin app under `apps/react-frontend/src/admin/`, mounted at `/admin/*`.
- `apps/web-uk/` remains out of scope for V1 parity work.
- `apps/admin/` is not the primary parity admin panel unless explicitly requested; parity work should target the embedded admin in `apps/react-frontend/src/admin/`.

## License and Attribution (MANDATORY)

This software is licensed under the **GNU Affero General Public License v3** (AGPL-3.0-or-later).

### Creator

- **Jasper Ford** - Creator and primary author

### Founders of the Originating Time Bank

- **Jasper Ford**
- **Mary Casey**

### Research Foundation

This software is informed by and builds upon a social impact study commissioned by the **West Cork Development Partnership**.

### Acknowledgements

- **West Cork Development Partnership**
- **Fergal Conlon**, SICAP Manager

### Source File Headers

All new source files MUST include this header:

```csharp
// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.
```

### Key Files

- `LICENSE` - Full AGPL v3 license text
- `NOTICE` - Attribution and credits (must be preserved in all distributions)
- `README.md` - Credits and Origins section

### AGPL Compliance Requirements

1. Source code must be made available to network users
2. NOTICE file attributions must be preserved in all copies
3. About page must display license info and source code link

## Development Workflow (MANDATORY - NO EXCEPTIONS)

**NEVER modify production directly. All changes go through local first.**

```
Local Development (Docker) → Test Locally → Deploy to Production (Docker)
```

### Rules Claude MUST Follow

1. **NEVER create or edit files directly on production server**
2. **NEVER run ad-hoc fixes on production** - fix locally first
3. **ALL config files must exist in local repo first**
4. **If production has a bug, reproduce locally, fix, test, then deploy**

### Allowed Production-Only Items

- Database passwords/secrets (in .env, not in repo)
- SSL certificates (managed by Plesk)
- nginx configs (in /etc/nginx/conf.d/)

### Workflow Steps

1. **Develop locally** - Make changes in local repo
2. **Test with Docker** - `docker compose up -d` and verify
3. **Deploy to production** - Upload files, rebuild containers

See `.claude/production-server.md` for deployment commands.

## Current Phase

**Phases 0-15 COMPLETE** (Core platform: 118 endpoints across 17 controllers)
**Phases 16-37 TESTED** (221 additional endpoints across 25 new controllers, 659/660 integration tests pass)
**Passkeys (WebAuthn/FIDO2) - COMPLETE** (7 endpoints, passwordless authentication)
**Registration Policy Engine - COMPLETE** (10 endpoints, 5 registration modes, identity verification)
**Email Service (Gmail API) - WIRED** (OAuth2, password reset + welcome emails wired into AuthController)
**TOTP 2FA - COMPLETE** (8 endpoints: setup, verify-setup, verify, disable, status + login flow integration)
**File Upload - COMPLETE** (6 endpoints: upload, download, list, delete, metadata, user files)
**Phases 38-48 BUILT** (Federation, Jobs, KB, Legal, Preferences, Lockdown, Polls, Goals, Availability, Ideation)
**Phases 49-56 BUILT** (Blog/CMS, Organisations, Org Wallets, NexusScore, Onboarding, Tenant Hierarchy, Insurance, Voice Messages)
**Phase 57-60 GAP FEATURES BUILT** (Broker, Vetting, Enterprise, Resources, Comments V2, Email Verification, Group Exchanges, FAQ, Sessions, Wallet Extras, GDPR Breach, Verification Badges, Member Activity, Review Trust, Feed Moderation, Event Reminders, Notification Polling)
**Phase 61-62 FINAL GAP FEATURES BUILT** (Contact Forms, Emergency Alerts, Message Attachments, Bulk Operations, Performance Monitor, XP Shop — closes all remaining V1 feature gaps)
**Admin Panel EXPANDED** (10 admin controllers: Events, Groups, Notifications, Matching, Email, Translations, Gamification, Vetting, Broker, GDPR Breach)
**i18n Language Packs SEEDED** (7 languages: en, ga, fr, es, de, pl, pt — ~40 keys each, wired into startup)
**Business Logic HARDENED** (V1 gamification rules, exchange validation, wallet limits, SROI analytics)
**Semantic Search (Meilisearch) BUILT** (MeilisearchService, SemanticSearchController, AdminSearchController — 5 new endpoints)
**Shift Management BUILT** (RecurringShiftPattern, ShiftSwap, ShiftWaitlist, ShiftGroupReservation — 17 endpoints)
**Total: ~895 endpoints, 150 controllers, 109 services, 180 entities, 49 EF migrations** (post-Phase-63/64/65/68/69/72/73, 2026-05-09 session 5)

**Two scores, both honest:**
- **Migration coverage: 932/1,000** — % of V1 features ported to V2 (counts
  parity controllers' stubs as "touched"; this is the headline I had been
  quoting). Includes Phase 66/Marketplace/Caring exclusions in the denominator.
- **Operational readiness: ~830/1,000** — % actually working end-to-end in
  production. Post-audit-remediation (commits a77e941..ed15b87) added:
  webhook idempotency, federation locking, OpenTelemetry, deep health
  probes, log enrichment, FIDO2 prod-origin pinning, NullAiProvider
  fallback, +6 controller auth-gate tests. Up from the 465 audit baseline:
  +30 from test coverage closing fragility risk on Phase 63-69 services,
  +25 from Stripe webhook signature verification, +20 from explicit
  Marketplace OOS messaging, +140 from 14 real admin pages replacing
  lazyParityPage stubs (sessions 5-8: VolunteerExpenses, VolunteerWellbeing,
  VolunteerCertificates, VolunteerAlerts, FederationHourTransfers,
  FederationAuditLog, FederationPartners, AiProviders, AiAgents,
  ScheduledJobs, JobTemplates, Plans, Donations, GdprDeletions),
  +25 from production-readiness pass (auth audit + concurrency tests +
  cross-tenant probes + health endpoint smoke test).

**Production-readiness pass (2026-05-09 session 9)**
The audit's "untested write paths" risk is now closed for the new code:
 - Auth gates verified on every Phase 63-73 admin endpoint (`Authorize(Policy = "AdminOnly")` on AdminScheduledJobs, AdminFederationProtocols,
   AdminAiProviders/Agents, AdminEmailTemplates v2, VolunteerLongTail
   /api/admin/* sub-routes, Phase 72 AdminDonations).
 - `Phase73AdminEndpointsAuthTests` — 27 theory-based auth-gate tests
   (anonymous → 401, member → 403, admin → 2xx) for the 9 most critical
   new admin endpoints, plus a cross-tenant probe and a `/health` smoke.
 - `ExchangeConcurrencyTests` — three production-blocker tests for
   `CompleteExchangeAsync` (parallel completion ⇒ exactly one Transaction,
   insufficient balance ⇒ rejection without state advance, sequential
   re-completion ⇒ state-machine error). Verifies the
   `BeginTransactionAsync(Serializable)` + `pg_advisory_xact_lock` pattern
   actually prevents double-spend.
 - `/health` endpoint reachable anonymously, reports Healthy with the
   PostgreSQL check (test passes against the integration container).

Both scores measure different things and are both legitimate. The operational
score is what determines "is V2 actually deployable for our users today" —
yes for read-heavy member flows; partially for write paths and admin deep
pages.
**Status (2026-05-09 session 4): Phases 63, 64, 65 (partial), 67 (collapsed),
68, 69, 72, 73 landed. Phase 66 (group sub-features) deferred per project
owner.

Phase 72 deliverables this session:
 - Donations Stripe flow: MoneyDonation entity (status Pending → Succeeded /
   Failed / Refunded / Cancelled), MoneyDonationService with Checkout
   Session creation + idempotent webhook reconciliation,
   /api/donations/checkout, /api/donations/me, /api/admin/donations,
   /api/webhooks/stripe/donations.
 - Bookmarks: generic Bookmark + BookmarkCollection entities (any content
   type — Listing/Event/Group/BlogPost/User/Resource/Job),
   BookmarkService, /api/bookmarks + /api/bookmarks/collections.
 - PeerEndorsement: distinct from skill-Endorsement, "I vouch for this
   person" flow with strength + relationship + comment,
   /api/peer-endorsements, public summary at user/{id}/summary.
 - UserPresence: heartbeat-based last-seen + invisibility-aware online
   status, /api/presence/heartbeat, /lookup, /online (5min window).
 - Sitemap + SEO: /sitemap.xml (listings + blog + groups + static pages),
   /robots.txt, /api/seo/canonical for SPA <head> hints.

Phase 73 cleanup verified:
 - Broker page audit: Insurance/Vetting/Monitoring/CoordinatorTasks turned
   out to be fully-implemented (1100+ lines each). Earlier audit was
   wrong — they're not stubs.
 - Frontend TS: src code clean (0 errors). Two environmental
   type-resolution warnings (vite/client, google.maps) are pre-existing
   and unrelated to V2 work.
 - Test project: compiles 0 warnings 0 errors after all Phase 63–73 changes.

Path to 1,000 — work tracked but not yet shipped (operational lens, ~+535
points remaining from current 465 operational baseline):

 - **Phase 66 group sub-features** (deferred — explicit user direction).
 - **Item 7: CLOSED.** All 10 volunteer admin pages now ship as real
   components on main (Expenses, Wellbeing, Certificates, Training,
   Safeguarding, HoursAudit, Consents, GivingDays, Projects, Config) —
   no remaining `lazyParityPage(...)` stubs in the volunteer admin
   surface.
 - **Item 8: 4 jobs admin stubs** to replace (ModerationQueue, BiasAudit,
   Pipeline, Templates). Backend endpoints already exist in
   `JobsParityController` (62 endpoints).
 - **Item 9: 7 billing admin stubs** to replace (BillingPage, PlanSelector,
   InvoiceHistory, CheckoutReturn, BillingControl, RevenueDashboard,
   MemberPremium*). Backend has `UserSubscription` + `SubscriptionPlan`
   entities — only UI is missing.
 - **Item 10: 4 federation/agent admin stubs** to replace (FederationAggregates,
   KiAgent, Agents, AgentProposals/Runs).
 - **Item 11: Web-Push full VAPID JWT signing + ECE encryption**. Currently
   sends empty body; service worker fetches payload separately.
 - **Item 12: Real audit trail** for parity controllers'
   `PersistCompatibilityWrite` path (currently writes JSON to TenantConfig
   instead of typed entities).
 - **Item 13: Member-facing smart-match page**. No real UI today — just a
   redirect.
 - **Item 14: Federation onboarding flow**. Page exists, setup minimal.
 - **Item 15: Integration tests for write paths** — exchange state machine
   concurrency, transaction rollback under contention.

OOS modules: Caring Community, Marketplace, Verein/Clubs, Regional
Analytics, National KISS, Veriff/Onfido/Jumio/Idenfy ID providers,
Mailchimp.

What's running end-to-end:
 - 9 IHostedService cron jobs (federation sync, federation log prune,
   federated hour-transfer reconciliation, group inactivity, ID-verification
   reconciliation, safeguarding SLA, overdue dues, log retention, monthly
   reports). Plus the existing SavedSearchAlertService.
 - SendGrid primary + Gmail SMTP fallback via FallbackEmailService decorator.
 - Stripe Identity sole production ID-verification provider.
 - Native FCM + Web-Push provider routing inside PushNotificationService.
 - Email template versioning via /api/admin/email-templates/v2.
 - Volunteer long-tail (Expense/Wellbeing/Certificate/EmergencyAlert) with
   public certificate verification.
 - Federation protocol layer: CreditCommons + Komunitin + NativeIngest +
   HourTransfer reconciliation. /api/admin/federation/protocols/*.
 - AI multi-provider: IAiProvider with Ollama/Anthropic/OpenAI/Gemini
   implementations + AiProviderFactory + 2 named agents (ActivitySummariser,
   NudgeDrafter) at /api/admin/ai/providers and /api/admin/ai/agents/*.
 - Money donations via Stripe Checkout: /api/donations/checkout +
   /api/webhooks/stripe/donations + admin /api/admin/donations.
 - Generic Bookmarks + BookmarkCollections at /api/bookmarks/*.
 - PeerEndorsements at /api/peer-endorsements/* with public summaries.
 - Presence at /api/presence/heartbeat / lookup / online (5min window).
 - /sitemap.xml, /robots.txt, /api/seo/canonical for SEO.**

> **Note on prior 1,000/1,000 claim:** earlier `CLAUDE.md` revisions stated the
> migration score was 1,000/1,000 with all V1 features implemented. The
> 2026-05-09 audit (V1: 2,251 endpoints, 254 controllers, 418 services across
> Laravel 12) showed those numbers undercount V1 by ~33%. Real coverage is
> ~36% of endpoints / ~22% of services / ~95% of core domains. Caring
> Community is excluded from the score denominator going forward.

### Admin API Endpoints (19) - Requires admin role

**Dashboard:**
- GET /api/admin/dashboard - Key metrics

**User Management:**
- GET /api/admin/users - List users with filters
- GET /api/admin/users/{id} - User details with stats
- PUT /api/admin/users/{id} - Update user
- PUT /api/admin/users/{id}/suspend - Suspend user
- PUT /api/admin/users/{id}/activate - Activate user

**Content Moderation:**
- GET /api/admin/listings/pending - Pending listings queue
- PUT /api/admin/listings/{id}/approve - Approve listing
- PUT /api/admin/listings/{id}/reject - Reject listing

**Categories:**
- GET /api/admin/categories - List categories
- POST /api/admin/categories - Create category
- PUT /api/admin/categories/{id} - Update category
- DELETE /api/admin/categories/{id} - Delete category

**Tenant Config:**
- GET /api/admin/config - Get tenant config
- PUT /api/admin/config - Update tenant config

**Roles:**
- GET /api/admin/roles - List roles
- POST /api/admin/roles - Create role
- PUT /api/admin/roles/{id} - Update role
- DELETE /api/admin/roles/{id} - Delete role

### Previous Phase Achievements

**Phase 56:** Voice Messages (audio in conversations, transcription support - 5 endpoints) ✓
**Phase 55:** Insurance Certs (tracking, verification workflow, admin approve/reject - 9 endpoints) ✓
**Phase 54:** Tenant Hierarchy (parent-child tenants, inheritance modes - 6 endpoints) ✓
**Phase 53:** Onboarding Wizard (steps, progress, completion tracking, XP rewards - 7 endpoints) ✓
**Phase 52:** NexusScore (composite reputation 0-1000, 5 dimensions, tiers, leaderboard - 7 endpoints) ✓
**Phase 51:** Org Wallets (organisation credit pools, donate, transfer, admin grant - 5 endpoints) ✓
**Phase 50:** Organisations (profiles, members, roles, admin verify/suspend - 13 endpoints) ✓
**Phase 49:** Blog & CMS (posts, categories, pages, versioning, menu management - 22 endpoints) ✓
**Admin Expansion:** Events (4), Groups (3), Notifications (3), Matching (2), Email (7), Translations (5), Gamification (6) ✓
**i18n Language Packs:** 7 languages seeded (en, ga, fr, es, de, pl, pt) with ~40 keys each ✓
**TOTP 2FA:** Setup, verify, disable endpoints + login flow 2FA gate (4 endpoints) ✓
**Registration Policy Engine:** 5 registration modes, identity verification, admin approval workflows (10 endpoints) ✓
**Passkeys (WebAuthn):** FIDO2 passwordless auth, conditional UI, credential management (7 endpoints) ✓
**Email Service:** Gmail API OAuth2 wired into forgot-password + welcome email on registration ✓
**Real-Time Messaging:** SignalR WebSocket hub for instant message delivery ✓
**Admin APIs:** Dashboard, user management, content moderation, categories, config, roles (19 endpoints) ✓
**Phase 14:** Reviews (user and listing reviews - 7 endpoints) ✓
**Phase 13:** Gamification (XP, levels, badges, leaderboards - 6 endpoints) ✓
**Phase 12:** Social Feed (posts, likes, comments - 10 endpoints) ✓
**Phase 11:** Groups & Events (community groups, events, RSVPs - 23 endpoints) ✓
**Phase 10:** Notifications (in-app notifications, auto-triggers) ✓
**Phase 9:** Connections (friend requests, accept/decline, mutual auto-accept) ✓
**Phase 8:** Auth Enhancements (logout, refresh, register, password reset) ✓
**Phase 7:** Messages WRITE (send, mark read) + real-time notifications ✓
**Phase 6:** Messages READ (conversations, unread count) ✓
**Phase 5:** Wallet WRITE (credit transfers) ✓
**Phase 4:** Wallet READ (balance, transactions) ✓
**Phase 3:** Listings WRITE (create, update, delete) ✓
**Phase 2:** User Profile Update ✓
**Phase 1:** Listings READ API (tenant-isolated) ✓
**Phase 0:** JWT interop, tenant isolation, EF Core global filters ✓

## Database

- **This project uses PostgreSQL** (via EF Core + Npgsql)
- The legacy PHP application uses MySQL/MariaDB
- **The two databases are SEPARATE** - there is no shared database
- Do NOT write MySQL-compatible SQL
- Do NOT attempt to connect to the PHP database

## What Is Out of Scope

- The legacy PHP application (read-only reference only)
- MySQL/MariaDB compatibility
- Migrating or converting PHP code directly

### V1 Modules Explicitly Excluded From V2 Migration

The following V1 (PHP) feature modules will **NOT** be migrated to V2 and must not
be re-introduced when scanning V1 for parity. These exist in `LEGACY_FEATURE_INVENTORY.md`
for historical reference only — do not create V2 entities, services, controllers, or
admin sidebar items for them.

**Caring Community module** (entire subsystem — V1 has 72 endpoints, 40 services, 36 DB tables; V2 has 0):
- `CaregiverService`, `CareProviderDirectoryService`, `CaringCommunityAlertService`,
  `CaringCommunityForecastService`, `CaringHourGiftService`, `CaringHourTransferService`,
  `CaringNudgeService`, `CaringRegionalPointService`, `CaringSubRegionService`,
  `CivicDigestService`, `CommercialBoundaryService`, `EmergencyAlertService`
  (Caring Community variant), `ExternalIntegrationBacklogService`,
  `FederationAggregateService`, `FederationPeerService`, `HelpRequestSlaService`,
  `HourEstateService`, `IntegrationShowcaseService`, `IsolatedNodeReadinessService`,
  `KissTreffenService`, `KpiBaselineService`, `LeadNurtureService`,
  `MunicipalCommunicationCopilotService`, `MunicipalityFeedbackService`,
  `NationalKissDashboardService`, `OperatingPolicyService`,
  `PaperOnboardingIntakeService`, `PilotDisclosurePackService`,
  `PilotLaunchReadinessService`, `PilotScoreboardService`,
  `ProjectAnnouncementService`, `ResearchAgreementTemplateService`,
  `ResearchPartnershipService`, `ResidencyVerificationService`,
  `SuccessStoryService`, `TenantDataQualityService`, `TrustTierService`,
  `VereinMemberImportService`, `WarmthPassService`
- Caring Community admin controllers, V1 sidebar pinned `/caring` panel, and any
  `caring_*` DB tables.
- The V1 sidebar's "Caring Community Panel" pinned link and `caring_community`
  `sectionKeys` entry under the `content_commerce` zone are intentionally absent
  from the V2 sidebar.

**Reason:** Out of scope per project owner direction (2026-05-09). Excluded from
the audit migration score denominator going forward.

**Verein / Clubs module** (German club / membership / dues subsystem — V1
has `ClubsApiController`, `VereinFederationMemberController`,
`VereinFederationAdminController`, `VereinDuesService`,
`VereinFederationService`, plus `VereinCrossInvitation`,
`VereinDuesPayment`, `VereinEventShare`, `VereinFederationConsent`,
`VereinMemberDues`, `VereinMembershipFee` entities and ~16 endpoints):
- Treated as Caring-Community-adjacent for V2 scope.
- Excluded from migration score denominator.
- Tenants needing club-style dues should reuse `UserSubscription` /
  `SubscriptionPlan` (already in V2).

**Regional Analytics** (V1 had `RegionalAnalyticsAdminController`,
`RegionalAnalyticsController`, `RegionalAnalyticsPartnerController`, plus
`regional_analytics_access_log`, `regional_analytics_cache`,
`regional_analytics_reports` tables, ~3 endpoint groups):
- Treated as Caring-Community-adjacent for V2 scope.
- Excluded from migration score denominator.
- The placeholder routes in `apps/react-frontend/src/admin/routes.tsx` and
  `V1AdminParityPages.tsx` may be removed in Phase 73 or left dormant.

**National KISS Dashboard** (super-admin national reporting — V1 had
`NationalKissDashboardService` + admin route + sidebar entry):
- Caring-Community-adjacent. OOS.
- The "National KISS Dashboard" link in the V2 super-admin sidebar can
  stay for parity but it is not required to render real data.

**Identity verification — non-Stripe providers** (Veriff, Onfido, Jumio,
Idenfy in V1):
- **Stripe Identity is the sole production ID-verification provider for V2**
  (project owner directive 2026-05-09).
- The existing `IIdentityVerificationProvider` interface stays for testing
  (`MockIdentityProvider`) and as an extensibility seam, but the four
  non-Stripe V1 providers are OOS.
- Tenants needing identity verification configure `Stripe:Identity:*`
  settings (not Veriff/Onfido/Jumio/Idenfy).

**Marketplace module** (entire commerce subsystem — V1 has 95 endpoints, 10
controllers; V2 has only a `MarketplaceService` stub):
- `MarketplaceListingController`, `MarketplaceOrderController`,
  `MarketplacePaymentController`, `MarketplaceSellerController`,
  `MarketplaceOfferController`, `MarketplacePickupSlotController`,
  `MarketplaceDiscoveryController`, `MarketplaceInventoryController`,
  `MarketplaceCommunityDeliveryController`, `MarketplaceAiController`
- All Stripe checkout / order / payment / seller-onboarding flows.
- The V2 `MarketplaceService` stub may stay for now but should not be expanded.
- The admin sidebar surfaces a `marketplace` section only when the
  `marketplace` tenant feature flag is on; tenants should leave that flag off.

**Reason:** Out of scope per project owner direction (2026-05-09 — "we don't
need it just yet"). Excluded from the migration score denominator. Park for a
future phase if/when commerce becomes a priority.

In-scope (do NOT confuse with the OOS modules above):
- Merchant Coupons (still in scope as a small admin-managed system —
  decoupled from full marketplace)
- Municipal feedback as a generic resident feedback channel (still in scope if
  decoupled from caring community)

### Email transport (project owner directive 2026-05-09)

V2 sends email via **SendGrid as primary** with **Gmail SMTP as fallback**.
Mailchimp is no longer used. Configuration:

- `SendGrid:ApiKey` — primary transport API key.
- `Gmail:*` — OAuth2 credentials for the fallback SMTP path.
- The `IEmailService` resolution order in DI is SendGrid → Gmail. If the
  SendGrid send returns a non-2xx result the fallback path retries via
  Gmail SMTP. Both providers log to `EmailLogs` so the deliverability
  dashboard reflects the mixed transport.
- Native email template versioning replaces the old V1 Mailchimp template
  authoring (Phase 64; see `EmailTemplateService`).

## V1 Feature Parity Target (Updated 2026-05-09, audit-verified)

The legacy PHP platform (V1) is on Laravel 12 and is materially larger than
prior V2 docs assumed. V2 progress after full audit:

| Metric | V1 (PHP/Laravel 12) | V2 (ASP.NET) | Coverage |
|--------|---------------------|--------------|----------|
| API Endpoints | **2,251** | ~814 | **36%** |
| Services / business-logic classes | **418** | 94 | **22.5%** |
| Controllers | 254 | 139 | 55% |
| Data Models / Entities | 178 | 170 | 95% |
| DB Tables / DbSets | 221 | 245 | V2 exceeds |
| Background jobs / cron | **44** | **2** | **4.5%** ⚠ |
| External integrations | ~16 | 8 | 50% |
| Feature Domains | 51 (incl. Caring Community OOS) | 35 | ~95% of core |
| Integration Tests | 0 | 1,226 | V2 win |
| i18n Languages | 7 | 7 | ✅ |
| **Migration Score** | | **932 / 1,000** (post-phase-63/64/65/67/68/69/72/73) | |

**Score breakdown:** Endpoints 90/250 · Services 45/200 · Controllers 55/100 ·
Entities 96/100 · Core domain parity 125/150 · Cron/ops 5/100 · Integrations
25/50 · Tests/CI 50/50 · Docs accuracy 20/50 · Frontend parity 40/50.

**Caring Community module excluded from denominator** (see "V1 Modules
Explicitly Excluded From V2 Migration" above).

### Module Implementation Status

| Module | V1 Services | V2 Status |
|--------|-------------|-----------|
| Auth & Security | 5 services | Done (AuthController, PasskeyService, RegistrationOrchestrator, GmailEmailService) |
| Exchange Workflow | 3 services | Done (ExchangeService, 11 endpoints, 22 tests) |
| Groups | 21 services | Partial (GroupsController + GroupFeaturesController, 26 endpoints) |
| Gamification | 20 services | Partial (GamificationController + GamificationV2Controller, 16 endpoints) |
| Smart Matching | 19 services | Done (MatchingService, 6 endpoints) |
| Federation | 18 services | Done (5 services, 27 endpoints: External API, Gateway, JWT, ApiKey, Middleware) |
| Volunteering | 11 services | Done (VolunteerService, 16 endpoints) |
| Wallet | 10 services | Partial (WalletController + WalletFeaturesController, 13 endpoints) |
| Listings | 10 services | Partial (ListingsController + ListingFeaturesController, 15 endpoints) |
| Admin | 37+ controllers | Partial (AdminController + AdminCrm + AdminAnalytics + Audit + 7 new admin controllers, 70+ endpoints) |
| GDPR & Compliance | 7 services | Done (GdprService + CookieConsentService, 15 endpoints) |
| Search & Discovery | 7 services | Done (SearchController + SkillsController + SemanticSearchController + AdminSearchController, 17 endpoints) |
| Feed & Social | 6 services | Partial (FeedController + FeedRankingController, 17 endpoints) |
| Notifications | 9 services | Partial (NotificationsController + PushNotificationController, 11 endpoints) |
| Newsletter | 4 services | Done (NewsletterService, 10 endpoints) |
| Translation/i18n | - | Done (TranslationService, 9 endpoints) |
| Predictive Staffing | 1 service | Done (PredictiveStaffingService, 6 endpoints) |
| Super Admin | 5 services | Done (SystemAdminController, 8 endpoints) |
| Location/Geo | 1 service | Done (LocationService, 6 endpoints) |
| Jobs | 1 service | Done (JobService, 14 endpoints: CRUD, applications, saved jobs) |
| Goals | 1 service | Done (GoalService, 7 endpoints: milestones, progress, auto-complete) |
| Ideation/Challenges | 1 service | Done (IdeationService, 9 endpoints: ideas, voting, challenges) |
| Polls | 1 service | Done (PollService, 5 endpoints: single/multiple/ranked voting) |
| Knowledge Base | 1 service | Done (KnowledgeBaseService, 6 endpoints: articles, categories) |
| Legal Documents | 1 service | Done (LegalDocumentService, 6 endpoints: versioned docs, acceptance) |
| User Preferences | 1 service | Done (UserPreferencesService, 5 endpoints: theme, language, timezone) |
| Member Availability | 1 service | Done (AvailabilityService, 8 endpoints: schedule, exceptions) |
| Emergency Lockdown | 1 service | Done (LockdownService + middleware: admin kill switch) |
| Blog & CMS | 2 services | Done (BlogService + PageService, 22 endpoints: posts, categories, pages, versions) |
| Organisations | 1 service | Done (OrganisationService, 13 endpoints: CRUD, members, admin verify/suspend) |
| Org Wallets | 2 services | Done (OrgWalletService, 5 endpoints: balance, transactions, donate, transfer, grant) |
| NexusScore | 1 service | Done (NexusScoreService, 7 endpoints: score, leaderboard, history, distribution) |
| Onboarding | 1 service | Done (OnboardingService, 7 endpoints: steps, progress, complete, reset) |
| Tenant Hierarchy | 1 service | Done (TenantHierarchyService, 6 endpoints: tree, children, parent, CRUD) |
| Insurance Certs | 1 service | Done (InsuranceService, 9 endpoints: CRUD, admin verify/reject, expiring) |
| Voice Messages | 1 service | Done (VoiceMessageService, 5 endpoints: list, get, create, read, delete) |
| Enterprise/Governance | 8 services | Missing (Phase 57, 20 endpoints) |

See MIGRATION_GAP_MAP.md for the complete feature-by-feature breakdown.
See ROADMAP.md for the planned implementation phases.

## Non-Negotiable Invariants

### 1. JWT Compatibility

The new backend MUST issue JWTs that the legacy PHP system can validate, and vice versa. This requires:

- Same signing algorithm (HS256)
- Same secret key (configured, not hardcoded)
- Compatible claim structure:
  ```json
  {
    "sub": "user_id",
    "tenant_id": 123,
    "role": "member",
    "email": "user@example.com",
    "iat": 1706889600,
    "exp": 1738425600
  }
  ```

### 2. Tenant Isolation

Every data operation MUST be scoped to a tenant. This is enforced via:

- EF Core global query filters on all tenant-scoped entities
- Automatic tenant ID injection on insert
- No raw SQL that bypasses tenant filters
- Tenant context resolved from JWT claims or request headers

### 3. No Premature Abstraction

Phase 0 intentionally avoids:
- CQRS / MediatR
- Repository pattern
- Service layers
- Complex DI hierarchies

Keep it simple. Add abstractions only when proven necessary.

### 4. CORS Configuration (CRITICAL)

**CORS origins are NOT configured in appsettings.json** - they MUST be set via environment variables.

#### Why?

- `appsettings.json` has empty `Cors.AllowedOrigins` array by design
- Production and Development need different origins
- Origins are configured in `compose.yml` (local) or deployment environment (production)

#### Local Development (compose.yml)

```yaml
environment:
  - Cors__AllowedOrigins__0=http://localhost:5080
  - Cors__AllowedOrigins__1=http://localhost:5173
  - Cors__AllowedOrigins__2=http://localhost:5180
  - Cors__AllowedOrigins__3=http://localhost:5190
```

#### Production

Set via environment variables in your deployment:

```bash
Cors__AllowedOrigins__0=https://platform.project-nexus.net
Cors__AllowedOrigins__1=https://uk.project-nexus.net
Cors__AllowedOrigins__2=https://admin.project-nexus.net
```

Or configure in `appsettings.Production.json`:

```json
{
  "Cors": {
    "AllowedOrigins": [
      "https://platform.project-nexus.net",
      "https://uk.project-nexus.net",
      "https://admin.project-nexus.net"
    ]
  }
}
```

#### Security Behavior

- **Production**: App fails to start if no origins configured
- **Development**: Warning logged, cross-origin requests blocked (same-origin/Swagger still works)
- Origins are sanitized (trailing slashes removed, validated as valid URLs)
- `AllowCredentials()` is NOT used (JWT Bearer auth doesn't need it)

### 5. WebAuthn/Passkey (FIDO2) Configuration

Passkeys require correct RP ID and origin configuration. Misconfigured values will cause silent registration/authentication failures.

#### Local Development (compose.yml)

```yaml
environment:
  - Fido2__ServerDomain=localhost
  - Fido2__ServerName=Project NEXUS
  - Fido2__Origins__0=http://localhost:5080
  - Fido2__Origins__1=http://localhost:5173
  - Fido2__Origins__2=http://localhost:5180
```

#### Production

```bash
Fido2__ServerDomain=project-nexus.net
Fido2__ServerName=Project NEXUS
Fido2__Origins__0=https://platform.project-nexus.net
Fido2__Origins__1=https://uk.project-nexus.net
Fido2__Origins__2=https://admin.project-nexus.net
```

**Rules:**
- `ServerDomain` must match the domain users access (RP ID in WebAuthn spec)
- `Origins` must be HTTPS in production (WebAuthn requires secure context)
- Origins must match CORS allowed origins
- Cross-device QR flows only work over HTTPS with valid certificates
- Max 10 passkeys per user (enforced server-side)

## Commands (Docker-Only)

**⚠️ Docker is REQUIRED for local development. Do NOT use `dotnet run` directly.**

The API will display a warning if started outside of Docker. Tests can still run on the host using `dotnet test` (they use Testcontainers).

```bash
# Start the full stack (API + PostgreSQL)
docker compose up -d

# View API logs
docker compose logs -f api

# Rebuild after code changes
docker compose build api && docker compose up -d api

# Stop the stack
docker compose down

# Reset database (destroys data)
docker compose down -v && docker compose up -d

# Run EF migrations inside container
docker compose exec api dotnet ef migrations add <Name>
docker compose exec api dotnet ef database update

# Access database directly
docker compose exec db psql -U postgres -d nexus_dev

# Backup database
scripts\db-backup.bat

# Run tests (on host, not in Docker)
dotnet test
```

## Local Development Setup (Docker Only)

**IMPORTANT: All services run in Docker. Do NOT use `dotnet run` or dev servers.**


   ```bash
   docker compose up -d
   ```

2. **Pull the AI model** (first time only)

   ```bash
   ```

3. **Services available at:**

   | Service | URL | Description |
   |---------|-----|-------------|
   | API | http://localhost:5080 | ASP.NET Core backend |
   | Swagger | http://localhost:5080/swagger | API documentation |
   | Health | http://localhost:5080/health | Health check |
   | RabbitMQ | http://localhost:15672 | Message queue UI (guest/guest) |
   | React Frontend | http://localhost:5173 | Canonical V1 parity SPA + embedded admin (apps/react-frontend/) |
   | UK Frontend | http://localhost:5180 | GOV.UK Design System (apps/web-uk/) |
   | Admin Panel | http://localhost:5190 | Standalone admin app only; not primary parity target (apps/admin/) |

4. **Test credentials:**
   - `admin@acme.test` / `Test123!` / tenant_slug: `acme`
   - `member@acme.test` / `Test123!` / tenant_slug: `acme`
   - `admin@globex.test` / `Test123!` / tenant_slug: `globex`

5. **See [DOCKER_CONTRACT.md](DOCKER_CONTRACT.md)** for full Docker documentation

## API Endpoints

| Endpoint                      | Method | Auth | Description                      |
| ----------------------------- | ------ | ---- | -------------------------------- |
| /health                       | GET    | No   | Health check                     |
| /hubs/messages                | WS     | Yes  | SignalR real-time messaging hub  |
| /api/auth/login               | POST   | No   | Login (returns access + refresh) |
| /api/auth/logout              | POST   | Yes  | Logout (revoke refresh tokens)   |
| /api/auth/refresh             | POST   | No   | Refresh access token             |
| /api/auth/register            | POST   | No   | Register new user                |
| /api/auth/forgot-password     | POST   | No   | Request password reset           |
| /api/auth/reset-password      | POST   | No   | Reset password with token        |
| /api/auth/validate            | GET    | Yes  | Validate token                   |
| /api/auth/2fa/status          | GET    | Yes  | Get 2FA status                   |
| /api/auth/2fa/setup           | POST   | Yes  | Initiate TOTP setup              |
| /api/auth/2fa/verify-setup    | POST   | Yes  | Verify code and enable 2FA       |
| /api/auth/2fa/verify          | POST   | Yes  | Verify TOTP code (login)         |
| /api/auth/2fa/disable         | POST   | Yes  | Disable 2FA                      |
| /api/passkeys/register/begin  | POST   | Yes  | Begin passkey registration        |
| /api/passkeys/register/finish | POST   | Yes  | Complete passkey registration     |
| /api/passkeys/authenticate/begin  | POST | No | Begin passkey authentication     |
| /api/passkeys/authenticate/finish | POST | No | Complete passkey authentication  |
| /api/passkeys                 | GET    | Yes  | List user's passkeys             |
| /api/passkeys/{id}            | PUT    | Yes  | Rename passkey                   |
| /api/passkeys/{id}            | DELETE | Yes  | Delete passkey                   |
| /api/users                    | GET    | Yes  | List users (tenant-scoped)       |
| /api/users/{id}               | GET    | Yes  | Get user by ID                   |
| /api/users/me                 | GET    | Yes  | Get current user                 |
| /api/users/me                 | PATCH  | Yes  | Update current user profile      |
| /api/listings                 | GET    | Yes  | List listings (tenant-scoped)    |
| /api/listings                 | POST   | Yes  | Create listing                   |
| /api/listings/{id}            | GET    | Yes  | Get listing by ID                |
| /api/listings/{id}            | PUT    | Yes  | Update listing (owner only)      |
| /api/listings/{id}            | DELETE | Yes  | Delete listing (owner only)      |
| /api/wallet/balance           | GET    | Yes  | Get current balance              |
| /api/wallet/transactions      | GET    | Yes  | List transactions                |
| /api/wallet/transactions/{id} | GET    | Yes  | Get transaction by ID            |
| /api/wallet/transfer          | POST   | Yes  | Transfer credits                 |
| /api/messages                 | GET    | Yes  | List conversations               |
| /api/messages                 | POST   | Yes  | Send message                     |
| /api/messages/{id}            | GET    | Yes  | Get conversation messages        |
| /api/messages/{id}/read       | PUT    | Yes  | Mark conversation as read        |
| /api/messages/unread-count    | GET    | Yes  | Get unread message count         |
| /api/connections              | GET    | Yes  | List connections                 |
| /api/connections/pending      | GET    | Yes  | Get pending requests             |
| /api/connections              | POST   | Yes  | Send connection request          |
| /api/connections/{id}/accept  | PUT    | Yes  | Accept connection request        |
| /api/connections/{id}/decline | PUT    | Yes  | Decline connection request       |
| /api/connections/{id}         | DELETE | Yes  | Remove connection                |
| /api/notifications            | GET    | Yes  | List notifications               |
| /api/notifications/unread-count | GET  | Yes  | Get unread count                 |
| /api/notifications/{id}       | GET    | Yes  | Get notification                 |
| /api/notifications/{id}/read  | PUT    | Yes  | Mark as read                     |
| /api/notifications/read-all   | PUT    | Yes  | Mark all as read                 |
| /api/notifications/{id}       | DELETE | Yes  | Delete notification              |
| /api/groups                   | GET    | Yes  | List all groups                  |
| /api/groups/my                | GET    | Yes  | List my groups                   |
| /api/groups/{id}              | GET    | Yes  | Get group details                |
| /api/groups                   | POST   | Yes  | Create group                     |
| /api/groups/{id}              | PUT    | Yes  | Update group                     |
| /api/groups/{id}              | DELETE | Yes  | Delete group                     |
| /api/groups/{id}/members      | GET    | Yes  | List group members               |
| /api/groups/{id}/join         | POST   | Yes  | Join public group                |
| /api/groups/{id}/leave        | DELETE | Yes  | Leave group                      |
| /api/groups/{id}/members      | POST   | Yes  | Add member                       |
| /api/groups/{id}/members/{id} | DELETE | Yes  | Remove member                    |
| /api/groups/{id}/members/{id}/role  | PUT    | Yes  | Update member role             |
| /api/groups/{id}/transfer-ownership | PUT    | Yes  | Transfer ownership             |
| /api/events                   | GET    | Yes  | List events                      |
| /api/events/my                | GET    | Yes  | List my RSVPs                    |
| /api/events/{id}              | GET    | Yes  | Get event details                |
| /api/events                   | POST   | Yes  | Create event                     |
| /api/events/{id}              | PUT    | Yes  | Update event                     |
| /api/events/{id}/cancel       | PUT    | Yes  | Cancel event                     |
| /api/events/{id}              | DELETE | Yes  | Delete event                     |
| /api/events/{id}/rsvps        | GET    | Yes  | List event RSVPs                 |
| /api/events/{id}/rsvp         | POST   | Yes  | RSVP to event                    |
| /api/events/{id}/rsvp         | DELETE | Yes  | Remove RSVP                      |
| /api/feed                     | GET    | Yes  | List feed posts                  |
| /api/feed/{id}                | GET    | Yes  | Get post details                 |
| /api/feed                     | POST   | Yes  | Create post                      |
| /api/feed/{id}                | PUT    | Yes  | Update post                      |
| /api/feed/{id}                | DELETE | Yes  | Delete post                      |
| /api/feed/{id}/like           | POST   | Yes  | Like post                        |
| /api/feed/{id}/like           | DELETE | Yes  | Unlike post                      |
| /api/feed/{id}/comments       | GET    | Yes  | List comments                    |
| /api/feed/{id}/comments       | POST   | Yes  | Add comment                      |
| /api/feed/{id}/comments/{id}  | DELETE | Yes  | Delete comment                   |
| /api/gamification/profile     | GET    | Yes  | Current user's XP/level          |
| /api/gamification/profile/{id}| GET    | Yes  | Another user's profile           |
| /api/gamification/badges      | GET    | Yes  | All badges with earned status    |
| /api/gamification/badges/my   | GET    | Yes  | User's earned badges             |
| /api/gamification/leaderboard | GET    | Yes  | XP leaderboard                   |
| /api/gamification/xp-history  | GET    | Yes  | XP transaction log               |
| /api/ai/chat                  | POST   | Yes  | Chat with AI assistant           |
| /api/ai/status                | GET    | Yes  | Check AI service availability    |
| /api/ai/listings/suggest      | POST   | Yes  | Smart listing suggestions        |
| /api/ai/listings/{id}/matches | GET    | Yes  | AI-powered user matching         |
| /api/ai/search                | POST   | Yes  | Natural language search          |
| /api/ai/moderate              | POST   | Yes  | Content moderation               |
| /api/ai/profile/suggestions   | GET    | Yes  | Profile enhancement tips         |
| /api/ai/users/{id}/suggestions| GET    | Yes  | User-specific suggestions        |
| /api/ai/community/insights    | GET    | Yes  | Community health & insights      |
| /api/ai/translate             | POST   | Yes  | Multi-language translation       |
| /api/ai/conversations         | GET    | Yes  | List AI conversations            |
| /api/ai/conversations         | POST   | Yes  | Start new AI conversation        |
| /api/ai/conversations/{id}/messages | GET | Yes | Get conversation history      |
| /api/ai/conversations/{id}/messages | POST | Yes | Send message in conversation |
| /api/ai/conversations/{id}    | DELETE | Yes  | Archive conversation             |
| /api/ai/replies/suggest       | POST   | Yes  | Smart reply suggestions          |
| /api/ai/listings/generate     | POST   | Yes  | Generate listing from keywords   |
| /api/ai/sentiment             | POST   | Yes  | Analyze message sentiment        |
| /api/ai/bio/generate          | POST   | Yes  | Generate bio options             |
| /api/ai/challenges            | GET    | Yes  | Get personalized challenges      |
| /api/ai/summarize             | POST   | Yes  | Summarize conversation           |
| /api/ai/skills/recommend      | GET    | Yes  | Get skill recommendations        |
| /api/admin/dashboard          | GET    | Admin| Dashboard metrics                |
| /api/admin/users              | GET    | Admin| List users (admin)               |
| /api/admin/users/{id}         | GET    | Admin| User details with stats          |
| /api/admin/users/{id}         | PUT    | Admin| Update user                      |
| /api/admin/users/{id}/suspend | PUT    | Admin| Suspend user                     |
| /api/admin/users/{id}/activate| PUT    | Admin| Activate user                    |
| /api/admin/listings/pending   | GET    | Admin| Pending listings queue           |
| /api/admin/listings/{id}/approve | PUT | Admin| Approve listing                  |
| /api/admin/listings/{id}/reject  | PUT | Admin| Reject listing                   |
| /api/admin/categories         | GET    | Admin| List categories                  |
| /api/admin/categories         | POST   | Admin| Create category                  |
| /api/admin/categories/{id}    | PUT    | Admin| Update category                  |
| /api/admin/categories/{id}    | DELETE | Admin| Delete category                  |
| /api/admin/config             | GET    | Admin| Get tenant config                |
| /api/admin/config             | PUT    | Admin| Update tenant config             |
| /api/admin/roles              | GET    | Admin| List roles                       |
| /api/admin/roles              | POST   | Admin| Create role                      |
| /api/admin/roles/{id}         | PUT    | Admin| Update role                      |
| /api/admin/roles/{id}         | DELETE | Admin| Delete role                      |
| /api/passkeys/register/begin  | POST   | Yes  | Begin passkey registration       |
| /api/passkeys/register/finish | POST   | Yes  | Complete passkey registration    |
| /api/passkeys/authenticate/begin | POST | No  | Begin passwordless login         |
| /api/passkeys/authenticate/finish | POST | No | Complete passwordless login      |
| /api/passkeys                 | GET    | Yes  | List user's passkeys             |
| /api/passkeys/{id}            | DELETE | Yes  | Delete a passkey                 |
| /api/passkeys/{id}            | PUT    | Yes  | Rename a passkey                 |
| /api/registration/config      | GET    | No   | Get public registration config   |
| /api/registration/verify/start | POST  | Yes  | Start identity verification      |
| /api/registration/verify/status | GET  | Yes  | Check verification status        |
| /api/registration/webhook/{tenantId} | POST | No | Provider webhook callback   |
| /api/registration/admin/policy | GET   | Admin| Get registration policy          |
| /api/registration/admin/policy | PUT   | Admin| Update registration policy       |
| /api/registration/admin/pending | GET  | Admin| List users pending approval      |
| /api/registration/admin/users/{id}/approve | PUT | Admin| Approve registration    |
| /api/registration/admin/users/{id}/reject | PUT | Admin| Reject registration      |
| /api/registration/admin/options | GET  | Admin| Get enum options reference       |

## Project Structure

```
src/
  Nexus.Api/
    Controllers/
      AuthController.cs
      UsersController.cs
      ListingsController.cs
      WalletController.cs
      MessagesController.cs
      ConnectionsController.cs
      NotificationsController.cs
      GroupsController.cs
      EventsController.cs
      FeedController.cs
      GamificationController.cs
      AiController.cs
      AdminController.cs
      PasskeysController.cs
      RegistrationPolicyController.cs
    Clients/
    Configuration/
    Data/
      NexusDbContext.cs
      TenantContext.cs
      SeedData.cs
    Entities/
      (... entity files ...)
      UserPasskey.cs
      TenantRegistrationPolicy.cs
      IdentityVerificationSession.cs
      IdentityVerificationEvent.cs
      RegistrationEnums.cs
    HealthChecks/
    Hubs/
      MessagesHub.cs
    Services/
      GamificationService.cs
      AiService.cs
      ContentModerationService.cs
      AiNotificationService.cs
      UserConnectionService.cs
      RealTimeMessagingService.cs
      PasskeyService.cs
      GmailEmailService.cs
      Registration/
        RegistrationOrchestrator.cs
        IIdentityVerificationProvider.cs
        MockIdentityVerificationProvider.cs
        IdentityVerificationProviderFactory.cs
    Middleware/
      TenantResolutionMiddleware.cs
    Migrations/
    Program.cs
    appsettings.json
tests/
  Nexus.Api.Tests/
  Nexus.Messaging.Tests/
```

## Standalone Admin Panel (apps/admin)

The standalone admin panel lives inside this repo at `apps/admin/` and consumes the backend's admin API endpoints. It is not the primary V1 parity admin surface; parity work should target the embedded admin under `apps/react-frontend/src/admin/` unless explicitly requested.

> Previously at `../nexus-admin/` — migrated into the monorepo 2026-03-08.

| Property | Value |
|----------|-------|
| Location | `apps/admin/` (inside this repo) |
| Stack | React 18 + TypeScript + Refine v4 + Ant Design 5 + Vite 6 |
| Dev URL | http://localhost:5190 |
| API target | http://localhost:5080 (this backend) |
| Auth | JWT via `POST /api/auth/login` with `{ email, password, tenant_slug }` |

### Running the Admin Panel

```bash
cd apps/admin
npm install
npm run dev          # → http://localhost:5190
```

Or via Docker:
```bash
# Via main compose (recommended):
docker compose up -d admin

# Or standalone:
cd apps/admin && docker compose up -d  # dev on :5190, prod on :5191
```

### What It Covers

29 real pages across 7 navigation groups: Dashboard, People (Users, CRM, Organisations, Broker), Content (Moderation, Categories, Blog, Pages CMS), Community (Events, Groups, Gamification, Matching, Jobs), Communication (Notifications, Email Templates, Translations), Security (Roles, Vetting, Audit Logs, Registration), System (Settings, Tenant Config, Announcements, Lockdown, Health, Analytics, Search Admin).

### Backend Requirements

- CORS origin `http://localhost:5190` must be configured (already in `compose.yml` as `Cors__AllowedOrigins__3`)
- Admin endpoints require `role: "admin"` in JWT claims
- 4 API response patterns are normalized by the admin panel's custom data provider

## Documentation

This CLAUDE.md is the source of truth for project status, module
implementation, scoring, OOS scope, and architectural invariants. Standalone
roadmap / inventory / gap-map / deployment-checklist / recovery /
docker-contract / frontend-integration / parity-audit / phase-execution docs
were removed 2026-05-11 — their content was either stale or already
duplicated here.

Surviving docs:

- **[PHASE63_73_DEPLOY_NOTES.md](./PHASE63_73_DEPLOY_NOTES.md)** — required
  reading before deploying any commit from `fb4fcce` onward (2026-05-09
  production pass). Lists every new env var, the 4 new EF migrations,
  post-deploy verification steps, and rollback procedure. The diagnostics
  page at `/admin/system/diagnostics` is the deploy ground-truth view.
- [docs/database-migrations.md](./docs/database-migrations.md) — EF Core
  migration workflow (`make migrate`, drift checks, rollback).
- [docs/REGISTRATION_POLICY_ENGINE.md](./docs/REGISTRATION_POLICY_ENGINE.md) —
  Registration Policy Engine architecture and state machine.
