// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

using Microsoft.EntityFrameworkCore;
using Nexus.Api.Data;
using Nexus.Api.Entities;

namespace Nexus.Api.Services;

/// <summary>
/// Service for managing push notification subscriptions, preferences, and delivery.
/// Phase 33: Push Notifications.
/// </summary>
public class PushNotificationService
{
    private readonly NexusDbContext _db;
    private readonly TenantContext _tenantContext;
    private readonly ILogger<PushNotificationService> _logger;

    public PushNotificationService(
        NexusDbContext db,
        TenantContext tenantContext,
        ILogger<PushNotificationService> logger)
    {
        _db = db;
        _tenantContext = tenantContext;
        _logger = logger;
    }

    /// <summary>
    /// Register a device for push notifications. If the token already exists for the user,
    /// reactivates it and updates metadata.
    /// </summary>
    public async Task<PushSubscription> RegisterDeviceAsync(int userId, string deviceToken, string platform, string? deviceName = null)
    {
        var tenantId = _tenantContext.GetTenantIdOrThrow();

        // Check if this token is already registered for this tenant
        var existing = await _db.Set<PushSubscription>()
            .FirstOrDefaultAsync(s => s.TenantId == tenantId && s.DeviceToken == deviceToken);

        if (existing != null)
        {
            // Reactivate and update ownership if needed
            existing.UserId = userId;
            existing.Platform = platform;
            existing.DeviceName = deviceName ?? existing.DeviceName;
            existing.IsActive = true;
            existing.UpdatedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync();

            _logger.LogInformation(
                "Push subscription reactivated for user {UserId}, platform {Platform}",
                userId, platform);

            return existing;
        }

        var subscription = new PushSubscription
        {
            TenantId = tenantId,
            UserId = userId,
            DeviceToken = deviceToken,
            Platform = platform,
            DeviceName = deviceName,
            IsActive = true
        };

        _db.Set<PushSubscription>().Add(subscription);
        await _db.SaveChangesAsync();

        _logger.LogInformation(
            "Push subscription registered for user {UserId}, platform {Platform}, device {DeviceName}",
            userId, platform, deviceName ?? "(unnamed)");

        return subscription;
    }

    /// <summary>
    /// Unregister a device by deactivating its subscription.
    /// </summary>
    public async Task<bool> UnregisterDeviceAsync(int userId, string deviceToken)
    {
        var subscription = await _db.Set<PushSubscription>()
            .FirstOrDefaultAsync(s => s.UserId == userId && s.DeviceToken == deviceToken);

        if (subscription == null)
        {
            return false;
        }

        subscription.IsActive = false;
        subscription.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        _logger.LogInformation(
            "Push subscription unregistered for user {UserId}, token ending {TokenEnd}",
            userId, deviceToken.Length > 8 ? deviceToken[^8..] : deviceToken);

        return true;
    }

    /// <summary>
    /// Get all active device subscriptions for a user.
    /// </summary>
    public async Task<List<PushSubscription>> GetUserDevicesAsync(int userId)
    {
        return await _db.Set<PushSubscription>()
            .Where(s => s.UserId == userId && s.IsActive)
            .OrderByDescending(s => s.LastUsedAt ?? s.CreatedAt)
            .ToListAsync();
    }

    /// <summary>
    /// Send a push notification to all active devices for a user.
    /// Creates log entries for each delivery attempt.
    /// Note: Actual FCM/APNs delivery is stubbed - integrate with a push provider.
    /// </summary>
    public async Task<int> SendPushAsync(int userId, string title, string body, string? data = null)
    {
        var devices = await _db.Set<PushSubscription>()
            .Where(s => s.UserId == userId && s.IsActive)
            .ToListAsync();

        if (devices.Count == 0)
        {
            _logger.LogDebug("No active push subscriptions for user {UserId}", userId);
            return 0;
        }

        var sentCount = 0;

        foreach (var device in devices)
        {
            var log = new PushNotificationLog
            {
                TenantId = device.TenantId,
                UserId = userId,
                SubscriptionId = device.Id,
                Title = title,
                Body = body,
                Data = data,
                Status = PushStatus.Pending
            };

            try
            {
                // TODO: Integrate with FCM/APNs/Web Push provider here
                // For now, mark as sent (stub)
                log.Status = PushStatus.Sent;
                log.SentAt = DateTime.UtcNow;

                device.LastUsedAt = DateTime.UtcNow;
                sentCount++;

                _logger.LogDebug(
                    "Push notification sent to device {DeviceId} for user {UserId}: {Title}",
                    device.Id, userId, title);
            }
            catch (Exception ex)
            {
                log.Status = PushStatus.Failed;
                log.ErrorMessage = ex.Message.Length > 1000
                    ? ex.Message[..1000]
                    : ex.Message;

                _logger.LogWarning(ex,
                    "Failed to send push notification to device {DeviceId} for user {UserId}",
                    device.Id, userId);
            }

            _db.Set<PushNotificationLog>().Add(log);
        }

        await _db.SaveChangesAsync();

        _logger.LogInformation(
            "Push notification sent to {SentCount}/{TotalCount} devices for user {UserId}",
            sentCount, devices.Count, userId);

        return sentCount;
    }

