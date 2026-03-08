# Frontend Integration Guide

> **Note:** Admin panel endpoints are documented separately in the Admin Panel microservice project. This guide covers member-facing frontend integration only.

This guide explains how to connect a frontend application to the Project NEXUS ASP.NET Core API.

---

## Frontend Can Build Safely Now

These features are **fully implemented** in the ASP.NET backend. Frontend teams can build UI for:

**Core Platform (Phases 0-15, fully tested):**
- **Authentication** - Login, logout, register, password reset, token refresh
- **Two-Factor Authentication (TOTP)** - Setup, verify, disable, backup codes
- **Passkeys (WebAuthn/FIDO2)** - Passwordless login, credential management
- **User Profiles** - View profile, edit own profile
- **Listings** - Full CRUD with categories, type filtering
- **Wallet** - Balance, transactions, transfers (with daily/weekly/monthly limits)
- **Exchanges** - Full lifecycle: request, accept, start, complete, rate, dispute
- **Messaging** - Conversations, send messages, mark as read, real-time via SignalR
- **Connections** - Friend requests, accept/decline, remove
- **Notifications** - List, unread count, mark read
- **Groups** - Full CRUD, join/leave, member management, roles
- **Events** - Full CRUD, RSVP, attendees list
- **Social Feed** - Posts, likes, threaded comments with replies
- **Gamification** - XP (18 actions), levels (1-10), 55+ badges, leaderboards
- **Reviews** - User reviews, listing reviews, exchange ratings
- **Search** - Unified search, autocomplete, member directory
- **AI Features** - Chat, listing suggestions, matching, moderation, translations
- **Registration Policy Engine** - 5 registration modes, identity verification, admin approval
- **File Upload** - Upload, download, list, delete, metadata
- **Content Reporting** - Report content

**New Modules (Phases 16-48, built and tested):**
- **Federation** - Cross-tenant partnerships, shared listings/members, API keys, feature gating (27 endpoints)
- **Volunteering** - Opportunities, applications, shifts, check-in/out, stats (16 endpoints)
- **Jobs** - Job vacancies, applications, saved jobs (14 endpoints)
- **Smart Matching** - 6-factor scoring algorithm with preferences (6 endpoints)
- **Skills & Endorsements** - Skill catalog, proficiency levels, peer endorsements (10 endpoints)
- **Location/Geo** - User location, nearby users/listings, distance calculation (6 endpoints)
- **Newsletter** - Subscribe/unsubscribe (10 endpoints)
- **Translation/i18n** - Locale management, translation keys, bulk import (9 endpoints)
- **Knowledge Base** - Help articles with markdown, categories, search (6 endpoints)
- **Legal Documents** - Versioned ToS/Privacy Policy, acceptance tracking (6 endpoints)
- **User Preferences** - Theme, language, timezone, privacy settings (5 endpoints)
- **Emergency Lockdown** - Emergency lockdown status (3 endpoints + middleware)
- **Polls** - Single/multiple/ranked voting, auto-close, results (5 endpoints)
- **Goals** - Personal goals with milestones, progress tracking (7 endpoints)
- **Member Availability** - Weekly schedule, exceptions, bulk set (8 endpoints)
- **Ideation** - Community ideas, voting, comments, challenges (9 endpoints)
- **Push Notifications** - Device registration, preferences (5 endpoints)

**Extended Feature Controllers (enhance core modules):**
- **Gamification V2** - Challenges, streaks, seasons, daily rewards (10 endpoints)
- **Listing Features** - Views, analytics, favorites, tags, featured, expiring, renew (10 endpoints)
- **Wallet Features** - Categories, limits, donations, balance alerts, export (9 endpoints)
- **Group Features** - Announcements, policies, discussions, files (13 endpoints)
- **Feed Ranking** - Ranked feed, trending, bookmarks, shares, engagement (7 endpoints)

**New Modules (Phases 49-56, built):**
- **Blog & CMS** - Posts, categories, pages, versioning, menu management (22 endpoints)
- **Organisations** - Profiles, members, roles (13 endpoints)
- **Organisation Wallets** - Org credit pools, donate, transfer (5 endpoints)
- **NexusScore** - Composite reputation 0-1000, 5 dimensions, tiers, leaderboard (7 endpoints)
- **Onboarding Wizard** - Steps, progress, completion tracking, XP rewards (7 endpoints)
- **Tenant Hierarchy** - Parent-child tenants, inheritance modes (6 endpoints)
- **Insurance Certificates** - Tracking, verification workflow (9 endpoints)
- **Voice Messages** - Audio in conversations, transcription support (5 endpoints)
- **Semantic Search (Meilisearch)** - Full-text search (5 endpoints)
- **Event Reminders** - Per-event reminders, user reminder list (4 endpoints)
- **Member Activity** - Activity feed, dashboard stats (5 endpoints)
- **Review Trust** - Time-decay weighted trust scores, pending reviews (3 endpoints)
- **Verification Badges** - Badge types, user badges (4 endpoints)
- **Feed Moderation** - Report posts (2 endpoints)
- **Notification Polling** - Long-poll fallback, realtime config (2 endpoints)
- **FAQ** - Public FAQ with categories (7 endpoints)
- **Session Management** - List active sessions, terminate one or all others (3 endpoints)
- **GDPR Breach Management** - Breach reporting, tracking, authority notification, consent types (8 endpoints)


---

## Architecture Overview

### Key Principles

1. **One API, Multiple Frontends** - There is a single ASP.NET Core API. All frontends connect to it via CORS-allowed origins.
2. **Hostnames, Not Ports** - Different apps are distinguished by hostname (uk.project-nexus.net, ie.project-nexus.net), not by API ports.
3. **Dev Ports are Local-Only** - Ports like 3000, 3001, 3002 are for local development convenience only. They have no architectural significance in production.
4. **Mobile Apps Skip CORS** - Native mobile apps make direct HTTP requests (not browser requests), so they don't need CORS configuration.
5. **Internal Services are Never Browser-Facing** - AI services (LLaMA) and other internal APIs communicate server-to-server. They are never exposed to browsers.

### System Diagram

```text
                    ┌─────────────────────────────────────┐
                    │     BROWSER CLIENTS (CORS needed)   │
                    └─────────────────────────────────────┘
                                      │
          ┌───────────────────────────┼───────────────────────────┐
          │                           │                           │
          ▼                           ▼                           ▼
  https://uk.project       https://ie.project       https://app.project
     -nexus.net               -nexus.net               -nexus.net
  (GOV.UK Frontend)         (GOV.IE Frontend)         (Modern Frontend)
          │                           │                           │
          └───────────────────────────┼───────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                       REVERSE PROXY (HTTPS 443)                         │
│                         Plesk Nginx + Let's Encrypt                     │
│                      https://api.project-nexus.net                      │
└─────────────────────────────────────────────────────────────────────────┘
                                      │
                    ┌─────────────────┼─────────────────┐
                    │                 │                 │
                    ▼                 ▼                 ▼
            ┌───────────┐                       ┌───────────┐
            │  Browser  │                       │  Mobile   │
            │  Requests │                       │    App    │
            │ (CORS OK) │                       │ (No CORS) │
            └───────────┘                       └───────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                       ASP.NET CORE API (Kestrel)                        │
│                         Internal: localhost:5080                        │
│                   (Single API serving all clients)                      │
└─────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ Server-to-server (NO CORS)
                                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                       INTERNAL SERVICES                                 │
│                    LLaMA AI Service (internal:8000)                     │
│                    PostgreSQL Database (port 5432)                      │
│                    (Never exposed to browsers)                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## API Base URL

| Environment | Kestrel Binding         | Public URL                                          |
|-------------|-------------------------|-----------------------------------------------------|
| Development | `http://localhost:5080` | `http://localhost:5080`                             |
| Production  | Internal (5000 or 80)   | `https://api.project-nexus.net` (via reverse proxy) |

**Note:** In production, Kestrel binds to an internal port. Plesk's Nginx reverse proxy terminates HTTPS and forwards requests.

## Frontend Applications

| App             | Dev URL                 | Production URL                     | CORS Required | Notes                         |
|-----------------|-------------------------|------------------------------------|---------------|-------------------------------|
| UK Frontend     | `http://localhost:5180` | `https://uk.project-nexus.net`     | Yes           | GOV.UK design system portal   |
| Modern Frontend | `http://localhost:5170` | `https://app.project-nexus.net`    | Yes           | Next.js (HeroUI) SPA         |
| Mobile App      | N/A                     | `https://api.project-nexus.net`    | **No**        | Native HTTP client            |
| LLaMA Service   | `http://localhost:8000` | Internal only                      | **No**        | Server-to-server only         |

## Common Mistakes to Avoid

### 1. Do NOT add internal services to CORS

```json
// WRONG - LLaMA is internal, never browser-facing
{
  "Cors": {
    "AllowedOrigins": [
      "https://uk.project-nexus.net",
      "http://localhost:8000"  // ❌ WRONG: Internal service
    ]
  }
}
```

Internal services (LLaMA, databases, message queues) communicate server-to-server. They don't make browser requests, so CORS doesn't apply.

### 2. Do NOT create one API per frontend

```text
❌ WRONG:
  uk.project-nexus.net    → api-uk.project-nexus.net:5001
  ie.project-nexus.net    → api-ie.project-nexus.net:5002
  app.project-nexus.net   → api-app.project-nexus.net:5003

✅ CORRECT:
  uk.project-nexus.net    → api.project-nexus.net (CORS allows origin)
  ie.project-nexus.net    → api.project-nexus.net (CORS allows origin)
  app.project-nexus.net   → api.project-nexus.net (CORS allows origin)
```

One API, multiple allowed origins. The API identifies the tenant from JWT claims, not from which frontend called it.

### 3. Do NOT expose AI services directly to browsers

```text
❌ WRONG:
  Browser → https://llama.project-nexus.net/chat  (direct browser access)

✅ CORRECT:
  Browser → https://api.project-nexus.net/ai/chat → Internal LLaMA service
```

AI services should be called by the API server, not by browsers. This allows for:

- Rate limiting and authentication
- Cost control and usage tracking
- Prompt injection protection
- Response sanitization

---

## CORS Configuration

CORS is configured per environment. Only **browser origins** are listed (not internal services).

**Development** (`appsettings.Development.json`):

```json
{
  "Cors": {
    "AllowedOrigins": [
      "http://localhost:5080",
      "http://localhost:5170",
      "http://localhost:5180"
    ]
  }
}
```

**Production** (`appsettings.Production.json`):

```json
{
  "Cors": {
    "AllowedOrigins": [
      "https://uk.project-nexus.net",
      "https://ie.project-nexus.net",
      "https://app.project-nexus.net",
    ]
  }
}
```

**Important notes:**

- Mobile apps do NOT need CORS (they make direct HTTP requests, not browser requests)
- LLaMA service does NOT need CORS (server-to-server calls from ASP.NET API)
- Origins must be valid URLs (no trailing slash, no paths) - invalid entries are filtered out
- In Production, at least one valid origin is required or the app won't start
- In Development, missing origins only logs a warning (Swagger still works)
- `AllowCredentials()` is NOT used since we use JWT Bearer tokens (not cookies)

---

## Authentication Flow

### 1. Login

**Endpoint:** `POST /api/auth/login`

**Request:**
```json
{
  "email": "admin@acme.test",
  "password": "Test123!",
  "tenant_slug": "acme"
}
```

