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
/// Admin feed moderation endpoints.
/// </summary>
[ApiController]
[Route("api/admin/feed")]
[Route("api/v2/admin/feed")]
[Authorize(Policy = "AdminOnly")]
public class AdminFeedController : ControllerBase
{
    private const string FeedHiddenKeyPrefix = "admin.feed.hidden.";
    private const string FeedDeletedKeyPrefix = "admin.feed.deleted.";
    private readonly NexusDbContext _db;
    private readonly TenantContext _tenantContext;
    private readonly ILogger<AdminFeedController> _logger;

    public AdminFeedController(
        NexusDbContext db,
        TenantContext tenantContext,
        ILogger<AdminFeedController> logger)
    {
        _db = db;
        _tenantContext = tenantContext;
        _logger = logger;
    }

    /// <summary>GET /api/admin/feed/posts — moderation queue with optional status filter.</summary>
    [HttpGet("posts")]
    public async Task<IActionResult> GetModerationQueue(
        [FromQuery] string? status = null,
        [FromQuery] string? type = null,
        [FromQuery] int? user_id = null,
        [FromQuery] string? search = null,
        [FromQuery] int page = 1,
        [FromQuery] int limit = 20)
    {
        if (page < 1) page = 1;
        if (limit < 1) limit = 1;
        if (limit > 100) limit = 100;

        var tenantId = _tenantContext.GetTenantIdOrThrow();

        if (IsV2Request() && IsListingType(type))
        {
            return await GetListingModerationQueue(tenantId, status, user_id, search, page, limit);
        }

        if (IsV2Request() && IsEventType(type))
        {
            return await GetEventModerationQueue(tenantId, status, user_id, search, page, limit);
        }

        var query = _db.FeedPosts
            .Include(p => p.User)
            .Include(p => p.Tenant)
            .Where(p => p.TenantId == tenantId);

        if (!string.IsNullOrWhiteSpace(type) && !string.Equals(type, "post", StringComparison.OrdinalIgnoreCase))
        {
            query = query.Where(p => false);
        }

        if (user_id.HasValue && user_id.Value > 0)
        {
            query = query.Where(p => p.UserId == user_id.Value);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var normalizedSearch = search.Trim();
            query = query.Where(p =>
                p.Content.Contains(normalizedSearch) ||
                p.User!.FirstName.Contains(normalizedSearch) ||
                p.User.LastName.Contains(normalizedSearch) ||
                p.User.Email.Contains(normalizedSearch));
        }

        if (!string.IsNullOrWhiteSpace(status))
        {
            if (status == "reported" || status == "flagged")
                query = query.Where(p => _db.FeedReports.Any(r => r.PostId == p.Id && r.TenantId == tenantId && r.Status == "pending"));
            else if (status == "hidden")
                query = query.Where(p => p.IsHidden);
            else if (status == "active" || status == "visible")
                query = query.Where(p => !p.IsHidden);
        }

        query = query.OrderByDescending(p => p.CreatedAt);

        var total = await query.CountAsync();
        var postEntities = await query
            .Skip((page - 1) * limit)
            .Take(limit)
            .ToListAsync();

        if (IsV2Request())
        {
            var posts = await MapLaravelFeedPostsAsync(postEntities, tenantId);
            return Ok(new
            {
                success = true,
                data = posts,
                meta = BuildLaravelPaginationMeta(page, limit, total)
            });
        }

        var legacyPosts = postEntities.Select(p => new
        {
            p.Id,
            p.Content,
            p.IsHidden,
            author = new { p.User!.Id, p.User.FirstName, p.User.LastName, p.User.Email },
            reportCount = _db.FeedReports.Count(r => r.PostId == p.Id && r.Status == "pending"),
            p.CreatedAt
        }).ToList();

        return Ok(new
        {
            data = legacyPosts,
            pagination = new { page, limit, total, pages = (int)Math.Ceiling(total / (double)limit) }
        });
    }

