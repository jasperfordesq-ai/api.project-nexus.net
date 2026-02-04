namespace Nexus.Contracts.Events;

/// <summary>
/// Published when an admin reactivates a suspended user.
/// </summary>
public class UserActivatedEvent : IntegrationEvent
{
    public override string EventType => "user.activated";

    public int UserId { get; init; }
    public int ActivatedByUserId { get; init; }
}
