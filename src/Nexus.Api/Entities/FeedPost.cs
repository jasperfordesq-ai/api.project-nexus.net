namespace Nexus.Api.Entities;

/// <summary>
/// Social feed post for community updates and announcements.
/// Posts can be liked and commented on by other users.
/// </summary>
public class FeedPost : ITenantEntity
{
    public int Id { get; set; }
    public int TenantId { get; set; }

    /// <summary>
    /// User who created the post.
    /// </summary>
    public int UserId { get; set; }

    /// <summary>
    /// Optional group this post belongs to. Null for community-wide posts.
    /// </summary>
    public int? GroupId { get; set; }

    /// <summary>
    /// Post content/body text.
    /// </summary>
    public string Content { get; set; } = string.Empty;

    /// <summary>
    /// Optional image URL attached to the post.
    /// </summary>
    public string? ImageUrl { get; set; }

    /// <summary>
    /// Whether the post is pinned (shown at top).
    /// </summary>
    public bool IsPinned { get; set; } = false;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    // Navigation properties
    public Tenant? Tenant { get; set; }
    public User? User { get; set; }
    public Group? Group { get; set; }
    public ICollection<PostLike> Likes { get; set; } = new List<PostLike>();
    public ICollection<PostComment> Comments { get; set; } = new List<PostComment>();
}
