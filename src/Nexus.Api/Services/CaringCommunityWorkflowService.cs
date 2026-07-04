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
/// Laravel-compatible Caring Community workflow summary read model.
/// </summary>
public sealed class CaringCommunityWorkflowService
{
    private const string PolicyPrefix = "caring_community.workflow.";
    private const string FeatureKey = "features.caring_community";
    private const string PendingStatus = "pending";
    private const string ApprovedStatus = "approved";
    private const string DeclinedStatus = "declined";

    private static readonly HashSet<string> CoordinatorRoles = new(StringComparer.OrdinalIgnoreCase)
    {
        "admin",
        "tenant_admin",
        "broker",
        "super_admin"
    };

    private static readonly HashSet<string> ReportPeriods = new(StringComparer.Ordinal)
    {
        "last_30_days",
        "last_90_days",
        "year_to_date",
        "previous_quarter"
    };

    private readonly NexusDbContext _db;
    private readonly CaringCommunityRolePresetService _rolePresets;

    public CaringCommunityWorkflowService(
        NexusDbContext db,
        CaringCommunityRolePresetService rolePresets)
    {
        _db = db;
        _rolePresets = rolePresets;
    }

    public async Task<bool> IsFeatureEnabledAsync(int tenantId, CancellationToken ct)
    {
        var value = await _db.TenantConfigs
            .IgnoreQueryFilters()
            .AsNoTracking()
            .Where(config => config.TenantId == tenantId && config.Key == FeatureKey)
            .Select(config => config.Value)
            .FirstOrDefaultAsync(ct);

        return IsTruthy(value);
    }

    public async Task<object> SummaryAsync(int tenantId, CancellationToken ct)
    {
        var policy = await LoadPolicyAsync(tenantId, ct);
        return new
        {
            stats = await StatsAsync(tenantId, policy, ct),
            pending_reviews = await PendingReviewsAsync(tenantId, policy, ct),
            recent_decisions = await RecentDecisionsAsync(tenantId, ct),
            coordinator_signals = await CoordinatorSignalsAsync(tenantId, ct),
            coordinators = await CoordinatorsAsync(tenantId, ct),
            role_pack = await _rolePresets.StatusAsync(tenantId, ct),
            policy = PolicyPayload(policy)
        };
    }

    private async Task<WorkflowPolicy> LoadPolicyAsync(int tenantId, CancellationToken ct)
    {
        var settings = await _db.TenantConfigs
            .IgnoreQueryFilters()
            .AsNoTracking()
            .Where(config => config.TenantId == tenantId && config.Key.StartsWith(PolicyPrefix))
            .ToDictionaryAsync(
                config => config.Key[PolicyPrefix.Length..],
                config => config.Value,
                StringComparer.Ordinal,
                ct);

        var reviewSla = Clamp(ParseInt(settings, "review_sla_days", 7), 1, 30);
        var escalationSla = Clamp(ParseInt(settings, "escalation_sla_days", 14), reviewSla, 60);
        var reportPeriod = ParseString(settings, "municipal_report_default_period", "last_90_days");
        if (!ReportPeriods.Contains(reportPeriod))
        {
            reportPeriod = "last_90_days";
        }

        return new WorkflowPolicy(
            ApprovalRequired: ParseBool(settings, "approval_required", true),
            AutoApproveTrustedReviewers: ParseBool(settings, "auto_approve_trusted_reviewers", false),
            ReviewSlaDays: reviewSla,
            EscalationSlaDays: escalationSla,
            AllowMemberSelfLog: ParseBool(settings, "allow_member_self_log", true),
            RequireOrganisationForPartnerHours: ParseBool(settings, "require_organisation_for_partner_hours", true),
            MonthlyStatementDay: Clamp(ParseInt(settings, "monthly_statement_day", 1), 1, 28),
            MunicipalReportDefaultPeriod: reportPeriod,
            IncludeSocialValueEstimate: ParseBool(settings, "include_social_value_estimate", true),
            DefaultHourValueChf: Clamp(ParseInt(settings, "default_hour_value_chf", 35), 0, 500));
    }

