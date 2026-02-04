namespace Nexus.Contracts.Events;

/// <summary>
/// Published when a new user is registered.
/// </summary>
public class UserCreatedEvent : IntegrationEvent
{
    public override string EventType => "user.created";

    public int UserId { get; init; }
    public string Email { get; init; } = string.Empty;
    public string FirstName { get; init; } = string.Empty;
    public string LastName { get; init; } = string.Empty;
    public string Role { get; init; } = "member";
    public bool IsActive { get; init; } = true;
}
