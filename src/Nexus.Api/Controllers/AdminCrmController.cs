// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

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
        var result = await _crmService.GetFlaggedNotesAsync(page, limit);
        return Ok(result);
    }
}

#region Request DTOs

public class AddNoteRequest
{
    [JsonPropertyName("content")]
    public string Content { get; set; } = string.Empty;

    [JsonPropertyName("category")]
    public string? Category { get; set; }

    [JsonPropertyName("is_flagged")]
    public bool IsFlagged { get; set; } = false;
}

public class UpdateNoteRequest
{
    [JsonPropertyName("content")]
    public string Content { get; set; } = string.Empty;

    [JsonPropertyName("category")]
    public string? Category { get; set; }

    [JsonPropertyName("is_flagged")]
    public bool? IsFlagged { get; set; }
}

#endregion
