// Copyright © 2024-2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Nexus.Api.Data;
using Nexus.Api.Extensions;
using Nexus.Api.Services;

namespace Nexus.Api.Controllers;

/// <summary>
/// Admin broker management - assignments, notes, and statistics.
/// </summary>
[ApiController]
[Route("api/admin/broker")]
[Authorize(Policy = "AdminOnly")]
public class AdminBrokerController : ControllerBase
{
    private readonly BrokerService _broker;
    private readonly NexusDbContext _db;
    private readonly TenantContext _tenant;

    public AdminBrokerController(BrokerService broker, NexusDbContext db, TenantContext tenant)
    {
        _broker = broker;
        _db = db;
        _tenant = tenant;
    }

    /// <summary>
    /// GET /api/admin/broker/assignments - List all broker assignments.
    /// </summary>
    [HttpGet("assignments")]
    public async Task<IActionResult> ListAssignments(
        [FromQuery] int? brokerId = null,
        [FromQuery] int? memberId = null,
        [FromQuery] string? status = null)
    {
        var assignments = await _broker.GetAssignmentsAsync(brokerId, status);

        if (memberId.HasValue)
            assignments = assignments.Where(a => a.MemberId == memberId.Value).ToList();

        return Ok(new
        {
            data = assignments.Select(a => MapAssignment(a)),
            meta = new { total = assignments.Count }
        });
    }

    /// <summary>
    /// GET /api/admin/broker/assignments/{id} - Get assignment details.
    /// </summary>
    [HttpGet("assignments/{id}")]
    public async Task<IActionResult> GetAssignment(int id)
    {
        var assignment = await _broker.GetAssignmentAsync(id);
        if (assignment == null) return NotFound(new { error = "Assignment not found" });
        return Ok(new { data = MapAssignment(assignment) });
    }

    /// <summary>
    /// POST /api/admin/broker/assignments - Create a broker assignment.
    /// </summary>
    [HttpPost("assignments")]
    public async Task<IActionResult> CreateAssignment([FromBody] CreateAssignmentRequest request)
    {
        var tenantId = _tenant.GetTenantIdOrThrow();
        var (assignment, error) = await _broker.CreateAssignmentAsync(
            tenantId, request.BrokerId, request.MemberId, request.Notes);

        if (error != null) return BadRequest(new { error });
        return Created("/api/admin/broker/assignments/" + assignment!.Id,
            new { data = new { assignment.Id, assignment.BrokerId, assignment.MemberId, assignment.Status } });
    }

    /// <summary>
    /// PUT /api/admin/broker/assignments/{id} - Update an assignment.
    /// </summary>
    [HttpPut("assignments/{id}")]
    public async Task<IActionResult> UpdateAssignment(int id, [FromBody] UpdateAssignmentRequest request)
    {
        var (assignment, error) = await _broker.UpdateAssignmentAsync(id, request.Status, request.Notes);
        if (error != null) return BadRequest(new { error });
        return Ok(new { data = MapAssignment(assignment!) });
    }

    /// <summary>
    /// PUT /api/admin/broker/assignments/{id}/complete - Mark assignment as completed.
    /// </summary>
    [HttpPut("assignments/{id}/complete")]
    public async Task<IActionResult> CompleteAssignment(int id)
    {
        var (assignment, error) = await _broker.CompleteAssignmentAsync(id);
        if (error != null) return BadRequest(new { error });
        return Ok(new { data = new { assignment!.Id, assignment.Status, completed_at = assignment.CompletedAt } });
    }

    /// <summary>
    /// DELETE /api/admin/broker/assignments/{id} - Remove an assignment.
    /// </summary>
    [HttpDelete("assignments/{id}")]
    public async Task<IActionResult> DeleteAssignment(int id)
    {
        var error = await _broker.DeleteAssignmentAsync(id);
        if (error != null) return NotFound(new { error });
        return Ok(new { message = "Assignment deleted" });
    }

    /// <summary>
    /// PUT /api/admin/broker/assignments/{id}/reassign - Reassign to a different broker.
    /// </summary>
    [HttpPut("assignments/{id}/reassign")]
    public async Task<IActionResult> ReassignAssignment(int id, [FromBody] ReassignRequest request)
    {
        var (assignment, error) = await _broker.ReassignAsync(id, request.BrokerId);
        if (error != null) return BadRequest(new { error });
        return Ok(new { data = MapAssignment(assignment!) });
    }

    /// <summary>
    /// GET /api/admin/broker/members/{memberId}/notes - Get notes for a member.
    /// </summary>
    [HttpGet("members/{memberId}/notes")]
    public async Task<IActionResult> GetMemberNotes(int memberId)
    {
        var notes = await _broker.GetNotesAsync(memberId: memberId);
        return Ok(new
        {
            data = notes.Select(n => MapNote(n)),
            meta = new { total = notes.Count }
        });
    }

