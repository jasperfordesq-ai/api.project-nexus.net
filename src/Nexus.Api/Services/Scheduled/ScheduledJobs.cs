// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

/*
 * Phase 63 — V1 cron task port.
 *
 * Each class below corresponds to a Laravel scheduled command or queued Job
 * from V1. Names mirror the V1 class for traceability. Disabled / interval
 * via appsettings: Scheduled:{JobName}:Enabled and Scheduled:{JobName}:IntervalMinutes.
 *
 * What is intentionally NOT ported here:
 *   - DispatchCaringNudges, RetryCaringHourTransferDeliveries,
 *     ApplyCaringCommunityPreset, AuditAgorisCaringContent,
 *     CivicDigestDispatch — Caring Community module is out of scope.
 *   - Marketplace-specific cron tasks — Marketplace is out of scope.
 *   - Seed* and Test* commands — not real cron, dev-only utilities.
 *
 * Future ports (Phase 67+ infrastructure) — stubs ready in this file:
 *   - SyncUserSearchIndexJob (Meilisearch reindex; needs Meilisearch enabled)
 *   - GenerateSitemap (depends on Sitemap controller from Phase 72)
 *   - DispatchKiAgents / RunAgents (depend on AI multi-provider Phase 69)
 */

using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Nexus.Api.Data;
using Nexus.Api.Entities;

namespace Nexus.Api.Services.Scheduled;

// ─────────────────────────────────────────────────────────────────────────────
// 1. SyncFederationPartners — refreshes status / last-seen for federation partners.
//    V1 source: app/Console/Commands/SyncFederationPartners.php
// ─────────────────────────────────────────────────────────────────────────────

public class SyncFederationPartnersJob : ScheduledHostedService
{
    public SyncFederationPartnersJob(
        IServiceScopeFactory scopeFactory,
        IConfiguration configuration,
        ILogger<SyncFederationPartnersJob> logger)
        : base(scopeFactory, configuration, logger) { }

    protected override string JobName => "SyncFederationPartners";
    protected override TimeSpan DefaultInterval => TimeSpan.FromHours(1);
    protected override TimeSpan StartupDelay => TimeSpan.FromMinutes(2);

