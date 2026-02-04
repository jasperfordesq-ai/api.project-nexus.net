# Health Checks, Monitoring & Analytics Dashboards

## 1. Health Check Endpoints

### Current PHP Implementation

**File**: `src/Controllers/Admin/Enterprise/MonitoringController.php`

```php
public function health()
{
    $checks = [];

    // Database check
    try {
        $start = microtime(true);
        Database::query("SELECT 1");
        $dbLatency = (microtime(true) - $start) * 1000;
        $checks['database'] = [
            'status' => 'healthy',
            'latency_ms' => round($dbLatency, 2)
        ];
    } catch (\Exception $e) {
        $checks['database'] = ['status' => 'unhealthy', 'error' => $e->getMessage()];
    }

    // Redis check
    try {
        $redis = new \Redis();
        $redis->connect(env('REDIS_HOST', '127.0.0.1'), env('REDIS_PORT', 6379));
        $start = microtime(true);
        $redis->ping();
        $redisLatency = (microtime(true) - $start) * 1000;
        $checks['redis'] = [
            'status' => 'healthy',
            'latency_ms' => round($redisLatency, 2)
        ];
    } catch (\Exception $e) {
        $checks['redis'] = ['status' => 'unhealthy', 'error' => $e->getMessage()];
    }

    // Overall status
    $allHealthy = !in_array('unhealthy', array_column($checks, 'status'));

    return $this->jsonResponse([
        'status' => $allHealthy ? 'healthy' : 'unhealthy',
        'checks' => $checks,
        'timestamp' => date('c')
    ], $allHealthy ? 200 : 503);
}
```

### ASP.NET Core Implementation

```csharp
// Program.cs
builder.Services.AddHealthChecks()
    .AddMySql(
        connectionString,
        name: "mysql",
        tags: new[] { "db", "ready" })
    .AddRedis(
        redisConnectionString,
        name: "redis",
        tags: new[] { "cache", "ready" })
    .AddCheck<MeilisearchHealthCheck>("meilisearch", tags: new[] { "search", "ready" })
    .AddCheck<PusherHealthCheck>("pusher", tags: new[] { "realtime" });

app.MapHealthChecks("/health", new HealthCheckOptions
{
    ResponseWriter = WriteHealthResponse
});

app.MapHealthChecks("/health/ready", new HealthCheckOptions
{
    Predicate = check => check.Tags.Contains("ready"),
    ResponseWriter = WriteHealthResponse
});

app.MapHealthChecks("/health/live", new HealthCheckOptions
{
    Predicate = _ => false // Always returns healthy if app is running
});

// Custom response writer
static async Task WriteHealthResponse(HttpContext context, HealthReport report)
{
    context.Response.ContentType = "application/json";

    var result = new
    {
        status = report.Status.ToString().ToLower(),
        checks = report.Entries.Select(e => new
        {
            name = e.Key,
            status = e.Value.Status.ToString().ToLower(),
            latency_ms = e.Value.Duration.TotalMilliseconds,
            error = e.Value.Exception?.Message
        }),
        timestamp = DateTime.UtcNow.ToString("o")
    };

    await context.Response.WriteAsJsonAsync(result);
}
```

### Custom Health Checks

```csharp
// Nexus.Infrastructure/HealthChecks/MeilisearchHealthCheck.cs
public class MeilisearchHealthCheck : IHealthCheck
{
    private readonly MeilisearchClient _client;

    public MeilisearchHealthCheck(MeilisearchClient client)
    {
        _client = client;
    }

    public async Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var health = await _client.HealthAsync();
            return health.Status == "available"
                ? HealthCheckResult.Healthy()
                : HealthCheckResult.Degraded("Meilisearch not fully available");
        }
        catch (Exception ex)
        {
            return HealthCheckResult.Unhealthy("Meilisearch unreachable", ex);
        }
    }
}

// Nexus.Infrastructure/HealthChecks/PusherHealthCheck.cs
public class PusherHealthCheck : IHealthCheck
{
    private readonly Pusher _pusher;

    public async Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var result = await _pusher.GetAsync<object>("/channels");
            return HealthCheckResult.Healthy();
        }
        catch (Exception ex)
        {
            return HealthCheckResult.Unhealthy("Pusher unreachable", ex);
        }
    }
}
```

