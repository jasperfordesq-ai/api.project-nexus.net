namespace Nexus.Contracts.Events;

/// <summary>
/// Published when user profile information is updated.
/// </summary>
public class UserUpdatedEvent : IntegrationEvent
{
    public override string EventType => "user.updated";

    public int UserId { get; init; }
    public string? Email { get; init; }
    public string? FirstName { get; init; }
    public string? LastName { get; init; }
    public string? Role { get; init; }
    public bool? IsActive { get; init; }
}
