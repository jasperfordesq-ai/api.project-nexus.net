namespace Nexus.Api.Entities;

/// <summary>
/// Marker interface for entities that belong to a tenant.
/// All tenant-scoped entities must implement this interface.
/// </summary>
public interface ITenantEntity
{
    int TenantId { get; set; }
}
