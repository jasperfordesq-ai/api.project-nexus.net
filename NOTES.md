# Project NEXUS - Decision Log & Notes

## Current Phase: Phase 11 (Future)

---

## Phase 10 Checklist (COMPLETED)

- [x] Notification entity with tenant isolation
- [x] EF Core configuration with global query filter
- [x] GET /api/notifications (list with pagination)
- [x] GET /api/notifications/unread-count
- [x] GET /api/notifications/{id}
- [x] PUT /api/notifications/{id}/read (mark as read)
- [x] PUT /api/notifications/read-all (mark all as read)
- [x] DELETE /api/notifications/{id}
- [x] Automatic notifications on connection request
- [x] Automatic notifications on connection accepted
- [x] Cross-tenant isolation verified
- [x] All manual tests passing (see PHASE10_EXECUTION.md)

---

## Phase 9 Checklist (COMPLETED)

- [x] Connection entity with tenant isolation
- [x] EF Core configuration with global query filter
- [x] GET /api/connections (list all connections)
- [x] GET /api/connections/pending (incoming + outgoing)
- [x] POST /api/connections (send request)
- [x] PUT /api/connections/{id}/accept (accept request)
- [x] PUT /api/connections/{id}/decline (decline request)
- [x] DELETE /api/connections/{id} (remove/cancel)
- [x] Mutual request auto-accept
- [x] Cannot connect to yourself validation
- [x] Cannot duplicate connection validation
- [x] Cross-tenant isolation verified
- [x] All manual tests passing (see PHASE9_EXECUTION.md)

---

## Phase 8 Checklist (COMPLETED)

- [x] RefreshToken entity with tenant isolation
- [x] PasswordResetToken entity with tenant isolation
- [x] POST /api/auth/logout (revoke tokens)
- [x] POST /api/auth/refresh (token rotation)
- [x] POST /api/auth/register (new user registration)
- [x] POST /api/auth/forgot-password (request reset)
- [x] POST /api/auth/reset-password (confirm reset)
- [x] Refresh token rotation for security
- [x] Password reset invalidates all sessions
- [ ] Email sending (deferred - requires email service)
- [x] All manual tests passing (see PHASE8_EXECUTION.md)

---

## Previous Phase: Phase 8 (Authentication Enhancements)

### Phase 0: Trust Establishment - COMPLETED ✓

Started: 2026-02-02
Completed: 2026-02-02

### Phase 1: Listings READ API - COMPLETED ✓

Started: 2026-02-02
Completed: 2026-02-02

### Phase 2: User Profile Update - COMPLETED ✓

Started: 2026-02-02
Completed: 2026-02-02

### Phase 3: Listings WRITE - COMPLETED ✓

Started: 2026-02-02
Completed: 2026-02-02

### Phase 4: Wallet READ - COMPLETED ✓

Started: 2026-02-02
Completed: 2026-02-02

---

## Decisions

### D001: PostgreSQL as Primary Database

**Date:** 2026-02-02
**Status:** Decided
**Context:** The legacy PHP system uses MySQL/MariaDB. We need to choose a database for the new backend.
**Decision:** Use PostgreSQL for the new backend.
**Rationale:**
- Clean break from legacy - no temptation to share databases
- Better support for advanced features (JSONB, arrays, full-text search)
- Excellent EF Core support via Npgsql
- Industry standard for modern .NET applications

**Consequences:**
- Two separate databases during transition period
- Data synchronization will be needed later (out of scope for Phase 0)
- Cannot reuse PHP database schemas directly

---

### D002: Minimal Architecture for Phase 0

**Date:** 2026-02-02
**Status:** Decided
**Context:** The legacy migration documentation includes complex patterns (CQRS, MediatR, Clean Architecture).
**Decision:** Start with the simplest possible architecture that meets Phase 0 objectives.
**Rationale:**
- Prove core concepts before adding complexity
- Avoid premature abstraction
- Easier to debug and understand
- Can add patterns later when justified by actual needs

**What we ARE using:**
- Single Web API project
- EF Core directly in controllers (for now)
- Simple services where needed
- Global query filters for tenant isolation

**What we are NOT using (yet):**
- CQRS / MediatR
- Repository pattern
- Separate Application/Domain/Infrastructure projects
- AutoMapper
- FluentValidation pipeline behaviors

---

### D003: JWT Claim Structure

**Date:** 2026-02-02
**Status:** Decided
**Context:** JWTs must be compatible with the legacy PHP system.
**Decision:** Use the following claim structure:

```json
{
  "sub": "12345",           // user_id as string
  "tenant_id": 2,           // integer
  "role": "member",         // string
  "email": "user@example.com",
  "iat": 1706889600,        // issued at (unix timestamp)
  "exp": 1738425600         // expires at (unix timestamp)
}
```

**Notes:**
- `sub` claim contains user ID (standard JWT practice)
- `tenant_id` is custom claim for multi-tenancy
- Must use same signing key as PHP (HS256)
- Key stored in configuration, never in code

---

### D004: Tenant Resolution Strategy