    /// <summary>GET /api/admin/feed/posts/{id} — post details with reports for moderation.</summary>
    [HttpGet("posts/{id:int}")]
    public async Task<IActionResult> GetPostForModeration(int id, [FromQuery] string? type = null)
    {
        if (IsV2Request() && IsListingType(type))
        {
            return await GetListingForModeration(id);
        }

        if (IsV2Request() && IsEventType(type))
        {
            return await GetEventForModeration(id);
        }

        if (IsV2Request() && !IsPostType(type))
        {
            return LaravelNotFound("Feed item not found");
        }

        var tenantId = _tenantContext.GetTenantIdOrThrow();

        var post = await _db.FeedPosts
            .Include(p => p.User)
            .Include(p => p.Tenant)
            .FirstOrDefaultAsync(p => p.Id == id && p.TenantId == tenantId);

        if (post == null)
            return IsV2Request() ? LaravelNotFound("Post not found") : NotFound(new { error = "Post not found" });

        var reports = await _db.FeedReports
            .Include(r => r.Reporter)
            .Where(r => r.PostId == id && r.TenantId == tenantId)
            .OrderByDescending(r => r.CreatedAt)
            .Select(r => new
            {
                r.Id,
                r.Reason,
                r.Details,
                r.Status,
                reporter = new { r.Reporter!.Id, r.Reporter.FirstName, r.Reporter.LastName },
                r.CreatedAt
            })
            .ToListAsync();

        if (IsV2Request())
        {
            var recentComments = await _db.PostComments
                .Include(c => c.User)
                .Where(c => c.PostId == id && c.TenantId == tenantId)
                .OrderByDescending(c => c.CreatedAt)
                .Take(10)
                .Select(c => new
                {
                    c.Id,
                    c.UserId,
                    user_name = FullName(c.User),
                    c.Content,
                    created_at = c.CreatedAt
                })
                .ToListAsync();

            return Ok(new
            {
                success = true,
                data = MapLaravelFeedPost(
                    post,
                    likesCount: await _db.PostLikes.CountAsync(l => l.PostId == id && l.TenantId == tenantId),
                    commentsCount: await _db.PostComments.CountAsync(c => c.PostId == id && c.TenantId == tenantId),
                    pendingReportsCount: await _db.FeedReports.CountAsync(r => r.PostId == id && r.TenantId == tenantId && r.Status == "pending"),
                    recentComments)
            });
        }

        return Ok(new
        {
            id = post.Id,
            content = post.Content,
            isHidden = post.IsHidden,
            author = new { post.User!.Id, post.User.FirstName, post.User.LastName, post.User.Email },
            createdAt = post.CreatedAt,
            reports
        });
    }

    /// <summary>POST /api/admin/feed/posts/{id}/hide — admin hide post.</summary>
    [HttpPost("posts/{id:int}/hide")]
    public async Task<IActionResult> AdminHidePost(int id, [FromBody] AdminModerateRequest? request)
    {
        var adminId = User.GetUserId();
        if (adminId == null) return Unauthorized(new { error = "Invalid token" });

        if (IsV2Request() && IsListingType(request?.Type))
        {
            return await HideListingFeedItem(id, adminId.Value);
        }

        if (IsV2Request() && IsEventType(request?.Type))
        {
            return await HideEventFeedItem(id, adminId.Value);
        }

        if (IsV2Request() && !IsPostType(request?.Type))
        {
            return LaravelNotFound("Feed item not found");
        }

        var tenantId = _tenantContext.GetTenantIdOrThrow();

        var post = await _db.FeedPosts.FirstOrDefaultAsync(p => p.Id == id && p.TenantId == tenantId);
        if (post == null) return IsV2Request() ? LaravelNotFound("Feed item not found") : NotFound(new { error = "Post not found" });

        post.IsHidden = true;

        // Mark pending reports as actioned
        var pendingReports = await _db.FeedReports
            .Where(r => r.PostId == id && r.Status == "pending")
            .ToListAsync();

        foreach (var report in pendingReports)
        {
            report.Status = "action_taken";
            report.ReviewedByAdminId = adminId.Value;
            report.ReviewedAt = DateTime.UtcNow;
        }

        await _db.SaveChangesAsync();

        _logger.LogInformation("Admin {AdminId} hid feed post {PostId}", adminId, id);
        if (IsV2Request())
        {
            return Ok(new { success = true, data = new { success = true, message = "Feed item hidden" } });
        }

        return Ok(new { message = "Post hidden", postId = id });
    }

