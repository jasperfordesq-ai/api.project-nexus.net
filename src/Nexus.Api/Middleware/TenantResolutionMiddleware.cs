using Nexus.Api.Data;

namespace Nexus.Api.Middleware;

/// <summary>
/// Resolves tenant context from the incoming request.
///
/// SECURITY RULES:
/// - If user is authenticated (has JWT), tenant_id MUST come from JWT claim.
/// - X-Tenant-ID header is ONLY allowed for unauthenticated requests (e.g., login)
///   OR in Development environment for testing.
/// - This prevents authenticated users from spoofing tenant context via headers.
/// </summary>
public class TenantResolutionMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<TenantResolutionMiddleware> _logger;
    private readonly IHostEnvironment _environment;

    // Paths that don't require tenant resolution (they handle it themselves)
    private static readonly HashSet<string> _excludedPaths = new(StringComparer.OrdinalIgnoreCase)
    {
        "/health",
        "/health/ready",
        "/health/live",
        "/swagger",                  // Swagger UI and JSON spec
        "/api/auth/login",           // Login determines tenant from credentials
        "/api/auth/register",        // Register determines tenant from request body
        "/api/auth/refresh",         // Refresh determines tenant from token lookup
        "/api/auth/forgot-password", // Forgot password determines tenant from request body
        "/api/auth/reset-password"   // Reset password determines tenant from token lookup
    };

    public TenantResolutionMiddleware(
        RequestDelegate next,
        ILogger<TenantResolutionMiddleware> logger,
        IHostEnvironment environment)
    {
        _next = next;
        _logger = logger;
        _environment = environment;
    }

    public async Task InvokeAsync(HttpContext context, TenantContext tenantContext)
    {
        var path = context.Request.Path.Value ?? "";

        // Skip tenant resolution for excluded paths
        if (_excludedPaths.Any(p => path.Equals(p, StringComparison.OrdinalIgnoreCase) ||
                                    path.StartsWith(p + "/", StringComparison.OrdinalIgnoreCase) ||
                                    path.StartsWith(p + "?", StringComparison.OrdinalIgnoreCase)))
        {
            await _next(context);
            return;
        }

        // Try to resolve tenant with security checks
        var (tenantId, source) = ResolveTenantIdSecure(context);

        if (tenantId.HasValue)
        {
            tenantContext.SetTenant(tenantId.Value);
            _logger.LogDebug("Tenant resolved: {TenantId} from {Source} for path {Path}",
                tenantId.Value, source, path);
            await _next(context);
            return;
        }

        // Tenant required but not found
        _logger.LogWarning("Tenant could not be resolved for path {Path}", path);
        context.Response.StatusCode = StatusCodes.Status400BadRequest;
        await context.Response.WriteAsJsonAsync(new
        {
            error = "Tenant context required",
            message = "Authentication required with valid tenant_id claim"
        });
    }

    private (int? TenantId, string Source) ResolveTenantIdSecure(HttpContext context)
    {
        var isAuthenticated = context.User.Identity?.IsAuthenticated == true;

        // 1. If authenticated, MUST use JWT claim - no header override allowed
        if (isAuthenticated)
        {
            var tenantClaim = context.User.FindFirst("tenant_id");
            if (tenantClaim != null && int.TryParse(tenantClaim.Value, out var jwtTenantId))
            {
                // Log warning if header was also provided (potential attack attempt)
                if (context.Request.Headers.ContainsKey("X-Tenant-ID"))
                {
                    _logger.LogWarning(
                        "Authenticated request included X-Tenant-ID header - ignored. " +
                        "JWT tenant_id takes precedence. Path: {Path}",
                        context.Request.Path);
                }
                return (jwtTenantId, "JWT");
            }

            // Authenticated but no tenant_id claim - this is a malformed token
            _logger.LogWarning("Authenticated user has no tenant_id claim");
            return (null, "JWT_MISSING_CLAIM");
        }

        // 2. Not authenticated - allow header ONLY in Development for testing
        if (_environment.IsDevelopment())
        {
            if (context.Request.Headers.TryGetValue("X-Tenant-ID", out var headerValue))
            {
                if (int.TryParse(headerValue.FirstOrDefault(), out var headerTenantId))
                {
                    _logger.LogDebug("Development mode: tenant from X-Tenant-ID header");
                    return (headerTenantId, "Header_Dev");
                }
            }
        }

        // 3. No tenant context available
        return (null, "None");
    }
}
