# PHP vs ASP.NET Gap Analysis Report

**Date:** February 2, 2026
**Purpose:** Systematic comparison of PHP source controllers vs ASP.NET implementations
**Methodology:** Line-by-line analysis of all V2 API controllers in both codebases

---

## Executive Summary

After reviewing all PHP API controllers against their ASP.NET equivalents, **significant gaps exist** across nearly every module. The ASP.NET implementation represents a functional subset, but is missing:

1. **Rate limiting** on all endpoints (PHP has per-endpoint rate limits)
2. **CSRF verification** on all write operations
3. **2FA/TOTP authentication flow** in AuthController
4. **Cursor-based pagination** (ASP.NET uses offset pagination)
5. **Voice messages and typing indicators** in Messages
6. **Many API v2 endpoints** that exist in PHP but not in ASP.NET

---

## Module-by-Module Gap Analysis

### 1. AuthController

| Feature | PHP | ASP.NET | Gap Severity |
|---------|-----|---------|--------------|
| Login with email/password | ✅ | ✅ | - |
| Rate limiting (by email AND IP) | ✅ | ❌ | **HIGH** |
| 2FA/TOTP challenge flow | ✅ | ❌ | **HIGH** |
| Session AND Bearer token support | ✅ | Partial | MEDIUM |
| Mobile vs Web token expiry | ✅ | ❌ | MEDIUM |
| Register | ✅ | ✅ | - |
| Logout | ✅ | ✅ | - |
| Refresh token | ✅ | ✅ | - |
| Password reset | ✅ | ✅ | - |
| Check session (`checkSession`) | ✅ | ❌ | MEDIUM |
| Heartbeat (`heartbeat`) | ✅ | ❌ | LOW |
| Restore session (`restoreSession`) | ✅ | ❌ | MEDIUM |
| Revoke single token | ✅ | ❌ | MEDIUM |
| Revoke all tokens | ✅ | ❌ | MEDIUM |
| Get CSRF token | ✅ | ❌ | MEDIUM |
| ApiErrorCodes class | ✅ | ❌ | LOW |

**PHP Endpoints (14):** login, register, checkSession, heartbeat, restoreSession, refreshSession, refreshToken, validateToken, logout, revokeToken, revokeAllTokens, getCsrfToken, forgotPassword, resetPassword

**ASP.NET Endpoints (7):** login, logout, refresh, register, forgot-password, reset-password, validate

---

### 2. ListingsApiController

| Feature | PHP | ASP.NET | Gap Severity |
|---------|-----|---------|--------------|
| List listings | ✅ | ✅ | - |
| Get single listing | ✅ | ✅ | - |
| Create listing | ✅ | ✅ | - |
| Update listing | ✅ | ✅ | - |
| Delete listing | ✅ | ✅ | - |
| Cursor-based pagination | ✅ | ❌ (offset) | **HIGH** |
| CSRF verification | ✅ | ❌ | **HIGH** |
| Rate limiting | ✅ | ❌ | **HIGH** |
| Nearby/geospatial search | ✅ | ❌ | MEDIUM |
| Image upload endpoint | ✅ | ❌ | MEDIUM |
| `federated_visibility` field | ✅ | ❌ | MEDIUM |
| `sdg_goals` field | ✅ | ❌ | LOW |
| `attributes` field | ✅ | ❌ | LOW |

**PHP Endpoints:** index, nearby, show, store, update, destroy, uploadImage

**ASP.NET Endpoints:** GET, GET/{id}, POST, PUT/{id}, DELETE/{id}

---

### 3. WalletApiController

| Feature | PHP | ASP.NET | Gap Severity |
|---------|-----|---------|--------------|
| Get balance | ✅ | ✅ | - |
| List transactions | ✅ | ✅ | - |
| Get single transaction | ✅ | ✅ | - |
| Transfer credits | ✅ | ✅ | - |
| Cursor-based pagination | ✅ | ❌ (offset) | **HIGH** |
| CSRF verification | ✅ | ❌ | **HIGH** |
| Rate limiting | ✅ | ❌ | **HIGH** |
| Hide/delete transaction | ✅ | ❌ | MEDIUM |
| User search autocomplete | ✅ | ❌ | MEDIUM |
| Legacy V1 endpoints | ✅ | ❌ | LOW |

