using System.Security.Claims;

namespace Nexus.Api.Extensions;

/// <summary>
/// Extension methods for ClaimsPrincipal to extract user information.
/// Centralizes the logic for getting user ID from JWT claims.
/// </summary>
public static class ClaimsPrincipalExtensions
{
    /// <summary>
    /// Gets the current user's ID from JWT claims.
    /// Checks both standard NameIdentifier claim and "sub" claim for PHP interoperability.
    /// </summary>
    /// <param name="principal">The claims principal (usually from HttpContext.User)</param>
    /// <returns>The user ID if found and valid, null otherwise</returns>
    public static int? GetUserId(this ClaimsPrincipal principal)
    {
        var userIdClaim = principal.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? principal.FindFirst("sub")?.Value;

        if (int.TryParse(userIdClaim, out var userId))
        {
            return userId;
        }
        return null;
    }

    /// <summary>
    /// Gets the current user's tenant ID from JWT claims.
    /// </summary>
    /// <param name="principal">The claims principal</param>
    /// <returns>The tenant ID if found and valid, null otherwise</returns>
    public static int? GetTenantId(this ClaimsPrincipal principal)
    {
        var tenantIdClaim = principal.FindFirst("tenant_id")?.Value;

        if (int.TryParse(tenantIdClaim, out var tenantId))
        {
            return tenantId;
        }
        return null;
    }

    /// <summary>
    /// Gets the current user's role from JWT claims.
    /// </summary>
    /// <param name="principal">The claims principal</param>
    /// <returns>The role if found, null otherwise</returns>
    public static string? GetRole(this ClaimsPrincipal principal)
    {
        return principal.FindFirst(ClaimTypes.Role)?.Value
            ?? principal.FindFirst("role")?.Value;
    }

    /// <summary>
    /// Gets the current user's email from JWT claims.
    /// </summary>
    /// <param name="principal">The claims principal</param>
    /// <returns>The email if found, null otherwise</returns>
    public static string? GetEmail(this ClaimsPrincipal principal)
    {
        return principal.FindFirst(ClaimTypes.Email)?.Value
            ?? principal.FindFirst("email")?.Value;
    }
}
