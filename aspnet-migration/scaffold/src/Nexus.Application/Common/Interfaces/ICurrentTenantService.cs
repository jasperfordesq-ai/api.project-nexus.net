namespace Nexus.Application.Common.Interfaces;

/// <summary>
/// Service for accessing the current tenant context.
/// Maps to PHP's TenantContext class functionality.
/// </summary>
public interface ICurrentTenantService
{
    /// <summary>
    /// Gets the current tenant ID.
    /// </summary>
    int TenantId { get; }

    /// <summary>
    /// Gets the current tenant's slug.
    /// </summary>
    string? TenantSlug { get; }

    /// <summary>
    /// Gets a tenant setting value.
    /// </summary>
    T? GetSetting<T>(string key);

    /// <summary>
    /// Checks if a feature is enabled for the current tenant.
    /// </summary>
    bool HasFeature(string featureName);

    /// <summary>
    /// Sets the tenant context (called by middleware).
    /// </summary>
    void SetTenant(int tenantId);
}

/// <summary>
/// Service for resolving tenant from various sources.
/// </summary>
public interface ITenantResolver
{
    /// <summary>
    /// Resolves tenant ID by domain name.
    /// </summary>
    Task<int?> ResolveByDomainAsync(string domain);

    /// <summary>
    /// Resolves tenant ID by slug.
    /// </summary>
    Task<int?> ResolveBySlugAsync(string slug);

    /// <summary>
    /// Checks if a tenant exists.
    /// </summary>
    Task<bool> ExistsAsync(int tenantId);
}
