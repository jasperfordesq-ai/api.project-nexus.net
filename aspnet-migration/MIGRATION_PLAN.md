# Project NEXUS - PHP to ASP.NET Core Migration Plan

## Executive Summary

This document outlines a comprehensive migration strategy from the existing PHP codebase to ASP.NET Core 8, supporting two separate frontends (GOV.UK and GOV.IE design systems) using the strangler fig pattern for incremental migration.

### Current State
- **Platform**: PHP 8.1+ with custom MVC framework
- **Database**: MySQL 8.0 with 236 tables
- **API Endpoints**: 400+ endpoints across V1 and V2
- **Authentication**: Hybrid session + JWT token system
- **Features**: Multi-tenant, federation, gamification, real-time

### Target State
- **Platform**: ASP.NET Core 8 with Clean Architecture
- **Database**: Same MySQL 8.0 (shared during migration)
- **ORM**: Entity Framework Core with Pomelo MySQL provider
- **API**: Versioned REST API with full backward compatibility
- **Design Systems**: GOV.UK Frontend + GOV.IE (via abstraction layer)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              Clients                                     │
│    ┌─────────────┐    ┌─────────────┐    ┌─────────────────────────┐   │
│    │   Web App   │    │ Mobile App  │    │  Third-Party (Fed API)  │   │
│    │  (GOV.UK/IE)│    │ (Capacitor) │    │                         │   │
│    └──────┬──────┘    └──────┬──────┘    └───────────┬─────────────┘   │
└───────────┼──────────────────┼───────────────────────┼─────────────────┘
            │                  │                       │
            └──────────────────┼───────────────────────┘
                               │
┌──────────────────────────────┼──────────────────────────────────────────┐
│                    API Gateway / Reverse Proxy                          │
│                        (nginx / YARP / IIS ARR)                         │
│                                                                         │
│  Route Decision:                                                        │
│  ├── Migrated endpoints → ASP.NET Core                                 │
│  └── Unmigrated endpoints → PHP (via proxy)                            │
└──────────────────────────────┼──────────────────────────────────────────┘
                               │
         ┌─────────────────────┴─────────────────────┐
         │                                           │
         ▼                                           ▼
┌─────────────────────────┐           ┌─────────────────────────┐
│    ASP.NET Core 8       │           │       PHP 8.1           │
│                         │           │                         │
│  ┌───────────────────┐  │           │  ┌───────────────────┐  │
│  │ Nexus.Api         │  │           │  │ src/Controllers/  │  │
│  │ (Controllers)     │  │           │  │                   │  │
│  └─────────┬─────────┘  │           │  └─────────┬─────────┘  │
│            │            │           │            │            │
│  ┌─────────▼─────────┐  │           │  ┌─────────▼─────────┐  │
│  │ Nexus.Application │  │           │  │ src/Services/     │  │
│  │ (Business Logic)  │  │           │  │                   │  │
│  └─────────┬─────────┘  │           │  └─────────┬─────────┘  │
│            │            │           │            │            │
│  ┌─────────▼─────────┐  │           │  ┌─────────▼─────────┐  │
│  │ Nexus.Infra       │  │           │  │ src/Models/       │  │
│  │ (EF Core)         │  │           │  │ (PDO)             │  │
│  └─────────┬─────────┘  │           │  └─────────┬─────────┘  │
└────────────┼────────────┘           └────────────┼────────────┘
             │                                     │
             └──────────────┬──────────────────────┘
                            │
                            ▼
              ┌─────────────────────────┐
              │      MySQL 8.0          │
              │    (Shared Database)    │
              │                         │
              │  236 tables             │
              │  Multi-tenant           │
              │  Full-text search       │
              └─────────────────────────┘
```

---

## Design System Strategy (GOV.UK & GOV.IE)

### Abstraction Layer

```csharp
// IDesignSystem interface allows switching between GOV.UK and GOV.IE
public interface IDesignSystem
{
    string SystemName { get; }
    string CssFrameworkPath { get; }
    string JsFrameworkPath { get; }

