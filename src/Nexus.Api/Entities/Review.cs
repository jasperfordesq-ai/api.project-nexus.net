using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Nexus.Api.Entities;

public class Review : ITenantEntity
{
    public int Id { get; set; }

    // Tenant isolation
    public int TenantId { get; set; }
    public Tenant Tenant { get; set; } = null!;

    // Who wrote the review
    public int ReviewerId { get; set; }
    public User Reviewer { get; set; } = null!;

    // Target: either a User or a Listing (one must be set)
    public int? TargetUserId { get; set; }
    public User? TargetUser { get; set; }

    public int? TargetListingId { get; set; }
    public Listing? TargetListing { get; set; }

    // Review content
    [Range(1, 5)]
    public int Rating { get; set; }

    [MaxLength(2000)]
    public string? Comment { get; set; }

    // Timestamps
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
}
