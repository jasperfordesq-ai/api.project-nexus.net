// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

using Microsoft.EntityFrameworkCore;
using Nexus.Api.Data;
using Nexus.Api.Entities;

namespace Nexus.Api.Services;

/// <summary>
/// Service for handling gamification logic - XP awards, level ups, and badge checks.
/// </summary>
public class GamificationService
{
    private readonly NexusDbContext _db;
    private readonly ILogger<GamificationService> _logger;

    public GamificationService(NexusDbContext db, ILogger<GamificationService> logger)
    {
        _db = db;
        _logger = logger;
    }

    /// <summary>
    /// Award XP to a user and check for level up.
    /// </summary>
    public async Task<XpAwardResult> AwardXpAsync(int userId, int amount, string source, int? referenceId = null, string? description = null)
    {
        var user = await _db.Users.FindAsync(userId);
        if (user == null)
        {
            return new XpAwardResult { Success = false, Error = "User not found" };
        }

        var previousLevel = user.Level;
        var previousXp = user.TotalXp;

        // Create XP log entry
        var xpLog = new XpLog
        {
            UserId = userId,
            Amount = amount,
            Source = source,
            ReferenceId = referenceId,
            Description = description
        };
        _db.XpLogs.Add(xpLog);

        // Update user's total XP
        user.TotalXp += amount;
        if (user.TotalXp < 0) user.TotalXp = 0; // Prevent negative XP

        // Recalculate level
        var newLevel = User.CalculateLevelFromXp(user.TotalXp);
        var leveledUp = newLevel > previousLevel;
        user.Level = newLevel;

        await _db.SaveChangesAsync();

        _logger.LogInformation(
            "User {UserId} awarded {Amount} XP for {Source}. Total: {TotalXp}, Level: {Level}",
            userId, amount, source, user.TotalXp, user.Level);

        if (leveledUp)
        {
            _logger.LogInformation("User {UserId} leveled up from {OldLevel} to {NewLevel}!", userId, previousLevel, newLevel);
        }

        return new XpAwardResult
        {
            Success = true,
            Amount = amount,
            PreviousXp = previousXp,
            NewXp = user.TotalXp,
            PreviousLevel = previousLevel,
            NewLevel = newLevel,
            LeveledUp = leveledUp
        };
    }

    /// <summary>
    /// Award a badge to a user if they don't already have it.
    /// </summary>
    public async Task<BadgeAwardResult> AwardBadgeAsync(int userId, string badgeSlug)
    {
        // Find the badge
        var badge = await _db.Badges.FirstOrDefaultAsync(b => b.Slug == badgeSlug && b.IsActive);
        if (badge == null)
        {
            return new BadgeAwardResult { Success = false, Error = "Badge not found" };
        }

        // Check if user already has this badge
        var existingBadge = await _db.UserBadges
            .FirstOrDefaultAsync(ub => ub.UserId == userId && ub.BadgeId == badge.Id);

        if (existingBadge != null)
        {
            return new BadgeAwardResult { Success = false, Error = "User already has this badge", AlreadyEarned = true };
        }

        // Award the badge
        var userBadge = new UserBadge
        {
            UserId = userId,
            BadgeId = badge.Id
        };
        _db.UserBadges.Add(userBadge);
        await _db.SaveChangesAsync();

        _logger.LogInformation("User {UserId} earned badge '{BadgeSlug}' ({BadgeName})", userId, badgeSlug, badge.Name);

        // Award XP for earning the badge
        XpAwardResult? xpResult = null;
        if (badge.XpReward > 0)
        {
            xpResult = await AwardXpAsync(
                userId,
                badge.XpReward,
                XpLog.Sources.BadgeEarned,
                badge.Id,
                $"Earned badge: {badge.Name}");
        }

        return new BadgeAwardResult
        {
            Success = true,
            Badge = badge,
            XpAwarded = xpResult
        };
    }

    /// <summary>
    /// Check and award badges based on user's actions.
    /// Call this after relevant actions to auto-award badges.
    /// </summary>
    public async Task CheckAndAwardBadgesAsync(int userId, string action)
    {
        switch (action)
        {
            case "listing_created":
                await CheckFirstListingBadge(userId);
                break;
            case "connection_accepted":
                await CheckFirstConnectionBadge(userId);
                await CheckCommunityBuilderBadge(userId);
                break;
            case "transaction_completed":
                await CheckFirstTransactionBadge(userId);
                await CheckHelpfulNeighborBadge(userId);
                break;
            case "post_created":
                await CheckFirstPostBadge(userId);
                break;
            case "event_created":
                await CheckFirstEventBadge(userId);
                await CheckEventOrganizerBadge(userId);
                break;
            case "group_created":
                await CheckCommunityBuilderBadge(userId);
                break;
            case "post_liked":
                await CheckPopularPostBadge(userId);
                break;
            case "account_anniversary":
                await CheckVeteranBadge(userId);
                break;
        }
    }

