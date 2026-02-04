# Phase 15: Search - Implementation Plan

**Created:** 2026-02-02
**Status:** ✅ COMPLETE

---

## Frozen Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Migrations** | No migration for v1 | Existing B-tree indexes sufficient; add pg_trgm later only if ILIKE proves slow |
| **User.avatar_url / User.bio** | Always return `null` | Fields do not exist on User entity; will be added in future User Profile phase |
| **Event status field** | Return `"active"` for all results | Cancelled events excluded by filter (`IsCancelled = false`); all returned events are active |
| **Limit exceeds max** | Return `400 Bad Request` | Per frozen contract (2026-02-02) |
| **Pagination when total=0** | `pages` = 0 | Per frozen contract (2026-02-02) |
| **Skills filter** | Removed from v1 | Per frozen contract (2026-02-02) |

---

## Overview

| Item | Value |
|------|-------|
| Endpoints | 3 (`/api/search`, `/api/search/suggestions`, `/api/members`) |
| New Entities | 0 (query existing tables) |
| New Migrations | 0 (use existing indexes) |
| Estimated Test Cases | 41 (per PHASE15_EXECUTION.md) |

---

## 1. Data Sources

### Tables/Entities to Query

| Endpoint | Entity | Fields to Search | Filter Conditions |
|----------|--------|------------------|-------------------|
| `/api/search` | `Listing` | `Title`, `Description` | `DeletedAt == null` (via global filter) |
| `/api/search` | `User` | `FirstName`, `LastName` | `IsActive == true` |
| `/api/search` | `Group` | `Name`, `Description` | (none - all groups) |
| `/api/search` | `Event` | `Title`, `Description`, `Location` | `IsCancelled == false` |
| `/api/search/suggestions` | Same 4 entities | Same fields | Same filters |
| `/api/members` | `User` | `FirstName`, `LastName` | `IsActive == true` |

### Response Field Mappings

```
Listing -> { id, title, description, type, status, created_at }
User    -> { id, first_name, last_name, avatar_url: null, bio: null }
Group   -> { id, name, description, member_count (computed), is_public (!IsPrivate) }
Event   -> { id, title, description, location, starts_at, status: "active" }
Member  -> { id, first_name, last_name, avatar_url: null, bio: null, created_at }
```

**User fields note:** `avatar_url` and `bio` always return `null`. The User entity does not have these fields. They will be added in a future User Profile phase. Do not implement truncation logic—there is nothing to truncate.

**Event status note:** The Event entity uses `IsCancelled` (boolean), not a Status enum. Since cancelled events are excluded by the query filter, all returned events are active. The `status` field in the response is always `"active"`.

---

## 2. Query Strategy

### Decision: PostgreSQL ILIKE (No External Search)

**Rationale:**
- Dataset size per tenant: ~1000s of records, not millions
- ILIKE with existing B-tree indexes handles this scale
- No dependency on ElasticSearch/Meilisearch
- Consistent with "boring architecture" principle

### EF Core Implementation Pattern

```csharp
// Use EF.Functions.ILike for case-insensitive matching
var listings = await _db.Listings
    .Where(l => EF.Functions.ILike(l.Title, $"%{query}%")
             || EF.Functions.ILike(l.Description ?? "", $"%{query}%"))
    .OrderBy(l => EF.Functions.ILike(l.Title, $"{query}%") ? 0 : 1)
    .ThenByDescending(l => l.CreatedAt)
    .Skip((page - 1) * limit)
    .Take(limit)
    .ToListAsync();
```

---

## 3. Tenant Isolation Strategy

### Already Enforced by EF Core Global Filters

| Entity | Filter (from NexusDbContext.cs) |
|--------|--------------------------------|
| Listing | `TenantId == _tenantContext.TenantId && DeletedAt == null` |
| User | `TenantId == _tenantContext.TenantId` |
| Group | `TenantId == _tenantContext.TenantId` |
| Event | `TenantId == _tenantContext.TenantId` |

**No additional tenant filtering required.** All queries automatically scoped.

---

## 4. Authentication Requirements

| Endpoint | Auth | Implementation |
|----------|------|----------------|
| `GET /api/search` | Required | `[Authorize]` attribute |
| `GET /api/search/suggestions` | Required | `[Authorize]` attribute |
| `GET /api/members` | Required | `[Authorize]` attribute |

No role-based access. Any authenticated user in the tenant can search.

---

## 5. Indexing Plan

### Decision: No New Migration for v1