    /// <summary>DELETE /api/admin/feed/posts/{id} — admin delete post.</summary>
    [HttpDelete("posts/{id:int}")]
    public async Task<IActionResult> AdminDeletePost(int id, [FromQuery] string? type = null)
    {
        var adminId = User.GetUserId();
        if (adminId == null) return Unauthorized(new { error = "Invalid token" });

        if (IsV2Request() && IsListingType(type))
        {
            return await DeleteListingFeedItem(id, adminId.Value);
        }

        if (IsV2Request() && IsEventType(type))
        {
            return await DeleteEventFeedItem(id, adminId.Value);
        }

        if (IsV2Request() && !IsPostType(type))
        {
            return LaravelNotFound("Feed item not found");
        }

        var tenantId = _tenantContext.GetTenantIdOrThrow();

        var post = await _db.FeedPosts.FirstOrDefaultAsync(p => p.Id == id && p.TenantId == tenantId);
        if (post == null) return IsV2Request() ? LaravelNotFound("Feed item not found") : NotFound(new { error = "Post not found" });

        _db.FeedPosts.Remove(post);
        await _db.SaveChangesAsync();

        _logger.LogInformation("Admin {AdminId} deleted feed post {PostId}", adminId, id);
        if (IsV2Request())
        {
            return Ok(new { success = true, data = new { success = true, message = "Feed item deleted" } });
        }

        return NoContent();
    }

    /// <summary>GET /api/admin/feed/stats — feed analytics dashboard.</summary>
    [HttpGet("stats")]
    public async Task<IActionResult> GetFeedStats()
    {
        var tenantId = _tenantContext.GetTenantIdOrThrow();

        var totalPosts = await _db.FeedPosts.CountAsync(p => p.TenantId == tenantId);
        var hiddenPosts = await _db.FeedPosts.CountAsync(p => p.TenantId == tenantId && p.IsHidden);
        var pendingReports = await _db.FeedReports.CountAsync(r => r.TenantId == tenantId && r.Status == "pending");
        var totalReports = await _db.FeedReports.CountAsync(r => r.TenantId == tenantId);
        var postsLast7Days = await _db.FeedPosts
            .CountAsync(p => p.TenantId == tenantId && p.CreatedAt >= DateTime.UtcNow.AddDays(-7));

        if (IsV2Request())
        {
            var totalComments = await _db.PostComments.CountAsync(c => c.TenantId == tenantId);
            var resolvedReports = await _db.FeedReports.CountAsync(r =>
                r.TenantId == tenantId && (r.Status == "reviewed" || r.Status == "action_taken"));
            var dismissedReports = await _db.FeedReports.CountAsync(r => r.TenantId == tenantId && r.Status == "dismissed");

            return Ok(new
            {
                success = true,
                data = new
                {
                    total = totalPosts,
                    hidden = hiddenPosts,
                    total_comments = totalComments,
                    feed_posts_total = totalPosts,
                    feed_posts_hidden = hiddenPosts,
                    feed_posts_flagged = pendingReports,
                    comments_total = totalComments,
                    comments_hidden = 0,
                    comments_flagged = 0,
                    reviews_total = await _db.Reviews.CountAsync(r => r.TenantId == tenantId),
                    reviews_hidden = 0,
                    reviews_flagged = 0,
                    reports_pending = pendingReports,
                    reports_resolved = resolvedReports,
                    reports_dismissed = dismissedReports,
                    pending = pendingReports,
                    resolved = resolvedReports,
                    dismissed = dismissedReports
                }
            });
        }

        return Ok(new
        {
            totalPosts,
            hiddenPosts,
            pendingReports,
            totalReports,
            postsLast7Days
        });
    }

    private bool IsV2Request()
    {
        return Request.Path.Value?.StartsWith("/api/v2/", StringComparison.OrdinalIgnoreCase) == true;
    }

