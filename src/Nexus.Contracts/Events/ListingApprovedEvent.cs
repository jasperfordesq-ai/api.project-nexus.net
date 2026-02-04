namespace Nexus.Contracts.Events;

/// <summary>
/// Published when an admin approves a pending listing.
/// </summary>
public class ListingApprovedEvent : IntegrationEvent
{
    public override string EventType => "listing.approved";

    public int ListingId { get; init; }
    public int ApprovedByUserId { get; init; }
}
