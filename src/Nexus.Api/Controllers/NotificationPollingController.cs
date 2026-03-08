// Copyright © 2024-2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Nexus.Api.Data;
using Nexus.Api.Extensions;

namespace Nexus.Api.Controllers;

/// <summary>
/// Notification polling and realtime config endpoints.
/// Provides long-polling fallback for clients that cannot use SignalR.
/// </summary>
[ApiController]
[Authorize]
public class NotificationPollingController : ControllerBase
{
    private readonly NexusDbContext _db;
    private readonly ILogger<NotificationPollingController> _logger;

    public NotificationPollingController(NexusDbContext db, ILogger<NotificationPollingController> logger)
    {
        _db = db;
        _logger = logger;
    }

    /// <summary>
    /// GET /api/notifications/poll?since={timestamp} - Poll for new notifications since a given timestamp.
    /// Returns all notifications created after the specified timestamp.
    /// </summary>
    [HttpGet("api/notifications/poll")]
    public async Task<IActionResult> PollNotifications([FromQuery] DateTime? since = null)
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid token" });

        var sinceUtc = since?.ToUniversalTime() ?? DateTime.UtcNow.AddMinutes(-5);

        var notifications = await _db.Notifications
            .AsNoTracking()
            .Where(n => n.UserId == userId && n.CreatedAt > sinceUtc)
            .OrderByDescending(n => n.CreatedAt)
            .Take(100)
            .Select(n => new
            {
                n.Id,
                n.Type,
                n.Title,
                n.Body,
                n.Data,
                n.IsRead,
                n.CreatedAt,
                n.ReadAt
            })
            .ToListAsync();

        var unreadCount = await _db.Notifications
            .Where(n => n.UserId == userId && !n.IsRead)
            .CountAsync();

        return Ok(new
        {
            data = notifications,
            count = notifications.Count,
            unread_count = unreadCount,
            polled_at = DateTime.UtcNow
        });
    }

    /// <summary>
    /// GET /api/realtime/config - Get realtime configuration for the client.
    /// Returns SignalR hub URL, polling interval, and feature flags.
    /// </summary>
    [HttpGet("api/realtime/config")]
    [AllowAnonymous]
    public IActionResult GetRealtimeConfig()
    {
        return Ok(new
        {
            hub_url = "/hubs/messages",
            polling_interval_ms = 30000,
            realtime_enabled = true,
            transports = new[] { "websockets", "server-sent-events", "long-polling" }
        });
    }

    private int? GetCurrentUserId() => User.GetUserId();
}
