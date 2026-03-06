// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Nexus.Api.Data;
using Nexus.Api.Entities;
using Nexus.Api.Extensions;
using Nexus.Api.Services;

namespace Nexus.Api.Controllers;

/// <summary>
/// System administration controller for global settings, scheduled tasks,
/// announcements, and system health monitoring.
/// Phase 37: Advanced Admin.
/// </summary>
[ApiController]
[Route("api/admin/system")]
[Authorize(Policy = "AdminOnly")]
public class SystemAdminController : ControllerBase
{
    private readonly SystemAdminService _systemAdmin;
    private readonly TenantContext _tenantContext;
    private readonly ILogger<SystemAdminController> _logger;

    public SystemAdminController(
        SystemAdminService systemAdmin,
        TenantContext tenantContext,
        ILogger<SystemAdminController> logger)
    {
        _systemAdmin = systemAdmin;
        _tenantContext = tenantContext;
        _logger = logger;
    }

    private int? GetCurrentUserId() => User.GetUserId();

    #region System Settings

    /// <summary>
    /// GET /api/admin/system/settings - List system settings.
    /// </summary>
    [HttpGet("settings")]
    public async Task<IActionResult> GetSettings([FromQuery] string? category = null)
    {
        var settings = await _systemAdmin.GetSystemSettingsAsync(category);

        var response = settings.Select(s => new SettingResponse
        {
            Id = s.Id,
            Key = s.Key,
            Value = s.Value,
            Description = s.Description,
            Category = s.Category,
            IsSecret = s.IsSecret,
            UpdatedAt = s.UpdatedAt,
            CreatedAt = s.CreatedAt
        });

        return Ok(response);
    }

