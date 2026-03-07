# Project NEXUS - ASP.NET Core Migration Roadmap

## Overview

This roadmap outlines the incremental migration from the legacy PHP application to ASP.NET Core 8 using the **Strangler Fig pattern**. Each phase is designed to be independently deployable and testable.

**Key Principles:**

- **Boring architecture** - Controllers + EF Core only (no CQRS, MediatR, repositories)
- **Tenant isolation** - Global query filters on all tenant-scoped entities
- **JWT interoperability** - Tokens work in both PHP and .NET
- **Separate databases** - PostgreSQL for .NET, MySQL for PHP (no shared database during migration)
- **Read-first** - Implement read operations before writes to reduce risk

---

## Migration Priority

Based on MIGRATION_GAP_MAP.md analysis of ~250 legacy features (updated 2026-03-07):

**NOTE:** On 2026-03-06, Phases 16-37 were scaffolded in a single session (controllers, services, entities, DbSets). All 32 feature domains now have code. Status below reflects scaffolded = code exists but needs EF migration, integration testing, and production hardening.

### Must-Have Parity (Blocks Production)

| Feature | Status | Notes |
|---------|--------|-------|
| Auth (JWT, login, register) | ✅ Done | Phase 0, 8 |
| Password Reset | ✅ Done | Token + Gmail email service built |
| Listings CRUD | ✅ Done | Phase 1, 3 |
| Wallet/Transactions | ✅ Done | Phase 4, 5 |
| Messaging | ✅ Done | Phase 6, 7 |
| Exchange Workflow | ✅ Scaffolded | Phase 16 (11 endpoints, ExchangeService) |
| Admin Dashboard | ✅ Scaffolded | 35 endpoints (AdminController + CRM + Analytics + Audit) |
| User Management (Admin) | ✅ Done | AdminController |
| Tenant Management | ✅ Scaffolded | SystemAdminController (8 endpoints) |
| GDPR Compliance | ✅ Scaffolded | GdprController (9 endpoints) + CookieConsentController (6 endpoints) |
| Volunteer Hour Logging | ✅ Scaffolded | VolunteeringController (16 endpoints) |
| Federated Transactions | ✅ Scaffolded | FederationController (10 endpoints) |

### Should-Have Parity (Launch Blockers)

| Feature | Status | Notes |
|---------|--------|-------|
| Reviews | ✅ Done | Phase 14 |
| Connections | ✅ Done | Phase 9 |
| Notifications | ✅ Done | Phase 10 |
| Groups & Events | ✅ Done | Phase 11 |
| Social Feed | ✅ Done | Phase 12 |
| Gamification | ✅ Done | Phase 13 + GamificationV2Controller |
| WebAuthn/Passkeys | ✅ Done | 7 endpoints, FIDO2 passwordless auth |
| Registration Policy Engine | ✅ Done | 10 endpoints, 5 modes, identity verification |
| Email Service (Gmail API) | ✅ Done | OAuth2, password reset + welcome templates |
| Two-Factor Auth (TOTP) | ✅ Done | 4 endpoints, AES-256-GCM encrypted secrets, login gate |
| Avatar/Image Upload | ❌ Missing | File upload infrastructure not built |
| Push Notifications | ✅ Scaffolded | PushNotificationController (5 endpoints) |
| Unified Search | ✅ Done | Phase 15 |
| Smart Matching | ✅ Scaffolded | MatchingController (6 endpoints) |
| Feed Ranking | ✅ Scaffolded | FeedRankingController (7 endpoints) |
| Newsletter | ✅ Scaffolded | NewsletterController (10 endpoints) |

### Nice-to-Have Parity (Post-Launch)

| Feature | Status | Notes |
|---------|--------|-------|
| AI Features | ✅ Done (LLaMA) | 22 endpoints |
| Advanced Gamification | ✅ Scaffolded | GamificationV2Controller (10 endpoints) |
| CRM | ✅ Scaffolded | AdminCrmController (6 endpoints) |
| Content Reports | ✅ Scaffolded | ReportsController (10 endpoints) |
| Skills System | ✅ Scaffolded | SkillsController (10 endpoints) |
| Translation/i18n | ✅ Scaffolded | TranslationController (9 endpoints) |
| Location/Geo | ✅ Scaffolded | LocationController (6 endpoints) |
| Predictive Staffing | ✅ Scaffolded | StaffingController (6 endpoints) |
| Listing Features | ✅ Scaffolded | ListingFeaturesController (10 endpoints) |

**Summary:** 339 endpoints across 42 controllers. Phases 0-15 fully tested. Phases 16-37 scaffolded (code exists, needs migration + testing).

---

## Current Status

