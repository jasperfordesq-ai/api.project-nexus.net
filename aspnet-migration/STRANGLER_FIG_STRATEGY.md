# Strangler Fig Migration Strategy - Project NEXUS

## Overview

The **Strangler Fig Pattern** allows incremental migration from PHP to ASP.NET Core without a "big bang" rewrite. Both systems run simultaneously, sharing the same database, with traffic gradually shifted endpoint by endpoint.

```
┌─────────────────────────────────────────────────────────────────┐
│                        Load Balancer / Reverse Proxy            │
│                              (nginx / IIS ARR)                  │
└─────────────────────┬───────────────────────────────┬───────────┘
                      │                               │
                      ▼                               ▼
┌─────────────────────────────────┐   ┌─────────────────────────────┐
│         ASP.NET Core API        │   │         PHP Application      │
│         (New endpoints)         │   │      (Legacy endpoints)      │
│                                 │   │                               │
│  ┌───────────────────────────┐  │   │  ┌───────────────────────┐   │
│  │ /api/v2/listings     ✓   │  │   │  │ /api/social/...       │   │
│  │ /api/v2/auth         ✓   │  │   │  │ /api/wallet/...       │   │
│  │ /api/v2/users        ✓   │  │   │  │ /api/notifications/.. │   │
│  └───────────────────────────┘  │   │  └───────────────────────┘   │
│                                 │   │                               │
│  PhpProxyMiddleware for        │   │                               │
│  unmigrated routes ───────────►│   │                               │
└─────────────────────────────────┘   └─────────────────────────────┘
                      │                               │
                      └───────────────┬───────────────┘
                                      │
                                      ▼
                    ┌─────────────────────────────────┐
                    │          MySQL Database          │
                    │         (Shared by both)         │
                    └─────────────────────────────────┘
```

---

## Phase 0: Foundation (Week 1-2)

### Goals
- Set up ASP.NET Core solution structure
- Configure database connection to existing MySQL
- Scaffold EF Core entities from existing schema
- Set up development environment parity

### Tasks

#### 0.1 Create Solution Structure
```bash
# Create solution and projects
dotnet new sln -n Nexus
dotnet new webapi -n Nexus.Api -o src/Nexus.Api
dotnet new classlib -n Nexus.Application -o src/Nexus.Application
dotnet new classlib -n Nexus.Domain -o src/Nexus.Domain
dotnet new classlib -n Nexus.Infrastructure -o src/Nexus.Infrastructure
dotnet new classlib -n Nexus.Shared -o src/Nexus.Shared

# Add to solution
dotnet sln add src/Nexus.Api
dotnet sln add src/Nexus.Application
dotnet sln add src/Nexus.Domain
dotnet sln add src/Nexus.Infrastructure
dotnet sln add src/Nexus.Shared
```

#### 0.2 Scaffold Database Entities
```bash
# Install EF Core tools
dotnet tool install --global dotnet-ef

# Scaffold from existing database
cd src/Nexus.Infrastructure
dotnet ef dbcontext scaffold \
  "Server=localhost;Database=nexus;User=root;Password=xxx" \
  Pomelo.EntityFrameworkCore.MySql \
  --context NexusDbContext \
  --context-dir Persistence \
  --output-dir ../Nexus.Domain/Entities \
  --force
```

#### 0.3 Configure Multi-Tenant Query Filters
```csharp
// NexusDbContext.cs
protected override void OnModelCreating(ModelBuilder modelBuilder)
{
    // Apply tenant filter to all tenant-scoped entities
    modelBuilder.Entity<User>()
        .HasQueryFilter(u => u.TenantId == _currentTenant.TenantId);

    modelBuilder.Entity<Listing>()
        .HasQueryFilter(l => l.TenantId == _currentTenant.TenantId);

    // ... repeat for all tenant-scoped entities
}
```

