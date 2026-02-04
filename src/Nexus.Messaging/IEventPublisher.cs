using Nexus.Contracts.Events;

namespace Nexus.Messaging;

/// <summary>
/// Interface for publishing integration events to the message bus.
/// </summary>
public interface IEventPublisher
{
    /// <summary>
    /// Publishes an event to the message bus.
    /// </summary>
    /// <typeparam name="TEvent">The event type.</typeparam>
    /// <param name="event">The event to publish.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    Task PublishAsync<TEvent>(TEvent @event, CancellationToken cancellationToken = default)
        where TEvent : IntegrationEvent;
}