**Response (200 OK):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "user": {
    "id": 1,
    "email": "admin@acme.test",
    "first_name": "Alice",
    "last_name": "Admin",
    "role": "admin"
  }
}
```

**Error (401):**
```json
{
  "error": "Email, password or tenant is incorrect"
}
```

### 2. Store the Token

Store the `access_token` securely:
- **Recommended:** HttpOnly cookie (if using server-side rendering)
- **Alternative:** localStorage or sessionStorage (for SPAs)

```javascript
// Example: storing in localStorage
localStorage.setItem('token', response.access_token);
```

### 3. Include Token in Requests

Add the token to the `Authorization` header for all authenticated requests:

```javascript
const token = localStorage.getItem('token');

fetch('https://api.project-nexus.net/api/users/me', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
```

### 4. Validate Token

**Endpoint:** `GET /api/auth/validate`

Returns user info if token is valid, 401 if invalid/expired.

---

## Test Credentials

| Email | Password | Tenant | Role |
|-------|----------|--------|------|
| admin@acme.test | Test123! | acme | admin |
| member@acme.test | Test123! | acme | member |
| admin@globex.test | Test123! | globex | admin |

---

## Available API Endpoints

### Authentication - ✅ IMPLEMENTED

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/auth/login | No | Login with email, password, tenant_slug |
| POST | /api/auth/logout | Yes | Logout and revoke refresh token |
| POST | /api/auth/refresh | Yes | Refresh access token |
| POST | /api/auth/register | No | Register new user |
| POST | /api/auth/forgot-password | No | Request password reset token |
| POST | /api/auth/reset-password | No | Reset password with token |
| GET | /api/auth/validate | Yes | Validate token and get user info |

### Registration Policy - ✅ IMPLEMENTED

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/registration/config?tenant_slug=X | No | Get tenant's public registration config |
| POST | /api/registration/verify/start | Yes | Start identity verification session |
| GET | /api/registration/verify/status | Yes | Get current verification session status |
| POST | /api/registration/webhook/{tenantId}?provider=X | No | Provider webhook callback |

### Users - ✅ IMPLEMENTED

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/users | Yes | List users in tenant |
| GET | /api/users/{id} | Yes | Get user by ID |
| GET | /api/users/me | Yes | Get current user |
| PATCH | /api/users/me | Yes | Update current user (first_name, last_name) |

### Listings - ✅ IMPLEMENTED

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/listings | Yes | List listings (supports ?type=offer&status=active&page=1&limit=10) |
| GET | /api/listings/{id} | Yes | Get listing by ID |
| POST | /api/listings | Yes | Create listing |
| PUT | /api/listings/{id} | Yes | Update listing (owner only) |
| DELETE | /api/listings/{id} | Yes | Delete listing (owner only) |

### Wallet - ✅ IMPLEMENTED

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/wallet/balance | Yes | Get current user's balance |
| GET | /api/wallet/transactions | Yes | Get transaction history (?type=sent&page=1&limit=10) |
| GET | /api/wallet/transactions/{id} | Yes | Get transaction by ID |
| POST | /api/wallet/transfer | Yes | Transfer time credits |

### Messages - ✅ IMPLEMENTED

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/messages | Yes | List conversations |
| GET | /api/messages/{id} | Yes | Get conversation with messages |
| GET | /api/messages/unread-count | Yes | Get unread message count |
| POST | /api/messages | Yes | Send a message (creates conversation if needed) |
| PUT | /api/messages/{id}/read | Yes | Mark all messages in conversation as read |

### Connections - ✅ IMPLEMENTED

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/connections | Yes | List connections (?status=accepted&page=1&limit=20) |
| GET | /api/connections/pending | Yes | Get pending connection requests |
| POST | /api/connections | Yes | Send connection request |
| PUT | /api/connections/{id}/accept | Yes | Accept connection request |
| PUT | /api/connections/{id}/decline | Yes | Decline connection request |
| DELETE | /api/connections/{id} | Yes | Remove connection |

### Notifications - ✅ IMPLEMENTED

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/notifications | Yes | List notifications (?unread_only=true&page=1&limit=20) |
| GET | /api/notifications/unread-count | Yes | Get unread notification count |
| GET | /api/notifications/{id} | Yes | Get notification by ID |
| PUT | /api/notifications/{id}/read | Yes | Mark notification as read |
| PUT | /api/notifications/read-all | Yes | Mark all notifications as read |
| DELETE | /api/notifications/{id} | Yes | Delete notification |

### Groups - ✅ IMPLEMENTED

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/groups | Yes | List groups (?page=1&limit=20) |
| GET | /api/groups/{id} | Yes | Get group by ID |
| POST | /api/groups | Yes | Create group |
| PUT | /api/groups/{id} | Yes | Update group (admin only) |
| DELETE | /api/groups/{id} | Yes | Delete group (admin only) |
| POST | /api/groups/{id}/join | Yes | Join group |
| DELETE | /api/groups/{id}/leave | Yes | Leave group |
| GET | /api/groups/{id}/members | Yes | List group members |
| PUT | /api/groups/{id}/members/{userId}/role | Yes | Update member role (owner only) |
| DELETE | /api/groups/{id}/members/{userId} | Yes | Remove member (admin only) |
| PUT | /api/groups/{id}/transfer-ownership | Yes | Transfer group ownership (owner only) |

### Events - ✅ IMPLEMENTED

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/events | Yes | List events (?status=upcoming&page=1&limit=20) |
| GET | /api/events/{id} | Yes | Get event by ID |
| POST | /api/events | Yes | Create event |
| PUT | /api/events/{id} | Yes | Update event (organizer only) |
| DELETE | /api/events/{id} | Yes | Delete event (organizer only) |
| POST | /api/events/{id}/rsvp | Yes | RSVP to event |
| DELETE | /api/events/{id}/rsvp | Yes | Cancel RSVP |
| GET | /api/events/{id}/rsvps | Yes | List event RSVPs |

### Feed (Social Posts) - ✅ IMPLEMENTED

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/feed | Yes | List feed posts (?page=1&limit=20) |
| GET | /api/feed/{id} | Yes | Get post by ID |
| POST | /api/feed | Yes | Create post |
| PUT | /api/feed/{id} | Yes | Update post (author only) |
| DELETE | /api/feed/{id} | Yes | Delete post (author only) |
| POST | /api/feed/{id}/like | Yes | Like post |
| DELETE | /api/feed/{id}/like | Yes | Unlike post |
| GET | /api/feed/{id}/comments | Yes | Get post comments |
| POST | /api/feed/{id}/comments | Yes | Add comment |
| DELETE | /api/feed/{id}/comments/{commentId} | Yes | Delete comment (author only) |

### Gamification - ✅ IMPLEMENTED

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/gamification/profile | Yes | Get current user's XP, level, progress |
| GET | /api/gamification/profile/{userId} | Yes | Get another user's public gamification profile |
| GET | /api/gamification/badges | Yes | Get all badges with earned status |
| GET | /api/gamification/badges/my | Yes | Get current user's earned badges |
| GET | /api/gamification/leaderboard | Yes | Get XP leaderboard (?period=week&page=1&limit=20) |
| GET | /api/gamification/xp-history | Yes | Get current user's XP transaction log |

### Reviews - ✅ IMPLEMENTED

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/users/{id}/reviews | Yes | Get reviews for a user |
| POST | /api/users/{id}/reviews | Yes | Leave a review for a user |
| GET | /api/listings/{id}/reviews | Yes | Get reviews for a listing |
| POST | /api/listings/{id}/reviews | Yes | Leave a review for a listing |
| GET | /api/reviews/{id} | Yes | Get a specific review by ID |
| PUT | /api/reviews/{id} | Yes | Update own review |
| DELETE | /api/reviews/{id} | Yes | Delete own review |

### Health - ✅ IMPLEMENTED

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /health | No | Health check |

---

### Search - ✅ IMPLEMENTED

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/search | Yes | Unified search (?q=term&type=all) |
| GET | /api/search/suggestions | Yes | Autocomplete suggestions |
| GET | /api/members | Yes | Member directory (?q=name) |

---

### File Uploads - IMPLEMENTED

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/files/upload | Yes | Upload a file |
| GET | /api/files | Yes | List user's files |
| GET | /api/files/{id} | Yes | Get file metadata |
| GET | /api/files/{id}/download | Yes | Download file |
| DELETE | /api/files/{id} | Yes | Delete file |

### User Preferences - IMPLEMENTED

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/preferences | Yes | Get preferences (theme, language, timezone, privacy) |
| PUT | /api/preferences | Yes | Update preferences |

### Two-Factor Auth (TOTP) - IMPLEMENTED

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/auth/2fa/status | Yes | Get 2FA status |
| POST | /api/auth/2fa/setup | Yes | Initiate TOTP setup (returns QR) |
| POST | /api/auth/2fa/verify-setup | Yes | Verify code and enable 2FA |
| POST | /api/auth/2fa/verify | Yes | Verify TOTP during login |
| POST | /api/auth/2fa/disable | Yes | Disable 2FA |

### Passkeys (WebAuthn/FIDO2) - IMPLEMENTED

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/passkeys/register/begin | Yes | Begin passkey registration |
| POST | /api/passkeys/register/finish | Yes | Complete registration |
| POST | /api/passkeys/authenticate/begin | No | Begin passwordless login |
| POST | /api/passkeys/authenticate/finish | No | Complete passwordless login |
| GET | /api/passkeys | Yes | List passkeys |
| PUT | /api/passkeys/{id} | Yes | Rename passkey |
| DELETE | /api/passkeys/{id} | Yes | Delete passkey |

### GDPR & Compliance - IMPLEMENTED

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/gdpr/my-data | Yes | Export user data |
| DELETE | /api/gdpr/my-data | Yes | Request data deletion |
| GET | /api/gdpr/consent | Yes | Get consent status |
| POST | /api/gdpr/consent | Yes | Record consent |
| GET | /api/cookie-consent/config | No | Cookie consent config |
| POST | /api/cookie-consent | Yes | Save cookie preferences |

### Content Reporting - IMPLEMENTED

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/reports | Yes | File a content report |
| GET | /api/reports/my | Yes | My filed reports |
| GET | /api/reports/warnings | Yes | My warnings |
| PUT | /api/reports/warnings/{id}/acknowledge | Yes | Acknowledge warning |

### Exchanges - IMPLEMENTED

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/exchanges | Yes | List my exchanges |
| GET | /api/exchanges/{id} | Yes | Get exchange detail |
| POST | /api/exchanges | Yes | Request exchange |
| PUT | /api/exchanges/{id}/accept | Yes | Accept |
| PUT | /api/exchanges/{id}/decline | Yes | Decline |
| PUT | /api/exchanges/{id}/start | Yes | Start |
| PUT | /api/exchanges/{id}/complete | Yes | Complete (transfers credits) |
| PUT | /api/exchanges/{id}/cancel | Yes | Cancel |
| PUT | /api/exchanges/{id}/dispute | Yes | Dispute |
| POST | /api/exchanges/{id}/rate | Yes | Rate participant |
| GET | /api/exchanges/by-listing/{listingId} | Yes | Get exchanges by listing |

### Jobs - IMPLEMENTED

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/jobs | Yes | List vacancies |
| POST | /api/jobs | Yes | Create vacancy |
| GET | /api/jobs/{id} | Yes | Get details |
| POST | /api/jobs/{id}/apply | Yes | Apply |
| POST | /api/jobs/{id}/save | Yes | Save/bookmark |
| GET | /api/jobs/saved | Yes | Saved jobs |
| GET | /api/jobs/my | Yes | My posted jobs |

### Polls - IMPLEMENTED

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/polls | Yes | List polls |
| POST | /api/polls | Yes | Create poll |
| GET | /api/polls/{id} | Yes | Get poll with options |
| POST | /api/polls/{id}/vote | Yes | Cast vote |
| GET | /api/polls/{id}/results | Yes | Get results |

### Goals - IMPLEMENTED

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/goals | Yes | List my goals |
| POST | /api/goals | Yes | Create goal |
| PUT | /api/goals/{id}/progress | Yes | Update progress |
| PUT | /api/goals/{id}/milestones/{mid}/complete | Yes | Complete milestone |

### Ideas & Challenges - IMPLEMENTED

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/ideas | Yes | List ideas |
| POST | /api/ideas | Yes | Submit idea |
| POST | /api/ideas/{id}/vote | Yes | Upvote |
| POST | /api/ideas/{id}/comments | Yes | Comment |
| GET | /api/challenges | Yes | List challenges |
| POST | /api/challenges/{id}/join | Yes | Join |

### Member Availability - IMPLEMENTED

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/availability | Yes | My schedule |
| POST | /api/availability | Yes | Add slot |
| PUT | /api/availability/bulk | Yes | Replace schedule |
| GET | /api/availability/exceptions | Yes | My exceptions |
| POST | /api/availability/exceptions | Yes | Add exception |

### Knowledge Base - IMPLEMENTED

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/kb/articles | Yes | List articles |
| GET | /api/kb/articles/by-slug/{slug} | Yes | Get by slug |

### Legal Documents - IMPLEMENTED

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/legal/documents | Yes | List documents |
| POST | /api/legal/documents/{id}/accept | Yes | Accept document |


### Federation - IMPLEMENTED

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/federation/listings | Yes | Browse federated listings |
| POST | /api/federation/exchanges | Yes | Initiate cross-tenant exchange |
| PUT | /api/federation/exchanges/{id}/complete | Yes | Complete federated exchange |
| GET | /api/federation/exchanges | Yes | List federated exchanges |
| GET | /api/federation/settings | Yes | Get federation settings |
| PUT | /api/federation/settings | Yes | Update federation settings (opt-in, visibility) |

**External API** (for partner servers, authenticated via X-Federation-Key or Federation JWT):

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/v1/federation | None | API info + endpoint directory |
| POST | /api/v1/federation/token | Key | Request federation JWT |
| GET | /api/v1/federation/timebanks | Key/JWT | List partner timebanks |
| GET | /api/v1/federation/listings | Key/JWT | Search shared listings |
| GET | /api/v1/federation/members | Key/JWT | Search shared members |
| POST | /api/v1/federation/exchanges | Key/JWT | Initiate exchange |
| POST | /api/v1/federation/webhooks/test | Key | Test webhook connectivity |

### Volunteering - IMPLEMENTED

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/volunteering/opportunities | Yes | List opportunities |
| GET | /api/volunteering/opportunities/{id} | Yes | Get opportunity |
| POST | /api/volunteering/opportunities | Yes | Create opportunity |
| PUT | /api/volunteering/opportunities/{id} | Yes | Update opportunity |
| PUT | /api/volunteering/opportunities/{id}/publish | Yes | Publish opportunity |
| PUT | /api/volunteering/opportunities/{id}/close | Yes | Close opportunity |
| POST | /api/volunteering/opportunities/{id}/apply | Yes | Apply to opportunity |
| GET | /api/volunteering/opportunities/{id}/applications | Yes | List applications (organizer) |
| PUT | /api/volunteering/applications/{id}/review | Yes | Review application |
| DELETE | /api/volunteering/applications/{id} | Yes | Withdraw application |
| GET | /api/volunteering/opportunities/{id}/shifts | Yes | List shifts |
| POST | /api/volunteering/opportunities/{id}/shifts | Yes | Create shift |
| POST | /api/volunteering/shifts/{id}/check-in | Yes | Check in to shift |
| PUT | /api/volunteering/shifts/{id}/check-out | Yes | Check out of shift |
| GET | /api/volunteering/my | Yes | My volunteering history |
| GET | /api/volunteering/stats | Yes | Volunteer statistics |

### Smart Matching - IMPLEMENTED

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/matching | Yes | Get my matches |
| POST | /api/matching/compute | Yes | Compute matches |
| GET | /api/matching/{id} | Yes | Get match detail |
| PUT | /api/matching/{id}/respond | Yes | Respond to match |
| GET | /api/matching/preferences | Yes | Get match preferences |
| PUT | /api/matching/preferences | Yes | Update match preferences |

### Skills & Endorsements - IMPLEMENTED

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/skills | Yes | Get skill catalog |
| GET | /api/skills/users/{userId} | Yes | Get user's skills |
| POST | /api/skills/my | Yes | Add skill to my profile |
| DELETE | /api/skills/my/{skillId} | Yes | Remove skill |
| PUT | /api/skills/my/{skillId} | Yes | Update proficiency level |
| POST | /api/skills/users/{userId}/{skillId}/endorse | Yes | Endorse a skill |
| DELETE | /api/skills/users/{userId}/{skillId}/endorse | Yes | Remove endorsement |
| GET | /api/skills/users/{userId}/{skillId}/endorsements | Yes | List endorsements |
| GET | /api/skills/top-endorsed | Yes | Top endorsed users |
| GET | /api/skills/suggestions | Yes | Skill suggestions |

### Location/Geo - IMPLEMENTED

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| PUT | /api/location/me | Yes | Update my location |
| GET | /api/location/me | Yes | Get my location |
| GET | /api/location/users/{userId} | Yes | Get user location (respects privacy) |
| GET | /api/location/nearby/users | Yes | Find nearby users |
| GET | /api/location/nearby/listings | Yes | Find nearby listings |
| GET | /api/location/distance/{userId} | Yes | Calculate distance to user |

### Newsletter - IMPLEMENTED

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/newsletter/subscribe | No | Subscribe to newsletter |
| POST | /api/newsletter/unsubscribe | No | Unsubscribe |

### Translation/i18n - IMPLEMENTED

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/i18n/translations/{locale} | No | Get translations for locale |
| GET | /api/i18n/locales | No | Get supported locales |
| GET | /api/i18n/my-locale | Yes | Get my locale preference |
| PUT | /api/i18n/my-locale | Yes | Set my locale preference |

### Push Notifications - IMPLEMENTED

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/notifications/push/register | Yes | Register device |
| DELETE | /api/notifications/push/register | Yes | Unregister device |
| GET | /api/notifications/push/devices | Yes | Get my devices |
| GET | /api/notifications/preferences | Yes | Get notification preferences |
| PUT | /api/notifications/preferences | Yes | Update notification preferences |

### Gamification V2 (Extended) - IMPLEMENTED

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/gamification/v2/challenges | Yes | List active challenges |
| GET | /api/gamification/v2/challenges/{id} | Yes | Get challenge |
| POST | /api/gamification/v2/challenges/{id}/join | Yes | Join challenge |
| GET | /api/gamification/v2/challenges/my | Yes | My challenges |
| GET | /api/gamification/v2/streaks | Yes | My streaks |
| GET | /api/gamification/v2/streaks/leaderboard | Yes | Streak leaderboard |
| GET | /api/gamification/v2/seasons/current | Yes | Current season |
| GET | /api/gamification/v2/seasons/{id}/leaderboard | Yes | Season leaderboard |
| POST | /api/gamification/v2/daily-reward | Yes | Claim daily reward |
| GET | /api/gamification/v2/daily-reward/status | Yes | Daily reward status |

### Listing Features (Extended) - IMPLEMENTED

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/listings/{id}/view | Yes | Track listing view |
| GET | /api/listings/{id}/analytics | Yes | Get listing analytics (owner only) |
| POST | /api/listings/{id}/favorite | Yes | Favorite listing |
| DELETE | /api/listings/{id}/favorite | Yes | Unfavorite listing |
| GET | /api/listings/favorites | Yes | Get my favorites |
| POST | /api/listings/{id}/tags | Yes | Add tag |
| DELETE | /api/listings/{id}/tags/{tag} | Yes | Remove tag |
| GET | /api/listings/featured | Yes | Get featured listings |
| GET | /api/listings/expiring | Yes | Get expiring listings |
| PUT | /api/listings/{id}/renew | Yes | Renew listing |

### Wallet Features (Extended) - IMPLEMENTED

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/wallet/features/categories | Yes | List transaction categories |
| GET | /api/wallet/features/limits | Yes | Get my spending limits |
| GET | /api/wallet/features/summary | Yes | Get balance summary |
| POST | /api/wallet/features/donate | Yes | Donate credits |
| GET | /api/wallet/features/donations | Yes | Donation history |
| POST | /api/wallet/features/alerts | Yes | Create balance alert |
| GET | /api/wallet/features/alerts | Yes | Get my alerts |
| DELETE | /api/wallet/features/alerts/{id} | Yes | Delete alert |
| GET | /api/wallet/features/export | Yes | Export transactions |

### Group Features (Extended) - IMPLEMENTED

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/groups/{groupId}/announcements | Yes | Get announcements |
| POST | /api/groups/{groupId}/announcements | Yes | Create announcement |
| DELETE | /api/groups/{groupId}/announcements/{id} | Yes | Delete announcement |
| GET | /api/groups/{groupId}/policies | Yes | Get policies |
| PUT | /api/groups/{groupId}/policies | Yes | Set policy |
| DELETE | /api/groups/{groupId}/policies/{key} | Yes | Delete policy |
| GET | /api/groups/{groupId}/discussions | Yes | Get discussions |
| GET | /api/groups/{groupId}/discussions/{id} | Yes | Get discussion |
| POST | /api/groups/{groupId}/discussions | Yes | Create discussion |
| POST | /api/groups/{groupId}/discussions/{id}/replies | Yes | Reply to discussion |
| GET | /api/groups/{groupId}/files | Yes | Get files |
| POST | /api/groups/{groupId}/files | Yes | Add file |
| DELETE | /api/groups/{groupId}/files/{id} | Yes | Delete file |

### Feed Ranking (Extended) - IMPLEMENTED

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/feed/ranked | Yes | Get ranked feed |
| GET | /api/feed/trending | Yes | Get trending posts |
| POST | /api/feed/{id}/bookmark | Yes | Bookmark post |
| DELETE | /api/feed/{id}/bookmark | Yes | Remove bookmark |
| GET | /api/feed/bookmarks | Yes | Get bookmarks |
| POST | /api/feed/{id}/share | Yes | Share post |
| GET | /api/feed/{id}/engagement | Yes | Get engagement stats |

### Volunteer Availability - IMPLEMENTED

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/volunteering/availability/my | Yes | Get my availability |
| PUT | /api/volunteering/availability | Yes | Set availability |


### System Announcements - IMPLEMENTED

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/announcements | No | Get active announcements |

### Blog & CMS - IMPLEMENTED

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/blog | Yes | List published blog posts (paginated) |
| GET | /api/blog/categories | Yes | List blog categories |
| GET | /api/blog/{slug} | Yes | Get published post by slug |

### CMS Pages - IMPLEMENTED

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/pages | Yes | List published pages |
| GET | /api/pages/menu | No | Get menu pages by location |
| GET | /api/pages/{slug} | No | Get published page by slug |

### Organisations - IMPLEMENTED

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/organisations | Yes | List verified public organisations |
| GET | /api/organisations/my | Yes | List my organisations |
| GET | /api/organisations/{id} | Yes | Get organisation details |
| GET | /api/organisations/slug/{slug} | Yes | Get organisation by slug |
| POST | /api/organisations | Yes | Create organisation |
| PUT | /api/organisations/{id} | Yes | Update organisation |
| DELETE | /api/organisations/{id} | Yes | Delete organisation (owner only) |
| GET | /api/organisations/{id}/members | Yes | List organisation members |
| POST | /api/organisations/{id}/members | Yes | Add member |
| DELETE | /api/organisations/{id}/members/{memberId} | Yes | Remove member |
| PUT | /api/organisations/{id}/members/{memberId}/role | Yes | Update member role |

### Organisation Wallets - IMPLEMENTED

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/organisations/{orgId}/wallet | Yes | Get org wallet balance |
| GET | /api/organisations/{orgId}/wallet/transactions | Yes | List wallet transactions |
| POST | /api/organisations/{orgId}/wallet/donate | Yes | Donate from personal wallet to org |
| POST | /api/organisations/{orgId}/wallet/transfer | Yes | Transfer from org wallet to user (admin/owner) |

### NexusScore - IMPLEMENTED

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/nexus-score/me | Yes | Get my NexusScore |
| GET | /api/nexus-score/{userId} | Yes | Get another user's NexusScore |
| POST | /api/nexus-score/recalculate | Yes | Recalculate my score |
| GET | /api/nexus-score/leaderboard | Yes | NexusScore leaderboard (paginated) |
| GET | /api/nexus-score/history | Yes | Score history |

### Onboarding Wizard - IMPLEMENTED

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/onboarding/steps | Yes | Get all onboarding steps |
| GET | /api/onboarding/progress | Yes | Get current user's progress |
| POST | /api/onboarding/complete | Yes | Mark step as complete |
| POST | /api/onboarding/reset | Yes | Reset onboarding progress |


### Insurance Certificates - IMPLEMENTED

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/insurance | Yes | Get my insurance certificates |
| GET | /api/insurance/{id} | Yes | Get certificate details |
| POST | /api/insurance | Yes | Upload/create certificate |
| PUT | /api/insurance/{id} | Yes | Update certificate |
| DELETE | /api/insurance/{id} | Yes | Delete certificate |

### Voice Messages - IMPLEMENTED

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/voice-messages/conversation/{conversationId} | Yes | List voice messages in conversation |
| GET | /api/voice-messages/{id} | Yes | Get voice message details |
| POST | /api/voice-messages | Yes | Send voice message |
| PUT | /api/voice-messages/{id}/read | Yes | Mark as read |
| DELETE | /api/voice-messages/{id} | Yes | Delete voice message |

### Semantic Search (Meilisearch) - IMPLEMENTED

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/search/semantic | Yes | Full-text search (?q=term&type=all&limit=20) |
| GET | /api/search/semantic/status | Yes | Meilisearch health and stats |

### Event Reminders - IMPLEMENTED

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/events/{eventId}/reminders | Yes | Get reminders for event |
| POST | /api/events/{eventId}/reminders | Yes | Set reminder for event |
| DELETE | /api/events/{eventId}/reminders/{id} | Yes | Remove reminder |
| GET | /api/users/me/reminders | Yes | Get all my upcoming reminders |

### Member Activity - IMPLEMENTED

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/users/me/activity | Yes | My recent activity (paginated) |
| GET | /api/users/me/activity/dashboard | Yes | My dashboard stats |
| GET | /api/users/{userId}/activity | Yes | Another user's activity |
| GET | /api/users/{userId}/activity/dashboard | Yes | Another user's dashboard stats |

### Review Trust - IMPLEMENTED

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/reviews/pending | Yes | Pending reviews for completed exchanges |
| GET | /api/reviews/user/{userId}/trust | Yes | Time-decay weighted trust score |
| GET | /api/reviews/exchange/{exchangeId}/rating | Yes | Ratings for specific exchange |

### Verification Badges - IMPLEMENTED

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/verification-badges/types | Yes | List all badge types |
| GET | /api/verification-badges/me | Yes | My verification badges |
| GET | /api/verification-badges/users/{userId} | Yes | User's verification badges |

### Feed Moderation - IMPLEMENTED

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/feed/{id}/report | Yes | Report a post |

### Notification Polling - IMPLEMENTED

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/notifications/poll | Yes | Poll for new notifications (?since=timestamp) |
| GET | /api/realtime/config | No | Get realtime config (hub URL, transports) |


### FAQ - IMPLEMENTED

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/faqs | No | List FAQs (?category=X&publishedOnly=true) |
| GET | /api/faqs/{id} | No | Get FAQ by ID |
| GET | /api/faqs/categories | No | List FAQ categories |


### Session Management - IMPLEMENTED

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/sessions | Yes | List my active sessions |
| DELETE | /api/sessions/{id} | Yes | Terminate a session |
| DELETE | /api/sessions | Yes | Terminate all other sessions |


---

## Example: React/Fetch Integration

```javascript
// api.js - API client
const API_BASE = 'https://api.project-nexus.net';

export async function login(email, password, tenantSlug) {
  const response = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password,
      tenant_slug: tenantSlug
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Login failed');
  }

  return response.json();
}