#### 0.4 Set Up Proxy Middleware
```csharp
// PhpProxyMiddleware.cs
public class PhpProxyMiddleware
{
    private readonly RequestDelegate _next;
    private readonly HttpClient _httpClient;
    private readonly string _phpBaseUrl;

    public PhpProxyMiddleware(RequestDelegate next, IConfiguration config)
    {
        _next = next;
        _phpBaseUrl = config["PhpApi:BaseUrl"]; // e.g., "http://localhost:8080"
        _httpClient = new HttpClient();
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var path = context.Request.Path.Value;

        // Check if this endpoint has been migrated
        if (IsMigratedEndpoint(path))
        {
            await _next(context);
            return;
        }

        // Proxy to PHP for unmigrated endpoints
        await ProxyToPhp(context);
    }

    private bool IsMigratedEndpoint(string path)
    {
        // Maintain list of migrated endpoints
        var migratedPaths = new[]
        {
            "/api/v2/listings",
            "/api/v2/auth",
            // Add more as they're migrated
        };

        return migratedPaths.Any(p => path.StartsWith(p, StringComparison.OrdinalIgnoreCase));
    }

    private async Task ProxyToPhp(HttpContext context)
    {
        var targetUri = new Uri($"{_phpBaseUrl}{context.Request.Path}{context.Request.QueryString}");

        var requestMessage = new HttpRequestMessage
        {
            Method = new HttpMethod(context.Request.Method),
            RequestUri = targetUri
        };

        // Copy headers
        foreach (var header in context.Request.Headers)
        {
            requestMessage.Headers.TryAddWithoutValidation(header.Key, header.Value.ToArray());
        }

        // Copy body for POST/PUT/PATCH
        if (context.Request.ContentLength > 0)
        {
            requestMessage.Content = new StreamContent(context.Request.Body);
        }

        var response = await _httpClient.SendAsync(requestMessage);

        // Copy response
        context.Response.StatusCode = (int)response.StatusCode;
        foreach (var header in response.Headers)
        {
            context.Response.Headers[header.Key] = header.Value.ToArray();
        }

        await response.Content.CopyToAsync(context.Response.Body);
    }
}
```

---

## Phase 1: Authentication (Week 3-4)

### Why Start Here?
- Foundation for all other endpoints
- Self-contained module
- High test coverage possible
- Critical for mobile app support

### Endpoints to Migrate
| Priority | PHP Endpoint | ASP.NET Endpoint | Status |
|----------|--------------|------------------|--------|
| 1 | `POST /api/auth/login` | `POST /api/v2/auth/login` | ⬜ |
| 2 | `POST /api/auth/refresh-token` | `POST /api/v2/auth/refresh` | ⬜ |
| 3 | `GET /api/auth/validate-token` | `GET /api/v2/auth/validate` | ⬜ |
| 4 | `POST /api/auth/logout` | `POST /api/v2/auth/logout` | ⬜ |
| 5 | `GET /api/auth/csrf-token` | `GET /api/v2/auth/csrf` | ⬜ |
| 6 | `POST /api/v2/auth/register` | `POST /api/v2/auth/register` | ⬜ |
| 7 | `POST /api/auth/forgot-password` | `POST /api/v2/auth/forgot-password` | ⬜ |
| 8 | `POST /api/auth/reset-password` | `POST /api/v2/auth/reset-password` | ⬜ |

### Implementation Notes

#### JWT Token Compatibility
The ASP.NET JWT must be compatible with existing PHP-issued tokens:
```csharp
// Use same signing key from PHP APP_KEY
var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(
    configuration["Jwt:Secret"])); // Same as PHP JWT_SECRET

// Match PHP token structure
var claims = new[]
{
    new Claim("user_id", userId.ToString()),
    new Claim("tenant_id", tenantId.ToString()),
    new Claim("role", userRole),
    new Claim("platform", isMobile ? "mobile" : "web"),
    new Claim(JwtRegisteredClaimNames.Iat, DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString()),
    new Claim(JwtRegisteredClaimNames.Exp, expiry.ToUnixTimeSeconds().ToString()),
};
```

