// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Nexus.Api.Data;

namespace Nexus.Api.Controllers;

/// <summary>
/// Admin event management endpoints.
/// </summary>
[ApiController]
[Route("api/admin/events")]
[Authorize(Policy = "AdminOnly")]
public class AdminEventsController : ControllerBase
{
    private readonly NexusDbContext _db;

    public AdminEventsController(NexusDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<IActionResult> ListEvents([FromQuery] int page = 1, [FromQuery] int limit = 20)
    {
        var events = await _db.Events
            .Include(e => e.CreatedBy)
            .OrderByDescending(e => e.StartsAt)
            .Skip((Math.Max(1, page) - 1) * Math.Clamp(limit, 1, 100))
            .Take(Math.Clamp(limit, 1, 100))
            .ToListAsync();

        var total = await _db.Events.CountAsync();

        return Ok(new
        {
            data = events.Select(e => new
            {
                e.Id, e.Title, starts_at = e.StartsAt, ends_at = e.EndsAt,
                is_cancelled = e.IsCancelled, e.MaxAttendees, created_at = e.CreatedAt,
                created_by = e.CreatedBy != null ? new { e.CreatedBy.Id, e.CreatedBy.FirstName, e.CreatedBy.LastName } : null
            }),
            meta = new { page, limit, total }
        });
    }

    [HttpGet("stats")]
    public async Task<IActionResult> GetStats()
    {
        var total = await _db.Events.CountAsync();
        var upcoming = await _db.Events.CountAsync(e => e.StartsAt > DateTime.UtcNow && !e.IsCancelled);
        var cancelled = await _db.Events.CountAsync(e => e.IsCancelled);
        var totalRsvps = await _db.EventRsvps.CountAsync();

        return Ok(new { data = new { total, upcoming, cancelled, total_rsvps = totalRsvps } });
    }

    [HttpPut("{id}/cancel")]
    public async Task<IActionResult> CancelEvent(int id)
    {
        var evt = await _db.Events.FindAsync(id);
        if (evt == null) return NotFound(new { error = "Event not found" });

        evt.IsCancelled = true;
        evt.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(new { data = new { evt.Id, is_cancelled = evt.IsCancelled } });
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteEvent(int id)
    {
        var evt = await _db.Events.FindAsync(id);
        if (evt == null) return NotFound(new { error = "Event not found" });

        var rsvps = await _db.EventRsvps.Where(r => r.EventId == id).ToListAsync();
        _db.EventRsvps.RemoveRange(rsvps);
        _db.Events.Remove(evt);
        await _db.SaveChangesAsync();
        return Ok(new { message = "Event deleted" });
    }
}
