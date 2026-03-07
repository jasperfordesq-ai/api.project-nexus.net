// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

using Microsoft.EntityFrameworkCore;
using Nexus.Api.Data;
using Nexus.Api.Entities;

namespace Nexus.Api.Services;

public class IdeationService
{
    private readonly NexusDbContext _db;
    private readonly TenantContext _tenantContext;
    private readonly GamificationService _gamification;
    private readonly ILogger<IdeationService> _logger;

    public IdeationService(NexusDbContext db, TenantContext tenantContext, GamificationService gamification, ILogger<IdeationService> logger)
    { _db = db; _tenantContext = tenantContext; _gamification = gamification; _logger = logger; }

    public async Task<(Idea? Idea, string? Error)> CreateIdeaAsync(int userId, string title, string content, string? category)
    {
        var tenantId = _tenantContext.GetTenantIdOrThrow();
        var idea = new Idea { TenantId = tenantId, AuthorId = userId, Title = title.Trim(), Content = content.Trim(), Category = category?.Trim() };
        _db.Set<Idea>().Add(idea);
        await _db.SaveChangesAsync();
        return (idea, null);
    }

    public async Task<(List<Idea> Data, int Total)> ListIdeasAsync(int page, int limit, string? status = null, string? sort = "newest")
    {
        var query = _db.Set<Idea>().AsNoTracking();
        if (!string.IsNullOrEmpty(status)) query = query.Where(i => i.Status == status);
        var total = await query.CountAsync();
        query = sort switch { "popular" => query.OrderByDescending(i => i.UpvoteCount), "discussed" => query.OrderByDescending(i => i.CommentCount), _ => query.OrderByDescending(i => i.CreatedAt) };
        var data = await query.Include(i => i.Author).Skip((page - 1) * limit).Take(limit).ToListAsync();
        return (data, total);
    }

    public async Task<Idea?> GetIdeaAsync(int ideaId) => await _db.Set<Idea>().Include(i => i.Author).Include(i => i.Comments.OrderByDescending(c => c.CreatedAt)).ThenInclude(c => c.User).Include(i => i.Votes).FirstOrDefaultAsync(i => i.Id == ideaId);

    public async Task<(bool Success, string? Error)> VoteIdeaAsync(int ideaId, int userId)
    {
        if (await _db.Set<IdeaVote>().AnyAsync(v => v.IdeaId == ideaId && v.UserId == userId)) return (false, "Already upvoted");
        var idea = await _db.Set<Idea>().FirstOrDefaultAsync(i => i.Id == ideaId);
        if (idea == null) return (false, "Idea not found");
        _db.Set<IdeaVote>().Add(new IdeaVote { TenantId = _tenantContext.GetTenantIdOrThrow(), IdeaId = ideaId, UserId = userId });
        idea.UpvoteCount++;
        await _db.SaveChangesAsync();
        return (true, null);
    }

    public async Task<(bool Success, string? Error)> UnvoteIdeaAsync(int ideaId, int userId)
    {
        var vote = await _db.Set<IdeaVote>().FirstOrDefaultAsync(v => v.IdeaId == ideaId && v.UserId == userId);
        if (vote == null) return (false, "Not upvoted");
        var idea = await _db.Set<Idea>().FirstOrDefaultAsync(i => i.Id == ideaId);
        if (idea != null && idea.UpvoteCount > 0) idea.UpvoteCount--;
        _db.Set<IdeaVote>().Remove(vote);
        await _db.SaveChangesAsync();
        return (true, null);
    }

    public async Task<(IdeaComment? Comment, string? Error)> CommentOnIdeaAsync(int ideaId, int userId, string content)
    {
        var idea = await _db.Set<Idea>().FirstOrDefaultAsync(i => i.Id == ideaId);
        if (idea == null) return (null, "Idea not found");
        var comment = new IdeaComment { TenantId = _tenantContext.GetTenantIdOrThrow(), IdeaId = ideaId, UserId = userId, Content = content.Trim() };
        _db.Set<IdeaComment>().Add(comment);
        idea.CommentCount++;
        await _db.SaveChangesAsync();
        return (comment, null);
    }

    public async Task<(List<Challenge> Data, int Total)> ListChallengesAsync(int page, int limit, bool? activeOnly = null)
    {
        var query = _db.Set<Challenge>().AsNoTracking();
        if (activeOnly == true) query = query.Where(c => c.IsActive);
        var total = await query.CountAsync();
        var data = await query.Include(c => c.Participants).OrderByDescending(c => c.CreatedAt).Skip((page - 1) * limit).Take(limit).ToListAsync();
        return (data, total);
    }

    public async Task<(bool Success, string? Error)> JoinChallengeAsync(int challengeId, int userId)
    {
        var challenge = await _db.Set<Challenge>().FirstOrDefaultAsync(c => c.Id == challengeId);
        if (challenge == null) return (false, "Challenge not found");
        if (!challenge.IsActive) return (false, "Challenge is not active");
        if (challenge.MaxParticipants.HasValue)
        {
            var count = await _db.Set<ChallengeParticipant>().CountAsync(p => p.ChallengeId == challengeId);
            if (count >= challenge.MaxParticipants.Value) return (false, "Challenge is full");
        }
        if (await _db.Set<ChallengeParticipant>().AnyAsync(p => p.ChallengeId == challengeId && p.UserId == userId)) return (false, "Already participating");
        _db.Set<ChallengeParticipant>().Add(new ChallengeParticipant { TenantId = _tenantContext.GetTenantIdOrThrow(), ChallengeId = challengeId, UserId = userId });
        await _db.SaveChangesAsync();
        return (true, null);
    }

    public async Task<(bool Success, string? Error)> UpdateChallengeProgressAsync(int challengeId, int userId, int progress)
    {
        var participant = await _db.Set<ChallengeParticipant>().Include(p => p.Challenge).FirstOrDefaultAsync(p => p.ChallengeId == challengeId && p.UserId == userId);
        if (participant == null) return (false, "Not participating");
        if (participant.IsCompleted) return (false, "Already completed");
        participant.CurrentProgress = progress;
        if (participant.Challenge != null && progress >= participant.Challenge.TargetCount)
        {
            participant.IsCompleted = true;
            participant.CompletedAt = DateTime.UtcNow;
            try { await _gamification.AwardXpAsync(userId, participant.Challenge.XpReward, "challenge_completed", challengeId, $"Completed: {participant.Challenge.Title}"); }
            catch (Exception ex) { _logger.LogWarning(ex, "Failed to award XP for challenge {ChallengeId}", challengeId); }
        }
        await _db.SaveChangesAsync();
        return (true, null);
    }
}