    private static bool IsPostType(string? type)
    {
        return string.IsNullOrWhiteSpace(type) || string.Equals(type, "post", StringComparison.OrdinalIgnoreCase);
    }

    private static bool IsListingType(string? type)
    {
        return string.Equals(type, "listing", StringComparison.OrdinalIgnoreCase);
    }

    private static bool IsEventType(string? type)
    {
        return string.Equals(type, "event", StringComparison.OrdinalIgnoreCase);
    }

    private async Task<IActionResult> GetListingModerationQueue(
        int tenantId,
        string? status,
        int? userId,
        string? search,
        int page,
        int limit)
    {
        var hiddenIds = await LoadFeedFlaggedIdsAsync(tenantId, "listing", deleted: false);
        var deletedIds = await LoadFeedFlaggedIdsAsync(tenantId, "listing", deleted: true);

        var query = _db.Listings
            .Include(l => l.User)
            .Include(l => l.Tenant)
            .Where(l => l.TenantId == tenantId && l.DeletedAt == null && !deletedIds.Contains(l.Id));

        if (userId.HasValue && userId.Value > 0)
        {
            query = query.Where(l => l.UserId == userId.Value);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var normalizedSearch = search.Trim();
            query = query.Where(l =>
                l.Title.Contains(normalizedSearch) ||
                (l.Description != null && l.Description.Contains(normalizedSearch)) ||
                l.User!.FirstName.Contains(normalizedSearch) ||
                l.User.LastName.Contains(normalizedSearch) ||
                l.User.Email.Contains(normalizedSearch));
        }

        if (!string.IsNullOrWhiteSpace(status))
        {
            if (status == "hidden")
                query = query.Where(l => hiddenIds.Contains(l.Id));
            else if (status == "active" || status == "visible")
                query = query.Where(l => !hiddenIds.Contains(l.Id));
            else if (status == "reported" || status == "flagged")
                query = query.Where(l => false);
        }

        query = query.OrderByDescending(l => l.CreatedAt);
        var total = await query.CountAsync();
        var listings = await query
            .Skip((page - 1) * limit)
            .Take(limit)
            .ToListAsync();

        return Ok(new
        {
            success = true,
            data = listings.Select(listing => MapLaravelFeedListing(listing, hiddenIds.Contains(listing.Id), recentComments: null)).ToList(),
            meta = BuildLaravelPaginationMeta(page, limit, total)
        });
    }

    private async Task<IActionResult> GetListingForModeration(int id)
    {
        var tenantId = _tenantContext.GetTenantIdOrThrow();
        if (await IsFeedItemDeletedAsync(tenantId, "listing", id))
        {
            return LaravelNotFound("Feed item not found");
        }

        var listing = await _db.Listings
            .Include(l => l.User)
            .Include(l => l.Tenant)
            .FirstOrDefaultAsync(l => l.TenantId == tenantId && l.Id == id && l.DeletedAt == null);

        if (listing == null)
        {
            return LaravelNotFound("Feed item not found");
        }

        var isHidden = await IsFeedItemHiddenAsync(tenantId, "listing", id);
        return Ok(new
        {
            success = true,
            data = MapLaravelFeedListing(listing, isHidden, Array.Empty<object>())
        });
    }

    private async Task<IActionResult> HideListingFeedItem(int id, int adminId)
    {
        var tenantId = _tenantContext.GetTenantIdOrThrow();
        var listingExists = await _db.Listings.AnyAsync(l => l.TenantId == tenantId && l.Id == id && l.DeletedAt == null);
        if (!listingExists || await IsFeedItemDeletedAsync(tenantId, "listing", id))
        {
            return LaravelNotFound("Feed item not found");
        }

        await SetFeedFlagAsync(tenantId, "listing", id, deleted: false);
        await _db.SaveChangesAsync();

        _logger.LogInformation("Admin {AdminId} hid listing feed item {ListingId}", adminId, id);
        return Ok(new { success = true, data = new { success = true, message = "Feed item hidden" } });
    }

