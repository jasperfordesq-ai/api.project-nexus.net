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

namespace Nexus.Api.Controllers;

/// <summary>
/// Admin notification management - broadcast, stats.
/// </summary>
[ApiController]
[Route("api/admin/notifications")]
[Authorize(Policy = "AdminOnly")]
public class AdminNotificationsController : ControllerBase
{
    private readonly NexusDbContext _db;

    public AdminNotificationsController(NexusDbContext db)
    {
        _db = db;
    }

    /// <summary>
    /// GET /api/admin/notifications/stats - Notification statistics.
    /// </summary>
    [HttpGet("stats")]
    public async Task<IActionResult> GetStats()
    {
        var total = await _db.Notifications.CountAsync();
        var unread = await _db.Notifications.CountAsync(n => !n.IsRead);
        var today = await _db.Notifications.CountAsync(n => n.CreatedAt >= DateTime.UtcNow.Date);

        return Ok(new { data = new { total, unread, sent_today = today } });
    }

    /// <summary>
    /// POST /api/admin/notifications/broadcast - Send notification to all users.
    /// </summary>
    [HttpPost("broadcast")]
    public async Task<IActionResult> Broadcast([FromBody] BroadcastNotificationRequest request)
    {
        var users = await _db.Users.Select(u => u.Id).ToListAsync();

        var notifications = users.Select(userId => new Notification
        {
            UserId = userId,
            Type = "admin_broadcast",
            Title = request.Title,
            Body = request.Message,
            IsRead = false
        }).ToList();

        _db.Notifications.AddRange(notifications);
        await _db.SaveChangesAsync();

        return Ok(new { message = $"Broadcast sent to {notifications.Count} users" });
    }

    /// <summary>
    /// DELETE /api/admin/notifications/cleanup - Delete old read notifications.
    /// </summary>
    [HttpDelete("cleanup")]
    public async Task<IActionResult> Cleanup([FromQuery] int days_old = 90)
    {
        var cutoff = DateTime.UtcNow.AddDays(-days_old);
        var old = await _db.Notifications
            .Where(n => n.IsRead && n.CreatedAt < cutoff)
            .ToListAsync();

        _db.Notifications.RemoveRange(old);
        await _db.SaveChangesAsync();

        return Ok(new { message = $"Deleted {old.Count} old notifications" });
    }
}

public class BroadcastNotificationRequest
{
    [JsonPropertyName("title")] public string Title { get; set; } = string.Empty;
    [JsonPropertyName("message")] public string Message { get; set; } = string.Empty;
}
