// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

using Microsoft.AspNetCore.SignalR;
using Nexus.Api.Hubs;

namespace Nexus.Api.Services;

/// <summary>
/// Interface for sending real-time message notifications via SignalR.
/// </summary>
public interface IRealTimeMessagingService
{
    /// <summary>
    /// Notify a user that they received a new message.
    /// </summary>
    Task NotifyNewMessageAsync(int recipientUserId, MessageNotification notification);

    /// <summary>
    /// Notify participants in a conversation that messages were read.
    /// </summary>
    Task NotifyMessagesReadAsync(int conversationId, int readByUserId, int markedReadCount);

    /// <summary>
    /// Notify a user that their unread count has changed.
    /// </summary>
    Task NotifyUnreadCountChangedAsync(int userId, int newUnreadCount);

    /// <summary>
    /// Broadcast a message to all participants in a conversation.
    /// </summary>
    Task BroadcastToConversationAsync(int conversationId, string eventName, object data);
}

/// <summary>
/// DTO for message notifications sent via SignalR.
/// </summary>
public class MessageNotification
{
    public int Id { get; set; }
    public int ConversationId { get; set; }
    public string Content { get; set; } = string.Empty;
    public SenderInfo Sender { get; set; } = null!;
    public bool IsRead { get; set; }
    public DateTime CreatedAt { get; set; }
}

/// <summary>
/// DTO for sender information in notifications.
/// </summary>
public class SenderInfo
{
    public int Id { get; set; }
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
}

/// <summary>
/// Service for sending real-time message notifications via SignalR.
/// </summary>
public class RealTimeMessagingService : IRealTimeMessagingService
{
    private readonly IHubContext<MessagesHub> _hubContext;
    private readonly IUserConnectionService _connectionService;
    private readonly ILogger<RealTimeMessagingService> _logger;

    public RealTimeMessagingService(
        IHubContext<MessagesHub> hubContext,
        IUserConnectionService connectionService,
        ILogger<RealTimeMessagingService> logger)
    {
        _hubContext = hubContext;
        _connectionService = connectionService;
        _logger = logger;
    }

    public async Task NotifyNewMessageAsync(int recipientUserId, MessageNotification notification)
    {
        var connectionIds = _connectionService.GetConnections(recipientUserId);
        if (connectionIds.Count == 0)
        {
            _logger.LogDebug("User {UserId} has no active connections, skipping real-time notification",
                recipientUserId);
            return;
        }

        _logger.LogInformation("Sending real-time message notification to user {UserId} ({ConnectionCount} connections)",
            recipientUserId, connectionIds.Count);

        await _hubContext.Clients.Clients(connectionIds).SendAsync("ReceiveMessage", notification);

        // Also broadcast to the conversation group (for UI updates in both participants' views)
        var groupName = MessagesHub.GetConversationGroupName(notification.ConversationId);
        await _hubContext.Clients.Group(groupName).SendAsync("ConversationUpdated", new
        {
            conversation_id = notification.ConversationId,
            last_message = new
            {
                id = notification.Id,
                content = notification.Content.Length > 100
                    ? notification.Content[..100] + "..."
                    : notification.Content,
                sender_id = notification.Sender.Id,
                is_read = notification.IsRead,
                created_at = notification.CreatedAt
            }
        });
    }

    public async Task NotifyMessagesReadAsync(int conversationId, int readByUserId, int markedReadCount)
    {
        var groupName = MessagesHub.GetConversationGroupName(conversationId);

        _logger.LogDebug("Broadcasting MessageRead event to conversation {ConversationId}", conversationId);

        await _hubContext.Clients.Group(groupName).SendAsync("MessageRead", new
        {
            conversation_id = conversationId,
            read_by_user_id = readByUserId,
            marked_read = markedReadCount
        });
    }

    public async Task NotifyUnreadCountChangedAsync(int userId, int newUnreadCount)
    {
        var connectionIds = _connectionService.GetConnections(userId);
        if (connectionIds.Count == 0)
        {
            return;
        }

        _logger.LogDebug("Sending unread count update to user {UserId}: {Count}",
            userId, newUnreadCount);

        await _hubContext.Clients.Clients(connectionIds).SendAsync("UnreadCountUpdated", new
        {
            unread_count = newUnreadCount
        });
    }

    public async Task BroadcastToConversationAsync(int conversationId, string eventName, object data)
    {
        var groupName = MessagesHub.GetConversationGroupName(conversationId);
        await _hubContext.Clients.Group(groupName).SendAsync(eventName, data);
    }
}