#### Token Expiration Strategy (Match PHP)
```csharp
// Mobile apps: 1 year access, 5 years refresh
// Web apps: 2 hours access, 2 years refresh
var accessExpiry = isMobile
    ? TimeSpan.FromDays(365)
    : TimeSpan.FromHours(2);

var refreshExpiry = isMobile
    ? TimeSpan.FromDays(365 * 5)
    : TimeSpan.FromDays(365 * 2);
```

#### Rate Limiting (Match PHP)
```csharp
// Login: 5 attempts per 15 minutes
builder.Services.AddRateLimiter(options =>
{
    options.AddFixedWindowLimiter("login", opt =>
    {
        opt.Window = TimeSpan.FromMinutes(15);
        opt.PermitLimit = 5;
    });
});
```

### Validation Criteria
- [ ] Existing mobile app tokens work with new endpoint
- [ ] New .NET tokens work with PHP endpoints (during transition)
- [ ] Rate limiting matches PHP behavior
- [ ] 2FA flow unchanged
- [ ] WebAuthn credentials work
- [ ] Session restore works

---

## Phase 2: Users & Profiles (Week 5-6)

### Endpoints to Migrate
| Priority | PHP Endpoint | ASP.NET Endpoint | Status |
|----------|--------------|------------------|--------|
| 1 | `GET /api/v2/users/me` | `GET /api/v2/users/me` | ⬜ |
| 2 | `PUT /api/v2/users/me` | `PUT /api/v2/users/me` | ⬜ |
| 3 | `PUT /api/v2/users/me/preferences` | `PUT /api/v2/users/me/preferences` | ⬜ |
| 4 | `PUT /api/v2/users/me/avatar` | `PUT /api/v2/users/me/avatar` | ⬜ |
| 5 | `PUT /api/v2/users/me/password` | `PUT /api/v2/users/me/password` | ⬜ |
| 6 | `GET /api/v2/users/{id}` | `GET /api/v2/users/{id}` | ⬜ |

### Implementation Notes
- Image upload must use same storage paths as PHP
- Avatar URLs must remain compatible
- Notification preferences JSON structure must match

---

## Phase 3: Listings (Week 7-8)

### Endpoints to Migrate
| Priority | PHP Endpoint | ASP.NET Endpoint | Status |
|----------|--------------|------------------|--------|
| 1 | `GET /api/v2/listings` | `GET /api/v2/listings` | ⬜ |
| 2 | `GET /api/v2/listings/{id}` | `GET /api/v2/listings/{id}` | ⬜ |
| 3 | `POST /api/v2/listings` | `POST /api/v2/listings` | ⬜ |
| 4 | `PUT /api/v2/listings/{id}` | `PUT /api/v2/listings/{id}` | ⬜ |
| 5 | `DELETE /api/v2/listings/{id}` | `DELETE /api/v2/listings/{id}` | ⬜ |
| 6 | `GET /api/v2/listings/nearby` | `GET /api/v2/listings/nearby` | ⬜ |
| 7 | `POST /api/v2/listings/{id}/image` | `POST /api/v2/listings/{id}/image` | ⬜ |

### Implementation Notes
- Geolocation queries must match PHP behavior
- Cursor pagination format must be compatible
- Search/filter parameters must match

---

## Phase 4: Wallet & Transactions (Week 9-10)

### Endpoints to Migrate
| Priority | PHP Endpoint | ASP.NET Endpoint | Status |
|----------|--------------|------------------|--------|
| 1 | `GET /api/v2/wallet/balance` | `GET /api/v2/wallet/balance` | ⬜ |
| 2 | `GET /api/v2/wallet/transactions` | `GET /api/v2/wallet/transactions` | ⬜ |
| 3 | `POST /api/v2/wallet/transfer` | `POST /api/v2/wallet/transfer` | ⬜ |
| 4 | `GET /api/v2/wallet/transactions/{id}` | `GET /api/v2/wallet/transactions/{id}` | ⬜ |
| 5 | `DELETE /api/v2/wallet/transactions/{id}` | `DELETE /api/v2/wallet/transactions/{id}` | ⬜ |
| 6 | `GET /api/v2/wallet/user-search` | `GET /api/v2/wallet/user-search` | ⬜ |

