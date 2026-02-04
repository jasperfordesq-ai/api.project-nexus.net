namespace Nexus.Api.Entities;

/// <summary>
/// Represents a tenant (organization/community) in the system.
/// Tenants are the top-level isolation boundary.
/// </summary>
public class Tenant
{
    public int Id { get; set; }
    public string Slug { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