    private async Task<object> StatsAsync(int tenantId, WorkflowPolicy policy, CancellationToken ct)
    {
        var now = DateTime.UtcNow;
        var reviewCutoff = now.AddDays(-policy.ReviewSlaDays);
        var escalationCutoff = now.AddDays(-policy.EscalationSlaDays);
        var last30Days = now.AddDays(-30);

        var logs = await _db.VolunteerLogs
            .IgnoreQueryFilters()
            .AsNoTracking()
            .Where(log => log.TenantId == tenantId)
            .ToListAsync(ct);

        var pendingLogs = logs
            .Where(log => IsStatus(log.Status, PendingStatus))
            .ToArray();

        var approved30dLogs = logs
            .Where(log => IsStatus(log.Status, ApprovedStatus) && log.CreatedAt >= last30Days)
            .ToArray();

        var declined30dCount = logs
            .Count(log => IsStatus(log.Status, DeclinedStatus) && log.CreatedAt >= last30Days);

        return new
        {
            pending_count = pendingLogs.Length,
            pending_hours = RoundHours(pendingLogs.Sum(log => log.Hours)),
            overdue_count = pendingLogs.Count(log => log.CreatedAt < reviewCutoff),
            escalated_count = pendingLogs.Count(log => log.EscalatedAt is not null || log.CreatedAt < escalationCutoff),
            approved_30d_hours = RoundHours(approved30dLogs.Sum(log => log.Hours)),
            declined_30d_count = declined30dCount,
            coordinator_count = await CoordinatorCountAsync(tenantId, ct),
            intergenerational_tandem_count = 0
        };
    }

    private async Task<object[]> PendingReviewsAsync(int tenantId, WorkflowPolicy policy, CancellationToken ct)
    {
        var now = DateTime.UtcNow;
        var reviewCutoff = now.AddDays(-policy.ReviewSlaDays);
        var escalationCutoff = now.AddDays(-policy.EscalationSlaDays);

        var logs = await _db.VolunteerLogs
            .IgnoreQueryFilters()
            .AsNoTracking()
            .Include(log => log.User)
            .Where(log => log.TenantId == tenantId && log.Status == PendingStatus)
            .OrderBy(log => log.CreatedAt)
            .ThenBy(log => log.Id)
            .Take(12)
            .ToListAsync(ct);

        var assignedIds = logs
            .Select(log => log.AssignedTo)
            .Where(id => id.HasValue)
            .Select(id => id!.Value)
            .Distinct()
            .ToArray();

        var assignedUsers = await _db.Users
            .IgnoreQueryFilters()
            .AsNoTracking()
            .Where(user => user.TenantId == tenantId && assignedIds.Contains(user.Id))
            .ToDictionaryAsync(user => user.Id, user => DisplayName(user), ct);

        var opportunityIds = logs
            .Select(log => log.OpportunityId)
            .Where(id => id.HasValue)
            .Select(id => id!.Value)
            .Distinct()
            .ToArray();

        var opportunityTitles = await _db.VolunteerOpportunities
            .IgnoreQueryFilters()
            .AsNoTracking()
            .Where(opportunity => opportunity.TenantId == tenantId && opportunityIds.Contains(opportunity.Id))
            .ToDictionaryAsync(opportunity => opportunity.Id, opportunity => opportunity.Title, ct);

        return logs.Select(log => new
        {
            id = log.Id,
            member_name = DisplayName(log.User),
            organisation_name = string.Empty,
            opportunity_title = log.OpportunityId is int opportunityId && opportunityTitles.TryGetValue(opportunityId, out var title)
                ? title
                : string.Empty,
            assigned_to = log.AssignedTo,
            assigned_name = log.AssignedTo is int assignedTo && assignedUsers.TryGetValue(assignedTo, out var name)
                ? name
                : null,
            assigned_at = FormatTimestamp(log.AssignedAt),
            escalated_at = FormatTimestamp(log.EscalatedAt),
            escalation_note = log.EscalationNote,
            hours = RoundHours(log.Hours),
            date_logged = log.DateLogged.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
            created_at = FormatTimestamp(log.CreatedAt),
            age_days = Math.Max(0, (int)Math.Floor((now - log.CreatedAt).TotalDays)),
            is_overdue = log.CreatedAt < reviewCutoff,
            is_escalated = log.EscalatedAt is not null || log.CreatedAt < escalationCutoff
        }).Cast<object>().ToArray();
    }

    private async Task<object[]> RecentDecisionsAsync(int tenantId, CancellationToken ct)
    {
        var logs = await _db.VolunteerLogs
            .IgnoreQueryFilters()
            .AsNoTracking()
            .Include(log => log.User)
            .Where(log => log.TenantId == tenantId && (log.Status == ApprovedStatus || log.Status == DeclinedStatus))
            .ToListAsync(ct);

        return logs
            .OrderByDescending(log => log.UpdatedAt ?? log.CreatedAt)
            .ThenByDescending(log => log.Id)
            .Take(8)
            .Select(log => new
            {
                id = log.Id,
                member_name = DisplayName(log.User),
                organisation_name = string.Empty,
                hours = RoundHours(log.Hours),
                status = log.Status,
                decided_at = FormatTimestamp(log.UpdatedAt ?? log.CreatedAt)
            })
            .Cast<object>()
            .ToArray();
    }

