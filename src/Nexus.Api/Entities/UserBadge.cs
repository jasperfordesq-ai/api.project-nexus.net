namespace Nexus.Api.Entities;

/// <summary>
/// Junction entity linking users to earned badges.
/// Tracks when a user earned a specific badge.
/// </summary>
public class UserBadge : ITenantEntity
{
    public int Id { get; set; }
    public int TenantId { get; set; }
    public int UserId { get; set; }
    public int BadgeId { get; set; }

    /// <summary>
    /// When the badge was earned.
    /// </summary>
    public DateTime EarnedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public Tenant? Tenant { get; set; }
    public User? User { get; set; }
    public Badge? Badge { get; set; }
}
