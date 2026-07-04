// Copyright (c) 2024-2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

using System.Globalization;
using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore;
using Nexus.Api.Data;

namespace Nexus.Api.Services;

public sealed class CaringNudgeAnalyticsService
{
    private const string FeatureFlagKey = "features.caring_community";
    private const string SettingPrefix = "caring_community.nudges.";
    private const decimal DefaultMinScore = 0.55m;
    private const int DefaultCooldownDays = 14;
    private const int DefaultDailyLimit = 25;
    private const string NudgeNotificationType = "caring_smart_nudges";

    private readonly NexusDbContext _db;

    public CaringNudgeAnalyticsService(NexusDbContext db)
    {
        _db = db;
    }

    public async Task<bool> IsFeatureEnabledAsync(int tenantId, CancellationToken ct)
    {
        var raw = await _db.TenantConfigs
            .IgnoreQueryFilters()
            .Where(c => c.TenantId == tenantId && c.Key == FeatureFlagKey)
            .Select(c => c.Value)
            .FirstOrDefaultAsync(ct);

        return ParseBool(raw) == true;
    }

    public async Task<CaringNudgeAnalytics> AnalyticsAsync(int tenantId, CancellationToken ct)
    {
        await MarkConversionsAsync(tenantId, ct);

        var config = await ConfigAsync(tenantId, ct);
        var cutoff = DateTime.UtcNow.AddDays(-30);

        var nudges = await _db.CaringSmartNudges
            .IgnoreQueryFilters()
            .Where(n => n.TenantId == tenantId)
            .ToListAsync(ct);

        if (nudges.Count == 0)
        {
            return new CaringNudgeAnalytics(
                config,
                CaringNudgeStats.Empty,
                Array.Empty<CaringNudgeRecentRow>(),
                0);
        }

        var recentRows = nudges
            .OrderByDescending(n => n.SentAt)
            .ThenByDescending(n => n.Id)
            .Take(25)
            .ToList();

        var userIds = recentRows
            .SelectMany(n => new[] { n.TargetUserId, n.RelatedUserId ?? 0 })
            .Where(id => id > 0)
            .Distinct()
            .ToArray();

        var names = await _db.Users
            .IgnoreQueryFilters()
            .Where(u => u.TenantId == tenantId && userIds.Contains(u.Id))
            .Select(u => new
            {
                u.Id,
                u.FirstName,
                u.LastName,
                u.Email
            })
            .ToDictionaryAsync(u => u.Id, u => DisplayName(u.FirstName, u.LastName, u.Email), ct);

        var sent30 = nudges.Count(n => n.SentAt >= cutoff);
        var converted30 = nudges.Count(n =>
            n.Status == "converted" &&
            n.ConvertedAt.HasValue &&
            n.ConvertedAt.Value >= cutoff);

        return new CaringNudgeAnalytics(
            config,
            new CaringNudgeStats(
                nudges.Count,
                sent30,
                nudges.Count(n => n.Status == "converted"),
                converted30,
                sent30 > 0 ? RoundRate((decimal)converted30 / sent30) : 0m,
                await OptedOutCountAsync(tenantId, ct)),
            recentRows.Select(n => new CaringNudgeRecentRow(
                n.Id,
                new CaringNudgeUser(n.TargetUserId, names.GetValueOrDefault(n.TargetUserId, string.Empty)),
                new CaringNudgeUser(n.RelatedUserId ?? 0, n.RelatedUserId.HasValue
                    ? names.GetValueOrDefault(n.RelatedUserId.Value, string.Empty)
                    : string.Empty),
                RoundScore(n.Score),
                n.Status,
                FormatTimestamp(n.SentAt),
                n.ConvertedAt.HasValue ? FormatTimestamp(n.ConvertedAt.Value) : null)).ToArray(),
            0);
    }

    private async Task<CaringNudgeConfig> ConfigAsync(int tenantId, CancellationToken ct)
    {
        var rows = await _db.TenantConfigs
            .IgnoreQueryFilters()
            .Where(c => c.TenantId == tenantId && c.Key.StartsWith(SettingPrefix))
            .Select(c => new
            {
                c.Key,
                c.Value
            })
            .ToDictionaryAsync(c => c.Key, c => c.Value, ct);

        return new CaringNudgeConfig(
            ParseBool(Setting(rows, "enabled")) ?? false,
            ParseDecimal(Setting(rows, "min_score"), DefaultMinScore, 0.4m, 0.95m),
            ParseInt(Setting(rows, "cooldown_days"), DefaultCooldownDays, 1, 90),
            ParseInt(Setting(rows, "daily_limit"), DefaultDailyLimit, 1, 250));
    }