    /// <summary>
    /// GET /api/admin/broker/exchanges/{exchangeId}/notes - Get notes for an exchange.
    /// </summary>
    [HttpGet("exchanges/{exchangeId}/notes")]
    public async Task<IActionResult> GetExchangeNotes(int exchangeId)
    {
        var notes = await _broker.GetNotesAsync(exchangeId: exchangeId);
        return Ok(new
        {
            data = notes.Select(n => MapNote(n)),
            meta = new { total = notes.Count }
        });
    }

    /// <summary>
    /// POST /api/admin/broker/notes - Create a broker note.
    /// </summary>
    [HttpPost("notes")]
    public async Task<IActionResult> CreateNote([FromBody] CreateNoteRequest request)
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid token" });

        var tenantId = _tenant.GetTenantIdOrThrow();
        var (note, error) = await _broker.CreateNoteAsync(
            tenantId, userId.Value, request.MemberId, request.ExchangeId,
            request.Content, request.IsPrivate);

        if (error != null) return BadRequest(new { error });
        return Created("/api/admin/broker/notes", new { data = MapNote(note!) });
    }

    /// <summary>
    /// GET /api/admin/broker/stats - Overall broker statistics.
    /// </summary>
    [HttpGet("stats")]
    public async Task<IActionResult> GetOverallStats()
    {
        var stats = await _broker.GetOverallStatsAsync();
        return Ok(new { data = stats });
    }

    /// <summary>
    /// GET /api/admin/broker/stats/{brokerId} - Statistics for a specific broker.
    /// </summary>
    [HttpGet("stats/{brokerId}")]
    public async Task<IActionResult> GetBrokerStats(int brokerId)
    {
        var stats = await _broker.GetBrokerStatsAsync(brokerId);
        return Ok(new { data = stats });
    }

    /// <summary>
    /// GET /api/admin/broker/brokers - List all users with broker role.
    /// </summary>
    [HttpGet("brokers")]
    public async Task<IActionResult> ListBrokers()
    {
        var brokers = await _db.Users
            .Where(u => u.Role == "broker" || u.Role == "admin")
            .OrderBy(u => u.LastName)
            .ThenBy(u => u.FirstName)
            .Select(u => new
            {
                u.Id,
                u.FirstName,
                u.LastName,
                u.Email,
                u.Role,
                created_at = u.CreatedAt
            })
            .ToListAsync();

        return Ok(new { data = brokers, meta = new { total = brokers.Count } });
    }

    // --- Mapping helpers ---

    private static object MapAssignment(Entities.BrokerAssignment a) => new
    {
        a.Id,
        broker_id = a.BrokerId,
        member_id = a.MemberId,
        a.Status,
        a.Notes,
        assigned_at = a.AssignedAt,
        completed_at = a.CompletedAt,
        created_at = a.CreatedAt,
        updated_at = a.UpdatedAt,
        broker = a.Broker != null ? new { a.Broker.Id, a.Broker.FirstName, a.Broker.LastName, a.Broker.Email } : null,
        member = a.Member != null ? new { a.Member.Id, a.Member.FirstName, a.Member.LastName, a.Member.Email } : null
    };

    private static object MapNote(Entities.BrokerNote n) => new
    {
        n.Id,
        broker_id = n.BrokerId,
        member_id = n.MemberId,
        exchange_id = n.ExchangeId,
        n.Content,
        is_private = n.IsPrivate,
        created_at = n.CreatedAt,
        broker = n.Broker != null ? new { n.Broker.Id, n.Broker.FirstName, n.Broker.LastName } : null,
        member = n.Member != null ? new { n.Member.Id, n.Member.FirstName, n.Member.LastName } : null
    };

    // --- Request DTOs ---

    public class CreateAssignmentRequest
    {
        [JsonPropertyName("broker_id")] public int BrokerId { get; set; }
        [JsonPropertyName("member_id")] public int MemberId { get; set; }
        [JsonPropertyName("notes")] public string? Notes { get; set; }
    }

    public class UpdateAssignmentRequest
    {
        [JsonPropertyName("status")] public string Status { get; set; } = "active";
        [JsonPropertyName("notes")] public string? Notes { get; set; }
    }

    public class ReassignRequest
    {
        [JsonPropertyName("broker_id")] public int BrokerId { get; set; }
    }

    public class CreateNoteRequest
    {
        [JsonPropertyName("member_id")] public int? MemberId { get; set; }
        [JsonPropertyName("exchange_id")] public int? ExchangeId { get; set; }
        [JsonPropertyName("content")] public string Content { get; set; } = string.Empty;
        [JsonPropertyName("is_private")] public bool IsPrivate { get; set; } = true;
    }
}
