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
/// Tenant-scoped Caring Community safeguarding read model matching Laravel admin endpoints.
/// </summary>
public sealed class CaringSafeguardingService
{
    private static readonly string[] Statuses =
        ["submitted", "triaged", "investigating", "resolved", "dismissed"];

    private static readonly string[] OpenStatuses =
        ["submitted", "triaged", "investigating"];

    private static readonly string[] Severities =
        ["low", "medium", "high", "critical"];

    private readonly NexusDbContext _db;

    public CaringSafeguardingService(NexusDbContext db)
    {
        _db = db;
    }

    public async Task<bool> IsCaringCommunityEnabledAsync(int tenantId, CancellationToken ct)
    {
        var value = await _db.TenantConfigs
            .IgnoreQueryFilters()
            .Where(config => config.TenantId == tenantId && config.Key == "features.caring_community")
            .Select(config => config.Value)
            .FirstOrDefaultAsync(ct);

        return IsTruthy(value);
    }

    public async Task<object> DashboardSummaryAsync(int tenantId, CancellationToken ct)
    {
        var reports = await ReportRows(tenantId)
            .ToListAsync(ct);

        var now = DateTime.UtcNow;
        var openReports = reports
            .Where(row => OpenStatuses.Contains(row.Report.Status))
            .ToArray();

        var byStatus = Statuses.ToDictionary(
            status => status,
            status => reports.Count(row => row.Report.Status == status));
        var openBySeverity = Severities.ToDictionary(
            severity => severity,
            severity => openReports.Count(row => row.Report.Severity == severity));

        return new
        {
            total = reports.Count,
            open_total = openReports.Length,
            open_by_severity = openBySeverity,
            by_status = byStatus,
            overdue = openReports.Count(row => IsOverdue(row.Report, now)),
            recent = OrderReports(reports)
                .Take(10)
                .Select(row => ReportRow(row.Report, row.Reporter, row.SubjectUser, row.AssignedTo, now))
                .Cast<object>()
                .ToArray()
        };
    }

    public async Task<IReadOnlyList<object>> ListReportsAsync(
        int tenantId,
        string? status,
        string? severity,
        CancellationToken ct)
    {
        var rows = await ReportRows(tenantId, status, severity)
            .ToListAsync(ct);

        var now = DateTime.UtcNow;
        return OrderReports(rows)
            .Take(500)
            .Select(row => ReportRow(row.Report, row.Reporter, row.SubjectUser, row.AssignedTo, now))
            .Cast<object>()
            .ToArray();
    }

    public async Task<object?> ReportDetailAsync(int tenantId, long id, CancellationToken ct)
    {
        var row = await ReportRows(tenantId, id: id)
            .FirstOrDefaultAsync(ct);
        if (row is null)
        {
            return null;
        }

        var actions = await (
                from action in _db.SafeguardingReportActions.IgnoreQueryFilters().AsNoTracking()
                where action.TenantId == tenantId && action.ReportId == id
                join actor in _db.Users.IgnoreQueryFilters().AsNoTracking().Where(user => user.TenantId == tenantId)
                    on action.ActorUserId equals actor.Id
                    into actors
                from actor in actors.DefaultIfEmpty()
                orderby action.CreatedAt, action.Id
                select new ActionJoinRow(action, actor))
            .ToListAsync(ct);

        var now = DateTime.UtcNow;
        return ReportDetailRow(row.Report, row.Reporter, row.SubjectUser, row.AssignedTo, actions, now);
    }

    public async Task<IReadOnlyList<object>> MyReportsAsync(int tenantId, int userId, CancellationToken ct)
    {
        var reports = await _db.SafeguardingReports
            .IgnoreQueryFilters()
            .AsNoTracking()
            .Where(report => report.TenantId == tenantId && report.ReporterUserId == userId)
            .OrderByDescending(report => report.CreatedAt)
            .ThenByDescending(report => report.Id)
            .Take(100)
            .ToListAsync(ct);

        return reports
            .Select(MyReportRow)
            .Cast<object>()
            .ToArray();
    }

    private IQueryable<ReportJoinRow> ReportRows(
        int tenantId,
        string? status = null,
        string? severity = null,
        long? id = null)
    {
        var reports = _db.SafeguardingReports
            .IgnoreQueryFilters()
            .AsNoTracking()
            .Where(report => report.TenantId == tenantId);

        if (id is not null)
        {
            reports = reports.Where(report => report.Id == id.Value);
        }

        if (!string.IsNullOrWhiteSpace(status) && Statuses.Contains(status))
        {
            reports = reports.Where(report => report.Status == status);
        }

        if (!string.IsNullOrWhiteSpace(severity) && Severities.Contains(severity))
        {
            reports = reports.Where(report => report.Severity == severity);
        }

        return
            from report in reports
            join reporter in _db.Users.IgnoreQueryFilters().AsNoTracking().Where(user => user.TenantId == tenantId)
                on report.ReporterUserId equals reporter.Id
                into reporters
            from reporter in reporters.DefaultIfEmpty()
            join subjectUser in _db.Users.IgnoreQueryFilters().AsNoTracking().Where(user => user.TenantId == tenantId)
                on report.SubjectUserId equals subjectUser.Id
                into subjectUsers
            from subjectUser in subjectUsers.DefaultIfEmpty()
            join assignedTo in _db.Users.IgnoreQueryFilters().AsNoTracking().Where(user => user.TenantId == tenantId)
                on report.AssignedToUserId equals assignedTo.Id
                into assignees
            from assignedTo in assignees.DefaultIfEmpty()
            select new ReportJoinRow(report, reporter, subjectUser, assignedTo);
    }

