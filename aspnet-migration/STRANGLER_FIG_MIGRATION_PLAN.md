# Strangler-Fig Migration Plan: PHP to ASP.NET Core 8

**Date:** February 2, 2026
**Status:** Phase 0 Planning

---

## 1. Recommended Deployment Topology

### Single Server (Development/Staging)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           NGINX (Reverse Proxy)                              │
│                              :80 / :443                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌─────────────────────┐    ┌─────────────────────┐                        │
│   │   /api/v3/*         │    │   /api/* (legacy)   │                        │
│   │   /health           │    │   /admin            │                        │
│   │         ↓           │    │   /* (pages)        │                        │
│   │  ASP.NET Core API   │    │         ↓           │                        │
│   │     :5000           │    │      PHP-FPM        │                        │
│   │   (Kestrel)         │    │       :9000         │                        │
│   └─────────────────────┘    └─────────────────────┘                        │
│                                                                              │
│   ┌─────────────────────┐    ┌─────────────────────┐                        │
│   │   GOV.UK Frontend   │    │   GOV.IE Frontend   │                        │
│   │   (Nunjucks/Node)   │    │   (React SPA)       │                        │
│   │      :3000          │    │      :3001          │                        │
│   └─────────────────────┘    └─────────────────────┘                        │
│                                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                         Shared Services                                      │
│   ┌──────────┐  ┌──────────┐  ┌───────────┐  ┌──────────┐                  │
│   │  MySQL   │  │  Redis   │  │ Meilisearch│  │  Pusher  │                  │
│   │   :3306  │  │   :6379  │  │   :7700   │  │ (Cloud)  │                  │
│   └──────────┘  └──────────┘  └───────────┘  └──────────┘                  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Production (Multi-Server Recommended)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        Load Balancer (Cloudflare/Traefik)                    │
│                              :443 (TLS termination)                          │
└────────────────────────────────┬────────────────────────────────────────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   API Server    │    │  Frontend A     │    │  Frontend B     │
│  (ASP.NET Core) │    │  (GOV.UK/Node)  │    │  (GOV.IE/React) │
│   api.nexus.ie  │    │  civic.nexus.ie │    │  app.nexus.ie   │
│   3x replicas   │    │   2x replicas   │    │   2x replicas   │
└────────┬────────┘    └────────┬────────┘    └────────┬────────┘
         │                      │                      │
         │         ┌────────────┴──────────────────────┘
         │         │ (frontends call API internally)
         ▼         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            Data Layer                                        │
│   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐                    │
│   │ MySQL Primary│   │ Redis Cluster │   │  Meilisearch │                    │
│   │ + Replica    │   │   (Sentinel)  │   │    Cluster   │                    │
│   └──────────────┘   └──────────────┘   └──────────────┘                    │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Topology Recommendation

**For MVP: Single server** with NGINX reverse proxy routing between PHP and ASP.NET.

**Why:**
- Simpler deployment during transition period
- Both backends share same MySQL/Redis (no data sync issues)
- Easier debugging when issues span PHP↔.NET boundary
- Lower infrastructure cost during migration
- Can scale API horizontally later via container orchestration

**Move to multi-server when:**
- API handles >1000 req/s sustained
- Need geographic redundancy
- PHP backend is fully deprecated

---

## 2. "API-Ready" Definition: Minimum Viable API

The API is "ready" when both frontends can function without any PHP-rendered pages for core user flows.

### Minimum Endpoint Set

| Category | Endpoints | Auth | Notes |
|----------|-----------|------|-------|
| **Auth** | 10 | Mixed | Core login/logout/token management |
| **Users** | 6 | Bearer | Profile CRUD |
| **Listings** | 7 | Bearer | Marketplace core |
| **Wallet** | 6 | Bearer | Time credit transactions |
| **Messages** | 8 | Bearer | Private messaging |
| **Meta** | 2 | Public | Health, CSRF |

**Total: 39 endpoints for MVP**

### Authentication Endpoints (P0 - Critical)

| Method | Endpoint | Auth | CSRF | Description |
|--------|----------|------|------|-------------|
| POST | `/api/v3/auth/login` | None | No | Login, returns access + refresh tokens |
| POST | `/api/v3/auth/register` | None | No | User registration |
| POST | `/api/v3/auth/logout` | Bearer | No | Revoke refresh token, clear session |
| POST | `/api/v3/auth/refresh` | Refresh Token | No | Exchange refresh for new access token |
| POST | `/api/v3/auth/2fa/verify` | 2FA Token | No | Complete 2FA challenge |
| POST | `/api/v3/auth/2fa/backup` | 2FA Token | No | Use backup code |
| GET | `/api/v3/auth/validate` | Bearer | No | Validate token, return user info |
| POST | `/api/v3/auth/revoke` | Bearer | No | Revoke specific refresh token |
| POST | `/api/v3/auth/revoke-all` | Bearer | No | "Log out everywhere" |
| GET | `/api/v3/auth/csrf-token` | Session | No | For session-based web clients |

### Users Endpoints (P0)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/v3/users/me` | Bearer | Get current user profile |
| PUT | `/api/v3/users/me` | Bearer | Update profile |
| PUT | `/api/v3/users/me/avatar` | Bearer | Update avatar |
| PUT | `/api/v3/users/me/password` | Bearer | Change password |
| PUT | `/api/v3/users/me/preferences` | Bearer | Update preferences |
| GET | `/api/v3/users/{id}` | Bearer | View other user's public profile |

### Listings Endpoints (P0)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/v3/listings` | Public | List/search listings |
| GET | `/api/v3/listings/nearby` | Public | Geolocation search |
| GET | `/api/v3/listings/{id}` | Public | View single listing |
| POST | `/api/v3/listings` | Bearer | Create listing |
| PUT | `/api/v3/listings/{id}` | Bearer | Update listing |
| DELETE | `/api/v3/listings/{id}` | Bearer | Delete listing |
| POST | `/api/v3/listings/{id}/image` | Bearer | Upload image |

### Wallet Endpoints (P0)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/v3/wallet/balance` | Bearer | Get current balance |
| GET | `/api/v3/wallet/transactions` | Bearer | List transactions |
| GET | `/api/v3/wallet/transactions/{id}` | Bearer | View single transaction |
| POST | `/api/v3/wallet/transfer` | Bearer | Transfer time credits |
| DELETE | `/api/v3/wallet/transactions/{id}` | Bearer | Delete (if allowed) |
| GET | `/api/v3/wallet/user-search` | Bearer | Autocomplete for recipients |

### Messages Endpoints (P0)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/v3/messages` | Bearer | List conversations |
| GET | `/api/v3/messages/unread-count` | Bearer | Badge count |
| GET | `/api/v3/messages/{conversationId}` | Bearer | Get conversation messages |
| POST | `/api/v3/messages` | Bearer | Send message |
| PUT | `/api/v3/messages/{id}/read` | Bearer | Mark as read |
| DELETE | `/api/v3/messages/{id}` | Bearer | Archive message |
| POST | `/api/v3/messages/typing` | Bearer | Typing indicator (Pusher) |
| POST | `/api/v3/messages/upload-voice` | Bearer | Voice message upload |

### Meta Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/v3/health` | Public | Health check for load balancers |
| GET | `/api/v3/health/ready` | Public | Readiness probe (DB + Redis) |

---

## 3. Authentication & CSRF Strategy

### The Rule

```
┌─────────────────────────────────────────────────────────────────┐
│                    AUTHENTICATION MATRIX                         │
├─────────────────────┬────────────────────┬─────────────────────┤
│ Auth Method         │ CSRF Required?     │ Use Case            │
├─────────────────────┼────────────────────┼─────────────────────┤
│ Bearer Token        │ NO                 │ Mobile, SPA, API    │
│ Session Cookie      │ YES                │ SSR web pages       │
│ No Auth (public)    │ NO                 │ Public endpoints    │
└─────────────────────┴────────────────────┴─────────────────────┘
```

### Why Bearer Tokens Don't Need CSRF

CSRF attacks exploit the browser's automatic cookie sending. Bearer tokens must be explicitly attached to requests via JavaScript/native code, making CSRF attacks impossible.

**Current PHP implementation already does this correctly:**

```php
// Csrf.php:71 - Already skips CSRF for Bearer auth
public static function verifyOrDie() {
    if (self::hasBearerToken()) {
        return; // Skip CSRF for Bearer tokens
    }
    // ... CSRF validation for session auth
}
```

### ASP.NET Implementation

```csharp
// Program.cs
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = "nexus-api",
            ValidateAudience = true,
            ValidAudience = "nexus-clients",
            ValidateLifetime = true,
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(configuration["Jwt:Secret"]!)),
            ClockSkew = TimeSpan.FromMinutes(1)
        };
    });

// For session-based clients that still need CSRF
builder.Services.AddAntiforgery(options =>
{
    options.HeaderName = "X-CSRF-TOKEN";
    options.Cookie.Name = "NEXUS-CSRF";
    options.Cookie.SameSite = SameSiteMode.Strict;
});

// Middleware to conditionally require CSRF
app.Use(async (context, next) =>
{
    // Skip CSRF for Bearer-authenticated requests
    var authHeader = context.Request.Headers.Authorization.FirstOrDefault();
    if (authHeader?.StartsWith("Bearer ") == true)
    {
        await next();
        return;
    }

    // Require CSRF for state-changing session requests
    if (context.Request.Method != "GET" && context.User.Identity?.IsAuthenticated == true)
    {
        await antiforgery.ValidateRequestAsync(context);
    }
    await next();
});
```

### Token Payload Structure

```json
{
  "sub": "12345",           // user_id
  "tenant_id": 2,           // tenant context
  "role": "member",         // user role
  "email": "user@example.com",
  "type": "access",         // "access" or "refresh"
  "platform": "mobile",     // "mobile" or "web"
  "iat": 1706889600,        // issued at
  "exp": 1738425600,        // expires at
  "jti": "unique-token-id"  // for refresh tokens (revocation)
}
```

---

## 4. Tenant Isolation in EF Core

### Current PHP Implementation

```php
// TenantContext.php - Resolves tenant from:
// 1. Domain (hour-timebank.ie → tenant 2)
// 2. X-Tenant-ID header
// 3. Bearer token payload (tenant_id claim)
// 4. URL path (/hour-timebank/listings)
// 5. Session (for admin routes)
// 6. Fallback to Master (tenant 1)
```

### EF Core Global Query Filters

```csharp
// Nexus.Infrastructure/Persistence/NexusDbContext.cs

public class NexusDbContext : DbContext
{
    private readonly ICurrentTenantService _tenantService;

    public NexusDbContext(DbContextOptions options, ICurrentTenantService tenantService)
        : base(options)
    {
        _tenantService = tenantService;
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Apply tenant filter to ALL tenant-scoped entities
        foreach (var entityType in modelBuilder.Model.GetEntityTypes())
        {
            if (typeof(ITenantEntity).IsAssignableFrom(entityType.ClrType))
            {
                modelBuilder.Entity(entityType.ClrType)
                    .HasQueryFilter(BuildTenantFilter(entityType.ClrType));
            }
        }
    }

    private LambdaExpression BuildTenantFilter(Type entityType)
    {
        var parameter = Expression.Parameter(entityType, "e");
        var tenantIdProperty = Expression.Property(parameter, "TenantId");
        var tenantIdValue = Expression.Property(
            Expression.Constant(_tenantService),
            nameof(ICurrentTenantService.TenantId));
        var comparison = Expression.Equal(tenantIdProperty, tenantIdValue);

        return Expression.Lambda(comparison, parameter);
    }

    // Override SaveChanges to auto-set TenantId on insert
    public override async Task<int> SaveChangesAsync(CancellationToken ct = default)
    {
        foreach (var entry in ChangeTracker.Entries<ITenantEntity>())
        {
            if (entry.State == EntityState.Added)
            {
                entry.Entity.TenantId = _tenantService.TenantId;
            }
        }
        return await base.SaveChangesAsync(ct);
    }
}

// Interface for tenant-scoped entities
public interface ITenantEntity
{
    int TenantId { get; set; }
}

// Example entity
public class Listing : ITenantEntity
{
    public int Id { get; set; }
    public int TenantId { get; set; }  // Auto-filtered, auto-set
    public string Title { get; set; } = string.Empty;
    // ...
}
```

### Tenant Resolution Middleware

```csharp
// Nexus.Api/Middleware/TenantResolutionMiddleware.cs

public class TenantResolutionMiddleware
{
    private readonly RequestDelegate _next;

    public async Task InvokeAsync(HttpContext context, ICurrentTenantService tenantService)
    {
        var tenantId = ResolveTenantId(context);

        if (tenantId == null)
        {
            context.Response.StatusCode = 400;
            await context.Response.WriteAsJsonAsync(new { error = "Invalid tenant" });
            return;
        }

        // Validate tenant matches token (if Bearer auth)
        var tokenTenantId = context.User.FindFirst("tenant_id")?.Value;
        if (tokenTenantId != null && int.Parse(tokenTenantId) != tenantId)
        {
            context.Response.StatusCode = 403;
            await context.Response.WriteAsJsonAsync(new {
                error = "Token tenant does not match requested tenant",
                code = "TENANT_MISMATCH"
            });
            return;
        }

        tenantService.SetTenant(tenantId.Value);
        await _next(context);
    }

    private int? ResolveTenantId(HttpContext context)
    {
        // 1. X-Tenant-ID header (API clients)
        if (context.Request.Headers.TryGetValue("X-Tenant-ID", out var headerValue))
        {
            if (int.TryParse(headerValue, out var id)) return id;
        }

        // 2. Bearer token claim
        var tokenClaim = context.User.FindFirst("tenant_id")?.Value;
        if (tokenClaim != null && int.TryParse(tokenClaim, out var tokenId))
        {
            return tokenId;
        }

        // 3. Domain mapping (for direct API calls)
        var host = context.Request.Host.Host;
        // Query tenant by domain...

        // 4. Fallback to Master
        return 1;
    }
}
```

---

## 5. Reverse Proxy Route Table

### NGINX Configuration

```nginx
# /etc/nginx/sites-available/nexus-api

upstream php_backend {
    server 127.0.0.1:9000;  # PHP-FPM
}

upstream dotnet_backend {
    server 127.0.0.1:5000;  # Kestrel
}

upstream govuk_frontend {
    server 127.0.0.1:3000;  # Node/Express
}

upstream react_frontend {
    server 127.0.0.1:3001;  # React dev server / static
}

server {
    listen 443 ssl http2;
    server_name api.project-nexus.ie;

    # TLS configuration...

    # ============================================
    # ASP.NET Core API (new endpoints)
    # ============================================

    # Health checks (always .NET)
    location /health {
        proxy_pass http://dotnet_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # API v3 - All new endpoints go to .NET
    location /api/v3/ {
        proxy_pass http://dotnet_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket support for SignalR (future)
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # Hangfire dashboard (protected)
    location /hangfire {
        proxy_pass http://dotnet_backend;
        proxy_set_header Host $host;
        # Add IP restriction or auth
    }

    # ============================================
    # PHP Backend (legacy - shrinks over time)
    # ============================================

    # Legacy API v1/v2 - PHP until migrated
    location ~ ^/api/(v1|v2)/ {
        fastcgi_pass php_backend;
        include fastcgi_params;
        fastcgi_param SCRIPT_FILENAME /var/www/nexus/httpdocs/index.php;
    }

    # Legacy API without version - PHP
    location ~ ^/api/(?!v3) {
        fastcgi_pass php_backend;
        include fastcgi_params;
        fastcgi_param SCRIPT_FILENAME /var/www/nexus/httpdocs/index.php;
    }

    # Admin panel - PHP (migrate last)
    location /admin {
        fastcgi_pass php_backend;
        include fastcgi_params;
        fastcgi_param SCRIPT_FILENAME /var/www/nexus/httpdocs/index.php;
    }

    # Super-admin - PHP
    location /super-admin {
        fastcgi_pass php_backend;
        include fastcgi_params;
        fastcgi_param SCRIPT_FILENAME /var/www/nexus/httpdocs/index.php;
    }

    # Static assets - direct
    location /assets {
        alias /var/www/nexus/httpdocs/assets;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Uploads
    location /uploads {
        alias /var/www/nexus/httpdocs/uploads;
        expires 7d;
    }

    # All other PHP pages
    location / {
        fastcgi_pass php_backend;
        include fastcgi_params;
        fastcgi_param SCRIPT_FILENAME /var/www/nexus/httpdocs/index.php;
    }
}

# ============================================
# Frontend Servers
# ============================================

server {
    listen 443 ssl http2;
    server_name civic.project-nexus.ie;  # GOV.UK frontend

    location / {
        proxy_pass http://govuk_frontend;
        proxy_set_header Host $host;
    }
}

server {
    listen 443 ssl http2;
    server_name app.project-nexus.ie;  # React frontend

    location / {
        proxy_pass http://react_frontend;
        proxy_set_header Host $host;
    }
}
```

### Route Migration Progression

```
Phase 0 (Now):     100% PHP
Phase 1 (Week 4):  /api/v3/auth/*     → .NET (10 endpoints)
Phase 2 (Week 6):  /api/v3/users/*    → .NET (6 endpoints)
Phase 3 (Week 8):  /api/v3/listings/* → .NET (7 endpoints)
Phase 4 (Week 10): /api/v3/wallet/*   → .NET (6 endpoints)
Phase 5 (Week 12): /api/v3/messages/* → .NET (8 endpoints)
...
Phase N (Month 11): 100% .NET, PHP decommissioned
```

---

## 6. Pusher Integration (Keep Initially)

### Current PHP Usage

```php
// PusherService.php
Pusher::trigger('private-user-' . $userId, 'notification', $data);
Pusher::trigger('presence-group-' . $groupId, 'message', $data);
Pusher::trigger('private-tenant-' . $tenantId, 'announcement', $data);
```

### ASP.NET Implementation

```csharp
// Nexus.Infrastructure/Services/PusherService.cs

public class PusherService : IPusherService
{
    private readonly Pusher _pusher;

    public PusherService(IConfiguration configuration)
    {
        _pusher = new Pusher(
            configuration["Pusher:AppId"]!,
            configuration["Pusher:Key"]!,
            configuration["Pusher:Secret"]!,
            new PusherOptions
            {
                Cluster = configuration["Pusher:Cluster"],
                Encrypted = true
            });
    }

    public async Task TriggerAsync(string channel, string eventName, object data)
    {
        await _pusher.TriggerAsync(channel, eventName, data);
    }

    public async Task NotifyUserAsync(int userId, string eventName, object data)
    {
        await TriggerAsync($"private-user-{userId}", eventName, data);
    }

    public async Task NotifyGroupAsync(int groupId, string eventName, object data)
    {
        await TriggerAsync($"presence-group-{groupId}", eventName, data);
    }
}

// Pusher channel auth endpoint
[HttpPost("/api/v3/pusher/auth")]
[Authorize]
public IActionResult AuthenticatePusher([FromForm] string channel_name, [FromForm] string socket_id)
{
    var userId = User.GetUserId();
    var tenantId = User.GetTenantId();

    // Validate user can access this channel
    if (channel_name.StartsWith("private-user-"))
    {
        var channelUserId = int.Parse(channel_name.Replace("private-user-", ""));
        if (channelUserId != userId)
            return Forbid();
    }

    var auth = _pusher.Authenticate(channel_name, socket_id);
    return Ok(auth);
}
```

### SignalR Migration Path (Future)

When ready to migrate from Pusher to SignalR:

1. Add SignalR hubs alongside Pusher
2. Implement `IRealtimeService` abstraction
3. Feature flag to route clients to SignalR
4. Monitor both in parallel
5. Deprecate Pusher when SignalR is stable

---

## 7. Hangfire for Background Jobs

### Current PHP Cron Jobs

```
# crontab
*/5 * * * * php /path/to/run_scheduled_tasks.php
0 * * * * php /path/to/gamification_cron.php
0 6 * * * php /path/to/send_group_digests.php
0 */4 * * * php /path/to/abuse_detection_cron.php
```

### Hangfire Implementation

```csharp
// Program.cs
builder.Services.AddHangfire(config => config
    .SetDataCompatibilityLevel(CompatibilityLevel.Version_180)
    .UseSimpleAssemblyNameTypeSerializer()
    .UseRecommendedSerializerSettings()
    .UseRedisStorage(redisConnectionString));