export async function fetchWithAuth(endpoint, options = {}) {
  const token = localStorage.getItem('token');

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers
    }
  });

  if (response.status === 401) {
    // Token expired - redirect to login
    localStorage.removeItem('token');
    window.location.href = '/login';
    throw new Error('Session expired');
  }

  return response;
}

// Usage examples
export const getListings = () => fetchWithAuth('/api/listings').then(r => r.json());
export const getBalance = () => fetchWithAuth('/api/wallet/balance').then(r => r.json());
export const getConversations = () => fetchWithAuth('/api/messages').then(r => r.json());

export async function createListing(data) {
  const response = await fetchWithAuth('/api/listings', {
    method: 'POST',
    body: JSON.stringify(data)
  });
  return response.json();
}

export async function transferCredits(receiverId, amount, description) {
  const response = await fetchWithAuth('/api/wallet/transfer', {
    method: 'POST',
    body: JSON.stringify({
      receiver_id: receiverId,
      amount,
      description
    })
  });
  return response.json();
}
```

---

## JSON Property Naming Convention

The API uses **camelCase** for JSON properties (ASP.NET Core default):

```json
{
  "id": 1,
  "firstName": "Alice",
  "lastName": "Admin",
  "createdAt": "2026-02-02T10:00:00Z",
  "tenantId": 1
}
```

**Note:** Some endpoints use explicit `[JsonPropertyName]` annotations with snake_case for backward compatibility (e.g. `access_token`, `tenant_slug` in auth responses). The default serialization is camelCase.

---

## Error Handling

All errors return JSON with an `error` field:

```json
{
  "error": "Error message here"
}
```

Some errors include additional fields:

```json
{
  "error": "Insufficient balance",
  "current_balance": 2.5,
  "requested_amount": 10.0
}
```

### Common HTTP Status Codes

| Status | Meaning |
|--------|---------|
| 200 | Success |
| 201 | Created (POST success) |
| 400 | Bad Request (validation error) |
| 401 | Unauthorized (missing/invalid token) |
| 403 | Forbidden (not allowed) |
| 404 | Not Found |
| 500 | Server Error |

---

## Pagination

Paginated endpoints accept `page` and `limit` query parameters:

```
GET /api/listings?page=1&limit=10
```

Response includes pagination info:

```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 42,
    "total_pages": 5
  }
}
```

---

## Filtering

### Listings
- `type`: `offer` or `request`
- `status`: `active`, `draft`, `completed`, `cancelled`
- `user_id`: Filter by user

```
GET /api/listings?type=offer&status=active&user_id=1
```

### Transactions
- `type`: `sent`, `received`, or `all` (default)

```
GET /api/wallet/transactions?type=sent
```

---

## Starting the Backend

Docker is required for local development. Do NOT use `dotnet run` directly.

```powershell
# Start the full stack (API + PostgreSQL + RabbitMQ + Ollama)
cd c:\platforms\htdocs\asp.net-backend
docker compose up -d

