# Phase 15: Search - Swagger UI Test Plan

**Last Updated:** 2026-02-02

---

## 1. Preconditions

### Environment URLs

| Environment | Base URL | Swagger UI |
|-------------|----------|------------|
| Development (Docker) | `http://localhost:5080` | `http://localhost:5080/swagger` |
| Production | `https://api.project-nexus.net` | N/A (Swagger disabled) |

### Start Development Environment

```powershell
docker compose up -d
```

### Test Credentials

| Email | Password | Tenant Slug | Tenant ID | Role |
|-------|----------|-------------|-----------|------|
| admin@acme.test | Test123! | acme | 1 | admin |
| member@acme.test | Test123! | acme | 1 | member |
| admin@globex.test | Test123! | globex | 2 | admin |

### Obtaining a JWT Token

1. Open Swagger UI at `http://localhost:5080/swagger`
2. Find `POST /api/auth/login`
3. Click "Try it out"
4. Enter request body:
   ```json
   {
     "email": "admin@acme.test",
     "password": "Test123!",
     "tenant_slug": "acme"
   }
   ```
5. Click "Execute"
6. Copy `access_token` from response
7. Click "Authorize" button (top right)
8. Enter: `Bearer <paste-token-here>`
9. Click "Authorize" then "Close"

All subsequent requests will include the JWT.

### Seed Data Reference

**ACME Tenant (ID: 1):**
- Users: Alice Admin (ID: 1), Charlie Contributor (ID: 3)
- Listings: "Home Repair Assistance" (ID: 1), "Garden Weeding Services" (ID: 3), "Bike Repair" (ID: 4)
- Groups: "Community Gardeners" (ID: 1), "Home Repair Network" (ID: 2)
- Events: "Gardening Workshop" (ID: 1), "Repair Meetup" (ID: 2)

**Globex Tenant (ID: 2):**
- Users: Bob Admin (ID: 2)
- Listings: "Language Tutoring" (ID: 2), "Cooking Classes" (ID: 5)
- Groups: "Language Exchange" (ID: 3)
- Events: "Cooking Class" (ID: 3)

---

## 2. Endpoint: GET /api/search

### Expected Response Shape

```json
{
  "listings": [
    {
      "id": 3,
      "title": "Garden Weeding Services",
      "description": "Professional garden maintenance...",
      "type": "offer",
      "status": "active",
      "created_at": "2026-01-20T10:00:00Z"
    }
  ],
  "users": [
    {
      "id": 1,
      "first_name": "Alice",
      "last_name": "Admin",
      "avatar_url": null,
      "bio": null
    }
  ],
  "groups": [],
  "events": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 2,
    "pages": 1
  }
}
```

### Test 2.1: Happy Path - Search All Types

**Precondition:** Logged in as `admin@acme.test`

| Field | Value |
|-------|-------|
| q | `garden` |
| type | *(leave empty)* |
| page | *(leave empty)* |
| limit | *(leave empty)* |

**Expected Result:**
- Status: `200 OK`
- `listings` array contains "Garden Weeding Services"
- `users`, `groups`, `events` arrays present (may be empty)
- `pagination.page` = 1
- `pagination.limit` = 20

---

### Test 2.2: Happy Path - Filter by Type (listings only)

**Precondition:** Logged in as `admin@acme.test`

| Field | Value |
|-------|-------|
| q | `repair` |
| type | `listings` |

**Expected Result:**
- Status: `200 OK`
- `listings` array contains "Home Repair Assistance" and/or "Bike Repair"
- `users` array is empty `[]`
- `groups` array is empty `[]`
- `events` array is empty `[]`

---

### Test 2.3: Happy Path - Filter by Type (users only)

**Precondition:** Logged in as `admin@acme.test`

| Field | Value |
|-------|-------|
| q | `alice` |
| type | `users` |

**Expected Result:**
- Status: `200 OK`
- `users` array contains Alice Admin
- `listings`, `groups`, `events` arrays are empty

---

### Test 2.4: Happy Path - Case Insensitive Search

**Precondition:** Logged in as `admin@acme.test`

| Field | Value |
|-------|-------|
| q | `GARDEN` |
| type | `all` |

**Expected Result:**
- Status: `200 OK`
- Same results as searching for `garden` (lowercase)
- Confirms ILIKE case-insensitive matching