**Date:** 2026-02-02
**Status:** Decided
**Context:** Need to determine tenant context for every request.
**Decision:** Resolve tenant in the following order:

1. **JWT claim** (`tenant_id`) - for authenticated API requests
2. **X-Tenant-ID header** - for service-to-service calls
3. **Reject** - if neither present, return 400

**Rationale:**
- JWT is the primary source of truth for authenticated users
- Header fallback allows testing and internal calls
- No domain-based routing in Phase 0 (complexity not justified yet)
- Explicit failure is safer than defaulting to a tenant

---

### D005: Login Requires Tenant Identifier

**Date:** 2026-02-02
**Status:** Decided
**Context:** User emails are unique per-tenant, not globally. A login with just email+password is ambiguous.
**Decision:** Login endpoint requires `tenant_slug` or `tenant_id` in addition to email and password.
**Rationale:**
- Emails may exist in multiple tenants (e.g., consultant working with multiple orgs)
- Tenant resolution must happen BEFORE user lookup
- Mirrors how PHP app handles login (tenant context from domain or explicit selection)

**API Contract:**

```json
{
  "email": "user@example.com",
  "password": "secret",
  "tenant_slug": "acme"   // OR "tenant_id": 1
}
```

---

### D006: Tenant Resolution Security Hardening

**Date:** 2026-02-02
**Status:** Decided
**Context:** Initial implementation allowed X-Tenant-ID header to set tenant context for any request.
**Decision:** X-Tenant-ID header is ONLY allowed for unauthenticated requests in Development mode.

**Rationale:**

- Authenticated requests MUST use tenant_id from JWT - header cannot override
- Prevents privilege escalation where user could access another tenant's data
- Development-only header allows testing without valid JWT
- Production never trusts external headers for tenant context

**Security Invariant:** For authenticated requests, tenant context comes ONLY from JWT claims.

---

## Assumptions

### A001: JWT Secret Availability

**Assumption:** The JWT signing secret from the PHP system will be provided via configuration.
**Risk if wrong:** JWTs will not be interoperable.
**Mitigation:** Verify with a real token from PHP before Phase 0 completion.

---

### A002: Tenant IDs Are Integers

**Assumption:** Tenant IDs in the legacy system are integers (not GUIDs or strings).
**Risk if wrong:** Schema mismatch, JWT claim parsing errors.
**Mitigation:** Confirm with legacy database schema.

---

### A003: Single Tenant Per User

**Assumption:** A user belongs to exactly one tenant at a time.
**Risk if wrong:** Authorization logic would need redesign.
**Mitigation:** Verify with legacy data model.

---

## Open Questions

### Q001: Token Expiry Durations

**Question:** What are the exact token expiry durations used by PHP?
**Status:** Open
**Impact:** Must match for seamless interoperability.
**Notes:** Documentation suggests: Web = 2 hours access, Mobile = 1 year access.

---

### Q002: Refresh Token Strategy

**Question:** How are refresh tokens stored and validated in PHP?
**Status:** Open
**Impact:** Affects whether we can validate PHP-issued refresh tokens.
**Notes:** May need to defer refresh token support to later phase.

---

## Phase 0 Checklist (COMPLETED)

- [x] CLAUDE.md created
- [x] NOTES.md created
- [x] Project structure created
- [x] PostgreSQL connection working (Docker on port 5434)
- [x] JWT generation working
- [x] JWT validation working (for PHP-issued tokens)
- [x] Tenant resolution middleware working
- [x] Global query filter working
- [x] One entity with tenant isolation (User)
- [x] Health check endpoint
- [x] Manual verification tests passed (see PHASE0_EXECUTION.md)

---

## Phase 1 Checklist (COMPLETED)

- [x] Listing entity created with tenant isolation
- [x] EF Core configuration with global query filter
- [x] Listings migration generated
- [x] ListingsController with GET endpoints
- [x] Seed data for listings (5 listings across 2 tenants)
- [x] All manual tests passing (see PHASE1_EXECUTION.md)
- [x] Cross-tenant isolation verified

---

## Phase 2 Checklist (COMPLETED)

- [x] PATCH /api/users/me endpoint added
- [x] Validation for first_name and last_name (max 100 chars, no empty strings)
- [x] Returns same shape as GET /api/users/me
- [x] All manual tests passing (see PHASE2_EXECUTION.md)

---

## Phase 3 Checklist (COMPLETED)

