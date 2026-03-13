// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Nexus.Api.Data;
using Nexus.Api.Extensions;
using Nexus.Api.Services;

namespace Nexus.Api.Controllers;

[ApiController]
[Route("api/comments")]
[Authorize]
public class CommentsV2Controller : ControllerBase
{
    private readonly ThreadedCommentService _commentService;
    private readonly TenantContext _tenantContext;
    private readonly ILogger<CommentsV2Controller> _logger;

    public CommentsV2Controller(ThreadedCommentService commentService, TenantContext tenantContext, ILogger<CommentsV2Controller> logger)
    {
        _commentService = commentService;
        _tenantContext = tenantContext;
        _logger = logger;
    }

    [HttpGet]
    public async Task<IActionResult> List([FromQuery] string target_type, [FromQuery] int target_id,
        [FromQuery] int page = 1, [FromQuery] int limit = 20)
    {
        if (page < 1) page = 1;
        limit = Math.Clamp(limit, 1, 100);
        if (!_tenantContext.TenantId.HasValue)
            return BadRequest(new { error = "Tenant context not resolved" });
        if (string.IsNullOrWhiteSpace(target_type))
            return BadRequest(new { error = "target_type is required" });
        var (comments, total) = await _commentService.GetCommentsAsync(
            _tenantContext.TenantId.Value, target_type, target_id, page, limit);
        return Ok(new
        {
            data = comments.Select(MapComment),
            pagination = new { page, limit, total, pages = (int)Math.Ceiling((double)total / limit) }
        });
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> Get(int id)
    {
        var comment = await _commentService.GetCommentAsync(id);
        if (comment == null) return NotFound(new { error = "Comment not found" });
        return Ok(MapComment(comment));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateCommentRequest request)
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid token" });
        if (!_tenantContext.TenantId.HasValue)
            return BadRequest(new { error = "Tenant context not resolved" });
        var (comment, error) = await _commentService.CreateCommentAsync(
            _tenantContext.TenantId.Value, userId.Value, request.TargetType,
            request.TargetId, request.ParentId, request.Content);
        if (error != null) return BadRequest(new { error });
        return CreatedAtAction(nameof(Get), new { id = comment!.Id }, MapComment(comment));
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateCommentRequest request)
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid token" });
        var (comment, error) = await _commentService.UpdateCommentAsync(id, userId.Value, request.Content);
        if (error == "Comment not found") return NotFound(new { error });
        if (error == "You can only edit your own comments") return StatusCode(403, new { error });
        if (error != null) return BadRequest(new { error });
        return Ok(MapComment(comment!));
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid token" });
        var isAdmin = User.IsAdmin();
        var (success, error) = await _commentService.DeleteCommentAsync(id, userId.Value, isAdmin);
        if (error == "Comment not found") return NotFound(new { error });
        if (error == "You can only delete your own comments") return StatusCode(403, new { error });
        if (!success) return BadRequest(new { error });
        return Ok(new { message = "Comment deleted" });
    }

    private static object MapComment(Nexus.Api.Entities.ThreadedComment c) => new
    {
        id = c.Id, target_type = c.TargetType, target_id = c.TargetId,
        parent_id = c.ParentId, content = c.Content,
        is_edited = c.IsEdited, is_deleted = c.IsDeleted,
        author = c.Author != null ? new { id = c.Author.Id, first_name = c.Author.FirstName, last_name = c.Author.LastName } : null,
        replies = c.Replies.Where(r => !r.IsDeleted).Select(MapComment),
        reply_count = c.Replies.Count(r => !r.IsDeleted),
        created_at = c.CreatedAt, updated_at = c.UpdatedAt
    };

    public class CreateCommentRequest
    {
        [JsonPropertyName("target_type")] public string TargetType { get; set; } = string.Empty;
        [JsonPropertyName("target_id")] public int TargetId { get; set; }
        [JsonPropertyName("parent_id")] public int? ParentId { get; set; }
        [JsonPropertyName("content")] public string Content { get; set; } = string.Empty;
    }

    public class UpdateCommentRequest
    {
        [JsonPropertyName("content")] public string Content { get; set; } = string.Empty;
    }
}