    private async Task<object> CoordinatorSignalsAsync(int tenantId, CancellationToken ct)
    {
        var activeListings = await _db.Listings
            .IgnoreQueryFilters()
            .AsNoTracking()
            .Where(listing => listing.TenantId == tenantId && listing.Status == ListingStatus.Active)
            .Select(listing => listing.Type)
            .ToListAsync(ct);

        return new
        {
            active_requests = activeListings.Count(type => type == ListingType.Request),
            active_offers = activeListings.Count(type => type == ListingType.Offer),
            trusted_organisations = 0
        };
    }

    private async Task<int> CoordinatorCountAsync(int tenantId, CancellationToken ct)
    {
        return await _db.Users
            .IgnoreQueryFilters()
            .AsNoTracking()
            .CountAsync(user => user.TenantId == tenantId
                && user.IsActive
                && CoordinatorRoles.Contains(user.Role), ct);
    }

    private async Task<object[]> CoordinatorsAsync(int tenantId, CancellationToken ct)
    {
        var users = await _db.Users
            .IgnoreQueryFilters()
            .AsNoTracking()
            .Where(user => user.TenantId == tenantId
                && user.IsActive
                && CoordinatorRoles.Contains(user.Role))
            .ToListAsync(ct);

        return users
            .OrderBy(DisplayName, StringComparer.OrdinalIgnoreCase)
            .Take(50)
            .Select(user => new
            {
                id = user.Id,
                name = DisplayName(user),
                role = user.Role
            })
            .Cast<object>()
            .ToArray();
    }

    private static object PolicyPayload(WorkflowPolicy policy)
    {
        return new
        {
            approval_required = policy.ApprovalRequired,
            auto_approve_trusted_reviewers = policy.AutoApproveTrustedReviewers,
            review_sla_days = policy.ReviewSlaDays,
            escalation_sla_days = policy.EscalationSlaDays,
            allow_member_self_log = policy.AllowMemberSelfLog,
            require_organisation_for_partner_hours = policy.RequireOrganisationForPartnerHours,
            monthly_statement_day = policy.MonthlyStatementDay,
            municipal_report_default_period = policy.MunicipalReportDefaultPeriod,
            include_social_value_estimate = policy.IncludeSocialValueEstimate,
            default_hour_value_chf = policy.DefaultHourValueChf
        };
    }

    private static int Clamp(int value, int min, int max)
    {
        return Math.Min(max, Math.Max(min, value));
    }

    private static int ParseInt(IReadOnlyDictionary<string, string> settings, string key, int fallback)
    {
        return settings.TryGetValue(key, out var value)
            && int.TryParse(value, NumberStyles.Integer, CultureInfo.InvariantCulture, out var parsed)
            ? parsed
            : fallback;
    }

    private static bool ParseBool(IReadOnlyDictionary<string, string> settings, string key, bool fallback)
    {
        return settings.TryGetValue(key, out var value)
            ? IsTruthy(value) || (!IsFalsy(value) && fallback)
            : fallback;
    }

    private static string ParseString(IReadOnlyDictionary<string, string> settings, string key, string fallback)
    {
        return settings.TryGetValue(key, out var value) && !string.IsNullOrWhiteSpace(value)
            ? value.Trim()
            : fallback;
    }

    private static bool IsStatus(string status, string expected)
    {
        return string.Equals(status, expected, StringComparison.OrdinalIgnoreCase);
    }

    private static bool IsTruthy(string? value)
    {
        return value?.Trim().ToLowerInvariant() is "1" or "true" or "yes" or "on";
    }

    private static bool IsFalsy(string? value)
    {
        return value?.Trim().ToLowerInvariant() is "0" or "false" or "no" or "off";
    }

    private static decimal RoundHours(decimal value)
    {
        return Math.Round(value, 1, MidpointRounding.AwayFromZero);
    }

    private static string DisplayName(User? user)
    {
        if (user is null)
        {
            return string.Empty;
        }

        var name = string.Join(
            " ",
            new[] { user.FirstName, user.LastName }.Where(part => !string.IsNullOrWhiteSpace(part)));

        return string.IsNullOrWhiteSpace(name) ? user.Email : name;
    }

    private static string? FormatTimestamp(DateTime? value)
    {
        return value?.ToString("O", CultureInfo.InvariantCulture);
    }

    private sealed record WorkflowPolicy(
        bool ApprovalRequired,
        bool AutoApproveTrustedReviewers,
        int ReviewSlaDays,
        int EscalationSlaDays,
        bool AllowMemberSelfLog,
        bool RequireOrganisationForPartnerHours,
        int MonthlyStatementDay,
        string MunicipalReportDefaultPeriod,
        bool IncludeSocialValueEstimate,
        int DefaultHourValueChf);
}
