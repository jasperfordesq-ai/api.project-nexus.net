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
using Nexus.Api.Services;

namespace Nexus.Api.Controllers;

/// <summary>
/// Compatibility alias endpoints for frontend clients that call paths
/// differing from the canonical backend routes. Each endpoint delegates
/// to the same services/data used by the primary controllers.
/// </summary>
[ApiController]
[Authorize]
public class CompatibilityController : ControllerBase
{
    private readonly NexusDbContext _db;
    private readonly TenantContext _tenantContext;
    private readonly UserPreferencesService _preferencesService;
    private readonly MatchingService _matchingService;
    private readonly NexusScoreService _nexusScoreService;
    private readonly GdprService _gdprService;
    private readonly IdeationService _ideationService;
    private readonly ILogger<CompatibilityController> _logger;

    public CompatibilityController(
        NexusDbContext db,
        TenantContext tenantContext,
        UserPreferencesService preferencesService,
        MatchingService matchingService,
        NexusScoreService nexusScoreService,
        GdprService gdprService,
        IdeationService ideationService,
        ILogger<CompatibilityController> logger)
    {
        _db = db;
        _tenantContext = tenantContext;
        _preferencesService = preferencesService;
        _matchingService = matchingService;
        _nexusScoreService = nexusScoreService;
        _gdprService = gdprService;
        _ideationService = ideationService;
        _logger = logger;
    }

    // ──────────────────────────────────────────────
    // 1. PUT /api/users/me/notifications
    //    Alias for PUT /api/preferences/notifications
    // ──────────────────────────────────────────────

    /// <summary>
    /// PUT /api/users/me/notifications - Update notification preferences (alias).
    /// </summary>
    [HttpPut("api/users/me/notifications")]
    public async Task<IActionResult> UpdateNotificationPreferences(
        [FromBody] SetNotificationPreferenceRequest request)
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid token" });

        if (string.IsNullOrWhiteSpace(request.NotificationType))
            return BadRequest(new { error = "notification_type is required" });

        var tenantId = _tenantContext.GetTenantIdOrThrow();

        try
        {
            var pref = await _preferencesService.SetNotificationPreferenceAsync(
                tenantId, userId.Value,
                request.NotificationType,
                request.EnableInApp,
                request.EnablePush,
                request.EnableEmail);

            return Ok(new
            {
                success = true,
                message = "Notification preference updated",
                preference = new
                {
                    notification_type = pref.NotificationType,
                    enable_in_app = pref.EnableInApp,
                    enable_push = pref.EnablePush,
                    enable_email = pref.EnableEmail,
                    updated_at = pref.UpdatedAt ?? pref.CreatedAt
                }
            });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    // ──────────────────────────────────────────────
    // 2. PUT /api/users/me/preferences
    //    Alias for PUT /api/preferences
    // ──────────────────────────────────────────────

    /// <summary>
    /// PUT /api/users/me/preferences - Update general preferences (alias).
    /// </summary>
    [HttpPut("api/users/me/preferences")]
    public async Task<IActionResult> UpdatePreferences(
        [FromBody] UpdatePreferencesDto dto)
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid token" });

        var tenantId = _tenantContext.GetTenantIdOrThrow();

        try
        {
            var prefs = await _preferencesService.UpdatePreferencesAsync(tenantId, userId.Value, dto);

            return Ok(new
            {
                success = true,
                message = "Preferences updated",
                preferences = new
                {
                    theme = prefs.Theme,
                    language = prefs.Language,
                    timezone = prefs.Timezone,
                    email_digest_frequency = prefs.EmailDigestFrequency,
                    profile_visibility = prefs.ProfileVisibility,
                    show_online_status = prefs.ShowOnlineStatus,
                    show_last_seen = prefs.ShowLastSeen,
                    updated_at = prefs.UpdatedAt
                }
            });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    // ──────────────────────────────────────────────
    // 3. POST /api/users/me/password
    //    Authenticated password change (genuinely new)
    // ──────────────────────────────────────────────

    /// <summary>
    /// POST /api/users/me/password - Change password for the currently authenticated user.
    /// </summary>
    [HttpPost("api/users/me/password")]
    public async Task<IActionResult> ChangePassword(
        [FromBody] ChangePasswordRequest request)
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid token" });

        if (string.IsNullOrWhiteSpace(request.CurrentPassword))
            return BadRequest(new { error = "current_password is required" });

        if (string.IsNullOrWhiteSpace(request.NewPassword))
            return BadRequest(new { error = "new_password is required" });

        if (request.NewPassword.Length < 8)
            return BadRequest(new { error = "new_password must be at least 8 characters" });

        var user = await _db.Users.FindAsync(userId.Value);
        if (user == null) return NotFound(new { error = "User not found" });

        // Verify current password
        if (!BCrypt.Net.BCrypt.Verify(request.CurrentPassword, user.PasswordHash))
            return BadRequest(new { error = "Current password is incorrect" });

        // Update to new password
        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
        user.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        _logger.LogInformation("User {UserId} changed their password", userId.Value);

        return Ok(new { success = true, message = "Password changed successfully" });
    }

    // ──────────────────────────────────────────────
    // 4. DELETE /api/users/me
    //    Account deletion (soft-delete: sets IsActive = false)
    // ──────────────────────────────────────────────

    /// <summary>
    /// DELETE /api/users/me - Soft-delete the current user's account.
    /// </summary>
    [HttpDelete("api/users/me")]
    public async Task<IActionResult> DeleteAccount()
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid token" });

        var user = await _db.Users.FindAsync(userId.Value);
        if (user == null) return NotFound(new { error = "User not found" });

        user.IsActive = false;
        user.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        _logger.LogInformation("User {UserId} soft-deleted their account", userId.Value);

        return Ok(new { success = true, message = "Account has been deactivated" });
    }

