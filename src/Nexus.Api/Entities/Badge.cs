namespace Nexus.Api.Entities;

/// <summary>
/// Achievement badge that users can earn.
/// Badges are tenant-specific and can be awarded for various accomplishments.
/// </summary>
public class Badge : ITenantEntity
{
    public int Id { get; set; }
    public int TenantId { get; set; }

    /// <summary>
    /// Unique identifier/slug for the badge (e.g., "first_listing", "helpful_neighbor").
    /// </summary>
    public string Slug { get; set; } = string.Empty;

    /// <summary>
    /// Display name of the badge.
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Description of how to earn this badge.
    /// </summary>
    public string Description { get; set; } = string.Empty;

    /// <summary>
    /// Icon URL or emoji for the badge.
    /// </summary>
    public string? Icon { get; set; }

    /// <summary>
    /// XP awarded when earning this badge.
    /// </summary>
    public int XpReward { get; set; } = 0;

    /// <summary>
    /// Whether this badge is currently active and can be earned.
    /// </summary>
    public bool IsActive { get; set; } = true;

    /// <summary>
    /// Sort order for displaying badges.
    /// </summary>
    public int SortOrder { get; set; } = 0;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public Tenant? Tenant { get; set; }
    public ICollection<UserBadge> UserBadges { get; set; } = new List<UserBadge>();

    /// <summary>
    /// Predefined badge slugs.
    /// </summary>
    public static class Slugs
    {
        public const string FirstListing = "first_listing";
        public const string FirstConnection = "first_connection";
        public const string FirstTransaction = "first_transaction";
        public const string FirstPost = "first_post";
        public const string FirstEvent = "first_event";
        public const string HelpfulNeighbor = "helpful_neighbor";     // 10 transactions
        public const string CommunityBuilder = "community_builder";   // Created a group
        public const string EventOrganizer = "event_organizer";       // Created 5 events
        public const string PopularPost = "popular_post";             // Post with 10+ likes
        public const string Veteran = "veteran";                       // Account 1 year old
    }
}
