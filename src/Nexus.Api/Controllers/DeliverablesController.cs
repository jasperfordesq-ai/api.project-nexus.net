// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Nexus.Api.Data;
using Nexus.Api.Extensions;
using Nexus.Api.Services;

namespace Nexus.Api.Controllers;

[Authorize(Policy = "AdminOnly")]
[ApiController]
[Route("api/admin/deliverables")]
public class DeliverablesController : ControllerBase
{
    private readonly DeliverableService _deliverables;
    private readonly TenantContext _tenantContext;
    private readonly ILogger<DeliverablesController> _logger;

    public DeliverablesController(
        DeliverableService deliverables,
        TenantContext tenantContext,
        ILogger<DeliverablesController> logger)
    {
        _deliverables = deliverables;
        _tenantContext = tenantContext;
        _logger = logger;
    }

    private int? GetCurrentUserId() => User.GetUserId();

    [HttpGet]
    public async Task<IActionResult> List(
        [FromQuery] string? status,
        [FromQuery] string? priority,
        [FromQuery] int? assigned_to,
        [FromQuery] int page = 1,
        [FromQuery] int limit = 20)
    {
        if (!_tenantContext.TenantId.HasValue)
            return BadRequest(new { error = "Tenant context required." });
        var (items, total) = await _deliverables.ListDeliverablesAsync(
            _tenantContext.TenantId.Value, status, priority, assigned_to, page, limit);
        return Ok(new
        {
            data = items.Select(d => new
            {
                id = d.Id, title = d.Title, description = d.Description,
                status = d.Status.ToString(), priority = d.Priority.ToString(),
                assigned_to_user_id = d.AssignedToUserId,
                assigned_to_name = d.AssignedTo != null ? (d.AssignedTo.FirstName + " " + d.AssignedTo.LastName).Trim() : null,
                due_date = d.DueDate, tags = d.Tags,
                created_at = d.CreatedAt, updated_at = d.UpdatedAt,
            }),
            total, page,
            pages = (int)Math.Ceiling(total / (double)limit),
        });
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> Get(int id)
    {
        if (!_tenantContext.TenantId.HasValue)
            return BadRequest(new { error = "Tenant context required." });
        var d = await _deliverables.GetDeliverableAsync(_tenantContext.TenantId.Value, id);
        if (d is null) return NotFound(new { error = "Not found." });
        return Ok(new
        {
            id = d.Id, title = d.Title, description = d.Description,
            status = d.Status.ToString(), priority = d.Priority.ToString(),
            assigned_to_user_id = d.AssignedToUserId,
            assigned_to_name = d.AssignedTo != null ? (d.AssignedTo.FirstName + " " + d.AssignedTo.LastName).Trim() : null,
            created_by_user_id = d.CreatedByUserId,
            due_date = d.DueDate, completed_at = d.CompletedAt, tags = d.Tags,
            created_at = d.CreatedAt, updated_at = d.UpdatedAt,
            comments = d.Comments.Select(c => new
            {
                id = c.Id, user_id = c.UserId,
                user_name = c.User != null ? (c.User.FirstName + " " + c.User.LastName).Trim() : null,
                content = c.Content, created_at = c.CreatedAt,
            }),
        });
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateDeliverableRequest req)
    {
        if (!_tenantContext.TenantId.HasValue)
            return BadRequest(new { error = "Tenant context required." });
        var userId = GetCurrentUserId();
        if (userId is null) return Unauthorized();
        var (d, error) = await _deliverables.CreateDeliverableAsync(
            _tenantContext.TenantId.Value, userId.Value,
            req.Title, req.Description, req.AssignedToUserId,
            req.Priority, req.DueDate, req.Tags);
        if (error is not null) return BadRequest(new { error });
        return Ok(new { message = "Deliverable created.", id = d!.Id, title = d.Title });
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateDeliverableRequest req)
    {
        if (!_tenantContext.TenantId.HasValue)
            return BadRequest(new { error = "Tenant context required." });
        var (d, error) = await _deliverables.UpdateDeliverableAsync(
            _tenantContext.TenantId.Value, id,
            req.Title, req.Description, req.AssignedToUserId,
            req.Status, req.Priority, req.DueDate, req.Tags);
        if (error is not null)
            return error == "Not found." ? NotFound(new { error }) : BadRequest(new { error });
        return Ok(new { message = "Deliverable updated.", id = d!.Id });
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        if (!_tenantContext.TenantId.HasValue)
            return BadRequest(new { error = "Tenant context required." });
        var (success, error) = await _deliverables.DeleteDeliverableAsync(_tenantContext.TenantId.Value, id);
        if (!success)
            return error == "Not found." ? NotFound(new { error }) : BadRequest(new { error });
        return Ok(new { message = "Deliverable deleted." });
    }

    [HttpPost("{id:int}/comments")]
    public async Task<IActionResult> AddComment(int id, [FromBody] AddCommentRequest req)
    {
        if (!_tenantContext.TenantId.HasValue)
            return BadRequest(new { error = "Tenant context required." });
        var userId = GetCurrentUserId();
        if (userId is null) return Unauthorized();
        var (c, error) = await _deliverables.AddCommentAsync(
            _tenantContext.TenantId.Value, id, userId.Value, req.Content);
        if (error is not null) return BadRequest(new { error });
        return Ok(new { message = "Comment added.", id = c!.Id });
    }

    [HttpGet("dashboard")]
    public async Task<IActionResult> Dashboard()
    {
        if (!_tenantContext.TenantId.HasValue)
            return BadRequest(new { error = "Tenant context required." });
        var stats = await _deliverables.GetDashboardAsync(_tenantContext.TenantId.Value);
        return Ok(stats);
    }

    [HttpGet("analytics")]
    public async Task<IActionResult> Analytics()
    {
        if (!_tenantContext.TenantId.HasValue)
            return BadRequest(new { error = "Tenant context required." });
        var stats = await _deliverables.GetAnalyticsAsync(_tenantContext.TenantId.Value);
        return Ok(stats);
    }
}

public record CreateDeliverableRequest(
    string Title, string? Description, int? AssignedToUserId,
    string? Priority, DateTime? DueDate, string? Tags);

public record UpdateDeliverableRequest(
    string? Title, string? Description, int? AssignedToUserId,
    string? Status, string? Priority, DateTime? DueDate, string? Tags);

public record AddCommentRequest(string Content);