# API will be available at http://localhost:5080
# Health check: http://localhost:5080/health
# Swagger: http://localhost:5080/swagger
```

---

## Swagger / OpenAPI

In Development mode, Swagger UI is available at:
- `http://localhost:5080/swagger`

This provides interactive API documentation where you can test endpoints directly.

---


## New Module Response Examples & UI Suggestions

### Blog & CMS

#### GET /api/blog?page=1&limit=10

```json
{
  "data": [
    {
      "id": 1,
      "title": "Community Garden Project Update",
      "slug": "community-garden-project-update",
      "content": "<p>Our community garden is thriving...</p>",
      "excerpt": "Our community garden is thriving this season",
      "featured_image_url": "/files/garden-hero.jpg",
      "status": "published",
      "tags": "garden,community,update",
      "is_featured": true,
      "view_count": 42,
      "published_at": "2026-03-01T10:00:00Z",
      "created_at": "2026-02-28T14:00:00Z",
      "updated_at": "2026-03-01T10:00:00Z",
      "category": {
        "id": 1,
        "name": "Community News",
        "slug": "community-news",
        "color": "#4CAF50"
      },
      "author": {
        "id": 1,
        "firstName": "Alice",
        "lastName": "Admin"
      },
      "meta_title": null,
      "meta_description": null
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 1
  }
}
```


#### UI Suggestions - Blog

1. **Blog Index Page**: Card grid with featured image, title, excerpt, category badge, author avatar, date
2. **Blog Detail Page**: Hero image, rendered HTML content, author card, related posts
3. **Category Filter**: Sidebar or top-bar filter by category with colored badges

### CMS Pages

#### GET /api/pages/{slug}

```json
{
  "data": {
    "id": 1,
    "title": "About Us",
    "slug": "about-us",
    "content": "<h2>Our Mission</h2><p>Project NEXUS...</p>",
    "is_published": true,
    "show_in_menu": true,
    "menu_location": "header",
    "sort_order": 1,
    "parent_id": null,
    "current_version": 3,
    "meta_title": "About Us - Project NEXUS",
    "meta_description": "Learn about our timebanking community",
    "created_at": "2026-01-15T10:00:00Z",
    "updated_at": "2026-03-05T09:00:00Z",
    "created_by": {
      "id": 1,
      "firstName": "Alice",
      "lastName": "Admin"
    }
  }
}
```

#### GET /api/pages/menu?location=header

```json
{
  "data": [
    { "id": 1, "title": "About Us", "slug": "about-us", "menu_location": "header", "sort_order": 1, "parent_id": null },
    { "id": 2, "title": "How It Works", "slug": "how-it-works", "menu_location": "header", "sort_order": 2, "parent_id": null },
    { "id": 3, "title": "FAQ", "slug": "faq", "menu_location": "header", "sort_order": 3, "parent_id": null }
  ]
}
```

#### UI Suggestions - Pages

1. **Dynamic Navigation**: Fetch `/api/pages/menu?location=header` on app load, render as nav links
2. **Footer Links**: Fetch `/api/pages/menu?location=footer` for footer navigation
3. **Page Renderer**: Render `content` as sanitized HTML (use DOMPurify)

### Organisations

#### GET /api/organisations?page=1&limit=20

```json
{
  "data": [
    {
      "id": 1,
      "name": "Community Garden Co-op",
      "slug": "community-garden-coop",
      "description": "A cooperative managing community gardens across the region",
      "logo_url": "/files/coop-logo.png",
      "website_url": "https://garden-coop.example.com",
      "email": "info@garden-coop.example.com",
      "phone": "+353 21 123 4567",
      "address": "Main Street, Bantry, Co. Cork",
      "latitude": 51.6806,
      "longitude": -9.4536,
      "type": "charity",
      "industry": "Community Development",
      "status": "verified",
      "is_public": true,
      "created_at": "2026-01-20T10:00:00Z",
      "verified_at": "2026-01-25T14:00:00Z",
      "owner": {
        "id": 1,
        "firstName": "Alice",
        "lastName": "Admin"
      }
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 1 }
}
```

#### POST /api/organisations (Create)

**Request:**
```json
{
  "name": "West Cork Tech Hub",
  "description": "Co-working and tech community space",
  "type": "business",
  "industry": "Technology",
  "email": "hello@wcth.example.com",
  "is_public": true
}
```

