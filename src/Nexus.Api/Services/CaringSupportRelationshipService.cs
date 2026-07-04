// Copyright (c) 2024-2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

using System.Globalization;
using Microsoft.EntityFrameworkCore;
using Nexus.Api.Data;
using Nexus.Api.Entities;

namespace Nexus.Api.Services;

/// <summary>
/// Tenant-scoped KISS support relationship read model matching Laravel admin endpoints.
/// </summary>
public sealed class CaringSupportRelationshipService
{
    private static readonly string[] Statuses = ["active", "paused", "completed", "cancelled"];
    private const string DateFormat = "yyyy-MM-dd";

    private readonly NexusDbContext _db;

    public CaringSupportRelationshipService(NexusDbContext db)
    {
        _db = db;
    }

    public async Task<bool> IsFeatureEnabledAsync(int tenantId, CancellationToken ct)
    {
        var raw = await _db.TenantConfigs
            .IgnoreQueryFilters()
            .Where(config => config.TenantId == tenantId && config.Key == "features.caring_community")
            .Select(config => config.Value)
            .FirstOrDefaultAsync(ct);

        return IsTruthy(raw);
    }

    public async Task<object> ListAsync(int tenantId, string? status, CancellationToken ct)
    {
        var requestedStatus = NormalizeStatus(status);
        var relationships = await _db.CaringSupportRelationships
            .IgnoreQueryFilters()
            .AsNoTracking()
            .Where(relationship => relationship.TenantId == tenantId)
            .ToListAsync(ct);

        var userIds = relationships
            .SelectMany(relationship => new[] { relationship.SupporterId, relationship.RecipientId, relationship.CoordinatorId ?? 0 })
            .Where(id => id > 0)
            .Distinct()
            .ToArray();
        var users = userIds.Length == 0
            ? new Dictionary<int, User>()
            : await _db.Users
                .IgnoreQueryFilters()
                .AsNoTracking()
                .Where(user => user.TenantId == tenantId && userIds.Contains(user.Id))
                .ToDictionaryAsync(user => user.Id, ct);

        var categoryIds = relationships
            .Where(relationship => relationship.CategoryId is not null)
            .Select(relationship => relationship.CategoryId!.Value)
            .Distinct()
            .ToArray();
        var categories = categoryIds.Length == 0
            ? new Dictionary<int, string>()
            : await _db.Categories
                .IgnoreQueryFilters()
                .AsNoTracking()
                .Where(category => category.TenantId == tenantId && categoryIds.Contains(category.Id))
                .ToDictionaryAsync(category => category.Id, category => category.Name, ct);

        var items = relationships
            .Where(relationship => requestedStatus == "all" || relationship.Status == requestedStatus)
            .OrderBy(relationship => StatusRank(relationship.Status))
            .ThenBy(relationship => relationship.NextCheckInAt ?? relationship.CreatedAt)
            .ThenByDescending(relationship => relationship.Id)
            .Take(100)
            .Select(relationship => RelationshipRow(relationship, users, categories))
            .Cast<object>()
            .ToArray();

        return new
        {
            stats = Stats(relationships),
            items
        };
    }

    public async Task<IReadOnlyList<object>> ListForMemberAsync(int tenantId, int userId, CancellationToken ct)
    {
        var relationships = await _db.CaringSupportRelationships
            .IgnoreQueryFilters()
            .AsNoTracking()
            .Where(relationship =>
                relationship.TenantId == tenantId
                && (relationship.SupporterId == userId || relationship.RecipientId == userId)
                && (relationship.Status == "active" || relationship.Status == "paused"))
            .OrderBy(relationship => relationship.Status == "active" ? 0 : 1)
            .ThenBy(relationship => relationship.NextCheckInAt ?? relationship.CreatedAt)
            .ThenByDescending(relationship => relationship.Id)
            .Take(50)
            .ToListAsync(ct);

        if (relationships.Count == 0)
        {
            return [];
        }

        var userIds = relationships
            .SelectMany(relationship => new[] { relationship.SupporterId, relationship.RecipientId })
            .Distinct()
            .ToArray();
        var users = await _db.Users
            .IgnoreQueryFilters()
            .AsNoTracking()
            .Where(user => user.TenantId == tenantId && userIds.Contains(user.Id))
            .ToDictionaryAsync(user => user.Id, ct);

        var relationshipIds = relationships
            .Select(relationship => relationship.Id)
            .ToArray();
        var logs = await _db.VolunteerLogs
            .IgnoreQueryFilters()
            .AsNoTracking()
            .Where(log =>
                log.TenantId == tenantId
                && log.CaringSupportRelationshipId != null
                && relationshipIds.Contains(log.CaringSupportRelationshipId.Value))
            .OrderByDescending(log => log.DateLogged)
            .ThenByDescending(log => log.Id)
            .ToListAsync(ct);

        var logsByRelationship = logs
            .GroupBy(log => log.CaringSupportRelationshipId!.Value)
            .ToDictionary(
                group => group.Key,
                group => group.Take(3).Select(LogRow).Cast<object>().ToArray());

        return relationships
            .Select(relationship => MemberRelationshipRow(relationship, userId, users, logsByRelationship))
            .Cast<object>()
            .ToArray();
    }

