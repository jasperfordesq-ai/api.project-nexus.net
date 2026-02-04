namespace Nexus.Api.Entities;

/// <summary>
/// Community event, optionally associated with a group.
/// Events have a date/time, location, and RSVP functionality.
/// </summary>
public class Event : ITenantEntity
{
    public int Id { get; set; }
    public int TenantId { get; set; }

    /// <summary>
    /// User who created the event.
    /// </summary>
    public int CreatedById { get; set; }

    /// <summary>
    /// Optional group this event belongs to. Null for community-wide events.
    /// </summary>
    public int? GroupId { get; set; }

    /// <summary>
    /// Event title.
    /// </summary>
    public string Title { get; set; } = string.Empty;

    /// <summary>
    /// Detailed description of the event.
    /// </summary>
    public string? Description { get; set; }

    /// <summary>
    /// Physical or virtual location.
    /// </summary>
    public string? Location { get; set; }

    /// <summary>
    /// When the event starts.
    /// </summary>
    public DateTime StartsAt { get; set; }

    /// <summary>
    /// When the event ends (optional).
    /// </summary>
    public DateTime? EndsAt { get; set; }

    /// <summary>
    /// Maximum number of attendees (null = unlimited).
    /// </summary>
    public int? MaxAttendees { get; set; }

    /// <summary>
    /// Optional image URL for the event.
    /// </summary>
    public string? ImageUrl { get; set; }

    /// <summary>
    /// Whether the event has been cancelled.
    /// </summary>
    public bool IsCancelled { get; set; } = false;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    // Navigation properties
    public Tenant? Tenant { get; set; }
    public User? CreatedBy { get; set; }
    public Group? Group { get; set; }
    public ICollection<EventRsvp> Rsvps { get; set; } = new List<EventRsvp>();

    /// <summary>
    /// RSVP status constants.
    /// </summary>
    public static class RsvpStatus
    {
        public const string Going = "going";
        public const string Maybe = "maybe";
        public const string NotGoing = "not_going";
    }
}