    IButtonComponent Button { get; }
    IInputComponent Input { get; }
    IFormComponent Form { get; }
    IErrorSummaryComponent ErrorSummary { get; }
    // ... other components
}

// GOV.UK Implementation
public class GovUKDesignSystem : IDesignSystem
{
    public string SystemName => "GOV.UK";
    public string CssFrameworkPath => "/govuk-frontend/govuk-frontend.min.css";
    // ...
}

// GOV.IE Implementation (future)
public class GovIEDesignSystem : IDesignSystem
{
    public string SystemName => "GOV.IE";
    public string CssFrameworkPath => "/govie-frontend/govie-frontend.min.css";
    // ...
}
```

### Selection Logic
```csharp
// Design system selected per tenant
services.AddScoped<IDesignSystem>(sp =>
{
    var tenant = sp.GetRequiredService<ICurrentTenantService>();
    return tenant.DesignSystem switch
    {
        "govie" => sp.GetRequiredService<GovIEDesignSystem>(),
        _ => sp.GetRequiredService<GovUKDesignSystem>()
    };
});
```

---

## API Endpoint Inventory

### Authentication Module (18 endpoints)
| Endpoint | Method | PHP Handler | Priority |
|----------|--------|-------------|----------|
| `/api/auth/login` | POST | AuthController::login | P0 |
| `/api/auth/refresh-token` | POST | AuthController::refreshToken | P0 |
| `/api/auth/validate-token` | GET/POST | AuthController::validateToken | P0 |
| `/api/auth/logout` | POST | AuthController::logout | P0 |
| `/api/auth/csrf-token` | GET | AuthController::getCsrfToken | P0 |
| `/api/v2/auth/register` | POST | RegistrationApiController::register | P1 |
| `/api/auth/forgot-password` | POST | PasswordResetApiController::forgotPassword | P1 |
| `/api/auth/reset-password` | POST | PasswordResetApiController::resetPassword | P1 |
| `/api/auth/verify-email` | POST | EmailVerificationApiController::verifyEmail | P1 |
| `/api/auth/resend-verification` | POST | EmailVerificationApiController::resendVerification | P1 |
| `/api/totp/verify` | POST | TotpApiController::verify | P2 |
| `/api/totp/status` | GET | TotpApiController::status | P2 |
| `/api/webauthn/register-challenge` | POST | WebAuthnApiController::registerChallenge | P2 |
| `/api/webauthn/register-verify` | POST | WebAuthnApiController::registerVerify | P2 |
| `/api/webauthn/auth-challenge` | POST | WebAuthnApiController::authChallenge | P2 |
| `/api/webauthn/auth-verify` | POST | WebAuthnApiController::authVerify | P2 |
| `/api/webauthn/credentials` | GET | WebAuthnApiController::credentials | P2 |
| `/api/webauthn/remove` | POST | WebAuthnApiController::remove | P2 |

### Listings Module (8 endpoints)
| Endpoint | Method | PHP Handler | Priority |
|----------|--------|-------------|----------|
| `/api/v2/listings` | GET | ListingsApiController::index | P0 |
| `/api/v2/listings/{id}` | GET | ListingsApiController::show | P0 |
| `/api/v2/listings` | POST | ListingsApiController::store | P1 |
| `/api/v2/listings/{id}` | PUT | ListingsApiController::update | P1 |
| `/api/v2/listings/{id}` | DELETE | ListingsApiController::destroy | P1 |
| `/api/v2/listings/nearby` | GET | ListingsApiController::nearby | P2 |
| `/api/v2/listings/{id}/image` | POST | ListingsApiController::uploadImage | P2 |

### Users Module (6 endpoints)
| Endpoint | Method | PHP Handler | Priority |
|----------|--------|-------------|----------|
| `/api/v2/users/me` | GET | UsersApiController::me | P0 |
| `/api/v2/users/me` | PUT | UsersApiController::update | P1 |
| `/api/v2/users/me/preferences` | PUT | UsersApiController::updatePreferences | P1 |
| `/api/v2/users/me/avatar` | PUT | UsersApiController::updateAvatar | P2 |
| `/api/v2/users/me/password` | PUT | UsersApiController::updatePassword | P1 |
| `/api/v2/users/{id}` | GET | UsersApiController::show | P1 |

### Wallet Module (6 endpoints)
| Endpoint | Method | PHP Handler | Priority |
|----------|--------|-------------|----------|
| `/api/v2/wallet/balance` | GET | WalletApiController::balanceV2 | P0 |
| `/api/v2/wallet/transactions` | GET | WalletApiController::transactionsV2 | P0 |
| `/api/v2/wallet/transfer` | POST | WalletApiController::transferV2 | P0 |
| `/api/v2/wallet/transactions/{id}` | GET | WalletApiController::showTransaction | P1 |
| `/api/v2/wallet/transactions/{id}` | DELETE | WalletApiController::destroyTransaction | P2 |
| `/api/v2/wallet/user-search` | GET | WalletApiController::userSearchV2 | P1 |

### Messages Module (8 endpoints)
| Endpoint | Method | PHP Handler | Priority |
|----------|--------|-------------|----------|
| `/api/v2/messages` | GET | MessagesApiController::conversations | P0 |
| `/api/v2/messages/{id}` | GET | MessagesApiController::show | P0 |
| `/api/v2/messages` | POST | MessagesApiController::send | P0 |
| `/api/v2/messages/{id}/read` | PUT | MessagesApiController::markRead | P1 |
| `/api/v2/messages/{id}` | DELETE | MessagesApiController::archive | P2 |
| `/api/v2/messages/unread-count` | GET | MessagesApiController::unreadCount | P1 |
| `/api/v2/messages/typing` | POST | MessagesApiController::typing | P2 |
| `/api/v2/messages/upload-voice` | POST | MessagesApiController::uploadVoice | P3 |

### Additional Modules (350+ endpoints)
- **Events**: 10 endpoints
- **Groups**: 25 endpoints
- **Connections**: 6 endpoints
- **Feed/Social**: 30 endpoints
- **Notifications**: 15 endpoints
- **Reviews**: 7 endpoints
- **Search**: 2 endpoints
- **Polls**: 6 endpoints
- **Goals**: 8 endpoints
- **Gamification**: 25 endpoints
- **Volunteering**: 30 endpoints
- **Push Notifications**: 10 endpoints
- **Federation**: 12 endpoints
- **Admin APIs**: 100+ endpoints

---

## Database Schema Summary

### Table Categories

| Category | Table Count | Key Tables |
|----------|-------------|------------|
| Core/Tenants | 5 | tenants, tenant_settings, tenant_features |
| Users/Auth | 15 | users, refresh_tokens, revoked_tokens, webauthn_credentials, login_attempts |
| Listings | 5 | listings, categories, listing_views, listing_images |
| Wallet | 4 | transactions, wallet_adjustments |
| Social | 10 | feed_posts, comments, likes, shares, mentions |
| Messaging | 5 | messages, conversations, message_reactions |
| Groups | 12 | groups, group_members, group_discussions, group_messages |
| Events | 5 | events, event_rsvps, event_reminders |
| Connections | 3 | connections, blocked_users |
| Gamification | 25 | badges, user_badges, user_xp_log, challenges, seasons, rewards |
| Volunteering | 15 | volunteer_opportunities, volunteer_applications, volunteer_shifts, volunteer_hours |
| Notifications | 5 | notifications, push_subscriptions, device_tokens |
| Federation | 19 | federation_partners, federation_api_keys, federation_transactions |
| Compliance | 15 | gdpr_requests, cookie_consents, legal_acceptances, audit_logs |
| Admin | 20 | admin_users, permissions, roles, menu_items |

### Critical Relationships

```sql
-- Tenant hierarchy (self-referencing)
tenants.parent_id → tenants.id

