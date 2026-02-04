namespace Nexus.Contracts.Events;

/// <summary>
/// Published when an admin rejects a pending listing.
/// </summary>
public class ListingRejectedEvent : IntegrationEvent
{
    public override string EventType => "listing.rejected";

    public int ListingId { get; init; }
    public int RejectedByUserId { get; init; }
    public string? Reason { get; init; }
}
