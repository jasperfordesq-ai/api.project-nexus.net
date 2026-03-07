// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

using Microsoft.EntityFrameworkCore;
using Nexus.Api.Data;
using Nexus.Api.Entities;

namespace Nexus.Api.Services;

/// <summary>
/// Service for managing polls, options, and votes.
/// Supports single-choice, multiple-choice, and ranked voting.
/// </summary>
public class PollService
{
    private readonly NexusDbContext _db;
    private readonly TenantContext _tenantContext;
    private readonly GamificationService _gamification;
    private readonly ILogger<PollService> _logger;

    public PollService(NexusDbContext db, TenantContext tenantContext, GamificationService gamification, ILogger<PollService> logger)
    {
        _db = db;
        _tenantContext = tenantContext;
        _gamification = gamification;
        _logger = logger;
    }

    public async Task<(Poll? Poll, string? Error)> CreatePollAsync(
        int userId, string title, string? description, string pollType,
        List<string> options, bool isAnonymous, bool showResults,
        int? maxChoices, int? groupId, DateTime? closesAt)
    {
        if (options.Count < 2)
            return (null, "A poll must have at least 2 options");
        if (options.Count > 20)
            return (null, "A poll cannot have more than 20 options");

        var tenantId = _tenantContext.GetTenantIdOrThrow();

        var poll = new Poll
        {
            TenantId = tenantId,
            CreatedById = userId,
            Title = title.Trim(),
            Description = description?.Trim(),
            PollType = pollType,
            IsAnonymous = isAnonymous,
            ShowResultsBeforeClose = showResults,
            MaxChoices = maxChoices,
            GroupId = groupId,
            ClosesAt = closesAt,
            Status = "active"
        };

        _db.Set<Poll>().Add(poll);
        await _db.SaveChangesAsync();

        for (int i = 0; i < options.Count; i++)
        {
            _db.Set<PollOption>().Add(new PollOption
            {
                TenantId = tenantId,
                PollId = poll.Id,
                Text = options[i].Trim(),
                SortOrder = i
            });
        }

        await _db.SaveChangesAsync();

        _logger.LogInformation("Poll {PollId} created by user {UserId}: {Title}", poll.Id, userId, title);
        return (poll, null);
    }

    public async Task<(List<Poll> Data, int Total)> ListPollsAsync(int page, int limit, string? status = null)
    {
        var query = _db.Set<Poll>().AsNoTracking();

        if (!string.IsNullOrEmpty(status))
            query = query.Where(p => p.Status == status);

        // Auto-close expired polls
        var now = DateTime.UtcNow;
        var expired = await _db.Set<Poll>()
            .Where(p => p.Status == "active" && p.ClosesAt != null && p.ClosesAt <= now)
            .ToListAsync();
        foreach (var p in expired) p.Status = "closed";
        if (expired.Count > 0) await _db.SaveChangesAsync();

        var total = await query.CountAsync();
        var data = await query
            .Include(p => p.CreatedBy)
            .Include(p => p.Options)
            .OrderByDescending(p => p.CreatedAt)
            .Skip((page - 1) * limit)
            .Take(limit)
            .ToListAsync();

        return (data, total);
    }

    public async Task<Poll?> GetPollAsync(int pollId)
    {
        return await _db.Set<Poll>()
            .Include(p => p.CreatedBy)
            .Include(p => p.Options.OrderBy(o => o.SortOrder))
            .Include(p => p.Votes)
            .FirstOrDefaultAsync(p => p.Id == pollId);
    }

    public async Task<(bool Success, string? Error)> VoteAsync(int pollId, int userId, List<int> optionIds, List<int>? ranks = null)
    {
        var poll = await _db.Set<Poll>()
            .Include(p => p.Options)
            .FirstOrDefaultAsync(p => p.Id == pollId);

        if (poll == null)
            return (false, "Poll not found");

        if (poll.Status != "active")
            return (false, "Poll is not active");

        if (poll.ClosesAt.HasValue && poll.ClosesAt <= DateTime.UtcNow)
        {
            poll.Status = "closed";
            await _db.SaveChangesAsync();
            return (false, "Poll has closed");
        }

        // Check if user already voted
        var existingVotes = await _db.Set<PollVote>()
            .AnyAsync(v => v.PollId == pollId && v.UserId == userId);
        if (existingVotes)
            return (false, "You have already voted on this poll");

        // Validate options belong to this poll
        var validOptionIds = poll.Options.Select(o => o.Id).ToHashSet();
        if (optionIds.Any(id => !validOptionIds.Contains(id)))
            return (false, "Invalid option selected");

        // Validate vote count
        if (poll.PollType == "single" && optionIds.Count != 1)
            return (false, "Single-choice poll requires exactly one selection");

        if (poll.PollType == "multiple" && poll.MaxChoices.HasValue && optionIds.Count > poll.MaxChoices.Value)
            return (false, $"Maximum {poll.MaxChoices} choices allowed");

        if (poll.PollType == "ranked" && optionIds.Count != poll.Options.Count)
            return (false, "Ranked voting requires ranking all options");

        var tenantId = _tenantContext.GetTenantIdOrThrow();

        for (int i = 0; i < optionIds.Count; i++)
        {
            _db.Set<PollVote>().Add(new PollVote
            {
                TenantId = tenantId,
                PollId = pollId,
                OptionId = optionIds[i],
                UserId = userId,
                Rank = poll.PollType == "ranked" ? (ranks != null && i < ranks.Count ? ranks[i] : i + 1) : null
            });
        }

        await _db.SaveChangesAsync();

        // Award XP for voting
        try
        {
            await _gamification.AwardXpAsync(userId, XpLog.Amounts.PollVoted, XpLog.Sources.PollVoted, pollId, "Voted in a poll");
        }
        catch { /* non-critical */ }

        _logger.LogInformation("User {UserId} voted on poll {PollId}", userId, pollId);
        return (true, null);
    }

    public async Task<(bool Success, string? Error)> ClosePollAsync(int pollId, int userId)
    {
        var poll = await _db.Set<Poll>().FirstOrDefaultAsync(p => p.Id == pollId);
        if (poll == null)
            return (false, "Poll not found");

        if (poll.CreatedById != userId)
            return (false, "Only the poll creator can close it");

        if (poll.Status == "closed")
            return (false, "Poll is already closed");

        poll.Status = "closed";
        poll.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return (true, null);
    }

    public async Task<object> GetPollResultsAsync(int pollId)
    {
        var poll = await _db.Set<Poll>()
            .Include(p => p.Options.OrderBy(o => o.SortOrder))
            .Include(p => p.Votes)
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.Id == pollId);

        if (poll == null) return new { error = "Poll not found" };

        var totalVoters = poll.Votes.Select(v => v.UserId).Distinct().Count();

        var results = poll.Options.Select(o => new
        {
            option_id = o.Id,
            text = o.Text,
            vote_count = poll.Votes.Count(v => v.OptionId == o.Id),
            percentage = totalVoters > 0
                ? Math.Round((double)poll.Votes.Count(v => v.OptionId == o.Id) / totalVoters * 100, 1)
                : 0.0,
            average_rank = poll.PollType == "ranked" && poll.Votes.Any(v => v.OptionId == o.Id && v.Rank.HasValue)
                ? Math.Round(poll.Votes.Where(v => v.OptionId == o.Id && v.Rank.HasValue).Average(v => v.Rank!.Value), 2)
                : (double?)null
        }).ToList();

        return new
        {
            poll_id = poll.Id,
            title = poll.Title,
            poll_type = poll.PollType,
            status = poll.Status,
            total_voters = totalVoters,
            results
        };
    }
}
