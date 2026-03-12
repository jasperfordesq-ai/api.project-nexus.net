// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Nexus.Api.Extensions;
using Nexus.Api.Services;

namespace Nexus.Api.Controllers;

/// <summary>
/// Admin CRM endpoints for user notes, flags, and advanced search.
/// All endpoints require admin role.
/// </summary>
[ApiController]
[Route("api/admin/crm")]
[Authorize(Policy = "AdminOnly")]
public class AdminCrmController : ControllerBase
{
    private readonly AdminCrmService _crmService;
    private readonly ILogger<AdminCrmController> _logger;

    public AdminCrmController(
        AdminCrmService crmService,
        ILogger<AdminCrmController> logger)
    {
        _crmService = crmService;
        _logger = logger;
    }

    private int? GetCurrentUserId() => User.GetUserId();

    /// <summary>
    /// Advanced user search with multiple filter criteria.
    /// </summary>
    [HttpGet("users/search")]
    public async Task<IActionResult> SearchUsers(
        [FromQuery] string? role,
        [FromQuery] bool? is_active,
        [FromQuery] DateTime? joined_after,
        [FromQuery] DateTime? joined_before,
        [FromQuery] DateTime? last_login_after,
        [FromQuery] DateTime? last_login_before,
        [FromQuery] int? min_xp,
        [FromQuery] int? max_xp,
        [FromQuery] int? min_exchange_count,
        [FromQuery] int? max_exchange_count,
        [FromQuery] bool? has_warnings,
        [FromQuery] string? search,
        [FromQuery] int page = 1,
        [FromQuery] int limit = 20)
    {
        page = Math.Max(page, 1);
        limit = Math.Clamp(limit, 1, 100);
        var filters = new AdvancedUserSearchFilters
        {
            Role = role,
            IsActive = is_active,
            JoinedAfter = joined_after,
            JoinedBefore = joined_before,
            LastLoginAfter = last_login_after,
            LastLoginBefore = last_login_before,
            MinXp = min_xp,
            MaxXp = max_xp,
            MinExchangeCount = min_exchange_count,
            MaxExchangeCount = max_exchange_count,
            HasWarnings = has_warnings,
            Search = search,
            Page = page,
            Limit = limit
        };

        var result = await _crmService.SearchUsersAdvancedAsync(filters);
        return Ok(result);
    }

    /// <summary>
    /// Add an admin note to a user.
    /// </summary>
    [HttpPost("users/{userId}/notes")]
    public async Task<IActionResult> AddNote(int userId, [FromBody] AddNoteRequest request)
    {
        var adminId = GetCurrentUserId();
        if (adminId == null)
        {
            return Unauthorized(new { error = "Unable to determine admin identity" });
        }

        if (string.IsNullOrWhiteSpace(request.Content))
        {
            return BadRequest(new { error = "Content is required" });
        }

        var note = await _crmService.AddNoteAsync(userId, adminId.Value, request.Content, request.Category, request.IsFlagged);
        if (note == null)
        {
            return NotFound(new { error = "User not found" });
        }

        return Created($"api/admin/crm/notes/{note.Id}", note);
    }

    /// <summary>
    /// Get admin notes for a specific user.
    /// </summary>
    [HttpGet("users/{userId}/notes")]
    public async Task<IActionResult> GetNotes(int userId, [FromQuery] int page = 1, [FromQuery] int limit = 20)
    {
        page = Math.Max(page, 1);
        limit = Math.Clamp(limit, 1, 100);
        var result = await _crmService.GetNotesAsync(userId, page, limit);
        return Ok(result);
    }

    /// <summary>
    /// Update an admin note. Only the admin who created it can update it.
    /// </summary>
    [HttpPut("notes/{id}")]
    public async Task<IActionResult> UpdateNote(int id, [FromBody] UpdateNoteRequest request)
    {
        var adminId = GetCurrentUserId();
        if (adminId == null)
        {
            return Unauthorized(new { error = "Unable to determine admin identity" });
        }

        if (string.IsNullOrWhiteSpace(request.Content))
        {
            return BadRequest(new { error = "Content is required" });
        }

        var note = await _crmService.UpdateNoteAsync(id, adminId.Value, request.Content, request.Category, request.IsFlagged);
        if (note == null)
        {
            return NotFound(new { error = "Note not found or you do not have permission to update it" });
        }

        return Ok(note);
    }

