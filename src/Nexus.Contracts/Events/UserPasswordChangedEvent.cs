namespace Nexus.Contracts.Events;

/// <summary>
/// Published when a user's password is changed or reset.
/// Does NOT contain the password hash - just notification.
/// </summary>
public class UserPasswordChangedEvent : IntegrationEvent
{
    public override string EventType => "user.password_changed";

    public int UserId { get; init; }

    /// <summary>
    /// Whether this was a reset (via token) or a regular change.
    /// </summary>
    public bool WasReset { get; init; }
}