**Rationale:**
- Existing indexes cover TenantId, primary fields
- B-tree indexes work adequately for ILIKE on small datasets
- pg_trgm extension adds operational complexity
- Performance can be measured post-launch; optimize if needed

**Existing Indexes (Sufficient):**
- `IX_listings_TenantId`
- `IX_users_TenantId_Email` (composite)
- `IX_groups_TenantId`, `IX_groups_Name`
- `IX_events_TenantId`, `IX_events_StartsAt`, `IX_events_IsCancelled`

**Future Optimization (If Needed):**
```sql
-- Only add if ILIKE proves slow on production data
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IX_listings_title_trgm ON listings USING gin(title gin_trgm_ops);
```

---

## 6. Performance Constraints & Guardrails

### Validation Rules (400 Bad Request)

| Parameter | Constraint | Endpoint |
|-----------|-----------|----------|
| `q` | Required, 2-100 chars | `/api/search`, `/api/search/suggestions` |
| `q` | Optional | `/api/members` |
| `type` | Must be: `all`, `listings`, `users`, `groups`, `events` | `/api/search` |
| `page` | >= 1 | All |
| `limit` | 1-50 (return 400 if > 50) | `/api/search`, `/api/members` |
| `limit` | 1-10 (return 400 if > 10) | `/api/search/suggestions` |

### Guardrails

| Guardrail | Implementation |
|-----------|----------------|
| Max results per page | 50 (search/members), 10 (suggestions) |
| Exceeds max limit | Return `400 Bad Request` (not silent cap) |
| Empty results pagination | `pages = 0` when `total = 0` |
| No wildcard-only searches | `q` min 2 chars |

---

## 7. Swagger/OpenAPI Requirements

All three endpoints must appear in Swagger UI with:
- `[Authorize]` security requirement
- Query parameter documentation with min/max constraints
- Example response shapes matching PHASE15_EXECUTION.md
- Error response documentation (400, 401)

---

## 8. Seed Data Requirements

### Existing Seed Data

| Entity | ACME (Tenant 1) | Globex (Tenant 2) |
|--------|-----------------|-------------------|
| Users | Alice (1), Charlie (3) | Bob (2) |
| Listings | Home Repair (1), Garden Weeding (3), Bike Repair (4) | Language Tutoring (2), Cooking Classes (5) |
| Groups | None | None |
| Events | None | None |

### Additional Seed Data Needed

```csharp
// Groups for ACME tenant
new Group { Id = 1, TenantId = 1, Name = "Community Gardeners", Description = "Garden enthusiasts", IsPrivate = false, CreatedById = 1 },
new Group { Id = 2, TenantId = 1, Name = "Home Repair Network", Description = "DIY and repair help", IsPrivate = false, CreatedById = 1 },

// Events for ACME tenant
new Event { Id = 1, TenantId = 1, Title = "Gardening Workshop", Description = "Learn garden basics", Location = "Community Center", StartsAt = DateTime.UtcNow.AddDays(7), IsCancelled = false, CreatedById = 1 },
new Event { Id = 2, TenantId = 1, Title = "Repair Meetup", Description = "Fix things together", Location = "Makerspace", StartsAt = DateTime.UtcNow.AddDays(14), IsCancelled = false, CreatedById = 3 },

// Groups for Globex tenant
new Group { Id = 3, TenantId = 2, Name = "Language Exchange", Description = "Practice languages", IsPrivate = false, CreatedById = 2 },

// Events for Globex tenant
new Event { Id = 3, TenantId = 2, Title = "Cooking Class", Description = "Learn to cook", Location = "Kitchen", StartsAt = DateTime.UtcNow.AddDays(7), IsCancelled = false, CreatedById = 2 },
```

Reset sequences after seeding:
```csharp
await db.Database.ExecuteSqlRawAsync("SELECT setval(pg_get_serial_sequence('groups', 'Id'), (SELECT MAX(\"Id\") FROM groups))");
await db.Database.ExecuteSqlRawAsync("SELECT setval(pg_get_serial_sequence('events', 'Id'), (SELECT MAX(\"Id\") FROM events))");
```

---

## 9. Implementation Checklist

### Phase 15A: DTOs & Validation (Gate: Compiles)

- [ ] Create `SearchController.cs` with route `[Route("api/search")]`
- [ ] Create `MembersController.cs` with route `[Route("api/members")]`
- [ ] Create DTOs:
  - [ ] `UnifiedSearchResultDto` (listings, users, groups, events, pagination)
  - [ ] `SearchSuggestionDto` (text, type, id)
  - [ ] `MemberDirectoryResultDto` (data, pagination)
  - [ ] `PaginationDto` (page, limit, total, pages)
  - [ ] `SearchListingDto`, `SearchUserDto`, `SearchGroupDto`, `SearchEventDto`
  - [ ] `MemberDto` (id, first_name, last_name, avatar_url, bio, created_at)
