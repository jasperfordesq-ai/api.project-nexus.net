using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Nexus.Api.Data;
using Nexus.Api.Entities;
using Nexus.Api.Extensions;

namespace Nexus.Api.Controllers;

/// <summary>
/// Notifications controller - in-app notification system.
/// Phase 10: List, read, and manage notifications.
/// </summary>
[ApiController]
[Route("api/notifications")]
[Authorize]
public class NotificationsController : ControllerBase
{
    private readonly NexusDbContext _db;
    private readonly ILogger<NotificationsController> _logger;

    public NotificationsController(NexusDbContext db, ILogger<NotificationsController> logger)
    {
        _db = db;
        _logger = logger;
    }

    /// <summary>
    /// GET /api/notifications - List notifications for the current user.
    /// Returns paginated notifications, newest first.
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetNotifications(
        [FromQuery] int page = 1,
        [FromQuery] int limit = 20,
        [FromQuery] bool? unread_only = null)
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        if (page < 1) page = 1;
        if (limit < 1) limit = 1;
        if (limit > 100) limit = 100;

        var query = _db.Notifications
            .Where(n => n.UserId == userId);

        // Filter by unread if requested
        if (unread_only == true)
        {
            query = query.Where(n => !n.IsRead);
        }

        var total = await query.CountAsync();
        var totalPages = (int)Math.Ceiling(total / (double)limit);

        var notifications = await query
            .OrderByDescending(n => n.CreatedAt)
            .Skip((page - 1) * limit)
            .Take(limit)
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

        // Get unread count
        var unreadCount = await _db.Notifications
            .Where(n => n.UserId == userId && !n.IsRead)
            .CountAsync();

        return Ok(new
        {
            data = notifications,
            unread_count = unreadCount,
            pagination = new
            {
                page,
                limit,
                total,
                total_pages = totalPages
            }
        });
    }

    /// <summary>
    /// GET /api/notifications/unread-count - Get count of unread notifications.
    /// </summary>
    [HttpGet("unread-count")]
    public async Task<IActionResult> GetUnreadCount()
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        var count = await _db.Notifications
            .Where(n => n.UserId == userId && !n.IsRead)
            .CountAsync();

        return Ok(new { unread_count = count });
    }

    /// <summary>
    /// GET /api/notifications/{id} - Get a single notification by ID.
    /// </summary>
    [HttpGet("{id}")]
    public async Task<IActionResult> GetNotification(int id)
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        var notification = await _db.Notifications
            .Where(n => n.Id == id && n.UserId == userId)
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
            .FirstOrDefaultAsync();

        if (notification == null)
        {
            return NotFound(new { error = "Notification not found" });
        }

        return Ok(notification);
    }

    /// <summary>
    /// PUT /api/notifications/{id}/read - Mark a notification as read.
    /// </summary>
    [HttpPut("{id}/read")]
    public async Task<IActionResult> MarkAsRead(int id)
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        var notification = await _db.Notifications
            .FirstOrDefaultAsync(n => n.Id == id && n.UserId == userId);

        if (notification == null)
        {
            return NotFound(new { error = "Notification not found" });
        }

        if (!notification.IsRead)
        {
            notification.IsRead = true;
            notification.ReadAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();

            _logger.LogInformation("Notification {NotificationId} marked as read by user {UserId}", id, userId);
        }

        return Ok(new
        {
            success = true,
            message = "Notification marked as read",
            notification = new
            {
                notification.Id,
                notification.IsRead,
                notification.ReadAt
            }
        });
    }

    /// <summary>
    /// PUT /api/notifications/read-all - Mark all notifications as read.
    /// </summary>
    [HttpPut("read-all")]
    public async Task<IActionResult> MarkAllAsRead()
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        var now = DateTime.UtcNow;
        var unreadNotifications = await _db.Notifications
            .Where(n => n.UserId == userId && !n.IsRead)
            .ToListAsync();

        var count = unreadNotifications.Count;

        foreach (var notification in unreadNotifications)
        {
            notification.IsRead = true;
            notification.ReadAt = now;
        }

        await _db.SaveChangesAsync();

        _logger.LogInformation("User {UserId} marked {Count} notifications as read", userId, count);

        return Ok(new
        {
            success = true,
            message = $"Marked {count} notification(s) as read",
            marked_count = count
        });
    }

    /// <summary>
    /// DELETE /api/notifications/{id} - Delete a notification.
    /// </summary>
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteNotification(int id)
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        var notification = await _db.Notifications
            .FirstOrDefaultAsync(n => n.Id == id && n.UserId == userId);

        if (notification == null)
        {
            return NotFound(new { error = "Notification not found" });
        }

        _db.Notifications.Remove(notification);
        await _db.SaveChangesAsync();

        _logger.LogInformation("Notification {NotificationId} deleted by user {UserId}", id, userId);

        return Ok(new
        {
            success = true,
            message = "Notification deleted"
        });
    }

    private int? GetCurrentUserId() => User.GetUserId();
}