---

## 2. Analytics Dashboard

### Current PHP Implementation

**Files**:
- `src/Services/AdminAnalyticsService.php` - Core metrics
- `src/Services/AchievementAnalyticsService.php` - Gamification stats
- `views/admin/partials/analytics_chart.php` - SVG charts

### Metrics Collected

| Metric | Description | Aggregation |
|--------|-------------|-------------|
| Active Users | Users with activity in period | Daily/Weekly/Monthly |
| Transactions | Time credit transfers | Daily volume |
| Listings | New offers/requests | Daily count |
| Messages | Private messages sent | Daily count |
| Events | New events created | Weekly count |
| Badges | Badges earned | Daily count |
| XP Awarded | Total XP given | Daily sum |

### PHP Analytics Service

```php
// AdminAnalyticsService::getDashboardMetrics()
public static function getDashboardMetrics($tenantId, $period = 'month')
{
    $startDate = self::getStartDate($period);

    return [
        'active_users' => self::getActiveUsers($tenantId, $startDate),
        'transactions' => [
            'count' => self::getTransactionCount($tenantId, $startDate),
            'volume' => self::getTransactionVolume($tenantId, $startDate),
            'chart' => self::getTransactionChart($tenantId, $startDate)
        ],
        'listings' => [
            'new' => self::getNewListings($tenantId, $startDate),
            'active' => self::getActiveListings($tenantId)
        ],
        'engagement' => [
            'messages' => self::getMessageCount($tenantId, $startDate),
            'posts' => self::getPostCount($tenantId, $startDate),
            'events' => self::getEventCount($tenantId, $startDate)
        ],
        'gamification' => [
            'badges_earned' => self::getBadgesEarned($tenantId, $startDate),
            'xp_awarded' => self::getXpAwarded($tenantId, $startDate)
        ]
    ];
}
```

### SVG Chart Generation

```php
// views/admin/partials/analytics_chart.php
function renderBarChart($data, $width = 600, $height = 300) {
    $maxValue = max(array_column($data, 'value'));
    $barWidth = ($width - 60) / count($data);
    $svg = '<svg width="' . $width . '" height="' . $height . '" class="analytics-chart">';

    foreach ($data as $i => $item) {
        $barHeight = ($item['value'] / $maxValue) * ($height - 40);
        $x = 30 + ($i * $barWidth);
        $y = $height - 20 - $barHeight;

        $svg .= sprintf(
            '<rect x="%d" y="%d" width="%d" height="%d" fill="var(--color-primary-500)" rx="4">
                <animate attributeName="height" from="0" to="%d" dur="0.5s" fill="freeze"/>
            </rect>',
            $x, $y, $barWidth - 4, $barHeight, $barHeight
        );

        $svg .= sprintf(
            '<text x="%d" y="%d" text-anchor="middle" class="chart-label">%s</text>',
            $x + ($barWidth / 2), $height - 5, $item['label']
        );
    }

    $svg .= '</svg>';
    return $svg;
}
```

### ASP.NET Core Implementation