    /// <summary>
    /// Delete an admin note. Only the admin who created it can delete it.
    /// </summary>
    [HttpDelete("notes/{id}")]
    public async Task<IActionResult> DeleteNote(int id)
    {
        var adminId = GetCurrentUserId();
        if (adminId == null)
        {
            return Unauthorized(new { error = "Unable to determine admin identity" });
        }

        var deleted = await _crmService.DeleteNoteAsync(id, adminId.Value);
        if (!deleted)
        {
            return NotFound(new { error = "Note not found or you do not have permission to delete it" });
        }

        return NoContent();
    }

    /// <summary>
    /// Get all flagged notes across all users.
    /// </summary>
    [HttpGet("flagged-notes")]
    public async Task<IActionResult> GetFlaggedNotes([FromQuery] int page = 1, [FromQuery] int limit = 20)
    {
        page = Math.Max(page, 1);
        limit = Math.Clamp(limit, 1, 100);
        var result = await _crmService.GetFlaggedNotesAsync(page, limit);
        return Ok(result);
    }


    /// <summary>GET /api/admin/crm/tasks - List CRM tasks.</summary>
    [HttpGet("tasks")]
    public async Task<IActionResult> ListCrmTasks(
        [FromQuery] int? user_id,
        [FromQuery] string? status)
    {
        var tenantId = GetCurrentTenantId();
        if (tenantId == null) return Unauthorized(new { error = "Invalid tenant" });

        var (tasks, total) = await _crmService.ListCrmTasksAsync(tenantId.Value, user_id, status);

        return Ok(new
        {
            data = tasks.Select(t => new
            {
                t.Id,
                t.TargetUserId,
                t.AssignedToAdminId,
                t.Title,
                t.Description,
                t.Priority,
                t.Status,
                t.DueDate,
                t.CompletedAt,
                t.CreatedAt
            }),
            total
        });
    }

    /// <summary>POST /api/admin/crm/tasks - Create CRM task.</summary>
    [HttpPost("tasks")]
    public async Task<IActionResult> CreateCrmTask([FromBody] CreateCrmTaskRequest request)
    {
        var adminId = GetCurrentUserId();
        if (adminId == null) return Unauthorized(new { error = "Unable to determine admin identity" });

        var tenantId = GetCurrentTenantId();
        if (tenantId == null) return Unauthorized(new { error = "Invalid tenant" });

        if (string.IsNullOrWhiteSpace(request.Title))
            return BadRequest(new { error = "Title is required" });

        var (task, error) = await _crmService.CreateCrmTaskAsync(
            tenantId.Value, request.TargetUserId, adminId.Value,
            request.Title, request.Description, request.Priority, request.DueDate);

        if (error != null) return BadRequest(new { error });

        return Created($"api/admin/crm/tasks/{task!.Id}", new
        {
            task.Id,
            task.TargetUserId,
            task.Title,
            task.Priority,
            task.Status,
            task.DueDate,
            task.CreatedAt
        });
    }

    /// <summary>PUT /api/admin/crm/tasks/{id}/complete - Mark task done.</summary>
    [HttpPut("tasks/{id}/complete")]
    public async Task<IActionResult> CompleteCrmTask(int id)
    {
        var tenantId = GetCurrentTenantId();
        if (tenantId == null) return Unauthorized(new { error = "Invalid tenant" });

        var (success, error) = await _crmService.CompleteCrmTaskAsync(tenantId.Value, id);
        if (!success) return NotFound(new { error = error ?? "Task not found" });

        return Ok(new { message = "Task marked as done" });
    }

    /// <summary>DELETE /api/admin/crm/tasks/{id} - Delete CRM task.</summary>
    [HttpDelete("tasks/{id}")]
    public async Task<IActionResult> DeleteCrmTask(int id)
    {
        var tenantId = GetCurrentTenantId();
        if (tenantId == null) return Unauthorized(new { error = "Invalid tenant" });

        var (success, error) = await _crmService.DeleteCrmTaskAsync(tenantId.Value, id);
        if (!success) return NotFound(new { error = error ?? "Task not found" });

        return NoContent();
    }