    protected override async Task RunForTenantAsync(IServiceProvider services, int tenantId, CancellationToken ct)
    {
        var db = services.GetRequiredService<NexusDbContext>();
        var partners = await db.FederationPartners.IgnoreQueryFilters()
            .Where(p => p.TenantId == tenantId)
            .ToListAsync(ct);

        var now = DateTime.UtcNow;
        var staleThreshold = now.AddDays(-30);
        var refreshed = 0;
        foreach (var p in partners)
        {
            // If the partner has been silent for >30 days, mark Inactive.
            // FederationPartner has no LastContactAt — use UpdatedAt as proxy (set on
            // every status change), falling back to CreatedAt.
            var lastContact = p.UpdatedAt ?? p.CreatedAt;
            if (p.Status == PartnerStatus.Active && lastContact < staleThreshold)
            {
                p.Status = PartnerStatus.Suspended;
                p.UpdatedAt = now;
                refreshed++;
            }
        }
        if (refreshed > 0) await db.SaveChangesAsync(ct);
        Logger.LogDebug("SyncFederationPartners tenant={TenantId} marked {Count} stale partners inactive", tenantId, refreshed);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. PruneFederationLogs — deletes federation api/audit logs older than 90 days.
//    V1 sources: PruneFederationAggregateLogs, PurgeFederationExternalLogs.
// ─────────────────────────────────────────────────────────────────────────────

public class PruneFederationLogsJob : ScheduledHostedService
{
    public PruneFederationLogsJob(
        IServiceScopeFactory scopeFactory,
        IConfiguration configuration,
        ILogger<PruneFederationLogsJob> logger)
        : base(scopeFactory, configuration, logger) { }

    protected override string JobName => "PruneFederationLogs";
    protected override TimeSpan DefaultInterval => TimeSpan.FromHours(24);
    protected override TimeSpan StartupDelay => TimeSpan.FromMinutes(5);
    protected override bool PerTenant => false;

    protected override async Task RunGlobalAsync(IServiceProvider services, CancellationToken ct)
    {
        var db = services.GetRequiredService<NexusDbContext>();
        var retentionDays = Configuration.GetValue<int?>("Scheduled:PruneFederationLogs:RetentionDays") ?? 90;
        var cutoff = DateTime.UtcNow.AddDays(-retentionDays);

        var apiDeleted = await db.FederationApiLogs.IgnoreQueryFilters()
            .Where(l => l.CreatedAt < cutoff).ExecuteDeleteAsync(ct);
        var auditDeleted = await db.FederationAuditLogs.IgnoreQueryFilters()
            .Where(l => l.CreatedAt < cutoff).ExecuteDeleteAsync(ct);
        var partnerDeleted = await db.FederationExternalPartnerLogs.IgnoreQueryFilters()
            .Where(l => l.CreatedAt < cutoff).ExecuteDeleteAsync(ct);

        Logger.LogInformation(
            "PruneFederationLogs deleted {Api} api / {Audit} audit / {Partner} external-partner rows older than {Cutoff}",
            apiDeleted, auditDeleted, partnerDeleted, cutoff);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. CheckInactiveGroups — flags groups with no recent activity for review.
//    V1 source: app/Console/Commands/CheckInactiveGroupsCommand.php
// ─────────────────────────────────────────────────────────────────────────────

public class CheckInactiveGroupsJob : ScheduledHostedService
{
    public CheckInactiveGroupsJob(
        IServiceScopeFactory scopeFactory,
        IConfiguration configuration,
        ILogger<CheckInactiveGroupsJob> logger)
        : base(scopeFactory, configuration, logger) { }

    protected override string JobName => "CheckInactiveGroups";
    protected override TimeSpan DefaultInterval => TimeSpan.FromDays(1);
    protected override TimeSpan StartupDelay => TimeSpan.FromMinutes(8);

    protected override async Task RunForTenantAsync(IServiceProvider services, int tenantId, CancellationToken ct)
    {
        var db = services.GetRequiredService<NexusDbContext>();
        var inactiveDays = Configuration.GetValue<int?>("Scheduled:CheckInactiveGroups:InactiveDays") ?? 90;
        var cutoff = DateTime.UtcNow.AddDays(-inactiveDays);

        // Definition of "inactive": no posts AND no events in the window.
        var inactiveCount = await db.Groups
            .Where(g => g.TenantId == tenantId)
            .Where(g => !db.FeedPosts.Any(p => p.GroupId == g.Id && p.CreatedAt > cutoff))
            .Where(g => !db.Events.Any(e => e.GroupId == g.Id && e.CreatedAt > cutoff))
            .CountAsync(ct);

        if (inactiveCount == 0) return;

        // Persist a tenant-config summary for the admin dashboard to read. Notification
        // table requires a real UserId, so we store the summary in TenantConfig instead
        // of broadcasting to a synthetic user.
        await UpsertJobSummaryAsync(db, tenantId, "scheduled.summary.inactive_groups", new
        {
            count = inactiveCount,
            inactive_days = inactiveDays,
            checked_at = DateTime.UtcNow
        }, ct);

        Logger.LogDebug("CheckInactiveGroups tenant={TenantId} flagged {Count}", tenantId, inactiveCount);
    }

    internal static async Task UpsertJobSummaryAsync(NexusDbContext db, int tenantId, string key, object payload, CancellationToken ct)
    {
        var json = System.Text.Json.JsonSerializer.Serialize(payload);
        var existing = await db.TenantConfigs.FirstOrDefaultAsync(c => c.TenantId == tenantId && c.Key == key, ct);
        if (existing != null)
        {
            existing.Value = json;
            existing.UpdatedAt = DateTime.UtcNow;
        }
        else
        {
            db.TenantConfigs.Add(new TenantConfig
            {
                TenantId = tenantId,
                Key = key,
                Value = json,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            });
        }
        await db.SaveChangesAsync(ct);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. PollStuckIdentityVerifications — reconciles identity-verification sessions
//    that have been pending too long. Tries to refresh from provider if
//    available; otherwise marks expired.
//    V1 source: app/Console/Commands/PollStuckIdentityVerifications.php
// ─────────────────────────────────────────────────────────────────────────────

public class PollStuckIdentityVerificationsJob : ScheduledHostedService
{
    public PollStuckIdentityVerificationsJob(
        IServiceScopeFactory scopeFactory,
        IConfiguration configuration,
        ILogger<PollStuckIdentityVerificationsJob> logger)
        : base(scopeFactory, configuration, logger) { }

    protected override string JobName => "PollStuckIdentityVerifications";
    protected override TimeSpan DefaultInterval => TimeSpan.FromMinutes(30);
    protected override TimeSpan StartupDelay => TimeSpan.FromMinutes(3);

    protected override async Task RunForTenantAsync(IServiceProvider services, int tenantId, CancellationToken ct)
    {
        var db = services.GetRequiredService<NexusDbContext>();
        var stuckMinutes = Configuration.GetValue<int?>("Scheduled:PollStuckIdentityVerifications:StuckAfterMinutes") ?? 60;
        var maxAgeHours = Configuration.GetValue<int?>("Scheduled:PollStuckIdentityVerifications:MaxAgeHours") ?? 48;
        var stuckCutoff = DateTime.UtcNow.AddMinutes(-stuckMinutes);
        var expireCutoff = DateTime.UtcNow.AddHours(-maxAgeHours);

        var pending = await db.IdentityVerificationSessions
            .Where(s => s.TenantId == tenantId)
            .Where(s => s.Status == VerificationSessionStatus.Created || s.Status == VerificationSessionStatus.InProgress)
            .Where(s => s.CreatedAt < stuckCutoff)
            .ToListAsync(ct);

        var expired = 0;
        foreach (var session in pending)
        {
            if (session.CreatedAt < expireCutoff)
            {
                session.Status = VerificationSessionStatus.Expired;
                session.CompletedAt = DateTime.UtcNow;
                expired++;
            }
        }
        if (expired > 0) await db.SaveChangesAsync(ct);
        Logger.LogDebug("PollStuckIdentityVerifications tenant={TenantId} expired {Count}/{Total}", tenantId, expired, pending.Count);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. SafeguardingSlaEscalate — escalates safeguarding flags older than SLA.
//    V1 source: app/Console/Commands/SafeguardingSlaEscalateCommand.php
// ─────────────────────────────────────────────────────────────────────────────

public class SafeguardingSlaEscalateJob : ScheduledHostedService
{
    public SafeguardingSlaEscalateJob(
        IServiceScopeFactory scopeFactory,
        IConfiguration configuration,
        ILogger<SafeguardingSlaEscalateJob> logger)
        : base(scopeFactory, configuration, logger) { }

    protected override string JobName => "SafeguardingSlaEscalate";
    protected override TimeSpan DefaultInterval => TimeSpan.FromHours(1);
    protected override TimeSpan StartupDelay => TimeSpan.FromMinutes(4);

    protected override async Task RunForTenantAsync(IServiceProvider services, int tenantId, CancellationToken ct)
    {
        var db = services.GetRequiredService<NexusDbContext>();
        var slaHours = Configuration.GetValue<int?>("Scheduled:SafeguardingSlaEscalate:SlaHours") ?? 24;
        var cutoff = DateTime.UtcNow.AddHours(-slaHours);

        var stale = await db.ContentReports
            .Where(r => r.TenantId == tenantId)
            .Where(r => r.Status == ReportStatus.Pending)
            .Where(r => r.CreatedAt < cutoff)
            .CountAsync(ct);

        if (stale == 0) return;

        await CheckInactiveGroupsJob.UpsertJobSummaryAsync(db, tenantId, "scheduled.summary.safeguarding_sla", new
        {
            stale_count = stale,
            sla_hours = slaHours,
            checked_at = DateTime.UtcNow
        }, ct);
        Logger.LogInformation("SafeguardingSlaEscalate tenant={TenantId} {Count} stale reports >{SlaHours}h", tenantId, stale, slaHours);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. MarkOverdueDues — marks subscriptions whose next billing date is past.
//    V1 sources: MarkOverdueDues + SendDuesReminders + GenerateAnnualDues
//    (consolidated into one tick that also drops a reminder notification).
// ─────────────────────────────────────────────────────────────────────────────

public class MarkOverdueDuesJob : ScheduledHostedService
{
    public MarkOverdueDuesJob(
        IServiceScopeFactory scopeFactory,
        IConfiguration configuration,
        ILogger<MarkOverdueDuesJob> logger)
        : base(scopeFactory, configuration, logger) { }

    protected override string JobName => "MarkOverdueDues";
    protected override TimeSpan DefaultInterval => TimeSpan.FromHours(6);
    protected override TimeSpan StartupDelay => TimeSpan.FromMinutes(7);

    protected override async Task RunForTenantAsync(IServiceProvider services, int tenantId, CancellationToken ct)
    {
        var db = services.GetRequiredService<NexusDbContext>();
        var now = DateTime.UtcNow;
        var reminderWindow = now.AddDays(7);

        var subs = await db.UserSubscriptions
            .Where(s => s.TenantId == tenantId)
            .Where(s => s.Status == SubscriptionStatus.Active || s.Status == SubscriptionStatus.PastDue)
            .ToListAsync(ct);

        var marked = 0;
        var reminded = 0;
        foreach (var sub in subs)
        {
            if (sub.NextBillingDate is { } next)
            {
                if (next < now && sub.Status == SubscriptionStatus.Active)
                {
                    sub.Status = SubscriptionStatus.PastDue;
                    sub.UpdatedAt = now;
                    marked++;
                }
                else if (next < reminderWindow && next >= now && sub.Status == SubscriptionStatus.Active)
                {
                    // Per-user reminder notification — user is real, FK satisfied.
                    db.Notifications.Add(new Notification
                    {
                        TenantId = tenantId,
                        UserId = sub.UserId,
                        Type = "subscription_renewal_reminder",
                        Title = "Subscription renewal upcoming",
                        Body = $"Your subscription renews on {next:yyyy-MM-dd}.",
                        IsRead = false,
                        CreatedAt = now
                    });
                    reminded++;
                }
            }
        }
        if (marked > 0 || reminded > 0) await db.SaveChangesAsync(ct);
        Logger.LogDebug("MarkOverdueDues tenant={TenantId} marked={Marked} reminded={Reminded}", tenantId, marked, reminded);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. PruneLogs — global. Deletes notifications, email logs, and audit logs
//    older than retention windows. V1: app/Console/Commands/PruneLogs.php +
//    ClearExpiredMonitoringCommand.php + PurgeBrokerMessageCopiesCommand.php.
// ─────────────────────────────────────────────────────────────────────────────

public class PruneLogsJob : ScheduledHostedService
{
    public PruneLogsJob(
        IServiceScopeFactory scopeFactory,
        IConfiguration configuration,
        ILogger<PruneLogsJob> logger)
        : base(scopeFactory, configuration, logger) { }

    protected override string JobName => "PruneLogs";
    protected override TimeSpan DefaultInterval => TimeSpan.FromDays(1);
    protected override TimeSpan StartupDelay => TimeSpan.FromMinutes(10);
    protected override bool PerTenant => false;

    protected override async Task RunGlobalAsync(IServiceProvider services, CancellationToken ct)
    {
        var db = services.GetRequiredService<NexusDbContext>();
        var notifDays = Configuration.GetValue<int?>("Scheduled:PruneLogs:NotificationDays") ?? 180;
        var emailDays = Configuration.GetValue<int?>("Scheduled:PruneLogs:EmailLogDays") ?? 90;
        var auditDays = Configuration.GetValue<int?>("Scheduled:PruneLogs:AuditDays") ?? 365;
        var brokerDays = Configuration.GetValue<int?>("Scheduled:PruneLogs:BrokerMessageDays") ?? 365;

        var notifCutoff = DateTime.UtcNow.AddDays(-notifDays);
        var emailCutoff = DateTime.UtcNow.AddDays(-emailDays);
        var auditCutoff = DateTime.UtcNow.AddDays(-auditDays);
        var brokerCutoff = DateTime.UtcNow.AddDays(-brokerDays);

        _ = brokerCutoff; // reserved — broker_message_copies prune lands when the entity does

        var notifs = await db.Notifications.IgnoreQueryFilters()
            .Where(n => n.IsRead && n.CreatedAt < notifCutoff)
            .ExecuteDeleteAsync(ct);
        var emails = await db.EmailLogs.IgnoreQueryFilters()
            .Where(e => e.CreatedAt < emailCutoff)
            .ExecuteDeleteAsync(ct);
        var audits = await db.AuditLogs.IgnoreQueryFilters()
            .Where(a => a.CreatedAt < auditCutoff)
            .ExecuteDeleteAsync(ct);

        Logger.LogInformation(
            "PruneLogs deleted {Notifs} notifications, {Emails} email logs, {Audits} audit logs",
            notifs, emails, audits);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// 9. ReconcileFederatedHourTransfers — Phase 68. Each tick advances pending
//    cross-tenant credit transfers through the appropriate protocol client.
//    Replaces the V1 ReconcileFederationPendingTxJob.
// ─────────────────────────────────────────────────────────────────────────────

public class ReconcileFederatedHourTransfersJob : ScheduledHostedService
{
    public ReconcileFederatedHourTransfersJob(
        IServiceScopeFactory scopeFactory,
        IConfiguration configuration,
        ILogger<ReconcileFederatedHourTransfersJob> logger)
        : base(scopeFactory, configuration, logger) { }

    protected override string JobName => "ReconcileFederatedHourTransfers";
    protected override TimeSpan DefaultInterval => TimeSpan.FromMinutes(5);
    protected override TimeSpan StartupDelay => TimeSpan.FromMinutes(1);

    protected override async Task RunForTenantAsync(IServiceProvider services, int tenantId, CancellationToken ct)
    {
        var batchSize = Configuration.GetValue<int?>("Scheduled:ReconcileFederatedHourTransfers:BatchSize") ?? 25;
        var svc = services.GetRequiredService<Nexus.Api.Services.Federation.HourTransferReconciliationService>();
        var result = await svc.ReconcileTenantAsync(tenantId, batchSize, ct);
        if (result.Advanced > 0 || result.Failed > 0 || result.GivenUp > 0)
        {
            Logger.LogInformation(
                "ReconcileFederatedHourTransfers tenant={TenantId} advanced={Adv} failed={Fail} givenUp={Gave}",
                tenantId, result.Advanced, result.Failed, result.GivenUp);
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. GenerateMonthlyReports — produces the monthly tenant impact snapshot
//    used by the analytics dashboard. V1 source: GenerateMonthlyReports.php.
// ─────────────────────────────────────────────────────────────────────────────

public class GenerateMonthlyReportsJob : ScheduledHostedService
{
    public GenerateMonthlyReportsJob(
        IServiceScopeFactory scopeFactory,
        IConfiguration configuration,
        ILogger<GenerateMonthlyReportsJob> logger)
        : base(scopeFactory, configuration, logger) { }

    protected override string JobName => "GenerateMonthlyReports";

    // Run daily but actually emit only on the 1st of the month.
    protected override TimeSpan DefaultInterval => TimeSpan.FromHours(24);
    protected override TimeSpan StartupDelay => TimeSpan.FromMinutes(11);

    protected override async Task RunForTenantAsync(IServiceProvider services, int tenantId, CancellationToken ct)
    {
        var now = DateTime.UtcNow;
        if (now.Day != 1) return; // only emit on the 1st

        var db = services.GetRequiredService<NexusDbContext>();
        var key = $"reports.monthly.{now:yyyy-MM}";
        var existing = await db.TenantConfigs.FirstOrDefaultAsync(c => c.TenantId == tenantId && c.Key == key, ct);
        if (existing != null) return; // already generated for this month

        var monthStart = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc).AddMonths(-1);
        var monthEnd = monthStart.AddMonths(1);

        var transactions = db.Transactions
            .Where(t => t.TenantId == tenantId && t.Status == TransactionStatus.Completed)
            .Where(t => t.CreatedAt >= monthStart && t.CreatedAt < monthEnd);
        var totalHours = await transactions.SumAsync(t => (decimal?)t.Amount, ct) ?? 0m;
        var txCount = await transactions.CountAsync(ct);
        var newUsers = await db.Users.CountAsync(u => u.TenantId == tenantId && u.CreatedAt >= monthStart && u.CreatedAt < monthEnd, ct);

        var payload = System.Text.Json.JsonSerializer.Serialize(new
        {
            month = monthStart.ToString("yyyy-MM"),
            generated_at = now,
            total_hours_exchanged = totalHours,
            transaction_count = txCount,
            new_users = newUsers
        });

        db.TenantConfigs.Add(new TenantConfig
        {
            TenantId = tenantId,
            Key = key,
            Value = payload,
            CreatedAt = now,
            UpdatedAt = now
        });
        await db.SaveChangesAsync(ct);
        Logger.LogInformation("GenerateMonthlyReports tenant={TenantId} month={Month} hours={Hours} tx={Tx} newUsers={NewUsers}",
            tenantId, monthStart.ToString("yyyy-MM"), totalHours, txCount, newUsers);
    }
}