#### UI Suggestions - Organisations

1. **Organisation Directory**: Card grid with logo, name, type badge, verified tick, member count
2. **Organisation Profile**: Full detail page with map (if lat/lng), member list, wallet balance
3. **Create Organisation Form**: Multi-step form: basics, contact info, location (optional map picker)
4. **Member Management**: Table of members with role dropdown (owner/admin/member/volunteer), add/remove

### Organisation Wallets

#### GET /api/organisations/{orgId}/wallet

```json
{
  "data": {
    "id": 1,
    "organisation_id": 1,
    "balance": 150.5,
    "total_received": 200.0,
    "total_spent": 49.5,
    "created_at": "2026-01-20T10:00:00Z"
  }
}
```

#### POST /api/organisations/{orgId}/wallet/donate

**Request:**
```json
{
  "amount": 5.0,
  "description": "Monthly donation"
}
```

#### UI Suggestions - Org Wallets

1. **Wallet Dashboard**: Balance card with total received/spent, recent transactions list
2. **Donate Button**: Modal with amount input, description, confirmation
3. **Transfer (Admin/Owner)**: Select user from org members, enter amount
4. **Transaction History**: Filterable table with type icons (credit=green, debit=red)

### NexusScore

#### GET /api/nexus-score/me

```json
{
  "data": {
    "userId": 1,
    "score": 720,
    "tier": "trusted",
    "exchange_score": 180,
    "review_score": 150,
    "engagement_score": 140,
    "reliability_score": 130,
    "tenure_score": 120,
    "last_calculated_at": "2026-03-08T00:00:00Z"
  }
}
```

#### GET /api/nexus-score/leaderboard?page=1&limit=10

```json
{
  "data": [
    {
      "userId": 1,
      "score": 720,
      "tier": "trusted",
      "last_calculated_at": "2026-03-08T00:00:00Z",
      "user": { "id": 1, "firstName": "Alice", "lastName": "Admin" }
    },
    {
      "userId": 2,
      "score": 540,
      "tier": "established",
      "last_calculated_at": "2026-03-08T00:00:00Z",
      "user": { "id": 2, "firstName": "Bob", "lastName": "Member" }
    }
  ]
}
```

**NexusScore tiers:**

| Tier | Score Range | Description |
|------|------------|-------------|
| Newcomer | 0-199 | Just getting started |
| Emerging | 200-399 | Building reputation |
| Established | 400-599 | Active community member |
| Trusted | 600-799 | Highly reliable |
| Exemplary | 800-1000 | Community leader |

#### UI Suggestions - NexusScore

1. **Score Card**: Circular gauge (0-1000) with tier badge and color coding
2. **Dimension Breakdown**: Radar/spider chart showing 5 dimensions (exchange, review, engagement, reliability, tenure)
3. **Score History**: Line chart showing score changes over time
4. **Leaderboard**: Ranked list with tier badges, current user highlighted
6. **Recalculate Button**: "Refresh my score" with loading state

### Onboarding Wizard

#### GET /api/onboarding/progress

```json
{
  "data": {
    "completed_steps": [
      { "step_id": 1, "key": "profile_complete", "completed_at": "2026-03-01T10:00:00Z" },
      { "step_id": 2, "key": "skills_added", "completed_at": "2026-03-02T14:00:00Z" }
    ],
    "total_steps": 5,
    "completed_count": 2,
    "completion_percentage": 40.0
  }
}
```

#### POST /api/onboarding/complete

**Request:**
```json
{
  "step_key": "first_listing"
}
```

#### UI Suggestions - Onboarding

1. **Progress Bar**: Horizontal stepper or progress bar showing completion percentage
2. **Step Cards**: Checklist with completed (green tick) and pending (grey circle) steps
3. **Guided Flow**: Full-screen wizard that walks new users through each step
4. **Dashboard Widget**: Compact progress indicator on the main dashboard for new users
5. **XP Reward Toast**: Show XP earned when completing each step

### Voice Messages

#### GET /api/voice-messages/conversation/{conversationId}

```json
{
  "data": [
    {
      "id": 1,
      "sender_id": 2,
      "conversation_id": 1,
      "audio_url": "/files/voice/msg-123.webm",
      "duration_seconds": 15,
      "file_size_bytes": 24000,
      "format": "webm",
      "transcription": "Hey, just wanted to check if you are free on Saturday...",
      "is_read": false,
      "created_at": "2026-03-08T10:30:00Z",
      "sender": { "id": 2, "firstName": "Bob", "lastName": "Member" }
    }
  ]
}
```

#### POST /api/voice-messages

**Request:**
```json
{
  "conversation_id": 1,
  "audio_url": "/files/voice/msg-456.webm",
  "duration_seconds": 8,
  "file_size_bytes": 12800,
  "format": "webm"
}
```

#### UI Suggestions - Voice Messages

1. **Audio Player**: Inline waveform player with play/pause, duration, sender name
2. **Record Button**: Hold-to-record button in conversation view (use MediaRecorder API)
3. **Transcription Toggle**: Show/hide text transcription below the audio player
4. **Unread Indicator**: Blue dot on unread voice messages
5. **Format Support**: Record in WebM (Chrome/Firefox) or MP3 fallback

### Insurance Certificates

#### GET /api/insurance

```json
{
  "data": [
    {
      "id": 1,
      "type": "public_liability",
      "provider": "Allianz",
      "policy_number": "PL-2026-12345",
      "cover_amount": 5000000.00,
      "start_date": "2026-01-01T00:00:00Z",
      "expiry_date": "2027-01-01T00:00:00Z",
      "document_url": "/files/insurance/cert-123.pdf",
      "status": "verified",
      "verified_at": "2026-01-15T10:00:00Z",
      "created_at": "2026-01-10T09:00:00Z",
      "updated_at": null,
      "user": { "id": 1, "firstName": "Alice", "lastName": "Admin" },
      "verified_by": { "id": 5, "firstName": "Eve", "lastName": "Verifier" }
    }
  ]
}
```

#### UI Suggestions - Insurance

1. **Certificate List**: Cards showing type, provider, status badge, expiry date with days-remaining
2. **Upload Form**: File upload with type dropdown, policy number, dates, cover amount
3. **Status Badges**: Pending (yellow), Verified (green), Expired (red), Rejected (grey)
4. **Expiry Warnings**: Amber banner for certificates expiring within 30 days


### FAQ

#### GET /api/faqs?category=getting-started

```json
{
  "data": [
    {
      "id": 1,
      "question": "How do I earn time credits?",
      "answer": "You earn time credits by offering services to other members...",
      "category": "getting-started",
      "sort_order": 0,
      "is_published": true,
      "created_at": "2026-01-15T10:00:00Z"
    },
    {
      "id": 2,
      "question": "What can I spend credits on?",
      "answer": "You can spend credits on any service offered by other members...",
      "category": "getting-started",
      "sort_order": 1,
      "is_published": true,
      "created_at": "2026-01-15T10:00:00Z"
    }
  ]
}
```

#### UI Suggestions - FAQ

1. **Accordion Layout**: Collapsible question/answer pairs grouped by category
2. **Category Tabs**: Horizontal tabs for each FAQ category
3. **Search Bar**: Client-side filter across questions and answers
5. **Help Widget**: Floating help button that opens FAQ search in a modal

### Session Management

#### GET /api/sessions

```json
{
  "data": [
    {
      "id": 1,
      "ip_address": "192.168.1.100",
      "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0",
      "device_info": "Windows 10 - Chrome",
      "is_current": true,
      "created_at": "2026-03-08T09:00:00Z",
      "last_activity_at": "2026-03-08T14:30:00Z",
      "expires_at": "2026-03-09T09:00:00Z"
    },
    {
      "id": 2,
      "ip_address": "10.0.0.50",
      "user_agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) Safari/605.1",
      "device_info": "iOS 17 - Safari",
      "is_current": false,
      "created_at": "2026-03-07T15:00:00Z",
      "last_activity_at": "2026-03-07T18:00:00Z",
      "expires_at": "2026-03-08T15:00:00Z"
    }
  ],
  "total": 2
}
```

#### UI Suggestions - Sessions

1. **Session List**: Cards showing device icon, IP, browser, last active time
2. **Current Session Badge**: Green "This device" label on the current session
3. **Terminate Button**: Red "Sign out" button per session (disabled on current)
4. **Terminate All**: "Sign out all other devices" button with confirmation dialog
5. **Security Page**: Combine session list with 2FA status and passkeys list


### Voice Messages - WebSocket Integration

Voice messages integrate with the existing SignalR messaging hub. When a voice message is sent, the recipient receives a real-time notification through the same `ReceiveMessage` event.

#### Recording and Sending

```typescript
// hooks/useVoiceRecorder.ts
export function useVoiceRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/ogg;codecs=opus'
    });

    chunksRef.current = [];
    mediaRecorder.ondataavailable = (e) => chunksRef.current.push(e.data);
    mediaRecorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mediaRecorder.mimeType });
      setAudioBlob(blob);
      stream.getTracks().forEach(t => t.stop());
    };

    mediaRecorder.start();
    mediaRecorderRef.current = mediaRecorder;
    setIsRecording(true);
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  const sendVoiceMessage = async (conversationId: number) => {
    if (!audioBlob) return;

    // 1. Upload audio file
    const formData = new FormData();
    formData.append('file', audioBlob, `voice-${Date.now()}.webm`);
    const uploadRes = await fetch('/api/files/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    const { id: fileId, url } = await uploadRes.json();

    // 2. Create voice message record
    const duration = await getAudioDuration(audioBlob);
    await fetchWithAuth('/api/voice-messages', {
      method: 'POST',
      body: JSON.stringify({
        conversation_id: conversationId,
        audio_url: url,
        duration_seconds: Math.round(duration),
        file_size_bytes: audioBlob.size,
        format: audioBlob.type.includes('webm') ? 'webm' : 'ogg',
      }),
    });

    setAudioBlob(null);
  };

  return { isRecording, audioBlob, startRecording, stopRecording, sendVoiceMessage };
}
```

#### Playback Component

```tsx
// components/VoiceMessagePlayer.tsx
function VoiceMessagePlayer({ message }: { message: VoiceMessage }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
      // Mark as read on first play
      if (!message.is_read) {
        fetchWithAuth(`/api/voice-messages/${message.id}/read`, { method: 'PUT' });
      }
    }
    setIsPlaying(!isPlaying);
  };

  return (
    <div className="voice-message">
      <audio
        ref={audioRef}
        src={message.audio_url}
        onTimeUpdate={() => setProgress(
          (audioRef.current!.currentTime / audioRef.current!.duration) * 100
        )}
        onEnded={() => setIsPlaying(false)}
      />
      <button onClick={togglePlay}>
        {isPlaying ? '⏸' : '▶'}
      </button>
      <div className="progress-bar">
        <div className="progress" style={{ width: `${progress}%` }} />
      </div>
      <span className="duration">{formatDuration(message.duration_seconds)}</span>
      {message.transcription && (
        <details>
          <summary>Transcript</summary>
          <p>{message.transcription}</p>
        </details>
      )}
    </div>
  );
}
```

#### Real-Time Notification

Voice messages trigger the same SignalR `ReceiveMessage` event. The frontend can detect a voice message by checking for the `audio_url` field in the message payload and render the voice player instead of a text bubble.


---

## Gamification System (Phase 13) - ✅ IMPLEMENTED

### XP Awards (Automatic, V1-aligned values)

XP is automatically awarded when users perform these actions:

| Action | XP | Badge triggers |
|--------|-----|----------------|
| Create listing | 15 | First Listing, Offer 5/10/25, Request 5/10 |
| Complete exchange | 25 | First Transaction, Transaction 10/50, Helpful Neighbor |
| Send credits | 10/credit | Spend 10/50, Diversity 3/10/25 |
| Receive credits | 5/credit | Earn 10/50/100/250 |
| Leave review | 10 | First Review, Review 10/25 |
| Attend event | 15 | Event Attend 1/10/25 |
| Create event | 30 | Event Host 1/5 |
| Join group | 10 | Group Join 1/5 |
| Create group | 50 | Group Create |
| Make connection | 10 | Connect 10/25/50 |
| Create post | 5 | Posts 25/100 |
| Daily login | 5 | Streak 7d/30d/100d |
| Complete profile | 50 | (one-time) |
| Earn badge | 25 | Level 5/10 |
| Vote in poll | 2 | - |
| Send message | 2 | Msg 50/200 |
| Complete goal | 10 | - |
| Add comment | 2 | - |
| Volunteer hour | 20/hour | - |

### Level System (V1-aligned thresholds)

Higher levels are intentionally steeper to reward long-term engagement. Cap at level 10.

| Level | XP Required |
|-------|-------------|
| 1     | 0           |
| 2     | 100         |
| 3     | 300         |
| 4     | 600         |
| 5     | 1,000       |
| 6     | 1,500       |
| 7     | 2,200       |
| 8     | 3,000       |
| 9     | 4,000       |
| 10    | 5,500 (cap) |

### Response Examples

#### GET /api/gamification/profile

```json
{
  "profile": {
    "id": 1,
    "firstName": "Alice",
    "lastName": "Admin",
    "totalXp": 45,
    "level": 1,
    "xp_to_next_level": 55,
    "xp_required_for_current_level": 0,
    "xp_required_for_next_level": 100,
    "badges_earned": 2
  },
  "recent_xp": [
    {
      "amount": 5,
      "source": "post_created",
      "description": "Created a post",
      "createdAt": "2026-02-02T10:00:00Z"
    }
  ]
}
```

#### GET /api/gamification/badges

```json
{
  "data": [
    {
      "id": 1,
      "slug": "first_listing",
      "name": "First Listing",
      "description": "Created your first listing on the marketplace",
      "icon": "🏪",
      "xpReward": 25,
      "is_earned": true,
      "earned_at": "2026-02-02T10:00:00Z"
    }
  ],
  "summary": {
    "total": 10,
    "earned": 2,
    "progress_percent": 20.0
  }
}
```

#### GET /api/gamification/leaderboard?period=week

```json
{
  "data": [
    {
      "rank": 1,
      "user": {
        "id": 1,
        "first_name": "Alice",
        "last_name": "Admin"
      },
      "period_xp": 45,
      "total_xp": 45,
      "level": 1
    }
  ],
  "current_user_rank": 1,
  "period": "week",
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 3,
    "total_pages": 1
  }
}
```

**Leaderboard periods:** `all` (default), `week`, `month`, `year`

### UI Suggestions

1. **Profile Card**: Display level badge, XP progress bar, recent XP gains
2. **Badge Gallery**: Grid of all badges (greyscale for locked, colored for earned)
3. **Leaderboard Page**: Tab switcher for period selection (All Time, This Week, This Month)
4. **Toast Notifications**: Show XP gain and badge earned events after user actions

---

## Reviews System (Phase 14) - ✅ IMPLEMENTED

Users can leave reviews for other users and listings. Each review has a 1-5 star rating and optional comment.

### XP Awards

| Action | XP |
|--------|-----|
| Leave a review | 5 |

### Business Rules

- **One review per target**: A user can only leave one review per user or per listing
- **No self-reviews**: Cannot review yourself
- **No own listing reviews**: Cannot review your own listing
- **Owner-only editing**: Only the reviewer can update or delete their review

### Response Examples

#### GET /api/users/{id}/reviews

```json
{
  "data": [
    {
      "id": 1,
      "rating": 5,
      "comment": "Alice was fantastic to work with! Very organized and punctual.",
      "created_at": "2026-02-01T10:00:00Z",
      "updated_at": null,
      "reviewer": {
        "id": 3,
        "first_name": "Charlie",
        "last_name": "Contributor"
      }
    }
  ],
  "summary": {
    "average_rating": 4.5,
    "total_reviews": 2
  },
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 2,
    "pages": 1
  }
}
```

#### POST /api/users/{id}/reviews

**Request:**
```json
{
  "rating": 5,
  "comment": "Great experience working with this person!"
}
```

**Response (201 Created):**
```json
{
  "id": 5,
  "rating": 5,
  "comment": "Great experience working with this person!",
  "target_user_id": 3,
  "created_at": "2026-02-02T12:00:00Z",
  "reviewer": {
    "id": 1,
    "first_name": "Alice",
    "last_name": "Admin"
  }
}
```

#### GET /api/listings/{id}/reviews

```json
{
  "data": [
    {
      "id": 3,
      "rating": 5,
      "comment": "Excellent home repair service. Fixed my squeaky door in no time!",
      "created_at": "2026-02-01T10:00:00Z",
      "updated_at": null,
      "reviewer": {
        "id": 3,
        "first_name": "Charlie",
        "last_name": "Contributor"
      }
    }
  ],
  "summary": {
    "average_rating": 5.0,
    "total_reviews": 1
  },
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "pages": 1
  }
}
```

#### GET /api/reviews/{id}

```json
{
  "id": 1,
  "rating": 5,
  "comment": "Alice was fantastic to work with!",
  "created_at": "2026-02-01T10:00:00Z",
  "updated_at": null,
  "reviewer": {
    "id": 3,
    "first_name": "Charlie",
    "last_name": "Contributor"
  },
  "target_user": {
    "id": 1,
    "first_name": "Alice",
    "last_name": "Admin"
  },
  "target_listing": null
}
```

#### PUT /api/reviews/{id}

**Request:**
```json
{
  "rating": 4,
  "comment": "Updated review - still great but had a minor issue"
}
```

**Response (200 OK):** Returns updated review object

### Error Responses

| Status | Error | Description |
|--------|-------|-------------|
| 400 | "You cannot review yourself" | Attempted self-review |
| 400 | "You cannot review your own listing" | Attempted review of own listing |
| 400 | "Rating must be between 1 and 5" | Invalid rating value |
| 400 | "Comment must be 2000 characters or less" | Comment too long |
| 403 | "You can only update your own reviews" | Attempted edit of another's review |
| 404 | "User not found" | Target user doesn't exist |
| 404 | "Listing not found" | Target listing doesn't exist |
| 404 | "Review not found" | Review ID doesn't exist |
| 409 | "You have already reviewed this user" | Duplicate user review |
| 409 | "You have already reviewed this listing" | Duplicate listing review |

### UI Suggestions

1. **Star Rating Component**: 5 clickable stars for input, display average with decimal
2. **User Profile Reviews Tab**: Show reviews received with average rating badge
3. **Listing Detail Reviews Section**: Display reviews below listing info
4. **Review Form Modal**: Popup after transaction completion prompting for review
5. **Edit/Delete Controls**: Show only on reviews authored by current user

---

## Phase 15: Search Integration

> **Status:** ✅ IMPLEMENTED. Frontend teams can now build search UI.

### Endpoint Summary

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/search | Unified search across listings, users, groups, events |
| GET | /api/search/suggestions | Lightweight autocomplete suggestions |
| GET | /api/members | Member directory with name filtering |

All endpoints require JWT authentication and return tenant-scoped results only.

### Example Request URLs

**Development:**
```
GET http://localhost:5080/api/search?q=garden&type=all&page=1&limit=20
GET http://localhost:5080/api/search/suggestions?q=gar&limit=5
GET http://localhost:5080/api/members?q=alice&page=1&limit=20
```

**Production:**
```
GET https://api.project-nexus.net/api/search?q=garden&type=all&page=1&limit=20
GET https://api.project-nexus.net/api/search/suggestions?q=gar&limit=5
GET https://api.project-nexus.net/api/members?q=alice&page=1&limit=20
```

### Query Parameters

#### GET /api/search

| Parameter | Type | Required | Default | Constraints |
|-----------|------|----------|---------|-------------|
| q | string | Yes | - | Min 2 chars, max 100 chars |
| type | string | No | `all` | `all`, `listings`, `users`, `groups`, `events` |
| page | int | No | 1 | >= 1 |
| limit | int | No | 20 | 1-50 |

#### GET /api/search/suggestions

| Parameter | Type | Required | Default | Constraints |
|-----------|------|----------|---------|-------------|
| q | string | Yes | - | Min 2 chars, max 100 chars |
| limit | int | No | 5 | 1-10 |

#### GET /api/members

| Parameter | Type | Required | Default | Constraints |
|-----------|------|----------|---------|-------------|
| q | string | No | - | Search by first or last name |
| page | int | No | 1 | >= 1 |
| limit | int | No | 20 | 1-50 |

*Note: Skills filter deferred to future phase.*

### Example JSON Responses

#### GET /api/search?q=garden&type=all

```json
{
  "listings": [
    {
      "id": 3,
      "title": "Garden Weeding Services",
      "description": "Professional garden maintenance and weeding",
      "type": "offer",
      "status": "active",
      "created_at": "2026-01-20T10:00:00Z"
    }
  ],
  "users": [
    {
      "id": 3,
      "first_name": "Charlie",
      "last_name": "Contributor",
      "avatar_url": null,
      "bio": null
    }
  ],
  "groups": [
    {
      "id": 2,
      "name": "Community Gardeners",
      "description": "A group for local gardening enthusiasts",
      "member_count": 12,
      "is_public": true
    }
  ],
  "events": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 3,
    "pages": 1
  }
}
```

#### GET /api/search/suggestions?q=gar

```json
[
  { "text": "Garden Weeding Services", "type": "listings", "id": 3 },
  { "text": "Community Gardeners", "type": "groups", "id": 2 },
  { "text": "Gardening Workshop", "type": "events", "id": 5 }
]
```

#### GET /api/members?q=alice

```json
{
  "data": [
    {
      "id": 1,
      "first_name": "Alice",
      "last_name": "Admin",
      "avatar_url": null,
      "bio": null,
      "created_at": "2026-01-15T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "pages": 1
  }
}
```

**Note:** `avatar_url` and `bio` are always `null` in v1 (User entity does not have these fields yet).

### Error Responses

| Status | Error | Cause |
|--------|-------|-------|
| 400 | "Search query must be at least 2 characters" | `q` parameter too short |
| 400 | "Search query must not exceed 100 characters" | `q` parameter too long |
| 400 | "Invalid type filter" | `type` not one of allowed values |
| 401 | Unauthorized | Missing or invalid JWT |

### UI Recommendations

#### 1. Shared Global Search Component

Build **one** search component shared across uk/ie/app frontends:

```javascript
// SearchBar.jsx - shared component
export function SearchBar({ onSelect }) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);

  // Debounced fetch (see performance notes)
  useEffect(() => {
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      const results = await fetchWithAuth(`/api/search/suggestions?q=${encodeURIComponent(query)}&limit=5`);
      setSuggestions(await results.json());
    }, 300); // 300ms debounce

    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div className="search-bar">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search listings, members, groups..."
        minLength={2}
      />
      {suggestions.length > 0 && (
        <ul className="suggestions">
          {suggestions.map((s) => (
            <li key={`${s.type}-${s.id}`} onClick={() => onSelect(s)}>
              <span className="type-badge">{s.type}</span>
              {s.text}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

#### 2. Autosuggest with Debounce and Min Length

- **Minimum 2 characters** before making API call (backend enforces this)
- **300ms debounce** to avoid excessive requests while typing
- **Cancel pending requests** when query changes (use AbortController)
- **Show loading state** during fetch

```javascript
// Good: Debounced with minimum length check
if (query.length >= 2) {
  debounce(() => fetchSuggestions(query), 300);
}