builder.Services.AddHangfireServer(options =>
{
    options.Queues = new[] { "critical", "default", "low" };
    options.WorkerCount = Environment.ProcessorCount * 2;
});

// Configure recurring jobs
app.UseHangfireDashboard("/hangfire", new DashboardOptions
{
    Authorization = new[] { new HangfireAuthorizationFilter() }
});

RecurringJob.AddOrUpdate<IScheduledTasksService>(
    "process-scheduled-tasks",
    service => service.ProcessAsync(),
    "*/5 * * * *");  // Every 5 minutes

RecurringJob.AddOrUpdate<IGamificationService>(
    "gamification-cron",
    service => service.ProcessDailyRewardsAsync(),
    "0 * * * *");  // Every hour

RecurringJob.AddOrUpdate<IDigestService>(
    "send-group-digests",
    service => service.SendGroupDigestsAsync(),
    "0 6 * * *");  // Daily at 6 AM

RecurringJob.AddOrUpdate<IAbuseDetectionService>(
    "abuse-detection",
    service => service.ScanAsync(),
    "0 */4 * * *");  // Every 4 hours
```

### Job Service Pattern

```csharp
// Nexus.Application/Services/ScheduledTasksService.cs

public interface IScheduledTasksService
{
    Task ProcessAsync();
}

