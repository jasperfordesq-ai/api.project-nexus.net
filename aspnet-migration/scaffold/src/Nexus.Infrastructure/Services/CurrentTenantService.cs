using Nexus.Application.Common.Interfaces;
using Nexus.Infrastructure.Persistence;

namespace Nexus.Infrastructure.Services;

/// <summary>
/// Scoped service that holds the current tenant context.
/// Equivalent to PHP's TenantContext class.
/// </summary>
public class CurrentTenantService : ICurrentTenantService
{
    private readonly NexusDbContext _context;
    private int _tenantId = 1; // Default to master tenant
    private Tenant? _tenant;
    private Dictionary<string, string>? _settings;
    private HashSet<string>? _features;

    public CurrentTenantService(NexusDbContext context)
    {
        _context = context;
    }

    public int TenantId => _tenantId;

    public string? TenantSlug => _tenant?.Slug;

    public void SetTenant(int tenantId)
    {
        _tenantId = tenantId;
        _tenant = null;
        _settings = null;
        _features = null;
    }

    public T? GetSetting<T>(string key)
    {
        EnsureSettingsLoaded();

        if (_settings!.TryGetValue(key, out var value))
        {
            return (T)Convert.ChangeType(value, typeof(T));
        }

        return default;
    }

    public bool HasFeature(string featureName)
    {
        EnsureFeaturesLoaded();
        return _features!.Contains(featureName);
    }

    private void EnsureSettingsLoaded()
    {
        if (_settings != null) return;

        _settings = _context.TenantSettings
            .Where(s => s.TenantId == _tenantId)
            .ToDictionary(s => s.Key, s => s.Value);
    }

    private void EnsureFeaturesLoaded()
    {
        if (_features != null) return;

        EnsureTenantLoaded();

        _features = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        if (!string.IsNullOrEmpty(_tenant?.Features))
        {
            try
            {
                var featureList = System.Text.Json.JsonSerializer.Deserialize<List<string>>(_tenant.Features);
                if (featureList != null)
                {
                    foreach (var f in featureList)
                    {
                        _features.Add(f);
                    }
                }
            }
            catch
            {
                // Invalid JSON, ignore
            }
        }
    }

    private void EnsureTenantLoaded()
    {
        if (_tenant != null) return;
        _tenant = _context.Tenants.Find(_tenantId);
    }
}

/// <summary>
/// Service for resolving tenant from various sources.
/// </summary>
public class TenantResolver : ITenantResolver
{
    private readonly NexusDbContext _context;
    private readonly IMemoryCache _cache;

    public TenantResolver(NexusDbContext context, IMemoryCache cache)
    {
        _context = context;
        _cache = cache;
    }

    public async Task<int?> ResolveByDomainAsync(string domain)
    {
        var cacheKey = $"tenant_domain_{domain}";

        if (_cache.TryGetValue(cacheKey, out int cachedId))
        {
            return cachedId;
        }

        var tenant = await _context.Tenants
            .AsNoTracking()
            .Where(t => t.Domain == domain && t.IsActive)
            .Select(t => new { t.Id })
            .FirstOrDefaultAsync();

        if (tenant != null)
        {
            _cache.Set(cacheKey, tenant.Id, TimeSpan.FromMinutes(10));
            return tenant.Id;
        }

        return null;
    }

    public async Task<int?> ResolveBySlugAsync(string slug)
    {
        var cacheKey = $"tenant_slug_{slug}";

        if (_cache.TryGetValue(cacheKey, out int cachedId))
        {
            return cachedId;
        }

        var tenant = await _context.Tenants
            .AsNoTracking()
            .Where(t => t.Slug == slug && t.IsActive)
            .Select(t => new { t.Id })
            .FirstOrDefaultAsync();

        if (tenant != null)
        {
            _cache.Set(cacheKey, tenant.Id, TimeSpan.FromMinutes(10));
            return tenant.Id;
        }

        return null;
    }

    public async Task<bool> ExistsAsync(int tenantId)
    {
        var cacheKey = $"tenant_exists_{tenantId}";

        if (_cache.TryGetValue(cacheKey, out bool exists))
        {
            return exists;
        }

        exists = await _context.Tenants
            .AsNoTracking()
            .AnyAsync(t => t.Id == tenantId && t.IsActive);

        _cache.Set(cacheKey, exists, TimeSpan.FromMinutes(10));

        return exists;
    }
}