-- User-tenant relationship
users.tenant_id → tenants.id

-- All content scoped by tenant
listings.tenant_id → tenants.id
transactions.tenant_id → tenants.id
feed_posts.tenant_id → tenants.id
-- (repeated for all content tables)

-- Transaction participants
transactions.sender_id → users.id
transactions.receiver_id → users.id

-- Group membership
group_members.group_id → groups.id
group_members.user_id → users.id

-- Polymorphic relationships
likes.entity_type + likes.entity_id → (posts, comments, etc.)
notifications.entity_type + notifications.entity_id → (various)
```

---

## Migration Phases

### Phase 0: Foundation (2 weeks)
**Objective**: Set up infrastructure without serving traffic

- [ ] Create ASP.NET Core solution structure
- [ ] Configure Entity Framework Core with MySQL
- [ ] Scaffold entities from existing schema
- [ ] Implement multi-tenant context service
- [ ] Set up authentication (JWT compatible with PHP)
- [ ] Create PHP proxy middleware
- [ ] Set up CI/CD pipeline
- [ ] Configure staging environment

**Deliverables**:
- Working .NET project that connects to MySQL
- JWT tokens interoperable with PHP
- Proxy middleware routing all traffic to PHP
- Deployment pipeline

### Phase 1: Authentication (2 weeks)
**Objective**: Full authentication parity

- [ ] Implement login endpoint
- [ ] Implement token refresh
- [ ] Implement token validation
- [ ] Implement logout (with revocation)
- [ ] Implement CSRF token endpoint
- [ ] Rate limiting matching PHP behavior
- [ ] Shadow traffic testing

**Validation**:
- Mobile app works with new tokens
- Existing PHP-issued tokens still valid
- Rate limiting prevents brute force
- Token revocation works

### Phase 2: Users & Profiles (2 weeks)
**Objective**: User profile management

- [ ] GET /api/v2/users/me
- [ ] PUT /api/v2/users/me
- [ ] PUT /api/v2/users/me/preferences
- [ ] PUT /api/v2/users/me/avatar
- [ ] PUT /api/v2/users/me/password
- [ ] GET /api/v2/users/{id}

**Validation**:
- Profile data matches PHP responses
- Image upload uses same storage
- Password change works

### Phase 3: Listings (2 weeks)
**Objective**: Marketplace core functionality

- [ ] GET /api/v2/listings (with pagination)
- [ ] GET /api/v2/listings/{id}
- [ ] POST /api/v2/listings
- [ ] PUT /api/v2/listings/{id}
- [ ] DELETE /api/v2/listings/{id}
- [ ] GET /api/v2/listings/nearby
- [ ] POST /api/v2/listings/{id}/image

**Validation**:
- Pagination cursor compatible
- Geolocation queries work
- Image upload works

### Phase 4: Wallet & Transactions (2 weeks)
**Objective**: Time credit system

- [ ] GET /api/v2/wallet/balance
- [ ] GET /api/v2/wallet/transactions
- [ ] POST /api/v2/wallet/transfer
- [ ] GET /api/v2/wallet/transactions/{id}
- [ ] DELETE /api/v2/wallet/transactions/{id}
- [ ] GET /api/v2/wallet/user-search

**Validation**:
- Balance calculations match
- Transactions atomic
- Gamification side effects trigger
- Federation transfers work

### Phase 5: Messaging (2 weeks)
**Objective**: Private messaging system

- [ ] GET /api/v2/messages
- [ ] GET /api/v2/messages/{id}
- [ ] POST /api/v2/messages
- [ ] PUT /api/v2/messages/{id}/read
- [ ] DELETE /api/v2/messages/{id}
- [ ] GET /api/v2/messages/unread-count
- [ ] POST /api/v2/messages/typing

**Validation**:
- Conversation threading works
- Pusher events fire correctly
- Voice messages work

### Phase 6: Groups & Events (4 weeks)
**Objective**: Community features

- [ ] Groups CRUD (5 endpoints)
- [ ] Group membership (5 endpoints)
- [ ] Group discussions (5 endpoints)
- [ ] Events CRUD (5 endpoints)
- [ ] Event RSVPs (4 endpoints)

**Validation**:
- Privacy settings work
- Admin permissions work
- Real-time updates work

### Phase 7: Feed & Social (2 weeks)
**Objective**: Social feed system

- [ ] GET /api/v2/feed
- [ ] POST /api/v2/feed/posts
- [ ] Like/Comment/Share endpoints
- [ ] Hide/Mute/Report endpoints

**Validation**:
- Feed algorithm matches
- Reactions work
- Mentions work

### Phase 8: Gamification (2 weeks)
**Objective**: XP, badges, leaderboards

- [ ] GET /api/v2/gamification/profile
- [ ] GET /api/v2/gamification/badges
- [ ] GET /api/v2/gamification/leaderboard
- [ ] Daily rewards
- [ ] Shop
- [ ] Challenges

**Validation**:
- XP calculations match
- Badge criteria work
- Leaderboard rankings correct

### Phase 9: Notifications & Push (2 weeks)
**Objective**: Alert system

- [ ] GET /api/v2/notifications
- [ ] Mark read endpoints
- [ ] Push subscription endpoints
- [ ] Real-time polling

**Validation**:
- Push notifications work
- In-app notifications work
- Digest emails work

### Phase 10: Remaining Features (6 weeks)
**Objective**: Complete migration

- [ ] Volunteering module
- [ ] Polls & Goals
- [ ] Reviews & Connections
- [ ] Search
- [ ] Federation API
- [ ] Admin APIs

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| JWT token incompatibility | Medium | High | Use same signing key; test thoroughly |
| Database connection issues | Low | High | Test EF Core queries against PHP results |
| Performance regression | Medium | Medium | Load testing before each phase |
| Real-time breaks | Medium | High | Maintain Pusher channel structure |
| Mobile app incompatibility | Low | High | Contract testing; shadow traffic |
| Data corruption | Low | Critical | Read-only endpoints first; extensive testing |
| Rollback complexity | Medium | Medium | Feature flags per endpoint |

---

## Success Metrics

### Per-Phase
- API response parity: 100% matching structure
- Performance: P95 latency ≤ PHP latency
- Error rate: < 0.1% difference from PHP
- Test coverage: > 80% for migrated code

### Final
- All 400+ endpoints migrated
- Zero data integrity issues
- Mobile app fully functional
- < 5ms average latency increase
- Zero unplanned downtime

---

## Team Requirements

### Recommended Team
- 2 Senior .NET developers
- 1 PHP developer (for reference/support)
- 1 QA engineer
- 1 DevOps engineer (part-time)

### Timeline
- **Estimated Duration**: 7 months (28 weeks)
- **Parallel Tracks**: Backend migration + Frontend updates

---

## Next Steps

1. **Immediate**: Review and approve this plan
2. **Week 1**: Set up development environment
3. **Week 2**: Create solution structure, scaffold entities
4. **Week 3**: Begin Phase 1 (Authentication)

---

## Appendices

- [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) - Detailed ASP.NET Core project structure
- [STRANGLER_FIG_STRATEGY.md](STRANGLER_FIG_STRATEGY.md) - Incremental migration strategy
- [ENTITY_MAPPING.md](ENTITY_MAPPING.md) - PHP to C# entity mapping
- [API_INVENTORY.md](API_INVENTORY.md) - Complete endpoint list (generated by analysis)
