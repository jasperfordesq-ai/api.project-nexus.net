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
[Authorize(Policy = "AdminOnly")]
public class AdminFeedController : ControllerBase
{
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
        [FromQuery] int page = 1,
        [FromQuery] int limit = 20)
    {
        if (page < 1) page = 1;
        if (limit < 1) limit = 1;
        if (limit > 100) limit = 100;

        var tenantId = _tenantContext.GetTenantIdOrThrow();

        var query = _db.FeedPosts
            .Include(p => p.User)
            .Where(p => p.TenantId == tenantId);

        if (!string.IsNullOrWhiteSpace(status))
        {
            if (status == "reported")
                query = query.Where(p => _db.FeedReports.Any(r => r.PostId == p.Id && r.TenantId == tenantId && r.Status == "pending"));
            else if (status == "hidden")
                query = query.Where(p => p.IsHidden);
        }

        query = query.OrderByDescending(p => p.CreatedAt);

        var total = await query.CountAsync();
        var posts = await query
            .Skip((page - 1) * limit)
            .Take(limit)
            .Select(p => new
            {
                p.Id,
                p.Content,
                p.IsHidden,
                author = new { p.User!.Id, p.User.FirstName, p.User.LastName, p.User.Email },
                reportCount = _db.FeedReports.Count(r => r.PostId == p.Id && r.Status == "pending"),
                p.CreatedAt
            })
            .ToListAsync();

        return Ok(new
        {
            data = posts,
            pagination = new { page, limit, total, pages = (int)Math.Ceiling(total / (double)limit) }
        });
    }

    /// <summary>GET /api/admin/feed/posts/{id} — post details with reports for moderation.</summary>
    [HttpGet("posts/{id:int}")]
    public async Task<IActionResult> GetPostForModeration(int id)
    {
        var tenantId = _tenantContext.GetTenantIdOrThrow();

        var post = await _db.FeedPosts
            .Include(p => p.User)
            .FirstOrDefaultAsync(p => p.Id == id && p.TenantId == tenantId);

        if (post == null)
            return NotFound(new { error = "Post not found" });

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

        var tenantId = _tenantContext.GetTenantIdOrThrow();

        var post = await _db.FeedPosts.FirstOrDefaultAsync(p => p.Id == id && p.TenantId == tenantId);
        if (post == null) return NotFound(new { error = "Post not found" });

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
        return Ok(new { message = "Post hidden", postId = id });
    }

    /// <summary>DELETE /api/admin/feed/posts/{id} — admin delete post.</summary>
    [HttpDelete("posts/{id:int}")]
    public async Task<IActionResult> AdminDeletePost(int id)
    {
        var adminId = User.GetUserId();
        if (adminId == null) return Unauthorized(new { error = "Invalid token" });

        var tenantId = _tenantContext.GetTenantIdOrThrow();

        var post = await _db.FeedPosts.FirstOrDefaultAsync(p => p.Id == id && p.TenantId == tenantId);
        if (post == null) return NotFound(new { error = "Post not found" });

        _db.FeedPosts.Remove(post);
        await _db.SaveChangesAsync();

        _logger.LogInformation("Admin {AdminId} deleted feed post {PostId}", adminId, id);
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

        return Ok(new
        {
            totalPosts,
            hiddenPosts,
            pendingReports,
            totalReports,
            postsLast7Days
        });
    }
}

/// <summary>Request body for moderation actions.</summary>
public class AdminModerateRequest
{
    [JsonPropertyName("reason")]
    public string? Reason { get; set; }
}