    public Task<RelationshipLifecycleResult> PauseRelationshipAsync(
        int tenantId,
        int userId,
        int relationshipId,
        string? resumeAt,
        CancellationToken ct)
    {
        if (!string.IsNullOrWhiteSpace(resumeAt)
            && !DateOnly.TryParseExact(
                resumeAt,
                DateFormat,
                CultureInfo.InvariantCulture,
                DateTimeStyles.None,
                out _))
        {
            return Task.FromResult(RelationshipLifecycleResult.ValidationError("resume_at"));
        }

        return ChangeRelationshipStatusAsync(
            tenantId,
            userId,
            relationshipId,
            allowedStatuses: ["active"],
            targetStatus: "paused",
            endDate: null,
            ct);
    }

    public Task<RelationshipLifecycleResult> EndRelationshipAsync(
        int tenantId,
        int userId,
        int relationshipId,
        CancellationToken ct)
    {
        return ChangeRelationshipStatusAsync(
            tenantId,
            userId,
            relationshipId,
            allowedStatuses: ["active", "paused"],
            targetStatus: "cancelled",
            endDate: DateOnly.FromDateTime(DateTime.UtcNow),
            ct);
    }

    public Task<RelationshipLifecycleResult> ResumeRelationshipAsync(
        int tenantId,
        int userId,
        int relationshipId,
        CancellationToken ct)
    {
        return ChangeRelationshipStatusAsync(
            tenantId,
            userId,
            relationshipId,
            allowedStatuses: ["paused"],
            targetStatus: "active",
            endDate: null,
            ct);
    }

    private async Task<RelationshipLifecycleResult> ChangeRelationshipStatusAsync(
        int tenantId,
        int userId,
        int relationshipId,
        string[] allowedStatuses,
        string targetStatus,
        DateOnly? endDate,
        CancellationToken ct)
    {
        var relationship = await _db.CaringSupportRelationships
            .IgnoreQueryFilters()
            .Where(row =>
                row.TenantId == tenantId
                && row.Id == relationshipId
                && (row.SupporterId == userId || row.RecipientId == userId))
            .FirstOrDefaultAsync(ct);

        if (relationship is null)
        {
            return RelationshipLifecycleResult.NotFound();
        }

        if (!allowedStatuses.Contains(relationship.Status))
        {
            return RelationshipLifecycleResult.InvalidState();
        }

        relationship.Status = targetStatus;
        relationship.EndDate = endDate ?? relationship.EndDate;
        relationship.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);