    private async Task<IActionResult> DeleteListingFeedItem(int id, int adminId)
    {
        var tenantId = _tenantContext.GetTenantIdOrThrow();
        var listingExists = await _db.Listings.AnyAsync(l => l.TenantId == tenantId && l.Id == id && l.DeletedAt == null);
        if (!listingExists || await IsFeedItemDeletedAsync(tenantId, "listing", id))
        {
            return LaravelNotFound("Feed item not found");
        }

        await SetFeedFlagAsync(tenantId, "listing", id, deleted: true);
        await _db.SaveChangesAsync();

        _logger.LogInformation("Admin {AdminId} deleted listing feed item {ListingId}", adminId, id);
        return Ok(new { success = true, data = new { success = true, message = "Feed item deleted" } });
    }

    private async Task<IActionResult> GetEventModerationQueue(
        int tenantId,
        string? status,
        int? userId,
        string? search,
        int page,
        int limit)
    {
        var hiddenIds = await LoadFeedFlaggedIdsAsync(tenantId, "event", deleted: false);
        var deletedIds = await LoadFeedFlaggedIdsAsync(tenantId, "event", deleted: true);

        var query = _db.Events
            .Include(e => e.CreatedBy)
            .Include(e => e.Tenant)
            .Where(e => e.TenantId == tenantId && !e.IsCancelled && !deletedIds.Contains(e.Id));

        if (userId.HasValue && userId.Value > 0)
        {
            query = query.Where(e => e.CreatedById == userId.Value);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var normalizedSearch = search.Trim();
            query = query.Where(e =>
                e.Title.Contains(normalizedSearch) ||
                (e.Description != null && e.Description.Contains(normalizedSearch)) ||
                e.CreatedBy!.FirstName.Contains(normalizedSearch) ||
                e.CreatedBy.LastName.Contains(normalizedSearch) ||
                e.CreatedBy.Email.Contains(normalizedSearch));
        }

        if (!string.IsNullOrWhiteSpace(status))
        {
            if (status == "hidden")
                query = query.Where(e => hiddenIds.Contains(e.Id));
            else if (status == "active" || status == "visible")
                query = query.Where(e => !hiddenIds.Contains(e.Id));
            else if (status == "reported" || status == "flagged")
                query = query.Where(e => false);
        }

        query = query.OrderByDescending(e => e.CreatedAt);
        var total = await query.CountAsync();
        var events = await query
            .Skip((page - 1) * limit)
            .Take(limit)
            .ToListAsync();

        return Ok(new
        {
            success = true,
            data = events.Select(evt => MapLaravelFeedEvent(evt, hiddenIds.Contains(evt.Id), recentComments: null)).ToList(),
            meta = BuildLaravelPaginationMeta(page, limit, total)
        });
    }

    private async Task<IActionResult> GetEventForModeration(int id)
    {
        var tenantId = _tenantContext.GetTenantIdOrThrow();
        if (await IsFeedItemDeletedAsync(tenantId, "event", id))
        {
            return LaravelNotFound("Feed item not found");
        }

        var evt = await _db.Events
            .Include(e => e.CreatedBy)
            .Include(e => e.Tenant)
            .FirstOrDefaultAsync(e => e.TenantId == tenantId && e.Id == id && !e.IsCancelled);

        if (evt == null)
        {
            return LaravelNotFound("Feed item not found");
        }

        var isHidden = await IsFeedItemHiddenAsync(tenantId, "event", id);
        return Ok(new
        {
            success = true,
            data = MapLaravelFeedEvent(evt, isHidden, Array.Empty<object>())
        });
    }

    private async Task<IActionResult> HideEventFeedItem(int id, int adminId)
    {
        var tenantId = _tenantContext.GetTenantIdOrThrow();
        var eventExists = await _db.Events.AnyAsync(e => e.TenantId == tenantId && e.Id == id && !e.IsCancelled);
        if (!eventExists || await IsFeedItemDeletedAsync(tenantId, "event", id))
        {
            return LaravelNotFound("Feed item not found");
        }

        await SetFeedFlagAsync(tenantId, "event", id, deleted: false);
        await _db.SaveChangesAsync();

        _logger.LogInformation("Admin {AdminId} hid event feed item {EventId}", adminId, id);
        return Ok(new { success = true, data = new { success = true, message = "Feed item hidden" } });
    }

