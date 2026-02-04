namespace Nexus.Api.Entities;

/// <summary>
/// Represents a message within a conversation.
/// Implements tenant isolation via ITenantEntity.
/// </summary>
public class Message : ITenantEntity
{
    public int Id { get; set; }
    public int TenantId { get; set; }
    public int ConversationId { get; set; }
    public int SenderId { get; set; }
    public string Content { get; set; } = string.Empty;
    public bool IsRead { get; set; } = false;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ReadAt { get; set; }

    // Navigation properties
    public Tenant? Tenant { get; set; }
    public Conversation? Conversation { get; set; }
    public User? Sender { get; set; }
}