```csharp
// Nexus.Application/Features/Analytics/Queries/GetDashboardMetricsQuery.cs
public record GetDashboardMetricsQuery(string Period = "month") : IRequest<DashboardMetrics>;

public class GetDashboardMetricsHandler : IRequestHandler<GetDashboardMetricsQuery, DashboardMetrics>
{
    private readonly NexusDbContext _context;
    private readonly ICurrentTenantService _tenant;

    public async Task<DashboardMetrics> Handle(
        GetDashboardMetricsQuery request,
        CancellationToken cancellationToken)
    {
        var tenantId = _tenant.TenantId;
        var startDate = GetStartDate(request.Period);

        var activeUsers = await _context.Users
            .Where(u => u.TenantId == tenantId && u.LastLoginAt >= startDate)
            .CountAsync(cancellationToken);

        var transactions = await _context.Transactions
            .Where(t => t.TenantId == tenantId && t.CreatedAt >= startDate)
            .GroupBy(t => t.CreatedAt.Date)
            .Select(g => new ChartDataPoint
            {
                Label = g.Key.ToString("MMM dd"),
                Value = g.Sum(t => t.Amount)
            })
            .ToListAsync(cancellationToken);

        var newListings = await _context.Listings
            .Where(l => l.TenantId == tenantId && l.CreatedAt >= startDate)
            .CountAsync(cancellationToken);

        var badgesEarned = await _context.UserBadges
            .Where(b => b.TenantId == tenantId && b.EarnedAt >= startDate)
            .CountAsync(cancellationToken);

        return new DashboardMetrics
        {
            ActiveUsers = activeUsers,
            Transactions = new TransactionMetrics
            {
                Count = transactions.Count,
                Volume = transactions.Sum(t => t.Value),
                Chart = transactions
            },
            Listings = new ListingMetrics
            {
                New = newListings,
                Active = await _context.Listings.CountAsync(l =>
                    l.TenantId == tenantId && l.Status == ListingStatus.Active, cancellationToken)
            },
            Gamification = new GamificationMetrics
            {
                BadgesEarned = badgesEarned,
                XpAwarded = await _context.UserXpLogs
                    .Where(x => x.TenantId == tenantId && x.CreatedAt >= startDate)
                    .SumAsync(x => x.Amount, cancellationToken)
            }
        };
    }

    private DateTime GetStartDate(string period) => period switch
    {
        "week" => DateTime.UtcNow.AddDays(-7),
        "month" => DateTime.UtcNow.AddMonths(-1),
        "quarter" => DateTime.UtcNow.AddMonths(-3),
        "year" => DateTime.UtcNow.AddYears(-1),
        _ => DateTime.UtcNow.AddMonths(-1)
    };
}

public class DashboardMetrics
{
    public int ActiveUsers { get; set; }
    public TransactionMetrics Transactions { get; set; } = new();
    public ListingMetrics Listings { get; set; } = new();
    public GamificationMetrics Gamification { get; set; } = new();
}

public class TransactionMetrics
{
    public int Count { get; set; }
    public decimal Volume { get; set; }
    public List<ChartDataPoint> Chart { get; set; } = new();
}

public record ChartDataPoint(string Label, decimal Value);
```

### Analytics Controller

```csharp
[ApiController]
[Route("admin/api/analytics")]
[Authorize(Roles = "admin,tenant_admin")]
public class AnalyticsController : ControllerBase
{
    private readonly IMediator _mediator;

    [HttpGet("dashboard")]
    public async Task<IActionResult> GetDashboard([FromQuery] string period = "month")
    {
        var metrics = await _mediator.Send(new GetDashboardMetricsQuery(period));
        return Ok(metrics);
    }

    [HttpGet("transactions/chart")]
    public async Task<IActionResult> GetTransactionChart([FromQuery] string period = "month")
    {
        var data = await _mediator.Send(new GetTransactionChartQuery(period));
        return Ok(data);
    }

    [HttpGet("realtime")]
    public async Task<IActionResult> GetRealtimeMetrics()
    {
        var metrics = await _mediator.Send(new GetRealtimeMetricsQuery());
        return Ok(metrics);
    }
}
```

---

## 3. Audit Logging

### Current PHP Implementation

**Files**:
- `src/Services/AuditLogService.php`
- `src/Services/SuperAdminAuditService.php`
- `src/Services/FederationAuditService.php`

### Audit Events

