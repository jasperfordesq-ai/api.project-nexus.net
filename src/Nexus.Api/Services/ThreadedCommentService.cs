// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

using Microsoft.EntityFrameworkCore;
using Nexus.Api.Data;
using Nexus.Api.Entities;

namespace Nexus.Api.Services;

/// <summary>
/// Service for managing threaded comments on any target type (listings, posts, events, etc.).
/// Supports two levels of nesting (top-level + replies), soft-delete, and edit tracking.
/// </summary>
public class ThreadedCommentService
{
    private readonly NexusDbContext _db;
    private readonly TenantContext _tenantContext;
    private readonly ILogger<ThreadedCommentService> _logger;

    private static readonly HashSet<string> ValidTargetTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "listing", "resource", "event", "group", "blog_post", "page", "idea", "job"
    };

    public ThreadedCommentService(NexusDbContext db, TenantContext tenantContext, ILogger<ThreadedCommentService> logger)
    {
        _db = db;
        _tenantContext = tenantContext;
        _logger = logger;
    }

    /// <summary>
    /// Get top-level comments with replies (2 levels deep) for a target, ordered by CreatedAt desc.
    /// </summary>
    public async Task<(List<ThreadedComment> Data, int Total)> GetCommentsAsync(
        int tenantId, string targetType, int targetId, int page, int limit)
    {
        var normalizedType = targetType.Trim().ToLower();

        var query = _db.Set<ThreadedComment>()
            .AsNoTracking()
            .Where(c => c.TargetType == normalizedType && c.TargetId == targetId && c.ParentId == null);

        var total = await query.CountAsync();

        var data = await query
            .Include(c => c.Author)
            .Include(c => c.Replies.OrderBy(r => r.CreatedAt))
                .ThenInclude(r => r.Author)
            .OrderByDescending(c => c.CreatedAt)
            .Skip((page - 1) * limit)
            .Take(limit)
            .ToListAsync();

        return (data, total);
    }

    /// <summary>
    /// Get a single comment with its author and replies.
    /// </summary>
    public async Task<ThreadedComment?> GetCommentAsync(int id)
    {
        return await _db.Set<ThreadedComment>()
            .AsNoTracking()
            .Include(c => c.Author)
            .Include(c => c.Replies.OrderBy(r => r.CreatedAt))
                .ThenInclude(r => r.Author)
            .FirstOrDefaultAsync(c => c.Id == id);
    }

    /// <summary>
    /// Create a comment. Validates content not empty and parent exists if provided.
    /// </summary>
    public async Task<(ThreadedComment? Comment, string? Error)> CreateCommentAsync(
        int tenantId, int userId, string targetType, int targetId, int? parentId, string content)
    {
        if (string.IsNullOrWhiteSpace(content))
            return (null, "Content is required");

        var normalizedType = targetType?.Trim().ToLower() ?? string.Empty;
        if (!ValidTargetTypes.Contains(normalizedType))
            return (null, "Invalid target type");

        if (parentId.HasValue)
        {
            var parent = await _db.Set<ThreadedComment>().FindAsync(parentId.Value);
            if (parent == null)
                return (null, "Parent comment not found");

            if (parent.TargetType != normalizedType || parent.TargetId != targetId)
                return (null, "Parent comment belongs to a different target");
        }

        var comment = new ThreadedComment
        {
            TenantId = tenantId,
            AuthorId = userId,
            TargetType = normalizedType,
            TargetId = targetId,
            ParentId = parentId,
            Content = content.Trim(),
            IsEdited = false,
            IsDeleted = false,
            CreatedAt = DateTime.UtcNow
        };

        _db.Set<ThreadedComment>().Add(comment);
        await _db.SaveChangesAsync();

        _logger.LogInformation("Comment {CommentId} created by user {UserId} on {TargetType}/{TargetId}",
            comment.Id, userId, normalizedType, targetId);

        return (await GetCommentAsync(comment.Id), null);
    }

    /// <summary>
    /// Update a comment. Only the author can edit; sets IsEdited=true.
    /// </summary>
    public async Task<(ThreadedComment? Comment, string? Error)> UpdateCommentAsync(
        int id, int userId, string content)
    {
        if (string.IsNullOrWhiteSpace(content))
            return (null, "Content is required");

        var comment = await _db.Set<ThreadedComment>().FindAsync(id);
        if (comment == null)
            return (null, "Comment not found");

        if (comment.IsDeleted)
            return (null, "Cannot edit a deleted comment");

        if (comment.AuthorId != userId)
            return (null, "You can only edit your own comments");

        comment.Content = content.Trim();
        comment.IsEdited = true;
        comment.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        _logger.LogInformation("Comment {CommentId} updated by user {UserId}", id, userId);
        return (await GetCommentAsync(id), null);
    }

    /// <summary>
    /// Soft-delete a comment: sets IsDeleted=true and Content to "[deleted]". Only the author can delete.
    /// </summary>
    public async Task<(bool Success, string? Error)> DeleteCommentAsync(int id, int userId, bool isAdmin = false)
    {
        var comment = await _db.Set<ThreadedComment>().FindAsync(id);
        if (comment == null)
            return (false, "Comment not found");

        if (comment.IsDeleted)
            return (false, "Comment already deleted");

        if (comment.AuthorId != userId && !isAdmin)
            return (false, "You can only delete your own comments");

        comment.IsDeleted = true;
        comment.Content = "[deleted]";
        comment.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        _logger.LogInformation("Comment {CommentId} soft-deleted by user {UserId}", id, userId);
        return (true, null);
    }

    /// <summary>
    /// Get count of non-deleted comments for a target.
    /// </summary>
    public async Task<int> GetCommentCountAsync(string targetType, int targetId)
    {
        return await _db.Set<ThreadedComment>()
            .CountAsync(c => c.TargetType == targetType.ToLower() && c.TargetId == targetId && !c.IsDeleted);
    }
}
