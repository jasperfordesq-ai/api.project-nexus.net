using System.ComponentModel.DataAnnotations;

namespace Nexus.Api.Entities;

/// <summary>
/// Represents a time credit transaction between users.
/// Implements tenant isolation via ITenantEntity.
/// Uses optimistic concurrency via RowVersion to prevent concurrent modification issues.
/// </summary>
public class Transaction : ITenantEntity
{
    public int Id { get; set; }
    public int TenantId { get; set; }
    public int SenderId { get; set; }
    public int ReceiverId { get; set; }
    public decimal Amount { get; set; }
    public string? Description { get; set; }
    public int? ListingId { get; set; }
    public TransactionStatus Status { get; set; } = TransactionStatus.Completed;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    /// <summary>
    /// Optimistic concurrency token - automatically updated on each save.
    /// Prevents lost updates when concurrent transactions modify the same record.
    /// </summary>
    [Timestamp]
    public byte[]? RowVersion { get; set; }

    // Navigation properties
    public Tenant? Tenant { get; set; }
    public User? Sender { get; set; }
    public User? Receiver { get; set; }
    public Listing? Listing { get; set; }
}

/// <summary>
/// Status of a transaction.
/// </summary>
public enum TransactionStatus
{
    Pending,
    Completed,
    Cancelled,
    Disputed,
    Refunded
}