// Bad: Fetch on every keystroke
onChange={(e) => fetchSuggestions(e.target.value)}  // ❌ Don't do this
```

#### 3. Results Page with Tabs by Type

```jsx
// SearchResultsPage.jsx
function SearchResultsPage() {
  const [activeTab, setActiveTab] = useState('all');
  const [results, setResults] = useState(null);

  const tabs = [
    { id: 'all', label: 'All' },
    { id: 'listings', label: 'Listings' },
    { id: 'users', label: 'Members' },
    { id: 'groups', label: 'Groups' },
    { id: 'events', label: 'Events' },
  ];

  useEffect(() => {
    fetchWithAuth(`/api/search?q=${query}&type=${activeTab}`)
      .then(r => r.json())
      .then(setResults);
  }, [query, activeTab]);

  return (
    <div>
      <nav className="tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={activeTab === tab.id ? 'active' : ''}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {results && (
        <div className="results">
          {activeTab === 'all' && <AllResultsView results={results} />}
          {activeTab === 'listings' && <ListingResults items={results.listings} />}
          {activeTab === 'users' && <UserResults items={results.users} />}
          {/* ... */}
        </div>
      )}
    </div>
  );
}
```

#### 4. Member Directory Page

```jsx
// MemberDirectory.jsx
function MemberDirectory() {
  const [nameFilter, setNameFilter] = useState('');
  const [members, setMembers] = useState([]);
  const [page, setPage] = useState(1);

  useEffect(() => {
    const params = new URLSearchParams({ page, limit: 20 });
    if (nameFilter) params.set('q', nameFilter);

    fetchWithAuth(`/api/members?${params}`)
      .then(r => r.json())
      .then(setMembers);
  }, [nameFilter, page]);

  return (
    <div>
      <input
        type="text"
        placeholder="Search by name..."
        value={nameFilter}
        onChange={(e) => setNameFilter(e.target.value)}
      />

      <div className="member-grid">
        {members.data?.map(member => (
          <MemberCard key={member.id} member={member} />
        ))}
      </div>

      <Pagination
        page={page}
        totalPages={members.pagination?.pages}
        onPageChange={setPage}
      />
    </div>
  );
}
```

**Note:** Skills filter is not implemented in v1. It will be added in a future phase when User Skills entity is created.

### Performance Notes

1. **Use pagination** - Always include `page` and `limit` params. Default is 20 results per page, max is 50.

2. **Respect limit caps** - Suggestions max is 10. Don't request more than needed (5 is usually sufficient for autocomplete).

3. **Debounce input** - Never call `/api/search/suggestions` on every keystroke. Use 300ms debounce minimum.

4. **Cancel in-flight requests** - When query changes, abort the previous request:
   ```javascript
   const controller = new AbortController();
   fetch(url, { signal: controller.signal });
   // On query change: controller.abort();
   ```

5. **Cache recent results** - Consider caching search results in memory for back/forward navigation.

6. **Empty state** - When `/api/members` is called with no filters, it returns all members (paginated). This is intentional for directory browsing.

### Navigation from Search Results

When user selects a search result, navigate to the appropriate detail page:

```javascript
function handleSearchSelect(item) {
  switch (item.type) {
    case 'listings':
      navigate(`/listings/${item.id}`);
      break;
    case 'users':
      navigate(`/members/${item.id}`);
      break;
    case 'groups':
      navigate(`/groups/${item.id}`);
      break;
    case 'events':
      navigate(`/events/${item.id}`);
      break;
  }
}
```

---

## Real-Time Messaging (SignalR) - ✅ IMPLEMENTED

The API provides real-time messaging via SignalR WebSockets. This enables instant message delivery, read receipts, and live conversation updates without polling.

### Connection Details

| Environment | WebSocket URL |
|-------------|---------------|
| Development | `ws://localhost:5080/hubs/messages` |
| Production  | `wss://api.project-nexus.net/hubs/messages` |

**Important:** SignalR supports multiple transports (WebSocket, Server-Sent Events, Long Polling). WebSocket is preferred for best performance.

### Authentication

WebSockets cannot send HTTP headers during the handshake. The JWT token must be passed as a query parameter:

```
ws://localhost:5080/hubs/messages?access_token=<your-jwt-token>
```

The server validates the token and associates the connection with the authenticated user.

### Install SignalR Client

```bash
# npm
npm install @microsoft/signalr

# yarn
yarn add @microsoft/signalr
```

### Client Events (Server → Client)

These events are sent from the server to connected clients:

| Event | Payload | Description |
|-------|---------|-------------|
| `ReceiveMessage` | `MessageNotification` | New message received |
| `MessageRead` | `{ conversation_id, read_by_user_id, marked_read }` | Messages in a conversation were marked as read |
| `ConversationUpdated` | `{ conversation_id, last_message }` | Conversation metadata changed (new message preview) |
| `UnreadCountUpdated` | `{ unread_count }` | Total unread message count changed |

#### MessageNotification Payload

```json
{
  "id": 123,
  "conversation_id": 45,
  "content": "Hello! Are you available for gardening help?",
  "sender": {
    "id": 2,
    "firstName": "Bob",
    "lastName": "Member"
  },
  "isRead": false,
  "createdAt": "2026-02-04T10:30:00Z"
}
```

### Server Methods (Client → Server)

These methods can be called from the client to the server:

| Method | Parameters | Description |
|--------|------------|-------------|
| `JoinConversation` | `conversationId: number` | Subscribe to updates for a specific conversation |
| `LeaveConversation` | `conversationId: number` | Unsubscribe from conversation updates |

### React Integration Example

```typescript
// hooks/useMessagesHub.ts
import { HubConnection, HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import { useEffect, useRef, useState, useCallback } from 'react';

interface MessageNotification {
  id: number;
  conversation_id: number;
  content: string;
  sender: {
    id: number;
    firstName: string;
    lastName: string;
  };
  isRead: boolean;
  createdAt: string;
}

interface UseMessagesHubOptions {
  onMessage?: (message: MessageNotification) => void;
  onMessageRead?: (data: { conversation_id: number; read_by_user_id: number; marked_read: number }) => void;
  onUnreadCountUpdated?: (count: number) => void;
}

export function useMessagesHub(options: UseMessagesHubOptions = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const connectionRef = useRef<HubConnection | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setConnectionError('No authentication token');
      return;
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5080';

    const connection = new HubConnectionBuilder()
      .withUrl(`${apiUrl}/hubs/messages?access_token=${token}`)
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000]) // Retry intervals
      .configureLogging(LogLevel.Information)
      .build();

    // Register event handlers
    connection.on('ReceiveMessage', (message: MessageNotification) => {
      console.log('Received message:', message);
      options.onMessage?.(message);
    });

    connection.on('MessageRead', (data) => {
      console.log('Messages read:', data);
      options.onMessageRead?.(data);
    });

    connection.on('UnreadCountUpdated', (data) => {
      console.log('Unread count updated:', data);
      options.onUnreadCountUpdated?.(data.unread_count);
    });

    connection.on('ConversationUpdated', (data) => {
      console.log('Conversation updated:', data);
      // Handle conversation list updates
    });

    // Connection state handlers
    connection.onreconnecting((error) => {
      console.log('SignalR reconnecting...', error);
      setIsConnected(false);
    });

    connection.onreconnected((connectionId) => {
      console.log('SignalR reconnected:', connectionId);
      setIsConnected(true);
      setConnectionError(null);
    });

    connection.onclose((error) => {
      console.log('SignalR connection closed', error);
      setIsConnected(false);
    });

    // Start connection
    connection.start()
      .then(() => {
        console.log('SignalR connected');
        setIsConnected(true);
        setConnectionError(null);
        connectionRef.current = connection;
      })
      .catch((err) => {
        console.error('SignalR connection failed:', err);
        setConnectionError(err.message);
      });

    return () => {
      connection.stop();
    };
  }, []);

  const joinConversation = useCallback(async (conversationId: number) => {
    if (connectionRef.current?.state === 'Connected') {
      await connectionRef.current.invoke('JoinConversation', conversationId);
    }
  }, []);

  const leaveConversation = useCallback(async (conversationId: number) => {
    if (connectionRef.current?.state === 'Connected') {
      await connectionRef.current.invoke('LeaveConversation', conversationId);
    }
  }, []);

  return {
    isConnected,
    connectionError,
    joinConversation,
    leaveConversation,
  };
}
```

### Usage in Components

```tsx
// components/MessageList.tsx
import { useMessagesHub } from '@/hooks/useMessagesHub';
import { useEffect, useState } from 'react';

export function MessageList({ conversationId }: { conversationId: number }) {
  const [messages, setMessages] = useState<Message[]>([]);

  const { isConnected, joinConversation, leaveConversation } = useMessagesHub({
    onMessage: (newMessage) => {
      // Only add if it's for this conversation
      if (newMessage.conversation_id === conversationId) {
        setMessages((prev) => [...prev, newMessage]);
      }
    },
    onMessageRead: (data) => {
      if (data.conversation_id === conversationId) {
        // Update read status in UI
        setMessages((prev) =>
          prev.map((m) => ({ ...m, isRead: true }))
        );
      }
    },
  });

  // Join conversation group when viewing
  useEffect(() => {
    if (isConnected) {
      joinConversation(conversationId);
      return () => {
        leaveConversation(conversationId);
      };
    }
  }, [isConnected, conversationId]);

  return (
    <div>
      {!isConnected && <div className="warning">Connecting to real-time updates...</div>}
      {messages.map((msg) => (
        <MessageBubble key={msg.id} message={msg} />
      ))}
    </div>
  );
}
```

### Unread Count Badge

```tsx
// components/UnreadBadge.tsx
import { useMessagesHub } from '@/hooks/useMessagesHub';
import { useState, useEffect } from 'react';

export function UnreadBadge() {
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch initial count
  useEffect(() => {
    fetch('/api/messages/unread-count', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    })
      .then((r) => r.json())
      .then((data) => setUnreadCount(data.unread_count));
  }, []);

  // Listen for real-time updates
  useMessagesHub({
    onUnreadCountUpdated: (count) => setUnreadCount(count),
    onMessage: () => {
      // Increment count when new message arrives
      setUnreadCount((prev) => prev + 1);
    },
  });

  if (unreadCount === 0) return null;

  return <span className="badge">{unreadCount}</span>;
}
```

### Connection Status Indicator

```tsx
// components/ConnectionStatus.tsx
import { useMessagesHub } from '@/hooks/useMessagesHub';

export function ConnectionStatus() {
  const { isConnected, connectionError } = useMessagesHub();

  if (connectionError) {
    return <div className="status error">⚠️ Connection failed: {connectionError}</div>;
  }

  return (
    <div className={`status ${isConnected ? 'connected' : 'disconnected'}`}>
      {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
    </div>
  );
}
```

### Error Handling

SignalR connections can fail for various reasons. Handle these gracefully:

```typescript
// Common connection errors and handling
const handleConnectionError = (error: Error) => {
  if (error.message.includes('401')) {
    // Token expired - redirect to login
    localStorage.removeItem('token');
    window.location.href = '/login';
  } else if (error.message.includes('Failed to fetch')) {
    // Network error - show offline indicator
    showOfflineMessage();
  } else {
    // Generic error - log and show retry option
    console.error('SignalR error:', error);
    showRetryButton();
  }
};
```

### Performance Best Practices

1. **Single connection per app** - Don't create multiple SignalR connections. Use React Context or a singleton.