- [ ] Create query parameter classes with validation attributes

### Phase 15B: GET /api/search (Gate: Tests 2.1-2.17 pass)

- [ ] Implement unified search endpoint
- [ ] Query all 4 entity types with ILIKE
- [ ] Apply type filter (all/listings/users/groups/events)
- [ ] Apply pagination; compute `pages = total == 0 ? 0 : (int)Math.Ceiling((double)total / limit)`
- [ ] Compute `member_count` for groups via `.Include(g => g.Members)`
- [ ] Map `is_public` from `!IsPrivate`
- [ ] Event `status` always `"active"` (cancelled excluded by filter)
- [ ] User `avatar_url` and `bio` always `null`
- [ ] Validation: q required, 2-100 chars -> 400 if invalid
- [ ] Validation: type enum -> 400 if invalid
- [ ] Validation: page >= 1 -> 400 if invalid
- [ ] Validation: limit 1-50 -> 400 if > 50

### Phase 15C: GET /api/search/suggestions (Gate: Tests 3.1-3.9 pass)

- [ ] Implement suggestions endpoint
- [ ] Return flat JSON array (not object)
- [ ] Validation: limit 1-10 -> 400 if > 10
- [ ] Each item: `{ text, type, id }`
- [ ] Search across all 4 types, return mixed results
- [ ] Sort by relevance (prefix match first)

### Phase 15D: GET /api/members (Gate: Tests 4.1-4.15 pass)

- [ ] Implement member directory endpoint
- [ ] Optional `q` filter on first/last name (ILIKE)
- [ ] Empty `q` returns all members (paginated)
- [ ] Filter `IsActive == true`
- [ ] `avatar_url` and `bio` always `null`
- [ ] Validation: page >= 1 -> 400 if invalid
- [ ] Validation: limit 1-50 -> 400 if > 50

### Phase 15E: Seed Data & Integration (Gate: All 41 tests pass)

- [ ] Add Groups seed data (2 ACME, 1 Globex)
- [ ] Add Events seed data (2 ACME, 1 Globex)
- [ ] Reset sequences for groups/events tables
- [ ] Run full Swagger test suite per PHASE15_EXECUTION.md

### Phase 15F: Documentation (Gate: Done)

- [ ] Mark all DoD checkboxes in PHASE15_EXECUTION.md
- [ ] Update ROADMAP.md Phase 15 status to COMPLETE
- [ ] Update FRONTEND_INTEGRATION.md to remove "NOT IMPLEMENTED" notice

---

## 10. Acceptance Gates

| Gate | Criteria | Verified By |
|------|----------|-------------|
| **A** | Project compiles, DTOs created | `dotnet build` |
| **B** | Tests 2.1-2.17 pass (search) | Swagger UI |
| **C** | Tests 3.1-3.9 pass (suggestions) | Swagger UI |
| **D** | Tests 4.1-4.15 pass (members) | Swagger UI |
| **E** | All 41 tests pass | Swagger UI |
| **F** | Docs updated | Manual review |

---

## 11. Files to Create/Modify

### New Files

```
src/Nexus.Api/
  Controllers/
    SearchController.cs
    MembersController.cs
  Dtos/
    SearchDtos.cs
```

### Modified Files

```
src/Nexus.Api/
  Data/
    SeedData.cs  (add Groups, Events)
```

### No Migration Files

Existing indexes sufficient for v1.

---

## 12. Consistency with PHASE15_EXECUTION.md

| Item | PHASE15_EXECUTION.md | Implementation Plan |
|------|---------------------|---------------------|
| User bio example | `null` | Return `null` always |
| User avatar_url example | `null` | Return `null` always |
| Event status | Excluded if cancelled | Filter `IsCancelled = false`; return `status: "active"` |
| Limit > max behavior | 400 Bad Request | Validate and return 400 |
| pages when total=0 | `pages = 0` | `pages = 0` |
| Migrations | Not specified | None for v1 |

---

## Related Documents

- [PHASE15_EXECUTION.md](./PHASE15_EXECUTION.md) - Swagger UI test plan (41 tests)
- [ROADMAP.md](./ROADMAP.md) - Phase 15 contract and rules
- [FRONTEND_INTEGRATION.md](./FRONTEND_INTEGRATION.md) - Frontend integration guide