| Phase | Name | Status | Endpoints |
| ----- | ---- | ------ | --------- |
| 0 | Trust Establishment | ✅ COMPLETE | JWT, tenant isolation |
| 1 | Listings READ | ✅ COMPLETE | 2 endpoints |
| 2 | User Profile Update | ✅ COMPLETE | 1 endpoint |
| 3 | Listings WRITE | ✅ COMPLETE | 3 endpoints |
| 4 | Wallet READ | ✅ COMPLETE | 3 endpoints |
| 5 | Wallet WRITE | ✅ COMPLETE | 1 endpoint |
| 6 | Messages READ | ✅ COMPLETE | 3 endpoints |
| 7 | Messages WRITE | ✅ COMPLETE | 2 endpoints |
| 8 | Auth Enhancements | ✅ COMPLETE | 5 endpoints |
| 9 | Connections | ✅ COMPLETE | 6 endpoints |
| 10 | Notifications | ✅ COMPLETE | 6 endpoints |
| 11 | Groups & Events | ✅ COMPLETE | 23 endpoints |
| 12 | Social Feed | ✅ COMPLETE | 10 endpoints |
| 13 | Gamification | ✅ COMPLETE | 6 endpoints |
| 14 | Reviews | ✅ COMPLETE | 7 endpoints |
| 15 | Search | ✅ COMPLETE | 3 endpoints |
| - | Passkeys (WebAuthn/FIDO2) | ✅ COMPLETE | 7 endpoints |
| - | Registration Policy Engine | ✅ COMPLETE | 10 endpoints |
| - | Email Service (Gmail API) | ✅ COMPLETE | Infrastructure |
| 16 | Exchange Workflow | ✅ SCAFFOLDED | 11 endpoints |
| 17 | Wallet Features | ✅ SCAFFOLDED | 9 endpoints |
| 18 | Skills & Cookie Consent | ✅ SCAFFOLDED | 16 endpoints |
| 19 | Group Features | ✅ SCAFFOLDED | 13 endpoints |
| 20 | Listing Features | ✅ SCAFFOLDED | 10 endpoints |
| 21 | Push Notifications | ✅ SCAFFOLDED | 5 endpoints |
| 22 | Feed Ranking | ✅ SCAFFOLDED | 7 endpoints |
| 23 | Location/Geo | ✅ SCAFFOLDED | 6 endpoints |
| 24 | Volunteering | ✅ SCAFFOLDED | 16 endpoints |
| 25 | GDPR & Compliance | ✅ SCAFFOLDED | 9 endpoints |
| 26 | Admin Expansion (CRM/Analytics/Audit) | ✅ SCAFFOLDED | 16 endpoints |
| 27 | Translation/i18n | ✅ SCAFFOLDED | 9 endpoints |
| 28 | Email Management | ✅ SCAFFOLDED | 5 endpoints |
| 29 | Smart Matching | ✅ SCAFFOLDED | 6 endpoints |
| 30 | Gamification V2 | ✅ SCAFFOLDED | 10 endpoints |
| 31 | Content Reports | ✅ SCAFFOLDED | 10 endpoints |
| 32 | Newsletter | ✅ SCAFFOLDED | 10 endpoints |
| 35 | Federation | ✅ SCAFFOLDED | 10 endpoints |
| 36 | Predictive Staffing | ✅ SCAFFOLDED | 6 endpoints |
| 37 | System Admin | ✅ SCAFFOLDED | 8 endpoints |

**SCAFFOLDED = Controller, service, entities, and DbSets exist. Needs EF migration, integration testing, and production hardening.**

---

## Phase 3: Listings WRITE (COMPLETE)

**Objective:** Complete CRUD for listings - the core marketplace feature.

### Endpoints

| Method | Endpoint | Description | Priority |
| ------ | -------- | ----------- | -------- |
| POST | /api/listings | Create new listing | P0 |
| PUT | /api/listings/{id} | Update own listing | P0 |
| DELETE | /api/listings/{id} | Delete own listing | P0 |

### Requirements

