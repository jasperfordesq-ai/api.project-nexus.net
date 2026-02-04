namespace Nexus.Api.Entities;

/// <summary>
/// Junction entity for group membership.
/// Tracks which users belong to which groups and their roles.
/// </summary>
public class GroupMember : ITenantEntity
{
    public int Id { get; set; }
    public int TenantId { get; set; }
    public int GroupId { get; set; }
    public int UserId { get; set; }

    /// <summary>
    /// Role within the group: member, admin, or owner.
    /// </summary>
    public string Role { get; set; } = Group.Roles.Member;

    /// <summary>
    /// When the user joined the group.
    /// </summary>
    public DateTime JoinedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public Tenant? Tenant { get; set; }
    public Group? Group { get; set; }
    public User? User { get; set; }
}
