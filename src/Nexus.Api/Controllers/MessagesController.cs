// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Nexus.Api.Data;
using Nexus.Api.Entities;
using Nexus.Api.Extensions;

namespace Nexus.Api.Controllers;

/// <summary>
/// Messages controller - conversations and message history.
/// Phase 6: READ operations. Phase 7: WRITE operations.
/// </summary>
[ApiController]
[Route("api/messages")]
[Authorize]
public class MessagesController : ControllerBase
{
    private readonly NexusDbContext _db;
    private readonly ILogger<MessagesController> _logger;

    public MessagesController(NexusDbContext db, ILogger<MessagesController> logger)
    {
        _db = db;
        _logger = logger;
    }

    /// <summary>
    /// Get all conversations for the current user.
    /// Returns conversations with the other participant's info and last message preview.
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetConversations(
        [FromQuery] int page = 1,
        [FromQuery] int limit = 20)
    {
        var userId = GetCurrentUserId();
        if (userId == null)
        {
            return Unauthorized(new { error = "Invalid token" });
        }

        if (page < 1) page = 1;
        if (limit < 1) limit = 1;
        if (limit > 100) limit = 100;

        // Get conversations where user is a participant
        var query = _db.Conversations
            .Include(c => c.Participant1)
            .Include(c => c.Participant2)
            .Include(c => c.Messages.OrderByDescending(m => m.CreatedAt).Take(1))
            .Where(c => c.Participant1Id == userId.Value || c.Participant2Id == userId.Value)
            .OrderByDescending(c => c.UpdatedAt ?? c.CreatedAt);

        var total = await query.CountAsync();
        var totalPages = (int)Math.Ceiling(total / (double)limit);

        var conversations = await query
            .Skip((page - 1) * limit)
            .Take(limit)
            .ToListAsync();

        // Get unread counts for each conversation
        var conversationIds = conversations.Select(c => c.Id).ToList();
        var unreadCounts = await _db.Messages
            .Where(m => conversationIds.Contains(m.ConversationId)
                && m.SenderId != userId.Value
                && !m.IsRead)
            .GroupBy(m => m.ConversationId)
            .Select(g => new { ConversationId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.ConversationId, x => x.Count);

        var result = conversations.Select(c =>
        {
            var otherParticipant = c.Participant1Id == userId.Value ? c.Participant2 : c.Participant1;
            var lastMessage = c.Messages.FirstOrDefault();
            unreadCounts.TryGetValue(c.Id, out var unreadCount);

            return new
            {
                id = c.Id,
                participant = new
                {
                    id = otherParticipant?.Id,
                    first_name = otherParticipant?.FirstName,
                    last_name = otherParticipant?.LastName
                },
                last_message = lastMessage == null ? null : new
                {
                    id = lastMessage.Id,
                    content = lastMessage.Content.Length > 100
                        ? lastMessage.Content[..100] + "..."
                        : lastMessage.Content,
                    sender_id = lastMessage.SenderId,
                    is_read = lastMessage.IsRead,
                    created_at = lastMessage.CreatedAt
                },
                unread_count = unreadCount,
                created_at = c.CreatedAt,
                updated_at = c.UpdatedAt
            };
        });

        return Ok(new
        {
            data = result,
            pagination = new
            {
                page,
                limit,
                total,
                total_pages = totalPages
            }
        });
    }

    /// <summary>
    /// Get messages in a specific conversation.
    /// Only accessible if user is a participant.
    /// </summary>
    [HttpGet("{id}")]
    public async Task<IActionResult> GetConversation(
        int id,
        [FromQuery] int page = 1,
        [FromQuery] int limit = 50)
    {
        var userId = GetCurrentUserId();
        if (userId == null)
        {
            return Unauthorized(new { error = "Invalid token" });
        }

        if (page < 1) page = 1;
        if (limit < 1) limit = 1;
        if (limit > 100) limit = 100;

        // Get conversation and verify user is a participant
        var conversation = await _db.Conversations
            .Include(c => c.Participant1)
            .Include(c => c.Participant2)
            .FirstOrDefaultAsync(c => c.Id == id);

        if (conversation == null)
        {
            return NotFound(new { error = "Conversation not found" });
        }

        // Security check: user must be a participant
        if (conversation.Participant1Id != userId.Value && conversation.Participant2Id != userId.Value)
        {
            return NotFound(new { error = "Conversation not found" });
        }

        var otherParticipant = conversation.Participant1Id == userId.Value
            ? conversation.Participant2
            : conversation.Participant1;

        // Get messages with pagination (newest first)
        var messageQuery = _db.Messages
            .Include(m => m.Sender)
            .Where(m => m.ConversationId == id)
            .OrderByDescending(m => m.CreatedAt);

        var total = await messageQuery.CountAsync();
        var totalPages = (int)Math.Ceiling(total / (double)limit);

        var messages = await messageQuery
            .Skip((page - 1) * limit)
            .Take(limit)
            .ToListAsync();

        return Ok(new
        {
            id = conversation.Id,
            participant = new
            {
                id = otherParticipant?.Id,
                first_name = otherParticipant?.FirstName,
                last_name = otherParticipant?.LastName
            },
            messages = messages.Select(m => new
            {
                id = m.Id,
                content = m.Content,
                sender = new
                {
                    id = m.Sender?.Id,
                    first_name = m.Sender?.FirstName,
                    last_name = m.Sender?.LastName
                },
                is_read = m.IsRead,
                created_at = m.CreatedAt,
                read_at = m.ReadAt
            }),
            pagination = new
            {
                page,
                limit,
                total,
                total_pages = totalPages
            },
            created_at = conversation.CreatedAt,
            updated_at = conversation.UpdatedAt
        });
    }

    /// <summary>
    /// Get the count of unread messages for the current user.
    /// </summary>
    [HttpGet("unread-count")]
    public async Task<IActionResult> GetUnreadCount()
    {
        var userId = GetCurrentUserId();
        if (userId == null)
        {
            return Unauthorized(new { error = "Invalid token" });
        }

        // Get conversation IDs where user is a participant
        var conversationIds = await _db.Conversations
            .Where(c => c.Participant1Id == userId.Value || c.Participant2Id == userId.Value)
            .Select(c => c.Id)
            .ToListAsync();

        // Count unread messages (messages from others that are not read)
        var unreadCount = await _db.Messages
            .Where(m => conversationIds.Contains(m.ConversationId)
                && m.SenderId != userId.Value
                && !m.IsRead)
            .CountAsync();

        return Ok(new
        {
            unread_count = unreadCount
        });
    }

    /// <summary>
    /// Send a message to another user.
    /// Creates a new conversation if one doesn't exist.
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> SendMessage([FromBody] SendMessageRequest request)
    {
        var userId = GetCurrentUserId();
        if (userId == null)
        {
            return Unauthorized(new { error = "Invalid token" });
        }

        // Validate content
        if (string.IsNullOrWhiteSpace(request.Content))
        {
            return BadRequest(new { error = "Message content is required" });
        }

        if (request.Content.Length > 5000)
        {
            return BadRequest(new { error = "Message content must be 5000 characters or less" });
        }

        // Validate recipient exists in same tenant
        var recipient = await _db.Users.FirstOrDefaultAsync(u => u.Id == request.RecipientId);
        if (recipient == null)
        {
            return BadRequest(new { error = "Recipient not found" });
        }

        // Cannot message yourself
        if (request.RecipientId == userId.Value)
        {
            return BadRequest(new { error = "Cannot send message to yourself" });
        }

        // Find or create conversation
        // Normalize participant order: smaller ID first
        var participant1Id = Math.Min(userId.Value, request.RecipientId);
        var participant2Id = Math.Max(userId.Value, request.RecipientId);

        var conversation = await _db.Conversations
            .FirstOrDefaultAsync(c => c.Participant1Id == participant1Id && c.Participant2Id == participant2Id);

        if (conversation == null)
        {
            conversation = new Conversation
            {
                Participant1Id = participant1Id,
                Participant2Id = participant2Id,
                CreatedAt = DateTime.UtcNow
            };
            _db.Conversations.Add(conversation);
            await _db.SaveChangesAsync();

            _logger.LogInformation("Created new conversation {ConversationId} between users {User1Id} and {User2Id}",
                conversation.Id, participant1Id, participant2Id);
        }

        // Create the message
        var message = new Message
        {
            ConversationId = conversation.Id,
            SenderId = userId.Value,
            Content = request.Content.Trim(),
            IsRead = false,
            CreatedAt = DateTime.UtcNow
        };

        _db.Messages.Add(message);

        // Update conversation timestamp
        conversation.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        // Load sender for response
        var sender = await _db.Users.FindAsync(userId.Value);

        _logger.LogInformation("User {SenderId} sent message {MessageId} to user {RecipientId}",
            userId.Value, message.Id, request.RecipientId);

        return CreatedAtAction(nameof(GetConversation), new { id = conversation.Id }, new
        {
            id = message.Id,
            conversation_id = conversation.Id,
            content = message.Content,
            sender = new
            {
                id = sender!.Id,
                first_name = sender.FirstName,
                last_name = sender.LastName
            },
            recipient = new
            {
                id = recipient.Id,
                first_name = recipient.FirstName,
                last_name = recipient.LastName
            },
            is_read = message.IsRead,
            created_at = message.CreatedAt
        });
    }

    /// <summary>
    /// Mark all messages in a conversation as read.
    /// Only marks messages from the other participant as read.
    /// </summary>
    [HttpPut("{id}/read")]
    public async Task<IActionResult> MarkConversationRead(int id)
    {
        var userId = GetCurrentUserId();
        if (userId == null)
        {
            return Unauthorized(new { error = "Invalid token" });
        }

        // Get conversation and verify user is a participant
        var conversation = await _db.Conversations
            .FirstOrDefaultAsync(c => c.Id == id);

        if (conversation == null)
        {
            return NotFound(new { error = "Conversation not found" });
        }

        // Security check: user must be a participant
        if (conversation.Participant1Id != userId.Value && conversation.Participant2Id != userId.Value)
        {
            return NotFound(new { error = "Conversation not found" });
        }

        // Mark all unread messages from the other participant as read
        var now = DateTime.UtcNow;
        var unreadMessages = await _db.Messages
            .Where(m => m.ConversationId == id
                && m.SenderId != userId.Value
                && !m.IsRead)
            .ToListAsync();

        var markedCount = unreadMessages.Count;

        foreach (var message in unreadMessages)
        {
            message.IsRead = true;
            message.ReadAt = now;
        }

        await _db.SaveChangesAsync();

        _logger.LogInformation("User {UserId} marked {Count} messages as read in conversation {ConversationId}",
            userId.Value, markedCount, id);

        return Ok(new
        {
            conversation_id = id,
            marked_read = markedCount
        });
    }

    private int? GetCurrentUserId() => User.GetUserId();
}

/// <summary>
/// Request model for sending a message.
/// </summary>
public class SendMessageRequest
{
    [JsonPropertyName("recipient_id")]
    public int RecipientId { get; set; }

    [JsonPropertyName("content")]
    public string Content { get; set; } = string.Empty;
}
