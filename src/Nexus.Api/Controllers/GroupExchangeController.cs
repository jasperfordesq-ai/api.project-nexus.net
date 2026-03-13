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

[ApiController]
[Route("api/group-exchanges")]
[Authorize]
public class GroupExchangeController : ControllerBase
{
    private readonly NexusDbContext _db;
    private readonly TenantContext _tenantContext;
    private readonly ILogger<GroupExchangeController> _logger;

    public GroupExchangeController(NexusDbContext db, TenantContext tenantContext, ILogger<GroupExchangeController> logger)
    { _db = db; _tenantContext = tenantContext; _logger = logger; }

    [HttpGet]
    public async Task<IActionResult> List([FromQuery] int? group_id, [FromQuery] int page = 1, [FromQuery] int limit = 20)
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid token" });
        if (page < 1) page = 1;
        limit = Math.Clamp(limit, 1, 100);
        var query = _db.GroupExchanges.AsNoTracking().AsQueryable();
        if (group_id.HasValue)
        {
            if (!await _db.GroupMembers.AnyAsync(gm => gm.GroupId == group_id.Value && gm.UserId == userId))
                return StatusCode(403, new { error = "You must be a member of the group" });
            query = query.Where(ge => ge.GroupId == group_id.Value);
        }
        else
        {
            var myGroupIds = await _db.GroupMembers.Where(gm => gm.UserId == userId).Select(gm => gm.GroupId).ToListAsync();
            query = query.Where(ge => myGroupIds.Contains(ge.GroupId));
        }
        var total = await query.CountAsync();
        var exchanges = await query.OrderByDescending(ge => ge.CreatedAt).Skip((page - 1) * limit).Take(limit)
            .Select(ge => new
            {
                ge.Id, ge.Title, ge.Description, total_hours = ge.TotalHours, ge.Status, group_id = ge.GroupId,
                created_by = ge.CreatedBy != null ? new { ge.CreatedBy.Id, first_name = ge.CreatedBy.FirstName, last_name = ge.CreatedBy.LastName } : null,
                participant_count = ge.Participants.Count,
                created_at = ge.CreatedAt, approved_at = ge.ApprovedAt, completed_at = ge.CompletedAt
            }).ToListAsync();
        return Ok(new { data = exchanges, pagination = new { page, limit, total, pages = (int)Math.Ceiling(total / (double)limit) } });
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> Get(int id)
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid token" });
        var exchange = await _db.GroupExchanges.AsNoTracking().Where(ge => ge.Id == id)
            .Select(ge => new
            {
                ge.Id, ge.Title, ge.Description, total_hours = ge.TotalHours, ge.Status, group_id = ge.GroupId,
                created_by = ge.CreatedBy != null ? new { ge.CreatedBy.Id, first_name = ge.CreatedBy.FirstName, last_name = ge.CreatedBy.LastName } : null,
                approved_by = ge.ApprovedBy != null ? new { ge.ApprovedBy.Id, first_name = ge.ApprovedBy.FirstName, last_name = ge.ApprovedBy.LastName } : null,
                approved_at = ge.ApprovedAt, completed_at = ge.CompletedAt, created_at = ge.CreatedAt, updated_at = ge.UpdatedAt,
                participants = ge.Participants.Select(p => new
                {
                    p.Id, user = p.User != null ? new { p.User.Id, first_name = p.User.FirstName, last_name = p.User.LastName } : null,
                    p.Hours, p.Role, is_confirmed = p.IsConfirmed, confirmed_at = p.ConfirmedAt
                })
            }).FirstOrDefaultAsync();
        if (exchange == null) return NotFound(new { error = "Group exchange not found" });
        if (!await _db.GroupMembers.AnyAsync(gm => gm.GroupId == exchange.group_id && gm.UserId == userId))
            return StatusCode(403, new { error = "You must be a member of the group" });
        return Ok(exchange);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateGroupExchangeRequest request)
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid token" });
        if (string.IsNullOrWhiteSpace(request.Title)) return BadRequest(new { error = "Title is required" });
        if (request.GroupId <= 0) return BadRequest(new { error = "group_id is required" });
        if (!await _db.Groups.AnyAsync(g => g.Id == request.GroupId)) return NotFound(new { error = "Group not found" });
        if (!await _db.GroupMembers.AnyAsync(gm => gm.GroupId == request.GroupId && gm.UserId == userId))
            return StatusCode(403, new { error = "You must be a member of the group" });
        var tenantId = _tenantContext.GetTenantIdOrThrow();
        await using var transaction = await _db.Database.BeginTransactionAsync();
        var exchange = new GroupExchange
        {
            TenantId = tenantId, GroupId = request.GroupId, Title = request.Title.Trim(),
            Description = request.Description?.Trim(), TotalHours = 0, Status = "draft", CreatedById = userId.Value
        };
        _db.GroupExchanges.Add(exchange);
        await _db.SaveChangesAsync();
        await transaction.CommitAsync();
        _logger.LogInformation("User {UserId} created group exchange {ExchangeId} in group {GroupId}", userId, exchange.Id, request.GroupId);
        return CreatedAtAction(nameof(Get), new { id = exchange.Id },
            new { success = true, message = "Group exchange created", exchange = new { exchange.Id, exchange.Title, total_hours = exchange.TotalHours, exchange.Status, created_at = exchange.CreatedAt } });
    }

    [HttpPost("{id:int}/participants")]
    public async Task<IActionResult> AddParticipant(int id, [FromBody] AddParticipantRequest request)
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid token" });
        var exchange = await _db.GroupExchanges.FirstOrDefaultAsync(ge => ge.Id == id);
        if (exchange == null) return NotFound(new { error = "Group exchange not found" });
        if (exchange.Status != "draft") return BadRequest(new { error = "Can only add participants to draft exchanges" });
        if (exchange.CreatedById != userId.Value) return StatusCode(403, new { error = "Only the creator can add participants" });
        if (!await _db.GroupMembers.AnyAsync(gm => gm.GroupId == exchange.GroupId && gm.UserId == request.UserId))
            return BadRequest(new { error = "User must be a member of the group" });
        if (await _db.GroupExchangeParticipants.AnyAsync(p => p.GroupExchangeId == id && p.UserId == request.UserId))
            return BadRequest(new { error = "User is already a participant" });
        var participant = new GroupExchangeParticipant
        {
            GroupExchangeId = id, UserId = request.UserId, Hours = request.Hours, Role = request.Role ?? "provider",
            IsConfirmed = request.UserId == userId.Value
        };
        if (participant.IsConfirmed) participant.ConfirmedAt = DateTime.UtcNow;
        _db.GroupExchangeParticipants.Add(participant);
        exchange.TotalHours = await _db.GroupExchangeParticipants.Where(p => p.GroupExchangeId == id).SumAsync(p => p.Hours) + request.Hours;
        exchange.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return StatusCode(201, new { success = true, message = "Participant added", participant = new { participant.Id, participant.UserId, participant.Hours, participant.Role, is_confirmed = participant.IsConfirmed } });
    }

    [HttpDelete("{id:int}/participants/{participantId:int}")]
    public async Task<IActionResult> RemoveParticipant(int id, int participantId)
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid token" });
        var exchange = await _db.GroupExchanges.FirstOrDefaultAsync(ge => ge.Id == id);
        if (exchange == null) return NotFound(new { error = "Group exchange not found" });
        if (exchange.Status != "draft") return BadRequest(new { error = "Can only remove participants from draft exchanges" });
        if (exchange.CreatedById != userId.Value) return StatusCode(403, new { error = "Only the creator can remove participants" });
        var participant = await _db.GroupExchangeParticipants.FirstOrDefaultAsync(p => p.Id == participantId && p.GroupExchangeId == id);
        if (participant == null) return NotFound(new { error = "Participant not found" });
        _db.GroupExchangeParticipants.Remove(participant);
        exchange.TotalHours = await _db.GroupExchangeParticipants.Where(p => p.GroupExchangeId == id && p.Id != participantId).SumAsync(p => p.Hours);
        exchange.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(new { success = true, message = "Participant removed" });
    }

    [HttpPut("{id:int}/submit")]
    public async Task<IActionResult> Submit(int id)
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid token" });
        var exchange = await _db.GroupExchanges.Include(ge => ge.Participants).FirstOrDefaultAsync(ge => ge.Id == id);
        if (exchange == null) return NotFound(new { error = "Group exchange not found" });
        if (exchange.CreatedById != userId.Value) return StatusCode(403, new { error = "Only the creator can submit" });
        if (exchange.Status != "draft") return BadRequest(new { error = "Exchange must be in draft status to submit" });
        if (exchange.Participants.Count == 0) return BadRequest(new { error = "Exchange must have at least one participant" });
        var unconfirmed = exchange.Participants.Count(p => !p.IsConfirmed);
        if (unconfirmed > 0) return BadRequest(new { error = unconfirmed + " participant(s) have not confirmed yet" });
        exchange.Status = "pending"; exchange.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(new { success = true, message = "Exchange submitted for approval", exchange = new { exchange.Id, exchange.Status } });
    }

    [HttpPut("{id:int}/approve")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> Approve(int id)
    {
        var adminId = User.GetUserId();
        if (adminId == null) return Unauthorized(new { error = "Invalid token" });
        var exchange = await _db.GroupExchanges.Include(ge => ge.Participants).FirstOrDefaultAsync(ge => ge.Id == id);
        if (exchange == null) return NotFound(new { error = "Group exchange not found" });
        if (exchange.Status != "pending") return BadRequest(new { error = "Exchange must be in pending status to approve" });
        exchange.Status = "approved"; exchange.ApprovedById = adminId.Value; exchange.ApprovedAt = DateTime.UtcNow; exchange.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(new { success = true, message = "Group exchange approved", exchange = new { exchange.Id, exchange.Status, approved_at = exchange.ApprovedAt } });
    }

    [HttpPut("{id:int}/complete")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> Complete(int id)
    {
        var adminId = User.GetUserId();
        if (adminId == null) return Unauthorized(new { error = "Invalid token" });
        var exchange = await _db.GroupExchanges.FirstOrDefaultAsync(ge => ge.Id == id);
        if (exchange == null) return NotFound(new { error = "Group exchange not found" });
        if (exchange.Status != "approved") return BadRequest(new { error = "Exchange must be approved before completion" });
        exchange.Status = "completed"; exchange.CompletedAt = DateTime.UtcNow; exchange.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(new { success = true, message = "Group exchange completed", exchange = new { exchange.Id, exchange.Status, completed_at = exchange.CompletedAt } });
    }

    [HttpPut("{id:int}/confirm")]
    public async Task<IActionResult> Confirm(int id)
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid token" });
        var exchange = await _db.GroupExchanges.FirstOrDefaultAsync(ge => ge.Id == id);
        if (exchange == null) return NotFound(new { error = "Group exchange not found" });
        if (exchange.Status != "draft") return BadRequest(new { error = "Exchange is not in a confirmable state" });
        var participant = await _db.GroupExchangeParticipants.FirstOrDefaultAsync(p => p.GroupExchangeId == id && p.UserId == userId);
        if (participant == null) return NotFound(new { error = "You are not a participant in this exchange" });
        if (participant.IsConfirmed) return BadRequest(new { error = "You have already confirmed participation" });
        participant.IsConfirmed = true; participant.ConfirmedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(new { success = true, message = "Participation confirmed", is_confirmed = true, exchange_status = exchange.Status });
    }

    [HttpPut("{id:int}/cancel")]
    public async Task<IActionResult> Cancel(int id)
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid token" });
        var isAdmin = User.IsAdmin();
        var exchange = await _db.GroupExchanges.FirstOrDefaultAsync(ge => ge.Id == id);
        if (exchange == null) return NotFound(new { error = "Group exchange not found" });
        if (exchange.Status == "completed") return BadRequest(new { error = "Cannot cancel a completed exchange" });
        if (exchange.Status == "cancelled") return BadRequest(new { error = "Exchange is already cancelled" });
        if (exchange.CreatedById != userId.Value && !isAdmin) return StatusCode(403, new { error = "Only the creator or an admin can cancel" });
        exchange.Status = "cancelled"; exchange.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        _logger.LogInformation("User {UserId} cancelled group exchange {ExchangeId}", userId, id);
        return Ok(new { success = true, message = "Group exchange cancelled", exchange = new { exchange.Id, exchange.Status } });
    }

    public record CreateGroupExchangeRequest(
        [property: JsonPropertyName("title")] string Title,
        [property: JsonPropertyName("description")] string? Description,
        [property: JsonPropertyName("group_id")] int GroupId);

    public record AddParticipantRequest(
        [property: JsonPropertyName("user_id")] int UserId,
        [property: JsonPropertyName("hours")] decimal Hours,
        [property: JsonPropertyName("role")] string? Role);
}