### Implementation Notes
- **CRITICAL**: Transaction integrity must match PHP
- Gamification side effects must trigger correctly
- Federation support for cross-tenant transfers

---

## Phase 5: Messaging (Week 11-12)

### Endpoints to Migrate
| Priority | PHP Endpoint | ASP.NET Endpoint | Status |
|----------|--------------|------------------|--------|
| 1 | `GET /api/v2/messages` | `GET /api/v2/messages` | ⬜ |
| 2 | `GET /api/v2/messages/{id}` | `GET /api/v2/messages/{id}` | ⬜ |
| 3 | `POST /api/v2/messages` | `POST /api/v2/messages` | ⬜ |
| 4 | `PUT /api/v2/messages/{id}/read` | `PUT /api/v2/messages/{id}/read` | ⬜ |
| 5 | `DELETE /api/v2/messages/{id}` | `DELETE /api/v2/messages/{id}` | ⬜ |
| 6 | `GET /api/v2/messages/unread-count` | `GET /api/v2/messages/unread-count` | ⬜ |
| 7 | `POST /api/v2/messages/typing` | `POST /api/v2/messages/typing` | ⬜ |

### Implementation Notes
- Pusher real-time events must match PHP channel structure
- Voice message upload must use same storage

---

## Phase 6: Groups & Events (Week 13-16)

### Groups Endpoints
| Priority | PHP Endpoint | ASP.NET Endpoint | Status |
|----------|--------------|------------------|--------|
| 1 | `GET /api/v2/groups` | `GET /api/v2/groups` | ⬜ |
| 2 | `GET /api/v2/groups/{id}` | `GET /api/v2/groups/{id}` | ⬜ |
| 3 | `POST /api/v2/groups` | `POST /api/v2/groups` | ⬜ |
| ... | (20+ endpoints) | ... | ⬜ |

### Events Endpoints
| Priority | PHP Endpoint | ASP.NET Endpoint | Status |
|----------|--------------|------------------|--------|
| 1 | `GET /api/v2/events` | `GET /api/v2/events` | ⬜ |
| 2 | `GET /api/v2/events/{id}` | `GET /api/v2/events/{id}` | ⬜ |
| ... | (10+ endpoints) | ... | ⬜ |

---

## Phase 7: Feed & Social (Week 17-18)

### Endpoints to Migrate
| Priority | PHP Endpoint | ASP.NET Endpoint | Status |
|----------|--------------|------------------|--------|
| 1 | `GET /api/v2/feed` | `GET /api/v2/feed` | ⬜ |
| 2 | `POST /api/v2/feed/posts` | `POST /api/v2/feed/posts` | ⬜ |
| 3 | `POST /api/v2/feed/like` | `POST /api/v2/feed/like` | ⬜ |
| 4 | `POST /api/social/comments` | `POST /api/v2/feed/comments` | ⬜ |
| ... | | | |

---

## Phase 8: Gamification (Week 19-20)

### Endpoints to Migrate
| Priority | PHP Endpoint | ASP.NET Endpoint | Status |
|----------|--------------|------------------|--------|
| 1 | `GET /api/v2/gamification/profile` | `GET /api/v2/gamification/profile` | ⬜ |
| 2 | `GET /api/v2/gamification/badges` | `GET /api/v2/gamification/badges` | ⬜ |
| 3 | `GET /api/v2/gamification/leaderboard` | `GET /api/v2/gamification/leaderboard` | ⬜ |
| ... | (15+ endpoints) | ... | ⬜ |

---

## Phase 9: Notifications & Push (Week 21-22)

### Endpoints to Migrate
- Notification CRUD
- Push subscription management
- Real-time polling

---

## Phase 10: Remaining Modules (Week 23-28)

- Volunteering (30 endpoints)
- Polls & Goals (15 endpoints)
- Reviews & Connections (12 endpoints)
- Search (2 endpoints)
- Federation (12 endpoints)
- Admin APIs (100+ endpoints)

---

## Testing Strategy

