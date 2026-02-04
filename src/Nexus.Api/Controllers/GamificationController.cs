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
/// Gamification controller - XP, levels, badges, and leaderboards.
/// Phase 13: Gamification system.
/// </summary>
[ApiController]
[Route("api/gamification")]
[Authorize]
public class GamificationController : ControllerBase
{
    private readonly NexusDbContext _db;
    private readonly ILogger<GamificationController> _logger;

    public GamificationController(NexusDbContext db, ILogger<GamificationController> logger)
    {
        _db = db;
        _logger = logger;
    }

    /// <summary>
    /// GET /api/gamification/profile - Get current user's gamification profile.
    /// </summary>
    [HttpGet("profile")]
    public async Task<IActionResult> GetProfile()
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        var user = await _db.Users
            .Where(u => u.Id == userId)
            .Select(u => new
            {
                u.Id,
                u.FirstName,
                u.LastName,
                u.TotalXp,
                u.Level,
                xp_to_next_level = Entities.User.GetXpRequiredForLevel(u.Level + 1) - u.TotalXp,
                xp_required_for_current_level = Entities.User.GetXpRequiredForLevel(u.Level),
                xp_required_for_next_level = Entities.User.GetXpRequiredForLevel(u.Level + 1),
                badges_earned = u.UserBadges.Count
            })
            .FirstOrDefaultAsync();

        if (user == null)
        {
            return NotFound(new { error = "User not found" });
        }

        // Get recent XP activity
        var recentXp = await _db.XpLogs
            .Where(x => x.UserId == userId)
            .OrderByDescending(x => x.CreatedAt)
            .Take(10)
            .Select(x => new
            {
                x.Amount,
                x.Source,
                x.Description,
                x.CreatedAt
            })
            .ToListAsync();