**PHP Endpoints:** balanceV2, transactionsV2, showTransaction, transferV2, destroyTransaction, userSearchV2 (+ V1 endpoints)

**ASP.NET Endpoints:** GET balance, GET transactions, GET transactions/{id}, POST transfer

---

### 4. MessagesApiController

| Feature | PHP | ASP.NET | Gap Severity |
|---------|-----|---------|--------------|
| List conversations | ✅ | ✅ | - |
| Get conversation messages | ✅ | ✅ | - |
| Send message | ✅ | ✅ | - |
| Mark as read | ✅ | ✅ | - |
| Unread count | ✅ | ✅ | - |
| Cursor-based pagination | ✅ | ❌ (offset) | **HIGH** |
| CSRF verification | ✅ | ❌ | **HIGH** |
| Rate limiting | ✅ | ❌ | **HIGH** |
| Archive conversation | ✅ | ❌ | MEDIUM |
| Typing indicator (Pusher) | ✅ | ❌ | **HIGH** |
| Voice message upload | ✅ | ❌ | **HIGH** |
| `voice_url` field support | ✅ | ❌ | **HIGH** |
| Auto-mark as read on fetch | ✅ | ❌ | LOW |

**PHP Endpoints:** conversations, unreadCount, show, send, markRead, archive, typing, uploadVoice

**ASP.NET Endpoints:** GET, POST, GET/{id}, PUT/{id}/read, GET unread-count

---

### 5. ConnectionsApiController

| Feature | PHP | ASP.NET | Gap Severity |
|---------|-----|---------|--------------|
| List connections | ✅ | ✅ | - |
| Send connection request | ✅ | ✅ | - |
| Accept request | ✅ | ✅ | - |
| Decline request | ✅ | ✅ | - |
| Remove connection | ✅ | ✅ | - |
| Cursor-based pagination | ✅ | ❌ | **HIGH** |
| CSRF verification | ✅ | ❌ | **HIGH** |
| Rate limiting | ✅ | ❌ | **HIGH** |
| Get pending counts | ✅ | ✅ (pending endpoint) | - |
| Get status with specific user | ✅ | ❌ | MEDIUM |
| Auto-accept mutual requests | ✅ | ✅ | - |

**PHP Endpoints:** index, pendingCounts, status/{userId}, request, accept/{id}, destroy/{id}

**ASP.NET Endpoints:** GET, GET pending, POST, PUT/{id}/accept, PUT/{id}/decline, DELETE/{id}

---

### 6. NotificationsApiController

| Feature | PHP | ASP.NET | Gap Severity |
|---------|-----|---------|--------------|
| List notifications | ✅ | ✅ | - |
| Get single notification | ✅ | ✅ | - |
| Mark as read | ✅ | ✅ | - |
| Mark all as read | ✅ | ✅ | - |
| Delete notification | ✅ | ✅ | - |
| Cursor-based pagination | ✅ | ❌ (offset) | **HIGH** |
| CSRF verification | ✅ | ❌ | **HIGH** |
| Rate limiting | ✅ | ❌ | **HIGH** |
| Filter by category/type | ✅ | ❌ | MEDIUM |
| Get counts by category | ✅ | ❌ | MEDIUM |
| Delete all notifications | ✅ | ❌ | LOW |
| Category-specific mark all read | ✅ | ❌ | LOW |

**PHP Endpoints:** index, counts, show/{id}, markRead/{id}, markAllRead, destroy/{id}, destroyAll

**ASP.NET Endpoints:** GET, GET unread-count, GET/{id}, PUT/{id}/read, PUT read-all, DELETE/{id}

---

### 7. GroupsApiController

