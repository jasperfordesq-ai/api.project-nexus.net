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

Based on MIGRATION_GAP_MAP.md analysis of ~140 legacy features:

### Must-Have Parity (Blocks Production)

| Feature | Status | Notes |
|---------|--------|-------|
| Auth (JWT, login, register) | ✅ Done | Phase 0, 8 |
| Password Reset | ⚠️ Partial | Token works, email deferred |
| Listings CRUD | ✅ Done | Phase 1, 3 |
| Wallet/Transactions | ✅ Done | Phase 4, 5 |
| Messaging | ✅ Done | Phase 6, 7 |
| Admin Dashboard | ❌ Missing | Backlog |
| User Management (Admin) | ❌ Missing | Backlog |
| Tenant Management | ❌ Missing | Backlog |
| GDPR Compliance | ❌ Missing | Backlog |
| Volunteer Hour Logging | ❌ Missing | Backlog |
| Federated Transactions | ❌ Missing | Backlog |

### Should-Have Parity (Launch Blockers)

| Feature | Status | Notes |
|---------|--------|-------|
| Reviews | ✅ Done | Phase 14 |
| Connections | ✅ Done | Phase 9 |
| Notifications | ✅ Done | Phase 10 |
| Groups & Events | ✅ Done | Phase 11 |
| Social Feed | ✅ Done | Phase 12 |
| Gamification | ✅ Done | Phase 13 |
| Two-Factor Auth (TOTP) | ❌ Missing | Backlog |
| Avatar/Image Upload | ❌ Missing | Backlog |
| Push Notifications | ❌ Missing | Backlog |
| Unified Search | ✅ Done | Phase 15 |

### Nice-to-Have Parity (Post-Launch)

| Feature | Status | Notes |
|---------|--------|-------|
| AI Features | ❌ Missing | Not planned |
| Polls & Surveys | ❌ Missing | Not planned |
| Goals & Self-Improvement | ❌ Missing | Not planned |
| Advanced Gamification | ❌ Missing | Challenges, shop, seasons |

**Summary:** 58 features done, 4 partial, 78 missing. See MIGRATION_GAP_MAP.md for full breakdown.

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

---

## Phase 3: Listings WRITE (Next)

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

## Future Phases (Backlog)

### File/Image Uploads (P2)

**Objective:** Avatar and content image uploads.

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| POST | /api/upload | General file upload |
| POST | /api/users/me/avatar | Upload user avatar |
| POST | /api/listings/{id}/images | Upload listing images |
| POST | /api/groups/{id}/image | Upload group image |
| POST | /api/events/{id}/image | Upload event image |

### User Preferences (P2)

**Objective:** Store user notification and layout preferences.

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| GET | /api/users/me/preferences | Get user preferences |
| PUT | /api/users/me/preferences | Update user preferences |

### Two-Factor Authentication (P2)

**Objective:** TOTP-based 2FA for account security.

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| GET | /api/auth/totp/setup | Get TOTP setup (QR code, secret) |
| POST | /api/auth/totp/enable | Enable TOTP with verification code |
| POST | /api/auth/totp/verify | Verify TOTP during login |
| DELETE | /api/auth/totp | Disable TOTP |
| GET | /api/auth/totp/backup-codes | Get backup codes |

### Push Notifications (P2)

**Objective:** Web push (VAPID) and mobile push (FCM).

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| POST | /api/push/subscribe | Subscribe to web push |
| DELETE | /api/push/subscribe | Unsubscribe from web push |
| POST | /api/push/register-device | Register mobile device (FCM) |
| DELETE | /api/push/register-device | Unregister mobile device |

### Reporting & Moderation (P2)

**Objective:** Content flagging and moderation queue.

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| POST | /api/reports | Report content (user, listing, post, comment) |
| GET | /api/reports/my | My submitted reports |
| GET | /api/admin/reports | Moderation queue (admin only) |
| PUT | /api/admin/reports/{id}/resolve | Resolve report (admin only) |

### Volunteering (P2)

**Objective:** Volunteer opportunities, applications, hours tracking.

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

### GDPR & Compliance (P1)

**Objective:** Data export, account deletion, consent tracking.

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| GET | /api/users/me/data-export | Export user data (GDPR) |
| DELETE | /api/users/me | Delete account (GDPR) |
| POST | /api/consent | Record consent |
| GET | /api/legal/documents | Get legal documents (ToS, Privacy) |

### Admin APIs (P3)

**Objective:** Tenant administration.

**Dashboard:**

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| GET | /api/admin/dashboard | Key metrics |

**User Management:**

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| GET | /api/admin/users | List users |
| GET | /api/admin/users/{id} | User details |
| PUT | /api/admin/users/{id} | Update user |
| PUT | /api/admin/users/{id}/suspend | Suspend user |
| PUT | /api/admin/users/{id}/activate | Activate user |

**Content Moderation:**

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| GET | /api/admin/listings/pending | Pending listings |
| PUT | /api/admin/listings/{id}/approve | Approve listing |
| PUT | /api/admin/listings/{id}/reject | Reject listing |

**Categories:**

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| GET | /api/admin/categories | List categories |
| POST | /api/admin/categories | Create category |
| PUT | /api/admin/categories/{id} | Update category |
| DELETE | /api/admin/categories/{id} | Delete category |

**Tenant Config:**

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| GET | /api/admin/config | Get tenant config |
| PUT | /api/admin/config | Update tenant config |

**Roles & Permissions:**

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| GET | /api/admin/roles | List roles |
| POST | /api/admin/roles | Create role |
| PUT | /api/admin/roles/{id} | Update role |
| DELETE | /api/admin/roles/{id} | Delete role |

### Super Admin (P2)

**Objective:** Platform-level administration (multi-tenant).

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| GET | /api/super-admin/dashboard | Platform metrics |
| GET | /api/super-admin/tenants | List tenants |
| POST | /api/super-admin/tenants | Create tenant |
| PUT | /api/super-admin/tenants/{id} | Update tenant |
| POST | /api/super-admin/tenants/{id}/suspend | Suspend tenant |
| GET | /api/super-admin/users | Cross-tenant user list |
| PUT | /api/super-admin/users/{id}/role | Assign global role |
| POST | /api/super-admin/emergency-lockdown | Emergency lockdown |

### Federation (P3)

**Objective:** Cross-tenant operations for federated timebanks.

**Setup:**

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| GET | /api/federation/partners | List federation partners |
| POST | /api/federation/partners | Add partner |
| DELETE | /api/federation/partners/{id} | Remove partner |
| GET | /api/federation/settings | Get federation settings |
| PUT | /api/federation/settings | Update settings |

**Cross-Tenant Operations:**

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| GET | /api/federation/listings | Search federated listings |
| GET | /api/federation/members | Search federated members |
| POST | /api/federation/transactions | Create federated transaction |
| GET | /api/federation/events | List federated events |

**Admin:**

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| GET | /api/federation/dashboard | Federation stats |
| GET | /api/federation/directory | Participating timebanks |

### Email Integration (DEFERRED)

**Objective:** Email delivery for transactional emails.

- IEmailService abstraction
- SendGrid or SMTP provider implementation
- Password reset emails (currently creates token but no email sent)
- Welcome emails on registration
- Email verification on registration
- Optional: Email notifications for messages, connections, etc.

**Status:** Blocked on provider selection. Token generation works; email delivery does not.

---

## Entity Migration Order

Based on ENTITY_MAPPING.md dependencies:

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