    private async Task<IActionResult> DeleteEventFeedItem(int id, int adminId)
    {
        var tenantId = _tenantContext.GetTenantIdOrThrow();
        var eventExists = await _db.Events.AnyAsync(e => e.TenantId == tenantId && e.Id == id && !e.IsCancelled);
        if (!eventExists || await IsFeedItemDeletedAsync(tenantId, "event", id))
        {
            return LaravelNotFound("Feed item not found");
        }

        await SetFeedFlagAsync(tenantId, "event", id, deleted: true);
        await _db.SaveChangesAsync();

        _logger.LogInformation("Admin {AdminId} deleted event feed item {EventId}", adminId, id);
        return Ok(new { success = true, data = new { success = true, message = "Feed item deleted" } });
    }

    private IActionResult LaravelNotFound(string message)
    {
        return NotFound(new
        {
            success = false,
            error = new { code = "NOT_FOUND", message }
        });
    }

    private async Task<IReadOnlyList<object>> MapLaravelFeedPostsAsync(IReadOnlyList<FeedPost> posts, int tenantId)
    {
        var postIds = posts.Select(p => p.Id).ToArray();
        var likeCounts = await _db.PostLikes
            .Where(l => l.TenantId == tenantId && postIds.Contains(l.PostId))
            .GroupBy(l => l.PostId)
            .Select(g => new { PostId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.PostId, x => x.Count);
        var commentCounts = await _db.PostComments
            .Where(c => c.TenantId == tenantId && postIds.Contains(c.PostId))
            .GroupBy(c => c.PostId)
            .Select(g => new { PostId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.PostId, x => x.Count);
        var reportCounts = await _db.FeedReports
            .Where(r => r.TenantId == tenantId && r.Status == "pending" && postIds.Contains(r.PostId))
            .GroupBy(r => r.PostId)
            .Select(g => new { PostId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.PostId, x => x.Count);

        return posts
            .Select(post => MapLaravelFeedPost(
                post,
                likeCounts.GetValueOrDefault(post.Id),
                commentCounts.GetValueOrDefault(post.Id),
                reportCounts.GetValueOrDefault(post.Id),
                recentComments: null))
            .ToList();
    }

    private static object MapLaravelFeedPost(
        FeedPost post,
        int likesCount,
        int commentsCount,
        int pendingReportsCount,
        object? recentComments)
    {
        return new
        {
            id = post.Id,
            activity_id = post.Id,
            user_id = post.UserId,
            tenant_id = post.TenantId,
            tenant_name = post.Tenant?.Name ?? "Unknown",
            user_name = FullName(post.User),
            user_email = post.User?.Email,
            user_avatar = post.User?.AvatarUrl,
            type = "post",
            content = post.Content,
            image_url = post.ImageUrl,
            likes_count = likesCount,
            comments_count = commentsCount,
            is_hidden = post.IsHidden,
            is_flagged = pendingReportsCount > 0,
            reports_count = pendingReportsCount,
            visibility = post.IsHidden ? "hidden" : "visible",
            created_at = post.CreatedAt,
            recent_comments = recentComments ?? Array.Empty<object>()
        };
    }

    private static object MapLaravelFeedListing(Listing listing, bool isHidden, object? recentComments)
    {
        return new
        {
            id = listing.Id,
            activity_id = listing.Id,
            user_id = listing.UserId,
            tenant_id = listing.TenantId,
            tenant_name = listing.Tenant?.Name ?? "Unknown",
            user_name = FullName(listing.User),
            user_email = listing.User?.Email,
            user_avatar = listing.User?.AvatarUrl,
            type = "listing",
            content = string.IsNullOrWhiteSpace(listing.Description)
                ? listing.Title
                : $"{listing.Title}\n{listing.Description}",
            image_url = listing.ImageUrl,
            likes_count = 0,
            comments_count = 0,
            is_hidden = isHidden,
            is_flagged = false,
            reports_count = 0,
            visibility = isHidden ? "hidden" : "visible",
            created_at = listing.CreatedAt,
            recent_comments = recentComments ?? Array.Empty<object>()
        };
    }

    private static object MapLaravelFeedEvent(Event evt, bool isHidden, object? recentComments)
    {
        return new
        {
            id = evt.Id,
            activity_id = evt.Id,
            user_id = evt.CreatedById,
            tenant_id = evt.TenantId,
            tenant_name = evt.Tenant?.Name ?? "Unknown",
            user_name = FullName(evt.CreatedBy),
            user_email = evt.CreatedBy?.Email,
            user_avatar = evt.CreatedBy?.AvatarUrl,
            type = "event",
            content = string.IsNullOrWhiteSpace(evt.Description)
                ? evt.Title
                : $"{evt.Title}\n{evt.Description}",
            image_url = evt.ImageUrl,
            likes_count = 0,
            comments_count = 0,
            is_hidden = isHidden,
            is_flagged = false,
            reports_count = 0,
            visibility = isHidden ? "hidden" : "visible",
            created_at = evt.CreatedAt,
            recent_comments = recentComments ?? Array.Empty<object>()
        };
    }

    private async Task<HashSet<int>> LoadFeedFlaggedIdsAsync(int tenantId, string type, bool deleted)
    {
        var prefix = FeedFlagKeyPrefix(type, deleted);
        var keys = await _db.TenantConfigs
            .AsNoTracking()
            .Where(c => c.TenantId == tenantId && c.Key.StartsWith(prefix) && c.Value == "true")
            .Select(c => c.Key)
            .ToListAsync();

        return keys
            .Select(key => int.TryParse(key[prefix.Length..], out var id) ? id : 0)
            .Where(id => id > 0)
            .ToHashSet();
    }

    private async Task<bool> IsFeedItemHiddenAsync(int tenantId, string type, int id)
    {
        var key = FeedFlagKey(type, id, deleted: false);
        return await _db.TenantConfigs.AnyAsync(c => c.TenantId == tenantId && c.Key == key && c.Value == "true");
    }

    private async Task<bool> IsFeedItemDeletedAsync(int tenantId, string type, int id)
    {
        var key = FeedFlagKey(type, id, deleted: true);
        return await _db.TenantConfigs.AnyAsync(c => c.TenantId == tenantId && c.Key == key && c.Value == "true");
    }

    private async Task SetFeedFlagAsync(int tenantId, string type, int id, bool deleted)
    {
        var key = FeedFlagKey(type, id, deleted);
        var existing = await _db.TenantConfigs.FirstOrDefaultAsync(c => c.TenantId == tenantId && c.Key == key);
        if (existing != null)
        {
            existing.Value = "true";
            existing.UpdatedAt = DateTime.UtcNow;
            return;
        }

        _db.TenantConfigs.Add(new TenantConfig
        {
            TenantId = tenantId,
            Key = key,
            Value = "true",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        });
    }

    private static string FeedFlagKey(string type, int id, bool deleted)
    {
        return FeedFlagKeyPrefix(type, deleted) + id;
    }

    private static string FeedFlagKeyPrefix(string type, bool deleted)
    {
        return (deleted ? FeedDeletedKeyPrefix : FeedHiddenKeyPrefix) + type + ".";
    }

    private static object BuildLaravelPaginationMeta(int page, int limit, int total)
    {
        var totalPages = total > 0 ? (int)Math.Ceiling(total / (double)limit) : 1;
        return new
        {
            current_page = page,
            page,
            total_pages = totalPages,
            per_page = limit,
            total,
            has_more = page < totalPages
        };
    }

    private static string FullName(User? user)
    {
        if (user == null)
        {
            return "Unknown";
        }

        var name = $"{user.FirstName} {user.LastName}".Trim();
        return string.IsNullOrWhiteSpace(name) ? user.Email : name;
    }
}

/// <summary>Request body for moderation actions.</summary>
public class AdminModerateRequest
{
    [JsonPropertyName("reason")]
    public string? Reason { get; set; }

    [JsonPropertyName("type")]
    public string? Type { get; set; }
}
