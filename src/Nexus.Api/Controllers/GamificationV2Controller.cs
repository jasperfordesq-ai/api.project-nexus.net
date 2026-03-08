// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Nexus.Api.Entities;
using Nexus.Api.Extensions;
using Nexus.Api.Data;
using Nexus.Api.Services;

namespace Nexus.Api.Controllers;

/// <summary>
/// Expanded Gamification controller - challenges, streaks, seasons, and daily rewards.
/// Phase 22: Expanded Gamification.
/// </summary>
[ApiController]
[Route("api/gamification/v2")]
[Authorize]
public class GamificationV2Controller : ControllerBase
{
    private readonly ChallengeService _challengeService;
    private readonly StreakService _streakService;
    private readonly LeaderboardSeasonService _seasonService;
    private readonly DailyRewardService _dailyRewardService;
    private readonly GamificationService _gamificationService;
    private readonly TenantContext _tenantContext;
    private readonly ILogger<GamificationV2Controller> _logger;

    public GamificationV2Controller(
        ChallengeService challengeService,
        StreakService streakService,
        LeaderboardSeasonService seasonService,
        DailyRewardService dailyRewardService,
        GamificationService gamificationService,
        TenantContext tenantContext,
        ILogger<GamificationV2Controller> logger)
    {
        _challengeService = challengeService;
        _streakService = streakService;
        _seasonService = seasonService;
        _dailyRewardService = dailyRewardService;
        _gamificationService = gamificationService;
        _tenantContext = tenantContext;
        _logger = logger;
    }

    // ==================== Challenges ====================

    /// <summary>
    /// GET /api/gamification/v2/challenges - List active challenges.
    /// </summary>
    [HttpGet("challenges")]
    public async Task<IActionResult> GetChallenges(
        [FromQuery] int page = 1,
        [FromQuery] int limit = 20)
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid token" });

        if (page < 1) page = 1;
        if (limit < 1) limit = 1;
        if (limit > 100) limit = 100;

        var (data, total) = await _challengeService.GetActiveChallengesAsync(page, limit);
        var totalPages = (int)Math.Ceiling(total / (double)limit);

        return Ok(new
        {
            data,
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
    /// GET /api/gamification/v2/challenges/{id} - Get challenge detail.
    /// </summary>
    [HttpGet("challenges/{id}")]
    public async Task<IActionResult> GetChallenge(int id)
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid token" });

        var result = await _challengeService.GetChallengeAsync(id, userId);
        if (result == null) return NotFound(new { error = "Challenge not found" });

        return Ok(result);
    }

    /// <summary>
    /// POST /api/gamification/v2/challenges/{id}/join - Join a challenge.
    /// </summary>
    [HttpPost("challenges/{id}/join")]
    public async Task<IActionResult> JoinChallenge(int id)
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid token" });

        var error = await _challengeService.JoinChallengeAsync(id, userId.Value);
        if (error != null)
        {
            return BadRequest(new { error });
        }

        return Ok(new { message = "Successfully joined the challenge" });
    }

    /// <summary>
    /// GET /api/gamification/v2/challenges/my - Get my challenges.
    /// </summary>
    [HttpGet("challenges/my")]
    public async Task<IActionResult> GetMyChallenges()
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid token" });

        var challenges = await _challengeService.GetUserChallengesAsync(userId.Value);

        return Ok(new
        {
            data = challenges,
            total = challenges.Count
        });
    }

    // ==================== Streaks ====================

    /// <summary>
    /// GET /api/gamification/v2/streaks - Get my streaks.
    /// </summary>
    [HttpGet("streaks")]
    public async Task<IActionResult> GetMyStreaks()
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid token" });

        var streaks = await _streakService.GetUserStreaksAsync(userId.Value);

        return Ok(new
        {
            data = streaks,
            total = streaks.Count
        });
    }

    /// <summary>
    /// GET /api/gamification/v2/streaks/leaderboard - Streak leaderboard.
    /// </summary>
    [HttpGet("streaks/leaderboard")]
    public async Task<IActionResult> GetStreakLeaderboard(
        [FromQuery] string type = "daily_login",
        [FromQuery] int limit = 20)
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid token" });

        if (limit < 1) limit = 1;
        if (limit > 100) limit = 100;

        var leaderboard = await _streakService.GetStreakLeaderboardAsync(type, limit);

        return Ok(new
        {
            data = leaderboard,
            streak_type = type,
            total = leaderboard.Count
        });
    }

    // ==================== Seasons ====================

    /// <summary>
    /// GET /api/gamification/v2/seasons/current - Get current active season.
    /// </summary>
    [HttpGet("seasons/current")]
    public async Task<IActionResult> GetCurrentSeason()
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid token" });

        var season = await _seasonService.GetCurrentSeasonAsync();
        if (season == null) return NotFound(new { error = "No active season" });

        return Ok(season);
    }

    /// <summary>
    /// GET /api/gamification/v2/seasons/{id}/leaderboard - Season leaderboard.
    /// </summary>
    [HttpGet("seasons/{id}/leaderboard")]
    public async Task<IActionResult> GetSeasonLeaderboard(
        int id,
        [FromQuery] int page = 1,
        [FromQuery] int limit = 20)
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid token" });

        if (page < 1) page = 1;
        if (limit < 1) limit = 1;
        if (limit > 100) limit = 100;

        var result = await _seasonService.GetSeasonLeaderboardAsync(id, page, limit);
        if (result == null) return NotFound(new { error = "Season not found" });

        var (data, total) = result.Value;
        var totalPages = (int)Math.Ceiling(total / (double)limit);

        return Ok(new
        {
            data,
            pagination = new
            {
                page,
                limit,
                total,
                pages = totalPages
            }
        });
    }

    // ==================== Daily Rewards ====================

    /// <summary>
    /// POST /api/gamification/v2/daily-reward - Claim daily reward.
    /// </summary>
    [HttpPost("daily-reward")]
    public async Task<IActionResult> ClaimDailyReward()
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid token" });

        var result = await _dailyRewardService.ClaimDailyRewardAsync(userId.Value);

        if (!result.Success)
        {
            return BadRequest(new { error = result.Error });
        }

        return Ok(new
        {
            message = "Daily reward claimed!",
            day = result.Day,
            xp_awarded = result.XpAwarded,
            next_day_reward = result.NextDayReward,
            is_week_complete = result.IsWeekComplete,
            xp_result = result.XpResult != null ? new
            {
                new_xp = result.XpResult.NewXp,
                new_level = result.XpResult.NewLevel,
                leveled_up = result.XpResult.LeveledUp
            } : null
        });
    }

    /// <summary>
    /// GET /api/gamification/v2/daily-reward/status - Check daily reward status.
    /// </summary>
    [HttpGet("daily-reward/status")]
    public async Task<IActionResult> GetDailyRewardStatus()
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid token" });

        var status = await _dailyRewardService.GetDailyRewardStatusAsync(userId.Value);

        return Ok(new
        {
            available = status.Available,
            current_day = status.CurrentDay,
            next_reward_xp = status.NextRewardXp,
            streak_active = status.StreakActive,
            total_daily_xp_earned = status.TotalDailyXpEarned,
            last_claimed_at = status.LastClaimedAt,
            day_rewards = status.DayRewards
        });
    }
}