    /// <summary>
    /// PUT /api/admin/system/settings - Create or update a system setting.
    /// </summary>
    [HttpPut("settings")]
    public async Task<IActionResult> SetSetting([FromBody] SetSettingRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Key))
            return BadRequest(new { error = "key is required" });

        if (string.IsNullOrWhiteSpace(request.Value))
            return BadRequest(new { error = "value is required" });

        var adminId = GetCurrentUserId();
        if (adminId == null) return Unauthorized(new { error = "Invalid token" });

        var setting = await _systemAdmin.SetSystemSettingAsync(
            request.Key,
            request.Value,
            request.Description,
            request.Category,
            request.IsSecret,
            adminId.Value);

        return Ok(new SettingResponse
        {
            Id = setting.Id,
            Key = setting.Key,
            Value = setting.IsSecret ? "********" : setting.Value,
            Description = setting.Description,
            Category = setting.Category,
            IsSecret = setting.IsSecret,
            UpdatedAt = setting.UpdatedAt,
            CreatedAt = setting.CreatedAt
        });
    }

    #endregion

    #region Scheduled Tasks

    /// <summary>
    /// GET /api/admin/system/tasks - List scheduled tasks.
    /// </summary>
    [HttpGet("tasks")]
    public async Task<IActionResult> GetTasks()
    {
        var tasks = await _systemAdmin.GetScheduledTasksAsync();

        var response = tasks.Select(t => new TaskResponse
        {
            Id = t.Id,
            TaskName = t.TaskName,
            Status = t.Status.ToString().ToLowerInvariant(),
            LastRunAt = t.LastRunAt,
            NextRunAt = t.NextRunAt,
            CronExpression = t.CronExpression,
            Parameters = t.Parameters,
            ErrorMessage = t.ErrorMessage,
            RunCount = t.RunCount,
            AverageDurationMs = t.AverageDurationMs,
            CreatedAt = t.CreatedAt,
            UpdatedAt = t.UpdatedAt
        });

        return Ok(response);
    }

    #endregion

    #region Announcements (Admin)

    /// <summary>
    /// GET /api/admin/system/announcements - List announcements (includes inactive).
    /// </summary>
    [HttpGet("announcements")]
    public async Task<IActionResult> GetAnnouncements()
    {
        var tenantId = _tenantContext.GetTenantIdOrThrow();
        var announcements = await _systemAdmin.GetActiveAnnouncementsAsync(tenantId);

        var response = announcements.Select(MapAnnouncementResponse);
        return Ok(response);
    }

    /// <summary>
    /// POST /api/admin/system/announcements - Create a new announcement.
    /// </summary>
    [HttpPost("announcements")]
    public async Task<IActionResult> CreateAnnouncement([FromBody] CreateAnnouncementRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Title))
            return BadRequest(new { error = "title is required" });

        if (string.IsNullOrWhiteSpace(request.Content))
            return BadRequest(new { error = "content is required" });

        var adminId = GetCurrentUserId();
        if (adminId == null) return Unauthorized(new { error = "Invalid token" });

        var tenantId = _tenantContext.GetTenantIdOrThrow();

        if (!Enum.TryParse<AnnouncementType>(request.Type, true, out var type))
            type = AnnouncementType.Info;

        var announcement = await _systemAdmin.CreateAnnouncementAsync(
            tenantId,
            adminId.Value,
            request.Title,
            request.Content,
            type,
            request.StartsAt,
            request.EndsAt);

        return Created($"/api/admin/system/announcements/{announcement.Id}", MapAnnouncementResponse(announcement));
    }

    /// <summary>
    /// PUT /api/admin/system/announcements/{id}/deactivate - Deactivate an announcement.
    /// </summary>
    [HttpPut("announcements/{id}/deactivate")]
    public async Task<IActionResult> DeactivateAnnouncement(int id)
    {
        var success = await _systemAdmin.DeactivateAnnouncementAsync(id);

        if (!success)
            return NotFound(new { error = "Announcement not found" });

        return Ok(new { message = "Announcement deactivated" });
    }

    #endregion

    #region System Health

    /// <summary>
    /// GET /api/admin/system/health - System health metrics.
    /// </summary>
    [HttpGet("health")]
    public async Task<IActionResult> GetHealth()
    {
        var health = await _systemAdmin.GetSystemHealthAsync();

        return Ok(new HealthResponse
        {
            DatabaseSize = health.DatabaseSize,
            TotalUsers = health.TotalUsers,
            ActiveUsersLast24h = health.ActiveUsersLast24h,
            ActiveUsersLast7d = health.ActiveUsersLast7d,
            TotalTenants = health.TotalTenants,
            TotalListings = health.TotalListings,
            PendingScheduledTasks = health.PendingScheduledTasks,
            FailedScheduledTasks = health.FailedScheduledTasks,
            ServerTime = health.ServerTime
        });
    }

    #endregion

    #region Helpers

    private static AnnouncementResponse MapAnnouncementResponse(PlatformAnnouncement a) => new()
    {
        Id = a.Id,
        Title = a.Title,
        Content = a.Content,
        Type = a.Type.ToString().ToLowerInvariant(),
        IsActive = a.IsActive,
        StartsAt = a.StartsAt,
        EndsAt = a.EndsAt,
        CreatedById = a.CreatedById,
        CreatedByName = a.CreatedBy != null ? $"{a.CreatedBy.FirstName} {a.CreatedBy.LastName}" : null,
        CreatedAt = a.CreatedAt,
        UpdatedAt = a.UpdatedAt
    };

    #endregion

    #region Request/Response DTOs

    public class SetSettingRequest
    {
        [JsonPropertyName("key")]
        public string Key { get; set; } = string.Empty;

        [JsonPropertyName("value")]
        public string Value { get; set; } = string.Empty;

        [JsonPropertyName("description")]
        public string? Description { get; set; }

        [JsonPropertyName("category")]
        public string? Category { get; set; }

        [JsonPropertyName("is_secret")]
        public bool? IsSecret { get; set; }
    }

    public class SettingResponse
    {
        [JsonPropertyName("id")]
        public int Id { get; set; }

        [JsonPropertyName("key")]
        public string Key { get; set; } = string.Empty;

        [JsonPropertyName("value")]
        public string Value { get; set; } = string.Empty;

        [JsonPropertyName("description")]
        public string? Description { get; set; }

        [JsonPropertyName("category")]
        public string? Category { get; set; }

        [JsonPropertyName("is_secret")]
        public bool IsSecret { get; set; }

        [JsonPropertyName("updated_at")]
        public DateTime? UpdatedAt { get; set; }

        [JsonPropertyName("created_at")]
        public DateTime CreatedAt { get; set; }
    }

    public class TaskResponse
    {
        [JsonPropertyName("id")]
        public int Id { get; set; }

        [JsonPropertyName("task_name")]
        public string TaskName { get; set; } = string.Empty;

        [JsonPropertyName("status")]
        public string Status { get; set; } = string.Empty;

        [JsonPropertyName("last_run_at")]
        public DateTime? LastRunAt { get; set; }

        [JsonPropertyName("next_run_at")]
        public DateTime? NextRunAt { get; set; }

        [JsonPropertyName("cron_expression")]
        public string? CronExpression { get; set; }

        [JsonPropertyName("parameters")]
        public string? Parameters { get; set; }

        [JsonPropertyName("error_message")]
        public string? ErrorMessage { get; set; }

        [JsonPropertyName("run_count")]
        public int RunCount { get; set; }

        [JsonPropertyName("average_duration_ms")]
        public long AverageDurationMs { get; set; }

        [JsonPropertyName("created_at")]
        public DateTime CreatedAt { get; set; }

        [JsonPropertyName("updated_at")]
        public DateTime? UpdatedAt { get; set; }
    }

    public class CreateAnnouncementRequest
    {
        [JsonPropertyName("title")]
        public string Title { get; set; } = string.Empty;

        [JsonPropertyName("content")]
        public string Content { get; set; } = string.Empty;

        [JsonPropertyName("type")]
        public string Type { get; set; } = "info";

        [JsonPropertyName("starts_at")]
        public DateTime? StartsAt { get; set; }

        [JsonPropertyName("ends_at")]
        public DateTime? EndsAt { get; set; }
    }

    public class AnnouncementResponse
    {
        [JsonPropertyName("id")]
        public int Id { get; set; }

        [JsonPropertyName("title")]
        public string Title { get; set; } = string.Empty;

        [JsonPropertyName("content")]
        public string Content { get; set; } = string.Empty;

        [JsonPropertyName("type")]
        public string Type { get; set; } = string.Empty;

        [JsonPropertyName("is_active")]
        public bool IsActive { get; set; }

        [JsonPropertyName("starts_at")]
        public DateTime? StartsAt { get; set; }

        [JsonPropertyName("ends_at")]
        public DateTime? EndsAt { get; set; }

        [JsonPropertyName("created_by_id")]
        public int CreatedById { get; set; }

        [JsonPropertyName("created_by_name")]
        public string? CreatedByName { get; set; }

        [JsonPropertyName("created_at")]
        public DateTime CreatedAt { get; set; }

        [JsonPropertyName("updated_at")]
        public DateTime? UpdatedAt { get; set; }
    }

    public class HealthResponse
    {
        [JsonPropertyName("database_size")]
        public string DatabaseSize { get; set; } = string.Empty;

        [JsonPropertyName("total_users")]
        public int TotalUsers { get; set; }

        [JsonPropertyName("active_users_last_24h")]
        public int ActiveUsersLast24h { get; set; }

        [JsonPropertyName("active_users_last_7d")]
        public int ActiveUsersLast7d { get; set; }

        [JsonPropertyName("total_tenants")]
        public int TotalTenants { get; set; }

        [JsonPropertyName("total_listings")]
        public int TotalListings { get; set; }

        [JsonPropertyName("pending_scheduled_tasks")]
        public int PendingScheduledTasks { get; set; }

        [JsonPropertyName("failed_scheduled_tasks")]
        public int FailedScheduledTasks { get; set; }

        [JsonPropertyName("server_time")]
        public DateTime ServerTime { get; set; }
    }

    #endregion
}

/// <summary>
/// Public announcements controller - no authentication required.
/// Returns active announcements for the current tenant.
/// </summary>
[ApiController]
[Route("api/announcements")]
public class AnnouncementsController : ControllerBase
{
    private readonly SystemAdminService _systemAdmin;
    private readonly TenantContext _tenantContext;

    public AnnouncementsController(
        SystemAdminService systemAdmin,
        TenantContext tenantContext)
    {
        _systemAdmin = systemAdmin;
        _tenantContext = tenantContext;
    }

    /// <summary>
    /// GET /api/announcements - Get active announcements for current tenant (public).
    /// </summary>
    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> GetActiveAnnouncements()
    {
        var tenantId = _tenantContext.IsResolved ? _tenantContext.GetTenantIdOrThrow() : (int?)null;
        var announcements = await _systemAdmin.GetActiveAnnouncementsAsync(tenantId);

        var response = announcements.Select(a => new
        {
            id = a.Id,
            title = a.Title,
            content = a.Content,
            type = a.Type.ToString().ToLowerInvariant(),
            starts_at = a.StartsAt,
            ends_at = a.EndsAt,
            created_at = a.CreatedAt
        });

        return Ok(response);
    }
}
