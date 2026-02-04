// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

using System.ComponentModel.DataAnnotations;
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
/// Feed controller - social feed with posts, likes, and comments.
/// Phase 12: Community activity feed.
/// </summary>
[ApiController]
[Route("api/feed")]
[Authorize]
public class FeedController : ControllerBase
{
    private readonly NexusDbContext _db;
    private readonly ILogger<FeedController> _logger;
    private readonly GamificationService _gamification;

    public FeedController(NexusDbContext db, ILogger<FeedController> logger, GamificationService gamification)
    {
        _db = db;
        _logger = logger;
        _gamification = gamification;
    }

    /// <summary>
    /// GET /api/feed - List feed posts (paginated).
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetFeed(
        [FromQuery] int page = 1,
        [FromQuery] int limit = 20,
        [FromQuery] int? group_id = null)
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        if (page < 1) page = 1;
        if (limit < 1) limit = 1;
        if (limit > 100) limit = 100;

        var query = _db.FeedPosts.AsQueryable();

        // Filter by group if specified
        if (group_id.HasValue)
        {
            query = query.Where(p => p.GroupId == group_id.Value);
        }

        var total = await query.CountAsync();
        var totalPages = (int)Math.Ceiling(total / (double)limit);

        var posts = await query
            .OrderByDescending(p => p.IsPinned)
            .ThenByDescending(p => p.CreatedAt)
            .Skip((page - 1) * limit)
            .Take(limit)
            .Select(p => new
            {
                p.Id,
                p.Content,
                p.ImageUrl,
                p.IsPinned,
                p.CreatedAt,
                p.UpdatedAt,
                user = new { p.User!.Id, p.User.FirstName, p.User.LastName },
                group = p.GroupId != null ? new { p.Group!.Id, p.Group.Name } : null,
                like_count = p.Likes.Count,
                comment_count = p.Comments.Count,
                is_liked = p.Likes.Any(l => l.UserId == userId)
            })
            .ToListAsync();

        return Ok(new
        {
            data = posts,
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
    /// GET /api/feed/{id} - Get a single post by ID.
    /// </summary>
    [HttpGet("{id}")]
    public async Task<IActionResult> GetPost(int id)
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        var post = await _db.FeedPosts
            .Where(p => p.Id == id)
            .Select(p => new
            {
                p.Id,
                p.Content,
                p.ImageUrl,
                p.IsPinned,
                p.CreatedAt,
                p.UpdatedAt,
                user = new { p.User!.Id, p.User.FirstName, p.User.LastName },
                group = p.GroupId != null ? new { p.Group!.Id, p.Group.Name } : null,
                like_count = p.Likes.Count,
                comment_count = p.Comments.Count,
                is_liked = p.Likes.Any(l => l.UserId == userId)
            })
            .FirstOrDefaultAsync();

        if (post == null)
        {
            return NotFound(new { error = "Post not found" });
        }

        return Ok(post);
    }

    /// <summary>
    /// POST /api/feed - Create a new post.
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> CreatePost([FromBody] CreatePostRequest request)
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        if (string.IsNullOrWhiteSpace(request.Content))
        {
            return BadRequest(new { error = "Post content is required" });
        }

        if (request.Content.Length > 5000)
        {
            return BadRequest(new { error = "Post content cannot exceed 5000 characters" });
        }

        // If group_id is provided, verify user is a member
        if (request.GroupId.HasValue)
        {
            var isMember = await _db.GroupMembers
                .AnyAsync(gm => gm.GroupId == request.GroupId && gm.UserId == userId);

            if (!isMember)
            {
                return StatusCode(403, new { error = "You must be a member of the group to post" });
            }
        }

        var post = new FeedPost
        {
            UserId = userId.Value,
            GroupId = request.GroupId,
            Content = request.Content.Trim(),
            ImageUrl = request.ImageUrl?.Trim()
        };

        _db.FeedPosts.Add(post);
        await _db.SaveChangesAsync();

        _logger.LogInformation("User {UserId} created post {PostId}", userId, post.Id);

        // Award XP and check badges for creating a post
        await _gamification.AwardXpAsync(userId.Value, XpLog.Amounts.PostCreated, XpLog.Sources.PostCreated, post.Id, "Created a post");
        await _gamification.CheckAndAwardBadgesAsync(userId.Value, "post_created");

        // Load user for response
        var user = await _db.Users.FindAsync(userId);
        if (user == null)
        {
            return StatusCode(500, new { error = "User data unavailable" });
        }

        return CreatedAtAction(nameof(GetPost), new { id = post.Id }, new
        {
            success = true,
            message = "Post created",
            post = new
            {
                post.Id,
                post.Content,
                post.ImageUrl,
                post.IsPinned,
                post.CreatedAt,
                user = new { user.Id, user.FirstName, user.LastName },
                group_id = post.GroupId,
                like_count = 0,
                comment_count = 0,
                is_liked = false
            }
        });
    }

