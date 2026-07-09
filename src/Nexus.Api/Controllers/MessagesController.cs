// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Nexus.Api.Data;
using Nexus.Api.Entities;
using Nexus.Api.Extensions;
using Nexus.Api.Services;

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
    private readonly TenantContext _tenantContext;
    private readonly ILogger<MessagesController> _logger;
    private readonly IRealTimeMessagingService _realTimeMessaging;
    private readonly FileUploadService _fileUploadService;

    public MessagesController(
        NexusDbContext db,
        TenantContext tenantContext,
        ILogger<MessagesController> logger,
        IRealTimeMessagingService realTimeMessaging,
        FileUploadService fileUploadService)
    {
        _db = db;
        _tenantContext = tenantContext;
        _logger = logger;
        _realTimeMessaging = realTimeMessaging;
        _fileUploadService = fileUploadService;
    }

    /// <summary>
    /// Get all conversations for the current user.
    /// Returns conversations with the other participant's info and last message preview.
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetConversations(
        [FromQuery] int page = 1,
        [FromQuery] int limit = 20,
        [FromQuery(Name = "per_page")] int? perPage = null)
    {
        var userId = GetCurrentUserId();
        if (userId == null)
        {
            return Unauthorized(new { error = "Invalid token" });
        }

        if (perPage.HasValue)
        {
            limit = perPage.Value;
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

            var otherUser = new
            {
                id = otherParticipant?.Id,
                name = $"{otherParticipant?.FirstName} {otherParticipant?.LastName}".Trim(),
                first_name = otherParticipant?.FirstName,
                last_name = otherParticipant?.LastName,
                avatar_url = otherParticipant?.AvatarUrl
            };

            var preview = lastMessage == null ? null : lastMessage.Content.Length > 100
                ? lastMessage.Content[..100] + "..."
                : lastMessage.Content;

            return new
            {
                id = c.Id,
                participant = new
                {
                    id = otherParticipant?.Id,
                    first_name = otherParticipant?.FirstName,
                    last_name = otherParticipant?.LastName
                },
                other_user = otherUser,
                last_message = lastMessage == null ? null : new
                {
                    id = lastMessage.Id,
                    content = preview,
                    body = preview,
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
            success = true,
            data = result,
            meta = new
            {
                per_page = limit,
                has_more = page < totalPages,
                cursor = page < totalPages ? (page + 1).ToString() : null
            },
            pagination = new
            {
                page,
                limit,
                total,
                pages = totalPages
            }
        });
    }

    /// <summary>
    /// Get messages in a specific conversation.
    /// Only accessible if user is a participant.
    /// </summary>
    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetConversation(
        int id,
        [FromQuery] int page = 1,
        [FromQuery] int limit = 50,
        [FromQuery(Name = "per_page")] int? perPage = null,
        [FromQuery] string? direction = null,
        [FromQuery] string? cursor = null)
    {
        var userId = GetCurrentUserId();
        if (userId == null)
        {
            return Unauthorized(new { error = "Invalid token" });
        }

        if (perPage.HasValue)
        {
            limit = perPage.Value;
        }

        if (page < 1) page = 1;
        if (limit < 1) limit = 1;
        if (limit > 100) limit = 100;

        if (IsLaravelV2Request())
        {
            return await GetLaravelReactConversationAsync(id, userId.Value, limit, direction, cursor);
        }

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
            other_user = new
            {
                id = otherParticipant?.Id,
                name = $"{otherParticipant?.FirstName} {otherParticipant?.LastName}".Trim(),
                first_name = otherParticipant?.FirstName,
                last_name = otherParticipant?.LastName,
                avatar_url = otherParticipant?.AvatarUrl
            },
            messages = messages.Select(m => new
            {
                id = m.Id,
                content = m.Content,
                body = m.Content,
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
                pages = totalPages
            },
            created_at = conversation.CreatedAt,
            updated_at = conversation.UpdatedAt
        });
    }

    private async Task<IActionResult> GetLaravelReactConversationAsync(
        int otherUserId,
        int currentUserId,
        int limit,
        string? direction,
        string? cursor)
    {
        var otherUser = await _db.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == otherUserId);
        if (otherUser == null)
        {
            return NotFound(new
            {
                success = false,
                code = "NOT_FOUND",
                error = "User not found"
            });
        }

        var participant1Id = Math.Min(currentUserId, otherUserId);
        var participant2Id = Math.Max(currentUserId, otherUserId);
        var conversation = await _db.Conversations
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.Participant1Id == participant1Id && c.Participant2Id == participant2Id);

        var normalizedDirection = string.Equals(direction, "newer", StringComparison.OrdinalIgnoreCase)
            ? "newer"
            : "older";
        var cursorId = DecodeCursor(cursor);

        var baseMessageQuery = _db.Messages
            .AsNoTracking()
            .Include(m => m.Sender);
        var messageQuery = conversation == null
            ? baseMessageQuery.Where(m => false)
            : baseMessageQuery.Where(m => m.ConversationId == conversation.Id);

        if (cursorId.HasValue)
        {
            messageQuery = normalizedDirection == "newer"
                ? messageQuery.Where(m => m.Id > cursorId.Value)
                : messageQuery.Where(m => m.Id < cursorId.Value);
        }

        messageQuery = normalizedDirection == "newer"
            ? messageQuery.OrderBy(m => m.Id)
            : messageQuery.OrderByDescending(m => m.Id);

        var messages = await messageQuery
            .Take(limit + 1)
            .ToListAsync();
        var hasMore = messages.Count > limit;
        if (hasMore)
        {
            messages.RemoveAt(messages.Count - 1);
        }

        if (conversation != null && (normalizedDirection != "newer" || cursorId == null))
        {
            var now = DateTime.UtcNow;
            await _db.Messages
                .Where(m => m.ConversationId == conversation.Id
                    && m.SenderId == otherUserId
                    && !m.IsRead)
                .ExecuteUpdateAsync(setters => setters
                    .SetProperty(m => m.IsRead, true)
                    .SetProperty(m => m.ReadAt, now));
        }

        var messageCount = conversation == null
            ? 0
            : await _db.Messages.CountAsync(m => m.ConversationId == conversation.Id);
        var unreadCount = conversation == null
            ? 0
            : await _db.Messages.CountAsync(m => m.ConversationId == conversation.Id
                && m.SenderId == otherUserId
                && !m.IsRead);

        return Ok(new
        {
            success = true,
            data = messages.Select(m => MapLaravelReactMessage(m, currentUserId, otherUserId)),
            meta = new
            {
                conversation = new
                {
                    id = otherUserId,
                    conversation_id = conversation?.Id,
                    other_user = new
                    {
                        id = otherUser.Id,
                        name = $"{otherUser.FirstName} {otherUser.LastName}".Trim(),
                        first_name = otherUser.FirstName,
                        last_name = otherUser.LastName,
                        avatar_url = otherUser.AvatarUrl,
                        is_online = otherUser.LastLoginAt.HasValue && otherUser.LastLoginAt.Value > DateTime.UtcNow.AddMinutes(-5)
                    },
                    unread_count = unreadCount,
                    message_count = messageCount,
                    safeguarding = (object?)null
                },
                cursor = hasMore && messages.Count > 0 ? EncodeCursor(messages[^1].Id) : null,
                per_page = limit,
                has_more = hasMore
            }
        });
    }

    private static object MapLaravelReactMessage(Message message, int currentUserId, int otherUserId)
    {
        var recipientId = message.SenderId == currentUserId ? otherUserId : currentUserId;
        return new
        {
            id = message.Id,
            conversation_id = message.ConversationId,
            sender_id = message.SenderId,
            receiver_id = recipientId,
            recipient_id = recipientId,
            content = message.Content,
            body = message.Content,
            sender = new
            {
                id = message.Sender?.Id,
                first_name = message.Sender?.FirstName,
                last_name = message.Sender?.LastName,
                avatar_url = message.Sender?.AvatarUrl
            },
            is_read = message.IsRead,
            created_at = message.CreatedAt,
            read_at = message.ReadAt
        };
    }

    private static int? DecodeCursor(string? cursor)
    {
        if (string.IsNullOrWhiteSpace(cursor))
        {
            return null;
        }

        try
        {
            var decoded = Encoding.UTF8.GetString(Convert.FromBase64String(cursor));
            return int.TryParse(decoded, out var id) ? id : null;
        }
        catch (FormatException)
        {
            return null;
        }
    }

    private static string EncodeCursor(int id) => Convert.ToBase64String(Encoding.UTF8.GetBytes(id.ToString()));

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

        if (IsLaravelV2Request())
        {
            return Ok(new
            {
                success = true,
                data = new
                {
                    count = unreadCount
                }
            });
        }

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
    public async Task<IActionResult> SendMessage(CancellationToken ct)
    {
        var (request, attachmentFiles) = await ReadSendMessageRequestAsync(ct);
        var userId = GetCurrentUserId();
        if (userId == null)
        {
            return Unauthorized(new { error = "Invalid token" });
        }

        var messageContent = request.ResolvedContent;
        var hasAttachments = attachmentFiles.Count > 0;

        // Validate content
        if (string.IsNullOrWhiteSpace(messageContent) && !hasAttachments)
        {
            return BadRequest(new { error = "Message content is required" });
        }

        if (messageContent.Length > 5000)
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
            Content = messageContent.Trim(),
            IsRead = false,
            CreatedAt = DateTime.UtcNow
        };

        _db.Messages.Add(message);

        // Update conversation timestamp
        conversation.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        var attachments = new List<object>();
        foreach (var attachmentFile in attachmentFiles)
        {
            await using var stream = attachmentFile.OpenReadStream();
            var (upload, uploadError) = await _fileUploadService.UploadAsync(
                stream,
                attachmentFile.FileName,
                string.IsNullOrWhiteSpace(attachmentFile.ContentType) ? "application/octet-stream" : attachmentFile.ContentType,
                attachmentFile.Length,
                userId.Value,
                _tenantContext.GetTenantIdOrThrow(),
                FileCategory.Message,
                message.Id,
                "message");

            if (uploadError != null)
            {
                return UnprocessableEntity(new
                {
                    errors = new[] { new { code = "VALIDATION_ERROR", message = uploadError, field = "attachments" } }
                });
            }

            var savedUpload = upload!;
            var attachment = new MessageAttachment
            {
                MessageId = message.Id,
                FileUploadId = savedUpload.Id,
                UploadedById = userId.Value,
                CreatedAt = DateTime.UtcNow
            };
            _db.MessageAttachments.Add(attachment);
            await _db.SaveChangesAsync();

            attachments.Add(MapLaravelReactAttachment(attachment, savedUpload));
        }

        // Load sender for response
        var sender = await _db.Users.FirstOrDefaultAsync(x => x.Id == userId.Value);
        if (sender == null)
        {
            return StatusCode(500, new { error = "Sender data unavailable" });
        }

        _logger.LogInformation("User {SenderId} sent message {MessageId} to user {RecipientId}",
            userId.Value, message.Id, request.RecipientId);

        // Send real-time notification to the recipient
        var notification = new MessageNotification
        {
            Id = message.Id,
            ConversationId = conversation.Id,
            Content = message.Content,
            Sender = new SenderInfo
            {
                Id = sender.Id,
                FirstName = sender.FirstName
            },
            IsRead = message.IsRead,
            CreatedAt = message.CreatedAt
        };

        // Fire-and-forget: don't block the HTTP response on SignalR delivery
        _ = Task.Run(async () =>
        {
            try
            {
                await _realTimeMessaging.NotifyNewMessageAsync(_tenantContext.GetTenantIdOrThrow(), request.RecipientId, notification);
            }
            catch (InvalidOperationException ex)
            {
                _logger.LogError(ex, "Failed to send real-time notification for message {MessageId}", message.Id);
            }
            catch (TimeoutException ex)
            {
                _logger.LogError(ex, "Failed to send real-time notification for message {MessageId}", message.Id);
            }
        });

        var responseMessage = new
        {
            id = message.Id,
            conversation_id = conversation.Id,
            sender_id = sender.Id,
            recipient_id = recipient.Id,
            content = message.Content,
            body = message.Content,
            sender = new
            {
                id = sender.Id,
                first_name = sender.FirstName,
                last_name = sender.LastName
            },
            recipient = new
            {
                id = recipient.Id,
                first_name = recipient.FirstName,
                last_name = recipient.LastName
            },
            attachments,
            is_read = message.IsRead,
            created_at = message.CreatedAt
        };

        if (IsLaravelV2Request())
        {
            return Created($"/api/v2/messages/{request.RecipientId}", new
            {
                success = true,
                data = responseMessage,
                meta = new
                {
                    base_url = $"{Request.Scheme}://{Request.Host}"
                }
            });
        }

        return CreatedAtAction(nameof(GetConversation), new { id = conversation.Id }, responseMessage);
    }

    /// <summary>
    /// Mark all messages in a conversation as read.
    /// Only marks messages from the other participant as read.
    /// </summary>
    [HttpPut("{id:int}/read")]
    public async Task<IActionResult> MarkConversationRead(int id)
    {
        var userId = GetCurrentUserId();
        if (userId == null)
        {
            return Unauthorized(new { error = "Invalid token" });
        }

        if (IsLaravelV2Request())
        {
            return await MarkLaravelReactConversationReadAsync(id, userId.Value);
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

        // Mark all unread messages from the other participant as read using batch update
        var now = DateTime.UtcNow;
        var markedCount = await _db.Messages
            .Where(m => m.ConversationId == id
                && m.SenderId != userId.Value
                && !m.IsRead)
            .ExecuteUpdateAsync(setters => setters
                .SetProperty(m => m.IsRead, true)
                .SetProperty(m => m.ReadAt, now));

        _logger.LogInformation("User {UserId} marked {Count} messages as read in conversation {ConversationId}",
            userId.Value, markedCount, id);

        // Notify the other participant that messages were read
        if (markedCount > 0)
        {
            _ = Task.Run(async () =>
            {
                try
                {
                    await _realTimeMessaging.NotifyMessagesReadAsync(id, userId.Value, markedCount);
                }
                catch (InvalidOperationException ex)
                {
                    _logger.LogError(ex, "Failed to send read notification for conversation {ConversationId}", id);
                }
                catch (TimeoutException ex)
                {
                    _logger.LogError(ex, "Failed to send read notification for conversation {ConversationId}", id);
                }
            });
        }

        return Ok(new
        {
            conversation_id = id,
            marked_read = markedCount
        });
    }

    private async Task<IActionResult> MarkLaravelReactConversationReadAsync(int otherUserId, int currentUserId)
    {
        var participant1Id = Math.Min(currentUserId, otherUserId);
        var participant2Id = Math.Max(currentUserId, otherUserId);
        var conversation = await _db.Conversations
            .FirstOrDefaultAsync(c => c.Participant1Id == participant1Id && c.Participant2Id == participant2Id);

        if (conversation == null)
        {
            return Ok(new
            {
                success = true,
                data = new
                {
                    marked_read = 0
                }
            });
        }

        var now = DateTime.UtcNow;
        var markedCount = await _db.Messages
            .Where(m => m.ConversationId == conversation.Id
                && m.SenderId == otherUserId
                && !m.IsRead)
            .ExecuteUpdateAsync(setters => setters
                .SetProperty(m => m.IsRead, true)
                .SetProperty(m => m.ReadAt, now));

        _logger.LogInformation("User {UserId} marked {Count} messages as read from user {OtherUserId}",
            currentUserId, markedCount, otherUserId);

        if (markedCount > 0)
        {
            _ = Task.Run(async () =>
            {
                try
                {
                    await _realTimeMessaging.NotifyMessagesReadAsync(conversation.Id, currentUserId, markedCount);
                }
                catch (InvalidOperationException ex)
                {
                    _logger.LogError(ex, "Failed to send read notification for conversation {ConversationId}", conversation.Id);
                }
                catch (TimeoutException ex)
                {
                    _logger.LogError(ex, "Failed to send read notification for conversation {ConversationId}", conversation.Id);
                }
            });
        }

        return Ok(new
        {
            success = true,
            data = new
            {
                marked_read = markedCount,
                conversation_id = conversation.Id
            }
        });
    }

    /// <summary>GET /api/messages/reactions-batch - batch fetch emoji reactions for a list of message IDs</summary>
    [HttpGet("reactions-batch")]
    public async Task<IActionResult> GetMessageReactionsBatch([FromQuery] string? messageIds)
    {
        if (string.IsNullOrWhiteSpace(messageIds))
            return BadRequest(new { error = "messageIds query parameter is required (comma-separated)" });

        var idList = messageIds.Split(',')
            .Select(s => int.TryParse(s.Trim(), out var n) ? (int?)n : null)
            .Where(n => n.HasValue)
            .Select(n => n!.Value)
            .Distinct()
            .Take(100)
            .ToList();

        // Return empty reactions map per message — reactions are tracked on feed posts, not messages.
        // This endpoint satisfies the V1 contract; extend when MessageReaction entity is added.
        var result = idList.ToDictionary(
            id => id,
            _ => new { like = 0, love = 0, laugh = 0, total = 0 });

        return Ok(new { data = result, messageCount = idList.Count });
    }

    private bool IsLaravelV2Request() => Request.Path.StartsWithSegments("/api/v2", StringComparison.OrdinalIgnoreCase);

    private int? GetCurrentUserId() => User.GetUserId();

    private async Task<(SendMessageRequest Request, IReadOnlyList<IFormFile> Attachments)> ReadSendMessageRequestAsync(CancellationToken ct)
    {
        if (Request.HasFormContentType)
        {
            var form = await Request.ReadFormAsync(ct);
            return (new SendMessageRequest
            {
                RecipientId = ParseInt(FormValue(form, "recipient_id")),
                Body = FormValue(form, "body"),
                Content = FormValue(form, "content") ?? string.Empty,
                ListingId = ParseIntNullable(FormValue(form, "listing_id")),
                ContextType = FormValue(form, "context_type"),
                ContextId = ParseIntNullable(FormValue(form, "context_id"))
            }, ReadAttachmentFiles(form));
        }

        if (Request.ContentLength is 0 or null)
        {
            return (new SendMessageRequest(), []);
        }

        var request = await JsonSerializer.DeserializeAsync<SendMessageRequest>(Request.Body, new JsonSerializerOptions(JsonSerializerDefaults.Web), ct)
            ?? new SendMessageRequest();
        return (request, []);
    }

    private static IReadOnlyList<IFormFile> ReadAttachmentFiles(IFormCollection form)
    {
        var files = form.Files.GetFiles("attachments[]")
            .Concat(form.Files.GetFiles("attachments"))
            .Where(file => file.Length > 0)
            .Take(5)
            .ToArray();
        return files;
    }

    private static string? FormValue(IFormCollection form, string key)
    {
        var value = form[key].ToString();
        return string.IsNullOrWhiteSpace(value) ? null : value;
    }

    private static int ParseInt(string? value) =>
        int.TryParse(value, out var parsed) ? parsed : 0;

    private static int? ParseIntNullable(string? value) =>
        int.TryParse(value, out var parsed) ? parsed : null;

    private object MapLaravelReactAttachment(MessageAttachment attachment, FileUpload upload) => new
    {
        id = attachment.Id,
        message_id = attachment.MessageId,
        file_upload_id = upload.Id,
        original_filename = upload.OriginalFilename,
        file_name = upload.OriginalFilename,
        content_type = upload.ContentType,
        mime_type = upload.ContentType,
        file_size_bytes = upload.FileSizeBytes,
        file_size = upload.FileSizeBytes,
        url = _fileUploadService.GetDownloadUrl(upload),
        created_at = attachment.CreatedAt
    };
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

    [JsonPropertyName("body")]
    public string? Body { get; set; }

    [JsonPropertyName("listing_id")]
    public int? ListingId { get; set; }

    [JsonPropertyName("context_type")]
    public string? ContextType { get; set; }

    [JsonPropertyName("context_id")]
    public int? ContextId { get; set; }

    public string ResolvedContent => string.IsNullOrWhiteSpace(Content) ? Body ?? string.Empty : Content;
}