---

### Test 2.5: Validation - Missing q Parameter

**Precondition:** Logged in as `admin@acme.test`

| Field | Value |
|-------|-------|
| q | *(leave empty)* |

**Expected Result:**
- Status: `400 Bad Request`
- Error message: `"Search query is required"` or similar

---

### Test 2.6: Validation - q Too Short (1 character)

**Precondition:** Logged in as `admin@acme.test`

| Field | Value |
|-------|-------|
| q | `a` |

**Expected Result:**
- Status: `400 Bad Request`
- Error message: `"Search query must be at least 2 characters"`

---

### Test 2.7: Validation - q Too Long (101+ characters)

**Precondition:** Logged in as `admin@acme.test`

| Field | Value |
|-------|-------|
| q | `aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa` (101 a's) |

**Expected Result:**
- Status: `400 Bad Request`
- Error message: `"Search query must not exceed 100 characters"`

---

### Test 2.8: Validation - Invalid Type Filter

**Precondition:** Logged in as `admin@acme.test`

| Field | Value |
|-------|-------|
| q | `test` |
| type | `invalid` |

**Expected Result:**
- Status: `400 Bad Request`
- Error message: `"Invalid type filter"` or `"type must be one of: all, listings, users, groups, events"`

---

### Test 2.9: Validation - Limit Too High

**Precondition:** Logged in as `admin@acme.test`

| Field | Value |
|-------|-------|
| q | `test` |
| limit | `100` |

**Expected Result:**
- Status: `400 Bad Request`
- Error message: `"Limit must not exceed 50"`

---

### Test 2.10: Validation - Invalid Page (0 or negative)

**Precondition:** Logged in as `admin@acme.test`

| Field | Value |
|-------|-------|
| q | `test` |
| page | `0` |

**Expected Result:**
- Status: `400 Bad Request`
- Error message: `"Page must be at least 1"`

---

### Test 2.11: Tenant Isolation - ACME Cannot See Globex

**Precondition:** Logged in as `admin@acme.test`

| Field | Value |
|-------|-------|
| q | `tutoring` |
| type | `listings` |

**Expected Result:**
- Status: `200 OK`
- `listings` array is empty `[]` (Globex's "Language Tutoring" not visible)
- `pagination.total` = 0

---

### Test 2.12: Tenant Isolation - Globex Cannot See ACME

**Precondition:** Logged in as `admin@globex.test`

| Field | Value |
|-------|-------|
| q | `garden` |
| type | `all` |

**Expected Result:**
- Status: `200 OK`
- All arrays empty (ACME's "Garden Weeding Services" not visible)
- `pagination.total` = 0

---

### Test 2.13: Pagination - Page 1 with Limit 1

**Precondition:** Logged in as `admin@acme.test`

| Field | Value |
|-------|-------|
| q | `a` |
| type | `listings` |
| page | `1` |
| limit | `1` |

**Note:** Use `q=re` or similar to match multiple listings

**Expected Result:**
- Status: `200 OK`
- `listings` array contains exactly 1 item
- `pagination.page` = 1
- `pagination.limit` = 1
- `pagination.total` >= 1
- `pagination.pages` = `ceil(total / limit)`

---

### Test 2.14: Pagination - Page 2

**Precondition:** Logged in as `admin@acme.test`, multiple results exist

| Field | Value |
|-------|-------|
| q | `re` |
| type | `listings` |
| page | `2` |
| limit | `1` |

**Expected Result:**
- Status: `200 OK`
- `listings` array contains second result (different from page 1)
- `pagination.page` = 2

---

### Test 2.15: Pagination - Beyond Last Page

**Precondition:** Logged in as `admin@acme.test`

| Field | Value |
|-------|-------|
| q | `garden` |
| page | `999` |
| limit | `20` |

**Expected Result:**
- Status: `200 OK`
- All arrays empty (no results on page 999)
- `pagination.page` = 999
- `pagination.total` = actual count

---

### Test 2.16: No Results Found

**Precondition:** Logged in as `admin@acme.test`

| Field | Value |
|-------|-------|
| q | `xyznonexistent123` |
| type | `all` |

**Expected Result:**
- Status: `200 OK`
- All arrays empty `[]`
- `pagination.total` = 0
- `pagination.pages` = 0

---

### Test 2.17: Unauthorized - No Token

**Precondition:** Click "Authorize" > "Logout" to remove token

| Field | Value |
|-------|-------|
| q | `test` |

**Expected Result:**
- Status: `401 Unauthorized`

---

## 3. Endpoint: GET /api/search/suggestions

### Expected Response Shape

```json
[
  { "text": "Garden Weeding Services", "type": "listings", "id": 3 },
  { "text": "Gardening Group", "type": "groups", "id": 2 }
]
```

**Note:** Response is a flat array, not an object.

---

### Test 3.1: Happy Path - Basic Suggestions

**Precondition:** Logged in as `admin@acme.test`

| Field | Value |
|-------|-------|
| q | `gar` |
| limit | *(leave empty)* |

**Expected Result:**
- Status: `200 OK`
- Array of 0-5 suggestions
- Each item has `text`, `type`, `id` fields
- `type` is one of: `listings`, `users`, `groups`, `events`

---

### Test 3.2: Happy Path - Custom Limit

**Precondition:** Logged in as `admin@acme.test`

| Field | Value |
|-------|-------|
| q | `re` |
| limit | `3` |

**Expected Result:**
- Status: `200 OK`
- Array of max 3 suggestions

---

### Test 3.3: Happy Path - Limit 1

**Precondition:** Logged in as `admin@acme.test`

| Field | Value |
|-------|-------|
| q | `repair` |
| limit | `1` |

**Expected Result:**
- Status: `200 OK`
- Array of exactly 1 suggestion (if matches exist)

---

### Test 3.4: Validation - Missing q Parameter

**Precondition:** Logged in as `admin@acme.test`

| Field | Value |
|-------|-------|
| q | *(leave empty)* |

**Expected Result:**
- Status: `400 Bad Request`
- Error message about missing query

---

### Test 3.5: Validation - q Too Short

**Precondition:** Logged in as `admin@acme.test`

| Field | Value |
|-------|-------|
| q | `a` |

**Expected Result:**
- Status: `400 Bad Request`
- Error message: `"Search query must be at least 2 characters"`

---

### Test 3.6: Validation - Limit Too High

**Precondition:** Logged in as `admin@acme.test`

| Field | Value |
|-------|-------|
| q | `test` |
| limit | `20` |

**Expected Result:**
- Status: `400 Bad Request`
- Error message: `"Limit must not exceed 10"`

---

### Test 3.7: Tenant Isolation

**Precondition:** Logged in as `admin@acme.test`

| Field | Value |
|-------|-------|
| q | `tutor` |

**Expected Result:**
- Status: `200 OK`
- Empty array `[]` (Globex's "Language Tutoring" not visible)

---

### Test 3.8: No Results

**Precondition:** Logged in as `admin@acme.test`

| Field | Value |
|-------|-------|
| q | `xyznonexistent` |

**Expected Result:**
- Status: `200 OK`
- Empty array `[]`

---

### Test 3.9: Unauthorized - No Token

**Precondition:** Remove JWT token

| Field | Value |
|-------|-------|
| q | `test` |

**Expected Result:**
- Status: `401 Unauthorized`

---

## 4. Endpoint: GET /api/members

### Expected Response Shape

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
    "total": 2,
    "pages": 1
  }
}
```

**Note:** `avatar_url` and `bio` are always `null` until User Profile phase adds these fields to the User entity.

---

### Test 4.1: Happy Path - No Filters (All Members)

**Precondition:** Logged in as `admin@acme.test`

| Field | Value |
|-------|-------|
| q | *(leave empty)* |
| page | *(leave empty)* |
| limit | *(leave empty)* |

**Expected Result:**
- Status: `200 OK`
- `data` array contains all ACME tenant users (Alice, Charlie)
- Does NOT contain Globex users (Bob)
- `pagination.total` = 2 (or actual ACME user count)

---

### Test 4.2: Happy Path - Search by First Name

**Precondition:** Logged in as `admin@acme.test`

| Field | Value |
|-------|-------|
| q | `alice` |

**Expected Result:**
- Status: `200 OK`
- `data` array contains only Alice Admin
- `pagination.total` = 1

---

### Test 4.3: Happy Path - Search by Last Name

**Precondition:** Logged in as `admin@acme.test`

| Field | Value |
|-------|-------|
| q | `contributor` |

**Expected Result:**
- Status: `200 OK`
- `data` array contains only Charlie Contributor
- `pagination.total` = 1

---

### Test 4.4: Happy Path - Case Insensitive Name Search

**Precondition:** Logged in as `admin@acme.test`

| Field | Value |
|-------|-------|
| q | `ALICE` |

**Expected Result:**
- Status: `200 OK`
- `data` array contains Alice Admin
- Confirms case-insensitive matching

---

### Test 4.5: Happy Path - Partial Name Match

**Precondition:** Logged in as `admin@acme.test`

| Field | Value |
|-------|-------|
| q | `ali` |

**Expected Result:**
- Status: `200 OK`
- `data` array contains Alice Admin
- Confirms partial matching (ILIKE `%ali%`)

---

### Test 4.6: Validation - Limit Too High

**Precondition:** Logged in as `admin@acme.test`

| Field | Value |
|-------|-------|
| limit | `100` |

**Expected Result:**
- Status: `400 Bad Request`
- Error message: `"Limit must not exceed 50"`

---

### Test 4.7: Validation - Invalid Page

**Precondition:** Logged in as `admin@acme.test`

| Field | Value |
|-------|-------|
| page | `-1` |

**Expected Result:**
- Status: `400 Bad Request`
- Error message: `"Page must be at least 1"`

---

### Test 4.8: Tenant Isolation - ACME Cannot See Globex Members

**Precondition:** Logged in as `admin@acme.test`

| Field | Value |
|-------|-------|
| q | `bob` |

**Expected Result:**
- Status: `200 OK`
- `data` array is empty `[]` (Globex's Bob not visible)
- `pagination.total` = 0

---

### Test 4.9: Tenant Isolation - Globex Sees Only Globex

**Precondition:** Logged in as `admin@globex.test`

| Field | Value |
|-------|-------|
| q | *(leave empty)* |

**Expected Result:**
- Status: `200 OK`
- `data` array contains only Bob Admin
- Does NOT contain Alice or Charlie
- `pagination.total` = 1

---

### Test 4.10: Pagination - Page 1 Limit 1

**Precondition:** Logged in as `admin@acme.test`

| Field | Value |
|-------|-------|
| page | `1` |
| limit | `1` |

**Expected Result:**
- Status: `200 OK`
- `data` array contains exactly 1 member
- `pagination.page` = 1
- `pagination.limit` = 1
- `pagination.total` = 2 (ACME has 2 users)
- `pagination.pages` = 2

---

### Test 4.11: Pagination - Page 2 Limit 1

**Precondition:** Logged in as `admin@acme.test`

| Field | Value |
|-------|-------|
| page | `2` |
| limit | `1` |

**Expected Result:**
- Status: `200 OK`
- `data` array contains 1 member (different from page 1)
- `pagination.page` = 2

---

### Test 4.12: Pagination - Beyond Last Page

**Precondition:** Logged in as `admin@acme.test`

| Field | Value |
|-------|-------|
| page | `999` |
| limit | `20` |

**Expected Result:**
- Status: `200 OK`
- `data` array is empty `[]`
- `pagination.page` = 999
- `pagination.total` = 2

---

### Test 4.13: No Results - Name Not Found

**Precondition:** Logged in as `admin@acme.test`

| Field | Value |
|-------|-------|
| q | `xyznonexistent` |

**Expected Result:**
- Status: `200 OK`
- `data` array is empty `[]`
- `pagination.total` = 0

---

### Test 4.14: Inactive Users Excluded

**Note:** Requires an inactive user in seed data to verify. If no inactive users exist, skip this test.

**Precondition:** Logged in as `admin@acme.test`, inactive user exists

| Field | Value |
|-------|-------|
| q | *(inactive user's name)* |

**Expected Result:**
- Status: `200 OK`
- Inactive user NOT in results

---

### Test 4.15: Unauthorized - No Token

**Precondition:** Remove JWT token

| Field | Value |
|-------|-------|
| *(any)* | *(any)* |

**Expected Result:**
- Status: `401 Unauthorized`

---

## 5. Response Shape Verification Checklist

Use this checklist to verify each endpoint returns the correct JSON structure.

### GET /api/search

- [ ] Response has `listings` array
- [ ] Response has `users` array
- [ ] Response has `groups` array
- [ ] Response has `events` array
- [ ] Response has `pagination` object
- [ ] `pagination` has `page`, `limit`, `total`, `pages` fields
- [ ] Each listing has: `id`, `title`, `description`, `type`, `status`, `created_at`
- [ ] Each user has: `id`, `first_name`, `last_name`, `avatar_url`, `bio`
- [ ] Each group has: `id`, `name`, `description`, `member_count`, `is_public`
- [ ] Each event has: `id`, `title`, `description`, `location`, `starts_at`, `status`

### GET /api/search/suggestions

- [ ] Response is a JSON array (not object)
- [ ] Each suggestion has `text` (string)
- [ ] Each suggestion has `type` (string: listings|users|groups|events)
- [ ] Each suggestion has `id` (integer)

### GET /api/members

- [ ] Response has `data` array
- [ ] Response has `pagination` object
- [ ] `pagination` has `page`, `limit`, `total`, `pages` fields
- [ ] Each member has: `id`, `first_name`, `last_name`, `avatar_url`, `bio`, `created_at`
- [ ] `avatar_url` and `bio` are `null` (fields not yet on User entity)

---

## 6. Definition of Done Checklist

### Implementation

- [ ] `GET /api/search` endpoint implemented
- [ ] `GET /api/search/suggestions` endpoint implemented
- [ ] `GET /api/members` endpoint implemented
- [ ] DTOs created: `UnifiedSearchResultDto`, `SearchSuggestionDto`, `MemberDirectoryDto`

### Validation

- [ ] `q` parameter min 2 chars enforced (400 if shorter)
- [ ] `q` parameter max 100 chars enforced (400 if longer)
- [ ] `type` filter validated (400 for invalid values)
- [ ] `page` must be >= 1 (400 for 0 or negative)
- [ ] `limit` capped at 50 for search, 10 for suggestions
- [ ] Empty `q` on `/api/members` returns all members

### Search Behavior

- [ ] Case-insensitive matching (ILIKE) works
- [ ] Partial matching works (e.g., "gar" matches "garden")
- [ ] Type filter correctly limits result arrays

### Tenant Isolation

- [ ] ACME user cannot see Globex data
- [ ] Globex user cannot see ACME data
- [ ] All EF Core queries use tenant-scoped filters

### Data Filtering

- [ ] Soft-deleted listings excluded (DeletedAt IS NULL)
- [ ] Inactive users excluded (IsActive = true)
- [ ] Cancelled events excluded (IsCancelled = false)

### Pagination

- [ ] `page` and `limit` parameters work
- [ ] `pagination` object in response is accurate
- [ ] Beyond-last-page returns empty array (not error)

### Tests Passing

- [ ] All Test 2.x (search) pass
- [ ] All Test 3.x (suggestions) pass
- [ ] All Test 4.x (members) pass

### Documentation

- [ ] PHASE15_EXECUTION.md complete (this file)
- [ ] ROADMAP.md Phase 15 marked as COMPLETE
- [ ] FRONTEND_INTEGRATION.md updated with Phase 15 status

---

## 7. Quick Reference - Copy/Paste Values

### Valid Search Queries

```
garden
repair
alice
bike
weeding
home
```

### Invalid Search Queries (for validation tests)

```
a                   (too short - 1 char)
ab                  (minimum valid - 2 chars)
<101 character string>  (too long)
```

### Type Filter Values

```
all         (default)
listings
users
groups
events
invalid     (should return 400)
```

### Pagination Values

```
page=1&limit=20     (defaults)
page=1&limit=1      (minimum per page)
page=1&limit=50     (maximum per page)
page=999&limit=20   (beyond last page)
page=0&limit=20     (invalid - should 400)
limit=100           (over max - returns 400)
```

---

## 8. Endpoints Summary

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/search | Yes | Unified search (?q=term&type=all&page=1&limit=20) |
| GET | /api/search/suggestions | Yes | Autocomplete (?q=term&limit=5) |
| GET | /api/members | Yes | Member directory (?q=name&page=1&limit=20) |

**Total new endpoints: 3**