    private async Task CheckFirstListingBadge(int userId)
    {
        var listingCount = await _db.Listings.CountAsync(l => l.UserId == userId);
        if (listingCount == 1) // First listing just created
        {
            await AwardBadgeAsync(userId, Badge.Slugs.FirstListing);
        }
    }

    private async Task CheckFirstConnectionBadge(int userId)
    {
        var connectionCount = await _db.Connections
            .CountAsync(c => (c.RequesterId == userId || c.AddresseeId == userId) && c.Status == "accepted");
        if (connectionCount == 1)
        {
            await AwardBadgeAsync(userId, Badge.Slugs.FirstConnection);
        }
    }

    private async Task CheckFirstTransactionBadge(int userId)
    {
        var transactionCount = await _db.Transactions
            .CountAsync(t => (t.SenderId == userId || t.ReceiverId == userId) && t.Status == TransactionStatus.Completed);
        if (transactionCount == 1)
        {
            await AwardBadgeAsync(userId, Badge.Slugs.FirstTransaction);
        }
    }

    private async Task CheckFirstPostBadge(int userId)
    {
        var postCount = await _db.FeedPosts.CountAsync(p => p.UserId == userId);
        if (postCount == 1)
        {
            await AwardBadgeAsync(userId, Badge.Slugs.FirstPost);
        }
    }

    private async Task CheckFirstEventBadge(int userId)
    {
        var eventCount = await _db.Events.CountAsync(e => e.CreatedById == userId);
        if (eventCount == 1)
        {
            await AwardBadgeAsync(userId, Badge.Slugs.FirstEvent);
        }
    }

    private async Task CheckHelpfulNeighborBadge(int userId)
    {
        var transactionCount = await _db.Transactions
            .CountAsync(t => (t.SenderId == userId || t.ReceiverId == userId) && t.Status == TransactionStatus.Completed);
        if (transactionCount >= 10)
        {
            await AwardBadgeAsync(userId, Badge.Slugs.HelpfulNeighbor);
        }
    }

    private async Task CheckCommunityBuilderBadge(int userId)
    {
        var groupCount = await _db.Groups.CountAsync(g => g.CreatedById == userId);
        if (groupCount >= 1)
        {
            await AwardBadgeAsync(userId, Badge.Slugs.CommunityBuilder);
        }
    }

    private async Task CheckEventOrganizerBadge(int userId)
    {
        var eventCount = await _db.Events.CountAsync(e => e.CreatedById == userId);
        if (eventCount >= 5)
        {
            await AwardBadgeAsync(userId, Badge.Slugs.EventOrganizer);
        }
    }

    private async Task CheckPopularPostBadge(int userId)
    {
        // Check if user has any post with 10+ likes
        var hasPopularPost = await _db.FeedPosts
            .Where(p => p.UserId == userId)
            .AnyAsync(p => p.Likes.Count >= 10);

        if (hasPopularPost)
        {
            await AwardBadgeAsync(userId, Badge.Slugs.PopularPost);
        }
    }

    private async Task CheckVeteranBadge(int userId)
    {
        var user = await _db.Users.FindAsync(userId);
        if (user != null && user.CreatedAt <= DateTime.UtcNow.AddYears(-1))
        {
            await AwardBadgeAsync(userId, Badge.Slugs.Veteran);
        }
    }
}

public class XpAwardResult
{
    public bool Success { get; set; }
    public string? Error { get; set; }
    public int Amount { get; set; }
    public int PreviousXp { get; set; }
    public int NewXp { get; set; }
    public int PreviousLevel { get; set; }
    public int NewLevel { get; set; }
    public bool LeveledUp { get; set; }
}

public class BadgeAwardResult
{
    public bool Success { get; set; }
    public string? Error { get; set; }
    public bool AlreadyEarned { get; set; }
    public Badge? Badge { get; set; }
    public XpAwardResult? XpAwarded { get; set; }
}