    // ──────────────────────────────────────────────
    // 5. PUT /api/users/me/consent
    //    Alias for PUT /api/privacy/consents
    // ──────────────────────────────────────────────

    /// <summary>
    /// PUT /api/users/me/consent - Update a consent record (alias).
    /// </summary>
    [HttpPut("api/users/me/consent")]
    public async Task<IActionResult> UpdateConsent(
        [FromBody] ConsentUpdateRequest request)
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid token" });

        if (string.IsNullOrWhiteSpace(request.ConsentType))
            return BadRequest(new { error = "consent_type is required" });

        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();

        var consent = await _gdprService.RecordConsentAsync(
            userId.Value, request.ConsentType, request.IsGranted, ipAddress);

        return Ok(new
        {
            consent_type = consent.ConsentType,
            is_granted = consent.IsGranted,
            granted_at = consent.GrantedAt,
            revoked_at = consent.RevokedAt,
            updated_at = consent.UpdatedAt
        });
    }

    // ──────────────────────────────────────────────
    // 6. GET /api/matches/all  +  POST /api/matches/{id}/dismiss
    //    Aliases for matching endpoints
    // ──────────────────────────────────────────────

    /// <summary>
    /// GET /api/matches/all - Get all matches for the current user (alias).
    /// </summary>
    [HttpGet("api/matches/all")]
    public async Task<IActionResult> GetAllMatches(
        [FromQuery] int page = 1,
        [FromQuery] int limit = 50)
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid token" });

        if (page < 1) page = 1;
        if (limit < 1) limit = 1;
        if (limit > 100) limit = 100;

        var (data, total) = await _matchingService.GetMatchesForUserAsync(userId.Value, page, limit);
        var totalPages = (int)Math.Ceiling(total / (double)limit);

        return Ok(new
        {
            data = data.Select(m => new
            {
                id = m.Id,
                matched_user = m.MatchedUser != null ? new
                {
                    id = m.MatchedUser.Id,
                    first_name = m.MatchedUser.FirstName,
                    last_name = m.MatchedUser.LastName,
                    level = m.MatchedUser.Level
                } : null,
                matched_listing = m.MatchedListing != null ? new
                {
                    id = m.MatchedListing.Id,
                    title = m.MatchedListing.Title,
                    type = m.MatchedListing.Type.ToString().ToLower()
                } : null,
                score = m.Score,
                status = m.Status.ToString().ToLower(),
                viewed_at = m.ViewedAt,
                responded_at = m.RespondedAt,
                created_at = m.CreatedAt
            }),
            pagination = new { page, limit, total, pages = totalPages }
        });
    }

    /// <summary>
    /// POST /api/matches/{id}/dismiss - Dismiss (decline) a match (alias).
    /// </summary>
    [HttpPost("api/matches/{id}/dismiss")]
    public async Task<IActionResult> DismissMatch(int id)
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid token" });

        var (match, error) = await _matchingService.RespondToMatchAsync(id, userId.Value, MatchStatus.Declined);

        if (error != null)
            return BadRequest(new { error });

        return Ok(new
        {
            success = true,
            message = "Match dismissed",
            match = new
            {
                id = match!.Id,
                status = match.Status.ToString().ToLower(),
                responded_at = match.RespondedAt
            }
        });
    }

    // ──────────────────────────────────────────────
    // 7. GET /api/gamification/nexus-score
    //    Alias for GET /api/nexus-score/me
    // ──────────────────────────────────────────────

    /// <summary>
    /// GET /api/gamification/nexus-score - Get current user's NexusScore (alias).
    /// </summary>
    [HttpGet("api/gamification/nexus-score")]
    public async Task<IActionResult> GetNexusScore()
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid token" });

        var score = await _nexusScoreService.GetScoreAsync(userId.Value);
        if (score == null)
            return Ok(new { data = (object?)null, message = "Score not yet calculated" });

        return Ok(new
        {
            data = new
            {
                score.UserId,
                score.Score,
                score.Tier,
                exchange_score = score.ExchangeScore,
                review_score = score.ReviewScore,
                engagement_score = score.EngagementScore,
                reliability_score = score.ReliabilityScore,
                tenure_score = score.TenureScore,
                last_calculated_at = score.LastCalculatedAt
            }
        });
    }

    // ──────────────────────────────────────────────
    // 8. GET /api/skills/categories
    //    Return skill categories from the database
    // ──────────────────────────────────────────────

    /// <summary>
    /// GET /api/skills/categories - Get skill categories (distinct categories that have skills).
    /// </summary>
    [HttpGet("api/skills/categories")]
    public async Task<IActionResult> GetSkillCategories()
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid token" });

        // Return categories that have at least one skill linked to them
        var categories = await _db.Categories
            .AsNoTracking()
            .Where(c => c.IsActive)
            .OrderBy(c => c.SortOrder)
            .ThenBy(c => c.Name)
            .Select(c => new
            {
                id = c.Id,
                name = c.Name,
                slug = c.Slug,
                description = c.Description,
                parent_category_id = c.ParentCategoryId,
                sort_order = c.SortOrder
            })
            .ToListAsync();

        return Ok(new { data = categories, total = categories.Count });
    }

    // ──────────────────────────────────────────────
    // 9. GET /api/onboarding/categories
    //    Return listing categories for onboarding interest selection
    // ──────────────────────────────────────────────

    /// <summary>
    /// GET /api/onboarding/categories - Get listing categories for interest selection during onboarding.
    /// </summary>
    [HttpGet("api/onboarding/categories")]
    public async Task<IActionResult> GetOnboardingCategories()
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid token" });

        var categories = await _db.Categories
            .AsNoTracking()
            .Where(c => c.IsActive)
            .OrderBy(c => c.SortOrder)
            .ThenBy(c => c.Name)
            .Select(c => new
            {
                id = c.Id,
                name = c.Name,
                slug = c.Slug,
                description = c.Description,
                parent_category_id = c.ParentCategoryId
            })
            .ToListAsync();

        return Ok(new { data = categories, total = categories.Count });
    }

    // ──────────────────────────────────────────────
    // 10. Hashtags — /api/feed/hashtags/*
    //     Frontend calls /api/feed/hashtags/trending and /search
    //     Backend canonical: /api/hashtags/*
    // ──────────────────────────────────────────────

    /// <summary>
    /// GET /api/feed/hashtags/trending - Get trending hashtags (alias).
    /// </summary>
    [HttpGet("api/feed/hashtags/trending")]
    public async Task<IActionResult> GetTrendingHashtags([FromQuery] int limit = 20)
    {
        if (limit < 1) limit = 1;
        if (limit > 100) limit = 100;

        var hashtags = await _db.Hashtags
            .AsNoTracking()
            .OrderByDescending(h => h.UsageCount)
            .ThenByDescending(h => h.LastUsedAt)
            .Take(limit)
            .Select(h => new
            {
                id = h.Id,
                tag = h.Tag,
                usage_count = h.UsageCount,
                last_used_at = h.LastUsedAt
            })
            .ToListAsync();

        return Ok(new { data = hashtags, total = hashtags.Count });
    }

    /// <summary>
    /// GET /api/feed/hashtags/search - Search hashtags (alias).
    /// </summary>
    [HttpGet("api/feed/hashtags/search")]
    public async Task<IActionResult> SearchHashtags(
        [FromQuery] string? q = null,
        [FromQuery] int limit = 20)
    {
        if (limit < 1) limit = 1;
        if (limit > 100) limit = 100;

        var query = _db.Hashtags.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(q))
        {
            var term = q.Trim().ToLower().TrimStart('#');
            query = query.Where(h => h.Tag.Contains(term));
        }

        var hashtags = await query
            .OrderByDescending(h => h.UsageCount)
            .Take(limit)
            .Select(h => new
            {
                id = h.Id,
                tag = h.Tag,
                usage_count = h.UsageCount,
                last_used_at = h.LastUsedAt
            })
            .ToListAsync();

        return Ok(new { data = hashtags, total = hashtags.Count });
    }

    // ──────────────────────────────────────────────
    // 11. Federation — /api/federation/*
    //     Frontend calls /api/federation/*, backend has /api/v1/federation/*
    // ──────────────────────────────────────────────

    /// <summary>
    /// GET /api/federation/connections - List federation partners (alias).
    /// </summary>
    [HttpGet("api/federation/connections")]
    public async Task<IActionResult> GetFederationConnections(
        [FromQuery] int page = 1,
        [FromQuery] int limit = 20)
    {
        if (page < 1) page = 1;
        if (limit < 1) limit = 1;
        if (limit > 100) limit = 100;

        var query = _db.FederationPartners
            .AsNoTracking()
            .Include(f => f.PartnerTenant);

        var total = await query.CountAsync();
        var partners = await query
            .OrderByDescending(f => f.CreatedAt)
            .Skip((page - 1) * limit)
            .Take(limit)
            .Select(f => new
            {
                id = f.Id,
                partner_tenant_id = f.PartnerTenantId,
                partner_name = f.PartnerTenant != null ? f.PartnerTenant.Name : null,
                status = f.Status.ToString().ToLower(),
                shared_listings = f.SharedListings,
                shared_events = f.SharedEvents,
                shared_members = f.SharedMembers,
                credit_exchange_rate = f.CreditExchangeRate,
                approved_at = f.ApprovedAt,
                created_at = f.CreatedAt
            })
            .ToListAsync();

        var totalPages = (int)Math.Ceiling(total / (double)limit);

        return Ok(new
        {
            data = partners,
            pagination = new { page, limit, total, pages = totalPages }
        });
    }

    /// <summary>
    /// GET /api/federation/hub - Federation stats overview (alias).
    /// </summary>
    [HttpGet("api/federation/hub")]
    public async Task<IActionResult> GetFederationHub()
    {
        var totalPartners = await _db.FederationPartners.CountAsync();
        var activePartners = await _db.FederationPartners.CountAsync(f => f.Status == PartnerStatus.Active);
        var pendingPartners = await _db.FederationPartners.CountAsync(f => f.Status == PartnerStatus.Pending);

        return Ok(new
        {
            data = new
            {
                total_partners = totalPartners,
                active_partners = activePartners,
                pending_partners = pendingPartners
            }
        });
    }

    // ──────────────────────────────────────────────
    // 12. Ideation — /api/ideation-challenges, /api/ideation-ideas, /api/ideation-categories
    //     Frontend calls /api/ideation-*, backend has /api/challenges, /api/ideas
    // ──────────────────────────────────────────────

    /// <summary>
    /// GET /api/ideation-challenges - List challenges (alias).
    /// </summary>
    [HttpGet("api/ideation-challenges")]
    public async Task<IActionResult> GetIdeationChallenges(
        [FromQuery] int page = 1,
        [FromQuery] int limit = 20,
        [FromQuery] bool? active_only = null)
    {
        if (page < 1) page = 1;
        if (limit < 1) limit = 1;
        if (limit > 100) limit = 100;

        var query = _db.Challenges.AsNoTracking().AsQueryable();
        if (active_only == true)
            query = query.Where(c => c.IsActive && c.EndsAt > DateTime.UtcNow);

        var total = await query.CountAsync();
        var challenges = await query
            .OrderByDescending(c => c.CreatedAt)
            .Skip((page - 1) * limit)
            .Take(limit)
            .Select(c => new
            {
                id = c.Id,
                title = c.Title,
                description = c.Description,
                challenge_type = c.ChallengeType.ToString().ToLower(),
                difficulty = c.Difficulty.ToString().ToLower(),
                target_action = c.TargetAction,
                target_count = c.TargetCount,
                xp_reward = c.XpReward,
                starts_at = c.StartsAt,
                ends_at = c.EndsAt,
                is_active = c.IsActive,
                max_participants = c.MaxParticipants,
                created_at = c.CreatedAt
            })
            .ToListAsync();

        var totalPages = (int)Math.Ceiling(total / (double)limit);

        return Ok(new
        {
            data = challenges,
            pagination = new { page, limit, total, pages = totalPages }
        });
    }

    /// <summary>
    /// GET /api/ideation-ideas - List ideas (alias).
    /// </summary>
    [HttpGet("api/ideation-ideas")]
    public async Task<IActionResult> GetIdeationIdeas(
        [FromQuery] int page = 1,
        [FromQuery] int limit = 20,
        [FromQuery] string? status = null,
        [FromQuery] string? sort = "newest")
    {
        if (page < 1) page = 1;
        if (limit < 1) limit = 1;
        if (limit > 100) limit = 100;

        var query = _db.Ideas.AsNoTracking().Include(i => i.Author).AsQueryable();

        if (!string.IsNullOrWhiteSpace(status))
            query = query.Where(i => i.Status == status);

        query = sort switch
        {
            "popular" => query.OrderByDescending(i => i.UpvoteCount),
            "oldest" => query.OrderBy(i => i.CreatedAt),
            _ => query.OrderByDescending(i => i.CreatedAt)
        };

        var total = await query.CountAsync();
        var ideas = await query
            .Skip((page - 1) * limit)
            .Take(limit)
            .Select(i => new
            {
                id = i.Id,
                title = i.Title,
                content = i.Content,
                category = i.Category,
                status = i.Status,
                upvote_count = i.UpvoteCount,
                comment_count = i.CommentCount,
                author = i.Author != null ? new
                {
                    id = i.Author.Id,
                    first_name = i.Author.FirstName,
                    last_name = i.Author.LastName
                } : null,
                created_at = i.CreatedAt,
                updated_at = i.UpdatedAt
            })
            .ToListAsync();

        var totalPages = (int)Math.Ceiling(total / (double)limit);

        return Ok(new
        {
            data = ideas,
            pagination = new { page, limit, total, pages = totalPages }
        });
    }

    /// <summary>
    /// GET /api/ideation-categories - List idea categories (alias).
    /// Returns distinct category values used in ideas.
    /// </summary>
    [HttpGet("api/ideation-categories")]
    public async Task<IActionResult> GetIdeationCategories()
    {
        var categories = await _db.Ideas
            .AsNoTracking()
            .Where(i => i.Category != null && i.Category != "")
            .Select(i => i.Category!)
            .Distinct()
            .OrderBy(c => c)
            .ToListAsync();

        var data = categories.Select((c, idx) => new { id = idx + 1, name = c, slug = c.ToLower().Replace(" ", "-") });

        return Ok(new { data, total = categories.Count });
    }

    /// <summary>
    /// POST /api/ideation-ideas - Create a new idea (alias).
    /// </summary>
    [HttpPost("api/ideation-ideas")]
    public async Task<IActionResult> CreateIdeationIdea([FromBody] CreateIdeaRequest request)
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid token" });

        if (string.IsNullOrWhiteSpace(request.Title))
            return BadRequest(new { error = "title is required" });
        if (string.IsNullOrWhiteSpace(request.Content))
            return BadRequest(new { error = "content is required" });

        var (idea, error) = await _ideationService.CreateIdeaAsync(
            userId.Value, request.Title, request.Content, request.Category);

        if (error != null) return BadRequest(new { error });

        return Ok(new
        {
            success = true,
            data = new
            {
                id = idea!.Id,
                title = idea.Title,
                content = idea.Content,
                category = idea.Category,
                status = idea.Status,
                created_at = idea.CreatedAt
            }
        });
    }

    /// <summary>
    /// POST /api/ideation-ideas/{id}/vote - Vote on an idea (alias).
    /// </summary>
    [HttpPost("api/ideation-ideas/{id}/vote")]
    public async Task<IActionResult> VoteOnIdea(int id)
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid token" });

        var (success, error) = await _ideationService.VoteIdeaAsync(id, userId.Value);
        if (error != null) return BadRequest(new { error });

        return Ok(new { success = true, message = "Vote recorded" });
    }

    // ──────────────────────────────────────────────
    // 13. Knowledge Base — /api/kb/*
    //     Frontend calls /api/kb/*, backend has /api/knowledge/*
    // ──────────────────────────────────────────────

    /// <summary>
    /// GET /api/kb - List knowledge base articles (alias).
    /// </summary>
    [HttpGet("api/kb")]
    public async Task<IActionResult> GetKnowledgeBaseArticles(
        [FromQuery] int page = 1,
        [FromQuery] int limit = 20,
        [FromQuery] string? category = null,
        [FromQuery] string? q = null)
    {
        if (page < 1) page = 1;
        if (limit < 1) limit = 1;
        if (limit > 100) limit = 100;

        var query = _db.KnowledgeArticles
            .AsNoTracking()
            .Where(a => a.IsPublished);

        if (!string.IsNullOrWhiteSpace(category))
            query = query.Where(a => a.Category == category);

        if (!string.IsNullOrWhiteSpace(q))
        {
            var term = q.Trim().ToLower();
            query = query.Where(a =>
                a.Title.ToLower().Contains(term) ||
                (a.Tags != null && a.Tags.ToLower().Contains(term)));
        }

        var total = await query.CountAsync();
        var articles = await query
            .OrderBy(a => a.SortOrder)
            .ThenByDescending(a => a.CreatedAt)
            .Skip((page - 1) * limit)
            .Take(limit)
            .Select(a => new
            {
                id = a.Id,
                title = a.Title,
                slug = a.Slug,
                category = a.Category,
                tags = a.Tags,
                sort_order = a.SortOrder,
                view_count = a.ViewCount,
                created_at = a.CreatedAt,
                updated_at = a.UpdatedAt
            })
            .ToListAsync();

        var totalPages = (int)Math.Ceiling(total / (double)limit);

        return Ok(new
        {
            data = articles,
            pagination = new { page, limit, total, pages = totalPages }
        });
    }

    /// <summary>
    /// GET /api/kb/categories - List KB article categories (alias).
    /// </summary>
    [HttpGet("api/kb/categories")]
    public async Task<IActionResult> GetKbCategories()
    {
        var categories = await _db.KnowledgeArticles
            .AsNoTracking()
            .Where(a => a.IsPublished && a.Category != null && a.Category != "")
            .GroupBy(a => a.Category!)
            .Select(g => new
            {
                name = g.Key,
                slug = g.Key.ToLower().Replace(" ", "-"),
                article_count = g.Count()
            })
            .OrderBy(c => c.name)
            .ToListAsync();

        return Ok(new { data = categories, total = categories.Count });
    }

    /// <summary>
    /// GET /api/kb/{slug} - Get knowledge base article by slug (alias).
    /// </summary>
    [HttpGet("api/kb/{slug}")]
    public async Task<IActionResult> GetKbArticleBySlug(string slug)
    {
        var article = await _db.KnowledgeArticles
            .AsNoTracking()
            .Where(a => a.IsPublished && a.Slug == slug)
            .Select(a => new
            {
                id = a.Id,
                title = a.Title,
                slug = a.Slug,
                content = a.Content,
                category = a.Category,
                tags = a.Tags,
                sort_order = a.SortOrder,
                view_count = a.ViewCount,
                created_at = a.CreatedAt,
                updated_at = a.UpdatedAt
            })
            .FirstOrDefaultAsync();

        if (article == null)
            return NotFound(new { error = "Article not found" });

        return Ok(new { data = article });
    }

    // ──────────────────────────────────────────────
    // 14. Organisations — /api/volunteering/organisations/*
    //     Frontend calls /api/volunteering/organisations, backend has /api/organisations
    // ──────────────────────────────────────────────

    /// <summary>
    /// GET /api/volunteering/organisations - List organisations (alias).
    /// </summary>
    [HttpGet("api/volunteering/organisations")]
    public async Task<IActionResult> GetVolunteeringOrganisations(
        [FromQuery] int page = 1,
        [FromQuery] int limit = 20,
        [FromQuery] string? type = null,
        [FromQuery] string? q = null)
    {
        if (page < 1) page = 1;
        if (limit < 1) limit = 1;
        if (limit > 100) limit = 100;

        var query = _db.Organisations.AsNoTracking().Where(o => o.IsPublic);

        if (!string.IsNullOrWhiteSpace(type))
            query = query.Where(o => o.Type == type);

        if (!string.IsNullOrWhiteSpace(q))
        {
            var term = q.Trim().ToLower();
            query = query.Where(o => o.Name.ToLower().Contains(term));
        }

        var total = await query.CountAsync();
        var orgs = await query
            .OrderBy(o => o.Name)
            .Skip((page - 1) * limit)
            .Take(limit)
            .Select(o => new
            {
                id = o.Id,
                name = o.Name,
                slug = o.Slug,
                description = o.Description,
                logo_url = o.LogoUrl,
                type = o.Type,
                industry = o.Industry,
                status = o.Status,
                address = o.Address,
                created_at = o.CreatedAt
            })
            .ToListAsync();

        var totalPages = (int)Math.Ceiling(total / (double)limit);

        return Ok(new
        {
            data = orgs,
            pagination = new { page, limit, total, pages = totalPages }
        });
    }

    /// <summary>
    /// GET /api/volunteering/organisations/{id} - Get organisation by ID (alias).
    /// </summary>
    [HttpGet("api/volunteering/organisations/{id}")]
    public async Task<IActionResult> GetVolunteeringOrganisation(int id)
    {
        var org = await _db.Organisations
            .AsNoTracking()
            .Where(o => o.Id == id && o.IsPublic)
            .Select(o => new
            {
                id = o.Id,
                name = o.Name,
                slug = o.Slug,
                description = o.Description,
                logo_url = o.LogoUrl,
                website_url = o.WebsiteUrl,
                email = o.Email,
                phone = o.Phone,
                address = o.Address,
                type = o.Type,
                industry = o.Industry,
                status = o.Status,
                created_at = o.CreatedAt,
                verified_at = o.VerifiedAt
            })
            .FirstOrDefaultAsync();

        if (org == null) return NotFound(new { error = "Organisation not found" });

        return Ok(new { data = org });
    }

    // ──────────────────────────────────────────────
    // 15. Leaderboard seasons — /api/gamification/seasons/*
    //     Frontend calls /api/gamification/seasons/*, backend has /api/gamification/v2/seasons/*
    // ──────────────────────────────────────────────

    /// <summary>
    /// GET /api/gamification/seasons - List leaderboard seasons (alias).
    /// </summary>
    [HttpGet("api/gamification/seasons")]
    public async Task<IActionResult> GetLeaderboardSeasons(
        [FromQuery] int page = 1,
        [FromQuery] int limit = 20)
    {
        if (page < 1) page = 1;
        if (limit < 1) limit = 1;
        if (limit > 100) limit = 100;

        var query = _db.LeaderboardSeasons.AsNoTracking();

        var total = await query.CountAsync();
        var seasons = await query
            .OrderByDescending(s => s.StartsAt)
            .Skip((page - 1) * limit)
            .Take(limit)
            .Select(s => new
            {
                id = s.Id,
                name = s.Name,
                starts_at = s.StartsAt,
                ends_at = s.EndsAt,
                status = s.Status.ToString().ToLower(),
                prize_description = s.PrizeDescription,
                created_at = s.CreatedAt
            })
            .ToListAsync();

        var totalPages = (int)Math.Ceiling(total / (double)limit);

        return Ok(new
        {
            data = seasons,
            pagination = new { page, limit, total, pages = totalPages }
        });
    }

    /// <summary>
    /// GET /api/gamification/seasons/current - Get current active season (alias).
    /// </summary>
    [HttpGet("api/gamification/seasons/current")]
    public async Task<IActionResult> GetCurrentSeason()
    {
        var now = DateTime.UtcNow;
        var season = await _db.LeaderboardSeasons
            .AsNoTracking()
            .Where(s => s.Status == SeasonStatus.Active || (s.StartsAt <= now && s.EndsAt >= now))
            .OrderByDescending(s => s.StartsAt)
            .Select(s => new
            {
                id = s.Id,
                name = s.Name,
                starts_at = s.StartsAt,
                ends_at = s.EndsAt,
                status = s.Status.ToString().ToLower(),
                prize_description = s.PrizeDescription,
                created_at = s.CreatedAt
            })
            .FirstOrDefaultAsync();

        if (season == null)
            return NotFound(new { error = "No active season found" });

        return Ok(new { data = season });
    }

    // ──────────────────────────────────────────────
    // 16. Settings sub-routes — /api/users/me/*
    //     Frontend calls /api/users/me/* for settings reads
    // ──────────────────────────────────────────────

    /// <summary>
    /// GET /api/users/me/notifications - Get notification preferences (alias).
    /// </summary>
    [HttpGet("api/users/me/notifications")]
    public async Task<IActionResult> GetNotificationPreferences()
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid token" });

        var tenantId = _tenantContext.GetTenantIdOrThrow();

        var prefs = await _preferencesService.GetNotificationPreferencesAsync(tenantId, userId.Value);

        return Ok(new
        {
            data = prefs.Select(p => new
            {
                notification_type = p.NotificationType,
                enable_in_app = p.EnableInApp,
                enable_push = p.EnablePush,
                enable_email = p.EnableEmail,
                updated_at = p.UpdatedAt ?? p.CreatedAt
            })
        });
    }

    /// <summary>
    /// GET /api/users/me/preferences - Get user preferences (alias).
    /// </summary>
    [HttpGet("api/users/me/preferences")]
    public async Task<IActionResult> GetPreferences()
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid token" });

        var tenantId = _tenantContext.GetTenantIdOrThrow();

        var prefs = await _preferencesService.GetPreferencesAsync(tenantId, userId.Value);
        if (prefs == null)
            return Ok(new { data = (object?)null, message = "No preferences set yet" });

        return Ok(new
        {
            data = new
            {
                theme = prefs.Theme,
                language = prefs.Language,
                timezone = prefs.Timezone,
                email_digest_frequency = prefs.EmailDigestFrequency,
                profile_visibility = prefs.ProfileVisibility,
                show_online_status = prefs.ShowOnlineStatus,
                show_last_seen = prefs.ShowLastSeen,
                updated_at = prefs.UpdatedAt
            }
        });
    }

    /// <summary>
    /// GET /api/users/me/sessions - Get active sessions for current user (alias).
    /// </summary>
    [HttpGet("api/users/me/sessions")]
    public async Task<IActionResult> GetMySessions()
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid token" });

        var sessions = await _db.UserSessions
            .AsNoTracking()
            .Where(s => s.UserId == userId.Value && s.IsActive && s.ExpiresAt > DateTime.UtcNow)
            .OrderByDescending(s => s.LastActivityAt)
            .Select(s => new
            {
                id = s.Id,
                ip_address = s.IpAddress,
                user_agent = s.UserAgent,
                device_info = s.DeviceInfo,
                created_at = s.CreatedAt,
                last_activity_at = s.LastActivityAt,
                expires_at = s.ExpiresAt
            })
            .ToListAsync();

        return Ok(new { data = sessions, total = sessions.Count });
    }

    /// <summary>
    /// GET /api/users/me/consent - Get consent records for current user (alias).
    /// </summary>
    [HttpGet("api/users/me/consent")]
    public async Task<IActionResult> GetMyConsent()
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid token" });

        var consents = await _gdprService.GetUserConsentsAsync(userId.Value);

        return Ok(new
        {
            data = consents.Select(c => new
            {
                consent_type = c.ConsentType,
                is_granted = c.IsGranted,
                granted_at = c.GrantedAt,
                revoked_at = c.RevokedAt,
                updated_at = c.UpdatedAt
            })
        });
    }

    /// <summary>
    /// GET /api/users/me/skills - Get skills for current user (alias).
    /// </summary>
    [HttpGet("api/users/me/skills")]
    public async Task<IActionResult> GetMySkills()
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid token" });

        var skills = await _db.UserSkills
            .AsNoTracking()
            .Where(us => us.UserId == userId.Value)
            .Include(us => us.Skill)
            .OrderBy(us => us.Skill!.Name)
            .Select(us => new
            {
                id = us.Id,
                skill_id = us.SkillId,
                skill_name = us.Skill != null ? us.Skill.Name : null,
                skill_slug = us.Skill != null ? us.Skill.Slug : null,
                category_id = us.Skill != null ? us.Skill.CategoryId : null,
                proficiency_level = us.ProficiencyLevel.ToString().ToLower(),
                is_verified = us.IsVerified,
                endorsement_count = us.EndorsementCount,
                created_at = us.CreatedAt
            })
            .ToListAsync();

        return Ok(new { data = skills, total = skills.Count });
    }

    /// <summary>
    /// GET /api/users/me/insurance - Get insurance certificates for current user (alias).
    /// </summary>
    [HttpGet("api/users/me/insurance")]
    public async Task<IActionResult> GetMyInsurance()
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid token" });

        var certs = await _db.InsuranceCertificates
            .AsNoTracking()
            .Where(c => c.UserId == userId.Value)
            .OrderByDescending(c => c.CreatedAt)
            .Select(c => new
            {
                id = c.Id,
                type = c.Type,
                provider = c.Provider,
                policy_number = c.PolicyNumber,
                cover_amount = c.CoverAmount,
                start_date = c.StartDate,
                expiry_date = c.ExpiryDate,
                document_url = c.DocumentUrl,
                status = c.Status,
                verified_at = c.VerifiedAt,
                created_at = c.CreatedAt
            })
            .ToListAsync();

        return Ok(new { data = certs, total = certs.Count });
    }

    /// <summary>
    /// POST /api/users/me/gdpr-request - Create a GDPR export or deletion request (alias).
    /// </summary>
    [HttpPost("api/users/me/gdpr-request")]
    public async Task<IActionResult> CreateGdprRequest([FromBody] GdprRequestDto request)
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid token" });

        if (string.IsNullOrWhiteSpace(request.Type))
            return BadRequest(new { error = "type is required (export or deletion)" });

        try
        {
            if (request.Type.ToLower() == "export")
            {
                var export = await _gdprService.RequestDataExportAsync(
                    userId.Value, request.Format ?? "json");
                return Ok(new
                {
                    success = true,
                    message = "Data export request created",
                    data = new { id = export.Id, status = export.Status, format = export.Format, created_at = export.CreatedAt }
                });
            }
            else if (request.Type.ToLower() == "deletion")
            {
                var deletion = await _gdprService.RequestDataDeletionAsync(
                    userId.Value, request.Reason);
                return Ok(new
                {
                    success = true,
                    message = "Data deletion request created",
                    data = new { id = deletion.Id, status = deletion.Status, created_at = deletion.CreatedAt }
                });
            }
            else
            {
                return BadRequest(new { error = "type must be 'export' or 'deletion'" });
            }
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    // ──────────────────────────────────────────────
    // 17. Skills browse — /api/skills/categories/{id}, /api/skills/members
    //     Note: GET /api/skills/categories already exists above (#8)
    // ──────────────────────────────────────────────

    /// <summary>
    /// GET /api/skills/categories/{id} - Get skills in a specific category (alias).
    /// </summary>
    [HttpGet("api/skills/categories/{id}")]
    public async Task<IActionResult> GetSkillsInCategory(int id)
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid token" });

        var category = await _db.Categories.AsNoTracking().FirstOrDefaultAsync(c => c.Id == id);
        if (category == null) return NotFound(new { error = "Category not found" });

        var skills = await _db.Skills
            .AsNoTracking()
            .Where(s => s.CategoryId == id)
            .OrderBy(s => s.Name)
            .Select(s => new
            {
                id = s.Id,
                name = s.Name,
                slug = s.Slug,
                description = s.Description,
                is_verifiable = s.IsVerifiable,
                category_id = s.CategoryId
            })
            .ToListAsync();

        return Ok(new
        {
            category = new { id = category.Id, name = category.Name, slug = category.Slug },
            data = skills,
            total = skills.Count
        });
    }

    /// <summary>
    /// GET /api/skills/members - Get members with matching skills (alias).
    /// </summary>
    [HttpGet("api/skills/members")]
    public async Task<IActionResult> GetSkillMembers(
        [FromQuery] int? skill_id = null,
        [FromQuery] string? q = null,
        [FromQuery] int page = 1,
        [FromQuery] int limit = 20)
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid token" });

        if (page < 1) page = 1;
        if (limit < 1) limit = 1;
        if (limit > 100) limit = 100;

        var query = _db.UserSkills
            .AsNoTracking()
            .Include(us => us.User)
            .Include(us => us.Skill)
            .Where(us => us.User != null && us.User.IsActive);

        if (skill_id.HasValue)
            query = query.Where(us => us.SkillId == skill_id.Value);

        if (!string.IsNullOrWhiteSpace(q))
        {
            var term = q.Trim().ToLower();
            query = query.Where(us =>
                (us.Skill != null && us.Skill.Name.ToLower().Contains(term)) ||
                (us.User != null && (us.User.FirstName.ToLower().Contains(term) || us.User.LastName.ToLower().Contains(term))));
        }

        var total = await query.Select(us => us.UserId).Distinct().CountAsync();
        var members = await query
            .OrderByDescending(us => us.EndorsementCount)
            .Skip((page - 1) * limit)
            .Take(limit)
            .Select(us => new
            {
                user_id = us.UserId,
                first_name = us.User != null ? us.User.FirstName : null,
                last_name = us.User != null ? us.User.LastName : null,
                skill_id = us.SkillId,
                skill_name = us.Skill != null ? us.Skill.Name : null,
                proficiency_level = us.ProficiencyLevel.ToString().ToLower(),
                is_verified = us.IsVerified,
                endorsement_count = us.EndorsementCount
            })
            .ToListAsync();

        var totalPages = (int)Math.Ceiling(total / (double)limit);

        return Ok(new
        {
            data = members,
            pagination = new { page, limit, total, pages = totalPages }
        });
    }
}

// ──────────────────────────────────────────────
// DTOs specific to CompatibilityController
// ──────────────────────────────────────────────

public class ChangePasswordRequest
{
    [JsonPropertyName("current_password")]
    public string CurrentPassword { get; set; } = string.Empty;

    [JsonPropertyName("new_password")]
    public string NewPassword { get; set; } = string.Empty;
}

public class GdprRequestDto
{
    [JsonPropertyName("type")]
    public string Type { get; set; } = string.Empty;

    [JsonPropertyName("format")]
    public string? Format { get; set; }

    [JsonPropertyName("reason")]
    public string? Reason { get; set; }
}