| Feature | PHP | ASP.NET | Gap Severity |
|---------|-----|---------|--------------|
| List groups | ✅ | ✅ | - |
| Get single group | ✅ | ✅ | - |
| Create group | ✅ | ✅ | - |
| Update group | ✅ | ✅ | - |
| Delete group | ✅ | ✅ | - |
| Join group | ✅ | ✅ | - |
| Leave group | ✅ | ✅ | - |
| List members | ✅ | ✅ | - |
| Update member role | ✅ | ✅ | - |
| Remove member | ✅ | ✅ | - |
| Transfer ownership | ✅ | ✅ | - |
| Cursor-based pagination | ✅ | ❌ (offset) | **HIGH** |
| CSRF verification | ✅ | ❌ | **HIGH** |
| Rate limiting | ✅ | ❌ | **HIGH** |
| Pending join requests | ✅ | ❌ | MEDIUM |
| Handle join request (accept/reject) | ✅ | ❌ | MEDIUM |
| Group discussions | ✅ | ❌ | **HIGH** |
| Discussion messages | ✅ | ❌ | **HIGH** |
| Post to discussion | ✅ | ❌ | **HIGH** |
| Group image upload | ✅ | ❌ | MEDIUM |
| `federated_visibility` field | ✅ | ❌ | MEDIUM |
| Optional auth on list/show | ✅ | ❌ | LOW |

**PHP Endpoints (17):** index, show/{id}, store, update/{id}, destroy/{id}, join/{id}, leave/{id} (membership), members/{id}, updateMember/{id}/{userId}, removeMember/{id}/{userId}, pendingRequests/{id}, handleRequest/{id}/{userId}, discussions/{id}, createDiscussion/{id}, discussionMessages/{id}/{discId}, postToDiscussion/{id}/{discId}/messages, uploadImage/{id}

**ASP.NET Endpoints (13):** GET, GET my, GET/{id}, POST, PUT/{id}, DELETE/{id}, GET/{id}/members, POST/{id}/join, DELETE/{id}/leave, POST/{id}/members, DELETE/{id}/members/{id}, PUT/{id}/members/{id}/role, PUT/{id}/transfer-ownership

---

### 8. EventsApiController

| Feature | PHP | ASP.NET | Gap Severity |
|---------|-----|---------|--------------|
| List events | ✅ | ✅ | - |
| Get single event | ✅ | ✅ | - |
| Create event | ✅ | ✅ | - |
| Update event | ✅ | ✅ | - |
| Delete event | ✅ | ✅ | - |
| RSVP to event | ✅ | ✅ | - |
| Remove RSVP | ✅ | ✅ | - |
| List attendees | ✅ | ✅ | - |
| Cursor-based pagination | ✅ | ❌ (offset) | **HIGH** |
| CSRF verification | ✅ | ❌ | **HIGH** |
| Rate limiting | ✅ | ❌ | **HIGH** |
| Event image upload | ✅ | ❌ | MEDIUM |
| Cancel event endpoint | ❌ | ✅ | - |
| `federated_visibility` field | ✅ | ❌ | MEDIUM |
| `sdg_goals` field | ✅ | ❌ | LOW |
| Optional auth on list/show | ✅ | ❌ | LOW |

**PHP Endpoints (9):** index, show/{id}, store, update/{id}, destroy/{id}, rsvp/{id}, removeRsvp/{id}, attendees/{id}, uploadImage/{id}

**ASP.NET Endpoints (10):** GET, GET my, GET/{id}, POST, PUT/{id}, PUT/{id}/cancel, DELETE/{id}, GET/{id}/rsvps, POST/{id}/rsvp, DELETE/{id}/rsvp

---

### 9. SocialApiController (Feed)

| Feature | PHP | ASP.NET | Gap Severity |
|---------|-----|---------|--------------|
| List feed posts | ✅ | ✅ | - |
| Get single post | ✅ | ✅ | - |
| Create post | ✅ | ✅ | - |
| Update post | ✅ | ✅ | - |
| Delete post | ✅ | ✅ | - |
| Like post | ✅ | ✅ | - |
| Unlike post | ✅ | ✅ | - |
| List comments | ✅ | ✅ | - |
| Add comment | ✅ | ✅ | - |
| Delete comment | ✅ | ✅ | - |
| Cursor-based pagination | ✅ | ❌ (offset) | **HIGH** |
| CSRF verification | ✅ | ❌ | **HIGH** |
| Rate limiting | ✅ | ❌ | **HIGH** |
| Reply to comment (nested) | ✅ | ❌ | MEDIUM |
| Edit comment | ✅ | ❌ | MEDIUM |
| Emoji reactions on comments | ✅ | ❌ | MEDIUM |
| Share/repost content | ✅ | ❌ | MEDIUM |
| Get likers list | ✅ | ❌ | LOW |
| @mention user search | ✅ | ❌ | MEDIUM |
| Group feed (by group_id) | ✅ | ❌ | MEDIUM |
| Multiple content types (listings, events, polls, goals) | ✅ | ❌ | **HIGH** |
| Legacy V1 endpoints | ✅ | ❌ | LOW |