public class ScheduledTasksService : IScheduledTasksService
{
    private readonly NexusDbContext _context;
    private readonly ILogger<ScheduledTasksService> _logger;

    public async Task ProcessAsync()
    {
        // Get all tenants and process tasks for each
        var tenants = await _context.Tenants
            .IgnoreQueryFilters()  // Need all tenants
            .Where(t => t.IsActive)
            .ToListAsync();

        foreach (var tenant in tenants)
        {
            using var scope = _serviceProvider.CreateScope();
            var tenantService = scope.ServiceProvider.GetRequiredService<ICurrentTenantService>();
            tenantService.SetTenant(tenant.Id);

            // Process tasks within tenant context
            await ProcessTenantTasksAsync(scope.ServiceProvider);
        }
    }
}
```

---

## 8. Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| **Token incompatibility** | Mobile apps fail auth | Medium | Use same JWT secret, same payload structure, test extensively |
| **Tenant isolation breach** | Data leak between tenants | High (severity) | Global query filters + audit logging + automated tests |
| **Session/Bearer confusion** | Auth failures | Medium | Clear middleware ordering, explicit auth scheme per endpoint |
| **Database schema drift** | Query failures | Medium | Use EF migrations, sync from schema.sql not PHP migrations |
| **Pusher channel mismatch** | Real-time broken | Low | Keep exact channel naming convention from PHP |
| **Rate limiting bypass** | DDoS vulnerability | Medium | Implement same limits in ASP.NET middleware |
| **CORS misconfiguration** | Frontend can't call API | High (likelihood) | Explicit CORS policy matching PHP headers |
| **File upload paths** | Missing images | Medium | Configure same upload directory structure |

### Critical Testing Checklist

```
□ Same JWT token works in both PHP and .NET
□ Tenant isolation: User A cannot see User B's data (different tenants)
□ Bearer auth: No CSRF required
□ Session auth: CSRF required for POST/PUT/DELETE
□ Rate limiting: 5 failed logins → lockout
□ Token refresh: Old refresh token invalidated after use
□ Pusher auth: Channel access control enforced
□ File uploads: Images accessible at same URLs
□ Health endpoints: /health returns 200
□ Mobile app: Can login, view listings, send messages
```

---

## 9. Seven-Day Implementation Checklist

### Day 1: Project Setup

- [ ] Create ASP.NET Core 8 solution structure:
  ```
  Nexus.Api/           # Web API project
  Nexus.Application/   # Business logic (MediatR handlers)
  Nexus.Domain/        # Entities, interfaces
  Nexus.Infrastructure/# EF Core, external services
  ```
- [ ] Configure MySQL with Pomelo provider
- [ ] Configure Redis with StackExchange.Redis
- [ ] Add JWT authentication with same secret as PHP
- [ ] Set up health check endpoints (`/health`, `/health/ready`)
- [ ] Configure logging (Serilog → same log format as PHP)

### Day 2: Tenant Context & Base Infrastructure

- [ ] Create `ITenantEntity` interface
- [ ] Create `ICurrentTenantService`
- [ ] Implement `TenantResolutionMiddleware`
- [ ] Add global query filters to `NexusDbContext`
- [ ] Create base `ApiController` with common responses
- [ ] Set up API versioning (v3 prefix)

### Day 3: Auth Controller

- [ ] Implement `POST /api/v3/auth/login`
  - Same token format as PHP TokenService
  - Same rate limiting logic
  - Same 2FA flow (return `requires_2fa: true`)
- [ ] Implement `POST /api/v3/auth/refresh`
- [ ] Implement `GET /api/v3/auth/validate`
- [ ] Implement `POST /api/v3/auth/logout`
- [ ] Test: PHP-generated token works in .NET
- [ ] Test: .NET-generated token works in PHP (for gradual migration)

### Day 4: Users Controller

- [ ] Create `User` entity from schema.sql
- [ ] Implement `GET /api/v3/users/me`
- [ ] Implement `PUT /api/v3/users/me`
- [ ] Implement `PUT /api/v3/users/me/avatar`
- [ ] Implement `GET /api/v3/users/{id}`
- [ ] Test: Update profile, avatar upload works

### Day 5: Listings Controller (Start)

- [ ] Create `Listing` entity with tenant filter
- [ ] Implement `GET /api/v3/listings` (with pagination)
- [ ] Implement `GET /api/v3/listings/{id}`
- [ ] Implement `POST /api/v3/listings`
- [ ] Test: Listing created in .NET visible in PHP

### Day 6: NGINX Routing & Integration

- [ ] Configure NGINX to route `/api/v3/*` to Kestrel
- [ ] Configure `/health` to Kestrel
- [ ] Test: PHP `/api/v2/listings` still works
- [ ] Test: .NET `/api/v3/listings` works
- [ ] Test: Same DB data visible from both
- [ ] Configure Pusher service in .NET

### Day 7: Hangfire & Testing

- [ ] Set up Hangfire with Redis storage
- [ ] Create one recurring job (e.g., `process-scheduled-tasks`)
- [ ] Verify job runs correctly
- [ ] Run full integration test suite:
  - [ ] Login → get token → create listing → view listing
  - [ ] Tenant isolation (user in tenant 2 can't see tenant 3 data)
  - [ ] Rate limiting (6th login attempt blocked)
- [ ] Document any issues found

### End of Week 1 Deliverable

**Working ASP.NET API with:**
- ✅ JWT authentication (compatible with PHP tokens)
- ✅ Tenant isolation via global query filters
- ✅ Health endpoints for load balancer
- ✅ Auth endpoints (login, refresh, logout)
- ✅ Users endpoints (profile CRUD)
- ✅ Listings endpoints (list, view, create)
- ✅ NGINX routing PHP ↔ .NET
- ✅ Hangfire running at least one scheduled job

**Not yet done (Week 2+):**
- Wallet endpoints
- Messages endpoints
- Remaining P0 controllers
- Full test coverage

---

## Appendix: File Structure

```
Nexus.sln
├── src/
│   ├── Nexus.Api/
│   │   ├── Controllers/
│   │   │   └── V3/
│   │   │       ├── AuthController.cs
│   │   │       ├── UsersController.cs
│   │   │       ├── ListingsController.cs
│   │   │       └── HealthController.cs
│   │   ├── Middleware/
│   │   │   └── TenantResolutionMiddleware.cs
│   │   ├── Program.cs
│   │   └── appsettings.json
│   │
│   ├── Nexus.Application/
│   │   ├── Common/
│   │   │   ├── Interfaces/
│   │   │   │   ├── ICurrentTenantService.cs
│   │   │   │   └── IPusherService.cs
│   │   │   └── Behaviors/
│   │   │       └── TenantValidationBehavior.cs
│   │   └── Features/
│   │       ├── Auth/
│   │       │   ├── Commands/
│   │       │   │   ├── LoginCommand.cs
│   │       │   │   └── RefreshTokenCommand.cs
│   │       │   └── Handlers/
│   │       │       └── LoginCommandHandler.cs
│   │       └── Listings/
│   │           ├── Queries/
│   │           │   └── GetListingsQuery.cs
│   │           └── Commands/
│   │               └── CreateListingCommand.cs
│   │
│   ├── Nexus.Domain/
│   │   ├── Entities/
│   │   │   ├── User.cs
│   │   │   ├── Tenant.cs
│   │   │   ├── Listing.cs
│   │   │   └── ITenantEntity.cs
│   │   └── Enums/
│   │       └── ListingType.cs
│   │
│   └── Nexus.Infrastructure/
│       ├── Persistence/
│       │   ├── NexusDbContext.cs
│       │   └── Configurations/
│       │       └── ListingConfiguration.cs
│       ├── Services/
│       │   ├── CurrentTenantService.cs
│       │   ├── TokenService.cs
│       │   └── PusherService.cs
│       └── DependencyInjection.cs
│
└── tests/
    ├── Nexus.Api.Tests/
    │   └── Controllers/
    │       └── AuthControllerTests.cs
    └── Nexus.Application.Tests/
        └── Features/
            └── LoginCommandHandlerTests.cs
```
