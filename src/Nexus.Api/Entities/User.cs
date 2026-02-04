using System.ComponentModel.DataAnnotations;

namespace Nexus.Api.Entities;

/// <summary>
/// Represents a user in the system.
/// Users are scoped to a single tenant.
/// Uses optimistic concurrency via RowVersion to prevent concurrent XP/balance updates.
/// </summary>
public class User : ITenantEntity
{
    public int Id { get; set; }
    public int TenantId { get; set; }
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string Role { get; set; } = "member";
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? LastLoginAt { get; set; }

    // Suspension tracking (for admin)
    public DateTime? SuspendedAt { get; set; }
    public string? SuspensionReason { get; set; }
    public int? SuspendedByUserId { get; set; }

    /// <summary>
    /// Total XP earned by the user.
    /// </summary>
    public int TotalXp { get; set; } = 0;

    /// <summary>
    /// Current level based on XP.
    /// </summary>
    public int Level { get; set; } = 1;

    /// <summary>
    /// Optimistic concurrency token - automatically updated on each save.
    /// Prevents lost updates when concurrent operations modify user data (e.g., XP, balance).
    /// </summary>
    [Timestamp]
    public byte[]? RowVersion { get; set; }

    // Navigation
    public Tenant? Tenant { get; set; }
    public ICollection<UserBadge> UserBadges { get; set; } = new List<UserBadge>();
    public ICollection<XpLog> XpLogs { get; set; } = new List<XpLog>();

    /// <summary>
    /// Calculate level from XP. Each level requires progressively more XP.
    /// Level 1: 0 XP, Level 2: 100 XP, Level 3: 250 XP, etc.
    /// Formula: XP needed for level N = 50 * N * (N - 1)
    /// </summary>
    public static int CalculateLevelFromXp(int xp)
    {
        if (xp < 0) return 1;

        int level = 1;
        while (GetXpRequiredForLevel(level + 1) <= xp)
        {
            level++;
        }
        return level;
    }

    /// <summary>
    /// Get the XP required to reach a specific level.
    /// </summary>
    public static int GetXpRequiredForLevel(int level)
    {
        if (level <= 1) return 0;
        return 50 * level * (level - 1);
    }
}