    /// <summary>
    /// Send a push notification to multiple users in batch.
    /// </summary>
    public async Task<int> SendBulkPushAsync(IEnumerable<int> userIds, string title, string body, string? data = null)
    {
        var totalSent = 0;

        foreach (var userId in userIds)
        {
            totalSent += await SendPushAsync(userId, title, body, data);
        }

        return totalSent;
    }

    /// <summary>
    /// Check whether a user should receive a notification for a given type and channel.
    /// Returns true by default if no preference is set (opt-out model).
    /// </summary>
    public async Task<bool> ShouldNotifyAsync(int userId, string notificationType, string channel)
    {
        var pref = await _db.Set<NotificationPreference>()
            .FirstOrDefaultAsync(p => p.UserId == userId && p.NotificationType == notificationType);

        if (pref == null)
        {
            // No preference set - use defaults (in-app and push on, email off)
            return channel switch
            {
                "in_app" => true,
                "push" => true,
                "email" => false,
                _ => true
            };
        }

        return channel switch
        {
            "in_app" => pref.EnableInApp,
            "push" => pref.EnablePush,
            "email" => pref.EnableEmail,
            _ => true
        };
    }

    /// <summary>
    /// Get all notification preferences for a user.
    /// </summary>
    public async Task<List<NotificationPreference>> GetPreferencesAsync(int userId)
    {
        return await _db.Set<NotificationPreference>()
            .Where(p => p.UserId == userId)
            .OrderBy(p => p.NotificationType)
            .ToListAsync();
    }

    /// <summary>
    /// Update a single notification preference for a user.
    /// Creates the preference if it doesn't exist.
    /// </summary>
    public async Task<NotificationPreference> UpdatePreferenceAsync(
        int userId,
        string notificationType,
        bool? enableInApp = null,
        bool? enablePush = null,
        bool? enableEmail = null)
    {
        var tenantId = _tenantContext.GetTenantIdOrThrow();

        var pref = await _db.Set<NotificationPreference>()
            .FirstOrDefaultAsync(p => p.UserId == userId && p.NotificationType == notificationType);

        if (pref == null)
        {
            pref = new NotificationPreference
            {
                TenantId = tenantId,
                UserId = userId,
                NotificationType = notificationType
            };
            _db.Set<NotificationPreference>().Add(pref);
        }

        if (enableInApp.HasValue) pref.EnableInApp = enableInApp.Value;
        if (enablePush.HasValue) pref.EnablePush = enablePush.Value;
        if (enableEmail.HasValue) pref.EnableEmail = enableEmail.Value;
        pref.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        _logger.LogInformation(
            "Notification preference updated for user {UserId}, type {NotificationType}: in_app={InApp}, push={Push}, email={Email}",
            userId, notificationType, pref.EnableInApp, pref.EnablePush, pref.EnableEmail);

        return pref;
    }

    /// <summary>
    /// Remove inactive or expired push tokens.
    /// Tokens not used in 90 days are considered expired.
    /// </summary>
    public async Task<int> CleanupExpiredTokensAsync()
    {
        var cutoff = DateTime.UtcNow.AddDays(-90);

        var count = await _db.Set<PushSubscription>()
            .Where(s => s.IsActive && (s.LastUsedAt ?? s.CreatedAt) < cutoff)
            .ExecuteUpdateAsync(setters => setters
                .SetProperty(s => s.IsActive, false)
                .SetProperty(s => s.UpdatedAt, DateTime.UtcNow));

        if (count > 0)
        {
            _logger.LogInformation("Cleaned up {Count} expired push subscriptions", count);
        }

        return count;
    }
}