- [x] POST /api/listings endpoint added
- [x] PUT /api/listings/{id} endpoint added
- [x] DELETE /api/listings/{id} endpoint added (soft delete)
- [x] Validation: title required, max 255 chars
- [x] Validation: type must be "offer" or "request"
- [x] Owner authorization (only owner can update/delete)
- [x] Cross-tenant isolation (404 for other tenant's listings)
- [x] All manual tests passing (see PHASE3_EXECUTION.md)

---

## Phase 4 Checklist (COMPLETED)

- [x] Transaction entity created with tenant isolation
- [x] EF Core configuration with global query filter
- [x] Transactions migration generated
- [x] WalletController with GET endpoints
- [x] GET /api/wallet/balance (calculated from transactions)
- [x] GET /api/wallet/transactions (with pagination and type filter)
- [x] GET /api/wallet/transactions/{id} (participant check)
- [x] Seed data for transactions (5 transactions across 2 tenants)
- [x] Cross-tenant isolation verified
- [x] All manual tests passing (see PHASE4_EXECUTION.md)

---

## Phase 5 Checklist (COMPLETED)

- [x] POST /api/wallet/transfer endpoint added
- [x] Validate: amount > 0
- [x] Validate: sender != receiver
- [x] Validate: receiver exists in same tenant
- [x] Validate: sender has sufficient balance
- [x] Returns new balance after transfer
- [x] Transaction stored with status "completed"
- [x] Cross-tenant isolation verified
- [x] All manual tests passing (see PHASE5_EXECUTION.md)

---

## Phase 6 Checklist (COMPLETED)

- [x] Conversation and Message entities created with tenant isolation
- [x] EF Core configuration with global query filters
- [x] GET /api/messages (list conversations with last message preview)
- [x] GET /api/messages/{id} (conversation messages with pagination)
- [x] GET /api/messages/unread-count (count of unread messages)
- [x] Participant-only access (non-participants get 404)
- [x] Seed data for 1 conversation with 5 messages
- [x] Cross-tenant isolation verified
- [x] All manual tests passing (see PHASE6_EXECUTION.md)

---

## Phase 7 Checklist (COMPLETED)

- [x] POST /api/messages endpoint (send message, creates conversation if needed)
- [x] PUT /api/messages/{id}/read endpoint (mark all messages in conversation as read)
- [x] Validate: content required, max 5000 characters
- [x] Validate: cannot message yourself
- [x] Validate: recipient must exist in same tenant
- [x] Conversation normalization (smaller participant ID first for uniqueness)
- [x] Cross-tenant isolation verified
- [x] All manual tests passing (see PHASE7_EXECUTION.md)

---

## What is Intentionally NOT Implemented (Phase 0)

This section explicitly documents what is **out of scope** for Phase 0.

### Architectural Patterns (Deferred)

| Pattern | Reason for Exclusion |
|---------|---------------------|
| **CQRS** | Adds complexity without proven need; can add when read/write scaling requirements emerge |
| **MediatR** | Pipeline behaviors not needed yet; direct service calls are simpler to debug |
| **Repository Pattern** | EF Core DbContext already provides unit of work and abstraction |
| **Clean Architecture layers** | Single project is easier to reason about; split when boundaries become clear |
| **AutoMapper** | Manual mapping is explicit and avoids hidden bugs; can add when DTO count grows |
| **FluentValidation** | DataAnnotations sufficient for Phase 0; add pipeline behaviors when validation complexity grows |

### Features (Deferred)

| Feature | Reason for Exclusion |
|---------|---------------------|
| **Refresh tokens** | ✅ Implemented in Phase 8 |
| **2FA / MFA** | Not required for trust establishment |
| **Rate limiting** | Add in Phase 1 when auth is stable |
| **Audit logging** | Add when compliance requirements are clear |
| **Background jobs** | No async processing needs in Phase 0 |
| **Caching (Redis)** | Optimize when needed, not preemptively |
| **Real-time (SignalR/WebSockets)** | Feature scope, not infrastructure scope |
| **File uploads** | Feature scope |
| **Email/SMS notifications** | Feature scope |
| **Search (Elasticsearch)** | Feature scope |
| **API versioning** | Single version for Phase 0 |

### Infrastructure (Deferred)

| Component | Reason for Exclusion |
|-----------|---------------------|
| **Docker for API** | API runs on Kestrel locally; containerize when deployment pipeline is established (PostgreSQL uses Docker) |
| **CI/CD pipelines** | Set up with first production deployment |
| **Kubernetes/orchestration** | Premature; single instance is fine for Phase 0 |
| **Monitoring (APM)** | Built-in logging sufficient; add observability when in production |
| **Database migrations in CI** | Manual migrations acceptable for Phase 0 |

### Integration (Explicitly Out of Scope)

| Integration | Reason for Exclusion |
|-------------|---------------------|
| **PHP proxy (Strangler Fig)** | This backend is independent; no routing from PHP needed yet |
| **Database sharing with PHP** | Separate databases by design (D001) |
| **Data synchronization** | Phase 0 is about proving isolation, not sync |
| **Legacy code migration** | This is a new codebase, not a migration |

### Testing (Minimal for Phase 0)

| Test Type | Status |
|-----------|--------|
| **Unit tests** | Add as code complexity warrants |
| **Integration tests** | One basic test to prove the stack works |
| **E2E tests** | Deferred to Phase 1 |
| **Load tests** | Deferred until performance requirements are defined |

---

## References

- Legacy PHP documentation: `aspnet-migration/` directory (read-only reference)
- JWT spec: RFC 7519
- EF Core global filters: https://learn.microsoft.com/en-us/ef/core/querying/filters
