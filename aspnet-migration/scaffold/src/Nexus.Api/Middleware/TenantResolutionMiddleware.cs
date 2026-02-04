using Nexus.Application.Common.Interfaces;

namespace Nexus.Api.Middleware;

/// <summary>
/// Resolves the current tenant from the request context.
/// Tenant resolution order:
/// 1. Domain-based: Request host maps to tenant domain
/// 2. Header-based: X-Tenant-ID header (for API clients)
/// 3. Token-based: tenant_id claim in JWT token
/// 4. Path-based: /tenant-slug/ in URL path
/// 5. Default: Master tenant (id=1)
/// </summary>
public class TenantResolutionMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<TenantResolutionMiddleware> _logger;

    public TenantResolutionMiddleware(RequestDelegate next, ILogger<TenantResolutionMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context, ITenantResolver tenantResolver, ICurrentTenantService currentTenant)
    {
        var tenantId = await ResolveTenantIdAsync(context, tenantResolver);

        if (tenantId.HasValue)
        {
            currentTenant.SetTenant(tenantId.Value);
            _logger.LogDebug("Tenant resolved: {TenantId}", tenantId.Value);
        }
        else
        {
            _logger.LogWarning("Could not resolve tenant for request: {Path}", context.Request.Path);
            // Use master tenant as fallback
            currentTenant.SetTenant(1);
        }

        await _next(context);
    }

    private async Task<int?> ResolveTenantIdAsync(HttpContext context, ITenantResolver tenantResolver)
    {
        // 1. Try domain-based resolution
        var host = context.Request.Host.Host;
        var domainTenant = await tenantResolver.ResolveByDomainAsync(host);
        if (domainTenant.HasValue)
        {
            return domainTenant;
        }

        // 2. Try X-Tenant-ID header
        if (context.Request.Headers.TryGetValue("X-Tenant-ID", out var headerTenantId) &&
            int.TryParse(headerTenantId.FirstOrDefault(), out var headerTenant))
        {
            // Validate this tenant exists
            if (await tenantResolver.ExistsAsync(headerTenant))
            {
                // If user is authenticated, validate tenant access
                var tokenTenantId = GetTenantIdFromToken(context);
                if (tokenTenantId.HasValue && tokenTenantId.Value != headerTenant)
                {
                    _logger.LogWarning(
                        "Tenant mismatch: Header={HeaderTenant}, Token={TokenTenant}",
                        headerTenant, tokenTenantId.Value);
                    // Return null to trigger error handling
                    return null;
                }

                return headerTenant;
            }
        }

        // 3. Try token-based resolution
        var tokenTenant = GetTenantIdFromToken(context);
        if (tokenTenant.HasValue)
        {
            return tokenTenant;
        }

        // 4. Try path-based resolution (e.g., /hour-timebank/api/...)
        var path = context.Request.Path.Value;
        if (!string.IsNullOrEmpty(path))
        {
            var segments = path.Split('/', StringSplitOptions.RemoveEmptyEntries);
            if (segments.Length > 0)
            {
                var potentialSlug = segments[0];
                var slugTenant = await tenantResolver.ResolveBySlugAsync(potentialSlug);
                if (slugTenant.HasValue)
                {
                    return slugTenant;
                }
            }
        }

        // 5. Default to master tenant
        return 1;
    }

    private int? GetTenantIdFromToken(HttpContext context)
    {
        var user = context.User;
        if (user.Identity?.IsAuthenticated != true)
        {
            return null;
        }

        var tenantClaim = user.FindFirst("tenant_id");
        if (tenantClaim != null && int.TryParse(tenantClaim.Value, out var tenantId))
        {
            return tenantId;
        }

        return null;
    }
}
