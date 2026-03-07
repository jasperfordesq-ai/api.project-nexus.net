// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

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
    public DateTime? UpdatedAt { get; set; }
    public DateTime? LastLoginAt { get; set; }

    /// <summary>
    /// Registration lifecycle state. Defaults to Active for backward compatibility.
    /// </summary>
    public RegistrationStatus RegistrationStatus { get; set; } = RegistrationStatus.Active;

    // Email verification
    public bool EmailVerified { get; set; }
    public string? EmailVerificationCode { get; set; }
    public DateTime? EmailVerificationCodeExpiresAt { get; set; }
    public DateTime? EmailVerifiedAt { get; set; }

    // TOTP 2FA
    public bool TwoFactorEnabled { get; set; }
    public string? TotpSecretEncrypted { get; set; }
    public DateTime? TwoFactorEnabledAt { get; set; }

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
    /// V1-aligned level thresholds. Higher levels are intentionally steeper.
    /// Index = level number: L1=0, L2=100, L3=300, ... L10=5500 (cap).
    /// </summary>
    private static readonly int[] LevelThresholds = { 0, 0, 100, 300, 600, 1000, 1500, 2200, 3000, 4000, 5500 };

    public static int MaxLevel => LevelThresholds.Length - 1;

    public static int CalculateLevelFromXp(int xp)
    {
        if (xp < 0) return 1;
        int level = 1;
        while (level < MaxLevel && GetXpRequiredForLevel(level + 1) <= xp)
            level++;
        return level;
    }

    public static int GetXpRequiredForLevel(int level)
    {
        if (level <= 1) return 0;
        if (level >= LevelThresholds.Length) return LevelThresholds[^1];
        return LevelThresholds[level];
    }
}
