// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.EntityFrameworkCore;
using Nexus.Api.Data;
using Nexus.Api.Entities;
using Nexus.Api.Extensions;
using Nexus.Api.Services;

namespace Nexus.Api.Controllers;

/// <summary>
/// Compatibility routes for V1.5 member-facing social/feed/notification clusters.
/// </summary>
[ApiController]
[Authorize]
public class V15SocialCompatibilityController : ControllerBase
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);
    private static readonly JsonSerializerOptions StoreJsonOptions = new(JsonSerializerDefaults.Web)
    {
        PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
        PropertyNameCaseInsensitive = true
    };
    private static readonly string[] LaravelNotificationPreferenceKeys =
    [
        "email_messages",
        "email_listings",
        "email_digest",
        "email_connections",
        "email_transactions",
        "email_reviews",
        "email_gamification_digest",
        "email_gamification_milestones",
        "email_org_payments",
        "email_org_transfers",
        "email_org_membership",
        "email_org_admin",
        "caring_smart_nudges",
        "push_enabled",
        "push_campaigns_opted_in"
    ];
    private static readonly IReadOnlyDictionary<string, bool> LaravelNotificationPreferenceDefaults = new Dictionary<string, bool>
    {
        ["email_messages"] = true,
        ["email_listings"] = true,
        ["email_digest"] = false,
        ["email_connections"] = true,
        ["email_transactions"] = true,
        ["email_reviews"] = true,
        ["email_gamification_digest"] = true,
        ["email_gamification_milestones"] = true,
        ["email_org_payments"] = true,
        ["email_org_transfers"] = true,
        ["email_org_membership"] = true,
        ["email_org_admin"] = true,
        ["caring_smart_nudges"] = true,
        ["push_enabled"] = true,
        ["push_campaigns_opted_in"] = false,
        ["federation_notifications_enabled"] = true
    };

    private const string SupportReportsKey = "admin_explicit.support_reports";
    private readonly NexusDbContext _db;
    private readonly TenantContext _tenantContext;
    private readonly PushNotificationService _pushService;

    public V15SocialCompatibilityController(
        NexusDbContext db,
        TenantContext tenantContext,
        PushNotificationService pushService)
    {
        _db = db;
        _tenantContext = tenantContext;
        _pushService = pushService;
    }

    [HttpGet("/api/v2/feed")]
    public async Task<IActionResult> Feed([FromQuery] int page = 1, [FromQuery] int limit = 20)
    {
        var userId = RequireUserId();
        var safePage = Math.Max(page, 1);
        var safeLimit = Math.Clamp(limit, 1, 100);
        var hidden = _db.HiddenPosts.Where(h => h.UserId == userId).Select(h => h.PostId);
        var muted = _db.MutedUsers.Where(m => m.UserId == userId).Select(m => m.MutedUserId);
        var query = _db.FeedPosts.Where(p => !p.IsHidden && !hidden.Contains(p.Id) && !muted.Contains(p.UserId));
        var total = await query.CountAsync();
        var data = await query
            .OrderByDescending(p => p.IsPinned)
            .ThenByDescending(p => p.CreatedAt)
            .Skip((safePage - 1) * safeLimit)
            .Take(safeLimit)
            .Select(p => new
            {
                id = p.Id,
                type = "post",
                content = p.Content,
                image_url = p.ImageUrl,
                group_id = p.GroupId,
                user_id = p.UserId,
                author = p.User == null ? null : new { id = p.User.Id, name = (p.User.FirstName + " " + p.User.LastName).Trim(), avatar_url = p.User.AvatarUrl },
                likes_count = p.Likes.Count,
                comments_count = p.Comments.Count,
                is_liked = p.Likes.Any(l => l.UserId == userId),
                created_at = p.CreatedAt,
                updated_at = p.UpdatedAt
            })
            .ToListAsync();

        return Ok(new { data, meta = PageMeta(safePage, safeLimit, total) });
    }

    [HttpPost("/api/social/feed")]
    public Task<IActionResult> LegacyFeed([FromBody] JsonElement _) => Feed(1, 20);

    [HttpGet("/api/v2/feed/posts/{id:int}")]
    [HttpGet("/api/v2/feed/items/post/{id:int}")]
    public async Task<IActionResult> ShowPost(int id)
    {
        var userId = RequireUserId();
        var post = await _db.FeedPosts
            .Where(p => p.Id == id && !p.IsHidden)
            .Select(p => new
            {
                id = p.Id,
                type = "post",
                content = p.Content,
                image_url = p.ImageUrl,
                group_id = p.GroupId,
                user_id = p.UserId,
                author = p.User == null ? null : new { id = p.User.Id, name = (p.User.FirstName + " " + p.User.LastName).Trim(), avatar_url = p.User.AvatarUrl },
                likes_count = p.Likes.Count,
                comments_count = p.Comments.Count,
                shares_count = _db.PostShares.Count(s => s.PostId == p.Id),
                is_liked = p.Likes.Any(l => l.UserId == userId),
                created_at = p.CreatedAt,
                updated_at = p.UpdatedAt
            })
            .FirstOrDefaultAsync();

        return post == null ? NotFound(new { error = "Post not found" }) : Ok(new { data = post });
    }

    [HttpGet("/api/v2/feed/items/{type}/{id:int}")]
    public IActionResult ShowFeedItem(string type, int id)
    {
        return type.Equals("post", StringComparison.OrdinalIgnoreCase)
            ? RedirectToAction(nameof(ShowPost), new { id })
            : NotFound(new { error = "Feed item type not supported" });
    }

    [HttpPost("/api/social/create-post")]
    [HttpPost("/api/v2/feed/posts")]
    public async Task<IActionResult> CreatePost([FromBody] JsonElement body)
    {
        var content = ReadString(body, "content", "body", "message", "text")?.Trim();
        if (string.IsNullOrWhiteSpace(content)) return BadRequest(new { error = "content is required" });
        var post = new FeedPost
        {
            TenantId = TenantId(),
            UserId = RequireUserId(),
            GroupId = ReadInt(body, "group_id", "groupId"),
            Content = content,
            ImageUrl = ReadString(body, "image_url", "imageUrl")
        };

        _db.FeedPosts.Add(post);
        await _db.SaveChangesAsync();
        return Created($"/api/v2/feed/posts/{post.Id}", new { success = true, data = post });
    }

    [HttpPut("/api/v2/feed/posts/{id:int}")]
    public async Task<IActionResult> UpdatePost(int id, [FromBody] JsonElement body)
    {
        var userId = RequireUserId();
        var post = await _db.FeedPosts.FirstOrDefaultAsync(p => p.Id == id && p.UserId == userId);
        if (post == null) return NotFound(new { error = "Post not found" });
        var content = ReadString(body, "content", "body", "message", "text");
        if (!string.IsNullOrWhiteSpace(content)) post.Content = content.Trim();
        var imageUrl = ReadString(body, "image_url", "imageUrl");
        if (imageUrl != null) post.ImageUrl = imageUrl;
        post.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(new { success = true, data = post });
    }

    [HttpDelete("/api/v2/feed/posts/{id:int}")]
    [HttpPost("/api/v2/feed/posts/{id:int}/delete")]
    public async Task<IActionResult> DeletePost(int id)
    {
        var post = await _db.FeedPosts.FirstOrDefaultAsync(p => p.Id == id && p.UserId == RequireUserId());
        if (post == null) return NotFound(new { error = "Post not found" });
        _db.FeedPosts.Remove(post);
        await _db.SaveChangesAsync();
        return Ok(new { success = true });
    }

    [HttpPost("/api/social/delete")]
    public Task<IActionResult> DeletePostLegacy([FromBody] JsonElement body) => DeletePost(ReadRequiredInt(body, "id", "post_id", "postId"));

    [HttpPost("/api/social/like")]
    [HttpPost("/api/v2/feed/like")]
    public async Task<IActionResult> ToggleLike([FromBody] JsonElement body)
    {
        var postId = ReadRequiredInt(body, "post_id", "postId", "id");
        return await TogglePostLike(postId);
    }

    [HttpPost("/api/v2/feed/posts/{id:int}/hide")]
    [HttpPost("/api/feed/hide")]
    public async Task<IActionResult> HidePost(int? id, [FromBody] JsonElement body)
    {
        var postId = id ?? ReadRequiredInt(body, "post_id", "postId", "id");
        var userId = RequireUserId();
        if (!await _db.HiddenPosts.AnyAsync(h => h.PostId == postId && h.UserId == userId))
        {
            _db.HiddenPosts.Add(new HiddenPost { TenantId = TenantId(), PostId = postId, UserId = userId });
            await _db.SaveChangesAsync();
        }

        return Ok(new { success = true });
    }

    [HttpPost("/api/v2/feed/posts/{id:int}/not-interested")]
    public Task<IActionResult> NotInterested(int id, [FromBody] JsonElement body) => HidePost(id, body);

    [HttpPost("/api/v2/feed/users/{id:int}/mute")]
    public async Task<IActionResult> MuteUserV2(int id)
    {
        return await MuteUserCore(id);
    }

    [HttpPost("/api/feed/mute")]
    public async Task<IActionResult> MuteUser([FromBody] JsonElement body)
    {
        return await MuteUserCore(ReadRequiredInt(body, "muted_user_id", "user_id", "id"));
    }

    [HttpPost("/api/feed/report")]
    [HttpPost("/api/v2/feed/posts/{id:int}/report")]
    [HttpPost("/api/v2/feed/items/post/{id:int}/report")]
    public async Task<IActionResult> ReportPost(int? id, [FromBody] JsonElement body)
    {
        var postId = id ?? ReadRequiredInt(body, "post_id", "postId", "id");
        var report = new FeedReport
        {
            TenantId = TenantId(),
            PostId = postId,
            ReporterId = RequireUserId(),
            Reason = ReadString(body, "reason") ?? "other",
            Details = ReadString(body, "details", "description")
        };

        _db.FeedReports.Add(report);
        await _db.SaveChangesAsync();
        return Ok(new { success = true, data = report });
    }

    [HttpPost("/api/v2/feed/items/{type}/{id:int}/report")]
    public Task<IActionResult> ReportFeedItem(string type, int id, [FromBody] JsonElement body)
    {
        return type.Equals("post", StringComparison.OrdinalIgnoreCase)
            ? ReportPost(id, body)
            : Task.FromResult<IActionResult>(Ok(new { success = true, item_type = type, item_id = id }));
    }

    [HttpPost("/api/social/comments")]
    public async Task<IActionResult> Comments([FromBody] JsonElement body)
    {
        var postId = ReadRequiredInt(body, "post_id", "postId", "id");
        var data = await _db.PostComments
            .Where(c => c.PostId == postId && c.ParentCommentId == null)
            .OrderBy(c => c.CreatedAt)
            .Select(c => MapComment(c))
            .ToListAsync();
        return Ok(new { data });
    }

    [HttpPost("/api/social/reply")]
    public async Task<IActionResult> Reply([FromBody] JsonElement body)
    {
        var content = ReadString(body, "content", "body", "comment", "message")?.Trim();
        if (string.IsNullOrWhiteSpace(content)) return BadRequest(new { error = "content is required" });
        var comment = new PostComment
        {
            TenantId = TenantId(),
            PostId = ReadRequiredInt(body, "post_id", "postId"),
            ParentCommentId = ReadInt(body, "parent_id", "parent_comment_id", "comment_id"),
            UserId = RequireUserId(),
            Content = content
        };

        _db.PostComments.Add(comment);
        await _db.SaveChangesAsync();
        return Created($"/api/v2/feed/posts/{comment.PostId}", new { success = true, data = comment });
    }

    [HttpPost("/api/social/edit-comment")]
    public async Task<IActionResult> EditComment([FromBody] JsonElement body)
    {
        var comment = await _db.PostComments.FirstOrDefaultAsync(c => c.Id == ReadRequiredInt(body, "id", "comment_id") && c.UserId == RequireUserId());
        if (comment == null) return NotFound(new { error = "Comment not found" });
        var content = ReadString(body, "content", "body", "comment", "message")?.Trim();
        if (!string.IsNullOrWhiteSpace(content)) comment.Content = content;
        comment.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(new { success = true, data = comment });
    }

    [HttpPost("/api/social/delete-comment")]
    public async Task<IActionResult> DeleteComment([FromBody] JsonElement body)
    {
        var comment = await _db.PostComments.FirstOrDefaultAsync(c => c.Id == ReadRequiredInt(body, "id", "comment_id") && c.UserId == RequireUserId());
        if (comment == null) return NotFound(new { error = "Comment not found" });
        _db.PostComments.Remove(comment);
        await _db.SaveChangesAsync();
        return Ok(new { success = true });
    }

    [HttpPost("/api/social/reaction")]
    [HttpPost("/api/v2/posts/{id:int}/reactions")]
    public async Task<IActionResult> ToggleReaction(int? id, [FromBody] JsonElement body)
    {
        var postId = id ?? ReadRequiredInt(body, "post_id", "postId", "id");
        var type = ReadString(body, "type", "reaction", "reaction_type") ?? PostReaction.Types.Like;
        if (!PostReaction.Types.All.Contains(type)) return BadRequest(new { error = "Unsupported reaction type" });
        var userId = RequireUserId();
        var existing = await _db.PostReactions.FirstOrDefaultAsync(r => r.PostId == postId && r.UserId == userId);
        if (existing != null && existing.ReactionType == type)
        {
            _db.PostReactions.Remove(existing);
        }
        else if (existing != null)
        {
            existing.ReactionType = type;
        }
        else
        {
            _db.PostReactions.Add(new PostReaction { TenantId = TenantId(), PostId = postId, UserId = userId, ReactionType = type });
        }

        await _db.SaveChangesAsync();
        return Ok(await ReactionSummary(postId));
    }

    [HttpGet("/api/v2/posts/{id:int}/reactions")]
    public async Task<IActionResult> Reactions(int id) => Ok(await ReactionSummary(id));

    [HttpGet("/api/v2/posts/{id:int}/reactions/{type}/users")]
    public async Task<IActionResult> Reactors(int id, string type)
    {
        var users = await _db.PostReactions
            .Where(r => r.PostId == id && r.ReactionType == type)
            .Select(r => new { id = r.UserId, name = r.User == null ? null : (r.User.FirstName + " " + r.User.LastName).Trim(), avatar_url = r.User == null ? null : r.User.AvatarUrl })
            .ToListAsync();
        return Ok(new { data = users });
    }

    [HttpPost("/api/social/share")]
    [HttpPost("/api/v2/feed/posts/{id:int}/share")]
    public async Task<IActionResult> SharePost(int? id, [FromBody] JsonElement body)
    {
        var postId = id ?? ReadRequiredInt(body, "post_id", "postId", "id");
        var share = new PostShare
        {
            TenantId = TenantId(),
            UserId = RequireUserId(),
            PostId = postId,
            SharedTo = ReadString(body, "shared_to", "channel") ?? PostShare.Channels.Internal
        };

        _db.PostShares.Add(share);
        await _db.SaveChangesAsync();
        return Ok(new { success = true, data = share });
    }

    [HttpDelete("/api/v2/feed/posts/{id:int}/share")]
    public async Task<IActionResult> UnsharePost(int id)
    {
        var share = await _db.PostShares.FirstOrDefaultAsync(s => s.PostId == id && s.UserId == RequireUserId());
        if (share != null)
        {
            _db.PostShares.Remove(share);
            await _db.SaveChangesAsync();
        }

        return Ok(new { success = true });
    }

    [HttpGet("/api/v2/feed/posts/{id:int}/sharers")]
    public async Task<IActionResult> Sharers(int id)
    {
        var data = await _db.PostShares
            .Where(s => s.PostId == id)
            .Select(s => new { id = s.UserId, name = s.User == null ? null : (s.User.FirstName + " " + s.User.LastName).Trim(), shared_to = s.SharedTo, created_at = s.CreatedAt })
            .ToListAsync();
        return Ok(new { data });
    }

    [HttpPost("/api/social/likers")]
    public async Task<IActionResult> Likers([FromBody] JsonElement body)
    {
        var postId = ReadRequiredInt(body, "post_id", "postId", "id");
        var data = await _db.PostLikes
            .Where(l => l.PostId == postId)
            .Select(l => new { id = l.UserId, name = l.User == null ? null : (l.User.FirstName + " " + l.User.LastName).Trim(), created_at = l.CreatedAt })
            .ToListAsync();
        return Ok(new { data });
    }

    [HttpPost("/api/v2/feed/posts/{id:int}/view")]
    [HttpPost("/api/v2/feed/posts/{id:int}/click")]
    [HttpPost("/api/v2/feed/posts/{id:int}/impression")]
    [HttpPost("/api/v2/feed/click")]
    [HttpPost("/api/v2/feed/impression")]
    public IActionResult TrackFeedEvent(int? id, [FromBody] JsonElement body)
    {
        return Ok(new { success = true, post_id = id ?? ReadInt(body, "post_id", "postId", "id"), tracked_at = DateTime.UtcNow });
    }

    [HttpPost("/api/v2/feed/polls")]
    public async Task<IActionResult> CreateFeedPoll([FromBody] JsonElement body)
    {
        var title = ReadString(body, "title", "question")?.Trim();
        if (string.IsNullOrWhiteSpace(title)) return BadRequest(new { error = "title is required" });
        var poll = new Poll
        {
            TenantId = TenantId(),
            CreatedById = RequireUserId(),
            Title = title,
            Description = ReadString(body, "description"),
            PollType = ReadString(body, "poll_type", "type") ?? "single",
            GroupId = ReadInt(body, "group_id", "groupId"),
            ClosesAt = ReadDate(body, "closes_at", "closesAt")
        };

        _db.Polls.Add(poll);
        await _db.SaveChangesAsync();
        return Created($"/api/v2/feed/polls/{poll.Id}", new { data = poll });
    }

    [HttpGet("/api/v2/feed/polls/{id:int}")]
    public async Task<IActionResult> FeedPoll(int id)
    {
        var poll = await _db.Polls.Include(p => p.Options).FirstOrDefaultAsync(p => p.Id == id);
        return poll == null ? NotFound(new { error = "Poll not found" }) : Ok(new { data = poll });
    }

    [HttpPost("/api/v2/feed/polls/{id:int}/vote")]
    public async Task<IActionResult> VoteFeedPoll(int id, [FromBody] JsonElement body)
    {
        var optionId = ReadRequiredInt(body, "option_id", "optionId");
        var userId = RequireUserId();
        var existing = await _db.PollVotes.FirstOrDefaultAsync(v => v.PollId == id && v.OptionId == optionId && v.UserId == userId);
        if (existing == null)
        {
            _db.PollVotes.Add(new PollVote { TenantId = TenantId(), PollId = id, OptionId = optionId, UserId = userId, Rank = ReadInt(body, "rank") });
            await _db.SaveChangesAsync();
        }

        return Ok(new { success = true });
    }

    [HttpPost("/api/v2/posts/{id:int}/media")]
    public IActionResult UploadPostMedia(int id, [FromBody] JsonElement body)
    {
        return Ok(new { success = true, data = new { post_id = id, media = JsonSerializer.Deserialize<object>(body.GetRawText(), JsonOptions) } });
    }

    [HttpPut("/api/v2/posts/{id:int}/media/reorder")]
    public IActionResult ReorderPostMedia(int id, [FromBody] JsonElement body)
    {
        return Ok(new { success = true, post_id = id, order = JsonSerializer.Deserialize<object>(body.GetRawText(), JsonOptions) });
    }

    [HttpDelete("/api/v2/posts/media/{mediaId:int}")]
    public IActionResult DeletePostMedia(int mediaId) => Ok(new { success = true, media_id = mediaId });

    [HttpPut("/api/v2/posts/media/{mediaId:int}/alt")]
    public IActionResult UpdatePostMediaAlt(int mediaId, [FromBody] JsonElement body)
    {
        return Ok(new { success = true, media_id = mediaId, alt = ReadString(body, "alt", "alt_text") });
    }

    [HttpGet("/api/v2/feed/posts/{id:int}/analytics")]
    public async Task<IActionResult> PostAnalytics(int id)
    {
        return Ok(new
        {
            data = new
            {
                post_id = id,
                likes = await _db.PostLikes.CountAsync(l => l.PostId == id),
                comments = await _db.PostComments.CountAsync(c => c.PostId == id),
                reactions = await _db.PostReactions.CountAsync(r => r.PostId == id),
                shares = await _db.PostShares.CountAsync(s => s.PostId == id)
            }
        });
    }

    [HttpGet("/api/v2/feed/posts/scheduled")]
    public async Task<IActionResult> ScheduledPosts()
    {
        var userId = RequireUserId();
        var data = await _db.GroupScheduledPosts.Where(p => p.AuthorUserId == userId && p.Status == "scheduled").OrderBy(p => p.ScheduledFor).ToListAsync();
        return Ok(new { data });
    }

    [HttpGet("/api/v2/groups/{id:int}/scheduled-posts")]
    public async Task<IActionResult> GroupScheduledPosts(int id)
    {
        var data = await _db.GroupScheduledPosts.Where(p => p.GroupId == id).OrderBy(p => p.ScheduledFor).ToListAsync();
        return Ok(new { data });
    }

    [HttpPost("/api/v2/groups/{id:int}/scheduled-posts")]
    public async Task<IActionResult> CreateGroupScheduledPost(int id, [FromBody] JsonElement body)
    {
        var content = ReadString(body, "content", "body")?.Trim();
        if (string.IsNullOrWhiteSpace(content)) return BadRequest(new { error = "content is required" });
        var row = new GroupScheduledPost
        {
            TenantId = TenantId(),
            GroupId = id,
            AuthorUserId = RequireUserId(),
            Content = content,
            ScheduledFor = ReadDate(body, "scheduled_for", "scheduledFor") ?? DateTime.UtcNow
        };

        _db.GroupScheduledPosts.Add(row);
        await _db.SaveChangesAsync();
        return Created($"/api/v2/groups/{id}/scheduled-posts/{row.Id}", new { data = row });
    }

    [HttpDelete("/api/v2/groups/{id:int}/scheduled-posts/{postId:int}")]
    public async Task<IActionResult> CancelGroupScheduledPost(int id, int postId)
    {
        var row = await _db.GroupScheduledPosts.FirstOrDefaultAsync(p => p.Id == postId && p.GroupId == id && p.AuthorUserId == RequireUserId());
        if (row == null) return NotFound(new { error = "Scheduled post not found" });
        row.Status = "cancelled";
        await _db.SaveChangesAsync();
        return Ok(new { success = true, data = row });
    }

    [HttpGet("/api/v2/feed/hashtags/trending")]
    public async Task<IActionResult> TrendingHashtags()
    {
        var data = await _db.Hashtags.OrderByDescending(h => h.UsageCount).ThenByDescending(h => h.LastUsedAt).Take(20).ToListAsync();
        return Ok(new { data });
    }

    [HttpGet("/api/v2/feed/hashtags/search")]
    public async Task<IActionResult> SearchHashtags([FromQuery] string? q = null)
    {
        var needle = (q ?? string.Empty).Trim().TrimStart('#').ToLowerInvariant();
        var data = await _db.Hashtags
            .Where(h => needle == string.Empty || h.Tag.Contains(needle))
            .OrderByDescending(h => h.UsageCount)
            .Take(20)
            .ToListAsync();
        return Ok(new { data });
    }

    [HttpGet("/api/v2/feed/hashtags/{tag}")]
    public async Task<IActionResult> HashtagPosts(string tag)
    {
        var clean = tag.TrimStart('#').ToLowerInvariant();
        var postIds = _db.HashtagUsages.Where(u => u.TargetType == "post" && u.Hashtag != null && u.Hashtag.Tag == clean).Select(u => u.TargetId);
        var data = await _db.FeedPosts.Where(p => postIds.Contains(p.Id)).OrderByDescending(p => p.CreatedAt).ToListAsync();
        return Ok(new { data });
    }

    [HttpGet("/api/v2/feed/sidebar")]
    public async Task<IActionResult> FeedSidebar()
    {
        var trending = await _db.Hashtags.OrderByDescending(h => h.UsageCount).Take(10).ToListAsync();
        var groups = await _db.Groups.OrderByDescending(g => g.CreatedAt).Take(5).Select(g => new { g.Id, g.Name, g.Description }).ToListAsync();
        return Ok(new { data = new { trending_hashtags = trending, suggested_groups = groups } });
    }

    [HttpGet("/api/v2/jobs/feed.json")]
    public IActionResult JobsJsonFeed() => Ok(new { version = "https://jsonfeed.org/version/1.1", title = "Project NEXUS Jobs", items = Array.Empty<object>() });

    [HttpGet("/api/v2/jobs/feed.xml")]
    [HttpGet("/api/v2/jobs/feed/indeed.xml")]
    [Produces("application/xml")]
    public IActionResult JobsXmlFeed()
    {
        return Content("""<?xml version="1.0" encoding="utf-8"?><rss version="2.0"><channel><title>Project NEXUS Jobs</title></channel></rss>""", "application/xml");
    }

    [HttpPost("/api/social/mention-search")]
    public async Task<IActionResult> MentionSearch([FromBody] JsonElement body)
    {
        var q = ReadString(body, "q", "query", "term") ?? string.Empty;
        var data = await _db.Users
            .Where(u => (u.FirstName + " " + u.LastName).Contains(q) || u.Email.Contains(q))
            .Take(10)
            .Select(u => new { id = u.Id, name = (u.FirstName + " " + u.LastName).Trim(), avatar_url = u.AvatarUrl })
            .ToListAsync();
        return Ok(new { data });
    }

    [HttpGet("/api/social/test")]
    public IActionResult SocialTest() => Ok(new { ok = true, service = "social" });

    [HttpGet("/api/v2/notifications")]
    public async Task<IActionResult> Notifications([FromQuery] int page = 1, [FromQuery] int limit = 20)
    {
        var safePage = Math.Max(page, 1);
        var safeLimit = Math.Clamp(limit, 1, 100);
        var userId = RequireUserId();
        var query = _db.Notifications.Where(n => n.UserId == userId);
        var total = await query.CountAsync();
        var data = await query.OrderByDescending(n => n.CreatedAt).Skip((safePage - 1) * safeLimit).Take(safeLimit).ToListAsync();
        var unread = await query.CountAsync(n => !n.IsRead);
        return Ok(new { data, unread_count = unread, meta = PageMeta(safePage, safeLimit, total) });
    }

    [HttpGet("/api/v2/notifications/{id:int}")]
    public async Task<IActionResult> Notification(int id)
    {
        var row = await _db.Notifications.FirstOrDefaultAsync(n => n.Id == id && n.UserId == RequireUserId());
        return row == null ? NotFound(new { error = "Notification not found" }) : Ok(new { data = row });
    }

    [HttpPost("/api/notifications/read")]
    public Task<IActionResult> NotificationReadLegacy([FromBody] JsonElement body) => MarkNotificationRead(ReadRequiredInt(body, "id", "notification_id"));

    [HttpPost("/api/v2/notifications/{id:int}/read")]
    public async Task<IActionResult> MarkNotificationRead(int id)
    {
        var row = await _db.Notifications.FirstOrDefaultAsync(n => n.Id == id && n.UserId == RequireUserId());
        if (row == null) return NotFound(new { error = "Notification not found" });
        row.IsRead = true;
        row.ReadAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(new { success = true, data = row });
    }

    [HttpPost("/api/v2/notifications/read-all")]
    public async Task<IActionResult> MarkAllNotificationsRead()
    {
        var now = DateTime.UtcNow;
        var count = await _db.Notifications.Where(n => n.UserId == RequireUserId() && !n.IsRead)
            .ExecuteUpdateAsync(s => s.SetProperty(n => n.IsRead, true).SetProperty(n => n.ReadAt, now));
        return Ok(new { success = true, marked_count = count });
    }

    [HttpPost("/api/notifications/delete")]
    public Task<IActionResult> DeleteNotificationLegacy([FromBody] JsonElement body) => DeleteNotification(ReadRequiredInt(body, "id", "notification_id"));

    [HttpDelete("/api/v2/notifications/{id:int}")]
    public async Task<IActionResult> DeleteNotification(int id)
    {
        var row = await _db.Notifications.FirstOrDefaultAsync(n => n.Id == id && n.UserId == RequireUserId());
        if (row == null) return NotFound(new { error = "Notification not found" });
        _db.Notifications.Remove(row);
        await _db.SaveChangesAsync();
        return Ok(new { success = true });
    }

    [HttpDelete("/api/v2/notifications")]
    public async Task<IActionResult> DeleteAllNotifications()
    {
        var rows = await _db.Notifications.Where(n => n.UserId == RequireUserId()).ToListAsync();
        _db.Notifications.RemoveRange(rows);
        await _db.SaveChangesAsync();
        return Ok(new { success = true, deleted_count = rows.Count });
    }

    [HttpGet("/api/notifications/check")]
    [HttpGet("/api/v2/notifications/counts")]
    public async Task<IActionResult> NotificationCounts()
    {
        var userId = RequireUserId();
        var unread = await _db.Notifications.CountAsync(n => n.UserId == userId && !n.IsRead);
        return Ok(new { total = unread, unread, notifications = unread });
    }

    [HttpGet("/api/v2/notifications/grouped")]
    public async Task<IActionResult> GroupedNotifications()
    {
        var userId = RequireUserId();
        var rows = await _db.Notifications.Where(n => n.UserId == userId).OrderByDescending(n => n.CreatedAt).ToListAsync();
        return Ok(new { data = rows.GroupBy(n => n.Type).Select(g => new { group_key = g.Key, count = g.Count(), unread_count = g.Count(n => !n.IsRead), items = g }) });
    }

    [HttpGet("/api/wallet/config")]
    [HttpGet("/api/v2/wallet/config")]
    public async Task<IActionResult> WalletConfig()
    {
        var value = await _db.TenantConfigs
            .AsNoTracking()
            .Where(c => c.TenantId == TenantId() && c.Key == "wallet.max_transfer")
            .Select(c => c.Value)
            .FirstOrDefaultAsync();

        int? maxTransfer = int.TryParse(value, out var parsed) ? parsed : null;
        return Ok(new { success = true, data = new { max_transfer = maxTransfer } });
    }

    [HttpGet("/api/notifications/settings")]
    [HttpGet("/api/v2/notifications/settings")]
    public async Task<IActionResult> LaravelNotificationSettings()
    {
        var userId = RequireUserId();
        var prefix = NotificationSettingPrefix(userId);
        var rows = await _db.TenantConfigs
            .AsNoTracking()
            .Where(c => c.TenantId == TenantId() && c.Key.StartsWith(prefix))
            .Select(c => new { c.Key, c.Value })
            .ToListAsync();

        var globalFrequency = "off";
        var perGroup = new List<object>();
        var perThread = new List<object>();

        foreach (var row in rows)
        {
            var suffix = row.Key[prefix.Length..];
            var parts = suffix.Split('.', StringSplitOptions.RemoveEmptyEntries);
            if (parts.Length != 2 || !int.TryParse(parts[1], out var contextId))
            {
                continue;
            }

            var frequency = NormalizeNotificationFrequency(row.Value) ?? "off";
            switch (parts[0])
            {
                case "global":
                    globalFrequency = frequency;
                    break;
                case "group":
                    perGroup.Add(new { group_id = contextId, frequency });
                    break;
                case "thread":
                    perThread.Add(new { thread_id = contextId, frequency });
                    break;
            }
        }

        return Ok(new
        {
            success = true,
            data = new
            {
                global_frequency = globalFrequency,
                per_group = perGroup,
                per_thread = perThread
            }
        });
    }

    [HttpPost("/api/v2/notifications/group/read")]
    [HttpPost("/api/v2/notifications/group/{groupKey}/read")]
    public async Task<IActionResult> MarkNotificationGroupRead(string? groupKey, [FromBody] JsonElement body)
    {
        var key = groupKey ?? ReadString(body, "group_key", "type");
        if (string.IsNullOrWhiteSpace(key)) return BadRequest(new { error = "group_key is required" });
        var now = DateTime.UtcNow;
        var count = await _db.Notifications.Where(n => n.UserId == RequireUserId() && n.Type == key && !n.IsRead)
            .ExecuteUpdateAsync(s => s.SetProperty(n => n.IsRead, true).SetProperty(n => n.ReadAt, now));
        return Ok(new { success = true, marked_count = count });
    }

    [HttpPost("/api/notifications/settings")]
    [HttpPost("/api/v2/notifications/settings")]
    public async Task<IActionResult> UpdateNotificationSettings([FromBody] JsonElement body)
    {
        if (TryGet(body, "context_type", out _) || TryGet(body, "frequency", out _) || TryGet(body, "push_enabled", out _))
        {
            return await UpdateLaravelNotificationSettings(body);
        }

        var type = ReadString(body, "notification_type", "type") ?? "general";
        var pref = await _pushService.UpdatePreferenceAsync(
            RequireUserId(),
            type,
            ReadBool(body, "enable_in_app", "in_app"),
            ReadBool(body, "enable_push", "push"),
            ReadBool(body, "enable_email", "email"));
        return Ok(new { success = true, data = pref });
    }

    [HttpPut("/api/v2/users/me/notifications")]
    public async Task<IActionResult> UpdateUserNotificationPreferences([FromBody] JsonElement body)
    {
        var user = await CurrentUserAsync();
        var bag = ParseNotificationPreferenceBag(user.NotificationPreferences);
        var changed = false;

        foreach (var key in LaravelNotificationPreferenceKeys)
        {
            if (TryGet(body, key, out _))
            {
                bag[key] = ReadBool(body, key) ?? false;
                changed = true;
            }
        }

        if (!changed)
        {
            return BadRequest(new
            {
                success = false,
                error = "VALIDATION_ERROR",
                message = "No valid notification preferences provided."
            });
        }

        if (TryGet(body, "federation_notifications_enabled", out _))
        {
            bag["federation_notifications_enabled"] = ReadBool(body, "federation_notifications_enabled") ?? true;
        }

        user.NotificationPreferences = bag.ToJsonString(StoreJsonOptions);
        user.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return Ok(new { success = true, data = new { message = "Notification preferences updated" } });
    }

    [HttpGet("/api/v2/users/me/notifications")]
    public async Task<IActionResult> NotificationSettings()
    {
        var user = await CurrentUserAsync();
        var data = BuildLaravelNotificationPreferenceData(ParseNotificationPreferenceBag(user.NotificationPreferences));
        return Ok(new { success = true, data });
    }

    [HttpPost("/api/push/register-device")]
    [HttpPost("/api/push/subscribe")]
    public async Task<IActionResult> RegisterPushDevice([FromBody] JsonElement body)
    {
        var token = ReadString(body, "device_token", "token", "endpoint") ?? JsonSerializer.Serialize(body, JsonOptions);
        var platform = ReadString(body, "platform") ?? "web";
        var device = await _pushService.RegisterDeviceAsync(RequireUserId(), token, platform, ReadString(body, "device_name", "name"));
        return Ok(new { success = true, data = device });
    }

    [HttpPost("/api/push/unregister-device")]
    [HttpPost("/api/push/unsubscribe")]
    public async Task<IActionResult> UnregisterPushDevice([FromBody] JsonElement body)
    {
        var token = ReadString(body, "device_token", "token", "endpoint");
        if (string.IsNullOrWhiteSpace(token)) return BadRequest(new { error = "device_token is required" });
        var removed = await _pushService.UnregisterDeviceAsync(RequireUserId(), token);
        return Ok(new { success = removed });
    }

    [HttpGet("/api/push/status")]
    public async Task<IActionResult> PushStatus()
    {
        var devices = await _pushService.GetUserDevicesAsync(RequireUserId());
        return Ok(new { enabled = devices.Count > 0, devices_count = devices.Count, data = devices });
    }

    [HttpPost("/api/push/send")]
    public async Task<IActionResult> SendPush([FromBody] JsonElement body)
    {
        var sent = await _pushService.SendPushAsync(
            ReadInt(body, "user_id", "userId") ?? RequireUserId(),
            ReadString(body, "title") ?? "Notification",
            ReadString(body, "body", "message") ?? string.Empty,
            body.ValueKind == JsonValueKind.Undefined ? null : JsonSerializer.Serialize(body, JsonOptions));
        return Ok(new { success = true, sent_count = sent });
    }

    [HttpPost("/api/support/reports")]
    [HttpPost("/api/v2/support/reports")]
    public async Task<IActionResult> CreateSupportReport([FromBody] JsonElement body)
    {
        var summary = ReadString(body, "summary")?.Trim();
        var description = ReadString(body, "description")?.Trim();
        var impact = ReadString(body, "impact")?.Trim().ToLowerInvariant();
        var errors = new List<object>();

        if (string.IsNullOrWhiteSpace(summary) || summary.Length < 3 || summary.Length > 180)
        {
            errors.Add(ValidationError("summary", "Summary must be between 3 and 180 characters."));
        }

        if (string.IsNullOrWhiteSpace(description) || description.Length < 10 || description.Length > 5000)
        {
            errors.Add(ValidationError("description", "Description must be between 10 and 5000 characters."));
        }

        if (impact is not ("blocked" or "major" or "minor" or "cosmetic"))
        {
            errors.Add(ValidationError("impact", "Impact must be blocked, major, minor, or cosmetic."));
        }

        if (errors.Count > 0)
        {
            return UnprocessableEntity(new { success = false, errors });
        }

        var now = DateTime.UtcNow;
        var reports = await LoadAllSupportReports();
        var report = new SupportReportCompatRecord
        {
            Id = reports.Count == 0 ? 1 : reports.Max(r => r.Id) + 1,
            TenantId = TenantId(),
            UserId = RequireUserId(),
            Reference = $"NXR-{now:yyMMdd}-{Guid.NewGuid().ToString("N")[..6].ToUpperInvariant()}",
            Source = "in_app",
            Summary = summary!,
            Description = description!,
            Impact = impact!,
            Status = "open",
            Module = ReadString(body, "module"),
            Route = ReadString(body, "route"),
            PageUrl = ReadString(body, "page_url", "pageUrl"),
            SentryEventId = ReadString(body, "sentry_event_id", "sentryEventId"),
            SentryIssueUrl = ReadString(body, "sentry_issue_url", "sentryIssueUrl"),
            Diagnostics = ReadBool(body, "include_diagnostics", "includeDiagnostics") == true ? NormalizeDiagnostics(body, now) : null,
            UserAgent = Request.Headers.UserAgent.FirstOrDefault(),
            CreatedAt = now.ToString("O"),
            UpdatedAt = now.ToString("O")
        };

        reports.Add(report);
        await SaveAllSupportReports(reports);

        return Created($"/api/v2/support/reports/{report.Id}", new
        {
            success = true,
            data = new
            {
                report = new
                {
                    id = report.Id,
                    reference = report.Reference,
                    status = report.Status,
                    impact = report.Impact,
                    summary = report.Summary,
                    created_at = report.CreatedAt
                }
            }
        });
    }

    [HttpGet("/api/push/vapid-key")]
    [HttpGet("/api/push/vapid-public-key")]
    [AllowAnonymous]
    public IActionResult VapidKey() => Ok(new { public_key = string.Empty, configured = false });

    [HttpGet("/api/pusher/config")]
    [AllowAnonymous]
    public IActionResult PusherConfig() => Ok(new { key = string.Empty, cluster = string.Empty, enabled = false });

    [HttpGet("/api/pusher/auth")]
    [HttpPost("/api/pusher/auth")]
    public IActionResult PusherAuth() => Ok(new { auth = string.Empty, enabled = false });

    [HttpPost("/api/v2/presence/heartbeat")]
    public async Task<IActionResult> Heartbeat([FromBody(EmptyBodyBehavior = EmptyBodyBehavior.Allow)] JsonElement body)
    {
        var userId = RequireUserId();
        var row = await UpsertPresenceAsync(
            userId,
            ReadString(body, "platform"),
            status: null,
            preserveManualStatus: true);

        return Ok(new
        {
            success = true,
            data = new
            {
                ok = true,
                status = ToLaravelPresenceStatus(row.Status),
                last_seen_at = row.LastSeenAt.ToString("O")
            }
        });
    }

    [HttpGet("/api/v2/presence/online-count")]
    public async Task<IActionResult> OnlineCount()
    {
        var cutoff = DateTime.UtcNow.AddMinutes(-15);
        var count = await _db.UserPresences
            .Where(p => p.TenantId == TenantId()
                && p.LastSeenAt >= cutoff
                && (p.Status == "online" || p.Status == "away" || p.Status == "dnd" || p.Status == "do_not_disturb"))
            .CountAsync();

        return Ok(new { success = true, data = new { online_count = count } });
    }

    [HttpGet("/api/v2/presence/users")]
    public async Task<IActionResult> PresenceUsers()
    {
        _ = RequireUserId();

        var ids = Request.Query.TryGetValue("user_ids", out var rawUserIds)
            ? rawUserIds.ToString().Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .Select(value => int.TryParse(value, out var id) ? id : 0)
                .Where(id => id > 0)
                .Distinct()
                .Take(100)
                .ToArray()
            : Array.Empty<int>();

        if (ids.Length == 0 && !Request.Query.ContainsKey("user_ids"))
        {
            return BadRequest(new
            {
                success = false,
                code = "VALIDATION_REQUIRED_FIELD",
                message = "The user_ids field is required.",
                field = "user_ids"
            });
        }

        var rows = await _db.UserPresences
            .AsNoTracking()
            .Where(p => ids.Contains(p.UserId) && p.TenantId == TenantId())
            .ToDictionaryAsync(p => p.UserId);
        var meta = await LoadPresenceMetadata(ids);
        var data = ids.ToDictionary(
            id => id.ToString(),
            id => BuildPresencePayload(rows.TryGetValue(id, out var row) ? row : null, meta.TryGetValue(id, out var item) ? item : null));

        return Ok(new { success = true, data });
    }

    [HttpPut("/api/v2/presence/privacy")]
    [HttpPut("/api/v2/presence/status")]
    public async Task<IActionResult> SetPresencePreference([FromBody] JsonElement body)
    {
        var userId = RequireUserId();

        if (Request.Path.Value?.EndsWith("/privacy", StringComparison.OrdinalIgnoreCase) == true)
        {
            var hidePresence = ReadBool(body, "hide_presence", "hidePresence") ?? false;
            await UpsertPresenceAsync(userId, platform: null, status: hidePresence ? "invisible" : "online", preserveManualStatus: false);
            await SavePresenceMetadata(userId, hidePresence: hidePresence);

            return Ok(new { success = true, data = new { hide_presence = hidePresence } });
        }

        var status = NormalizeLaravelPresenceStatus(ReadString(body, "status"));
        if (status == null)
        {
            return BadRequest(new
            {
                success = false,
                code = "VALIDATION_INVALID",
                message = "Invalid presence status.",
                field = "status"
            });
        }

        var customStatus = TruncatePresenceText(ReadString(body, "custom_status", "customStatus"), 80);
        var emoji = TruncatePresenceText(ReadString(body, "emoji", "status_emoji", "statusEmoji"), 10);
        var row = await UpsertPresenceAsync(userId, platform: null, status, preserveManualStatus: false);
        await SavePresenceMetadata(userId, customStatus, emoji);

        return Ok(new
        {
            success = true,
            data = new
            {
                status = ToLaravelPresenceStatus(row.Status),
                custom_status = customStatus,
                emoji
            }
        });
    }

    [HttpGet("/api/recommendations/groups")]
    [HttpGet("/api/v2/groups/recommendations")]
    public async Task<IActionResult> GroupRecommendations()
    {
        var userId = RequireUserId();
        var memberGroupIds = _db.GroupMembers.Where(m => m.UserId == userId).Select(m => m.GroupId);
        var data = await _db.Groups.Where(g => !memberGroupIds.Contains(g.Id)).OrderByDescending(g => g.CreatedAt).Take(10).Select(g => new { g.Id, g.Name, g.Description }).ToListAsync();
        return Ok(new { data });
    }

    [HttpGet("/api/recommendations/metrics")]
    [HttpGet("/api/v2/groups/recommendations/metrics")]
    public async Task<IActionResult> RecommendationMetrics()
    {
        return Ok(new { groups = await _db.Groups.CountAsync(), events = await _db.GroupRecommendationEvents.CountAsync() });
    }

    [HttpGet("/api/recommendations/similar/{id:int}")]
    public async Task<IActionResult> SimilarGroups(int id)
    {
        var group = await _db.Groups.FirstOrDefaultAsync(g => g.Id == id);
        var data = await _db.Groups
            .Where(g => g.Id != id && (group == null || g.IsPrivate == group.IsPrivate))
            .Take(10)
            .Select(g => new { g.Id, g.Name, g.Description })
            .ToListAsync();
        return Ok(new { data });
    }

    [HttpPost("/api/recommendations/track")]
    [HttpPost("/api/v2/groups/recommendations/track")]
    public async Task<IActionResult> TrackRecommendation([FromBody] JsonElement body)
    {
        var row = new GroupRecommendationEvent
        {
            TenantId = TenantId(),
            UserId = RequireUserId(),
            GroupId = ReadInt(body, "group_id", "groupId", "id"),
            EventType = ReadString(body, "event_type", "type") ?? "view"
        };
        _db.GroupRecommendationEvents.Add(row);
        await _db.SaveChangesAsync();
        return Ok(new { success = true, data = row });
    }

    [HttpGet("/api/v2/groups/{id:int}/notification-prefs")]
    public async Task<IActionResult> GroupNotificationPrefs(int id)
    {
        var userId = RequireUserId();
        var row = await _db.GroupNotificationPreferences.FirstOrDefaultAsync(p => p.GroupId == id && p.UserId == userId)
            ?? new GroupNotificationPreference { GroupId = id, UserId = userId, EmailNotifications = true, PushNotifications = true, DigestFrequency = "daily" };
        return Ok(new { data = row });
    }

    [HttpPut("/api/v2/groups/{id:int}/notification-prefs")]
    public async Task<IActionResult> SetGroupNotificationPrefs(int id, [FromBody] JsonElement body)
    {
        var userId = RequireUserId();
        var row = await _db.GroupNotificationPreferences.FirstOrDefaultAsync(p => p.GroupId == id && p.UserId == userId);
        if (row == null)
        {
            row = new GroupNotificationPreference { TenantId = TenantId(), GroupId = id, UserId = userId };
            _db.GroupNotificationPreferences.Add(row);
        }

        row.EmailNotifications = ReadBool(body, "email_notifications", "email") ?? row.EmailNotifications;
        row.PushNotifications = ReadBool(body, "push_notifications", "push") ?? row.PushNotifications;
        row.DigestFrequency = ReadString(body, "digest_frequency", "digest") ?? row.DigestFrequency;
        row.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(new { success = true, data = row });
    }

    [HttpGet("/api/subscriptions")]
    public async Task<IActionResult> Subscriptions()
    {
        var data = await _db.UserSubscriptions.Where(s => s.UserId == RequireUserId()).Include(s => s.Plan).ToListAsync();
        return Ok(new { data });
    }

    [HttpGet("/api/subscriptions/{id:int}")]
    public async Task<IActionResult> Subscription(int id)
    {
        var row = await _db.UserSubscriptions.Include(s => s.Plan).FirstOrDefaultAsync(s => s.Id == id && s.UserId == RequireUserId());
        return row == null ? NotFound(new { error = "Subscription not found" }) : Ok(new { data = row });
    }

    [HttpPost("/api/subscriptions")]
    public async Task<IActionResult> CreateSubscription([FromBody] JsonElement body)
    {
        var row = new UserSubscription
        {
            TenantId = TenantId(),
            UserId = RequireUserId(),
            PlanId = ReadRequiredInt(body, "plan_id", "planId"),
            Notes = ReadString(body, "notes")
        };
        _db.UserSubscriptions.Add(row);
        await _db.SaveChangesAsync();
        return Created($"/api/subscriptions/{row.Id}", new { data = row });
    }

    [HttpPut("/api/subscriptions/{id:int}")]
    public async Task<IActionResult> UpdateSubscription(int id, [FromBody] JsonElement body)
    {
        var row = await _db.UserSubscriptions.FirstOrDefaultAsync(s => s.Id == id && s.UserId == RequireUserId());
        if (row == null) return NotFound(new { error = "Subscription not found" });
        row.Notes = ReadString(body, "notes") ?? row.Notes;
        row.ExpiresAt = ReadDate(body, "expires_at", "expiresAt") ?? row.ExpiresAt;
        row.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(new { data = row });
    }

    [HttpDelete("/api/subscriptions/{id:int}")]
    public async Task<IActionResult> DeleteSubscription(int id)
    {
        var row = await _db.UserSubscriptions.FirstOrDefaultAsync(s => s.Id == id && s.UserId == RequireUserId());
        if (row == null) return NotFound(new { error = "Subscription not found" });
        row.Status = SubscriptionStatus.Cancelled;
        row.CancelledAt = DateTime.UtcNow;
        row.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(new { success = true, data = row });
    }

    [HttpPost("/api/subscriptions/{id:int}/generate-report")]
    public async Task<IActionResult> SubscriptionReport(int id)
    {
        var row = await _db.UserSubscriptions.Include(s => s.Plan).FirstOrDefaultAsync(s => s.Id == id && s.UserId == RequireUserId());
        return row == null ? NotFound(new { error = "Subscription not found" }) : Ok(new { data = row, generated_at = DateTime.UtcNow });
    }

    [HttpGet("/api/v2/coupons")]
    public async Task<IActionResult> Coupons()
    {
        var data = await _db.MerchantCoupons.Where(c => c.IsActive && (c.ExpiresAt == null || c.ExpiresAt > DateTime.UtcNow)).ToListAsync();
        return Ok(new { data });
    }

    [HttpGet("/api/v2/coupons/{id:int}")]
    public async Task<IActionResult> Coupon(int id)
    {
        var row = await _db.MerchantCoupons.FirstOrDefaultAsync(c => c.Id == id);
        return row == null ? NotFound(new { error = "Coupon not found" }) : Ok(new { data = row });
    }

    [HttpPost("/api/v2/coupons/validate")]
    public async Task<IActionResult> ValidateCoupon([FromBody] JsonElement body)
    {
        var code = ReadString(body, "code")?.Trim();
        var row = string.IsNullOrWhiteSpace(code)
            ? null
            : await _db.MerchantCoupons.FirstOrDefaultAsync(c => c.Code == code && c.IsActive && (c.ExpiresAt == null || c.ExpiresAt > DateTime.UtcNow));
        return Ok(new { valid = row != null, data = row });
    }

    [HttpPost("/api/v2/coupons/{id:int}/qr")]
    public async Task<IActionResult> CouponQr(int id)
    {
        var row = await _db.MerchantCoupons.FirstOrDefaultAsync(c => c.Id == id);
        return row == null ? NotFound(new { error = "Coupon not found" }) : Ok(new { data = new { coupon_id = id, qr_payload = row.Code } });
    }

    [HttpPost("/api/v2/coupons/redeem-qr")]
    public async Task<IActionResult> RedeemCouponQr([FromBody] JsonElement body)
    {
        var code = ReadString(body, "code", "qr_payload");
        var coupon = string.IsNullOrWhiteSpace(code) ? null : await _db.MerchantCoupons.FirstOrDefaultAsync(c => c.Code == code && c.IsActive);
        if (coupon == null) return NotFound(new { error = "Coupon not found" });
        var redemption = new MerchantCouponRedemption { TenantId = TenantId(), MerchantCouponId = coupon.Id, UserId = RequireUserId(), MarketplaceOrderId = ReadInt(body, "order_id", "marketplace_order_id") };
        _db.MerchantCouponRedemptions.Add(redemption);
        await _db.SaveChangesAsync();
        return Ok(new { success = true, data = redemption });
    }

    [HttpGet("/api/cookie-consent")]
    [AllowAnonymous]
    public async Task<IActionResult> CookieConsent([FromQuery] string? session_id = null)
    {
        var userId = User.GetUserId();
        var query = _db.CookieConsents.AsQueryable();
        query = userId.HasValue ? query.Where(c => c.UserId == userId) : query.Where(c => c.SessionId == session_id);
        var row = await query.OrderByDescending(c => c.UpdatedAt ?? c.ConsentedAt).FirstOrDefaultAsync();
        return row == null ? Ok(new { data = (object?)null, consented = false }) : Ok(new { data = row, consented = true });
    }

    [HttpPost("/api/cookie-consent")]
    [AllowAnonymous]
    public async Task<IActionResult> StoreCookieConsent([FromBody] JsonElement body)
    {
        var row = new CookieConsent
        {
            TenantId = TenantIdOrDefault(),
            UserId = User.GetUserId(),
            SessionId = ReadString(body, "session_id", "sessionId"),
            NecessaryCookies = true,
            AnalyticsCookies = ReadBool(body, "analytics", "analytics_cookies") ?? false,
            MarketingCookies = ReadBool(body, "marketing", "marketing_cookies") ?? false,
            PreferenceCookies = ReadBool(body, "preferences", "preference_cookies") ?? false,
            IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString(),
            UserAgent = Request.Headers.UserAgent.FirstOrDefault()
        };
        _db.CookieConsents.Add(row);
        await _db.SaveChangesAsync();
        return Ok(new { success = true, data = row });
    }

    [HttpPut("/api/cookie-consent/{id:int}")]
    public async Task<IActionResult> UpdateCookieConsent(int id, [FromBody] JsonElement body)
    {
        var row = await _db.CookieConsents.FirstOrDefaultAsync(c => c.Id == id && (c.UserId == RequireUserId() || c.UserId == null));
        if (row == null) return NotFound(new { error = "Cookie consent not found" });
        row.AnalyticsCookies = ReadBool(body, "analytics", "analytics_cookies") ?? row.AnalyticsCookies;
        row.MarketingCookies = ReadBool(body, "marketing", "marketing_cookies") ?? row.MarketingCookies;
        row.PreferenceCookies = ReadBool(body, "preferences", "preference_cookies") ?? row.PreferenceCookies;
        row.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(new { success = true, data = row });
    }

    [HttpDelete("/api/cookie-consent/{id:int}")]
    public async Task<IActionResult> WithdrawCookieConsent(int id)
    {
        var row = await _db.CookieConsents.FirstOrDefaultAsync(c => c.Id == id && (c.UserId == RequireUserId() || c.UserId == null));
        if (row == null) return NotFound(new { error = "Cookie consent not found" });
        row.AnalyticsCookies = false;
        row.MarketingCookies = false;
        row.PreferenceCookies = false;
        row.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(new { success = true, data = row });
    }

    [HttpGet("/api/cookie-consent/check/{category}")]
    [AllowAnonymous]
    public async Task<IActionResult> CheckCookieConsent(string category, [FromQuery] string? session_id = null)
    {
        var result = await CookieConsent(session_id) as OkObjectResult;
        var row = (result?.Value?.GetType().GetProperty("data")?.GetValue(result.Value)) as CookieConsent;
        var allowed = category.ToLowerInvariant() switch
        {
            "necessary" => true,
            "analytics" => row?.AnalyticsCookies == true,
            "marketing" => row?.MarketingCookies == true,
            "preferences" or "preference" => row?.PreferenceCookies == true,
            _ => false
        };
        return Ok(new { category, allowed });
    }

    [HttpGet("/api/cookie-consent/inventory")]
    [AllowAnonymous]
    public IActionResult CookieInventory()
    {
        return Ok(new
        {
            data = new[]
            {
                new { category = "necessary", required = true },
                new { category = "analytics", required = false },
                new { category = "marketing", required = false },
                new { category = "preferences", required = false }
            }
        });
    }

    private async Task<IActionResult> TogglePostLike(int postId)
    {
        var userId = RequireUserId();
        var existing = await _db.PostLikes.FirstOrDefaultAsync(l => l.PostId == postId && l.UserId == userId);
        var liked = existing == null;
        if (existing == null)
        {
            _db.PostLikes.Add(new PostLike { TenantId = TenantId(), PostId = postId, UserId = userId });
        }
        else
        {
            _db.PostLikes.Remove(existing);
        }

        await _db.SaveChangesAsync();
        return Ok(new { success = true, liked, likes_count = await _db.PostLikes.CountAsync(l => l.PostId == postId) });
    }

    private async Task<IActionResult> MuteUserCore(int mutedUserId)
    {
        var userId = RequireUserId();
        if (!await _db.MutedUsers.AnyAsync(m => m.UserId == userId && m.MutedUserId == mutedUserId))
        {
            _db.MutedUsers.Add(new MutedUser { TenantId = TenantId(), UserId = userId, MutedUserId = mutedUserId });
            await _db.SaveChangesAsync();
        }

        return Ok(new { success = true });
    }

    private async Task<object> ReactionSummary(int postId)
    {
        var rows = await _db.PostReactions.Where(r => r.PostId == postId).ToListAsync();
        return new { data = rows.GroupBy(r => r.ReactionType).Select(g => new { type = g.Key, count = g.Count() }), user_reaction = rows.FirstOrDefault(r => r.UserId == RequireUserId())?.ReactionType };
    }

    private static object MapComment(PostComment c)
    {
        return new
        {
            id = c.Id,
            post_id = c.PostId,
            user_id = c.UserId,
            parent_comment_id = c.ParentCommentId,
            content = c.Content,
            created_at = c.CreatedAt,
            updated_at = c.UpdatedAt
        };
    }

    private async Task<UserPresence> UpsertPresenceAsync(int userId, string? platform, string? status, bool preserveManualStatus)
    {
        var tenantId = TenantId();
        var now = DateTime.UtcNow;
        var row = await _db.UserPresences.FirstOrDefaultAsync(p => p.TenantId == tenantId && p.UserId == userId);
        var nextStatus = status;

        if (row != null)
        {
            if (preserveManualStatus)
            {
                nextStatus = row.Status is "dnd" or "do_not_disturb" or "invisible"
                    ? row.Status
                    : "online";
            }

            row.LastSeenAt = now;
            if (!string.IsNullOrWhiteSpace(platform))
            {
                row.Platform = platform;
            }

            if (!string.IsNullOrWhiteSpace(nextStatus))
            {
                row.Status = nextStatus;
            }

            row.UpdatedAt = now;
            await _db.SaveChangesAsync();
            return row;
        }

        row = new UserPresence
        {
            TenantId = tenantId,
            UserId = userId,
            LastSeenAt = now,
            Platform = string.IsNullOrWhiteSpace(platform) ? null : platform,
            Status = string.IsNullOrWhiteSpace(nextStatus) ? "online" : nextStatus,
            CreatedAt = now,
            UpdatedAt = now
        };

        _db.UserPresences.Add(row);
        await _db.SaveChangesAsync();
        return row;
    }

    private async Task<Dictionary<int, PresenceMetadata>> LoadPresenceMetadata(IEnumerable<int> userIds)
    {
        var ids = userIds.Distinct().ToArray();
        if (ids.Length == 0)
        {
            return new Dictionary<int, PresenceMetadata>();
        }

        var keys = ids.Select(PresenceMetadataKey).ToArray();
        var rows = await _db.TenantConfigs
            .AsNoTracking()
            .Where(c => c.TenantId == TenantId() && keys.Contains(c.Key))
            .ToListAsync();

        return rows
            .Select(row => new
            {
                UserId = ParsePresenceMetadataUserId(row.Key),
                Metadata = DeserializePresenceMetadata(row.Value)
            })
            .Where(row => row.UserId.HasValue)
            .ToDictionary(row => row.UserId!.Value, row => row.Metadata);
    }

    private async Task SavePresenceMetadata(int userId, string? customStatus = null, string? emoji = null, bool? hidePresence = null)
    {
        var existing = await LoadPresenceMetadata(new[] { userId });
        existing.TryGetValue(userId, out var current);
        var metadata = new PresenceMetadata
        {
            CustomStatus = customStatus ?? current?.CustomStatus,
            StatusEmoji = emoji ?? current?.StatusEmoji,
            HidePresence = hidePresence ?? current?.HidePresence ?? false
        };

        await UpsertTenantConfig(PresenceMetadataKey(userId), JsonSerializer.Serialize(metadata, StoreJsonOptions));
        await _db.SaveChangesAsync();
    }

    private static object BuildPresencePayload(UserPresence? row, PresenceMetadata? metadata)
    {
        if (metadata?.HidePresence == true || row == null)
        {
            return OfflinePresencePayload();
        }

        var status = ToLaravelPresenceStatus(row.Status);
        if (status != "dnd" && row.LastSeenAt < DateTime.UtcNow.AddMinutes(-15))
        {
            status = "offline";
        }
        else if (status == "online" && row.LastSeenAt < DateTime.UtcNow.AddMinutes(-5))
        {
            status = "away";
        }

        if (status == "offline")
        {
            return OfflinePresencePayload();
        }

        return new
        {
            status,
            last_seen_at = row.LastSeenAt.ToString("O"),
            custom_status = metadata?.CustomStatus,
            status_emoji = metadata?.StatusEmoji
        };
    }

    private static object OfflinePresencePayload() => new
    {
        status = "offline",
        last_seen_at = (string?)null,
        custom_status = (string?)null,
        status_emoji = (string?)null
    };

    private static string? NormalizeLaravelPresenceStatus(string? status)
    {
        return status?.Trim().ToLowerInvariant() switch
        {
            "online" => "online",
            "away" => "away",
            "dnd" => "dnd",
            "do_not_disturb" => "dnd",
            "offline" => "offline",
            _ => null
        };
    }

    private static string ToLaravelPresenceStatus(string? status)
    {
        return status?.Trim().ToLowerInvariant() switch
        {
            "online" => "online",
            "away" => "away",
            "dnd" => "dnd",
            "do_not_disturb" => "dnd",
            "invisible" => "offline",
            "offline" => "offline",
            _ => "offline"
        };
    }

    private static string? TruncatePresenceText(string? value, int maxLength)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        var trimmed = value.Trim();
        return trimmed.Length <= maxLength ? trimmed : trimmed[..maxLength];
    }

    private static string PresenceMetadataKey(int userId) => $"presence.metadata.{userId}";

    private static int? ParsePresenceMetadataUserId(string key)
    {
        var prefix = PresenceMetadataKey(0)[..^1];
        return key.StartsWith(prefix, StringComparison.Ordinal)
            && int.TryParse(key[prefix.Length..], out var userId)
            ? userId
            : null;
    }

    private static PresenceMetadata DeserializePresenceMetadata(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw))
        {
            return new PresenceMetadata();
        }

        try
        {
            return JsonSerializer.Deserialize<PresenceMetadata>(raw, StoreJsonOptions) ?? new PresenceMetadata();
        }
        catch (JsonException)
        {
            return new PresenceMetadata();
        }
    }

    private int RequireUserId() => User.GetUserId() ?? throw new UnauthorizedAccessException("Invalid token");

    private int TenantId() => _tenantContext.GetTenantIdOrThrow();

    private async Task<User> CurrentUserAsync()
    {
        var userId = RequireUserId();
        return await _db.Users.FirstOrDefaultAsync(u => u.Id == userId && u.TenantId == TenantId())
            ?? throw new UnauthorizedAccessException("Invalid token");
    }

    private int TenantIdOrDefault()
    {
        try
        {
            return _tenantContext.GetTenantIdOrThrow();
        }
        catch (InvalidOperationException)
        {
            return 1;
        }
    }

    private static object PageMeta(int page, int limit, int total) => new { page, limit, total, pages = (int)Math.Ceiling(total / (double)limit) };

    private async Task<IActionResult> UpdateLaravelNotificationSettings(JsonElement body)
    {
        if (TryGet(body, "push_enabled", out var pushValue))
        {
            var enabled = ReadBool(body, "push_enabled") ?? (pushValue.ValueKind == JsonValueKind.Number && pushValue.GetInt32() != 0);
            return Ok(new { success = true, data = new { push_enabled = enabled } });
        }

        var contextType = ReadString(body, "context_type", "contextType")?.Trim().ToLowerInvariant();
        var frequency = NormalizeNotificationFrequency(ReadString(body, "frequency"));
        var contextId = contextType == "global" ? 0 : ReadInt(body, "context_id", "contextId");
        var errors = new List<object>();

        if (contextType is not ("global" or "group" or "thread"))
        {
            errors.Add(ValidationError("context_type", "Context type must be global, group, or thread."));
        }

        if (frequency == null)
        {
            errors.Add(ValidationError("frequency", "Frequency must be instant, daily, weekly, monthly, or off."));
        }

        if (contextType is "group" or "thread" && (!contextId.HasValue || contextId.Value <= 0))
        {
            errors.Add(ValidationError("context_id", "Context id is required for group and thread notification settings."));
        }

        if (errors.Count > 0)
        {
            return UnprocessableEntity(new { success = false, errors });
        }

        var key = $"{NotificationSettingPrefix(RequireUserId())}{contextType}.{contextId ?? 0}";
        await UpsertTenantConfig(key, frequency!);
        await _db.SaveChangesAsync();

        return Ok(new
        {
            success = true,
            data = new
            {
                context_type = contextType,
                context_id = contextId ?? 0,
                frequency
            }
        });
    }

    private static JsonObject ParseNotificationPreferenceBag(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw))
        {
            return new JsonObject();
        }

        try
        {
            return JsonNode.Parse(raw) as JsonObject ?? new JsonObject();
        }
        catch (JsonException)
        {
            return new JsonObject();
        }
    }

    private static Dictionary<string, bool> BuildLaravelNotificationPreferenceData(JsonObject bag)
    {
        return LaravelNotificationPreferenceDefaults.ToDictionary(
            pair => pair.Key,
            pair => ReadPreferenceBool(bag, pair.Key, pair.Value));
    }

    private static bool ReadPreferenceBool(JsonObject bag, string key, bool defaultValue)
    {
        if (!bag.TryGetPropertyValue(key, out var node) || node is null)
        {
            return defaultValue;
        }

        try
        {
            if (node is JsonValue value)
            {
                if (value.TryGetValue<bool>(out var boolValue)) return boolValue;
                if (value.TryGetValue<int>(out var intValue)) return intValue != 0;
                if (value.TryGetValue<long>(out var longValue)) return longValue != 0;
                if (value.TryGetValue<string>(out var stringValue) && bool.TryParse(stringValue, out var parsed)) return parsed;
            }
        }
        catch (InvalidOperationException)
        {
            return defaultValue;
        }

        return defaultValue;
    }

    private async Task<List<SupportReportCompatRecord>> LoadAllSupportReports()
    {
        var raw = await _db.TenantConfigs
            .AsNoTracking()
            .Where(c => c.Key == SupportReportsKey)
            .Select(c => c.Value)
            .FirstOrDefaultAsync();

        if (string.IsNullOrWhiteSpace(raw))
        {
            return new List<SupportReportCompatRecord>();
        }

        try
        {
            return JsonSerializer.Deserialize<List<SupportReportCompatRecord>>(raw, StoreJsonOptions) ?? new List<SupportReportCompatRecord>();
        }
        catch (JsonException)
        {
            return new List<SupportReportCompatRecord>();
        }
    }

    private async Task SaveAllSupportReports(List<SupportReportCompatRecord> reports)
    {
        var json = JsonSerializer.Serialize(reports.OrderBy(r => r.Id).ToList(), StoreJsonOptions);
        await UpsertTenantConfig(SupportReportsKey, json);
        await _db.SaveChangesAsync();
    }

    private async Task UpsertTenantConfig(string key, string value)
    {
        var tenantId = TenantId();
        var existing = await _db.TenantConfigs.FirstOrDefaultAsync(c => c.TenantId == tenantId && c.Key == key);
        if (existing != null)
        {
            existing.Value = value;
            existing.UpdatedAt = DateTime.UtcNow;
            return;
        }

        _db.TenantConfigs.Add(new TenantConfig
        {
            TenantId = tenantId,
            Key = key,
            Value = value,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        });
    }

    private static string? NormalizeNotificationFrequency(string? frequency)
    {
        return frequency?.Trim().ToLowerInvariant() switch
        {
            "instant" => "instant",
            "daily" => "daily",
            "weekly" => "monthly",
            "monthly" => "monthly",
            "off" => "off",
            _ => null
        };
    }

    private static string NotificationSettingPrefix(int userId) => $"notification_settings.{userId}.";

    private static JsonElement? NormalizeDiagnostics(JsonElement body, DateTime capturedAt)
    {
        if (!TryGet(body, "diagnostics", out var diagnostics) || diagnostics.ValueKind != JsonValueKind.Object)
        {
            return null;
        }

        return JsonSerializer.SerializeToElement(new Dictionary<string, object?>
        {
            ["captured_at"] = capturedAt.ToString("O"),
            ["payload"] = NormalizeDiagnosticValue(diagnostics)
        }, StoreJsonOptions);
    }

    private static object? NormalizeDiagnosticValue(JsonElement value, string? propertyName = null, int depth = 0)
    {
        if (IsSensitiveDiagnosticKey(propertyName))
        {
            return "[filtered]";
        }

        if (depth >= 6)
        {
            return "[truncated]";
        }

        return value.ValueKind switch
        {
            JsonValueKind.Object => value.EnumerateObject().ToDictionary(
                property => IsSensitiveDiagnosticKey(property.Name) ? "[filtered]" : property.Name,
                property => NormalizeDiagnosticValue(property.Value, property.Name, depth + 1)),
            JsonValueKind.Array => value.EnumerateArray().Select(item => NormalizeDiagnosticValue(item, null, depth + 1)).ToList(),
            JsonValueKind.String => RedactDiagnosticString(value.GetString()),
            JsonValueKind.Number => value.TryGetInt64(out var integer) ? integer : value.GetDouble(),
            JsonValueKind.True => true,
            JsonValueKind.False => false,
            JsonValueKind.Null => null,
            _ => value.ToString()
        };
    }

    private static string? RedactDiagnosticString(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return value;
        }

        var normalized = value.ToLowerInvariant();
        return normalized.Contains("bearer ") || normalized.Contains("secret") || normalized.Contains("token=")
            ? "[filtered]"
            : value;
    }

    private static bool IsSensitiveDiagnosticKey(string? key)
    {
        if (string.IsNullOrWhiteSpace(key))
        {
            return false;
        }

        var normalized = key.ToLowerInvariant();
        return normalized.Contains("authorization")
            || normalized.Contains("password")
            || normalized.Contains("secret")
            || normalized.Contains("token")
            || normalized.Contains("cookie");
    }

    private static object ValidationError(string field, string message) => new { field, message };

    private static string? ReadString(JsonElement body, params string[] names)
    {
        foreach (var name in names)
        {
            if (TryGet(body, name, out var value))
            {
                return value.ValueKind == JsonValueKind.String ? value.GetString() : value.ToString();
            }
        }

        return null;
    }

    private static int? ReadInt(JsonElement body, params string[] names)
    {
        foreach (var name in names)
        {
            if (TryGet(body, name, out var value))
            {
                if (value.ValueKind == JsonValueKind.Number && value.TryGetInt32(out var number)) return number;
                if (value.ValueKind == JsonValueKind.String && int.TryParse(value.GetString(), out number)) return number;
            }
        }

        return null;
    }

    private static int ReadRequiredInt(JsonElement body, params string[] names)
    {
        return ReadInt(body, names) ?? throw new BadHttpRequestException($"{string.Join("/", names)} is required");
    }

    private static bool? ReadBool(JsonElement body, params string[] names)
    {
        foreach (var name in names)
        {
            if (TryGet(body, name, out var value))
            {
                if (value.ValueKind is JsonValueKind.True or JsonValueKind.False) return value.GetBoolean();
                if (value.ValueKind == JsonValueKind.String && bool.TryParse(value.GetString(), out var flag)) return flag;
            }
        }

        return null;
    }

    private static DateTime? ReadDate(JsonElement body, params string[] names)
    {
        foreach (var name in names)
        {
            if (TryGet(body, name, out var value) && value.ValueKind == JsonValueKind.String && DateTime.TryParse(value.GetString(), out var date))
            {
                return date.ToUniversalTime();
            }
        }

        return null;
    }

    private static bool TryGet(JsonElement body, string name, out JsonElement value)
    {
        if (body.ValueKind == JsonValueKind.Object && body.TryGetProperty(name, out value))
        {
            return true;
        }

        value = default;
        return false;
    }

    private sealed class SupportReportCompatRecord
    {
        public int Id { get; set; }
        public int TenantId { get; set; }
        public int? UserId { get; set; }
        public int? AssignedUserId { get; set; }
        public string Reference { get; set; } = string.Empty;
        public string Source { get; set; } = "in_app";
        public string Summary { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string Impact { get; set; } = "minor";
        public string Status { get; set; } = "open";
        public string? Module { get; set; }
        public string? Route { get; set; }
        public string? PageUrl { get; set; }
        public string? SentryEventId { get; set; }
        public string? SentryIssueUrl { get; set; }
        public JsonElement? Diagnostics { get; set; }
        public string? UserAgent { get; set; }
        public string? TriageNotes { get; set; }
        public string? TriagedAt { get; set; }
        public string? ResolvedAt { get; set; }
        public string? ClosedAt { get; set; }
        public string? CreatedAt { get; set; }
        public string? UpdatedAt { get; set; }
    }

    private sealed class PresenceMetadata
    {
        public string? CustomStatus { get; set; }
        public string? StatusEmoji { get; set; }
        public bool HidePresence { get; set; }
    }
}