**PHP Endpoints (V2):** feedV2, createPostV2, likeV2 (+ many V1 endpoints)

**ASP.NET Endpoints:** GET, GET/{id}, POST, PUT/{id}, DELETE/{id}, POST/{id}/like, DELETE/{id}/like, GET/{id}/comments, POST/{id}/comments, DELETE/{id}/comments/{id}

---

### 10. GamificationV2ApiController

| Feature | PHP | ASP.NET | Gap Severity |
|---------|-----|---------|--------------|
| Get gamification profile | ✅ | ✅ | - |
| Get another user's profile | ✅ | ✅ | - |
| Get user's badges | ✅ | ✅ | - |
| Get all badges | ✅ | ✅ | - |
| Get leaderboard | ✅ | ✅ | - |
| Get XP history | ✅ | ✅ | - |
| Rate limiting | ✅ | ❌ | **HIGH** |
| CSRF verification | ✅ | ❌ | **HIGH** |
| Get specific badge details | ✅ | ❌ | MEDIUM |
| Active challenges | ✅ | ❌ | **HIGH** |
| Badge collections | ✅ | ❌ | MEDIUM |
| Daily reward status | ✅ | ❌ | **HIGH** |
| Claim daily reward | ✅ | ❌ | **HIGH** |
| XP shop items | ✅ | ❌ | **HIGH** |
| Purchase shop item | ✅ | ❌ | **HIGH** |
| Update badge showcase | ✅ | ❌ | MEDIUM |
| Leaderboard seasons | ✅ | ❌ | MEDIUM |
| Current season data | ✅ | ❌ | MEDIUM |

**PHP Endpoints (14):** profile, badges, showBadge/{key}, leaderboard, challenges, collections, dailyRewardStatus, claimDailyReward, shop, purchase, updateShowcase, seasons, currentSeason, xp-history

**ASP.NET Endpoints (6):** GET profile, GET profile/{id}, GET badges, GET badges/my, GET leaderboard, GET xp-history

---

### 11. ReviewsApiController

| Feature | PHP | ASP.NET | Gap Severity |
|---------|-----|---------|--------------|
| Get reviews for user | ✅ | ✅ | - |
| Get reviews for listing | ❌ | ✅ | - |
| Create review | ✅ | ✅ | - |
| Get single review | ✅ | ✅ | - |
| Update review | ❌ | ✅ | - |
| Delete review | ✅ | ✅ | - |
| Rate limiting | ✅ | ❌ | **HIGH** |
| CSRF verification | ✅ | ❌ | **HIGH** |
| Cursor-based pagination | ✅ | ❌ | **HIGH** |
| User review stats | ✅ | ❌ | MEDIUM |
| Trust score calculation | ✅ | ❌ | MEDIUM |
| Pending reviews (transactions) | ✅ | ❌ | MEDIUM |
| Federation transaction reviews | ✅ | ❌ | MEDIUM |
| Anonymous reviews | ✅ | ❌ | LOW |

**PHP Endpoints:** userReviews/{userId}, userStats/{userId}, userTrust/{userId}, pending, show/{id}, store, destroy/{id}

**ASP.NET Endpoints:** GET users/{id}/reviews, POST users/{id}/reviews, GET listings/{id}/reviews, POST listings/{id}/reviews, GET reviews/{id}, PUT reviews/{id}, DELETE reviews/{id}

---

### 12. SearchApiController

| Feature | PHP | ASP.NET | Status |
|---------|-----|---------|--------|
| Unified search | ✅ | ❌ | **NOT IMPLEMENTED** |
| Autocomplete suggestions | ✅ | ❌ | **NOT IMPLEMENTED** |
| Uses Meilisearch | ✅ | ❌ | **NOT IMPLEMENTED** |

