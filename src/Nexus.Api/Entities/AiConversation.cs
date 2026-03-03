// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

namespace Nexus.Api.Entities;

/// <summary>
/// Represents an AI conversation session with message history.
/// </summary>
public class AiConversation : ITenantEntity
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public int TenantId { get; set; }

    /// <summary>
    /// Optional title for the conversation (can be AI-generated).
    /// </summary>
    public string? Title { get; set; }

    /// <summary>
    /// Conversation context/topic for AI guidance.
    /// </summary>
    public string? Context { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? LastMessageAt { get; set; }

    /// <summary>
    /// Total tokens used in this conversation (for tracking/billing).
    /// </summary>
    public int TotalTokensUsed { get; set; }

    /// <summary>
    /// Whether the conversation is active or archived.
    /// </summary>
    public bool IsActive { get; set; } = true;

    // Navigation properties
    public User? User { get; set; }
    public Tenant? Tenant { get; set; }
    public List<AiMessage> Messages { get; set; } = new();
}

/// <summary>
/// Represents a single message in an AI conversation.
/// Has its own TenantId and query filter for defense-in-depth,
/// even though it's always accessed via AiConversation navigation.
/// </summary>
public class AiMessage : ITenantEntity
{
    public int Id { get; set; }
    public int TenantId { get; set; }
    public int ConversationId { get; set; }

    /// <summary>
    /// Role of the message sender: "user", "assistant", or "system".
    /// </summary>
    public string Role { get; set; } = "user";

    /// <summary>
    /// The message content.
    /// </summary>
    public string Content { get; set; } = "";

    /// <summary>
    /// Tokens used for this specific message (for tracking).
    /// </summary>
    public int TokensUsed { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public Tenant? Tenant { get; set; }
    public AiConversation? Conversation { get; set; }
}
