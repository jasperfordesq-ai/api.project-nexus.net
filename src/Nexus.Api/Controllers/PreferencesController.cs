// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Nexus.Api.Data;
using Nexus.Api.Extensions;
using Nexus.Api.Services;

namespace Nexus.Api.Controllers;

/// <summary>
/// User preferences controller - general settings and notification preferences.
/// </summary>
[ApiController]
[Route("api/preferences")]
[Authorize]
public class PreferencesController : ControllerBase
{
    private readonly UserPreferencesService _preferencesService;
    private readonly TenantContext _tenantContext;
    private readonly ILogger<PreferencesController> _logger;

    public PreferencesController(
        UserPreferencesService preferencesService,
        TenantContext tenantContext,
        ILogger<PreferencesController> logger)
    {
        _preferencesService = preferencesService;
        _tenantContext = tenantContext;
        _logger = logger;
    }

    /// <summary>
    /// GET /api/preferences - Get current user's preferences.
    /// Creates default preferences if none exist.
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetPreferences()
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid token" });

        var tenantId = _tenantContext.GetTenantIdOrThrow();
        var prefs = await _preferencesService.GetPreferencesAsync(tenantId, userId.Value);

        return Ok(new
        {
            theme = prefs.Theme,
            language = prefs.Language,
            timezone = prefs.Timezone,
            email_digest_frequency = prefs.EmailDigestFrequency,
            profile_visibility = prefs.ProfileVisibility,
            show_online_status = prefs.ShowOnlineStatus,
            show_last_seen = prefs.ShowLastSeen,
            created_at = prefs.CreatedAt,
            updated_at = prefs.UpdatedAt
        });
    }

    /// <summary>
    /// PUT /api/preferences - Update current user's preferences (partial update).
    /// Only fields present in the request body are changed.
    /// </summary>
    [HttpPut]
    public async Task<IActionResult> UpdatePreferences([FromBody] UpdatePreferencesDto dto)
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid token" });

        var tenantId = _tenantContext.GetTenantIdOrThrow();

        try
        {
            var prefs = await _preferencesService.UpdatePreferencesAsync(tenantId, userId.Value, dto);

            return Ok(new
            {
                success = true,
                message = "Preferences updated",
                preferences = new
                {
                    theme = prefs.Theme,
                    language = prefs.Language,
                    timezone = prefs.Timezone,
                    email_digest_frequency = prefs.EmailDigestFrequency,
                    profile_visibility = prefs.ProfileVisibility,
                    show_online_status = prefs.ShowOnlineStatus,
                    show_last_seen = prefs.ShowLastSeen,
                    updated_at = prefs.UpdatedAt
                }
            });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    /// <summary>
    /// GET /api/preferences/notifications - Get notification preferences for current user.
    /// </summary>
    [HttpGet("notifications")]
    public async Task<IActionResult> GetNotificationPreferences()
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid token" });

        var tenantId = _tenantContext.GetTenantIdOrThrow();
        var prefs = await _preferencesService.GetNotificationPreferencesAsync(tenantId, userId.Value);

        return Ok(prefs.Select(p => new
        {
            notification_type = p.NotificationType,
            enable_in_app = p.EnableInApp,
            enable_push = p.EnablePush,
            enable_email = p.EnableEmail,
            created_at = p.CreatedAt,
            updated_at = p.UpdatedAt
        }));
    }

    /// <summary>
    /// PUT /api/preferences/notifications - Set a notification preference for current user.
    /// Upserts based on notification_type.
    /// </summary>
    [HttpPut("notifications")]
    public async Task<IActionResult> SetNotificationPreference([FromBody] SetNotificationPreferenceRequest request)
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid token" });

        if (string.IsNullOrWhiteSpace(request.NotificationType))
            return BadRequest(new { error = "notification_type is required" });

        var tenantId = _tenantContext.GetTenantIdOrThrow();

        try
        {
            var pref = await _preferencesService.SetNotificationPreferenceAsync(
                tenantId, userId.Value,
                request.NotificationType,
                request.EnableInApp,
                request.EnablePush,
                request.EnableEmail);

            return Ok(new
            {
                success = true,
                message = "Notification preference updated",
                preference = new
                {
                    notification_type = pref.NotificationType,
                    enable_in_app = pref.EnableInApp,
                    enable_push = pref.EnablePush,
                    enable_email = pref.EnableEmail,
                    updated_at = pref.UpdatedAt ?? pref.CreatedAt
                }
            });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    /// <summary>
    /// POST /api/preferences/reset - Reset all preferences to defaults.
    /// </summary>
    [HttpPost("reset")]
    public async Task<IActionResult> ResetPreferences()
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid token" });

        var tenantId = _tenantContext.GetTenantIdOrThrow();
        var prefs = await _preferencesService.ResetPreferencesAsync(tenantId, userId.Value);

        return Ok(new
        {
            success = true,
            message = "Preferences reset to defaults",
            preferences = new
            {
                theme = prefs.Theme,
                language = prefs.Language,
                timezone = prefs.Timezone,
                email_digest_frequency = prefs.EmailDigestFrequency,
                profile_visibility = prefs.ProfileVisibility,
                show_online_status = prefs.ShowOnlineStatus,
                show_last_seen = prefs.ShowLastSeen,
                created_at = prefs.CreatedAt
            }
        });
    }
}

// DTOs

public class SetNotificationPreferenceRequest
{
    [JsonPropertyName("notification_type")]
    public string NotificationType { get; set; } = string.Empty;

    [JsonPropertyName("enable_in_app")]
    public bool? EnableInApp { get; set; }

    [JsonPropertyName("enable_push")]
    public bool? EnablePush { get; set; }

    [JsonPropertyName("enable_email")]
    public bool? EnableEmail { get; set; }
}
