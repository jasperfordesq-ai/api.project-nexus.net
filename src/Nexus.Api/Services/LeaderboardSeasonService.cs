// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

using Microsoft.EntityFrameworkCore;
using Nexus.Api.Data;
using Nexus.Api.Entities;

namespace Nexus.Api.Services;

/// <summary>
/// Service for managing leaderboard seasons and seasonal XP tracking.
/// </summary>
public class LeaderboardSeasonService
{
    private readonly NexusDbContext _db;
    private readonly TenantContext _tenantContext;
    private readonly ILogger<LeaderboardSeasonService> _logger;

    public LeaderboardSeasonService(
        NexusDbContext db,
        TenantContext tenantContext,
        ILogger<LeaderboardSeasonService> logger)
    {
        _db = db;
        _tenantContext = tenantContext;
        _logger = logger;
    }

    /// <summary>
    /// Get the currently active season, or null if none.
    /// </summary>
    public async Task<object?> GetCurrentSeasonAsync()
    {
        var now = DateTime.UtcNow;

        var season = await _db.Set<LeaderboardSeason>()
            .Where(s => s.Status == SeasonStatus.Active && s.StartsAt <= now && s.EndsAt > now)
            .Select(s => new
            {
                s.Id,
                s.Name,
                starts_at = s.StartsAt,
                ends_at = s.EndsAt,
                status = s.Status.ToString().ToLower(),
                s.PrizeDescription,
                participant_count = s.Entries.Count,
                days_remaining = (int)(s.EndsAt - now).TotalDays,
                s.CreatedAt
            })
            .FirstOrDefaultAsync();

        return season;
    }

    /// <summary>
    /// Get the leaderboard for a season with pagination.
    /// </summary>
    public async Task<(List<object> Data, int Total)?> GetSeasonLeaderboardAsync(int seasonId, int page, int limit)
    {
        var season = await _db.Set<LeaderboardSeason>().FindAsync(seasonId);
        if (season == null) return null;

        var query = _db.Set<LeaderboardEntry>()
            .Where(e => e.SeasonId == seasonId);

        var total = await query.CountAsync();

        var entries = await query
            .OrderByDescending(e => e.Score)
            .ThenBy(e => e.UserId)
            .Skip((page - 1) * limit)
            .Take(limit)
            .Select(e => new
            {
                user = new
                {
                    id = e.UserId,
                    first_name = e.User != null ? e.User.FirstName : "",
                    last_name = e.User != null ? e.User.LastName : ""
                },
                e.Score,
                e.UpdatedAt
            })
            .ToListAsync();

        var ranked = entries.Select((entry, index) => new
        {
            rank = (page - 1) * limit + index + 1,
            entry.user,
            score = entry.Score,
            updated_at = entry.UpdatedAt
        }).ToList();

        return (ranked.Cast<object>().ToList(), total);
    }

    /// <summary>
    /// Record XP earned during the current active season.
    /// Creates a leaderboard entry if one doesn't exist.
    /// </summary>
    public async Task RecordSeasonXpAsync(int userId, int amount)
    {
        var now = DateTime.UtcNow;
        var tenantId = _tenantContext.GetTenantIdOrThrow();

        var season = await _db.Set<LeaderboardSeason>()
            .FirstOrDefaultAsync(s => s.Status == SeasonStatus.Active && s.StartsAt <= now && s.EndsAt > now);

        if (season == null) return; // No active season

        var entry = await _db.Set<LeaderboardEntry>()
            .FirstOrDefaultAsync(e => e.SeasonId == season.Id && e.UserId == userId);

        if (entry == null)
        {
            entry = new LeaderboardEntry
            {
                TenantId = tenantId,
                SeasonId = season.Id,
                UserId = userId,
                Score = amount
            };
            _db.Set<LeaderboardEntry>().Add(entry);
        }
        else
        {
            entry.Score += amount;
            entry.UpdatedAt = DateTime.UtcNow;
        }

        await _db.SaveChangesAsync();

        _logger.LogDebug(
            "User {UserId} earned {Amount} season XP in season {SeasonId}. Total: {Score}",
            userId, amount, season.Id, entry.Score);
    }

    /// <summary>
    /// Admin: create a new leaderboard season.
    /// </summary>
    public async Task<LeaderboardSeason> CreateSeasonAsync(
        string name,
        DateTime startsAt,
        DateTime endsAt,
        string? prizeDescription)
    {
        var now = DateTime.UtcNow;
        var status = startsAt <= now && endsAt > now
            ? SeasonStatus.Active
            : startsAt > now
                ? SeasonStatus.Upcoming
                : SeasonStatus.Completed;

        var season = new LeaderboardSeason
        {
            TenantId = _tenantContext.GetTenantIdOrThrow(),
            Name = name,
            StartsAt = startsAt,
            EndsAt = endsAt,
            Status = status,
            PrizeDescription = prizeDescription
        };

        _db.Set<LeaderboardSeason>().Add(season);
        await _db.SaveChangesAsync();

        _logger.LogInformation("Leaderboard season '{Name}' created (ID: {Id}, Status: {Status})",
            season.Name, season.Id, season.Status);

        return season;
    }
}
