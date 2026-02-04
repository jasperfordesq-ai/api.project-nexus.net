namespace Nexus.Contracts.Events;

/// <summary>
/// Published when an admin suspends a user.
/// </summary>
public class UserSuspendedEvent : IntegrationEvent
{
    public override string EventType => "user.suspended";

    public int UserId { get; init; }
    public int SuspendedByUserId { get; init; }
    public string? Reason { get; init; }
}
