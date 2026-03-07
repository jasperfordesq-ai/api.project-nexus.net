# Registration Policy Engine — Architecture & Integration Guide

## Overview

The Registration Policy Engine provides tenant-configurable identity-aware registration with pluggable verification providers. Each tenant independently chooses its registration method, verification requirements, and post-registration behavior.

## Architecture

```
                     ┌─────────────────────────┐
                     │  Frontend (React/GOV.UK) │
                     └──────────┬──────────────┘
                                │
            GET /api/registration/config (public)
            POST /api/auth/register
            POST /api/registration/verify/start
            GET  /api/registration/verify/status
                                │
                     ┌──────────▼──────────────┐
                     │     AuthController       │
                     │ RegistrationPolicy Ctrl  │
                     └──────────┬──────────────┘
                                │
                     ┌──────────▼──────────────┐
                     │ RegistrationOrchestrator │ ← State machine driver
                     └──────────┬──────────────┘
                                │
              ┌─────────────────┼─────────────────┐
              │                 │                  │
    ┌─────────▼──────┐ ┌───────▼───────┐ ┌────────▼───────┐
    │  Mock Provider  │ │ Veriff/Jumio  │ │ EUDI/Gov (fut) │
    │ (development)   │ │ (Phase F)     │ │ (placeholder)  │
    └────────────────┘ └───────────────┘ └────────────────┘
```

## User Registration State Machine

```
                      ┌─────────────────┐
                      │ POST /register  │
                      └────────┬────────┘
                               │
                  ┌────────────┴────────────┐
                  │ Read TenantPolicy.Mode  │
                  └────┬─────┬────┬────┬────┘
                       │     │    │    │
            Standard   │     │    │    │ InviteOnly
           ┌───────────┘     │    │    └──────────┐
           │                 │    │               │
           ▼                 │    │               ▼
      ┌─────────┐            │    │         ┌──────────┐
      │ Active  │            │    │         │ Active   │
      └─────────┘            │    │         └──────────┘
                             │    │
              WithApproval   │    │ VerifiedIdentity/GovernmentId
              ┌──────────────┘    └──────────────┐
              │                                   │
              ▼                                   ▼
      ┌───────────────────┐             ┌────────────────────┐
      │ PendingAdminReview│             │ PendingVerification│
      └────────┬──────────┘             └─────────┬──────────┘
               │                                  │
        ┌──────┴──────┐              POST /verify/start
        │             │                           │
    Approve       Reject              ┌───────────▼──────────┐
        │             │               │ Provider Session     │
        ▼             ▼               │ (redirect/SDK/poll)  │
   ┌─────────┐  ┌──────────┐         └───────────┬──────────┘
   │ Active  │  │ Rejected │                      │
   └─────────┘  └──────────┘             Webhook / poll
                                                  │
                                    ┌─────────────┴──────────────┐
                                    │                            │
                              Approved                      Failed
                                    │                            │
                         ┌──────────┴──────────┐        ┌───────▼──────────┐
                         │PostVerificationAction│        │VerificationFailed│
                         └──────┬───┬───┬──────┘        └──────────────────┘
                                │   │   │
                 AutoActivate   │   │   │ AdminApproval
                     ┌──────────┘   │   └──────────────┐
                     │              │                   │
                     ▼        LimitedAccess             ▼
                ┌─────────┐        │         ┌───────────────────┐
                │ Active  │        ▼         │ PendingAdminReview│
                └─────────┘  ┌──────────┐    └───────────────────┘
                             │ Limited  │
                             │ Access   │
                             └──────────┘
```

## API Reference

### Public Endpoints (Anonymous / Authenticated)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/registration/config?tenant_slug=X` | No | Get tenant's public registration config |
| POST | `/api/registration/verify/start` | Yes | Start identity verification session |
| GET | `/api/registration/verify/status` | Yes | Get current verification status |
| POST | `/api/registration/webhook/{tenantId}?provider=X` | No | Provider webhook callback |

### Admin Endpoints (Requires `admin` role)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/registration/admin/policy` | Get full registration policy |
| PUT | `/api/registration/admin/policy` | Update registration policy |
| GET | `/api/registration/admin/pending` | List users pending approval |
| PUT | `/api/registration/admin/users/{id}/approve` | Approve user registration |
| PUT | `/api/registration/admin/users/{id}/reject` | Reject user registration |
| GET | `/api/registration/admin/options` | List available modes/providers/levels |

### Modified Endpoints

| Method | Path | Change |
|--------|------|--------|
| POST | `/api/auth/register` | Now returns `registration_status`, conditional tokens |

## Database Entities

### tenant_registration_policies
One active policy per tenant. Stores registration mode, provider config, verification level, and post-action behavior.

