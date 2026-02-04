namespace Nexus.Api.Entities;

/// <summary>
/// Junction entity for post likes.
/// Tracks which users have liked which posts.
/// </summary>
public class PostLike : ITenantEntity
{
    public int Id { get; set; }
    public int TenantId { get; set; }
    public int PostId { get; set; }
    public int UserId { get; set; }

    /// <summary>
    /// When the like was created.
    /// </summary>
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public Tenant? Tenant { get; set; }
    public FeedPost? Post { get; set; }
    public User? User { get; set; }
}