### 1. Contract Testing
```csharp
// Verify ASP.NET response matches PHP response
[Fact]
public async Task GetListings_MatchesPhpResponse()
{
    // Call PHP endpoint
    var phpResponse = await _phpClient.GetAsync("/api/v2/listings");
    var phpData = await phpResponse.Content.ReadAsStringAsync();

    // Call ASP.NET endpoint
    var dotnetResponse = await _client.GetAsync("/api/v2/listings");
    var dotnetData = await dotnetResponse.Content.ReadAsStringAsync();

    // Compare structure (not exact values)
    JsonAssert.StructureEquals(phpData, dotnetData);
}
```

### 2. Shadow Traffic
```csharp
// Send request to both systems, compare responses
public class ShadowTrafficMiddleware
{
    public async Task InvokeAsync(HttpContext context)
    {
        // Process request normally
        await _next(context);

        // If migrated endpoint, also send to PHP and compare
        if (IsMigrated(context.Request.Path) && IsReadRequest(context.Request))
        {
            var phpResponse = await SendToPhp(context.Request);
            await CompareAndLog(context.Response, phpResponse);
        }
    }
}
```

### 3. Feature Flags
```csharp
// Gradual rollout per tenant
if (await _featureManager.IsEnabledAsync("DotNetListingsApi", tenantId))
{
    return await _listingsService.GetListingsAsync(query);
}
else
{
    return await _phpProxy.ForwardAsync(context);
}
```

---

## Rollback Strategy

### Per-Endpoint Rollback
```csharp
// appsettings.json
{
  "MigratedEndpoints": {
    "/api/v2/listings": true,
    "/api/v2/auth": true,
    "/api/v2/users": false  // Rolled back
  }
}
```

### Full Rollback
1. Update reverse proxy to route all traffic to PHP
2. Keep ASP.NET Core running but not receiving traffic
3. Fix issues
4. Gradually re-enable

---

## Success Criteria

### Per-Phase Completion Checklist
- [ ] All endpoints migrated and tested
- [ ] Response format matches PHP exactly
- [ ] Error codes and messages match
- [ ] Rate limiting behavior matches
- [ ] Authentication/authorization identical
- [ ] Real-time events (Pusher) working
- [ ] Mobile app compatibility verified
- [ ] Performance equal or better
- [ ] No data integrity issues

### Final Migration Completion
- [ ] All 400+ endpoints migrated
- [ ] PHP application decommissioned
- [ ] Database cleaned of PHP-specific artifacts
- [ ] Mobile apps updated (if needed)
- [ ] Web frontend updated (if needed)
- [ ] Documentation updated
- [ ] Team trained on new codebase

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Data corruption | Read-only endpoints first; extensive testing before writes |
| Token incompatibility | Same JWT signing key; bi-directional token validation tests |
| Performance regression | Load testing before each phase; APM monitoring |
| Real-time breaks | Maintain same Pusher channel structure; test with mobile app |
| Rollback complexity | Feature flags per endpoint; instant rollback capability |
| Team velocity | Start with well-understood modules (Auth, Listings) |

---

## Timeline Summary

| Phase | Module | Duration | Endpoints |
|-------|--------|----------|-----------|
| 0 | Foundation | 2 weeks | Infrastructure |
| 1 | Authentication | 2 weeks | 8 endpoints |
| 2 | Users | 2 weeks | 6 endpoints |
| 3 | Listings | 2 weeks | 7 endpoints |
| 4 | Wallet | 2 weeks | 6 endpoints |
| 5 | Messaging | 2 weeks | 7 endpoints |
| 6 | Groups & Events | 4 weeks | 35 endpoints |
| 7 | Feed & Social | 2 weeks | 15 endpoints |
| 8 | Gamification | 2 weeks | 25 endpoints |
| 9 | Notifications | 2 weeks | 18 endpoints |
| 10 | Remaining | 6 weeks | 273+ endpoints |
| **Total** | | **28 weeks** | **400+ endpoints** |

Estimated completion: **7 months** with a small team (2-3 developers)