    /// <summary>
    /// PUT /api/feed/{id} - Update a post (owner only).
    /// </summary>
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdatePost(int id, [FromBody] UpdatePostRequest request)
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        var post = await _db.FeedPosts.FirstOrDefaultAsync(p => p.Id == id);
        if (post == null)
        {
            return NotFound(new { error = "Post not found" });
        }

        // Only owner can update
        if (post.UserId != userId)
        {
            return StatusCode(403, new { error = "Only the post author can update this post" });
        }

        if (request.Content != null)
        {
            if (string.IsNullOrWhiteSpace(request.Content))
            {
                return BadRequest(new { error = "Post content cannot be empty" });
            }
            if (request.Content.Length > 5000)
            {
                return BadRequest(new { error = "Post content cannot exceed 5000 characters" });
            }
            post.Content = request.Content.Trim();
        }

        if (request.ImageUrl != null)
        {
            post.ImageUrl = string.IsNullOrWhiteSpace(request.ImageUrl) ? null : request.ImageUrl.Trim();
        }

        post.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        _logger.LogInformation("User {UserId} updated post {PostId}", userId, id);

        return Ok(new
        {
            success = true,
            message = "Post updated",
            post = new
            {
                post.Id,
                post.Content,
                post.ImageUrl,
                post.IsPinned,
                post.CreatedAt,
                post.UpdatedAt
            }
        });
    }

    /// <summary>
    /// DELETE /api/feed/{id} - Delete a post (owner only).
    /// </summary>
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeletePost(int id)
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        var post = await _db.FeedPosts.FirstOrDefaultAsync(p => p.Id == id);
        if (post == null)
        {
            return NotFound(new { error = "Post not found" });
        }

        // Only owner can delete (or group admin/owner if it's a group post)
        var canDelete = post.UserId == userId;

        if (!canDelete && post.GroupId.HasValue)
        {
            var membership = await _db.GroupMembers
                .FirstOrDefaultAsync(gm => gm.GroupId == post.GroupId && gm.UserId == userId);

            canDelete = membership != null && (membership.Role == Group.Roles.Admin || membership.Role == Group.Roles.Owner);
        }

        if (!canDelete)
        {
            return StatusCode(403, new { error = "Only the post author or group admins can delete this post" });
        }

        _db.FeedPosts.Remove(post);
        await _db.SaveChangesAsync();

        _logger.LogInformation("User {UserId} deleted post {PostId}", userId, id);

        return Ok(new
        {
            success = true,
            message = "Post deleted"
        });
    }

    /// <summary>
    /// POST /api/feed/{id}/like - Like a post.
    /// </summary>
    [HttpPost("{id}/like")]
    public async Task<IActionResult> LikePost(int id)
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        var post = await _db.FeedPosts.FirstOrDefaultAsync(p => p.Id == id);
        if (post == null)
        {
            return NotFound(new { error = "Post not found" });
        }

        // Check if already liked
        var existingLike = await _db.PostLikes
            .FirstOrDefaultAsync(l => l.PostId == id && l.UserId == userId);

        if (existingLike != null)
        {
            return BadRequest(new { error = "You have already liked this post" });
        }

        var like = new PostLike
        {
            PostId = id,
            UserId = userId.Value
        };

        _db.PostLikes.Add(like);
        await _db.SaveChangesAsync();

        var likeCount = await _db.PostLikes.CountAsync(l => l.PostId == id);

        // Check if post author should earn popular post badge
        await _gamification.CheckAndAwardBadgesAsync(post.UserId, "post_liked");

        _logger.LogInformation("User {UserId} liked post {PostId}", userId, id);

        return Ok(new
        {
            success = true,
            message = "Post liked",
            like_count = likeCount
        });
    }

    /// <summary>
    /// DELETE /api/feed/{id}/like - Unlike a post.
    /// </summary>
    [HttpDelete("{id}/like")]
    public async Task<IActionResult> UnlikePost(int id)
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        var like = await _db.PostLikes
            .FirstOrDefaultAsync(l => l.PostId == id && l.UserId == userId);

        if (like == null)
        {
            return NotFound(new { error = "You have not liked this post" });
        }

        _db.PostLikes.Remove(like);
        await _db.SaveChangesAsync();

        var likeCount = await _db.PostLikes.CountAsync(l => l.PostId == id);

        _logger.LogInformation("User {UserId} unliked post {PostId}", userId, id);

        return Ok(new
        {
            success = true,
            message = "Post unliked",
            like_count = likeCount
        });
    }

    /// <summary>
    /// GET /api/feed/{id}/comments - List comments on a post.
    /// </summary>
    [HttpGet("{id}/comments")]
    public async Task<IActionResult> GetComments(int id, [FromQuery] int page = 1, [FromQuery] int limit = 50)
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        var postExists = await _db.FeedPosts.AnyAsync(p => p.Id == id);
        if (!postExists)
        {
            return NotFound(new { error = "Post not found" });
        }

        if (page < 1) page = 1;
        if (limit < 1) limit = 1;
        if (limit > 100) limit = 100;

        var total = await _db.PostComments.CountAsync(c => c.PostId == id);
        var totalPages = (int)Math.Ceiling(total / (double)limit);

        var comments = await _db.PostComments
            .Where(c => c.PostId == id)
            .OrderBy(c => c.CreatedAt)
            .Skip((page - 1) * limit)
            .Take(limit)
            .Select(c => new
            {
                c.Id,
                c.Content,
                c.CreatedAt,
                c.UpdatedAt,
                user = new { c.User!.Id, c.User.FirstName, c.User.LastName }
            })
            .ToListAsync();

        return Ok(new
        {
            data = comments,
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
    /// POST /api/feed/{id}/comments - Add a comment to a post.
    /// </summary>
    [HttpPost("{id}/comments")]
    public async Task<IActionResult> AddComment(int id, [FromBody] AddCommentRequest request)
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        var post = await _db.FeedPosts.FirstOrDefaultAsync(p => p.Id == id);
        if (post == null)
        {
            return NotFound(new { error = "Post not found" });
        }

        if (string.IsNullOrWhiteSpace(request.Content))
        {
            return BadRequest(new { error = "Comment content is required" });
        }

        if (request.Content.Length > 2000)
        {
            return BadRequest(new { error = "Comment cannot exceed 2000 characters" });
        }

        var comment = new PostComment
        {
            PostId = id,
            UserId = userId.Value,
            Content = request.Content.Trim()
        };

        _db.PostComments.Add(comment);
        await _db.SaveChangesAsync();

        // Award XP for adding a comment
        await _gamification.AwardXpAsync(userId.Value, XpLog.Amounts.CommentAdded, XpLog.Sources.CommentAdded, comment.Id, "Added a comment");

        var user = await _db.Users.FindAsync(userId);
        if (user == null)
        {
            return StatusCode(500, new { error = "User data unavailable" });
        }

        _logger.LogInformation("User {UserId} commented on post {PostId}", userId, id);

        return CreatedAtAction(nameof(GetComments), new { id }, new
        {
            success = true,
            message = "Comment added",
            comment = new
            {
                comment.Id,
                comment.Content,
                comment.CreatedAt,
                user = new { user.Id, user.FirstName, user.LastName }
            }
        });
    }

    /// <summary>
    /// DELETE /api/feed/{id}/comments/{commentId} - Delete a comment.
    /// </summary>
    [HttpDelete("{id}/comments/{commentId}")]
    public async Task<IActionResult> DeleteComment(int id, int commentId)
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        var comment = await _db.PostComments
            .Include(c => c.Post)
            .FirstOrDefaultAsync(c => c.Id == commentId && c.PostId == id);

        if (comment == null)
        {
            return NotFound(new { error = "Comment not found" });
        }

        // Can delete if: comment author, post author, or group admin/owner
        var canDelete = comment.UserId == userId || comment.Post!.UserId == userId;

        if (!canDelete && comment.Post!.GroupId.HasValue)
        {
            var membership = await _db.GroupMembers
                .FirstOrDefaultAsync(gm => gm.GroupId == comment.Post!.GroupId && gm.UserId == userId);

            canDelete = membership != null && (membership.Role == Group.Roles.Admin || membership.Role == Group.Roles.Owner);
        }

        if (!canDelete)
        {
            return StatusCode(403, new { error = "You cannot delete this comment" });
        }

        _db.PostComments.Remove(comment);
        await _db.SaveChangesAsync();

        _logger.LogInformation("User {UserId} deleted comment {CommentId} on post {PostId}", userId, commentId, id);

        return Ok(new
        {
            success = true,
            message = "Comment deleted"
        });
    }

    private int? GetCurrentUserId() => User.GetUserId();
}

public class CreatePostRequest
{
    [JsonPropertyName("content")]
    public string Content { get; set; } = string.Empty;

    [JsonPropertyName("image_url")]
    [Url(ErrorMessage = "ImageUrl must be a valid URL")]
    public string? ImageUrl { get; set; }

    [JsonPropertyName("group_id")]
    public int? GroupId { get; set; }
}

public class UpdatePostRequest
{
    [JsonPropertyName("content")]
    public string? Content { get; set; }

    [JsonPropertyName("image_url")]
    [Url(ErrorMessage = "ImageUrl must be a valid URL")]
    public string? ImageUrl { get; set; }
}

public class AddCommentRequest
{
    [JsonPropertyName("content")]
    public string Content { get; set; } = string.Empty;
}
