namespace Nexus.Domain.Common;

/// <summary>
/// Base entity with audit fields.
/// </summary>
public abstract class BaseEntity
{
    public int Id { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

/// <summary>
/// Interface for tenant-scoped entities.
/// All entities implementing this will have automatic tenant filtering.
/// </summary>
public interface ITenantEntity
{
    int TenantId { get; set; }
}

/// <summary>
/// Interface for soft-deletable entities.
/// </summary>
public interface ISoftDelete
{
    DateTime? DeletedAt { get; set; }
}

/// <summary>
/// Interface for entities with full audit trail.
/// </summary>
public interface IAuditableEntity
{
    DateTime CreatedAt { get; set; }
    DateTime? UpdatedAt { get; set; }
    int? CreatedBy { get; set; }
    int? UpdatedBy { get; set; }
}