    private static IEnumerable<ReportJoinRow> OrderReports(IEnumerable<ReportJoinRow> rows)
    {
        return rows
            .OrderBy(row => SeverityRank(row.Report.Severity))
            .ThenByDescending(row => row.Report.CreatedAt)
            .ThenByDescending(row => row.Report.Id);
    }

    private static object ReportRow(
        SafeguardingReport row,
        User? reporter,
        User? subjectUser,
        User? assignedTo,
        DateTime now)
    {
        return new
        {
            id = row.Id,
            reporter_id = row.ReporterUserId,
            reporter_name = DisplayName(reporter),
            subject_user_id = row.SubjectUserId,
            subject_user_name = DisplayName(subjectUser),
            subject_organisation_id = row.SubjectOrganisationId,
            category = row.Category,
            severity = row.Severity,
            description = row.Description,
            evidence_url = row.EvidenceUrl,
            status = row.Status,
            assigned_to_user_id = row.AssignedToUserId,
            assigned_to_name = DisplayName(assignedTo),
            review_due_at = Iso8601OrNull(row.ReviewDueAt),
            is_overdue = IsOverdue(row, now),
            escalated = row.Escalated,
            escalated_at = Iso8601OrNull(row.EscalatedAt),
            resolution_notes = row.ResolutionNotes,
            resolved_at = Iso8601OrNull(row.ResolvedAt),
            created_at = Iso8601(row.CreatedAt),
            updated_at = Iso8601OrNull(row.UpdatedAt)
        };
    }

    private static object ReportDetailRow(
        SafeguardingReport row,
        User? reporter,
        User? subjectUser,
        User? assignedTo,
        IReadOnlyList<ActionJoinRow> actions,
        DateTime now)
    {
        return new
        {
            id = row.Id,
            reporter_id = row.ReporterUserId,
            reporter_name = DisplayName(reporter),
            subject_user_id = row.SubjectUserId,
            subject_user_name = DisplayName(subjectUser),
            subject_organisation_id = row.SubjectOrganisationId,
            category = row.Category,
            severity = row.Severity,
            description = row.Description,
            evidence_url = row.EvidenceUrl,
            status = row.Status,
            assigned_to_user_id = row.AssignedToUserId,
            assigned_to_name = DisplayName(assignedTo),
            review_due_at = Iso8601OrNull(row.ReviewDueAt),
            is_overdue = IsOverdue(row, now),
            escalated = row.Escalated,
            escalated_at = Iso8601OrNull(row.EscalatedAt),
            resolution_notes = row.ResolutionNotes,
            resolved_at = Iso8601OrNull(row.ResolvedAt),
            created_at = Iso8601(row.CreatedAt),
            updated_at = Iso8601OrNull(row.UpdatedAt),
            actions = actions
                .Select(item => new
                {
                    id = item.Action.Id,
                    actor_id = item.Action.ActorUserId,
                    actor_name = DisplayName(item.Actor),
                    action = item.Action.Action,
                    notes = item.Action.Notes,
                    created_at = Iso8601(item.Action.CreatedAt)
                })
                .Cast<object>()
                .ToArray()
        };
    }

    private static object MyReportRow(SafeguardingReport row)
    {
        return new
        {
            id = row.Id,
            category = row.Category,
            severity = row.Severity,
            description_preview = Preview(row.Description),
            status = row.Status,
            review_due_at = DbDateTimeOrNull(row.ReviewDueAt),
            escalated = row.Escalated,
            resolved_at = DbDateTimeOrNull(row.ResolvedAt),
            created_at = DbDateTime(row.CreatedAt)
        };
    }

    private static string Preview(string value)
    {
        return value.Length > 200 ? value[..200] + "\u2026" : value;
    }

    private static bool IsOverdue(SafeguardingReport row, DateTime now)
    {
        return row.ReviewDueAt is not null
            && OpenStatuses.Contains(row.Status)
            && row.ReviewDueAt.Value < now;
    }

    private static int SeverityRank(string severity)
    {
        return severity switch
        {
            "critical" => 0,
            "high" => 1,
            "medium" => 2,
            "low" => 3,
            _ => 4
        };
    }

    private static string? DisplayName(User? user)
    {
        if (user is null)
        {
            return null;
        }

        var name = string.Join(' ', new[] { user.FirstName, user.LastName }
            .Where(part => !string.IsNullOrWhiteSpace(part)));
        return string.IsNullOrWhiteSpace(name) ? user.Email : name;
    }

    private static string Iso8601(DateTime value)
    {
        var utc = value.Kind == DateTimeKind.Utc
            ? value
            : DateTime.SpecifyKind(value, DateTimeKind.Utc).ToUniversalTime();

        return utc.ToString("yyyy-MM-dd'T'HH:mm:ss+00:00", CultureInfo.InvariantCulture);
    }

    private static string? Iso8601OrNull(DateTime? value)
    {
        return value is null ? null : Iso8601(value.Value);
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

    private sealed record ReportJoinRow(
        SafeguardingReport Report,
        User? Reporter,
        User? SubjectUser,
        User? AssignedTo);

    private sealed record ActionJoinRow(
        SafeguardingReportAction Action,
        User? Actor);
}