        return Ok(new
        {
            profile = user,
            recent_xp = recentXp
        });
    }

    /// <summary>
    /// GET /api/gamification/profile/{userId} - Get another user's gamification profile.
    /// </summary>
    [HttpGet("profile/{userId}")]
    public async Task<IActionResult> GetUserProfile(int userId)
    {
        var currentUserId = GetCurrentUserId();
        if (currentUserId == null) return Unauthorized();

        var user = await _db.Users
            .Where(u => u.Id == userId)
            .Select(u => new
            {
                u.Id,
                u.FirstName,
                u.LastName,
                u.TotalXp,
                u.Level,
                badges_earned = u.UserBadges.Count
            })
            .FirstOrDefaultAsync();

        if (user == null)
        {
            return NotFound(new { error = "User not found" });
        }

        return Ok(user);
    }

    /// <summary>
    /// GET /api/gamification/badges - Get all available badges.
    /// </summary>
    [HttpGet("badges")]
    public async Task<IActionResult> GetBadges()
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        var badges = await _db.Badges
            .Where(b => b.IsActive)
            .OrderBy(b => b.SortOrder)
            .ThenBy(b => b.Name)
            .Select(b => new
            {
                b.Id,
                b.Slug,
                b.Name,
                b.Description,
                b.Icon,
                b.XpReward,
                is_earned = b.UserBadges.Any(ub => ub.UserId == userId),
                earned_at = b.UserBadges
                    .Where(ub => ub.UserId == userId)
                    .Select(ub => (DateTime?)ub.EarnedAt)
                    .FirstOrDefault()
            })
            .ToListAsync();

        var earnedCount = badges.Count(b => b.is_earned);

        return Ok(new
        {
            data = badges,
            summary = new
            {
                total = badges.Count,
                earned = earnedCount,
                progress_percent = badges.Count > 0 ? Math.Round((double)earnedCount / badges.Count * 100, 1) : 0
            }
        });
    }

    /// <summary>
    /// GET /api/gamification/badges/my - Get current user's earned badges.
    /// </summary>
    [HttpGet("badges/my")]
    public async Task<IActionResult> GetMyBadges()
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        var badges = await _db.UserBadges
            .Where(ub => ub.UserId == userId)
            .OrderByDescending(ub => ub.EarnedAt)
            .Select(ub => new
            {
                ub.Badge!.Id,
                ub.Badge.Slug,
                ub.Badge.Name,
                ub.Badge.Description,
                ub.Badge.Icon,
                ub.Badge.XpReward,
                ub.EarnedAt
            })
            .ToListAsync();

        return Ok(new
        {
            data = badges,
            total = badges.Count
        });
    }

    /// <summary>
    /// GET /api/gamification/leaderboard - Get XP leaderboard.
    /// </summary>
    [HttpGet("leaderboard")]
    public async Task<IActionResult> GetLeaderboard(
        [FromQuery] int page = 1,
        [FromQuery] int limit = 20,
        [FromQuery] string period = "all")
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        if (page < 1) page = 1;
        if (limit < 1) limit = 1;
        if (limit > 100) limit = 100;

        IQueryable<User> query = _db.Users.Where(u => u.IsActive);

        // For period-based leaderboards, we calculate XP earned in that period
        DateTime? periodStart = period.ToLower() switch
        {
            "week" => DateTime.UtcNow.AddDays(-7),
            "month" => DateTime.UtcNow.AddDays(-30),
            "year" => DateTime.UtcNow.AddDays(-365),
            _ => null
        };

        int total;
        object leaderboard;

        if (periodStart.HasValue)
        {
            // Period-based: sum XP from xp_logs in period
            var periodLeaderboard = await _db.XpLogs
                .Where(x => x.CreatedAt >= periodStart.Value)
                .GroupBy(x => x.UserId)
                .Select(g => new
                {
                    UserId = g.Key,
                    PeriodXp = g.Sum(x => x.Amount)
                })
                .OrderByDescending(x => x.PeriodXp)
                .Skip((page - 1) * limit)
                .Take(limit)
                .ToListAsync();

            var userIds = periodLeaderboard.Select(x => x.UserId).ToList();
            var users = await _db.Users
                .Where(u => userIds.Contains(u.Id))
                .ToDictionaryAsync(u => u.Id);

            total = await _db.XpLogs
                .Where(x => x.CreatedAt >= periodStart.Value)
                .Select(x => x.UserId)
                .Distinct()
                .CountAsync();

            leaderboard = periodLeaderboard
                .Select((x, index) => new
                {
                    rank = (page - 1) * limit + index + 1,
                    user = new
                    {
                        id = x.UserId,
                        first_name = users.TryGetValue(x.UserId, out var u) ? u.FirstName : "",
                        last_name = users.TryGetValue(x.UserId, out var u2) ? u2.LastName : ""
                    },
                    period_xp = x.PeriodXp,
                    total_xp = users.TryGetValue(x.UserId, out var u3) ? u3.TotalXp : 0,
                    level = users.TryGetValue(x.UserId, out var u4) ? u4.Level : 1
                })
                .ToList();
        }
        else
        {
            // All-time: use TotalXp from users
            total = await query.CountAsync();

            var usersData = await query
                .OrderByDescending(u => u.TotalXp)
                .ThenBy(u => u.Id) // Secondary sort for consistency
                .Skip((page - 1) * limit)
                .Take(limit)
                .Select(u => new
                {
                    user = new
                    {
                        id = u.Id,
                        first_name = u.FirstName,
                        last_name = u.LastName
                    },
                    total_xp = u.TotalXp,
                    level = u.Level,
                    badges_earned = u.UserBadges.Count
                })
                .ToListAsync();

            // Set ranks manually since EF Core doesn't support row_number in projection
            leaderboard = usersData
                .Select((item, index) => new
                {
                    rank = (page - 1) * limit + index + 1,
                    item.user,
                    item.total_xp,
                    item.level,
                    item.badges_earned
                })
                .ToList();
        }

        // Get current user's rank
        int? currentUserRank = null;
        if (periodStart.HasValue)
        {
            var userPeriodXp = await _db.XpLogs
                .Where(x => x.UserId == userId && x.CreatedAt >= periodStart.Value)
                .SumAsync(x => x.Amount);

            currentUserRank = await _db.XpLogs
                .Where(x => x.CreatedAt >= periodStart.Value)
                .GroupBy(x => x.UserId)
                .CountAsync(g => g.Sum(x => x.Amount) > userPeriodXp) + 1;
        }
        else
        {
            var currentUser = await _db.Users.FindAsync(userId);
            if (currentUser != null)
            {
                currentUserRank = await _db.Users
                    .Where(u => u.IsActive)
                    .CountAsync(u => u.TotalXp > currentUser.TotalXp) + 1;
            }
        }

        var totalPages = (int)Math.Ceiling(total / (double)limit);

        return Ok(new
        {
            data = leaderboard,
            current_user_rank = currentUserRank,
            period,
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
    /// GET /api/gamification/xp-history - Get XP history for current user.
    /// </summary>
    [HttpGet("xp-history")]
    public async Task<IActionResult> GetXpHistory(
        [FromQuery] int page = 1,
        [FromQuery] int limit = 20)
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        if (page < 1) page = 1;
        if (limit < 1) limit = 1;
        if (limit > 100) limit = 100;

        var total = await _db.XpLogs.CountAsync(x => x.UserId == userId);
        var totalPages = (int)Math.Ceiling(total / (double)limit);

        var history = await _db.XpLogs
            .Where(x => x.UserId == userId)
            .OrderByDescending(x => x.CreatedAt)
            .Skip((page - 1) * limit)
            .Take(limit)
            .Select(x => new
            {
                x.Id,
                x.Amount,
                x.Source,
                x.ReferenceId,
                x.Description,
                x.CreatedAt
            })
            .ToListAsync();

        return Ok(new
        {
            data = history,
            pagination = new
            {
                page,
                limit,
                total,
                total_pages = totalPages
            }
        });
    }

    private int? GetCurrentUserId() => User.GetUserId();
}