- Only listing owner can update/delete
- Validate: title required, max 255 chars
- Validate: type must be "offer" or "request"
- Set status to "draft" or "active" on create
- Soft delete (set DeletedAt, don't remove from DB)
- Return 404 for cross-tenant access attempts
- Return 403 if not owner

### Deliverables

- [x] POST /api/listings endpoint
- [x] PUT /api/listings/{id} endpoint
- [x] DELETE /api/listings/{id} endpoint
- [x] PHASE3_EXECUTION.md with test scripts

---

## Phase 4: Wallet READ

**Objective:** Read-only wallet/balance functionality.

### Endpoints

| Method | Endpoint | Description | Priority |
| ------ | -------- | ----------- | -------- |
| GET | /api/wallet/balance | Current user's balance | P0 |
| GET | /api/wallet/transactions | Transaction history | P0 |
| GET | /api/wallet/transactions/{id} | Single transaction | P1 |

### Requirements

- Transaction entity with tenant isolation
- Balance calculated from transaction sum
- Pagination for transaction list

### Deliverables

- [x] Transaction entity created
- [x] GET /api/wallet/balance endpoint
- [x] GET /api/wallet/transactions endpoint
- [x] GET /api/wallet/transactions/{id} endpoint
- [x] PHASE4_EXECUTION.md with test scripts

---

## Phase 5: Wallet WRITE (COMPLETE)

**Objective:** Time credit transfers between users.

### Endpoints

| Method | Endpoint | Description | Priority |
| ------ | -------- | ----------- | -------- |
| POST | /api/wallet/transfer | Transfer credits | P0 |

### Requirements

- Atomic transaction (sender balance decreases, receiver increases)
- Validate: sender has sufficient balance
- Validate: sender != receiver
- Validate: receiver exists in same tenant
- Optional: link to listing

### Deliverables

- [x] POST /api/wallet/transfer endpoint
- [x] All validations (amount > 0, sender != receiver, receiver exists, sufficient balance)
- [x] Returns new balance after transfer
- [x] PHASE5_EXECUTION.md with test scripts

---

## Phase 6: Messages READ (COMPLETE)

**Objective:** Private messaging - conversations and message history.

### Endpoints

| Method | Endpoint | Description | Priority |
| ------ | -------- | ----------- | -------- |
| GET | /api/messages | List conversations | P0 |
| GET | /api/messages/{id} | Conversation messages | P0 |
| GET | /api/messages/unread-count | Unread message count | P1 |

### Requirements

- Message and Conversation entities
- Participant validation (only parties can see)
- Unread count per conversation

### Deliverables

- [x] Conversation and Message entities with tenant isolation
- [x] GET /api/messages (list conversations with last message preview)
- [x] GET /api/messages/{id} (conversation messages with pagination)
- [x] GET /api/messages/unread-count
- [x] PHASE6_EXECUTION.md with test scripts

---

## Phase 7: Messages WRITE (COMPLETE)

**Objective:** Send messages, mark as read.

### Endpoints

| Method | Endpoint | Description | Priority |
| ------ | -------- | ----------- | -------- |
| POST | /api/messages | Send message | P0 |
| PUT | /api/messages/{id}/read | Mark conversation read | P1 |

### Requirements

- Send message to existing conversation or create new one
- Conversation participants normalized (smaller ID first) for uniqueness
- Validate: content required, max 5000 characters
- Validate: cannot message yourself
- Validate: recipient must exist in same tenant
- Mark as read only affects messages from OTHER participant

### Deliverables

- [x] POST /api/messages endpoint
- [x] PUT /api/messages/{id}/read endpoint
- [x] All validations implemented
- [x] PHASE7_EXECUTION.md with test scripts

---

## Phase 8: Authentication Enhancements (COMPLETE)

**Objective:** Complete auth parity with PHP.

### Endpoints

| Method | Endpoint | Description | Priority |
| ------ | -------- | ----------- | -------- |
| POST | /api/auth/logout | Logout / revoke token | P0 |
| POST | /api/auth/refresh | Refresh token | P1 |
| POST | /api/auth/register | New user registration | P1 |
| POST | /api/auth/forgot-password | Password reset request | P2 |
| POST | /api/auth/reset-password | Password reset confirm | P2 |

### Requirements

- [x] Refresh token storage (database table)
- [x] Token revocation list (via RevokedAt field)
- [ ] Email sending for password reset (deferred - requires email service)

### Deliverables

- [x] RefreshToken entity with tenant isolation
- [x] PasswordResetToken entity with tenant isolation
- [x] POST /api/auth/logout (revokes refresh tokens)
- [x] POST /api/auth/refresh (token rotation)
- [x] POST /api/auth/register (new user, auto-login)
- [x] POST /api/auth/forgot-password (generates reset token)
- [x] POST /api/auth/reset-password (resets password, invalidates sessions)
- [x] PHASE8_EXECUTION.md with test scripts

---

## Phase 9: Connections (COMPLETE)

**Objective:** Friend/connection system.

### Endpoints

| Method | Endpoint | Description | Priority |
| ------ | -------- | ----------- | -------- |
| GET | /api/connections | List connections | P1 |
| GET | /api/connections/pending | Get pending requests | P1 |
| POST | /api/connections | Send connection request | P1 |
| PUT | /api/connections/{id}/accept | Accept request | P1 |
| PUT | /api/connections/{id}/decline | Decline request | P1 |
| DELETE | /api/connections/{id} | Remove connection | P1 |

### Deliverables

- [x] Connection entity with tenant isolation
- [x] GET /api/connections (list with status filter)
- [x] GET /api/connections/pending (incoming/outgoing)
- [x] POST /api/connections (send request, mutual auto-accept)
- [x] PUT /api/connections/{id}/accept
- [x] PUT /api/connections/{id}/decline
- [x] DELETE /api/connections/{id}
- [x] PHASE9_EXECUTION.md with test scripts

---

## Phase 10: Notifications (COMPLETE)

**Objective:** In-app notification system.

### Endpoints

| Method | Endpoint | Description | Priority |
| ------ | -------- | ----------- | -------- |
| GET | /api/notifications | List notifications | P1 |
| GET | /api/notifications/unread-count | Get unread count | P1 |
| GET | /api/notifications/{id} | Get single notification | P1 |
| PUT | /api/notifications/{id}/read | Mark read | P1 |
| PUT | /api/notifications/read-all | Mark all read | P2 |
| DELETE | /api/notifications/{id} | Delete notification | P2 |

### Automatic Triggers

- Connection request sent → notify addressee
- Connection accepted → notify requester
- Mutual auto-accept → notify both users

### Deliverables

- [x] Notification entity with tenant isolation
- [x] GET /api/notifications (paginated, with unread count)
- [x] GET /api/notifications/unread-count
- [x] GET /api/notifications/{id}
- [x] PUT /api/notifications/{id}/read
- [x] PUT /api/notifications/read-all
- [x] DELETE /api/notifications/{id}
- [x] Automatic notification on connection events
- [x] PHASE10_EXECUTION.md with test scripts

---

## Phase 11: Groups & Events (COMPLETE)

**Objective:** Community groups and events with RSVP functionality.

### Groups Endpoints

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| GET | /api/groups | List all groups (paginated) |
| GET | /api/groups/my | List my groups |
| GET | /api/groups/{id} | Get group details |
| POST | /api/groups | Create group |
| PUT | /api/groups/{id} | Update group |
| DELETE | /api/groups/{id} | Delete group |
| GET | /api/groups/{id}/members | List members |
| POST | /api/groups/{id}/join | Join public group |
| DELETE | /api/groups/{id}/leave | Leave group |
| POST | /api/groups/{id}/members | Add member |
| DELETE | /api/groups/{id}/members/{memberId} | Remove member |
| PUT | /api/groups/{id}/members/{memberId}/role | Update role |
| PUT | /api/groups/{id}/transfer-ownership | Transfer ownership |

### Events Endpoints

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| GET | /api/events | List events (filterable) |
| GET | /api/events/my | List my RSVPs |
| GET | /api/events/{id} | Get event details |
| POST | /api/events | Create event |
| PUT | /api/events/{id} | Update event |
| PUT | /api/events/{id}/cancel | Cancel event |
| DELETE | /api/events/{id} | Delete event |
| GET | /api/events/{id}/rsvps | List RSVPs |
| POST | /api/events/{id}/rsvp | RSVP to event |
| DELETE | /api/events/{id}/rsvp | Remove RSVP |

### Deliverables

- [x] Group entity with tenant isolation
- [x] GroupMember junction entity (member/admin/owner roles)
- [x] Event entity with optional group association
- [x] EventRsvp junction entity (going/maybe/not_going)
- [x] All 13 groups endpoints
- [x] All 10 events endpoints
- [x] Private vs public group access control
- [x] Event capacity enforcement
- [x] PHASE11_EXECUTION.md with test scripts

---

## Phase 12: Social Feed (COMPLETE)

**Objective:** Activity feed with posts, likes, and comments.

### Feed Endpoints

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| GET | /api/feed | List feed posts (paginated) |
| GET | /api/feed/{id} | Get post details |
| POST | /api/feed | Create post |
| PUT | /api/feed/{id} | Update post |
| DELETE | /api/feed/{id} | Delete post |
| POST | /api/feed/{id}/like | Like post |
| DELETE | /api/feed/{id}/like | Unlike post |
| GET | /api/feed/{id}/comments | List comments |
| POST | /api/feed/{id}/comments | Add comment |
| DELETE | /api/feed/{id}/comments/{commentId} | Delete comment |

### Deliverables

- [x] FeedPost entity with tenant isolation
- [x] PostLike junction entity
- [x] PostComment entity
- [x] All 10 feed endpoints
- [x] Group-specific posts support
- [x] Like/unlike with counts
- [x] PHASE12_EXECUTION.md with test scripts

---

## Phase 13: Gamification (COMPLETE)

**Objective:** XP, levels, badges, and leaderboards.

### Endpoints

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| GET | /api/gamification/profile | Current user's gamification profile |
| GET | /api/gamification/profile/{userId} | Another user's profile |
| GET | /api/gamification/badges | All available badges |
| GET | /api/gamification/badges/my | Current user's earned badges |
| GET | /api/gamification/leaderboard | XP leaderboard |
| GET | /api/gamification/xp-history | XP history |

### Deliverables

- [x] Badge entity with tenant isolation
- [x] UserBadge junction entity
- [x] XpLog entity for tracking XP gains
- [x] TotalXp and Level fields on User entity
- [x] GamificationService for XP/badge logic
- [x] All 6 gamification endpoints
- [x] XP integration across all action endpoints
- [x] 10 predefined badges per tenant
- [x] Leaderboard with period filtering (all/week/month/year)
- [x] PHASE13_EXECUTION.md with test scripts

---

## Phase 14: Reviews (COMPLETE)

**Objective:** User and listing reviews with ratings.

### Endpoints

| Method | Endpoint | Description | Priority |
| ------ | -------- | ----------- | -------- |
| GET | /api/users/{id}/reviews | Get reviews for a user | P0 |
| POST | /api/users/{id}/reviews | Leave a review for a user | P0 |
| GET | /api/listings/{id}/reviews | Get reviews for a listing | P0 |
| POST | /api/listings/{id}/reviews | Leave a review for a listing | P0 |
| GET | /api/reviews/{id} | Get a specific review | P0 |
| PUT | /api/reviews/{id} | Update own review | P1 |
| DELETE | /api/reviews/{id} | Delete own review | P1 |

### Requirements

- Review entity with tenant isolation
- Rating field (1-5 stars)
- Comment field (optional, max 2000 chars)
- One review per user per target (user or listing)
- Cannot review yourself
- Cannot review your own listing
- Reviewer must have completed a transaction with the target (optional enforcement)
- Average rating calculated on read

### Deliverables

- [x] Review entity with tenant isolation
- [x] GET /api/users/{id}/reviews endpoint
- [x] POST /api/users/{id}/reviews endpoint
- [x] GET /api/listings/{id}/reviews endpoint
- [x] POST /api/listings/{id}/reviews endpoint
- [x] GET /api/reviews/{id} endpoint
- [x] PUT /api/reviews/{id} endpoint
- [x] DELETE /api/reviews/{id} endpoint
- [x] Average rating calculation
- [x] XP integration (award XP for leaving reviews)
- [x] PHASE14_EXECUTION.md with test scripts

---

## Phase 15: Search (COMPLETE)

**Objective:** Unified search across listings, users, groups, and events with autocomplete suggestions. Enable member directory search by name to support frontend discovery features.

### Endpoints

| Method | Endpoint | Description | Priority |
| ------ | -------- | ----------- | -------- |
| GET | /api/search | Unified search across entity types | P0 |
| GET | /api/search/suggestions | Autocomplete suggestions (lightweight) | P0 |
| GET | /api/members | Member directory with name filter | P0 |

### Query Parameters

**GET /api/search**

| Parameter | Type | Required | Allowed Values |
| --------- | ---- | -------- | -------------- |
| q | string | Yes | Min 2 chars, max 100 chars |
| type | string | No | `all` (default), `listings`, `users`, `groups`, `events` |
| page | int | No | >= 1 (default: 1) |
| limit | int | No | 1-50 (default: 20) |

**GET /api/search/suggestions**

| Parameter | Type | Required | Allowed Values |
| --------- | ---- | -------- | -------------- |
| q | string | Yes | Min 2 chars, max 100 chars |
| limit | int | No | 1-10 (default: 5) |

**GET /api/members**

| Parameter | Type | Required | Allowed Values |
| --------- | ---- | -------- | -------------- |
| q | string | No | Search by name (first or last) |
| page | int | No | >= 1 (default: 1) |
| limit | int | No | 1-50 (default: 20) |

*Note: `skills` parameter deferred to future phase.*

### Response Contracts

**GET /api/search**

```json
{
  "listings": [{ "id", "title", "description", "type", "status", "created_at" }],
  "users": [{ "id", "first_name", "last_name", "avatar_url", "bio" }],
  "groups": [{ "id", "name", "description", "member_count", "is_public" }],
  "events": [{ "id", "title", "description", "location", "starts_at", "status" }],
  "pagination": { "page", "limit", "total", "pages" }
}
```

**GET /api/search/suggestions**

```json
[
  { "text": "Garden Tools", "type": "listings", "id": 123 },
  { "text": "Gardening Group", "type": "groups", "id": 45 }
]
```

**GET /api/members**

```json
{
  "data": [
    {
      "id": 1,
      "first_name": "Alice",
      "last_name": "Admin",
      "avatar_url": null,
      "bio": "Truncated to 200 chars...",
      "created_at": "2026-01-15T10:00:00Z"
    }
  ],
  "pagination": { "page", "limit", "total", "pages" }
}
```

### Contract Decisions (Frozen 2026-02-02)

| Decision | Choice | Rationale |
| -------- | ------ | --------- |
| Limit exceeds max | Return `400 Bad Request` | Explicit validation; no silent corrections |
| Pagination when total=0 | `pages` = 0 | Mathematically correct; avoids off-by-one confusion |
| Skills filter on /api/members | Removed from v1 | Deferred until User Skills entity exists |

### Rules

1. **Tenant Isolation** - All queries scoped to current user's tenant via EF Core global filters
2. **Authentication Required** - All three endpoints require valid JWT
3. **Empty Query on /api/members** - Returns all members (paginated) when no filters provided
4. **Short Query Rejected** - `q` parameter must be at least 2 characters (returns 400)
5. **Max Limits Enforced** - Search: 50 per page, Suggestions: 10 max
6. **Deterministic Sorting** - Results sorted by relevance proxy (title/name match first), then by created_at desc
7. **Soft-Deleted Excluded** - Listings with DeletedAt set are not returned
8. **Inactive Users Excluded** - Users with IsActive = false are not returned
9. **Cancelled Events Excluded** - Events with Status = cancelled are not returned

### Testing Notes

- **Swagger-first validation** - All 8 test cases documented in PHASE15_EXECUTION.md
- **Tenant isolation test** - Login as Globex user, search for ACME data, expect empty results
- **Case-insensitive matching** - ILIKE queries (PostgreSQL) for partial matching

### Deliverables

- [x] GET /api/search endpoint
- [x] GET /api/search/suggestions endpoint
- [x] GET /api/members endpoint
- [x] Query parameter validation
- [x] Case-insensitive partial matching (ILIKE)
- [x] Pagination with page/limit/total/pages
- [x] Tenant isolation enforced
- [x] PHASE15_EXECUTION.md with test scripts

---

## V1 Feature Parity Summary (Updated 2026-03-07)

The legacy PHP platform (V1) has grown significantly since this roadmap was created. Current V1 scale:

| Metric | V1 (PHP) | V2 (ASP.NET) | Gap |
|--------|----------|--------------|-----|
| API Endpoints | 1,735 | 339 | 80% missing |
| PHP/C# Services | 227 | 40 | 82% missing |
| Controllers | 198 | 42 | 79% missing |
| Data Models | 60 | 91 | V2 exceeds V1 |
| React Pages | 163 | 0 | 100% missing |
| Admin Modules | 226 | 0 | 100% missing |
| Feature Domains | 32 | 32 | All scaffolded |
| i18n Languages | 7 | 0 | 100% missing |

See MIGRATION_GAP_MAP.md for the full feature-by-feature breakdown.

---

## Future Phases (Backlog)

### Phase 16: Exchange Workflow (P0 - CRITICAL)

**Objective:** Exchanges are the core of timebanking. V1 has 3 services (ExchangeWorkflowService, ExchangeRatingService, GroupExchangeService).

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| POST | /api/exchanges | Create exchange from listing |
| GET | /api/exchanges | List my exchanges |
| GET | /api/exchanges/{id} | Get exchange details |
| PUT | /api/exchanges/{id}/accept | Accept exchange |
| PUT | /api/exchanges/{id}/complete | Mark exchange complete |
| PUT | /api/exchanges/{id}/cancel | Cancel exchange |
| POST | /api/exchanges/{id}/rate | Rate exchange |
| POST | /api/group-exchanges | Create group exchange |
| GET | /api/group-exchanges | List group exchanges |

### Phase 17: File/Image Uploads (P1)

**Objective:** Avatar and content image uploads. V1 uses UploadService with WebP conversion.

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| POST | /api/upload | General file upload |
| POST | /api/users/me/avatar | Upload user avatar |
| POST | /api/listings/{id}/images | Upload listing images |
| POST | /api/groups/{id}/image | Upload group image |
| POST | /api/events/{id}/image | Upload event image |

### Phase 18: Email Integration (COMPLETE)

**Objective:** Email delivery for transactional emails. V1 uses Gmail API + SendGrid.

- [x] IEmailService abstraction
- [x] Gmail API OAuth2 provider implementation (GmailEmailService.cs)
- [x] Password reset email template (HTML + plain text)
- [x] Welcome email template
- [x] Wire into AuthController (forgot-password flow sends reset email)
- [x] Wire into registration flow (welcome email on active registration)
- [ ] Email verification on registration
- [ ] Email notifications for messages, connections, etc.

**Status:** Gmail service wired into AuthController. Forgot-password sends reset email with configurable frontend URL. Registration sends welcome email. Email sending is non-blocking (fire-and-forget). Gmail disabled by default in appsettings (set `Gmail:Enabled=true` + credentials in env).

### Phase 19: GDPR & Compliance (P1)

**Objective:** Data export, account deletion, consent tracking. V1 has 7 services (GdprService, AuditLogService, CookieConsentService, CookieInventoryService, LegalDocumentService, PerformanceMonitorService, SentryService).

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| GET | /api/users/me/data-export | Export user data (GDPR) |
| DELETE | /api/users/me | Delete account (GDPR) |
| POST | /api/consent | Record consent |
| GET | /api/consent/status | Check consent status |
| GET | /api/legal/documents | Get legal documents (ToS, Privacy) |
| POST | /api/legal/documents/{id}/accept | Accept legal document |
| GET | /api/cookies | Cookie inventory |
| POST | /api/cookies/consent | Update cookie consent |

### Phase 20: Two-Factor Authentication (COMPLETE)

**Objective:** TOTP-based 2FA + WebAuthn for account security. V1 has TotpService, TwoFactorChallengeManager, WebAuthnChallengeStore.

**WebAuthn/Passkeys — COMPLETE (7 endpoints):**

| Method | Endpoint | Description | Status |
| ------ | -------- | ----------- | ------ |
| POST | /api/passkeys/register/begin | Begin passkey registration | ✅ Done |
| POST | /api/passkeys/register/finish | Complete passkey registration | ✅ Done |
| POST | /api/passkeys/authenticate/begin | Begin passwordless login | ✅ Done |
| POST | /api/passkeys/authenticate/finish | Complete passwordless login | ✅ Done |
| GET | /api/passkeys | List user's passkeys | ✅ Done |
| DELETE | /api/passkeys/{id} | Delete a passkey | ✅ Done |
| PUT | /api/passkeys/{id} | Rename a passkey | ✅ Done |

**Implementation:** fido2-net-lib v4, conditional UI support, discoverable credentials, signature counter tracking, tenant-scoped. PasskeyService.cs (298 lines), PasskeysController.cs (434 lines), UserPasskey entity.

**TOTP — COMPLETE (4 endpoints):**

| Method | Endpoint | Description | Status |
| ------ | -------- | ----------- | ------ |
| GET | /api/auth/2fa/status | Get 2FA status | ✅ Done |
| POST | /api/auth/2fa/setup | Get TOTP setup (QR code, secret) | ✅ Done |
| POST | /api/auth/2fa/verify-setup | Verify code and enable 2FA | ✅ Done |
| POST | /api/auth/2fa/verify | Verify TOTP during login | ✅ Done |
| POST | /api/auth/2fa/disable | Disable TOTP | ✅ Done |

**Implementation:** Otp.NET library, AES-256-GCM encrypted secrets (key derived from JWT secret via HKDF), ±1 step verification window for clock drift. Login flow returns `requires_2fa: true` when 2FA is enabled, client submits code to `/api/auth/2fa/verify`. TotpService.cs, TotpController.cs, User entity fields: TwoFactorEnabled, TotpSecretEncrypted, TwoFactorEnabledAt.

### Phase 21: Push Notifications (P2)

**Objective:** Web push (VAPID) and mobile push (FCM). V1 has FCMPushService, WebPushService, PusherService, RealtimeService.

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| POST | /api/push/subscribe | Subscribe to web push |
| DELETE | /api/push/subscribe | Unsubscribe from web push |
| POST | /api/push/register-device | Register mobile device (FCM) |
| DELETE | /api/push/register-device | Unregister device |

Note: V2's SignalR could replace Pusher for real-time notifications.

### Phase 22: User Preferences (P2)

**Objective:** Store user notification and layout preferences.

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| GET | /api/users/me/preferences | Get user preferences |
| PUT | /api/users/me/preferences | Update user preferences |

### Phase 23: Reporting & Moderation (P2)

**Objective:** Content flagging and moderation queue. V1 has ContentModerationService, AbuseDetectionService, SafeguardingService, VettingService.

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| POST | /api/reports | Report content (user, listing, post, comment) |
| GET | /api/reports/my | My submitted reports |
| GET | /api/admin/reports | Moderation queue (admin only) |
| PUT | /api/admin/reports/{id}/resolve | Resolve report (admin only) |
| GET | /api/admin/vetting | Vetting records |
| POST | /api/admin/vetting/{userId} | Create vetting record |
| GET | /api/admin/safeguarding | Safeguarding dashboard |

### Phase 24: Volunteering (P2)

**Objective:** Volunteer opportunities, applications, hours tracking. V1 has 11 services.

**Opportunities:**

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| GET | /api/volunteering/opportunities | List opportunities |
| GET | /api/volunteering/opportunities/{id} | Opportunity details |
| POST | /api/volunteering/opportunities | Create opportunity |
| PUT | /api/volunteering/opportunities/{id} | Update opportunity |
| DELETE | /api/volunteering/opportunities/{id} | Delete opportunity |

**Applications:**

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| POST | /api/volunteering/opportunities/{id}/apply | Apply to opportunity |
| GET | /api/volunteering/applications | My applications |
| PUT | /api/volunteering/applications/{id}/accept | Accept application (org) |
| PUT | /api/volunteering/applications/{id}/reject | Reject application (org) |

**Hours:**

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| POST | /api/volunteering/hours | Log volunteer hours |
| GET | /api/volunteering/hours | My hours history |
| PUT | /api/volunteering/hours/{id}/verify | Verify hours (org) |
| GET | /api/volunteering/hours/summary | Hours summary |

**Shifts:**

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| GET | /api/volunteering/opportunities/{id}/shifts | List shifts |
| POST | /api/volunteering/shifts/{id}/signup | Sign up for shift |
| POST | /api/volunteering/shifts/{id}/swap | Request shift swap |

**Certificates:**

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| GET | /api/volunteering/certificates | My certificates |
| POST | /api/volunteering/certificates/generate | Generate certificate |

### Phase 25: Super Admin (P2)

**Objective:** Platform-level administration (multi-tenant). V1 has 5 tenant management services.

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| GET | /api/super-admin/dashboard | Platform metrics |
| GET | /api/super-admin/tenants | List tenants |
| POST | /api/super-admin/tenants | Create tenant |
| PUT | /api/super-admin/tenants/{id} | Update tenant |
| POST | /api/super-admin/tenants/{id}/suspend | Suspend tenant |
| GET | /api/super-admin/tenants/{id}/hierarchy | Tenant hierarchy |
| GET | /api/super-admin/users | Cross-tenant user list |
| PUT | /api/super-admin/users/{id}/role | Assign global role |
| POST | /api/super-admin/emergency-lockdown | Emergency lockdown |
| GET | /api/super-admin/audit-log | Platform audit log |
| PUT | /api/super-admin/tenants/{id}/features | Manage tenant features |

### Phase 26: Admin Expansion (P2)

**Objective:** Expand admin panel toward V1 parity. V1 has 446 admin API endpoints across 35 admin API controllers.

**CRM:**

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| GET | /api/admin/crm/dashboard | CRM dashboard metrics |
| GET | /api/admin/crm/notes/{userId} | Member notes |
| POST | /api/admin/crm/notes/{userId} | Create member note |
| GET | /api/admin/crm/tasks | Coordinator tasks |
| POST | /api/admin/crm/tasks | Create task |
| PUT | /api/admin/crm/tasks/{id} | Update task |

**Newsletter:**

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| GET | /api/admin/newsletters | List newsletters |
| POST | /api/admin/newsletters | Create newsletter |
| PUT | /api/admin/newsletters/{id} | Update newsletter |
| POST | /api/admin/newsletters/{id}/send | Send newsletter |
| GET | /api/admin/newsletters/{id}/analytics | Newsletter analytics |
| GET | /api/admin/newsletters/bounces | Bounce management |
| GET | /api/admin/newsletters/segments | List segments |
| POST | /api/admin/newsletters/segments | Create segment |

**System:**

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| GET | /api/admin/cron-jobs | List cron jobs |
| POST | /api/admin/cron-jobs/{id}/run | Run cron job |
| GET | /api/admin/activity-log | Activity/audit log |
| GET | /api/admin/email-settings | Email config |
| PUT | /api/admin/email-settings | Update email config |
| GET | /api/admin/cache | Cache stats |
| DELETE | /api/admin/cache | Clear cache |

**Content:**

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| GET | /api/admin/blog | List blog posts |
| POST | /api/admin/blog | Create blog post |
| PUT | /api/admin/blog/{id} | Update blog post |
| DELETE | /api/admin/blog/{id} | Delete blog post |
| GET | /api/admin/pages | List pages |
| POST | /api/admin/pages | Create page |
| PUT | /api/admin/pages/{id} | Update page |
| GET | /api/admin/menus | List menus |
| PUT | /api/admin/menus | Update menus |

### Phase 27: Federation (P3)

**Objective:** Cross-tenant operations for federated timebanks. V1 has 18 services with 5-phase rollout.

**Setup:**

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| GET | /api/federation/partners | List federation partners |
| POST | /api/federation/partners | Add partner |
| DELETE | /api/federation/partners/{id} | Remove partner |
| GET | /api/federation/settings | Get federation settings |
| PUT | /api/federation/settings | Update settings |
| GET | /api/federation/api-keys | List API keys |
| POST | /api/federation/api-keys | Create API key |
| DELETE | /api/federation/api-keys/{id} | Revoke API key |

**Cross-Tenant Operations:**

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| GET | /api/federation/listings | Search federated listings |
| GET | /api/federation/members | Search federated members |
| POST | /api/federation/transactions | Create federated transaction |
| GET | /api/federation/events | List federated events |
| POST | /api/federation/messages | Send federated message |

**Admin:**

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| GET | /api/federation/dashboard | Federation stats |
| GET | /api/federation/directory | Participating timebanks |
| GET | /api/federation/audit-log | Federation audit trail |
| GET | /api/federation/analytics | Federation analytics |
| POST | /api/federation/export | Export data for partner |
| POST | /api/federation/import | Import data from partner |

### Phase 28: Ranking Algorithms (P3)

**Objective:** Port V1's ranking algorithms. V1 has EdgeRank (feed), MatchRank (listings), CommunityRank (members).

- FeedRankingService: Time decay, affinity weights, type weights, cold-start boost, engagement cap
- ListingRankingService: Bayesian average, Wilson quality score, CF +15%, mutual reciprocity
- MemberRankingService: Wilson Score 95% CI, CF +15%, time-decay on reviews
- CollaborativeFilteringService: Item-based CF, KNN cache in Redis

### Phase 29: Smart Matching (P3)

**Objective:** Port V1's matching engine. V1 has 19 matching/algorithm services.

- SmartMatchingEngine: Embedding boost +10%, KNN boost +12%
- CrossModuleMatchingService: Match across listings, jobs, volunteering, groups
- MatchLearningService: Learn from user interactions (completed=5.0, contacted=3.0, saved=2.0, viewed=0.5, dismissed=-1.0)
- EmbeddingService: OpenAI text-embedding-3-small for semantic similarity
- MatchApprovalWorkflowService: Manual approval for sensitive matches
- GroupRecommendationEngine: CF + temporal trend + tenant-scoped suggestions

### Phase 30: Jobs Module (P3)

**Objective:** Job vacancies and applications. V1 has JobVacancyService, PredictiveStaffingService.

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| GET | /api/jobs | List job vacancies |
| GET | /api/jobs/{id} | Job vacancy details |
| POST | /api/jobs | Create job vacancy |
| PUT | /api/jobs/{id} | Update job vacancy |
| DELETE | /api/jobs/{id} | Delete job vacancy |
| POST | /api/jobs/{id}/apply | Apply to job |
| GET | /api/jobs/alerts | Job alert subscriptions |
| POST | /api/jobs/alerts | Subscribe to job alerts |

### Phase 31: Goals Module (P3)

**Objective:** Personal and community goals. V1 has 5 services (GoalService, GoalCheckinService, GoalProgressService, GoalReminderService, GoalTemplateService).

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| GET | /api/goals | List goals |
| GET | /api/goals/{id} | Goal details |
| POST | /api/goals | Create goal |
| PUT | /api/goals/{id} | Update goal |
| DELETE | /api/goals/{id} | Delete goal |
| POST | /api/goals/{id}/checkin | Log check-in |
| GET | /api/goals/templates | Goal templates |
| GET | /api/goals/discover | Discover popular goals |

### Phase 32: Polls & Ideation (P3)

**Objective:** Community polls, idea challenges, campaigns. V1 has 7 services.

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| GET | /api/polls | List polls |
| GET | /api/polls/{id} | Poll details |
| POST | /api/polls | Create poll |
| POST | /api/polls/{id}/vote | Cast vote |
| GET | /api/ideation/challenges | List idea challenges |
| POST | /api/ideation/challenges | Create challenge |
| POST | /api/ideation/challenges/{id}/ideas | Submit idea |
| GET | /api/campaigns | List campaigns |
| POST | /api/campaigns | Create campaign |

### Phase 33: Blog & CMS (P3)

**Objective:** Public-facing blog posts, pages, resources. V1 has page builder V2 with drag-and-drop.

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| GET | /api/blog | List blog posts |
| GET | /api/blog/{slug} | Get blog post |
| GET | /api/pages/{slug} | Get page |
| GET | /api/resources | List resources |
| GET | /api/resources/{id} | Resource details |
| GET | /api/help | Help articles |
| GET | /api/help/{id} | Help article details |
| GET | /api/kb | Knowledge base articles |
| GET | /api/kb/{slug} | Knowledge base article |

### Phase 34: Advanced Gamification (P3)

**Objective:** Challenges, streaks, seasons, shop. V1 has 20 gamification services.

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| GET | /api/challenges | List active challenges |
| GET | /api/challenges/{id} | Challenge details |
| POST | /api/challenges/{id}/join | Join challenge |
| GET | /api/gamification/streak | Current streak |
| POST | /api/gamification/daily-reward | Claim daily reward |
| GET | /api/gamification/shop | XP shop items |
| POST | /api/gamification/shop/{id}/buy | Purchase shop item |
| GET | /api/gamification/collections | Badge collections |
| GET | /api/gamification/seasons | Leaderboard seasons |
| GET | /api/gamification/nexus-score | Nexus Score |

### Phase 35: Organizations (P3)

**Objective:** Organizational accounts with wallets. V1 has OrgWalletService, OrgNotificationService.

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| POST | /api/organisations | Register organisation |
| GET | /api/organisations | List organisations |
| GET | /api/organisations/{id} | Organisation details |
| GET | /api/organisations/{id}/wallet | Org wallet balance |
| POST | /api/organisations/{id}/wallet/transfer | Org wallet transfer |
| GET | /api/organisations/{id}/members | Org members |

### Phase 36: Newsletter System (P3)

**Objective:** Full newsletter system with templates, segments, deliverability. V1 has 4+ newsletter services.

- Newsletter CRUD with template builder
- Subscriber management and segments
- Send optimization (AI-powered send time)
- Deliverability tracking and bounce management
- Analytics (opens, clicks, unsubscribes)

### Phase 37: Meilisearch Integration (P3)

**Objective:** Replace ILIKE queries with proper full-text search. V1 uses Meilisearch with typo tolerance and 14 synonym groups.

- Meilisearch Docker container
- Index sync for listings, users, groups, events
- Typo tolerance and fuzzy matching
- Synonym dictionary
- Personalized search results

---

## Entity Migration Order

Based on entity dependency analysis:

| Order | Entity | Depends On | Phase |
| ----- | ------ | ---------- | ----- |
| 1 | Tenant | - | 0 ✅ |
| 2 | User | Tenant | 0 ✅ |
| 3 | Listing | Tenant, User | 1-3 ✅ |
| 4 | Transaction | Tenant, User, Listing | 4-5 ✅ |
| 5 | Message/Conversation | Tenant, User | 6-7 ✅ |
| 6 | Connection | Tenant, User | 9 ✅ |
| 7 | Notification | Tenant, User | 10 ✅ |
| 8 | Group/GroupMember | Tenant, User | 11 ✅ |
| 9 | Event/EventRsvp | Tenant, User, Group | 11 ✅ |
| 10 | FeedPost/Like/Comment | Tenant, User | 12 ✅ |
| 11 | Badge/UserBadge/XpLog | Tenant, User | 13 ✅ |
| 12 | Review | Tenant, User, Listing | 14 ✅ |

---

## Architecture Guidelines

### What We ARE Using

- Single ASP.NET Core 8 Web API project
- EF Core directly in controllers
- Global query filters for tenant isolation
- Simple validation in controllers
- PostgreSQL (separate from PHP's MySQL)

### What We Are NOT Using (Yet)

| Pattern | Reason | Revisit When |
| ------- | ------ | ------------ |
| CQRS | Over-engineering for current scope | Read/write patterns diverge significantly |
| MediatR | Adds indirection without benefit | Many cross-cutting concerns needed |
| Repository Pattern | EF Core DbContext is already a Unit of Work | Testing becomes complex |
| Clean Architecture layers | Single project easier to understand | Project exceeds ~50 entities |
| AutoMapper | Manual mapping is explicit | DTO count exceeds 50 |
| FluentValidation | DataAnnotations + inline validation sufficient | Validation rules become complex |

### Security Invariants

1. **Tenant Isolation** - Every query filtered by TenantId
2. **JWT Only** - No session-based auth
3. **X-Tenant-ID Header** - Only for Development, unauthenticated requests
4. **Owner Checks** - Users can only modify their own resources

---

## Testing Strategy

### Per-Phase Testing

1. **Manual tests** - PowerShell scripts in PHASEX_EXECUTION.md
2. **Contract tests** - Response shape matches PHP (when applicable)
3. **Tenant isolation tests** - Cross-tenant access returns 404

### Before Production

- [ ] Integration tests for critical paths
- [ ] Load testing for performance baseline
- [ ] Security review of auth/tenant isolation

---

## Open Questions

### Q001: Token Expiry Durations

- Web: 2 hours access
- Mobile: 1 year access
- Need to confirm with PHP implementation

### Q002: Refresh Token Storage (RESOLVED)

- ✅ Implemented: Database table (refresh_tokens)
- Token rotation on refresh
- Revocation support via RevokedAt field

### Q003: Data Synchronization

- When/if do we sync data between PostgreSQL and MySQL?
- Initially: no sync (separate databases)
- Future: evaluate when Phase 10+ reached

---

## Changelog

| Date | Phase | Change |
| ---- | ----- | ------ |
| 2026-02-02 | 0 | Project structure, JWT, tenant isolation |
| 2026-02-02 | 1 | Listings READ (GET /api/listings, GET /api/listings/{id}) |
| 2026-02-02 | 2 | User Profile Update (PATCH /api/users/me) |
| 2026-02-02 | 3 | Listings WRITE (POST/PUT/DELETE /api/listings) |
| 2026-02-02 | 4 | Wallet READ (GET /api/wallet/balance, transactions) |
| 2026-02-02 | 5 | Wallet WRITE (POST /api/wallet/transfer) |
| 2026-02-02 | 6 | Messages READ (GET /api/messages, conversations, unread-count) |
| 2026-02-02 | 7 | Messages WRITE (POST /api/messages, PUT /api/messages/{id}/read) |
| 2026-02-02 | 8 | Auth Enhancements (logout, refresh, register, password reset) |
| 2026-02-02 | 9 | Connections (friend/connection system) |
| 2026-02-02 | 10 | Notifications (in-app notification system) |
| 2026-02-02 | 11 | Groups & Events (community groups, events, RSVPs) |
| 2026-02-02 | 12 | Social Feed (posts, likes, comments) |
| 2026-02-02 | 13 | Gamification (XP, levels, badges, leaderboards) |
| 2026-02-02 | 14 | Reviews (user and listing reviews with ratings) |
| 2026-02-02 | 15 | Search (unified search, suggestions, member directory) |
| 2026-02-02 | - | Backlog expanded per MIGRATION_GAP_MAP.md |
| 2026-03-06 | - | Major backlog update: V1 audit reveals 250+ features, 206 services, 1,715 endpoints. Backlog expanded to Phases 16-37 with V1 service counts per module. Exchange Workflow added as Phase 16 (P0 critical). |