| Event Type | Data Captured |
|------------|---------------|
| User Login | IP, User-Agent, Success/Failure |
| Transaction | Sender, Receiver, Amount, Description |
| Role Change | User, Old Role, New Role, Changed By |
| Settings Update | Setting Key, Old Value, New Value |
| Federation Action | Partner, Action, Payload |
| Admin Action | Action Type, Target, Details |

### PHP Audit Service

```php
// AuditLogService::log()
public static function log($action, $entityType, $entityId, $details = [], $userId = null)
{
    $tenantId = TenantContext::getId();
    $userId = $userId ?? Auth::id();

    Database::query(
        "INSERT INTO audit_logs (tenant_id, user_id, action, entity_type, entity_id, details, ip_address, user_agent, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())",
        [
            $tenantId,
            $userId,
            $action,
            $entityType,
            $entityId,
            json_encode($details),
            $_SERVER['REMOTE_ADDR'] ?? null,
            $_SERVER['HTTP_USER_AGENT'] ?? null
        ]
    );
}
```

### ASP.NET Core Implementation

```csharp
// Nexus.Application/Common/Interfaces/IAuditService.cs
public interface IAuditService
{
    Task LogAsync(AuditEntry entry);
    Task LogAsync(string action, string entityType, string entityId, object? details = null);
}

// Nexus.Infrastructure/Services/AuditService.cs
public class AuditService : IAuditService
{
    private readonly NexusDbContext _context;
    private readonly ICurrentTenantService _tenant;
    private readonly ICurrentUserService _user;
    private readonly IHttpContextAccessor _httpContext;

    public async Task LogAsync(string action, string entityType, string entityId, object? details = null)
    {
        var entry = new AuditLog
        {
            TenantId = _tenant.TenantId,
            UserId = _user.UserId,
            Action = action,
            EntityType = entityType,
            EntityId = entityId,
            Details = details != null ? JsonSerializer.Serialize(details) : null,
            IpAddress = _httpContext.HttpContext?.Connection.RemoteIpAddress?.ToString(),
            UserAgent = _httpContext.HttpContext?.Request.Headers.UserAgent.ToString(),
            CreatedAt = DateTime.UtcNow
        };

        _context.AuditLogs.Add(entry);
        await _context.SaveChangesAsync();
    }
}

// Automatic audit logging via interceptor
public class AuditInterceptor : SaveChangesInterceptor
{
    private readonly IAuditService _audit;

    public override async ValueTask<int> SavedChangesAsync(
        SaveChangesCompletedEventData eventData,
        int result,
        CancellationToken cancellationToken = default)
    {
        var context = eventData.Context;
        if (context == null) return result;

        foreach (var entry in context.ChangeTracker.Entries())
        {
            if (entry.Entity is IAuditable auditable)
            {
                var action = entry.State switch
                {
                    EntityState.Added => "created",
                    EntityState.Modified => "updated",
                    EntityState.Deleted => "deleted",
                    _ => null
                };

                if (action != null)
                {
                    await _audit.LogAsync(
                        action,
                        entry.Entity.GetType().Name,
                        GetEntityId(entry),
                        GetChangedValues(entry));
                }
            }
        }

        return result;
    }
}
```

---

## 4. Migration Checklist

### Health Checks

- [ ] Add `AspNetCore.HealthChecks.MySql` package
- [ ] Add `AspNetCore.HealthChecks.Redis` package
- [ ] Create custom Meilisearch health check
- [ ] Create custom Pusher health check
- [ ] Configure `/health`, `/health/ready`, `/health/live` endpoints
- [ ] Set up monitoring integration (optional)

### Analytics

- [ ] Create analytics query handlers
- [ ] Implement chart data aggregation
- [ ] Create admin analytics API endpoints
- [ ] Port SVG chart generation (or use frontend charting)
- [ ] Add caching for expensive queries

### Audit Logging

- [ ] Create AuditLog entity
- [ ] Implement IAuditService
- [ ] Add audit interceptor for automatic logging
- [ ] Create audit log viewing API
- [ ] Add audit log retention policy