    private async Task MarkConversionsAsync(int tenantId, CancellationToken ct)
    {
        var pending = await _db.CaringSmartNudges
            .IgnoreQueryFilters()
            .Where(n =>
                n.TenantId == tenantId &&
                n.Status == "sent" &&
                n.SourceType == "tandem_candidate" &&
                n.RelatedUserId.HasValue)
            .Take(500)
            .ToListAsync(ct);

        if (pending.Count == 0)
        {
            return;
        }

        foreach (var nudge in pending)
        {
            var relatedUserId = nudge.RelatedUserId!.Value;
            var exists = await _db.CaringCaregiverLinks
                .IgnoreQueryFilters()
                .AnyAsync(link =>
                    link.TenantId == tenantId &&
                    link.Status == "active" &&
                    ((link.CaregiverId == nudge.TargetUserId && link.CaredForId == relatedUserId) ||
                     (link.CaregiverId == relatedUserId && link.CaredForId == nudge.TargetUserId)), ct);

            if (!exists)
            {
                continue;
            }

            nudge.Status = "converted";
            nudge.ConvertedAt = DateTime.UtcNow;
            nudge.UpdatedAt = DateTime.UtcNow;
        }

        await _db.SaveChangesAsync(ct);
    }

    private async Task<int> OptedOutCountAsync(int tenantId, CancellationToken ct)
    {
        return await _db.NotificationPreferences
            .IgnoreQueryFilters()
            .Where(p =>
                p.TenantId == tenantId &&
                p.NotificationType == NudgeNotificationType &&
                !p.EnableInApp &&
                !p.EnablePush &&
                !p.EnableEmail)
            .Select(p => p.UserId)
            .Distinct()
            .CountAsync(ct);
    }

    private static string? Setting(IReadOnlyDictionary<string, string> rows, string key)
    {
        return rows.GetValueOrDefault(SettingPrefix + key);
    }

    private static bool? ParseBool(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw))
        {
            return null;
        }

        if (bool.TryParse(raw, out var parsed))
        {
            return parsed;
        }

        return raw.Trim() switch
        {
            "1" => true,
            "0" => false,
            _ => null
        };
    }

    private static decimal ParseDecimal(string? raw, decimal fallback, decimal min, decimal max)
    {
        return decimal.TryParse(raw, NumberStyles.Number, CultureInfo.InvariantCulture, out var value)
            ? Math.Max(min, Math.Min(max, value))
            : fallback;
    }

    private static int ParseInt(string? raw, int fallback, int min, int max)
    {
        return int.TryParse(raw, NumberStyles.Integer, CultureInfo.InvariantCulture, out var value)
            ? Math.Max(min, Math.Min(max, value))
            : fallback;
    }

    private static string DisplayName(string? firstName, string? lastName, string email)
    {
        var fullName = string.Join(" ", new[] { firstName, lastName }
            .Where(value => !string.IsNullOrWhiteSpace(value)))
            .Trim();

        return string.IsNullOrWhiteSpace(fullName) ? email : fullName;
    }

    private static string FormatTimestamp(DateTime value)
    {
        return value.ToUniversalTime().ToString("yyyy-MM-dd HH:mm:ss", CultureInfo.InvariantCulture);
    }

    private static decimal RoundScore(decimal value)
    {
        return Math.Round(value, 3, MidpointRounding.AwayFromZero);
    }

    private static decimal RoundRate(decimal value)
    {
        return Math.Round(value, 3, MidpointRounding.AwayFromZero);
    }
}

public sealed record CaringNudgeAnalytics(
    [property: JsonPropertyName("config")] CaringNudgeConfig Config,
    [property: JsonPropertyName("stats")] CaringNudgeStats Stats,
    [property: JsonPropertyName("recent")] IReadOnlyList<CaringNudgeRecentRow> Recent,
    [property: JsonPropertyName("eligible_candidates")] int EligibleCandidates);

public sealed record CaringNudgeConfig(
    [property: JsonPropertyName("enabled")] bool Enabled,
    [property: JsonPropertyName("min_score")] decimal MinScore,
    [property: JsonPropertyName("cooldown_days")] int CooldownDays,
    [property: JsonPropertyName("daily_limit")] int DailyLimit);

public sealed record CaringNudgeStats(
    [property: JsonPropertyName("sent_total")] int SentTotal,
    [property: JsonPropertyName("sent_30d")] int Sent30d,
    [property: JsonPropertyName("converted_total")] int ConvertedTotal,
    [property: JsonPropertyName("converted_30d")] int Converted30d,
    [property: JsonPropertyName("conversion_rate_30d")] decimal ConversionRate30d,
    [property: JsonPropertyName("opted_out_members")] int OptedOutMembers)
{
    public static CaringNudgeStats Empty { get; } = new(0, 0, 0, 0, 0m, 0);
}

public sealed record CaringNudgeRecentRow(
    [property: JsonPropertyName("id")] long Id,
    [property: JsonPropertyName("target_user")] CaringNudgeUser TargetUser,
    [property: JsonPropertyName("related_user")] CaringNudgeUser RelatedUser,
    [property: JsonPropertyName("score")] decimal Score,
    [property: JsonPropertyName("status")] string Status,
    [property: JsonPropertyName("sent_at")] string SentAt,
    [property: JsonPropertyName("converted_at")] string? ConvertedAt);

public sealed record CaringNudgeUser(
    [property: JsonPropertyName("id")] int Id,
    [property: JsonPropertyName("name")] string Name);
