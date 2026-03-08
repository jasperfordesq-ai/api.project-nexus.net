# Project NEXUS - ASP.NET Core Backend

## What This Project Is

This is the **new** ASP.NET Core 8 backend for Project NEXUS, a timebanking/community platform. It is being built using the **Strangler Fig pattern** to incrementally replace functionality from a legacy PHP application.

**This is NOT a migration of the PHP codebase. This is a clean implementation.**

**Architecture Note:** The admin panel is now a **separate microservice project**. Admin-only endpoints (`/api/admin/*`) are still served by this backend API, but the admin frontend is its own project with its own documentation. The `FRONTEND_INTEGRATION.md` in this repo covers member-facing frontends only.

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
**Total: 723 endpoints, 103 controllers, 88 services, 138 entities** (verified 2026-03-08)
**Migration Score: 1,000/1,000** (~320 features Done/Tested, ~0 Missing — All V1 features implemented)
**Status: All phases built. EF migrations applied. Docker builds. Tests pass.**

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

## V1 Feature Parity Target (Updated 2026-03-07)

The legacy PHP platform (V1) has grown significantly. V2 progress after federation core:

| Metric | V1 (PHP) | V2 (ASP.NET) | Gap |
|--------|----------|--------------|-----|
| API Endpoints | ~1,300+ | 709 | 45% missing |
| Services | 251 | 87 | 65% missing |
| Controllers | 199 | 99 | 50% missing |
| Data Models/Entities | 60+ | 137 | V2 exceeds V1 2.3x |
| Feature Domains | 32 | 32 | All have code + tests |
| Features (Done+Tested) | ~320 total | ~315 | 98% done |
| Features (Missing) | - | ~5 | 2% missing |
| Integration Tests | - | 692 | 592 pass (excl. 1 pre-existing crash) |
| i18n Languages | 7 | 7 | ✅ All seeded (en, ga, fr, es, de, pl, pt) |
| **Migration Score** | | **1,000/1,000** | |

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
  - Cors__AllowedOrigins__1=http://localhost:5170
  - Cors__AllowedOrigins__2=http://localhost:5180
  - Cors__AllowedOrigins__3=http://localhost:5190
```

#### Production

Set via environment variables in your deployment:

```bash
Cors__AllowedOrigins__0=https://uk.project-nexus.net
Cors__AllowedOrigins__1=https://ie.project-nexus.net
Cors__AllowedOrigins__2=https://app.project-nexus.net
```

Or configure in `appsettings.Production.json`:

```json
{
  "Cors": {
    "AllowedOrigins": [
      "https://uk.project-nexus.net",
      "https://ie.project-nexus.net"
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
  - Fido2__Origins__1=http://localhost:5170
  - Fido2__Origins__2=http://localhost:5180
```

#### Production

```bash
Fido2__ServerDomain=project-nexus.net
Fido2__ServerName=Project NEXUS
Fido2__Origins__0=https://app.project-nexus.net
Fido2__Origins__1=https://uk.project-nexus.net
Fido2__Origins__2=https://ie.project-nexus.net
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

1. **Start the Docker stack** (API + PostgreSQL + RabbitMQ + Ollama)

   ```bash
   docker compose up -d
   ```

2. **Pull the AI model** (first time only)

   ```bash
   docker compose exec llama-service ollama pull llama3.2:3b
   ```

3. **Services available at:**

   | Service | URL | Description |
   |---------|-----|-------------|
   | API | http://localhost:5080 | ASP.NET Core backend |
   | Swagger | http://localhost:5080/swagger | API documentation |
   | Health | http://localhost:5080/health | Health check |
   | RabbitMQ | http://localhost:15672 | Message queue UI (guest/guest) |
   | Modern Frontend | http://localhost:5170 | Next.js + HeroUI (apps/web-modern/) |
   | UK Frontend | http://localhost:5180 | GOV.UK Design System (apps/web-uk/) |
   | Admin Panel | http://localhost:5190 | Refine + Ant Design (apps/admin/) |
   | GOV.IE Frontend | http://localhost:5200 | Nexus Community (GOV.IE DS) |

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
      ILlamaClient.cs
      LlamaClient.cs
      LlamaDtos.cs
    Configuration/
      LlamaServiceOptions.cs
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
      LlamaHealthCheck.cs
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

## Admin Panel (apps/admin)

The admin panel lives inside this repo at `apps/admin/`. Consumes the backend's admin API endpoints.

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

### Core References
- [MONOREPO_MAP.md](./MONOREPO_MAP.md) - **All apps, ports, Docker service names, deployment commands** (monorepo map)
- [NOTES.md](./NOTES.md) - Decision log and phase checklists
- [ROADMAP.md](./ROADMAP.md) - Migration roadmap with all planned phases (16-37)
- [MIGRATION_GAP_MAP.md](./MIGRATION_GAP_MAP.md) - V1 vs V2 feature comparison (~250 features mapped)
- [LEGACY_FEATURE_INVENTORY.md](./LEGACY_FEATURE_INVENTORY.md) - Full V1 feature inventory (251 services, 1,300+ endpoints)

### Phase Execution Guides
- PHASE0_EXECUTION.md through PHASE15_EXECUTION.md - Test scripts for each completed phase

### Deployment & Operations
- FRONTEND_INTEGRATION.md - Frontend integration guide (API reference, CORS, architecture)
- [ADMIN_INTEGRATION.md](./ADMIN_INTEGRATION.md) - Admin panel API integration guide (144+ admin endpoints, response examples, UI suggestions)
- PLESK_DEPLOYMENT.md - Plesk deployment guide (concepts, theory, troubleshooting)
- PLESK_QUICKSTART.md - Step-by-step Plesk setup checklist
- PLESK_EXECUTION.md - Verb-first execution guide for Plesk setup
- DEPLOYMENT_CHECKLIST.md - Full deployment order checklist (fresh server to production)
- MASTER_DEPLOYMENT_CHECKLIST.md - Single source of truth for deployment
- RECOVERY_GUIDE.md - How to verify and recover when things break
- DOCKER_CONTRACT.md - Docker Compose specification

### AI & Security
- AI_SERVICE_BOUNDARY.md - Security boundary for LLaMA AI service
- AI_FEATURES_ROADMAP.md - AI feature roadmap
- AI_FRONTEND_INTEGRATION.md - Frontend AI integration
- AI_DEPLOYMENT_PLESK_UBUNTU.md - Ubuntu/Plesk AI deployment
