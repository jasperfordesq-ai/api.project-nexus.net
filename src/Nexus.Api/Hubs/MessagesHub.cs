// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Nexus.Api.Services;

namespace Nexus.Api.Hubs;

/// <summary>
/// SignalR hub for real-time messaging.
/// Handles WebSocket connections and broadcasts new messages to recipients.
///
/// Client events (server → client):
/// - ReceiveMessage: New message received
/// - MessageRead: Messages in a conversation were marked as read
/// - ConversationUpdated: Conversation metadata changed
/// - UnreadCountUpdated: Total unread count changed
///
/// Server methods (client → server):
/// - JoinConversation: Subscribe to updates for a specific conversation
/// - LeaveConversation: Unsubscribe from conversation updates
/// </summary>
[Authorize]
public class MessagesHub : Hub
{
    private readonly ILogger<MessagesHub> _logger;
    private readonly IUserConnectionService _connectionService;

    public MessagesHub(ILogger<MessagesHub> logger, IUserConnectionService connectionService)
    {
        _logger = logger;
        _connectionService = connectionService;
    }

    public override async Task OnConnectedAsync()
    {
        var userId = GetUserId();
        if (userId.HasValue)
        {
            _connectionService.AddConnection(userId.Value, Context.ConnectionId);
            _logger.LogInformation("User {UserId} connected to MessagesHub with connection {ConnectionId}",
                userId.Value, Context.ConnectionId);
        }
        else
        {
            _logger.LogWarning("Unauthenticated connection attempt to MessagesHub");
        }

        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var userId = GetUserId();
        if (userId.HasValue)
        {
            _connectionService.RemoveConnection(userId.Value, Context.ConnectionId);
            _logger.LogInformation("User {UserId} disconnected from MessagesHub. Connection {ConnectionId}",
                userId.Value, Context.ConnectionId);
        }

        if (exception != null)
        {
            _logger.LogError(exception, "MessagesHub disconnection error for connection {ConnectionId}",
                Context.ConnectionId);
        }

        await base.OnDisconnectedAsync(exception);
    }

    /// <summary>
    /// Join a conversation group to receive real-time updates for that conversation.
    /// </summary>
    public async Task JoinConversation(int conversationId)
    {
        var userId = GetUserId();
        if (!userId.HasValue)
        {
            _logger.LogWarning("Unauthenticated user tried to join conversation {ConversationId}", conversationId);
            return;
        }

        var groupName = GetConversationGroupName(conversationId);
        await Groups.AddToGroupAsync(Context.ConnectionId, groupName);

        _logger.LogDebug("User {UserId} joined conversation group {GroupName}",
            userId.Value, groupName);
    }

    /// <summary>
    /// Leave a conversation group to stop receiving updates.
    /// </summary>
    public async Task LeaveConversation(int conversationId)
    {
        var groupName = GetConversationGroupName(conversationId);
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, groupName);

        _logger.LogDebug("Connection {ConnectionId} left conversation group {GroupName}",
            Context.ConnectionId, groupName);
    }

    /// <summary>
    /// Gets the group name for a conversation.
    /// </summary>
    public static string GetConversationGroupName(int conversationId)
    {
        return $"conversation_{conversationId}";
    }

    private int? GetUserId()
    {
        var userIdClaim = Context.User?.FindFirst("sub")?.Value;
        if (int.TryParse(userIdClaim, out var userId))
        {
            return userId;
        }
        return null;
    }
}
