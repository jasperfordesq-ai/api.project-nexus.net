// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

using Microsoft.EntityFrameworkCore;
using Nexus.Api.Data;
using Nexus.Api.Entities;

namespace Nexus.Api.Services;

/// <summary>
/// Service for tracking daily activity streaks.
/// </summary>
public class StreakService
{
    private readonly NexusDbContext _db;
    private readonly TenantContext _tenantContext;
    private readonly ILogger<StreakService> _logger;

    public StreakService(NexusDbContext db, TenantContext tenantContext, ILogger<StreakService> logger)
    {
        _db = db;
        _tenantContext = tenantContext;
        _logger = logger;
    }

    /// <summary>
    /// Record an activity for today. Creates or updates the streak.
    /// Returns the updated streak.
    /// </summary>
    public async Task<Streak> RecordActivityAsync(int userId, string streakType)
    {
        var today = DateTime.UtcNow.Date;

        var streak = await _db.Set<Streak>()
            .FirstOrDefaultAsync(s => s.UserId == userId && s.StreakType == streakType);

        if (streak == null)
        {
            // First activity of this type
            streak = new Streak
            {
                TenantId = _tenantContext.GetTenantIdOrThrow(),
                UserId = userId,
                StreakType = streakType,
                CurrentStreak = 1,
                LongestStreak = 1,
                LastActivityDate = today
            };
            _db.Set<Streak>().Add(streak);
        }
        else
        {
            var lastDate = streak.LastActivityDate.Date;

            if (lastDate == today)
            {
                // Already recorded today, no change
                return streak;
            }

            if (lastDate == today.AddDays(-1))
            {
                // Consecutive day - extend streak
                streak.CurrentStreak++;
            }
            else
            {
                // Streak broken - restart
                streak.CurrentStreak = 1;
            }

            if (streak.CurrentStreak > streak.LongestStreak)
            {
                streak.LongestStreak = streak.CurrentStreak;
            }

            streak.LastActivityDate = today;
            streak.UpdatedAt = DateTime.UtcNow;
        }

        await _db.SaveChangesAsync();

        _logger.LogInformation(
            "User {UserId} streak '{StreakType}': current={Current}, longest={Longest}",
            userId, streakType, streak.CurrentStreak, streak.LongestStreak);

        return streak;
    }

    /// <summary>
    /// Get all streaks for a user.
    /// </summary>
    public async Task<List<object>> GetUserStreaksAsync(int userId)
    {
        var today = DateTime.UtcNow.Date;

        var streaks = await _db.Set<Streak>()
            .Where(s => s.UserId == userId)
            .OrderByDescending(s => s.CurrentStreak)
            .Select(s => new
            {
                s.Id,
                streak_type = s.StreakType,
                current_streak = s.CurrentStreak,
                longest_streak = s.LongestStreak,
                last_activity_date = s.LastActivityDate,
                is_active_today = s.LastActivityDate.Date == today,
                s.CreatedAt,
                s.UpdatedAt
            })
            .ToListAsync();

        return streaks.Cast<object>().ToList();
    }

    /// <summary>
    /// Get top streakers for a given streak type.
    /// </summary>
    public async Task<List<object>> GetStreakLeaderboardAsync(string streakType, int limit)
    {
        var leaderboard = await _db.Set<Streak>()
            .Where(s => s.StreakType == streakType && s.CurrentStreak > 0)
            .OrderByDescending(s => s.CurrentStreak)
            .ThenByDescending(s => s.LongestStreak)
            .Take(limit)
            .Select(s => new
            {
                rank = 0, // Will be set below
                user = new
                {
                    id = s.UserId,
                    first_name = s.User != null ? s.User.FirstName : "",
                    last_name = s.User != null ? s.User.LastName : ""
                },
                current_streak = s.CurrentStreak,
                longest_streak = s.LongestStreak,
                last_activity_date = s.LastActivityDate
            })
            .ToListAsync();

        // Assign ranks
        var ranked = leaderboard.Select((entry, index) => new
        {
            rank = index + 1,
            entry.user,
            entry.current_streak,
            entry.longest_streak,
            entry.last_activity_date
        }).ToList();

        return ranked.Cast<object>().ToList();
    }
}
