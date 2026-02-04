namespace Nexus.Api.Entities;

/// <summary>
/// Log entry for XP gains/losses.
/// Tracks the source and amount of each XP change for audit and history.
/// </summary>
public class XpLog : ITenantEntity
{
    public int Id { get; set; }
    public int TenantId { get; set; }
    public int UserId { get; set; }

    /// <summary>
    /// Amount of XP gained (positive) or lost (negative).
    /// </summary>
    public int Amount { get; set; }

    /// <summary>
    /// Source/reason for the XP change (e.g., "badge_earned", "listing_created", "connection_made").
    /// </summary>
    public string Source { get; set; } = string.Empty;

    /// <summary>
    /// Optional reference ID (e.g., badge ID, listing ID) for context.
    /// </summary>
    public int? ReferenceId { get; set; }

    /// <summary>
    /// Optional description of the XP change.
    /// </summary>
    public string? Description { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public Tenant? Tenant { get; set; }
    public User? User { get; set; }

    /// <summary>
    /// Predefined XP sources.
    /// </summary>
    public static class Sources
    {
        public const string BadgeEarned = "badge_earned";
        public const string ListingCreated = "listing_created";
        public const string ConnectionMade = "connection_made";
        public const string TransactionCompleted = "transaction_completed";
        public const string PostCreated = "post_created";
        public const string EventCreated = "event_created";
        public const string EventAttended = "event_attended";
        public const string GroupCreated = "group_created";
        public const string CommentAdded = "comment_added";
        public const string ReviewLeft = "review_left";
    }

    /// <summary>
    /// Default XP amounts for various actions.
    /// </summary>
    public static class Amounts
    {
        public const int ListingCreated = 10;
        public const int ConnectionMade = 5;
        public const int TransactionCompleted = 20;
        public const int PostCreated = 5;
        public const int EventCreated = 15;
        public const int EventAttended = 10;
        public const int GroupCreated = 20;
        public const int CommentAdded = 2;
        public const int ReviewLeft = 5;
    }
}