2. **Join/leave conversation groups** - Only subscribe to conversations the user is actively viewing.

3. **Handle reconnection** - SignalR auto-reconnects, but update UI state accordingly.

4. **Don't poll when connected** - If SignalR is connected, don't also poll `/api/messages`. Use one or the other.

5. **Graceful degradation** - If SignalR fails to connect, fall back to polling.

```typescript
// Fallback to polling if WebSocket fails
const { isConnected, connectionError } = useMessagesHub({ onMessage });

useEffect(() => {
  if (!isConnected && connectionError) {
    // Fall back to polling every 30 seconds
    const interval = setInterval(fetchMessages, 30000);
    return () => clearInterval(interval);
  }
}, [isConnected, connectionError]);
```

### Testing SignalR Locally

1. Start the backend: `docker compose up -d`
2. Connect via browser console:

```javascript
// In browser dev tools
const signalR = await import('https://cdn.jsdelivr.net/npm/@microsoft/signalr@8.0.0/dist/browser/signalr.min.js');

const token = localStorage.getItem('token');
const connection = new signalR.HubConnectionBuilder()
  .withUrl(`http://localhost:5080/hubs/messages?access_token=${token}`)
  .build();

connection.on('ReceiveMessage', (msg) => console.log('New message:', msg));
await connection.start();
console.log('Connected!');

// Join a conversation
await connection.invoke('JoinConversation', 1);
```

### Migrating from Raw WebSocket

If your frontend was using raw WebSocket (`ws://localhost:5080/ws/messages`), update to use the SignalR client:

**Before (raw WebSocket - won't work):**
```javascript
const ws = new WebSocket('ws://localhost:5080/ws/messages');
ws.onmessage = (event) => { /* ... */ };
```

**After (SignalR):**
```javascript
import { HubConnectionBuilder } from '@microsoft/signalr';

const connection = new HubConnectionBuilder()
  .withUrl('/hubs/messages?access_token=' + token)
  .withAutomaticReconnect()
  .build();

connection.on('ReceiveMessage', (message) => { /* ... */ });
await connection.start();
```

Key differences:
- SignalR handles reconnection automatically
- SignalR supports multiple transports (WebSocket, SSE, Long Polling)
- SignalR provides typed RPC-style method invocation
- SignalR handles connection negotiation and fallbacks

---

## Registration Policy Engine - ✅ IMPLEMENTED

The Registration Policy Engine enables each tenant to independently configure how users register. This includes standard registration, admin approval flows, identity verification via third-party providers, government/eID (future), and invite-only modes.

**Both frontends (React modern and GOV.UK) must consume the same backend API.** The registration UI adapts dynamically based on the tenant's configured policy.

### Core Concept

Each tenant has a **registration policy** that determines:
1. **Registration Mode** - How users sign up (standard, with approval, verified identity, invite-only)
2. **Verification Provider** - Which identity verification service is used (if any)
3. **Verification Level** - How thorough the check is (document only, document + selfie, etc.)
4. **Post-Verification Action** - What happens after verification passes (auto-activate, send to admin, etc.)

### Registration Modes

| Mode | Value | Description | Frontend Behavior |
|------|-------|-------------|-------------------|
| Standard | `0` | Normal email + password registration | Show standard form, user gets tokens immediately |
| StandardWithApproval | `1` | Register then wait for admin | Show form + "awaiting review" message, no tokens until approved |
| VerifiedIdentity | `2` | Register then verify identity via provider | Show form, then redirect to verification flow |
| GovernmentId | `3` | Register via government/eID (future) | Show form + gov ID instructions |
| InviteOnly | `4` | Closed registration, invite code required | Show form with invite code field, or "registration closed" |

### Step-by-Step Frontend Flow

#### 1. Fetch Tenant Registration Config (Before Showing Form)

```
GET /api/registration/config?tenant_slug=acme
```

**Response:**
```json
{
  "success": true,
  "data": {
    "mode": "Standard",
    "mode_value": 0,
    "requires_verification": false,
    "requires_approval": false,
    "requires_invite": false,
    "verification_level": "None",
    "provider_name": null,
    "registration_message": null
  }
}
```

Use this to render the correct form variant:

```typescript
// Pseudocode for form rendering logic
const config = await fetchRegistrationConfig(tenantSlug);

if (config.data.requires_invite) {
  showInviteCodeField();
}
if (config.data.registration_message) {
  showInfoBanner(config.data.registration_message);
}
if (config.data.requires_verification) {
  showVerificationNotice(config.data.provider_name);
}
if (config.data.requires_approval) {
  showApprovalNotice();
}
```

#### 2. Submit Registration

```
POST /api/auth/register
```

**Request (standard):**
```json
{
  "email": "new@example.com",
  "password": "SecurePassword123!",
  "first_name": "Jane",
  "last_name": "Doe",
  "tenant_slug": "acme"
}
```

**Request (invite-only — includes invite_code):**
```json
{
  "email": "new@example.com",
  "password": "SecurePassword123!",
  "first_name": "Jane",
  "last_name": "Doe",
  "tenant_slug": "acme",
  "invite_code": "SECRET123"
}
```

#### 3. Handle Response Based on registration_status

**Standard mode (Active immediately):**
```json
{
  "success": true,
  "registration_status": "Active",
  "registration_message": null,
  "access_token": "eyJhbGci...",
  "refresh_token": "dGhpcyBp...",
  "token_type": "Bearer",
  "expires_in": 7200,
  "user": {
    "id": 42,
    "email": "new@example.com",
    "first_name": "Jane",
    "last_name": "Doe",
    "role": "member",
    "tenant_id": 1,
    "tenant_slug": "acme"
  }
}
```

**Approval mode (PendingAdminReview — no tokens):**
```json
{
  "success": true,
  "registration_status": "PendingAdminReview",
  "registration_message": "Your account will be reviewed by an administrator.",
  "user": {
    "id": 43,
    "email": "new@example.com",
    "first_name": "Jane",
    "last_name": "Doe",
    "role": "member",
    "tenant_id": 1,
    "tenant_slug": "acme"
  }
}
```

**Verification mode (PendingVerification — tokens issued for verification flow):**
```json
{
  "success": true,
  "registration_status": "PendingVerification",
  "registration_message": "Please verify your identity to complete registration.",
  "requires_verification": true,
  "access_token": "eyJhbGci...",
  "refresh_token": "dGhpcyBp...",
  "token_type": "Bearer",
  "expires_in": 7200,
  "user": {
    "id": 44,
    "email": "new@example.com",
    "first_name": "Jane",
    "last_name": "Doe",
    "role": "member",
    "tenant_id": 1,
    "tenant_slug": "acme"
  }
}
```

**Invite-only with bad code (400):**
```json
{
  "error": "Invalid or missing invite code."
}
```

#### Frontend Routing Logic

```typescript
async function handleRegistrationResponse(response) {
  const data = await response.json();

  switch (data.registration_status) {
    case 'Active':
      // Store tokens, redirect to dashboard
      storeTokens(data.access_token, data.refresh_token);
      router.push('/dashboard');
      break;

    case 'PendingAdminReview':
      // Show "awaiting approval" screen — no tokens to store
      router.push('/registration/pending-approval');
      break;

    case 'PendingVerification':
      // Store tokens (needed for verification API calls), start verification
      storeTokens(data.access_token, data.refresh_token);
      router.push('/registration/verify');
      break;

    default:
      showError('Unexpected registration status');
  }
}
```

#### 4. Identity Verification Flow (When PendingVerification)

After registration returns `PendingVerification`, the user has a JWT token and must complete verification.

**Start verification session:**
```
POST /api/registration/verify/start
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "session_id": 7,
    "status": "Created",
    "redirect_url": "https://verify.provider.com/session/abc123",
    "sdk_token": null,
    "expires_at": "2026-03-07T15:00:00Z"
  }
}
```

**Frontend handling:**
```typescript
const session = await startVerification();

if (session.data.redirect_url) {
  // Redirect-based provider (e.g. Stripe Identity, Veriff)
  // Open in new tab or redirect
  window.location.href = session.data.redirect_url;
} else if (session.data.sdk_token) {
  // Embedded SDK provider (e.g. Persona, Jumio)
  // Initialize provider's JS SDK with the token
  initProviderSdk(session.data.sdk_token);
}
```

**Poll verification status (after redirect back or periodically):**
```
GET /api/registration/verify/status
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "session_id": 7,
    "status": "Completed",
    "provider": "Mock",
    "level": "DocumentOnly",
    "decision": "approved",
    "decision_reason": "Mock: auto-approved",
    "created_at": "2026-03-07T14:00:00Z",
    "completed_at": "2026-03-07T14:02:00Z",
    "expires_at": "2026-03-07T15:00:00Z"
  }
}
```

**Verification status values:**

| Status | Meaning | Frontend Action |
|--------|---------|-----------------|
| `Created` | Session created, not started | Show "Start verification" or redirect |
| `InProgress` | Provider is processing | Show spinner, poll every 5s |
| `Completed` | Verification passed | Check user status — may be Active or PendingAdminReview |
| `Failed` | Verification failed | Show error, offer retry |
| `Expired` | Session timed out | Show expired message, offer new session |
| `Cancelled` | Session was cancelled | Show cancelled state |

```typescript
// Polling example
async function pollVerificationStatus() {
  const interval = setInterval(async () => {
    const status = await getVerificationStatus();

    switch (status.data.status) {
      case 'Completed':
        clearInterval(interval);
        // Re-check login status — user may now be Active
        const loginResponse = await refreshToken();
        if (loginResponse.ok) {
          router.push('/dashboard');
        } else {
          router.push('/registration/pending-approval');
        }
        break;

      case 'Failed':
        clearInterval(interval);
        showError(status.data.decision_reason);
        showRetryButton();
        break;

      case 'Expired':
        clearInterval(interval);
        showExpiredMessage();
        break;

      // Created, InProgress — keep polling
    }
  }, 5000); // Poll every 5 seconds
}
```


### GOV.UK Frontend Notes

The GOV.UK frontend should follow GDS (Government Digital Service) patterns:

1. **Use GDS form components** - text inputs, radios, selects from govuk-frontend
2. **Step-by-step navigation** - Use the GDS "step by step" pattern for multi-step registration
3. **Status tags** - Use `govuk-tag` for registration status (e.g. `govuk-tag--yellow` for "Pending")
4. **Error summary** - Show all validation errors at the top of the page per GDS convention
5. **Confirmation page** - After registration, show a GDS confirmation page with a panel:
   - "Active" → "Registration complete" (green panel)
   - "PendingAdminReview" → "Registration submitted" (blue panel) + "What happens next" section
   - "PendingVerification" → "Verify your identity" + continue button

### Error Responses

| Status | Error | Cause |
|--------|-------|-------|
| 400 | "Invalid or missing invite code." | InviteOnly mode, wrong/missing code |
| 400 | "Invite code has reached its maximum usage limit." | Invite exhausted |
| 400 | "User is not in PendingVerification status" | Verification start on wrong state |
| 400 | "No verification provider configured for this tenant." | Provider not set |
| 400 | "Invalid provider" | Bad webhook provider param |
| 401 | Unauthorized | Missing/invalid token |
| 404 | "Tenant not found" | Invalid tenant_slug |
| 404 | "No verification session found" | Status check before session created |

### State Machine Reference

```
Standard:           Register → Active
WithApproval:       Register → PendingAdminReview → Active | Rejected
VerifiedIdentity:   Register → PendingVerification → [Verification] → Active | PendingAdminReview | VerificationFailed
GovernmentId:       Register → PendingVerification → [Verification] → Active | PendingAdminReview | VerificationFailed
InviteOnly:         Register (+ code) → Active
```