    /// <summary>POST /api/admin/crm/users/{userId}/tags - Add tag to user.</summary>
    [HttpPost("users/{userId}/tags")]
    public async Task<IActionResult> AddTag(int userId, [FromBody] TagRequest request)
    {
        var adminId = GetCurrentUserId();
        if (adminId == null) return Unauthorized(new { error = "Unable to determine admin identity" });

        var tenantId = GetCurrentTenantId();
        if (tenantId == null) return Unauthorized(new { error = "Invalid tenant" });

        if (string.IsNullOrWhiteSpace(request.Tag))
            return BadRequest(new { error = "Tag is required" });

        var (success, error) = await _crmService.AddTagToUserAsync(tenantId.Value, userId, adminId.Value, request.Tag);
        if (!success) return BadRequest(new { error });

        return Ok(new { message = "Tag added", user_id = userId, tag = request.Tag.Trim().ToLower() });
    }

    /// <summary>DELETE /api/admin/crm/users/{userId}/tags/{tag} - Remove tag.</summary>
    [HttpDelete("users/{userId}/tags/{tag}")]
    public async Task<IActionResult> RemoveTag(int userId, string tag)
    {
        var tenantId = GetCurrentTenantId();
        if (tenantId == null) return Unauthorized(new { error = "Invalid tenant" });

        var (success, error) = await _crmService.RemoveTagFromUserAsync(tenantId.Value, userId, tag);
        if (!success) return NotFound(new { error = error ?? "Tag not found" });

        return NoContent();
    }

    /// <summary>GET /api/admin/crm/users/{userId}/tags - List user tags.</summary>
    [HttpGet("users/{userId}/tags")]
    public async Task<IActionResult> GetUserTags(int userId)
    {
        var tenantId = GetCurrentTenantId();
        if (tenantId == null) return Unauthorized(new { error = "Invalid tenant" });

        var tags = await _crmService.GetUserTagsAsync(tenantId.Value, userId);
        return Ok(new { data = tags, total = tags.Count, user_id = userId });
    }

    /// <summary>GET /api/admin/crm/users/export - Export users as CSV.</summary>
    [HttpGet("users/export")]
    public async Task<IActionResult> ExportUsers(
        [FromQuery] string? role,
        [FromQuery] bool? is_active,
        [FromQuery] string? search)
    {
        var tenantId = GetCurrentTenantId();
        if (tenantId == null) return Unauthorized(new { error = "Invalid tenant" });

        var filters = new AdvancedUserSearchFilters
        {
            Role = role,
            IsActive = is_active,
            Search = search,
            Page = 1,
            Limit = 5000
        };

        var csv = await _crmService.ExportUsersAsCsvAsync(tenantId.Value, filters);

        return File(System.Text.Encoding.UTF8.GetBytes(csv), "text/csv", "users_export.csv");
    }

    private int? GetCurrentTenantId()
    {
        var tenantIdClaim = User.FindFirst("tenant_id")?.Value;
        return int.TryParse(tenantIdClaim, out var id) ? id : null;
    }
}

#region Request DTOs

public class AddNoteRequest
{
    [JsonPropertyName("content"), MaxLength(5000)]
    public string Content { get; set; } = string.Empty;

    [JsonPropertyName("category"), MaxLength(100)]
    public string? Category { get; set; }

    [JsonPropertyName("is_flagged")]
    public bool IsFlagged { get; set; } = false;
}

public class UpdateNoteRequest
{
    [JsonPropertyName("content"), MaxLength(5000)]
    public string Content { get; set; } = string.Empty;

    [JsonPropertyName("category"), MaxLength(100)]
    public string? Category { get; set; }

    [JsonPropertyName("is_flagged")]
    public bool? IsFlagged { get; set; }
}

public class CreateCrmTaskRequest
{
    [System.Text.Json.Serialization.JsonPropertyName("target_user_id")]
    public int TargetUserId { get; set; }

    [System.Text.Json.Serialization.JsonPropertyName("title"), MaxLength(200)]
    public string Title { get; set; } = string.Empty;

    [System.Text.Json.Serialization.JsonPropertyName("description"), MaxLength(2000)]
    public string? Description { get; set; }

    [System.Text.Json.Serialization.JsonPropertyName("priority"), MaxLength(50)]
    public string? Priority { get; set; }

    [System.Text.Json.Serialization.JsonPropertyName("due_date")]
    public DateTime? DueDate { get; set; }
}

public class TagRequest
{
    [System.Text.Json.Serialization.JsonPropertyName("tag"), MaxLength(100)]
    public string Tag { get; set; } = string.Empty;
}

#endregion