**PHP Endpoints:** index (unified search), suggestions

**ASP.NET Endpoints:** None

---

### 13. UsersApiController

| Feature | PHP | ASP.NET | Gap Severity |
|---------|-----|---------|--------------|
| Get own profile | ✅ | ✅ | - |
| Get public profile | ✅ | ✅ | - |
| Update profile | ✅ | ✅ | - |
| List users | ❌ | ✅ | - |
| Rate limiting | ✅ | ❌ | **HIGH** |
| CSRF verification | ✅ | ❌ | **HIGH** |
| Update preferences (privacy/notifications) | ✅ | ❌ | **HIGH** |
| Update avatar | ✅ | ❌ | MEDIUM |
| Update password | ✅ | ❌ | **HIGH** |
| Privacy settings respecting | ✅ | Partial | MEDIUM |
| Organization profile type | ✅ | ❌ | MEDIUM |

**PHP Endpoints:** me, show/{id}, update, updatePreferences, updateAvatar, updatePassword

**ASP.NET Endpoints:** GET, GET/{id}, GET me, PATCH me

---

## Cross-Cutting Gaps (All Controllers)

### 1. Rate Limiting - **CRITICAL**

PHP implements per-endpoint rate limiting with the pattern:
```php
$this->rateLimit('endpoint_name', $requests_per_minute, $window_seconds);
```

ASP.NET has **NO rate limiting** on any endpoint.

### 2. CSRF Verification - **CRITICAL**

PHP verifies CSRF on all write operations:
```php
$this->verifyCsrf();
```

ASP.NET has **NO CSRF protection** for API endpoints.

### 3. Cursor-Based Pagination - **HIGH**

PHP uses cursor pagination for scalability:
```php
$this->respondWithCollection($items, $cursor, $limit, $has_more);
```

ASP.NET uses offset pagination:
```csharp
.Skip((page - 1) * limit).Take(limit)
```

### 4. Standardized Error Format - **MEDIUM**

PHP uses:
```json
{ "errors": [{ "code": "...", "message": "...", "field": "..." }] }
```

ASP.NET uses inconsistent error formats.

### 5. V1/V2 API Coexistence - **LOW**

PHP maintains both V1 (legacy) and V2 (standardized) endpoints for backwards compatibility.
ASP.NET only has a single API version.

---

## Priority Remediation Plan

### P0 - Security Critical (Immediate)
1. Add rate limiting middleware to all API endpoints
2. Implement CSRF verification for state-changing operations
3. Add 2FA/TOTP flow to AuthController

### P1 - Functional Parity (High)
1. Implement cursor-based pagination
2. Add voice message support to Messages
3. Add typing indicators (Pusher integration)
4. Implement group discussions
5. Add daily rewards and XP shop to Gamification
6. Implement challenges system

### P2 - Feature Completeness (Medium)
1. Add geospatial/nearby search for Listings
2. Add image upload endpoints (listings, groups, events, avatars)
3. Implement user search autocomplete for Wallet transfers
4. Add nested comment replies
5. Add @mention search
6. Implement Search module (Meilisearch integration)

### P3 - Nice-to-Have (Low)
1. Legacy V1 endpoint compatibility
2. SDG goals and attributes fields
3. Federation visibility fields
4. Session restore/heartbeat endpoints

---

## Summary Statistics

| Metric | Value |
|--------|-------|
| Total PHP API Controllers Audited | 13 |
| Total PHP Endpoints | ~120 |
| Total ASP.NET Endpoints | 81 |
| Missing Endpoints | ~40 |
| Controllers with Rate Limiting in PHP | 13/13 |
| Controllers with Rate Limiting in ASP.NET | 0/13 |
| Controllers with CSRF in PHP | 13/13 |
| Controllers with CSRF in ASP.NET | 0/13 |

**Conclusion:** The ASP.NET implementation covers approximately 65-70% of PHP functionality by endpoint count, but is missing critical security features (rate limiting, CSRF) that exist across 100% of PHP controllers. The gaps are systematic, not random - suggesting the ASP.NET implementation was built from high-level requirements rather than detailed PHP source analysis.