### identity_verification_sessions
Tracks verification sessions between users and providers. Stores status, external IDs, and sanitized decisions. **No raw PII or provider payloads stored.**

### identity_verification_events
Audit trail for every state change in a verification session. Provides complete traceability.

### users (modified)
Added `registration_status` column (`VARCHAR(30)`, default `Active`).

## Frontend Integration Guide

### Registration Flow (Both Frontends)

1. **Before showing registration form**, call `GET /api/registration/config?tenant_slug=X`
2. Based on response:
   - `mode = "Standard"` → show normal form
   - `mode = "StandardWithApproval"` → show form + "Your account will be reviewed" message
   - `mode = "VerifiedIdentity"` → show form + "Identity verification required" message
   - `mode = "GovernmentId"` → show form + gov ID instructions
   - `mode = "InviteOnly"` → show form with invite code field (or hide form + show "registration closed")
3. **Submit** `POST /api/auth/register` with optional `invite_code`
4. Check `registration_status` in response:
   - `"Active"` → use tokens, redirect to dashboard
   - `"PendingAdminReview"` → show "awaiting approval" screen (no tokens)
   - `"PendingVerification"` → use tokens, redirect to verification flow
5. **For verification**: call `POST /api/registration/verify/start`, use `redirect_url` or `sdk_token`
6. **Poll** `GET /api/registration/verify/status` for completion

### Admin Settings UI

Call `GET /api/registration/admin/options` to populate dropdowns with available modes, providers, and levels.

The settings form should:
1. Show a "Registration Method" dropdown (Standard, Standard + Approval, Verified Identity, Government ID, Invite Only)
2. Conditionally show provider/level dropdowns when "Verified Identity" is selected
3. Show invite code field when "Invite Only" is selected
4. Show a registration message textarea for all modes
5. Submit via `PUT /api/registration/admin/policy`

### Admin Approval Queue

Call `GET /api/registration/admin/pending` to show a table of users awaiting approval. Each row has Approve/Reject buttons calling the respective admin endpoints.

## Provider Adapter Pattern

All providers implement `IIdentityVerificationProvider`:

```csharp
public interface IIdentityVerificationProvider
{
    VerificationProvider ProviderType { get; }
    string DisplayName { get; }
    Task<VerificationSessionResult> CreateSessionAsync(...);
    Task<VerificationStatusResult> GetSessionStatusAsync(...);
    Task<VerificationStatusResult?> ProcessWebhookAsync(...);
    bool VerifyWebhookSignature(...);
}
```

Providers support three integration patterns:
- **Redirect**: User is sent to provider's hosted page (`RedirectUrl`)
- **SDK**: Frontend embeds provider's SDK using `SdkToken`
- **Webhook**: Provider calls back to `/api/registration/webhook/{tenantId}?provider=X`

## Phase F — Provider Pilot Recommendation

**Recommended first provider: Stripe Identity**

Rationale:
1. **Global coverage** — available in 30+ countries, growing
2. **Simple integration** — well-documented API, redirect-based flow
3. **Low volume friendly** — pay-per-verification pricing suits community organizations
4. **Existing ecosystem** — many NEXUS tenants may already use Stripe for payments
5. **Webhook support** — standard Stripe webhook signing (HMAC SHA256)
6. **Extensible** — supports document, selfie, and data-match verification levels
7. **Trust framework** — Stripe handles regulatory compliance per jurisdiction

Alternative candidates for specific markets:
- **Yoti** — strong in UK, good for GOV.UK frontend alignment
- **Veriff** — best for European coverage, fast integration
- **Persona** — most configurable, best for custom verification flows

## Risks & Production Rollout Notes

### Migration Risk
- The `users.registration_status` column defaults to `Active`, so all existing users are unaffected
- The system returns Standard behavior when no `TenantRegistrationPolicy` exists for a tenant
- **No breaking changes** to the existing `/api/auth/register` contract — new fields are additive

### Security Considerations
- Provider API keys stored in `ProviderConfigEncrypted` — **TODO**: implement AES encryption before production with real providers
- Webhook signature verification is provider-specific and mandatory for real providers
- Rate limiting applied to webhook endpoint
- No raw provider payloads stored in the database

### Future Work
- Encrypt `ProviderConfigEncrypted` field with AES-256 (currently stores plaintext for Mock)
- Implement Stripe Identity provider adapter
- Add email notifications for status changes (PendingAdminReview, Approved, Rejected)
- Add EUDI wallet / verifiable credential support when standards stabilize
- Add re-verification flow for expired/revoked verifications
- Add EF Core migration (currently schema changes need `dotnet ef migrations add RegistrationPolicyEngine`)

### EF Migration Command
```bash
docker compose exec api dotnet ef migrations add RegistrationPolicyEngine
docker compose exec api dotnet ef database update
```