        return RelationshipLifecycleResult.Success(targetStatus);
    }

    private static string NormalizeStatus(string? status)
    {
        if (status == "all")
        {
            return "all";
        }

        return !string.IsNullOrWhiteSpace(status) && Statuses.Contains(status)
            ? status
            : "active";
    }

    private static object Stats(IReadOnlyList<CaringSupportRelationship> relationships)
    {
        var now = DateTime.UtcNow;
        return new
        {
            active_count = relationships.Count(relationship => relationship.Status == "active"),
            paused_count = relationships.Count(relationship => relationship.Status == "paused"),
            check_ins_due = relationships.Count(relationship =>
                relationship.Status == "active"
                && relationship.NextCheckInAt is not null
                && relationship.NextCheckInAt.Value < now),
            expected_active_hours = Math.Round(
                relationships
                    .Where(relationship => relationship.Status == "active")
                    .Sum(relationship => relationship.ExpectedHours),
                2,
                MidpointRounding.AwayFromZero)
        };
    }

    private static object RelationshipRow(
        CaringSupportRelationship row,
        IReadOnlyDictionary<int, User> users,
        IReadOnlyDictionary<int, string> categories)
    {
        users.TryGetValue(row.SupporterId, out var supporter);
        users.TryGetValue(row.RecipientId, out var recipient);
        var coordinator = row.CoordinatorId is not null && users.TryGetValue(row.CoordinatorId.Value, out var foundCoordinator)
            ? foundCoordinator
            : null;

        return new
        {
            id = row.Id,
            supporter = new
            {
                id = row.SupporterId,
                name = DisplayName(supporter)
            },
            recipient = new
            {
                id = row.RecipientId,
                name = DisplayName(recipient)
            },
            coordinator = row.CoordinatorId is null
                ? null
                : new
                {
                    id = row.CoordinatorId.Value,
                    name = DisplayName(coordinator)
                },
            organization_name = string.Empty,
            category_name = row.CategoryId is not null && categories.TryGetValue(row.CategoryId.Value, out var categoryName)
                ? categoryName
                : string.Empty,
            title = row.Title,
            description = row.Description ?? string.Empty,
            frequency = row.Frequency,
            expected_hours = Math.Round(row.ExpectedHours, 2, MidpointRounding.AwayFromZero),
            start_date = row.StartDate.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
            end_date = row.EndDate?.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
            status = row.Status,
            last_logged_at = DbDateTimeOrNull(row.LastLoggedAt),
            next_check_in_at = DbDateTimeOrNull(row.NextCheckInAt),
            created_at = DbDateTime(row.CreatedAt),
            updated_at = DbDateTimeOrNull(row.UpdatedAt)
        };
    }

    private static object MemberRelationshipRow(
        CaringSupportRelationship row,
        int authUserId,
        IReadOnlyDictionary<int, User> users,
        IReadOnlyDictionary<int, object[]> logsByRelationship)
    {
        users.TryGetValue(row.SupporterId, out var supporter);
        users.TryGetValue(row.RecipientId, out var recipient);

        var role = row.SupporterId == authUserId ? "supporter" : "recipient";
        var partnerId = role == "supporter" ? row.RecipientId : row.SupporterId;
        var partner = role == "supporter" ? recipient : supporter;
        logsByRelationship.TryGetValue(row.Id, out var recentLogs);

        return new
        {
            id = row.Id,
            title = row.Title,
            description = row.Description ?? string.Empty,
            frequency = row.Frequency,
            expected_hours = Math.Round(row.ExpectedHours, 2, MidpointRounding.AwayFromZero),
            status = row.Status,
            start_date = row.StartDate.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
            end_date = row.EndDate?.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
            last_logged_at = DbDateTimeOrNull(row.LastLoggedAt),
            next_check_in_at = DbDateTimeOrNull(row.NextCheckInAt),
            role,
            intergenerational = false,
            partner = new
            {
                id = partnerId,
                name = DisplayName(partner),
                avatar_url = partner?.AvatarUrl
            },
            recent_logs = recentLogs ?? []
        };
    }

    private static object LogRow(VolunteerLog log)
    {
        return new
        {
            date = log.DateLogged.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
            hours = Math.Round(log.Hours, 2, MidpointRounding.AwayFromZero),
            status = log.Status
        };
    }

    private static int StatusRank(string status)
    {
        return status switch
        {
            "active" => 0,
            "paused" => 1,
            "completed" => 2,
            _ => 3
        };
    }

    private static string DisplayName(User? user)
    {
        if (user is null)
        {
            return string.Empty;
        }

        var name = string.Join(' ', new[] { user.FirstName, user.LastName }
            .Where(part => !string.IsNullOrWhiteSpace(part)));
        return string.IsNullOrWhiteSpace(name) ? user.Email : name;
    }

    private static string DbDateTime(DateTime value)
    {
        var utc = value.Kind == DateTimeKind.Utc
            ? value
            : DateTime.SpecifyKind(value, DateTimeKind.Utc).ToUniversalTime();

        return utc.ToString("yyyy-MM-dd HH:mm:ss", CultureInfo.InvariantCulture);
    }

    private static string? DbDateTimeOrNull(DateTime? value)
    {
        return value is null ? null : DbDateTime(value.Value);
    }

    private static bool IsTruthy(string? value)
    {
        return value?.Trim().ToLowerInvariant() is "1" or "true" or "yes" or "on" or "enabled";
    }
}

public sealed record RelationshipLifecycleResult(
    bool Succeeded,
    string? Status,
    string? ErrorCode,
    string? ErrorField)
{
    public static RelationshipLifecycleResult Success(string status)
    {
        return new RelationshipLifecycleResult(true, status, null, null);
    }

    public static RelationshipLifecycleResult NotFound()
    {
        return new RelationshipLifecycleResult(false, null, "NOT_FOUND", null);
    }

    public static RelationshipLifecycleResult InvalidState()
    {
        return new RelationshipLifecycleResult(false, null, "INVALID_STATE", null);
    }

    public static RelationshipLifecycleResult ValidationError(string field)
    {
        return new RelationshipLifecycleResult(false, null, "VALIDATION_ERROR", field);
    }
}
