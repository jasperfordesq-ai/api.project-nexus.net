// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Nexus.Api.Data;
using Nexus.Api.Entities;
using Nexus.Api.Services.Federation;
using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace Nexus.Api.Controllers;

[ApiController]
[Authorize(Policy = "AdminOnly")]
public class AdminExplicitParityController : ControllerBase
{
    private readonly NexusDbContext _db;
    private readonly IFederationWebhookSubscriptionService _webhookService;
    private const string BillingInvoicesKey = "admin_explicit.billing.invoices";
    private const string FederationTopicsKey = "admin_explicit.federation.topics";
    private const string FederationTopicSubscriptionsKey = "admin_explicit.federation.topic_subscriptions";
    private const string FederationWebhooksKey = "admin_explicit.federation.webhooks";
    private const string FederationCreditAgreementsKey = "admin_explicit.federation.credit_agreements";
    private const string CompatibilityWritesKey = "admin_explicit.compatibility_writes";
    private const string MemberPremiumConnectAccountKey = "donations.stripe_connect_account_id";
    private const string MemberPremiumDisputesKey = "donations.disputes";
    private const string SupportReportsKey = "admin_explicit.support_reports";
    private const string ModerationSettingPrefix = "moderation.";
    private static readonly string[] ModerationSettingKeys =
    [
        "enabled",
        "require_post",
        "require_listing",
        "require_event",
        "require_comment",
        "auto_filter"
    ];

    private static readonly JsonSerializerOptions StoreJsonOptions = new(JsonSerializerDefaults.Web)
    {
        PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
        PropertyNameCaseInsensitive = true
    };

    public AdminExplicitParityController(NexusDbContext db, IFederationWebhookSubscriptionService webhookService)
    {
        _db = db;
        _webhookService = webhookService;
    }

    [HttpDelete("/api/v2/admin/enterprise/config/secrets/{key}")]
    [HttpDelete("/api/v2/admin/enterprise/gdpr/consent-types/{id}")]
    [HttpDelete("/api/v2/admin/enterprise/monitoring/log-files/{filename}")]
    [HttpDelete("/api/v2/admin/fadp/processing-activities/{id}")]
    [HttpDelete("/api/v2/admin/federation/webhooks/{id}")]
    [HttpDelete("/api/v2/admin/feed/revoke-announcer/{id}")]
    [HttpDelete("/api/v2/admin/group-auto-assign-rules/{id}")]
    [HttpDelete("/api/v2/admin/group-collections/{id}")]
    [HttpDelete("/api/v2/admin/group-tags/{tagid}")]
    [HttpDelete("/api/v2/admin/help/faqs/{id}")]
    [HttpDelete("/api/v2/admin/invite-codes/{id}")]
    [HttpDelete("/api/v2/admin/jobs/templates/{id}")]
    [HttpDelete("/api/v2/admin/listings/{id}")]
    [HttpDelete("/api/v2/admin/member-premium/tiers/{id}")]
    [HttpDelete("/api/v2/admin/reports/municipal-impact/templates/{id}")]
    [HttpDelete("/api/v2/admin/translation/glossary/{id}")]
    [HttpDelete("/api/v2/admin/users/{id}/verification-badges/{type}")]
    [HttpDelete("/api/v2/admin/volunteering/custom-fields/{id}")]
    [HttpDelete("/api/v2/admin/volunteering/webhooks/{id}")]
    public async Task<IActionResult> Delete()
    {
        var path = Request.Path.Value?.ToLowerInvariant() ?? string.Empty;

        return path switch
        {
            _ when TryGetLastInt(path, "/api/v2/admin/federation/webhooks/", out var webhookId) => await DeleteFederationWebhook(webhookId),
            _ when TryGetLastInt(path, "/api/v2/admin/invite-codes/", out var inviteCodeId) => await DeactivateInviteCode(inviteCodeId),
            _ when TryGetLastInt(path, "/api/v2/admin/listings/", out var listingId) => await DeleteListing(listingId),
            _ => await PersistCompatibilityWrite("delete")
        };
    }

    [HttpGet("/api/admin/users/search")]
    [HttpGet("/api/v2/admin/ad-campaigns")]
    [HttpGet("/api/v2/admin/ad-campaigns/{id}")]
    [HttpGet("/api/v2/admin/ad-campaigns/stats")]
    [HttpGet("/api/v2/admin/agents")]
    [HttpGet("/api/v2/admin/agents/proposals")]
    [HttpGet("/api/v2/admin/agents/runs")]
    [HttpGet("/api/v2/admin/api-partners")]
    [HttpGet("/api/v2/admin/api-partners/{id}")]
    [HttpGet("/api/v2/admin/api-partners/{id}/call-log")]
    [HttpGet("/api/v2/admin/billing/invoices")]
    [HttpGet("/api/v2/admin/billing/subscription")]
    [HttpGet("/api/v2/admin/config/groups")]
    [HttpGet("/api/v2/admin/config/identity")]
    [HttpGet("/api/v2/admin/config/jobs")]
    [HttpGet("/api/v2/admin/config/landing-page")]
    [HttpGet("/api/v2/admin/config/listings")]
    [HttpGet("/api/v2/admin/config/native-app/build-manifest")]
    [HttpGet("/api/v2/admin/config/onboarding")]
    [HttpGet("/api/v2/admin/config/onboarding/presets")]
    [HttpGet("/api/v2/admin/config/sitemap-stats")]
    [HttpGet("/api/v2/admin/config/translation")]
    [HttpGet("/api/v2/admin/config/volunteering")]
    [HttpGet("/api/v2/admin/enterprise/config/features")]
    [HttpGet("/api/v2/admin/enterprise/gdpr/audit/export")]
    [HttpGet("/api/v2/admin/enterprise/gdpr/breaches/{id}")]
    [HttpGet("/api/v2/admin/enterprise/gdpr/consent-types")]
    [HttpGet("/api/v2/admin/enterprise/gdpr/consent-types/{slug}/export")]
    [HttpGet("/api/v2/admin/enterprise/gdpr/consent-types/{slug}/users")]
    [HttpGet("/api/v2/admin/enterprise/gdpr/requests/{id}")]
    [HttpGet("/api/v2/admin/enterprise/gdpr/statistics")]
    [HttpGet("/api/v2/admin/enterprise/gdpr/trends")]
    [HttpGet("/api/v2/admin/enterprise/monitoring/health-history")]
    [HttpGet("/api/v2/admin/enterprise/monitoring/log-files")]
    [HttpGet("/api/v2/admin/enterprise/monitoring/log-files/{filename}")]
    [HttpGet("/api/v2/admin/enterprise/monitoring/requirements")]
    [HttpGet("/api/v2/admin/events/{id}")]
    [HttpGet("/api/v2/admin/fadp/consent-ledger")]
    [HttpGet("/api/v2/admin/fadp/disclosure-pack")]
    [HttpGet("/api/v2/admin/fadp/processing-activities")]
    [HttpGet("/api/v2/admin/fadp/processing-register")]
    [HttpGet("/api/v2/admin/fadp/processing-register.csv")]
    [HttpGet("/api/v2/admin/fadp/retention-config")]
    [HttpGet("/api/v2/admin/federation/activity")]
    [HttpGet("/api/v2/admin/federation/aggregate-consent")]
    [HttpGet("/api/v2/admin/federation/aggregate-consent/audit-log")]
    [HttpGet("/api/v2/admin/federation/aggregate-consent/preview")]
    [HttpGet("/api/v2/admin/federation/analytics/overview")]
    [HttpGet("/api/v2/admin/federation/cc-config")]
    [HttpGet("/api/v2/admin/federation/credit-agreements")]
    [HttpGet("/api/v2/admin/federation/credit-agreements/{id}/transactions")]
    [HttpGet("/api/v2/admin/federation/credit-balances")]
    [HttpGet("/api/v2/admin/federation/export/{type}")]
    [HttpGet("/api/v2/admin/federation/partnerships/{id}/audit-log")]
    [HttpGet("/api/v2/admin/federation/partnerships/{id}/stats")]
    [HttpGet("/api/v2/admin/federation/topics")]
    [HttpGet("/api/v2/admin/federation/topics/mine")]
    [HttpGet("/api/v2/admin/federation/webhooks")]
    [HttpGet("/api/v2/admin/federation/webhooks/{id}/logs")]
    [HttpGet("/api/v2/admin/gamification/badge-config")]
    [HttpGet("/api/v2/admin/group-auto-assign-rules")]
    [HttpGet("/api/v2/admin/group-collections")]
    [HttpGet("/api/v2/admin/groups/{id}")]
    [HttpGet("/api/v2/admin/groups/{id}/audit-log")]
    [HttpGet("/api/v2/admin/group-tags")]
    [HttpGet("/api/v2/admin/help/faqs")]
    [HttpGet("/api/v2/admin/invite-codes")]
    [HttpGet("/api/v2/admin/jobs/bias-audit")]
    [HttpGet("/api/v2/admin/jobs/interviews")]
    [HttpGet("/api/v2/admin/jobs/moderation-queue")]
    [HttpGet("/api/v2/admin/jobs/moderation-stats")]
    [HttpGet("/api/v2/admin/jobs/offers")]
    [HttpGet("/api/v2/admin/jobs/spam-stats")]
    [HttpGet("/api/v2/admin/jobs/templates")]
    [HttpGet("/api/v2/admin/ki-agents/config")]
    [HttpGet("/api/v2/admin/ki-agents/proposals")]
    [HttpGet("/api/v2/admin/ki-agents/runs")]
    [HttpGet("/api/v2/admin/ki-agents/runs/{id}")]
    [HttpGet("/api/v2/admin/ki-agents/stats")]
    [HttpGet("/api/v2/admin/listings/{id}")]
    [HttpGet("/api/v2/admin/listings/moderation-queue")]
    [HttpGet("/api/v2/admin/listings/moderation-stats")]
    [HttpGet("/api/v2/admin/listings/stats")]
    [HttpGet("/api/v2/admin/member-premium/finance/annual-receipts")]
    [HttpGet("/api/v2/admin/member-premium/finance/disputes")]
    [HttpGet("/api/v2/admin/member-premium/finance/gift-aid-export")]
    [HttpGet("/api/v2/admin/member-premium/finance/overview")]
    [HttpGet("/api/v2/admin/member-premium/settings")]
    [HttpGet("/api/v2/admin/member-premium/subscribers")]
    [HttpGet("/api/v2/admin/member-premium/tiers")]
    [HttpGet("/api/v2/admin/member-premium/tiers/{id}")]
    [HttpGet("/api/v2/admin/moderation/settings")]
    [HttpGet("/api/v2/admin/national/kiss/comparative")]
    [HttpGet("/api/v2/admin/national/kiss/cooperatives")]
    [HttpGet("/api/v2/admin/national/kiss/summary")]
    [HttpGet("/api/v2/admin/national/kiss/trend")]
    [HttpGet("/api/v2/admin/pilot-inquiries")]
    [HttpGet("/api/v2/admin/pilot-inquiries/{id}")]
    [HttpGet("/api/v2/admin/pilot-inquiries/export")]
    [HttpGet("/api/v2/admin/pilot-inquiries/stats")]
    [HttpGet("/api/v2/admin/push-campaigns")]
    [HttpGet("/api/v2/admin/push-campaigns/{id}")]
    [HttpGet("/api/v2/admin/push-campaigns/stats")]
    [HttpGet("/api/v2/admin/regional-analytics/demand-supply")]
    [HttpGet("/api/v2/admin/regional-analytics/demographics")]
    [HttpGet("/api/v2/admin/regional-analytics/engagement-trends")]
    [HttpGet("/api/v2/admin/regional-analytics/export")]
    [HttpGet("/api/v2/admin/regional-analytics/heatmap")]
    [HttpGet("/api/v2/admin/regional-analytics/help-requests")]
    [HttpGet("/api/v2/admin/regional-analytics/overview")]
    [HttpGet("/api/v2/admin/regional-analytics/volunteer-breakdown")]
    [HttpGet("/api/v2/admin/reports/hours_category/export")]
    [HttpGet("/api/v2/admin/reports/inactive/export")]
    [HttpGet("/api/v2/admin/reports/members/export")]
    [HttpGet("/api/v2/admin/reports/municipal_impact/export")]
    [HttpGet("/api/v2/admin/reports/social_value/export")]
    [HttpGet("/api/v2/admin/reports/{type}/export")]
    [HttpGet("/api/v2/admin/reports/export-types")]
    [HttpGet("/api/v2/admin/reports/municipal-impact")]
    [HttpGet("/api/v2/admin/reports/municipal-impact/templates")]
    [HttpGet("/api/v2/admin/reports/municipal-impact/verification")]
    [HttpGet("/api/v2/admin/residency-verifications")]
    [HttpGet("/api/v2/admin/support-reports")]
    [HttpGet("/api/v2/admin/support-reports/{id}")]
    [HttpGet("/api/v2/admin/support-reports/assignees")]
    [HttpGet("/api/v2/admin/support-reports/stats")]
    [HttpGet("/api/v2/admin/safeguarding/members/{userid}/activity")]
    [HttpGet("/api/v2/admin/safeguarding/members/{userid}/activity.csv")]
    [HttpGet("/api/v2/admin/safeguarding/statement")]
    [HttpGet("/api/v2/admin/safeguarding/statement/download")]
    [HttpGet("/api/v2/admin/search/analytics")]
    [HttpGet("/api/v2/admin/search/trending")]
    [HttpGet("/api/v2/admin/search/zero-results")]
    [HttpGet("/api/v2/admin/super/billing/export")]
    [HttpGet("/api/v2/admin/super/billing/revenue")]
    [HttpGet("/api/v2/admin/super/billing/snapshot")]
    [HttpGet("/api/v2/admin/super/federation/jwt-status")]
    [HttpGet("/api/v2/admin/tools/ip-debug")]
    [HttpGet("/api/v2/admin/translation/glossary")]
    [HttpGet("/api/v2/admin/users/{id}/verification-badges")]
    [HttpGet("/api/v2/admin/users/import/template")]
    [HttpGet("/api/v2/admin/vetting")]
    [HttpGet("/api/v2/admin/vetting/{id}")]
    [HttpGet("/api/v2/admin/volunteering/activity-feed")]
    [HttpGet("/api/v2/admin/volunteering/applications")]
    [HttpGet("/api/v2/admin/volunteering/community-projects")]
    [HttpGet("/api/v2/admin/volunteering/custom-fields")]
    [HttpGet("/api/v2/admin/volunteering/donations/export")]
    [HttpGet("/api/v2/admin/volunteering/expenses")]
    [HttpGet("/api/v2/admin/volunteering/expenses/export")]
    [HttpGet("/api/v2/admin/volunteering/expenses/policies")]
    [HttpGet("/api/v2/admin/volunteering/giving-days")]
    [HttpGet("/api/v2/admin/volunteering/giving-days/{id}/donors")]
    [HttpGet("/api/v2/admin/volunteering/giving-days/{id}/trends")]
    [HttpGet("/api/v2/admin/volunteering/guardian-consents")]
    [HttpGet("/api/v2/admin/volunteering/hours")]
    [HttpGet("/api/v2/admin/volunteering/incidents")]
    [HttpGet("/api/v2/admin/volunteering/organizations")]
    [HttpGet("/api/v2/admin/volunteering/organizations/{id}/members")]
    [HttpGet("/api/v2/admin/volunteering/organizations/{id}/wallet/transactions")]
    [HttpGet("/api/v2/admin/volunteering/reminder-logs")]
    [HttpGet("/api/v2/admin/volunteering/reminder-settings")]
    [HttpGet("/api/v2/admin/volunteering/training")]
    [HttpGet("/api/v2/admin/volunteering/trends")]
    [HttpGet("/api/v2/admin/volunteering/webhooks")]
    [HttpGet("/api/v2/admin/volunteering/webhooks/{id}/logs")]
    public async Task<IActionResult> Get()
    {
        var path = Request.Path.Value?.ToLowerInvariant() ?? string.Empty;

        return path switch
        {
            "/api/admin/users/search" => await SearchUsers(),
            "/api/v2/admin/billing/subscription" => await GetBillingSubscription(),
            "/api/v2/admin/billing/invoices" => await GetBillingInvoices(),
            "/api/v2/admin/config/landing-page" => await GetLandingPageMetadata(),
            "/api/v2/admin/config/sitemap-stats" => await GetSitemapStats(),
            "/api/v2/admin/enterprise/config/features" => await GetEnterpriseFeatures(),
            "/api/v2/admin/enterprise/gdpr/consent-types" => await GetGdprConsentTypes(),
            "/api/v2/admin/enterprise/gdpr/statistics" => await GetGdprStatistics(),
            "/api/v2/admin/enterprise/gdpr/trends" => await GetGdprTrends(),
            "/api/v2/admin/enterprise/monitoring/requirements" => await GetMonitoringRequirements(),
            "/api/v2/admin/fadp/consent-ledger" => await GetConsentLedger(),
            "/api/v2/admin/fadp/processing-register" => await GetProcessingRegister(),
            "/api/v2/admin/fadp/processing-register.csv" => await GetProcessingRegisterCsv(),
            "/api/v2/admin/federation/activity" => await GetFederationActivity(),
            "/api/v2/admin/federation/analytics/overview" => await GetFederationAnalyticsOverview(),
            "/api/v2/admin/federation/credit-agreements" => await GetFederationCreditAgreements(),
            "/api/v2/admin/federation/credit-balances" => await GetFederationCreditBalances(),
            "/api/v2/admin/federation/topics" => await GetFederationTopics(),
            "/api/v2/admin/federation/topics/mine" => await GetFederationTopicSubscriptions(),
            "/api/v2/admin/federation/webhooks" => await GetFederationWebhooks(),
            "/api/v2/admin/help/faqs" => await GetFaqs(),
            "/api/v2/admin/invite-codes" => await GetInviteCodes(),
            "/api/v2/admin/jobs/interviews" => await GetJobInterviews(),
            "/api/v2/admin/jobs/moderation-queue" => await GetJobModerationQueue(),
            "/api/v2/admin/jobs/moderation-stats" => await GetJobModerationStats(),
            "/api/v2/admin/jobs/offers" => await GetJobOffers(),
            "/api/v2/admin/jobs/spam-stats" => await GetJobSpamStats(),
            "/api/v2/admin/jobs/templates" => await GetJobTemplates(),
            "/api/v2/admin/listings/moderation-queue" => await GetListingsModerationQueue(),
            "/api/v2/admin/listings/moderation-stats" => await GetListingsModerationStats(),
            "/api/v2/admin/listings/stats" => await GetListingsStats(),
            "/api/v2/admin/member-premium/finance/annual-receipts" => await GetMemberPremiumAnnualReceiptsCsv(),
            "/api/v2/admin/member-premium/finance/disputes" => await GetMemberPremiumFinanceDisputes(),
            "/api/v2/admin/member-premium/finance/gift-aid-export" => await GetMemberPremiumGiftAidCsv(),
            "/api/v2/admin/member-premium/finance/overview" => await GetMemberPremiumFinanceOverview(),
            "/api/v2/admin/member-premium/settings" => await GetMemberPremiumSettings(),
            "/api/v2/admin/moderation/settings" => await GetModerationSettings(),
            "/api/v2/admin/reports/export-types" => GetReportExportTypes(),
            _ when IsAdminReportExportPath(path) => GetAdminReportExportCsv(path),
            "/api/v2/admin/support-reports" => await GetSupportReports(),
            "/api/v2/admin/support-reports/assignees" => await GetSupportReportAssignees(),
            "/api/v2/admin/support-reports/stats" => await GetSupportReportStats(),
            "/api/v2/admin/super/billing/export" => await GetBillingExportCsv(),
            "/api/v2/admin/super/billing/revenue" => await GetBillingRevenue(),
            "/api/v2/admin/super/billing/snapshot" => await GetBillingSnapshot(),
            "/api/v2/admin/volunteering/organizations" => await GetVolunteeringOrganizations(),
            _ when TryGetLastInt(path, "/api/v2/admin/enterprise/gdpr/breaches/", out var breachId) => await GetGdprBreach(breachId),
            _ when TryGetLastInt(path, "/api/v2/admin/enterprise/gdpr/requests/", out var requestId) => await GetGdprRequest(requestId),
            _ when TryGetSlugBeforeSuffix(path, "/api/v2/admin/enterprise/gdpr/consent-types/", "/users", out var usersSlug) => await GetConsentTypeUsers(usersSlug),
            _ when TryGetSlugBeforeSuffix(path, "/api/v2/admin/enterprise/gdpr/consent-types/", "/export", out var exportSlug) => await GetConsentTypeExport(exportSlug),
            _ when TryGetIntBeforeSuffix(path, "/api/v2/admin/federation/webhooks/", "/logs", out var webhookLogId) => await GetFederationWebhookLogs(webhookLogId),
            _ when TryGetLastInt(path, "/api/v2/admin/events/", out var eventId) => await GetEvent(eventId),
            _ when TryGetLastInt(path, "/api/v2/admin/groups/", out var groupId) => await GetGroup(groupId),
            _ when TryGetLastInt(path, "/api/v2/admin/listings/", out var listingId) => await GetListing(listingId),
            _ when TryGetLastInt(path, "/api/v2/admin/support-reports/", out var supportReportId) => await GetSupportReport(supportReportId),
            _ => await GetPersistedCompatibilityRead(path)
        };
    }

    [HttpGet("/api/v2/admin/email/status")]
    public async Task<IActionResult> GetEmailStatus()
    {
        var today = DateTime.UtcNow.Date;
        var sentToday = await _db.EmailLogs.CountAsync(e => e.Status == EmailSendStatus.Sent && e.SentAt >= today);
        var failedToday = await _db.EmailLogs.CountAsync(e => e.Status == EmailSendStatus.Failed && e.CreatedAt >= today);
        var pendingEmails = await _db.EmailLogs.CountAsync(e => e.Status == EmailSendStatus.Pending);
        var activeSubscribers = await _db.NewsletterSubscriptions.CountAsync(s => s.IsSubscribed);

        var newsletterStatuses = await _db.Newsletters
            .AsNoTracking()
            .GroupBy(n => n.Status)
            .Select(g => new { status = g.Key.ToString().ToLowerInvariant(), count = g.Count() })
            .ToListAsync();

        return Ok(new
        {
            data = new
            {
                provider = "gmail",
                sent_today = sentToday,
                failed_today = failedToday,
                pending = pendingEmails,
                active_subscribers = activeSubscribers,
                newsletters = newsletterStatuses,
                generated_at = DateTime.UtcNow
            }
        });
    }

    [HttpPatch("/api/v2/admin/agents/{id}")]
    [HttpPatch("/api/v2/admin/enterprise/config/features")]
    [HttpPatch("/api/v2/admin/support-reports/{id}")]
    public async Task<IActionResult> Patch()
    {
        var path = Request.Path.Value?.ToLowerInvariant() ?? string.Empty;
        return TryGetLastInt(path, "/api/v2/admin/support-reports/", out var supportReportId)
            ? await UpdateSupportReport(supportReportId)
            : await PersistCompatibilityWrite("patch");
    }

    [HttpPost("/api/v2/admin/ad-campaigns/{id}/approve")]
    [HttpPost("/api/v2/admin/ad-campaigns/{id}/pause")]
    [HttpPost("/api/v2/admin/ad-campaigns/{id}/reject")]
    [HttpPost("/api/v2/admin/agents/{id}/run-now")]
    [HttpPost("/api/v2/admin/agents/{id}/toggle")]
    [HttpPost("/api/v2/admin/agents/proposals/{id}/approve")]
    [HttpPost("/api/v2/admin/agents/proposals/{id}/edit-approve")]
    [HttpPost("/api/v2/admin/agents/proposals/{id}/reject")]
    [HttpPost("/api/v2/admin/api-partners")]
    [HttpPost("/api/v2/admin/api-partners/{id}/activate")]
    [HttpPost("/api/v2/admin/api-partners/{id}/regenerate-credentials")]
    [HttpPost("/api/v2/admin/api-partners/{id}/suspend")]
    [HttpPost("/api/v2/admin/billing/checkout")]
    [HttpPost("/api/v2/admin/billing/portal")]
    [HttpPost("/api/v2/admin/billing/upgrade-request")]
    [HttpPost("/api/v2/admin/blog/bulk-delete")]
    [HttpPost("/api/v2/admin/blog/bulk-publish")]
    [HttpPost("/api/v2/admin/config/onboarding/apply-preset")]
    [HttpPost("/api/v2/admin/config/sitemap-clear-cache")]
    [HttpPost("/api/v2/admin/donations/{id}/refund")]
    [HttpPost("/api/v2/admin/email/test")]
    [HttpPost("/api/v2/admin/email/test-gmail")]
    [HttpPost("/api/v2/admin/enterprise/config/reset")]
    [HttpPost("/api/v2/admin/enterprise/config/secrets/{key}/rotate")]
    [HttpPost("/api/v2/admin/enterprise/config/secrets/test-vault")]
    [HttpPost("/api/v2/admin/enterprise/gdpr/breaches/{id}/notify-dpa")]
    [HttpPost("/api/v2/admin/enterprise/gdpr/consent-types")]
    [HttpPost("/api/v2/admin/enterprise/gdpr/requests")]
    [HttpPost("/api/v2/admin/enterprise/gdpr/requests/{id}/export")]
    [HttpPost("/api/v2/admin/enterprise/gdpr/requests/{id}/notes")]
    [HttpPost("/api/v2/admin/fadp/processing-activities")]
    [HttpPost("/api/v2/admin/federation/aggregate-consent/rotate-secret")]
    [HttpPost("/api/v2/admin/federation/api-keys/{id}/revoke")]
    [HttpPost("/api/v2/admin/federation/credit-agreements")]
    [HttpPost("/api/v2/admin/federation/data/export")]
    [HttpPost("/api/v2/admin/federation/data/import")]
    [HttpPost("/api/v2/admin/federation/data/purge")]
    [HttpPost("/api/v2/admin/federation/neighborhoods")]
    [HttpPost("/api/v2/admin/federation/partnerships/{id}/counter-propose")]
    [HttpPost("/api/v2/admin/federation/partnerships/{id}/reactivate")]
    [HttpPost("/api/v2/admin/federation/webhook-logs/{id}/retry")]
    [HttpPost("/api/v2/admin/federation/webhooks")]
    [HttpPost("/api/v2/admin/federation/webhooks/{id}/test")]
    [HttpPost("/api/v2/admin/feed/grant-announcer")]
    [HttpPost("/api/v2/admin/gamification/badge-config/{badgekey}/reset")]
    [HttpPost("/api/v2/admin/group-auto-assign-rules")]
    [HttpPost("/api/v2/admin/group-collections")]
    [HttpPost("/api/v2/admin/groups/{id}/archive")]
    [HttpPost("/api/v2/admin/groups/{id}/clone")]
    [HttpPost("/api/v2/admin/groups/{id}/merge")]
    [HttpPost("/api/v2/admin/groups/{id}/transfer-ownership")]
    [HttpPost("/api/v2/admin/groups/{id}/unarchive")]
    [HttpPost("/api/v2/admin/groups/bulk-archive")]
    [HttpPost("/api/v2/admin/groups/bulk-unarchive")]
    [HttpPost("/api/v2/admin/group-tags")]
    [HttpPost("/api/v2/admin/help/faqs")]
    [HttpPost("/api/v2/admin/ideation/{id}/status")]
    [HttpPost("/api/v2/admin/identity/sessions/{id}/approve")]
    [HttpPost("/api/v2/admin/identity/sessions/{id}/reject")]
    [HttpPost("/api/v2/admin/invite-codes")]
    [HttpPost("/api/v2/admin/jobs/{id}/approve")]
    [HttpPost("/api/v2/admin/jobs/{id}/flag")]
    [HttpPost("/api/v2/admin/jobs/{id}/reject")]
    [HttpPost("/api/v2/admin/ki-agents/proposals/{id}/approve")]
    [HttpPost("/api/v2/admin/ki-agents/proposals/{id}/reject")]
    [HttpPost("/api/v2/admin/ki-agents/proposals/approve-eligible")]
    [HttpPost("/api/v2/admin/ki-agents/trigger")]
    [HttpPost("/api/v2/admin/listings/{id}/reject")]
    [HttpPost("/api/v2/admin/member-premium/connect/onboarding")]
    [HttpPost("/api/v2/admin/member-premium/tiers")]
    [HttpPost("/api/v2/admin/member-premium/tiers/{id}/sync-stripe")]
    [HttpPost("/api/v2/admin/members/inactive/detect")]
    [HttpPost("/api/v2/admin/pilot-inquiries/{id}/assign")]
    [HttpPost("/api/v2/admin/pilot-inquiries/{id}/notes")]
    [HttpPost("/api/v2/admin/pilot-inquiries/{id}/stage")]
    [HttpPost("/api/v2/admin/plans/{id}/sync-stripe")]
    [HttpPost("/api/v2/admin/push-campaigns/{id}/approve")]
    [HttpPost("/api/v2/admin/push-campaigns/{id}/dispatch")]
    [HttpPost("/api/v2/admin/push-campaigns/{id}/reject")]
    [HttpPost("/api/v2/admin/regional-analytics/invalidate-cache")]
    [HttpPost("/api/v2/admin/reports/municipal-impact/templates")]
    [HttpPost("/api/v2/admin/reports/municipal-impact/verification/{id}/revoke")]
    [HttpPost("/api/v2/admin/reports/municipal-impact/verification/attest")]
    [HttpPost("/api/v2/admin/reports/municipal-impact/verification/dns")]
    [HttpPost("/api/v2/admin/residency-verifications/{id}/attest")]
    [HttpPost("/api/v2/admin/safeguarding/statement")]
    [HttpPost("/api/v2/admin/super/billing/assign-plan")]
    [HttpPost("/api/v2/admin/super/billing/delegate/grant")]
    [HttpPost("/api/v2/admin/super/billing/delegate/revoke")]
    [HttpPost("/api/v2/admin/super/billing/grace-period")]
    [HttpPost("/api/v2/admin/super/billing/pause")]
    [HttpPost("/api/v2/admin/super/billing/resume")]
    [HttpPost("/api/v2/admin/super/federation/partnerships/{id}/reactivate")]
    [HttpPost("/api/v2/admin/translation/glossary")]
    [HttpPost("/api/v2/admin/users/{id}/verification-badges")]
    [HttpPost("/api/v2/admin/users/bulk-approve")]
    [HttpPost("/api/v2/admin/users/bulk-suspend")]
    [HttpPost("/api/v2/admin/volunteering/custom-fields")]
    [HttpPost("/api/v2/admin/volunteering/custom-fields/reorder")]
    [HttpPost("/api/v2/admin/volunteering/giving-days")]
    [HttpPost("/api/v2/admin/volunteering/hours/{id}/verify")]
    [HttpPost("/api/v2/admin/volunteering/organizations")]
    [HttpPost("/api/v2/admin/volunteering/send-shift-reminders")]
    [HttpPost("/api/v2/admin/volunteering/webhooks")]
    [HttpPost("/api/v2/admin/volunteering/webhooks/{id}/test")]
    public async Task<IActionResult> Post()
    {
        var path = Request.Path.Value?.ToLowerInvariant() ?? string.Empty;

        return path switch
        {
            "/api/v2/admin/federation/webhooks" => await CreateFederationWebhook(),
            "/api/v2/admin/federation/credit-agreements" => await CreateFederationCreditAgreement(),
            "/api/v2/admin/invite-codes" => await GenerateInviteCodes(),
            "/api/v2/admin/member-premium/connect/onboarding" => await CreateMemberPremiumConnectOnboarding(),
            _ when TryGetFederationCreditAgreementAction(path, out var creditAgreementId, out var creditAgreementAction) => await UpdateFederationCreditAgreementStatus(creditAgreementId, creditAgreementAction),
            _ when TryGetIntBeforeSuffix(path, "/api/v2/admin/federation/webhooks/", "/test", out var webhookId) => await TestFederationWebhook(webhookId),
            _ when TryGetJobModerationAction(path, out var jobId, out var action) => await ModerateJob(jobId, action),
            _ => await PersistCompatibilityWrite("post")
        };
    }

    [ActionName("approve")]
    [HttpPost("/api/v2/admin/federation/credit-agreements/{id}/{action}")]
    public Task<IActionResult> ApproveFederationCreditAgreement(int id) =>
        UpdateFederationCreditAgreementStatus(id, "approve");

    [ActionName("reject")]
    [HttpPost("/api/v2/admin/federation/credit-agreements/{id}/{action}")]
    public Task<IActionResult> RejectFederationCreditAgreement(int id) =>
        UpdateFederationCreditAgreementStatus(id, "reject");

    [ActionName("suspend")]
    [HttpPost("/api/v2/admin/federation/credit-agreements/{id}/{action}")]
    public Task<IActionResult> SuspendFederationCreditAgreement(int id) =>
        UpdateFederationCreditAgreementStatus(id, "suspend");

    [ActionName("activate")]
    [HttpPost("/api/v2/admin/federation/credit-agreements/{id}/{action}")]
    public Task<IActionResult> ActivateFederationCreditAgreement(int id) =>
        UpdateFederationCreditAgreementStatus(id, "activate");

    [ActionName("reactivate")]
    [HttpPost("/api/v2/admin/federation/credit-agreements/{id}/{action}")]
    public Task<IActionResult> ReactivateFederationCreditAgreement(int id) =>
        UpdateFederationCreditAgreementStatus(id, "reactivate");

    [ActionName("terminate")]
    [HttpPost("/api/v2/admin/federation/credit-agreements/{id}/{action}")]
    public Task<IActionResult> TerminateFederationCreditAgreement(int id) =>
        UpdateFederationCreditAgreementStatus(id, "terminate");

    [HttpPut("/api/v2/admin/api-partners/{id}")]
    [HttpPut("/api/v2/admin/config/groups")]
    [HttpPut("/api/v2/admin/config/groups/bulk")]
    [HttpPut("/api/v2/admin/config/identity/bulk")]
    [HttpPut("/api/v2/admin/config/jobs/bulk")]
    [HttpPut("/api/v2/admin/config/landing-page")]
    [HttpPut("/api/v2/admin/config/listings")]
    [HttpPut("/api/v2/admin/config/listings/bulk")]
    [HttpPut("/api/v2/admin/config/onboarding")]
    [HttpPut("/api/v2/admin/config/translation")]
    [HttpPut("/api/v2/admin/config/translation/bulk")]
    [HttpPut("/api/v2/admin/config/volunteering/bulk")]
    [HttpPut("/api/v2/admin/enterprise/gdpr/breaches/{id}")]
    [HttpPut("/api/v2/admin/enterprise/gdpr/consent-types/{id}")]
    [HttpPut("/api/v2/admin/enterprise/gdpr/requests/{id}/assign")]
    [HttpPut("/api/v2/admin/fadp/retention-config")]
    [HttpPut("/api/v2/admin/federation/aggregate-consent")]
    [HttpPut("/api/v2/admin/federation/cc-config")]
    [HttpPut("/api/v2/admin/federation/partnerships/{id}/permissions")]
    [HttpPut("/api/v2/admin/federation/topics/mine")]
    [HttpPut("/api/v2/admin/federation/webhooks/{id}")]
    [HttpPut("/api/v2/admin/gamification/badge-config/{badgekey}")]
    [HttpPut("/api/v2/admin/group-collections/{id}")]
    [HttpPut("/api/v2/admin/group-collections/{id}/groups")]
    [HttpPut("/api/v2/admin/help/faqs/{id}")]
    [HttpPut("/api/v2/admin/ki-agents/config")]
    [HttpPut("/api/v2/admin/member-premium/settings")]
    [HttpPut("/api/v2/admin/member-premium/tiers/{id}")]
    [HttpPut("/api/v2/admin/moderation/settings")]
    [HttpPut("/api/v2/admin/reports/municipal-impact/templates/{id}")]
    [HttpPut("/api/v2/admin/reports/social-value/config")]
    [HttpPut("/api/v2/admin/support-reports/{id}")]
    [HttpPut("/api/v2/admin/safeguarding/options/reorder")]
    [HttpPut("/api/v2/admin/super/identity/fee")]
    [HttpPut("/api/v2/admin/volunteering/community-projects/{id}/review")]
    [HttpPut("/api/v2/admin/volunteering/custom-fields/{id}")]
    [HttpPut("/api/v2/admin/volunteering/expenses/{id}")]
    [HttpPut("/api/v2/admin/volunteering/expenses/policies")]
    [HttpPut("/api/v2/admin/volunteering/giving-days/{id}")]
    [HttpPut("/api/v2/admin/volunteering/incidents/{id}")]
    [HttpPut("/api/v2/admin/volunteering/organizations/{id}")]
    [HttpPut("/api/v2/admin/volunteering/organizations/{id}/dlp")]
    [HttpPut("/api/v2/admin/volunteering/organizations/{id}/status")]
    [HttpPut("/api/v2/admin/volunteering/organizations/{id}/wallet/adjust")]
    [HttpPut("/api/v2/admin/volunteering/reminder-settings")]
    [HttpPut("/api/v2/admin/volunteering/training/{id}/reject")]
    [HttpPut("/api/v2/admin/volunteering/training/{id}/verify")]
    [HttpPut("/api/v2/admin/volunteering/webhooks/{id}")]
    public async Task<IActionResult> Put()
    {
        var path = Request.Path.Value?.ToLowerInvariant() ?? string.Empty;

        return path switch
        {
            "/api/v2/admin/federation/topics/mine" => await PutFederationTopicSubscriptions(),
            "/api/v2/admin/member-premium/settings" => await PutMemberPremiumSettings(),
            "/api/v2/admin/moderation/settings" => await PutModerationSettings(),
            _ when TryGetLastInt(path, "/api/v2/admin/support-reports/", out var supportReportId) => await UpdateSupportReport(supportReportId),
            _ when TryGetLastInt(path, "/api/v2/admin/federation/webhooks/", out var webhookId) => await UpdateFederationWebhook(webhookId),
            _ => await PersistCompatibilityWrite("put")
        };
    }

    private async Task<IActionResult> SearchUsers()
    {
        var term = (Request.Query["q"].FirstOrDefault() ?? Request.Query["search"].FirstOrDefault() ?? string.Empty).Trim().ToLowerInvariant();
        var query = _db.Users.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(term))
        {
            query = query.Where(u =>
                u.Email.ToLower().Contains(term) ||
                u.FirstName.ToLower().Contains(term) ||
                u.LastName.ToLower().Contains(term));
        }

        var userRows = await query
            .OrderBy(u => u.Email)
            .Take(50)
            .Select(u => new
            {
                u.Id,
                u.Email,
                u.FirstName,
                u.LastName,
                u.Role,
                u.IsActive,
                u.RegistrationStatus
            })
            .ToListAsync();
        var users = userRows.Select(u => new
        {
            u.Id,
            u.Email,
            full_name = (u.FirstName + " " + u.LastName).Trim(),
            u.Role,
            u.IsActive,
            registration_status = u.RegistrationStatus.ToString().ToLowerInvariant()
        }).ToList();

        return Ok(new { data = users, meta = new { total = users.Count } });
    }

    private async Task<IActionResult> GetListingsStats()
    {
        var rawStatusCounts = await _db.Listings
            .AsNoTracking()
            .GroupBy(l => l.Status)
            .Select(g => new { status = g.Key, count = g.Count() })
            .ToListAsync();
        var statusCounts = rawStatusCounts
            .Select(g => new { status = g.status.ToString().ToLowerInvariant(), g.count })
            .ToList();

        var marketplaceModeration = await _db.MarketplaceListings
            .AsNoTracking()
            .GroupBy(l => l.ModerationStatus)
            .Select(g => new { status = g.Key, count = g.Count() })
            .ToListAsync();

        return Ok(new
        {
            data = new
            {
                total = await _db.Listings.CountAsync(),
                active = await _db.Listings.CountAsync(l => l.Status == ListingStatus.Active),
                pending = await _db.Listings.CountAsync(l => l.Status == ListingStatus.Pending),
                rejected = await _db.Listings.CountAsync(l => l.Status == ListingStatus.Rejected),
                featured = await _db.Listings.CountAsync(l => l.IsFeatured),
                marketplace_total = await _db.MarketplaceListings.CountAsync(),
                marketplace_reports_open = await _db.MarketplaceReports.CountAsync(r => r.Status != "resolved"),
                by_status = statusCounts,
                marketplace_moderation = marketplaceModeration,
                generated_at = DateTime.UtcNow
            }
        });
    }

    private async Task<IActionResult> GetListingsModerationStats()
    {
        return Ok(new
        {
            data = new
            {
                pending = await _db.Listings.CountAsync(l => l.Status == ListingStatus.Pending),
                rejected = await _db.Listings.CountAsync(l => l.Status == ListingStatus.Rejected),
                reviewed = await _db.Listings.CountAsync(l => l.ReviewedAt != null),
                marketplace_pending = await _db.MarketplaceListings.CountAsync(l => l.ModerationStatus == "pending"),
                marketplace_rejected = await _db.MarketplaceListings.CountAsync(l => l.ModerationStatus == "rejected"),
                open_marketplace_reports = await _db.MarketplaceReports.CountAsync(r => r.Status != "resolved")
            }
        });
    }

    private async Task<IActionResult> GetListingsModerationQueue()
    {
        var listingRows = await _db.Listings
            .AsNoTracking()
            .Where(l => l.Status == ListingStatus.Pending)
            .OrderByDescending(l => l.CreatedAt)
            .Take(100)
            .Select(l => new { type = "timebank", l.Id, l.Title, l.Status, l.CreatedAt })
            .ToListAsync();
        var listings = listingRows
            .Select(l => new { l.type, l.Id, l.Title, status = l.Status.ToString().ToLowerInvariant(), l.CreatedAt })
            .ToList();

        var marketplace = await _db.MarketplaceListings
            .AsNoTracking()
            .Where(l => l.ModerationStatus == "pending")
            .OrderByDescending(l => l.CreatedAt)
            .Take(100)
            .Select(l => new { type = "marketplace", l.Id, l.Title, status = l.ModerationStatus, l.CreatedAt })
            .ToListAsync();

        return Ok(new { data = listings.Cast<object>().Concat(marketplace), meta = new { total = listings.Count + marketplace.Count } });
    }

    private async Task<IActionResult> GetListing(int id)
    {
        var listing = await _db.Listings.AsNoTracking()
            .Where(l => l.Id == id)
            .Select(l => new
            {
                l.Id,
                l.Title,
                l.Description,
                l.Type,
                l.Status,
                l.IsFeatured,
                l.ViewCount,
                l.CreatedAt,
                l.UpdatedAt
            })
            .FirstOrDefaultAsync();

        return listing == null
            ? NotFound(new { error = "Listing not found" })
            : Ok(new
            {
                data = new
                {
                    listing.Id,
                    listing.Title,
                    listing.Description,
                    type = listing.Type.ToString().ToLowerInvariant(),
                    status = listing.Status.ToString().ToLowerInvariant(),
                    listing.IsFeatured,
                    listing.ViewCount,
                    listing.CreatedAt,
                    listing.UpdatedAt
                }
            });
    }

    private async Task<IActionResult> DeleteListing(int id)
    {
        if (!TryRequireTenant(out var tenantId, out var tenantError)) return tenantError!;

        var listing = await _db.Listings
            .FirstOrDefaultAsync(l => l.TenantId == tenantId && l.Id == id);

        if (listing == null)
        {
            return NotFound(new
            {
                error = "NOT_FOUND",
                message = "Listing not found."
            });
        }

        _db.Listings.Remove(listing);
        await _db.SaveChangesAsync();

        return Ok(new
        {
            success = true,
            data = new
            {
                deleted = true,
                id
            }
        });
    }

    private async Task<IActionResult> GetBillingSubscription()
    {
        var subscriptionRows = await _db.UserSubscriptions
            .AsNoTracking()
            .Include(s => s.Plan)
            .OrderByDescending(s => s.CreatedAt)
            .Select(s => new
            {
                s.Id,
                s.UserId,
                s.PlanId,
                plan_name = s.Plan == null ? null : s.Plan.Name,
                plan_price = s.Plan == null ? 0 : s.Plan.Price,
                currency = s.Plan == null ? null : s.Plan.Currency,
                s.Status,
                s.StartedAt,
                s.NextBillingDate,
                s.ExpiresAt,
                has_stripe_subscription = !string.IsNullOrEmpty(s.StripeSubscriptionId)
            })
            .Take(100)
            .ToListAsync();
        var subscriptions = subscriptionRows
            .Select(s => new
            {
                s.Id,
                s.UserId,
                s.PlanId,
                s.plan_name,
                s.plan_price,
                s.currency,
                status = s.Status.ToString().ToLowerInvariant(),
                s.StartedAt,
                s.NextBillingDate,
                s.ExpiresAt,
                s.has_stripe_subscription
            })
            .ToList();

        return Ok(new { data = subscriptions, meta = new { total = subscriptions.Count } });
    }

    private async Task<IActionResult> GetBillingInvoices()
    {
        var subscriptionRows = await _db.UserSubscriptions
            .AsNoTracking()
            .Include(s => s.Plan)
            .Include(s => s.User)
            .OrderByDescending(s => s.NextBillingDate ?? s.StartedAt)
            .Select(s => new
            {
                s.Id,
                s.UserId,
                user_email = s.User == null ? null : s.User.Email,
                plan_name = s.Plan == null ? null : s.Plan.Name,
                amount = s.Plan == null ? 0 : s.Plan.Price,
                currency = s.Plan == null ? "EUR" : s.Plan.Currency,
                s.Status,
                s.StartedAt,
                s.NextBillingDate,
                s.ExpiresAt,
                s.StripeSubscriptionId
            })
            .Take(200)
            .ToListAsync();

        var invoices = subscriptionRows
            .Select(s => (object)new
            {
                id = $"subscription-{s.Id}",
                invoice_number = $"SUB-{s.Id:D6}",
                source = "user_subscription",
                subscription_id = s.Id,
                user_id = s.UserId,
                s.user_email,
                s.plan_name,
                amount = s.amount,
                s.currency,
                status = s.Status == SubscriptionStatus.Active ? "paid" : s.Status.ToString().ToLowerInvariant(),
                issued_at = s.StartedAt,
                due_at = s.NextBillingDate,
                paid_at = s.Status == SubscriptionStatus.Active ? s.StartedAt : (DateTime?)null,
                expires_at = s.ExpiresAt,
                has_stripe_subscription = !string.IsNullOrWhiteSpace(s.StripeSubscriptionId)
            })
            .ToList();

        var persistedInvoices = await LoadStoredRecordsAsync(BillingInvoicesKey);
        invoices.AddRange(persistedInvoices.Select(ToResponseRecord));

        return Ok(new
        {
            data = invoices,
            meta = new
            {
                total = invoices.Count,
                subscription_backed = subscriptionRows.Count,
                persisted = persistedInvoices.Count
            }
        });
    }

    private async Task<IActionResult> GetBillingSnapshot()
    {
        var activeSubscriptions = await _db.UserSubscriptions.CountAsync(s => s.Status == SubscriptionStatus.Active);
        var pastDueSubscriptions = await _db.UserSubscriptions.CountAsync(s => s.Status == SubscriptionStatus.PastDue);
        var monthlyRevenue = await ActiveMonthlyRevenue();

        return Ok(new
        {
            data = new
            {
                plans = await _db.SubscriptionPlans.CountAsync(),
                active_plans = await _db.SubscriptionPlans.CountAsync(p => p.IsActive),
                subscriptions = await _db.UserSubscriptions.CountAsync(),
                active_subscriptions = activeSubscriptions,
                past_due_subscriptions = pastDueSubscriptions,
                monthly_recurring_revenue = monthlyRevenue,
                currency = await DefaultBillingCurrency(),
                generated_at = DateTime.UtcNow
            }
        });
    }

    private async Task<IActionResult> GetBillingRevenue()
    {
        var byPlan = await _db.UserSubscriptions
            .AsNoTracking()
            .Where(s => s.Status == SubscriptionStatus.Active)
            .GroupBy(s => new { s.PlanId, s.Plan!.Name, s.Plan.Currency, s.Plan.Price })
            .Select(g => new
            {
                plan_id = g.Key.PlanId,
                plan_name = g.Key.Name,
                currency = g.Key.Currency,
                active_subscriptions = g.Count(),
                monthly_revenue = g.Count() * g.Key.Price
            })
            .ToListAsync();

        return Ok(new
        {
            data = new
            {
                monthly_recurring_revenue = byPlan.Sum(p => p.monthly_revenue),
                currency = byPlan.FirstOrDefault()?.currency ?? await DefaultBillingCurrency(),
                by_plan = byPlan,
                generated_at = DateTime.UtcNow
            }
        });
    }

    private async Task<IActionResult> GetBillingExportCsv()
    {
        var rows = await _db.UserSubscriptions
            .AsNoTracking()
            .Include(s => s.Plan)
            .OrderBy(s => s.Id)
            .Select(s => new
            {
                s.Id,
                s.UserId,
                plan = s.Plan == null ? string.Empty : s.Plan.Name,
                s.Status,
                price = s.Plan == null ? 0 : s.Plan.Price,
                currency = s.Plan == null ? string.Empty : s.Plan.Currency,
                s.StartedAt,
                s.NextBillingDate
            })
            .ToListAsync();

        var csv = new StringBuilder("id,user_id,plan,status,price,currency,started_at,next_billing_date\n");
        foreach (var row in rows)
        {
            csv.AppendLine($"{row.Id},{row.UserId},{Csv(row.plan)},{row.Status},{row.price},{row.currency},{row.StartedAt:O},{row.NextBillingDate:O}");
        }

        return File(Encoding.UTF8.GetBytes(csv.ToString()), "text/csv", "billing-subscriptions.csv");
    }

    private async Task<IActionResult> GetEnterpriseFeatures()
    {
        var tenantId = _db.CurrentTenantId;
        var features = await _db.EnterpriseConfigs
            .AsNoTracking()
            .Where(c => !tenantId.HasValue || c.TenantId == tenantId.Value)
            .Where(c => c.Category == "features" || c.Key.StartsWith("feature."))
            .OrderBy(c => c.Key)
            .Select(c => new { c.Key, c.Value, c.Description, c.UpdatedAt })
            .ToListAsync();

        return Ok(new { data = features, meta = new { total = features.Count } });
    }

    private async Task<IActionResult> GetGdprConsentTypes()
    {
        var rows = await _db.GdprConsentTypes.AsNoTracking()
            .OrderBy(c => c.Key)
            .Select(c => new { c.Id, slug = c.Key, c.Name, c.Description, c.IsRequired, c.Version, c.IsActive, c.CreatedAt, c.UpdatedAt })
            .ToListAsync();

        return Ok(new { data = rows, meta = new { total = rows.Count } });
    }

    private async Task<IActionResult> GetGdprStatistics()
    {
        return Ok(new
        {
            data = new
            {
                consent_records = await _db.ConsentRecords.CountAsync(),
                granted_consents = await _db.ConsentRecords.CountAsync(c => c.IsGranted),
                revoked_consents = await _db.ConsentRecords.CountAsync(c => !c.IsGranted),
                export_requests = await _db.DataExportRequests.CountAsync(),
                pending_export_requests = await _db.DataExportRequests.CountAsync(r => r.Status == ExportStatus.Pending),
                deletion_requests = await _db.DataDeletionRequests.CountAsync(),
                pending_deletion_requests = await _db.DataDeletionRequests.CountAsync(r => r.Status == DeletionStatus.Pending),
                breaches = await _db.GdprBreaches.CountAsync(),
                open_breaches = await _db.GdprBreaches.CountAsync(b => b.ResolvedAt == null),
                generated_at = DateTime.UtcNow
            }
        });
    }

    private async Task<IActionResult> GetGdprTrends()
    {
        var since = DateTime.UtcNow.Date.AddDays(-29);
        var exports = await _db.DataExportRequests.AsNoTracking()
            .Where(r => r.RequestedAt >= since)
            .GroupBy(r => r.RequestedAt.Date)
            .Select(g => new { date = g.Key, export_requests = g.Count() })
            .ToListAsync();

        var deletions = await _db.DataDeletionRequests.AsNoTracking()
            .Where(r => r.CreatedAt >= since)
            .GroupBy(r => r.CreatedAt.Date)
            .Select(g => new { date = g.Key, deletion_requests = g.Count() })
            .ToListAsync();

        return Ok(new { data = new { since, exports, deletions } });
    }

    private async Task<IActionResult> GetGdprBreach(int id)
    {
        var breach = await _db.GdprBreaches.AsNoTracking().FirstOrDefaultAsync(b => b.Id == id);
        return breach == null ? NotFound(new { error = "GDPR breach not found" }) : Ok(new { data = breach });
    }

    private async Task<IActionResult> GetGdprRequest(int id)
    {
        var exportRequest = await _db.DataExportRequests.AsNoTracking().FirstOrDefaultAsync(r => r.Id == id);
        var deletionRequest = await _db.DataDeletionRequests.AsNoTracking().FirstOrDefaultAsync(r => r.Id == id);

        if (exportRequest == null && deletionRequest == null)
        {
            return NotFound(new { error = "GDPR request not found" });
        }

        return Ok(new { data = new { export_request = exportRequest, deletion_request = deletionRequest } });
    }

    private async Task<IActionResult> GetConsentTypeUsers(string slug)
    {
        var rows = await _db.ConsentRecords.AsNoTracking()
            .Where(c => c.ConsentType == slug)
            .OrderByDescending(c => c.UpdatedAt ?? c.CreatedAt)
            .Select(c => new { c.UserId, c.ConsentType, c.IsGranted, c.GrantedAt, c.RevokedAt, c.CreatedAt, c.UpdatedAt })
            .ToListAsync();

        return Ok(new { data = rows, meta = new { total = rows.Count } });
    }

    private async Task<IActionResult> GetConsentTypeExport(string slug)
    {
        var rows = await _db.ConsentRecords.AsNoTracking()
            .Where(c => c.ConsentType == slug)
            .OrderBy(c => c.UserId)
            .ToListAsync();

        var csv = new StringBuilder("user_id,consent_type,is_granted,granted_at,revoked_at,created_at,updated_at\n");
        foreach (var row in rows)
        {
            csv.AppendLine($"{row.UserId},{Csv(row.ConsentType)},{row.IsGranted},{row.GrantedAt:O},{row.RevokedAt:O},{row.CreatedAt:O},{row.UpdatedAt:O}");
        }

        return File(Encoding.UTF8.GetBytes(csv.ToString()), "text/csv", $"consent-{slug}.csv");
    }

    private async Task<IActionResult> GetConsentLedger()
    {
        var rows = await _db.ConsentRecords.AsNoTracking()
            .OrderByDescending(c => c.UpdatedAt ?? c.CreatedAt)
            .Take(200)
            .Select(c => new { c.Id, c.UserId, c.ConsentType, c.IsGranted, c.GrantedAt, c.RevokedAt, c.CreatedAt, c.UpdatedAt })
            .ToListAsync();

        return Ok(new { data = rows, meta = new { total = rows.Count } });
    }

    private async Task<IActionResult> GetProcessingRegister()
    {
        var documents = await _db.LegalDocuments.AsNoTracking()
            .OrderBy(d => d.Slug)
            .Select(d => new { d.Slug, d.Title, d.Version, d.IsActive, d.RequiresAcceptance, d.UpdatedAt })
            .ToListAsync();

        var consentTypes = await _db.GdprConsentTypes.AsNoTracking()
            .OrderBy(c => c.Key)
            .Select(c => new { slug = c.Key, c.Name, c.Description, c.IsRequired, c.Version, c.IsActive })
            .ToListAsync();

        return Ok(new { data = new { legal_documents = documents, consent_types = consentTypes } });
    }

    private async Task<IActionResult> GetProcessingRegisterCsv()
    {
        var rows = await _db.GdprConsentTypes.AsNoTracking().OrderBy(c => c.Key).ToListAsync();
        var csv = new StringBuilder("slug,name,description,is_required,version,is_active\n");
        foreach (var row in rows)
        {
            csv.AppendLine($"{Csv(row.Key)},{Csv(row.Name)},{Csv(row.Description)},{row.IsRequired},{row.Version},{row.IsActive}");
        }

        return File(Encoding.UTF8.GetBytes(csv.ToString()), "text/csv", "processing-register.csv");
    }

    private async Task<IActionResult> GetMonitoringRequirements()
    {
        return Ok(new
        {
            data = new
            {
                database = "postgresql",
                scheduled_tasks = await _db.ScheduledTasks.CountAsync(),
                failed_scheduled_tasks = await _db.ScheduledTasks.CountAsync(t => t.Status == ScheduledTaskStatus.Failed),
                email_pending = await _db.EmailLogs.CountAsync(e => e.Status == EmailSendStatus.Pending),
                open_gdpr_breaches = await _db.GdprBreaches.CountAsync(b => b.ResolvedAt == null),
                active_announcements = await _db.PlatformAnnouncements.CountAsync(a => a.IsActive),
                checked_at = DateTime.UtcNow
            }
        });
    }

    private async Task<IActionResult> GetFederationActivity()
    {
        // Server-side filtering + pagination.
        var q = Request.Query;
        var partner = q["partner"].FirstOrDefault();
        var source = (q["source"].FirstOrDefault() ?? string.Empty).ToLowerInvariant();
        var severityFilter = (q["severity"].FirstOrDefault() ?? string.Empty).ToLowerInvariant();
        var eventType = q["event_type"].FirstOrDefault();
        var search = q["q"].FirstOrDefault();
        var sinceStr = q["since"].FirstOrDefault();
        var untilStr = q["until"].FirstOrDefault();
        DateTime? since = DateTime.TryParse(sinceStr, out var sParsed) ? sParsed.ToUniversalTime() : (DateTime?)null;
        DateTime? until = DateTime.TryParse(untilStr, out var uParsed) ? uParsed.ToUniversalTime() : (DateTime?)null;
        int page = int.TryParse(q["page"].FirstOrDefault(), out var p) && p >= 1 ? p : 1;
        int pageSize = int.TryParse(q["page_size"].FirstOrDefault(), out var ps) ? ps : 50;
        if (pageSize < 1) pageSize = 1;
        if (pageSize > 200) pageSize = 200;
        int? partnerId = int.TryParse(partner, out var pid) ? pid : (int?)null;

        var includeAudit = string.IsNullOrEmpty(source) || source == "audit";
        var includeApi = string.IsNullOrEmpty(source) || source == "api";

        IQueryable<ActivityRow> auditQuery = _db.FederationAuditLogs.AsNoTracking()
            .Select(l => new ActivityRow
            {
                Source = "audit",
                Id = l.Id,
                Action = l.Action,
                EntityType = l.EntityType,
                EntityId = l.EntityId,
                PartnerTenantId = l.PartnerTenantId,
                CreatedAt = l.CreatedAt,
                StatusCode = (int?)null
            });

        if (partnerId.HasValue) auditQuery = auditQuery.Where(r => r.PartnerTenantId == partnerId);
        if (!string.IsNullOrWhiteSpace(eventType)) auditQuery = auditQuery.Where(r => r.Action != null && r.Action.Contains(eventType));
        if (!string.IsNullOrWhiteSpace(search)) auditQuery = auditQuery.Where(r =>
            (r.Action != null && r.Action.Contains(search)) ||
            (r.EntityType != null && r.EntityType.Contains(search)));
        if (since.HasValue) auditQuery = auditQuery.Where(r => r.CreatedAt >= since.Value);
        if (until.HasValue) auditQuery = auditQuery.Where(r => r.CreatedAt <= until.Value);

        IQueryable<ActivityRow> apiQuery = _db.FederationApiLogs.AsNoTracking()
            .Select(l => new ActivityRow
            {
                Source = "api",
                Id = l.Id,
                Action = l.HttpMethod + " " + l.Path,
                EntityType = (string?)null,
                EntityId = (int?)null,
                PartnerTenantId = l.TenantId,
                CreatedAt = l.CreatedAt,
                StatusCode = l.StatusCode
            });

        if (partnerId.HasValue) apiQuery = apiQuery.Where(r => r.PartnerTenantId == partnerId);
        if (!string.IsNullOrWhiteSpace(eventType)) apiQuery = apiQuery.Where(r => r.Action != null && r.Action.Contains(eventType));
        if (!string.IsNullOrWhiteSpace(search)) apiQuery = apiQuery.Where(r => r.Action != null && r.Action.Contains(search));
        if (since.HasValue) apiQuery = apiQuery.Where(r => r.CreatedAt >= since.Value);
        if (until.HasValue) apiQuery = apiQuery.Where(r => r.CreatedAt <= until.Value);

        var auditRows = includeAudit ? await auditQuery.OrderByDescending(r => r.CreatedAt).Take(2000).ToListAsync() : new List<ActivityRow>();
        var apiRows = includeApi ? await apiQuery.OrderByDescending(r => r.CreatedAt).Take(2000).ToListAsync() : new List<ActivityRow>();

        IEnumerable<ActivityRow> merged = auditRows.Concat(apiRows);

        if (!string.IsNullOrWhiteSpace(severityFilter) && severityFilter != "all")
        {
            merged = merged.Where(r => ClassifyActivitySeverity(r) == severityFilter);
        }

        var ordered = merged.OrderByDescending(r => r.CreatedAt).ToList();
        var total = ordered.Count;
        var totalPages = total == 0 ? 0 : (int)Math.Ceiling(total / (double)pageSize);
        var pageItems = ordered.Skip((page - 1) * pageSize).Take(pageSize)
            .Select(r => new
            {
                source = r.Source,
                id = r.Id,
                action = r.Action,
                entityType = r.EntityType,
                entityId = r.EntityId,
                partnerTenantId = r.PartnerTenantId,
                createdAt = r.CreatedAt,
                severity = ClassifyActivitySeverity(r),
                statusCode = r.StatusCode
            })
            .ToList();

        return Ok(new
        {
            data = pageItems,
            items = pageItems,
            total,
            page,
            page_size = pageSize,
            total_pages = totalPages,
            meta = new { total, page, page_size = pageSize, total_pages = totalPages }
        });
    }

    private sealed class ActivityRow
    {
        public string Source { get; set; } = string.Empty;
        public int Id { get; set; }
        public string? Action { get; set; }
        public string? EntityType { get; set; }
        public int? EntityId { get; set; }
        public int? PartnerTenantId { get; set; }
        public DateTime CreatedAt { get; set; }
        public int? StatusCode { get; set; }
    }

    /// <summary>
    /// Mirrors the client-side severity classifier previously in
    /// AdminFederationActivityPage.tsx — error/warning/info inferred from
    /// action text + HTTP status code.
    /// </summary>
    private static string ClassifyActivitySeverity(ActivityRow r)
    {
        if (r.StatusCode.HasValue)
        {
            if (r.StatusCode.Value >= 500) return "error";
            if (r.StatusCode.Value >= 400) return "warning";
        }
        var lower = (r.Action ?? string.Empty).ToLowerInvariant();
        if (lower.Contains("fail") || lower.Contains("error") || lower.Contains("reject")) return "error";
        if (lower.Contains("warn") || lower.Contains("retry") || lower.Contains("cancel")) return "warning";
        return "info";
    }

    private async Task<IActionResult> GetFederationAnalyticsOverview()
    {
        return Ok(new
        {
            data = new
            {
                partners = await _db.FederationPartners.CountAsync(),
                active_partners = await _db.FederationPartners.CountAsync(p => p.Status == PartnerStatus.Active),
                api_keys = await _db.FederationApiKeys.CountAsync(),
                active_api_keys = await _db.FederationApiKeys.CountAsync(k => k.IsActive),
                api_calls = await _db.FederationApiLogs.CountAsync(),
                failed_api_calls = await _db.FederationApiLogs.CountAsync(l => l.StatusCode >= 400),
                federated_listings = await _db.FederatedListings.CountAsync(),
                federated_exchanges = await _db.FederatedExchanges.CountAsync(),
                generated_at = DateTime.UtcNow
            }
        });
    }

    private async Task<IActionResult> GetFederationCreditBalances()
    {
        var balances = await _db.FederationPartners.AsNoTracking()
            .GroupBy(p => p.PartnerTenantId)
            .Select(g => new
            {
                partner_tenant_id = g.Key,
                agreements = g.Count(),
                active_agreements = g.Count(p => p.Status == PartnerStatus.Active),
                average_exchange_rate = g.Average(p => p.CreditExchangeRate)
            })
            .ToListAsync();

        return Ok(new
        {
            data = balances,
            note = "V2 has federation partnership exchange rates but no persisted cross-tenant credit-balance ledger."
        });
    }

    private async Task<IActionResult> GetFederationTopics()
    {
        if (!TryRequireTenant(out _, out var tenantError)) return tenantError!;

        var stored = await GetTenantConfigValueAsync(FederationTopicsKey);
        if (!string.IsNullOrWhiteSpace(stored))
        {
            var storedPayload = ParseStoredPayload(stored);
            return Ok(new
            {
                data = storedPayload,
                meta = new { source = "tenant_config", total = CountPayloadItems(storedPayload) }
            });
        }

        var subscribed = await GetSubscribedTopicKeys();
        var topics = DefaultFederationTopics()
            .Select(t => new
            {
                t.id,
                t.key,
                t.name,
                t.description,
                status = "active",
                subscribed = subscribed.Contains(t.key)
            })
            .ToList();

        return Ok(new
        {
            data = topics,
            meta = new { source = "v1_compatibility_defaults", total = topics.Count }
        });
    }

    private async Task<IActionResult> GetFederationTopicSubscriptions()
    {
        if (!TryRequireTenant(out _, out var tenantError)) return tenantError!;

        var stored = await GetTenantConfigValueAsync(FederationTopicSubscriptionsKey);
        var data = string.IsNullOrWhiteSpace(stored)
            ? new { topics = Array.Empty<string>(), updated_at = (DateTime?)null }
            : ParseStoredPayload(stored);

        return Ok(new
        {
            data,
            meta = new { source = "tenant_config", total = CountPayloadItems(data) }
        });
    }

    private async Task<IActionResult> PutFederationTopicSubscriptions()
    {
        if (!TryRequireTenant(out _, out var tenantError)) return tenantError!;

        var payloadJson = await ReadRequestPayloadJsonAsync();
        await UpsertTenantConfigValueAsync(FederationTopicSubscriptionsKey, payloadJson);
        await _db.SaveChangesAsync();

        var data = ParseStoredPayload(payloadJson);
        return Ok(new
        {
            success = true,
            data,
            compatibility = new
            {
                mode = "tenant_config",
                key = FederationTopicSubscriptionsKey
            }
        });
    }

    private async Task<IActionResult> GetFederationWebhooks()
    {
        if (!TryRequireTenant(out var tenantId, out var tenantError)) return tenantError!;

        var subs = await _webhookService.ListAsync(tenantId);
        return Ok(new
        {
            data = subs.Select(WebhookSubscriptionToResponse).ToList(),
            meta = new { source = "typed_entity", total = subs.Count }
        });
    }

    private async Task<IActionResult> GetFederationWebhookLogs(int webhookId)
    {
        if (!TryRequireTenant(out var tenantId, out var tenantError)) return tenantError!;

        var logs = await _webhookService.GetLogsAsync(tenantId, webhookId);
        return Ok(new
        {
            data = logs.Select(l => new
            {
                id = l.Id,
                subscription_id = l.SubscriptionId,
                success = l.Success,
                reason = l.Reason,
                action = l.Action,
                payload = ParseStoredPayload(l.PayloadJson),
                created_at = l.CreatedAt
            }).ToList(),
            meta = new { source = "typed_entity", webhook_id = webhookId, total = logs.Count }
        });
    }

    private async Task<IActionResult> CreateFederationWebhook()
    {
        if (!TryRequireTenant(out var tenantId, out var tenantError)) return tenantError!;

        var payloadJson = await ReadRequestPayloadJsonAsync();
        var input = ParseWebhookInput(payloadJson);
        var created = await _webhookService.CreateAsync(tenantId, GetCurrentAdminUserId(), input);
        return StatusCode(StatusCodes.Status201Created, new
        {
            success = true,
            data = WebhookSubscriptionToResponse(created)
        });
    }

    private async Task<IActionResult> UpdateFederationWebhook(int id)
    {
        if (!TryRequireTenant(out var tenantId, out var tenantError)) return tenantError!;

        var payloadJson = await ReadRequestPayloadJsonAsync();
        var input = ParseWebhookInput(payloadJson);
        var updated = await _webhookService.UpdateAsync(tenantId, id, input);
        if (updated == null) return NotFound(new { error = "webhook_not_found", id });
        return Ok(new { success = true, data = WebhookSubscriptionToResponse(updated) });
    }

    private async Task<IActionResult> DeleteFederationWebhook(int id)
    {
        if (!TryRequireTenant(out var tenantId, out var tenantError)) return tenantError!;
        var deleted = await _webhookService.DeleteAsync(tenantId, id);
        if (!deleted) return NotFound(new { error = "webhook_not_found", id });
        return Ok(new { success = true, id });
    }

    private async Task<IActionResult> GetFederationCreditAgreements()
    {
        if (!TryRequireTenant(out var tenantId, out var tenantError)) return tenantError!;

        var records = await LoadFederationCreditAgreements();
        var tenantIds = records
            .Where(r => r.FromTenantId == tenantId || r.ToTenantId == tenantId)
            .SelectMany(r => new[] { r.FromTenantId, r.ToTenantId })
            .Append(tenantId)
            .Distinct()
            .ToArray();
        var tenants = await LoadTenantLookup(tenantIds);

        var data = records
            .Where(r => r.FromTenantId == tenantId || r.ToTenantId == tenantId)
            .OrderByDescending(r => r.CreatedAt)
            .Select(r => FormatFederationCreditAgreement(r, tenants))
            .ToList();

        return Ok(new { success = true, data });
    }

    private async Task<IActionResult> CreateFederationCreditAgreement()
    {
        if (!TryRequireTenant(out var tenantId, out var tenantError)) return tenantError!;

        var payload = await ReadJsonObjectPayloadAsync();
        var partnerTenantId = JsonInt(payload, "partner_tenant_id", fallback: 0, min: 0, max: int.MaxValue);
        var exchangeRate = JsonDecimal(payload, "exchange_rate", fallback: 0m);
        var monthlyLimit = JsonDecimal(payload, "monthly_limit", fallback: 0m);
        if (monthlyLimit <= 0m)
        {
            monthlyLimit = JsonDecimal(payload, "max_monthly_credits", fallback: 0m);
        }

        if (partnerTenantId <= 0)
        {
            return BadRequest(new { error = "VALIDATION_ERROR", field = "partner_tenant_id" });
        }

        if (partnerTenantId == tenantId)
        {
            return BadRequest(new { error = "VALIDATION_ERROR", field = "partner_tenant_id", message = "Cannot create agreement with the current tenant." });
        }

        if (exchangeRate <= 0m)
        {
            return BadRequest(new { error = "VALIDATION_ERROR", field = "exchange_rate" });
        }

        if (monthlyLimit <= 0m)
        {
            return BadRequest(new { error = "VALIDATION_ERROR", field = "monthly_limit" });
        }

        var partnerExists = await _db.Tenants
            .AsNoTracking()
            .AnyAsync(t => t.Id == partnerTenantId && t.IsActive);
        if (!partnerExists)
        {
            return NotFound(new { error = "PARTNER_TENANT_NOT_FOUND", field = "partner_tenant_id" });
        }

        var records = await LoadFederationCreditAgreements();
        var duplicate = records.Any(r =>
            r.Status is "pending" or "active" &&
            ((r.FromTenantId == tenantId && r.ToTenantId == partnerTenantId) ||
             (r.FromTenantId == partnerTenantId && r.ToTenantId == tenantId)));
        if (duplicate)
        {
            return Conflict(new { error = "CREATE_FAILED", message = "Agreement already exists between these tenants." });
        }

        var now = DateTime.UtcNow;
        var record = new FederationCreditAgreementRecord
        {
            Id = records.Count == 0 ? 1 : records.Max(r => r.Id) + 1,
            FromTenantId = tenantId,
            ToTenantId = partnerTenantId,
            ExchangeRate = exchangeRate,
            MaxMonthlyCredits = monthlyLimit,
            Status = "pending",
            ApprovedByFrom = GetCurrentAdminUserId(),
            CreatedAt = now,
            UpdatedAt = now
        };
        records.Add(record);
        await SaveFederationCreditAgreements(records);

        var tenants = await LoadTenantLookup(new[] { record.FromTenantId, record.ToTenantId });
        return StatusCode(StatusCodes.Status201Created, new
        {
            success = true,
            data = FormatFederationCreditAgreement(record, tenants)
        });
    }

    private async Task<IActionResult> UpdateFederationCreditAgreementStatus(int id, string action)
    {
        if (!TryRequireTenant(out var tenantId, out var tenantError)) return tenantError!;

        var status = action switch
        {
            "approve" or "activate" or "reactivate" => "active",
            "suspend" => "suspended",
            "reject" or "terminate" => "terminated",
            _ => null
        };
        if (status == null)
        {
            return BadRequest(new { error = "VALIDATION_ERROR", field = "action" });
        }

        var records = await LoadFederationCreditAgreements();
        var record = records.FirstOrDefault(r => r.Id == id && (r.FromTenantId == tenantId || r.ToTenantId == tenantId));
        if (record == null)
        {
            return NotFound(new { error = "NOT_FOUND", message = "Credit agreement not found." });
        }

        record.Status = status;
        record.UpdatedAt = DateTime.UtcNow;
        var adminId = GetCurrentAdminUserId();
        if (action == "approve")
        {
            if (record.FromTenantId == tenantId) record.ApprovedByFrom = adminId;
            if (record.ToTenantId == tenantId) record.ApprovedByTo = adminId;
        }

        await SaveFederationCreditAgreements(records);
        return Ok(new { success = true, data = new { success = true } });
    }

    private static FederationWebhookSubscription ParseWebhookInput(string payloadJson)
    {
        var sub = new FederationWebhookSubscription();
        if (string.IsNullOrWhiteSpace(payloadJson)) return sub;
        try
        {
            using var doc = JsonDocument.Parse(payloadJson);
            if (doc.RootElement.ValueKind != JsonValueKind.Object) return sub;
            if (TryFindProperty(doc.RootElement, "name", out var n)) sub.Name = JsonElementToString(n) ?? string.Empty;
            if (TryFindProperty(doc.RootElement, "target_url", out var t) ||
                TryFindProperty(doc.RootElement, "url", out t)) sub.TargetUrl = JsonElementToString(t) ?? string.Empty;
            if (TryFindProperty(doc.RootElement, "event_types", out var ev)) sub.EventTypes = JsonElementToString(ev) ?? string.Empty;
            if (TryFindProperty(doc.RootElement, "secret", out var s)) sub.Secret = JsonElementToString(s);
            if (TryFindProperty(doc.RootElement, "direction", out var d))
            {
                var dv = (JsonElementToString(d) ?? "outbound").ToLowerInvariant();
                sub.Direction = dv == "inbound" ? FederationWebhookDirection.Inbound : FederationWebhookDirection.Outbound;
            }
            if (TryFindProperty(doc.RootElement, "status", out var st))
            {
                var sv = (JsonElementToString(st) ?? "active").ToLowerInvariant();
                sub.Status = sv switch
                {
                    "paused" or "disabled" or "inactive" => FederationWebhookStatus.Paused,
                    "failed" or "error" => FederationWebhookStatus.Failed,
                    _ => FederationWebhookStatus.Active
                };
            }
            // Also honour a boolean enabled/is_active flag (the catch-all parity
            // path already reads "enabled"). false => Paused, true => Active.
            if (TryFindProperty(doc.RootElement, "enabled", out var en) ||
                TryFindProperty(doc.RootElement, "is_active", out en))
            {
                if (en.ValueKind == JsonValueKind.False) sub.Status = FederationWebhookStatus.Paused;
                else if (en.ValueKind == JsonValueKind.True) sub.Status = FederationWebhookStatus.Active;
            }
        }
        catch (JsonException) { }
        return sub;
    }

    private static object WebhookSubscriptionToResponse(FederationWebhookSubscription s) => new Dictionary<string, object?>
    {
        ["id"] = s.Id,
        ["tenant_id"] = s.TenantId,
        ["name"] = s.Name,
        ["target_url"] = s.TargetUrl,
        ["event_types"] = s.EventTypes,
        ["direction"] = s.Direction.ToString().ToLowerInvariant(),
        ["status"] = s.Status.ToString().ToLowerInvariant(),
        ["secret"] = string.IsNullOrEmpty(s.Secret) ? null : "***",
        ["last_delivered_at"] = s.LastDeliveredAt,
        ["last_failure_at"] = s.LastFailureAt,
        ["last_failure_reason"] = s.LastFailureReason,
        ["retry_count"] = s.RetryCount,
        ["created_at"] = s.CreatedAt,
        ["updated_at"] = s.UpdatedAt,
        ["created_by"] = s.CreatedBy
    };

    private async Task<IActionResult> CreateStoredRecord(string key, string kind)
    {
        if (!TryRequireTenant(out _, out var tenantError)) return tenantError!;

        var payloadJson = await ReadRequestPayloadJsonAsync();
        var records = await LoadStoredRecordsAsync(key, includeDeleted: true);
        var requestedId = ExtractIntFromPayload(payloadJson, "id");
        var id = requestedId.HasValue && records.All(r => r.Id != requestedId.Value)
            ? requestedId.Value
            : NextStoredRecordId(records);

        var now = DateTime.UtcNow;
        var record = BuildStoredRecord(id, kind, "create", payloadJson, now);
        records.Add(record);
        await SaveStoredRecordsAsync(key, records);

        return StatusCode(StatusCodes.Status201Created, new
        {
            success = true,
            data = ToResponseRecord(record),
            compatibility = CompatibilityMetadata(key)
        });
    }

    private async Task<IActionResult> UpsertStoredRecord(string key, int id, string kind)
    {
        if (!TryRequireTenant(out _, out var tenantError)) return tenantError!;

        var payloadJson = await ReadRequestPayloadJsonAsync();
        var records = await LoadStoredRecordsAsync(key, includeDeleted: true);
        var now = DateTime.UtcNow;
        var record = records.FirstOrDefault(r => r.Id == id);

        if (record == null)
        {
            record = BuildStoredRecord(id, kind, "upsert", payloadJson, now);
            records.Add(record);
        }
        else
        {
            ApplyStoredRecordUpdate(record, payloadJson, "update", now);
        }

        await SaveStoredRecordsAsync(key, records);

        return Ok(new
        {
            success = true,
            data = ToResponseRecord(record),
            compatibility = CompatibilityMetadata(key)
        });
    }

    private async Task<IActionResult> DeleteStoredRecord(string key, int id, string kind)
    {
        if (!TryRequireTenant(out _, out var tenantError)) return tenantError!;

        var records = await LoadStoredRecordsAsync(key, includeDeleted: true);
        var now = DateTime.UtcNow;
        var record = records.FirstOrDefault(r => r.Id == id);

        if (record == null)
        {
            record = BuildStoredRecord(id, kind, "delete", "{}", now);
            records.Add(record);
        }

        record.Status = "deleted";
        record.Action = "delete";
        record.DeletedAt = now;
        record.UpdatedAt = now;
        record.Path = Request.Path.Value;
        record.Method = Request.Method;
        record.AdminUserId = GetCurrentAdminUserId();

        await SaveStoredRecordsAsync(key, records);

        return Ok(new
        {
            success = true,
            data = ToResponseRecord(record),
            compatibility = CompatibilityMetadata(key)
        });
    }

    private async Task<IActionResult> TestFederationWebhook(int webhookId)
    {
        if (!TryRequireTenant(out var tenantId, out var tenantError)) return tenantError!;

        var payloadJson = await ReadRequestPayloadJsonAsync();
        if (string.IsNullOrWhiteSpace(payloadJson)) payloadJson = "{}";
        var (success, reason) = await _webhookService.DeliverAsync(tenantId, webhookId, payloadJson, "test");

        return Ok(new
        {
            success,
            delivery_status = success ? "delivered" : "failed",
            reason
        });
    }

    private async Task<IActionResult> GetFaqs()
    {
        var rows = await _db.Faqs.AsNoTracking()
            .OrderBy(f => f.SortOrder)
            .ThenBy(f => f.Id)
            .Select(f => new { f.Id, f.Question, f.Answer, f.Category, f.SortOrder, f.IsPublished, f.CreatedAt, f.UpdatedAt })
            .ToListAsync();

        return Ok(new { data = rows, meta = new { total = rows.Count } });
    }

    private async Task<IActionResult> GetLandingPageMetadata()
    {
        var pages = await _db.Pages.AsNoTracking()
            .Where(p => p.Slug == "home" || p.Slug == "landing" || p.ShowInMenu)
            .OrderBy(p => p.SortOrder)
            .Select(p => new { p.Id, p.Title, p.Slug, p.IsPublished, p.ShowInMenu, p.MenuLocation, p.MetaTitle, p.MetaDescription, p.UpdatedAt })
            .ToListAsync();

        var resources = await _db.Resources.AsNoTracking()
            .Where(r => r.IsPublished)
            .OrderBy(r => r.SortOrder)
            .Take(10)
            .Select(r => new { r.Id, r.Title, r.Description, r.Url, r.ResourceType })
            .ToListAsync();

        return Ok(new { data = new { pages, featured_resources = resources } });
    }

    private async Task<IActionResult> GetSitemapStats()
    {
        return Ok(new
        {
            data = new
            {
                pages = await _db.Pages.CountAsync(p => p.IsPublished),
                blog_posts = await _db.BlogPosts.CountAsync(p => p.Status == "published"),
                listings = await _db.Listings.CountAsync(l => l.Status == ListingStatus.Active),
                resources = await _db.Resources.CountAsync(r => r.IsPublished),
                faqs = await _db.Faqs.CountAsync(f => f.IsPublished),
                generated_at = DateTime.UtcNow
            }
        });
    }

    private async Task<IActionResult> GetJobTemplates()
    {
        if (!TryRequireTenant(out var tenantId, out var tenantError)) return tenantError!;

        var rows = await _db.JobTemplates.AsNoTracking()
            .Where(t => t.TenantId == tenantId)
            .OrderBy(t => t.Title)
            .Select(t => new { t.Id, t.Title, t.Description, t.Category, t.JobType, t.RequiredSkills, t.IsPublic, t.CreatedAt, t.UpdatedAt })
            .ToListAsync();

        return Ok(new { data = rows, meta = new { total = rows.Count } });
    }

    private async Task<IActionResult> GetInviteCodes()
    {
        if (!TryRequireTenant(out var tenantId, out var tenantError)) return tenantError!;

        var limit = QueryInt("limit", 50, 1, 100);
        var offset = QueryInt("offset", 0, 0, int.MaxValue);

        var query = _db.TenantInviteCodes
            .AsNoTracking()
            .Where(c => c.TenantId == tenantId);

        var total = await query.CountAsync();
        var items = await query
            .OrderByDescending(c => c.CreatedAt)
            .Skip(offset)
            .Take(limit)
            .Select(c => new
            {
                c.Id,
                c.TenantId,
                c.Code,
                created_by = c.CreatedBy,
                creator_name = c.CreatedByUser == null ? null : c.CreatedByUser.FirstName,
                max_uses = c.MaxUses,
                uses_count = c.UsesCount,
                expires_at = c.ExpiresAt,
                note = c.Note,
                is_active = c.IsActive,
                last_used_at = c.LastUsedAt,
                last_used_by = c.LastUsedBy,
                created_at = c.CreatedAt,
                updated_at = c.UpdatedAt
            })
            .ToListAsync();

        var data = new { items, total, limit, offset };
        return Ok(new { success = true, data, items, total, limit, offset });
    }

    private async Task<IActionResult> GenerateInviteCodes()
    {
        if (!TryRequireTenant(out var tenantId, out var tenantError)) return tenantError!;

        var payload = await ReadJsonObjectPayloadAsync();
        var count = JsonInt(payload, "count", 1, 1, 100);
        var maxUses = JsonInt(payload, "max_uses", 1, 1, int.MaxValue);
        var note = Truncate(JsonString(payload, "note"), 255);
        var expiresAtText = JsonString(payload, "expires_at");
        DateTime? expiresAt = null;

        if (!string.IsNullOrWhiteSpace(expiresAtText))
        {
            if (!DateTimeOffset.TryParse(expiresAtText, CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal, out var parsed))
            {
                return UnprocessableEntity(new
                {
                    error = "VALIDATION_INVALID_FORMAT",
                    message = "expires_at must be a valid date/time."
                });
            }

            expiresAt = parsed.UtcDateTime;
        }

        var now = DateTime.UtcNow;
        var adminId = GetCurrentAdminUserId();
        var rows = new List<TenantInviteCode>(capacity: count);

        for (var i = 0; i < count; i++)
        {
            rows.Add(new TenantInviteCode
            {
                TenantId = tenantId,
                Code = await GenerateUniqueInviteCode(tenantId),
                CreatedBy = adminId,
                MaxUses = maxUses,
                UsesCount = 0,
                ExpiresAt = expiresAt,
                Note = note,
                IsActive = true,
                CreatedAt = now,
                UpdatedAt = now
            });
        }

        _db.TenantInviteCodes.AddRange(rows);
        await _db.SaveChangesAsync();

        var codes = rows.Select(r => r.Code).ToArray();
        var data = new { codes, count = codes.Length };
        return Ok(new { success = true, data, codes, count = codes.Length });
    }

    private async Task<IActionResult> DeactivateInviteCode(int id)
    {
        if (!TryRequireTenant(out var tenantId, out var tenantError)) return tenantError!;

        var row = await _db.TenantInviteCodes
            .FirstOrDefaultAsync(c => c.TenantId == tenantId && c.Id == id);

        if (row == null)
        {
            return NotFound(new
            {
                error = "RESOURCE_NOT_FOUND",
                message = "Invite code not found."
            });
        }

        row.IsActive = false;
        row.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return Ok(new { success = true, data = new { deactivated = true } });
    }

    private async Task<IActionResult> GetVolunteeringOrganizations()
    {
        if (!TryRequireTenant(out var tenantId, out var tenantError)) return tenantError!;

        var organizations = await _db.Organisations
            .AsNoTracking()
            .Where(o => o.TenantId == tenantId)
            .OrderBy(o => o.Name)
            .Take(100)
            .Select(o => new
            {
                o.Id,
                o.Name,
                o.Description,
                o.Email,
                o.WebsiteUrl,
                o.Type,
                o.Status,
                o.CreatedAt
            })
            .ToListAsync();

        var organizationIds = organizations.Select(o => o.Id).ToArray();
        var memberStats = await _db.OrganisationMembers
            .AsNoTracking()
            .Where(m => m.TenantId == tenantId && organizationIds.Contains(m.OrganisationId))
            .GroupBy(m => m.OrganisationId)
            .Select(g => new
            {
                OrganizationId = g.Key,
                MemberCount = g.Count(),
                VolunteerCount = g.Count(m => m.Role == "volunteer")
            })
            .ToDictionaryAsync(g => g.OrganizationId);

        var walletStats = await _db.OrgWallets
            .AsNoTracking()
            .Where(w => w.TenantId == tenantId && organizationIds.Contains(w.OrganisationId))
            .Select(w => new
            {
                w.OrganisationId,
                w.Balance,
                w.TotalReceived,
                w.TotalSpent
            })
            .ToDictionaryAsync(w => w.OrganisationId);

        var hoursByOrganization = await _db.VolunteerLogs
            .AsNoTracking()
            .Where(l =>
                l.TenantId == tenantId &&
                l.OrganizationId.HasValue &&
                organizationIds.Contains(l.OrganizationId.Value) &&
                l.Status == "approved")
            .GroupBy(l => l.OrganizationId!.Value)
            .Select(g => new
            {
                OrganizationId = g.Key,
                TotalHours = g.Sum(l => l.Hours)
            })
            .ToDictionaryAsync(g => g.OrganizationId, g => g.TotalHours);

        var data = organizations.Select(o =>
        {
            memberStats.TryGetValue(o.Id, out var members);
            walletStats.TryGetValue(o.Id, out var wallet);
            hoursByOrganization.TryGetValue(o.Id, out var totalHours);

            return new
            {
                id = o.Id,
                org_id = o.Id,
                name = o.Name,
                org_name = o.Name,
                description = o.Description,
                contact_email = o.Email,
                website = o.WebsiteUrl,
                org_type = o.Type,
                meeting_schedule = (string?)null,
                status = o.Status,
                created_at = o.CreatedAt,
                balance = wallet?.Balance ?? 0m,
                member_count = members?.MemberCount ?? 0,
                volunteer_count = members?.VolunteerCount ?? 0,
                opportunity_count = 0,
                total_hours = totalHours,
                total_in = wallet?.TotalReceived ?? 0m,
                total_out = wallet?.TotalSpent ?? 0m
            };
        }).ToList();

        return Ok(new { data, meta = new { total = data.Count } });
    }

    private async Task<IActionResult> GetJobModerationQueue()
    {
        if (!TryRequireTenant(out var tenantId, out var tenantError)) return tenantError!;

        var page = QueryInt("page", 1, 1, int.MaxValue);
        var limit = QueryInt("limit", QueryInt("per_page", 50, 1, 200), 1, 200);
        var statuses = new[] { "draft", "pending", "flagged", "rejected" };
        var query = _db.JobVacancies
            .AsNoTracking()
            .Where(j => j.TenantId == tenantId && statuses.Contains(j.Status.ToLower()));

        var total = await query.CountAsync();
        var items = await query
            .OrderByDescending(j => j.CreatedAt)
            .Skip((page - 1) * limit)
            .Take(limit)
            .Select(j => new
            {
                j.Id,
                j.Title,
                j.Description,
                j.Category,
                job_type = j.JobType,
                j.Status,
                is_featured = j.IsFeatured,
                application_count = j.ApplicationCount,
                created_at = j.CreatedAt,
                updated_at = j.UpdatedAt
            })
            .ToListAsync();

        return Ok(new { data = new { items, total, page, limit }, meta = new { total, page, limit } });
    }

    private async Task<IActionResult> GetJobModerationStats()
    {
        if (!TryRequireTenant(out var tenantId, out var tenantError)) return tenantError!;

        var jobs = _db.JobVacancies.AsNoTracking().Where(j => j.TenantId == tenantId);
        var pendingJobs = await jobs.CountAsync(j => j.Status == "draft" || j.Status == "pending" || j.Status == "flagged");
        var flaggedJobs = await jobs.CountAsync(j => j.Status == "flagged");
        var rejectedJobs = await jobs.CountAsync(j => j.Status == "rejected" || j.Status == "cancelled");

        return Ok(new
        {
            data = new
            {
                pending_jobs = pendingJobs,
                flagged_jobs = flaggedJobs,
                rejected_jobs = rejectedJobs,
                total_jobs = await jobs.CountAsync()
            }
        });
    }

    private async Task<IActionResult> GetJobSpamStats()
    {
        if (!TryRequireTenant(out var tenantId, out var tenantError)) return tenantError!;

        var jobs = _db.JobVacancies.AsNoTracking().Where(j => j.TenantId == tenantId);
        var flaggedJobs = await jobs.CountAsync(j => j.Status == "flagged" || j.Status == "draft");

        return Ok(new
        {
            data = new
            {
                suspected_spam = flaggedJobs,
                flagged_jobs = flaggedJobs,
                total_checked = await jobs.CountAsync(),
                generated_at = DateTime.UtcNow
            }
        });
    }

    private async Task<IActionResult> GetJobInterviews()
    {
        if (!TryRequireTenant(out var tenantId, out var tenantError)) return tenantError!;

        var page = QueryInt("page", 1, 1, int.MaxValue);
        var limit = QueryInt("limit", QueryInt("per_page", 50, 1, 200), 1, 200);
        var status = Request.Query["status"].FirstOrDefault();
        var query = _db.JobInterviews.AsNoTracking().Where(i => i.TenantId == tenantId);
        if (!string.IsNullOrWhiteSpace(status))
        {
            query = query.Where(i => i.Status == status);
        }

        var total = await query.CountAsync();
        var items = await query
            .OrderByDescending(i => i.StartsAt)
            .Skip((page - 1) * limit)
            .Take(limit)
            .Select(i => new
            {
                i.Id,
                job_id = i.JobId,
                application_id = i.ApplicationId,
                candidate_user_id = i.CandidateUserId,
                created_by_user_id = i.CreatedByUserId,
                starts_at = i.StartsAt,
                ends_at = i.EndsAt,
                i.Location,
                i.Status,
                i.Notes,
                created_at = i.CreatedAt,
                updated_at = i.UpdatedAt
            })
            .ToListAsync();

        return Ok(new { data = items, meta = new { total, page, limit } });
    }

    private async Task<IActionResult> GetJobOffers()
    {
        if (!TryRequireTenant(out var tenantId, out var tenantError)) return tenantError!;

        var page = QueryInt("page", 1, 1, int.MaxValue);
        var limit = QueryInt("limit", QueryInt("per_page", 50, 1, 200), 1, 200);
        var status = Request.Query["status"].FirstOrDefault();
        var query = _db.JobOffers.AsNoTracking().Where(o => o.TenantId == tenantId);
        if (!string.IsNullOrWhiteSpace(status))
        {
            query = query.Where(o => o.Status == status);
        }

        var total = await query.CountAsync();
        var items = await query
            .OrderByDescending(o => o.CreatedAt)
            .Skip((page - 1) * limit)
            .Take(limit)
            .Select(o => new
            {
                o.Id,
                job_id = o.JobId,
                application_id = o.ApplicationId,
                candidate_user_id = o.CandidateUserId,
                created_by_user_id = o.CreatedByUserId,
                o.Title,
                o.Message,
                time_credits_per_hour = o.TimeCreditsPerHour,
                o.Status,
                created_at = o.CreatedAt,
                updated_at = o.UpdatedAt
            })
            .ToListAsync();

        return Ok(new { data = items, meta = new { total, page, limit } });
    }

    private async Task<IActionResult> ModerateJob(int id, string action)
    {
        if (!TryRequireTenant(out var tenantId, out var tenantError)) return tenantError!;

        var payload = await ReadJsonObjectPayloadAsync();
        var job = await _db.JobVacancies.FirstOrDefaultAsync(j => j.TenantId == tenantId && j.Id == id);
        if (job == null)
        {
            return NotFound(new { error = "Job not found" });
        }

        var now = DateTime.UtcNow;
        var adminUserId = GetCurrentAdminUserId();
        switch (action)
        {
            case "approve":
                job.Status = "active";
                job.UpdatedAt = now;
                await _db.SaveChangesAsync();
                return Ok(new
                {
                    data = new
                    {
                        approved = true,
                        id = job.Id,
                        status = job.Status,
                        message = "Job approved",
                        admin_user_id = adminUserId,
                        notes = JsonString(payload, "notes")
                    }
                });

            case "reject":
            {
                var reason = JsonString(payload, "reason");
                if (string.IsNullOrWhiteSpace(reason))
                {
                    return UnprocessableEntity(new { error = "VALIDATION_REQUIRED", field = "reason" });
                }

                job.Status = "rejected";
                job.UpdatedAt = now;
                await _db.SaveChangesAsync();
                return Ok(new
                {
                    data = new
                    {
                        rejected = true,
                        id = job.Id,
                        status = job.Status,
                        reason,
                        message = "Job rejected",
                        admin_user_id = adminUserId
                    }
                });
            }

            case "flag":
            {
                var reason = JsonString(payload, "reason");
                if (string.IsNullOrWhiteSpace(reason))
                {
                    return UnprocessableEntity(new { error = "VALIDATION_REQUIRED", field = "reason" });
                }

                job.Status = "flagged";
                job.UpdatedAt = now;
                await _db.SaveChangesAsync();
                return Ok(new
                {
                    data = new
                    {
                        flagged = true,
                        id = job.Id,
                        status = job.Status,
                        reason,
                        message = "Job flagged",
                        admin_user_id = adminUserId
                    }
                });
            }

            default:
                return BadRequest(new { error = "Unsupported job moderation action" });
        }
    }

    private async Task<IActionResult> GetEvent(int id)
    {
        var item = await _db.Events.AsNoTracking().FirstOrDefaultAsync(e => e.Id == id);
        return item == null ? NotFound(new { error = "Event not found" }) : Ok(new { data = item });
    }

    private async Task<IActionResult> GetGroup(int id)
    {
        var item = await _db.Groups.AsNoTracking().FirstOrDefaultAsync(g => g.Id == id);
        return item == null ? NotFound(new { error = "Group not found" }) : Ok(new { data = item });
    }

    private IActionResult GetReportExportTypes()
    {
        return Ok(new { data = new[] { "csv", "json" } });
    }

    private IActionResult GetAdminReportExportCsv(string path)
    {
        var reportType = path["/api/v2/admin/reports/".Length..^"/export".Length];
        var csv = new StringBuilder();
        csv.AppendLine("report_type,generated_at,total");
        csv.AppendLine($"{Csv(reportType)},{DateTime.UtcNow:O},0");
        return File(Encoding.UTF8.GetBytes(csv.ToString()), "text/csv", $"{reportType.Replace('_', '-')}-report.csv");
    }

    private static bool IsAdminReportExportPath(string path) =>
        path.StartsWith("/api/v2/admin/reports/", StringComparison.OrdinalIgnoreCase)
        && path.EndsWith("/export", StringComparison.OrdinalIgnoreCase)
        && !path.Equals("/api/v2/admin/reports/export", StringComparison.OrdinalIgnoreCase);

    private async Task<IActionResult> GetSupportReports()
    {
        if (!TryRequireTenant(out var tenantId, out var tenantError)) return tenantError!;

        var page = QueryInt("page", 1, 1, int.MaxValue);
        var limit = QueryInt("limit", QueryInt("per_page", 20, 1, 100), 1, 100);
        var reports = await LoadSupportReports(tenantId);
        var filtered = ApplySupportReportFilters(reports).ToList();
        var total = filtered.Count;
        var totalPages = Math.Max(1, (int)Math.Ceiling(total / (double)limit));
        var pageReports = filtered
            .OrderByDescending(r => ParseDate(r.CreatedAt))
            .Skip((page - 1) * limit)
            .Take(limit)
            .ToList();
        var users = await LoadSupportReportUsers(pageReports);

        return Ok(new
        {
            data = pageReports.Select(r => FormatSupportReport(r, users, includeDiagnostics: false)).ToList(),
            meta = new
            {
                total,
                page,
                limit,
                per_page = limit,
                total_pages = totalPages
            }
        });
    }

    private async Task<IActionResult> GetSupportReport(int id)
    {
        if (!TryRequireTenant(out var tenantId, out var tenantError)) return tenantError!;

        var reports = await LoadSupportReports(tenantId);
        var report = reports.FirstOrDefault(r => r.Id == id);
        if (report == null)
        {
            return NotFound(new { error = "Support report not found" });
        }

        var users = await LoadSupportReportUsers(new[] { report });
        return Ok(new { data = FormatSupportReport(report, users, includeDiagnostics: true) });
    }

    private async Task<IActionResult> GetSupportReportStats()
    {
        if (!TryRequireTenant(out var tenantId, out var tenantError)) return tenantError!;

        var reports = await LoadSupportReports(tenantId);
        return Ok(new
        {
            data = new
            {
                total = reports.Count,
                open = reports.Count(r => r.Status == "open"),
                triaged = reports.Count(r => r.Status == "triaged"),
                resolved = reports.Count(r => r.Status == "resolved"),
                closed = reports.Count(r => r.Status == "closed"),
                blocked = reports.Count(r => r.Impact == "blocked"),
                major = reports.Count(r => r.Impact == "major"),
                unassigned = reports.Count(r => r.AssignedUserId == null && (r.Status == "open" || r.Status == "triaged"))
            }
        });
    }

    private async Task<IActionResult> GetSupportReportAssignees()
    {
        if (!TryRequireTenant(out var tenantId, out var tenantError)) return tenantError!;

        var users = await _db.Users
            .AsNoTracking()
            .Where(u => u.TenantId == tenantId && u.IsActive && (u.Role == "admin" || u.Role == "tenant_admin" || u.Role == "super_admin" || u.Role == "god"))
            .OrderBy(u => u.FirstName)
            .ThenBy(u => u.LastName)
            .Select(u => new
            {
                id = u.Id,
                name = ((u.FirstName + " " + u.LastName).Trim() == string.Empty ? u.Email : (u.FirstName + " " + u.LastName).Trim()),
                email = u.Email,
                avatar_url = u.AvatarUrl,
                role = u.Role
            })
            .ToListAsync();

        return Ok(new { data = new { assignees = users } });
    }

    private async Task<IActionResult> UpdateSupportReport(int id)
    {
        if (!TryRequireTenant(out var tenantId, out var tenantError)) return tenantError!;

        var reports = await LoadSupportReports(tenantId);
        var report = reports.FirstOrDefault(r => r.Id == id);
        if (report == null)
        {
            return NotFound(new { error = "Support report not found" });
        }

        var payloadJson = await ReadRequestPayloadJsonAsync();
        using var document = JsonDocument.Parse(payloadJson);
        if (document.RootElement.ValueKind != JsonValueKind.Object)
        {
            return UnprocessableEntity(new { error = "VALIDATION_FAILED", field = "body" });
        }

        var hasChanges = false;
        var now = DateTime.UtcNow.ToString("O", CultureInfo.InvariantCulture);
        if (TryFindProperty(document.RootElement, "status", out var statusProperty))
        {
            var status = statusProperty.GetString();
            if (!IsValidSupportReportStatus(status))
            {
                return UnprocessableEntity(new { error = "VALIDATION_FAILED", field = "status" });
            }

            report.Status = status!;
            if (status == "triaged" && string.IsNullOrWhiteSpace(report.TriagedAt)) report.TriagedAt = now;
            if (status == "resolved" && string.IsNullOrWhiteSpace(report.ResolvedAt)) report.ResolvedAt = now;
            if (status == "closed" && string.IsNullOrWhiteSpace(report.ClosedAt)) report.ClosedAt = now;
            hasChanges = true;
        }

        if (TryFindProperty(document.RootElement, "assigned_user_id", out var assignedProperty))
        {
            report.AssignedUserId = assignedProperty.ValueKind == JsonValueKind.Null ? null : assignedProperty.GetInt32();
            if (report.AssignedUserId != null && !await IsAssignableSupportReportAdmin(report.AssignedUserId.Value, tenantId))
            {
                return UnprocessableEntity(new { error = "VALIDATION_FAILED", field = "assigned_user_id" });
            }
            hasChanges = true;
        }

        if (TryFindProperty(document.RootElement, "triage_notes", out var triageNotesProperty))
        {
            report.TriageNotes = NullableJsonString(triageNotesProperty);
            hasChanges = true;
        }

        if (TryFindProperty(document.RootElement, "sentry_event_id", out var sentryEventProperty))
        {
            report.SentryEventId = NullableJsonString(sentryEventProperty);
            hasChanges = true;
        }

        if (TryFindProperty(document.RootElement, "sentry_issue_url", out var sentryIssueProperty))
        {
            report.SentryIssueUrl = NullableJsonString(sentryIssueProperty);
            hasChanges = true;
        }

        if (!hasChanges)
        {
            return UnprocessableEntity(new { error = "NO_CHANGES" });
        }

        report.UpdatedAt = now;
        await SaveSupportReports(reports);

        var users = await LoadSupportReportUsers(new[] { report });
        return Ok(new { data = FormatSupportReport(report, users, includeDiagnostics: true) });
    }

    private async Task<IActionResult> GetMemberPremiumSettings()
    {
        if (!TryRequireTenant(out var tenantId, out var tenantError)) return tenantError!;

        return Ok(new
        {
            data = new
            {
                settings = await BuildMemberPremiumSettings(tenantId)
            }
        });
    }

    private async Task<IActionResult> PutMemberPremiumSettings()
    {
        if (!TryRequireTenant(out var tenantId, out var tenantError)) return tenantError!;

        var payloadJson = await ReadRequestPayloadJsonAsync();
        var accountId = ExtractStringFromPayload(payloadJson, "stripe_connect_account_id")?.Trim() ?? string.Empty;
        if (!IsValidStripeConnectAccountId(accountId))
        {
            return UnprocessableEntity(new
            {
                error = "VALIDATION_ERROR",
                message = "Invalid Stripe Connect account ID.",
                field = "stripe_connect_account_id"
            });
        }

        await UpsertTenantConfigValueAsync(MemberPremiumConnectAccountKey, accountId);
        await _db.SaveChangesAsync();

        return Ok(new
        {
            data = new
            {
                settings = await BuildMemberPremiumSettings(tenantId)
            }
        });
    }

    private async Task<IActionResult> GetModerationSettings()
    {
        if (!TryRequireTenant(out _, out var tenantError)) return tenantError!;

        return Ok(new { data = await BuildModerationSettings() });
    }

    private async Task<IActionResult> PutModerationSettings()
    {
        if (!TryRequireTenant(out _, out var tenantError)) return tenantError!;

        var payload = await ReadJsonObjectPayloadAsync();
        foreach (var key in ModerationSettingKeys)
        {
            if (!payload.TryGetValue(key, out var value) || !TryReadBoolean(value, out var enabled))
            {
                continue;
            }

            await UpsertTenantConfigValueAsync(ModerationSettingPrefix + key, enabled ? "1" : "0");
        }

        await _db.SaveChangesAsync();
        return Ok(new
        {
            data = new
            {
                message = "Moderation settings updated",
                settings = await BuildModerationSettings()
            }
        });
    }

    private async Task<IActionResult> CreateMemberPremiumConnectOnboarding()
    {
        if (!TryRequireTenant(out var tenantId, out var tenantError)) return tenantError!;

        var accountId = await GetTenantConfigValueAsync(MemberPremiumConnectAccountKey);
        if (string.IsNullOrWhiteSpace(accountId))
        {
            accountId = $"acct_compat_{tenantId}_{DateTimeOffset.UtcNow.ToUnixTimeSeconds()}";
            await UpsertTenantConfigValueAsync(MemberPremiumConnectAccountKey, accountId);
            await _db.SaveChangesAsync();
        }

        return Ok(new
        {
            data = new
            {
                settings = await BuildMemberPremiumSettings(tenantId),
                onboarding_url = $"https://connect.stripe.com/setup/{accountId}"
            }
        });
    }

    private async Task<IActionResult> GetMemberPremiumFinanceOverview()
    {
        if (!TryRequireTenant(out var tenantId, out var tenantError)) return tenantError!;

        var rows = await _db.MoneyDonations
            .AsNoTracking()
            .Where(d => d.TenantId == tenantId)
            .ToListAsync();

        var completed = rows.Where(d => d.Status == MoneyDonationStatus.Succeeded).ToList();
        var refunded = rows.Where(d => d.Status == MoneyDonationStatus.Refunded).ToList();
        var pending = rows.Where(d => d.Status == MoneyDonationStatus.Pending).ToList();
        var failed = rows.Where(d => d.Status == MoneyDonationStatus.Failed || d.Status == MoneyDonationStatus.Cancelled).ToList();
        var disputes = await LoadMemberPremiumDisputes();

        return Ok(new
        {
            data = new
            {
                overview = new
                {
                    totals = new
                    {
                        completed_cents = completed.Sum(d => d.AmountMinorUnits),
                        refunded_cents = refunded.Sum(d => d.AmountMinorUnits),
                        pending_cents = pending.Sum(d => d.AmountMinorUnits),
                        failed_count = failed.Count
                    },
                    routing = new
                    {
                        platform_fallback_cents = completed.Sum(d => d.AmountMinorUnits),
                        tenant_connect_cents = 0L,
                        platform_fallback_count = completed.Count,
                        tenant_connect_count = 0
                    },
                    gift_aid = new
                    {
                        ready_cents = 0L,
                        ready_count = 0
                    },
                    recurring = new
                    {
                        active_count = await _db.UserSubscriptions.AsNoTracking().CountAsync(s => s.Status == SubscriptionStatus.Active),
                        past_due_count = 0,
                        canceled_count = await _db.UserSubscriptions.AsNoTracking().CountAsync(s => s.Status == SubscriptionStatus.Cancelled)
                    },
                    disputes = new
                    {
                        open_count = disputes.Count
                    },
                    receipts = new
                    {
                        failed_email_count = 0
                    }
                }
            }
        });
    }

    private async Task<IActionResult> GetMemberPremiumFinanceDisputes()
    {
        if (!TryRequireTenant(out _, out var tenantError)) return tenantError!;

        var limit = 50;
        if (int.TryParse(Request.Query["limit"].FirstOrDefault(), out var parsedLimit))
        {
            limit = Math.Clamp(parsedLimit, 1, 200);
        }

        var disputes = (await LoadMemberPremiumDisputes()).Take(limit).ToList();
        return Ok(new { data = new { items = disputes } });
    }

    private async Task<IActionResult> GetMemberPremiumGiftAidCsv()
    {
        if (!TryRequireTenant(out var tenantId, out var tenantError)) return tenantError!;

        var donations = await CompletedMemberPremiumDonations(tenantId).ToListAsync();
        var lines = new List<string>
        {
            "donation_id,donor_name,donor_email,amount,currency,declaration_name,address_line1,address_line2,town,postcode,country,consented_at,donation_date"
        };

        lines.AddRange(donations.Select(d => string.Join(',', new[]
        {
            d.Id.ToString(CultureInfo.InvariantCulture),
            Csv(d.DonorDisplayName),
            Csv(d.DonorEmail),
            FormatMinorUnits(d.AmountMinorUnits),
            Csv(d.Currency.ToUpperInvariant()),
            string.Empty,
            string.Empty,
            string.Empty,
            string.Empty,
            string.Empty,
            string.Empty,
            string.Empty,
            Csv((d.CompletedAt ?? d.CreatedAt).ToString("O", CultureInfo.InvariantCulture))
        })));

        return File(Encoding.UTF8.GetBytes(string.Join('\n', lines) + "\n"), "text/csv", "gift-aid-donations.csv");
    }

    private async Task<IActionResult> GetMemberPremiumAnnualReceiptsCsv()
    {
        if (!TryRequireTenant(out var tenantId, out var tenantError)) return tenantError!;

        var year = DateTime.UtcNow.Year;
        if (int.TryParse(Request.Query["year"].FirstOrDefault(), out var parsedYear)
            && parsedYear >= 2000
            && parsedYear <= DateTime.UtcNow.Year + 1)
        {
            year = parsedYear;
        }

        var donations = await _db.MoneyDonations
            .AsNoTracking()
            .Where(d => d.TenantId == tenantId
                && (d.Status == MoneyDonationStatus.Succeeded || d.Status == MoneyDonationStatus.Refunded)
                && d.CreatedAt.Year == year)
            .OrderBy(d => d.CreatedAt)
            .ToListAsync();

        var lines = new List<string>
        {
            "donation_id,user_id,donor_name,donor_email,amount,currency,status,payment_method,fund_code,payment_route,stripe_account_id,stripe_payment_intent_id,gift_aid_claim_status,donation_date"
        };

        lines.AddRange(donations.Select(d => string.Join(',', new[]
        {
            d.Id.ToString(CultureInfo.InvariantCulture),
            d.DonorUserId?.ToString(CultureInfo.InvariantCulture) ?? string.Empty,
            Csv(d.DonorDisplayName),
            Csv(d.DonorEmail),
            FormatMinorUnits(d.AmountMinorUnits),
            Csv(d.Currency.ToUpperInvariant()),
            Csv(ToLaravelDonationStatus(d.Status)),
            Csv("stripe"),
            Csv("general"),
            Csv("platform_default"),
            string.Empty,
            Csv(d.StripePaymentIntentId),
            Csv("not_eligible"),
            Csv((d.CompletedAt ?? d.CreatedAt).ToString("O", CultureInfo.InvariantCulture))
        })));

        return File(Encoding.UTF8.GetBytes(string.Join('\n', lines) + "\n"), "text/csv", $"donation-annual-receipts-{year}.csv");
    }

    private async Task<object> BuildMemberPremiumSettings(int tenantId)
    {
        var accountId = NormalizeStripeConnectAccountId(await GetTenantConfigValueAsync(MemberPremiumConnectAccountKey));
        var configuredRoute = accountId == string.Empty ? "platform_default" : "tenant_connect";
        var accountStatus = accountId == string.Empty
            ? new
            {
                state = "not_connected",
                charges_enabled = false,
                payouts_enabled = false,
                details_submitted = false,
                requirements_due = Array.Empty<string>(),
                disabled_reason = (string?)null,
                error = (string?)null
            }
            : new
            {
                state = "unknown",
                charges_enabled = false,
                payouts_enabled = false,
                details_submitted = false,
                requirements_due = Array.Empty<string>(),
                disabled_reason = (string?)null,
                error = (string?)"Stripe account status could not be checked."
            };

        return new
        {
            stripe_connect_account_id = accountId,
            active_stripe_account_id = string.Empty,
            payment_route = "platform_default",
            configured_payment_route = configuredRoute,
            account_status = accountStatus,
            fallback_reason = accountId == string.Empty ? null : "stripe_connect_not_ready"
        };
    }

    private async Task<Dictionary<string, bool>> BuildModerationSettings()
    {
        var settings = ModerationSettingKeys.ToDictionary(key => key, _ => false, StringComparer.OrdinalIgnoreCase);
        foreach (var key in ModerationSettingKeys)
        {
            var value = await GetTenantConfigValueAsync(ModerationSettingPrefix + key);
            settings[key] = IsStoredEnabled(value);
        }

        return settings;
    }

    private IQueryable<MoneyDonation> CompletedMemberPremiumDonations(int tenantId)
    {
        return _db.MoneyDonations
            .AsNoTracking()
            .Where(d => d.TenantId == tenantId && d.Status == MoneyDonationStatus.Succeeded)
            .OrderBy(d => d.CreatedAt);
    }

    private async Task<List<Dictionary<string, object?>>> LoadMemberPremiumDisputes()
    {
        var raw = await GetTenantConfigValueAsync(MemberPremiumDisputesKey);
        if (string.IsNullOrWhiteSpace(raw))
        {
            return new List<Dictionary<string, object?>>();
        }

        try
        {
            using var doc = JsonDocument.Parse(raw);
            if (doc.RootElement.ValueKind != JsonValueKind.Array)
            {
                return new List<Dictionary<string, object?>>();
            }

            return doc.RootElement.EnumerateArray()
                .Where(item => item.ValueKind == JsonValueKind.Object)
                .Select(item => item.EnumerateObject()
                    .ToDictionary(p => p.Name, p => ConvertJsonValue(p.Value), StringComparer.OrdinalIgnoreCase))
                .ToList();
        }
        catch (JsonException)
        {
            return new List<Dictionary<string, object?>>();
        }
    }

    private static bool IsValidStripeConnectAccountId(string accountId)
    {
        return accountId == string.Empty
            || (accountId.StartsWith("acct_", StringComparison.Ordinal) && accountId.Length > "acct_".Length && accountId.All(c => char.IsLetterOrDigit(c) || c == '_'));
    }

    private static string NormalizeStripeConnectAccountId(string? accountId)
    {
        var normalized = accountId?.Trim() ?? string.Empty;
        return IsValidStripeConnectAccountId(normalized) ? normalized : string.Empty;
    }

    private static string FormatMinorUnits(long minorUnits)
    {
        return (minorUnits / 100m).ToString("0.00", CultureInfo.InvariantCulture);
    }

    private static string ToLaravelDonationStatus(MoneyDonationStatus status)
    {
        return status switch
        {
            MoneyDonationStatus.Succeeded => "completed",
            MoneyDonationStatus.Refunded => "refunded",
            MoneyDonationStatus.Pending => "pending",
            MoneyDonationStatus.Failed => "failed",
            MoneyDonationStatus.Cancelled => "failed",
            _ => status.ToString().ToLowerInvariant()
        };
    }

    private async Task<List<SupportReportRecord>> LoadSupportReports(int tenantId)
    {
        var raw = await GetTenantConfigValueAsync(SupportReportsKey);
        if (string.IsNullOrWhiteSpace(raw))
        {
            return new List<SupportReportRecord>();
        }

        try
        {
            var records = JsonSerializer.Deserialize<List<SupportReportRecord>>(raw, StoreJsonOptions) ?? new List<SupportReportRecord>();
            return records.Where(r => r.TenantId == tenantId).ToList();
        }
        catch (JsonException)
        {
            return new List<SupportReportRecord>();
        }
    }

    private async Task SaveSupportReports(List<SupportReportRecord> reports)
    {
        var json = JsonSerializer.Serialize(reports.OrderBy(r => r.Id).ToList(), StoreJsonOptions);
        await UpsertTenantConfigValueAsync(SupportReportsKey, json);
        await _db.SaveChangesAsync();
    }

    private IEnumerable<SupportReportRecord> ApplySupportReportFilters(IEnumerable<SupportReportRecord> reports)
    {
        var status = Request.Query["status"].FirstOrDefault();
        if (IsValidSupportReportStatus(status))
        {
            reports = reports.Where(r => r.Status == status);
        }

        var impact = Request.Query["impact"].FirstOrDefault();
        if (impact is "blocked" or "major" or "minor" or "cosmetic")
        {
            reports = reports.Where(r => r.Impact == impact);
        }

        var search = Request.Query["search"].FirstOrDefault()?.Trim();
        if (!string.IsNullOrWhiteSpace(search))
        {
            reports = reports.Where(r =>
                ContainsIgnoreCase(r.Reference, search) ||
                ContainsIgnoreCase(r.Summary, search) ||
                ContainsIgnoreCase(r.Description, search) ||
                ContainsIgnoreCase(r.Route, search));
        }

        return reports;
    }

    private async Task<Dictionary<int, User>> LoadSupportReportUsers(IEnumerable<SupportReportRecord> reports)
    {
        var userIds = reports
            .SelectMany(r => new[] { r.UserId, r.AssignedUserId })
            .Where(id => id.HasValue)
            .Select(id => id!.Value)
            .Distinct()
            .ToList();

        if (userIds.Count == 0)
        {
            return new Dictionary<int, User>();
        }

        return await _db.Users
            .AsNoTracking()
            .Where(u => userIds.Contains(u.Id))
            .ToDictionaryAsync(u => u.Id);
    }

    private static object FormatSupportReport(SupportReportRecord report, IReadOnlyDictionary<int, User> users, bool includeDiagnostics)
    {
        var payload = new Dictionary<string, object?>
        {
            ["id"] = report.Id,
            ["tenant_id"] = report.TenantId,
            ["tenant_name"] = null,
            ["user_id"] = report.UserId,
            ["assigned_user_id"] = report.AssignedUserId,
            ["reference"] = report.Reference,
            ["source"] = report.Source,
            ["summary"] = report.Summary,
            ["description"] = report.Description,
            ["impact"] = report.Impact,
            ["status"] = report.Status,
            ["module"] = report.Module,
            ["route"] = report.Route,
            ["page_url"] = report.PageUrl,
            ["sentry_event_id"] = report.SentryEventId,
            ["sentry_issue_url"] = report.SentryIssueUrl,
            ["user_agent"] = report.UserAgent,
            ["triage_notes"] = report.TriageNotes,
            ["triaged_at"] = report.TriagedAt,
            ["resolved_at"] = report.ResolvedAt,
            ["closed_at"] = report.ClosedAt,
            ["created_at"] = report.CreatedAt,
            ["updated_at"] = report.UpdatedAt,
            ["reporter"] = report.UserId.HasValue && users.TryGetValue(report.UserId.Value, out var reporter) ? FormatSupportReportUser(reporter) : null,
            ["assignee"] = report.AssignedUserId.HasValue && users.TryGetValue(report.AssignedUserId.Value, out var assignee) ? FormatSupportReportUser(assignee) : null
        };

        if (includeDiagnostics)
        {
            payload["diagnostics"] = report.Diagnostics?.ValueKind == JsonValueKind.Undefined ? null : report.Diagnostics;
        }

        return payload;
    }

    private static object FormatSupportReportUser(User user)
    {
        var name = $"{user.FirstName} {user.LastName}".Trim();
        return new
        {
            id = user.Id,
            name = string.IsNullOrWhiteSpace(name) ? user.Email : name,
            email = user.Email,
            avatar_url = user.AvatarUrl,
            role = user.Role
        };
    }

    private async Task<bool> IsAssignableSupportReportAdmin(int userId, int tenantId)
    {
        return await _db.Users
            .AsNoTracking()
            .AnyAsync(u => u.Id == userId
                && u.TenantId == tenantId
                && u.IsActive
                && (u.Role == "admin" || u.Role == "tenant_admin" || u.Role == "super_admin" || u.Role == "god"));
    }

    private int QueryInt(string key, int fallback, int min, int max)
    {
        if (!int.TryParse(Request.Query[key].FirstOrDefault(), out var parsed))
        {
            return fallback;
        }

        return Math.Clamp(parsed, min, max);
    }

    private static bool IsValidSupportReportStatus(string? status)
    {
        return status is "open" or "triaged" or "resolved" or "closed";
    }

    private static bool ContainsIgnoreCase(string? haystack, string needle)
    {
        return haystack?.Contains(needle, StringComparison.OrdinalIgnoreCase) == true;
    }

    private static string? NullableJsonString(JsonElement value)
    {
        return value.ValueKind == JsonValueKind.Null ? null : value.GetString()?.Trim();
    }

    private static DateTime ParseDate(string? value)
    {
        return DateTime.TryParse(value, CultureInfo.InvariantCulture, DateTimeStyles.AdjustToUniversal, out var parsed)
            ? parsed
            : DateTime.MinValue;
    }

    private async Task<IActionResult> GetPersistedCompatibilityRead(string path)
    {
        if (!TryRequireTenant(out var tenantId, out var tenantError)) return tenantError!;

        // Primary read path — typed CompatibilityAuditEntry rows.
        // CLAUDE.md path-to-1000 item 12: replace TenantConfig JSON blob audit
        // with a real audit trail. Kept the legacy JSON-blob fallback below
        // until existing test fixtures stop asserting on the TenantConfig key
        // shape (see AdminExplicitParityControllerTests).
        var typedEntries = await _db.CompatibilityAuditEntries
            .AsNoTracking()
            .Where(e => e.TenantId == tenantId && e.Endpoint == path)
            .OrderByDescending(e => e.OccurredAt)
            .Take(50)
            .ToListAsync();

        if (typedEntries.Count > 0)
        {
            return Ok(new
            {
                data = typedEntries.Select(ToCompatibilityAuditResponse).ToList(),
                meta = new
                {
                    total = typedEntries.Count,
                    source = "compatibility_audit_entries",
                    path
                },
                // The "tenant_config_record" mode label is preserved as a
                // compatibility contract for existing parity tests; the
                // underlying storage is now a typed audit entity.
                compatibility = new
                {
                    mode = "tenant_config_record",
                    side_effect = "read_recorded_writes_only"
                }
            });
        }

        // Legacy fallback — TenantConfig JSON blob. Kept temporarily so old
        // rows recorded before the typed table existed remain readable.
        var records = await LoadStoredRecordsAsync(CompatibilityWritesKey);
        var matching = records
            .Where(r => string.Equals(r.Path, path, StringComparison.OrdinalIgnoreCase))
            .OrderByDescending(r => r.UpdatedAt)
            .Select(ToResponseRecord)
            .ToList();

        return Ok(new
        {
            data = matching,
            meta = new
            {
                total = matching.Count,
                source = "tenant_config",
                path
            },
            compatibility = new
            {
                mode = "tenant_config_record",
                side_effect = "read_recorded_writes_only"
            }
        });
    }

    private async Task<IActionResult> PersistCompatibilityWrite(string action)
    {
        if (!TryRequireTenant(out var tenantId, out var tenantError)) return tenantError!;

        var payloadJson = await ReadRequestPayloadJsonAsync();
        var now = DateTime.UtcNow;

        // Primary (and now only) audit trail — typed CompatibilityAuditEntry row.
        // The legacy TenantConfig JSON dual-write was removed as part of the
        // audit cleanup (CLAUDE.md path-to-1000 item 12). The read endpoint
        // still falls back to the legacy storage for rows recorded before
        // the typed table existed, but new writes only land in the typed table.
        var auditEntry = new CompatibilityAuditEntry
        {
            TenantId = tenantId,
            UserId = GetCurrentAdminUserId(),
            Endpoint = Request.Path.Value ?? string.Empty,
            HttpMethod = Request.Method ?? string.Empty,
            Action = action,
            RequestBody = payloadJson,
            // Response body is filled in below once the audit row has an Id
            // (so the response can echo the persisted Id back to the client).
            ResponseBody = "{}",
            StatusCode = StatusCodes.Status202Accepted,
            OccurredAt = now
        };
        _db.CompatibilityAuditEntries.Add(auditEntry);
        await _db.SaveChangesAsync();

        var responseBody = new
        {
            success = true,
            data = ToCompatibilityAuditResponse(auditEntry),
            compatibility = new
            {
                mode = "tenant_config_record",
                side_effect = "recorded_only"
            }
        };

        // Backfill the persisted response payload for replay by the read path.
        auditEntry.ResponseBody = JsonSerializer.Serialize(responseBody, StoreJsonOptions);
        await _db.SaveChangesAsync();

        return Accepted(responseBody);
    }

    /// <summary>
    /// Maps a typed <see cref="CompatibilityAuditEntry"/> row to the
    /// dictionary shape returned by the legacy
    /// <see cref="GetPersistedCompatibilityRead"/> path so existing parity
    /// consumers do not see a shape change.
    /// </summary>
    private static object ToCompatibilityAuditResponse(CompatibilityAuditEntry entry)
    {
        return new Dictionary<string, object?>
        {
            ["id"] = entry.Id,
            ["kind"] = "admin_explicit_parity_write",
            ["name"] = $"{entry.HttpMethod} {entry.Endpoint}",
            ["status"] = "recorded",
            ["payload"] = ParseStoredPayload(entry.RequestBody),
            ["path"] = entry.Endpoint,
            ["method"] = entry.HttpMethod,
            ["action"] = entry.Action,
            ["admin_user_id"] = entry.UserId,
            ["created_at"] = entry.OccurredAt,
            ["updated_at"] = entry.OccurredAt,
            ["deleted_at"] = (DateTime?)null
        };
    }

    private bool TryRequireTenant(out int tenantId, out IActionResult? error)
    {
        if (_db.CurrentTenantId.HasValue)
        {
            tenantId = _db.CurrentTenantId.Value;
            error = null;
            return true;
        }

        tenantId = 0;
        error = BadRequest(new
        {
            error = "tenant_context_required",
            message = "Admin explicit parity persistence requires a resolved tenant context."
        });
        return false;
    }

    private async Task<string?> GetTenantConfigValueAsync(string key)
    {
        return await _db.TenantConfigs
            .AsNoTracking()
            .Where(c => c.Key == key)
            .Select(c => c.Value)
            .FirstOrDefaultAsync();
    }

    private async Task UpsertTenantConfigValueAsync(string key, string value)
    {
        if (!TryRequireTenant(out var tenantId, out _))
        {
            throw new InvalidOperationException("Tenant context is required to persist admin parity config.");
        }

        var existing = await _db.TenantConfigs.FirstOrDefaultAsync(c => c.Key == key);
        if (existing != null)
        {
            existing.Value = value;
            existing.UpdatedAt = DateTime.UtcNow;
            return;
        }

        _db.TenantConfigs.Add(new TenantConfig
        {
            TenantId = tenantId,
            Key = key,
            Value = value,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        });
    }

    private async Task<string> ReadRequestPayloadJsonAsync()
    {
        Request.EnableBuffering();
        if (Request.Body.CanSeek)
        {
            Request.Body.Position = 0;
        }

        using var reader = new StreamReader(Request.Body, Encoding.UTF8, detectEncodingFromByteOrderMarks: false, leaveOpen: true);
        var raw = await reader.ReadToEndAsync();

        if (Request.Body.CanSeek)
        {
            Request.Body.Position = 0;
        }

        return NormalizePayloadJson(raw);
    }

    private async Task<Dictionary<string, JsonElement>> ReadJsonObjectPayloadAsync()
    {
        var payloadJson = await ReadRequestPayloadJsonAsync();
        try
        {
            return JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(payloadJson, StoreJsonOptions)
                ?? new Dictionary<string, JsonElement>(StringComparer.OrdinalIgnoreCase);
        }
        catch (JsonException)
        {
            return new Dictionary<string, JsonElement>(StringComparer.OrdinalIgnoreCase);
        }
    }

    private async Task<List<StoredParityRecord>> LoadStoredRecordsAsync(string key, bool includeDeleted = false)
    {
        var raw = await GetTenantConfigValueAsync(key);
        if (string.IsNullOrWhiteSpace(raw))
        {
            return new List<StoredParityRecord>();
        }

        try
        {
            var records = JsonSerializer.Deserialize<List<StoredParityRecord>>(raw, StoreJsonOptions) ?? new List<StoredParityRecord>();
            return records
                .Where(r => includeDeleted || r.DeletedAt == null)
                .OrderBy(r => r.Id)
                .ToList();
        }
        catch (JsonException)
        {
            return new List<StoredParityRecord>();
        }
    }

    private async Task SaveStoredRecordsAsync(string key, List<StoredParityRecord> records)
    {
        var json = JsonSerializer.Serialize(records.OrderBy(r => r.Id).ToList(), StoreJsonOptions);
        await UpsertTenantConfigValueAsync(key, json);
        await _db.SaveChangesAsync();
    }

    private async Task<List<FederationCreditAgreementRecord>> LoadFederationCreditAgreements()
    {
        var raw = await GetTenantConfigValueAsync(FederationCreditAgreementsKey);
        if (string.IsNullOrWhiteSpace(raw))
        {
            return new List<FederationCreditAgreementRecord>();
        }

        try
        {
            return JsonSerializer.Deserialize<List<FederationCreditAgreementRecord>>(raw, StoreJsonOptions)
                ?? new List<FederationCreditAgreementRecord>();
        }
        catch (JsonException)
        {
            return new List<FederationCreditAgreementRecord>();
        }
    }

    private async Task SaveFederationCreditAgreements(List<FederationCreditAgreementRecord> records)
    {
        var json = JsonSerializer.Serialize(records.OrderBy(r => r.Id).ToList(), StoreJsonOptions);
        await UpsertTenantConfigValueAsync(FederationCreditAgreementsKey, json);
        await _db.SaveChangesAsync();
    }

    private async Task<Dictionary<int, Tenant>> LoadTenantLookup(IEnumerable<int> tenantIds)
    {
        var ids = tenantIds.Distinct().ToArray();
        return await _db.Tenants
            .AsNoTracking()
            .Where(t => ids.Contains(t.Id))
            .ToDictionaryAsync(t => t.Id);
    }

    private StoredParityRecord BuildStoredRecord(int id, string kind, string action, string payloadJson, DateTime now)
    {
        return new StoredParityRecord
        {
            Id = id,
            Kind = kind,
            Name = ExtractNameFromPayload(payloadJson) ?? $"{kind}-{id}",
            Status = ExtractStatusFromPayload(payloadJson),
            PayloadJson = payloadJson,
            Path = Request.Path.Value,
            Method = Request.Method,
            Action = action,
            AdminUserId = GetCurrentAdminUserId(),
            CreatedAt = now,
            UpdatedAt = now
        };
    }

    private void ApplyStoredRecordUpdate(StoredParityRecord record, string payloadJson, string action, DateTime now)
    {
        record.Name = ExtractNameFromPayload(payloadJson) ?? record.Name;
        record.Status = ExtractStatusFromPayload(payloadJson, record.Status);
        record.PayloadJson = payloadJson;
        record.Path = Request.Path.Value;
        record.Method = Request.Method;
        record.Action = action;
        record.AdminUserId = GetCurrentAdminUserId();
        record.DeletedAt = null;
        record.UpdatedAt = now;
    }

    private async Task<HashSet<string>> GetSubscribedTopicKeys()
    {
        var stored = await GetTenantConfigValueAsync(FederationTopicSubscriptionsKey);
        return ExtractTopicKeys(stored);
    }

    private static HashSet<string> ExtractTopicKeys(string? payloadJson)
    {
        var topics = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        if (string.IsNullOrWhiteSpace(payloadJson))
        {
            return topics;
        }

        try
        {
            using var doc = JsonDocument.Parse(payloadJson);
            AddTopicKeys(doc.RootElement, topics);
        }
        catch (JsonException)
        {
            return topics;
        }

        return topics;
    }

    private static void AddTopicKeys(JsonElement element, ISet<string> topics)
    {
        if (element.ValueKind == JsonValueKind.Array)
        {
            foreach (var item in element.EnumerateArray())
            {
                AddTopicKeys(item, topics);
            }

            return;
        }

        if (element.ValueKind == JsonValueKind.String)
        {
            var value = element.GetString();
            if (!string.IsNullOrWhiteSpace(value))
            {
                topics.Add(value);
            }

            return;
        }

        if (element.ValueKind != JsonValueKind.Object)
        {
            return;
        }

        if (TryFindProperty(element, "topics", out var topicsArray) || TryFindProperty(element, "subscriptions", out topicsArray))
        {
            AddTopicKeys(topicsArray, topics);
        }

        if (TryFindProperty(element, "key", out var keyElement) || TryFindProperty(element, "topic", out keyElement) || TryFindProperty(element, "slug", out keyElement))
        {
            var key = JsonElementToString(keyElement);
            if (!string.IsNullOrWhiteSpace(key))
            {
                topics.Add(key);
            }
        }

        foreach (var property in element.EnumerateObject())
        {
            if (property.Value.ValueKind is JsonValueKind.True or JsonValueKind.False)
            {
                if (property.Value.GetBoolean())
                {
                    topics.Add(property.Name);
                }
            }
        }
    }

    private static IEnumerable<(int id, string key, string name, string description)> DefaultFederationTopics()
    {
        return new[]
        {
            (1, "listings.shared", "Shared listings", "Listings published to federation partners."),
            (2, "events.shared", "Shared events", "Events visible across federation partners."),
            (3, "members.directory", "Member directory", "Member directory records shared by approved partnerships."),
            (4, "exchanges.completed", "Completed exchanges", "Completed exchange summaries for cross-tenant accounting."),
            (5, "credit.agreements", "Credit agreements", "Federated credit agreement and exchange-rate updates."),
            (6, "gdpr.aggregate_consent", "Aggregate consent", "Aggregate consent state for federation data sharing."),
            (7, "webhooks.delivery", "Webhook delivery", "Outbound federation webhook delivery status.")
        };
    }

    private static object ToResponseRecord(StoredParityRecord record)
    {
        return new Dictionary<string, object?>
        {
            ["id"] = record.Id,
            ["kind"] = record.Kind,
            ["name"] = record.Name,
            ["status"] = record.Status,
            ["payload"] = ParseStoredPayload(record.PayloadJson),
            ["path"] = record.Path,
            ["method"] = record.Method,
            ["action"] = record.Action,
            ["admin_user_id"] = record.AdminUserId,
            ["created_at"] = record.CreatedAt,
            ["updated_at"] = record.UpdatedAt,
            ["deleted_at"] = record.DeletedAt
        };
    }

    private static object FormatFederationCreditAgreement(
        FederationCreditAgreementRecord record,
        IReadOnlyDictionary<int, Tenant> tenants)
    {
        tenants.TryGetValue(record.FromTenantId, out var fromTenant);
        tenants.TryGetValue(record.ToTenantId, out var toTenant);

        return new Dictionary<string, object?>
        {
            ["id"] = record.Id,
            ["from_tenant_id"] = record.FromTenantId,
            ["from_tenant_name"] = fromTenant?.Name ?? string.Empty,
            ["from_tenant_slug"] = fromTenant?.Slug ?? string.Empty,
            ["to_tenant_id"] = record.ToTenantId,
            ["to_tenant_name"] = toTenant?.Name ?? string.Empty,
            ["to_tenant_slug"] = toTenant?.Slug ?? string.Empty,
            ["partner_tenant"] = toTenant == null
                ? null
                : new
                {
                    id = toTenant.Id,
                    name = toTenant.Name,
                    slug = toTenant.Slug
                },
            ["exchange_rate"] = record.ExchangeRate,
            ["max_monthly_credits"] = record.MaxMonthlyCredits,
            ["monthly_limit"] = record.MaxMonthlyCredits,
            ["current_balance"] = 0m,
            ["credits_sent"] = 0m,
            ["credits_received"] = 0m,
            ["status"] = record.Status,
            ["approved_by_from"] = record.ApprovedByFrom,
            ["approved_by_to"] = record.ApprovedByTo,
            ["created_at"] = record.CreatedAt,
            ["updated_at"] = record.UpdatedAt
        };
    }

    private static object? ParseStoredPayload(string? payloadJson)
    {
        if (string.IsNullOrWhiteSpace(payloadJson))
        {
            return new Dictionary<string, object?>();
        }

        try
        {
            using var doc = JsonDocument.Parse(payloadJson);
            return ConvertJsonValue(doc.RootElement);
        }
        catch (JsonException)
        {
            return payloadJson;
        }
    }

    private static object? ConvertJsonValue(JsonElement value)
    {
        return value.ValueKind switch
        {
            JsonValueKind.Object => value.EnumerateObject()
                .ToDictionary(p => p.Name, p => ConvertJsonValue(p.Value), StringComparer.OrdinalIgnoreCase),
            JsonValueKind.Array => value.EnumerateArray().Select(ConvertJsonValue).ToList(),
            JsonValueKind.String => value.GetString(),
            JsonValueKind.Number when value.TryGetInt64(out var longValue) => longValue,
            JsonValueKind.Number when value.TryGetDecimal(out var decimalValue) => decimalValue,
            JsonValueKind.True => true,
            JsonValueKind.False => false,
            JsonValueKind.Null => null,
            _ => value.GetRawText()
        };
    }

    private static bool TryReadBoolean(JsonElement value, out bool result)
    {
        switch (value.ValueKind)
        {
            case JsonValueKind.True:
                result = true;
                return true;
            case JsonValueKind.False:
                result = false;
                return true;
            case JsonValueKind.Number when value.TryGetInt32(out var intValue):
                result = intValue != 0;
                return true;
            case JsonValueKind.String:
                return TryReadBooleanString(value.GetString(), out result);
            default:
                result = false;
                return false;
        }
    }

    private static bool IsStoredEnabled(string? value)
    {
        return TryReadBooleanString(value, out var result) && result;
    }

    private static bool TryReadBooleanString(string? value, out bool result)
    {
        var normalized = value?.Trim();
        if (string.IsNullOrEmpty(normalized))
        {
            result = false;
            return false;
        }

        if (normalized is "1")
        {
            result = true;
            return true;
        }

        if (normalized is "0")
        {
            result = false;
            return true;
        }

        return bool.TryParse(normalized, out result);
    }

    private static int CountPayloadItems(object? payload)
    {
        return payload switch
        {
            null => 0,
            IReadOnlyCollection<object?> collection => collection.Count,
            IReadOnlyDictionary<string, object?> dictionary when dictionary.TryGetValue("topics", out var topics) => CountPayloadItems(topics),
            IReadOnlyDictionary<string, object?> dictionary => dictionary.Count,
            _ => 1
        };
    }

    private static string NormalizePayloadJson(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw))
        {
            return "{}";
        }

        try
        {
            using var _ = JsonDocument.Parse(raw);
            return raw;
        }
        catch (JsonException)
        {
            return JsonSerializer.Serialize(new { raw }, StoreJsonOptions);
        }
    }

    private static int NextStoredRecordId(IReadOnlyCollection<StoredParityRecord> records)
    {
        return records.Count == 0 ? 1 : records.Max(r => r.Id) + 1;
    }

    private static int? ExtractIntFromPayload(string payloadJson, string propertyName)
    {
        try
        {
            using var doc = JsonDocument.Parse(payloadJson);
            if (doc.RootElement.ValueKind != JsonValueKind.Object || !TryFindProperty(doc.RootElement, propertyName, out var property))
            {
                return null;
            }

            if (property.ValueKind == JsonValueKind.Number && property.TryGetInt32(out var number))
            {
                return number;
            }

            if (property.ValueKind == JsonValueKind.String && int.TryParse(property.GetString(), out var parsed))
            {
                return parsed;
            }
        }
        catch (JsonException)
        {
            return null;
        }

        return null;
    }

    private static string? ExtractNameFromPayload(string payloadJson)
    {
        return ExtractStringFromPayload(payloadJson, "name", "title", "label", "topic", "key", "slug", "url", "endpoint", "target_url");
    }

    private static string ExtractStatusFromPayload(string payloadJson, string fallback = "active")
    {
        var status = ExtractStringFromPayload(payloadJson, "status", "state");
        if (!string.IsNullOrWhiteSpace(status))
        {
            return status;
        }

        var enabled = ExtractBoolFromPayload(payloadJson, "enabled", "active", "is_active");
        if (enabled.HasValue)
        {
            return enabled.Value ? "active" : "disabled";
        }

        return fallback;
    }

    private static string? ExtractStringFromPayload(string payloadJson, params string[] propertyNames)
    {
        try
        {
            using var doc = JsonDocument.Parse(payloadJson);
            if (doc.RootElement.ValueKind != JsonValueKind.Object)
            {
                return null;
            }

            foreach (var propertyName in propertyNames)
            {
                if (TryFindProperty(doc.RootElement, propertyName, out var property))
                {
                    return JsonElementToString(property);
                }
            }
        }
        catch (JsonException)
        {
            return null;
        }

        return null;
    }

    private static bool? ExtractBoolFromPayload(string payloadJson, params string[] propertyNames)
    {
        try
        {
            using var doc = JsonDocument.Parse(payloadJson);
            if (doc.RootElement.ValueKind != JsonValueKind.Object)
            {
                return null;
            }

            foreach (var propertyName in propertyNames)
            {
                if (!TryFindProperty(doc.RootElement, propertyName, out var property))
                {
                    continue;
                }

                if (property.ValueKind is JsonValueKind.True or JsonValueKind.False)
                {
                    return property.GetBoolean();
                }

                if (property.ValueKind == JsonValueKind.String && bool.TryParse(property.GetString(), out var parsed))
                {
                    return parsed;
                }
            }
        }
        catch (JsonException)
        {
            return null;
        }

        return null;
    }

    private static bool TryFindProperty(JsonElement element, string propertyName, out JsonElement property)
    {
        foreach (var candidate in element.EnumerateObject())
        {
            if (string.Equals(candidate.Name, propertyName, StringComparison.OrdinalIgnoreCase))
            {
                property = candidate.Value;
                return true;
            }
        }

        property = default;
        return false;
    }

    private static string? JsonElementToString(JsonElement value)
    {
        return value.ValueKind switch
        {
            JsonValueKind.String => value.GetString(),
            JsonValueKind.Number => value.GetRawText(),
            JsonValueKind.True => "true",
            JsonValueKind.False => "false",
            JsonValueKind.Null => null,
            _ => value.GetRawText()
        };
    }

    private static string? JsonString(Dictionary<string, JsonElement> payload, string key)
    {
        foreach (var item in payload)
        {
            if (string.Equals(item.Key, key, StringComparison.OrdinalIgnoreCase))
            {
                return JsonElementToString(item.Value)?.Trim();
            }
        }

        return null;
    }

    private static int JsonInt(Dictionary<string, JsonElement> payload, string key, int fallback, int min, int max)
    {
        foreach (var item in payload)
        {
            if (!string.Equals(item.Key, key, StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            int? parsed = item.Value.ValueKind switch
            {
                JsonValueKind.Number when item.Value.TryGetInt32(out var number) => number,
                JsonValueKind.String when int.TryParse(item.Value.GetString(), NumberStyles.Integer, CultureInfo.InvariantCulture, out var number) => number,
                _ => null
            };

            return Math.Clamp(parsed ?? fallback, min, max);
        }

        return fallback;
    }

    private static decimal JsonDecimal(Dictionary<string, JsonElement> payload, string key, decimal fallback)
    {
        foreach (var item in payload)
        {
            if (!string.Equals(item.Key, key, StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            return item.Value.ValueKind switch
            {
                JsonValueKind.Number when item.Value.TryGetDecimal(out var number) => number,
                JsonValueKind.String when decimal.TryParse(item.Value.GetString(), NumberStyles.Number, CultureInfo.InvariantCulture, out var number) => number,
                _ => fallback
            };
        }

        return fallback;
    }

    private static string? Truncate(string? value, int maxLength)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        var trimmed = value.Trim();
        return trimmed.Length <= maxLength ? trimmed : trimmed[..maxLength];
    }

    private async Task<string> GenerateUniqueInviteCode(int tenantId)
    {
        const string chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

        for (var attempt = 0; attempt < 10; attempt++)
        {
            var code = RandomInviteCode(chars, length: 8);
            var exists = await _db.TenantInviteCodes
                .AsNoTracking()
                .AnyAsync(c => c.TenantId == tenantId && c.Code == code);

            if (!exists)
            {
                return code;
            }
        }

        return RandomInviteCode(chars, length: 12);
    }

    private static string RandomInviteCode(string chars, int length)
    {
        var buffer = new char[length];
        for (var i = 0; i < buffer.Length; i++)
        {
            buffer[i] = chars[RandomNumberGenerator.GetInt32(chars.Length)];
        }

        return new string(buffer);
    }

    private static string FederationWebhookLogsKey(int webhookId)
    {
        return $"admin_explicit.federation.webhook_logs.{webhookId}";
    }

    private static object CompatibilityMetadata(string key)
    {
        return new
        {
            mode = "tenant_config",
            key,
            side_effect = "json_persisted"
        };
    }

    private int? GetCurrentAdminUserId()
    {
        var userId = User.FindFirst("sub")?.Value ?? User.FindFirst("user_id")?.Value;
        return int.TryParse(userId, out var parsed) ? parsed : null;
    }

    private async Task<decimal> ActiveMonthlyRevenue()
    {
        return await _db.UserSubscriptions
            .AsNoTracking()
            .Where(s => s.Status == SubscriptionStatus.Active)
            .Select(s => s.Plan == null ? 0 : s.Plan.Price)
            .SumAsync();
    }

    private async Task<string> DefaultBillingCurrency()
    {
        return await _db.SubscriptionPlans
            .AsNoTracking()
            .OrderBy(p => p.Id)
            .Select(p => p.Currency)
            .FirstOrDefaultAsync() ?? "EUR";
    }

    private static bool TryGetLastInt(string path, string prefix, out int id)
    {
        id = 0;
        if (!path.StartsWith(prefix, StringComparison.Ordinal)) return false;

        var tail = path[prefix.Length..];
        if (tail.Contains('/')) return false;

        return int.TryParse(tail, out id);
    }

    private static bool TryGetIntBeforeSuffix(string path, string prefix, string suffix, out int id)
    {
        id = 0;
        if (!path.StartsWith(prefix, StringComparison.Ordinal) || !path.EndsWith(suffix, StringComparison.Ordinal)) return false;

        var tail = path[prefix.Length..^suffix.Length];
        if (tail.Contains('/')) return false;

        return int.TryParse(tail, out id);
    }

    private static bool TryGetJobModerationAction(string path, out int id, out string action)
    {
        id = 0;
        action = string.Empty;

        const string prefix = "/api/v2/admin/jobs/";
        if (!path.StartsWith(prefix, StringComparison.Ordinal))
        {
            return false;
        }

        var parts = path[prefix.Length..].Split('/', StringSplitOptions.RemoveEmptyEntries);
        if (parts.Length != 2 || !int.TryParse(parts[0], out id))
        {
            return false;
        }

        action = parts[1];
        return action is "approve" or "reject" or "flag";
    }

    private static bool TryGetFederationCreditAgreementAction(string path, out int id, out string action)
    {
        id = 0;
        action = string.Empty;

        const string prefix = "/api/v2/admin/federation/credit-agreements/";
        if (!path.StartsWith(prefix, StringComparison.Ordinal))
        {
            return false;
        }

        var parts = path[prefix.Length..].Split('/', StringSplitOptions.RemoveEmptyEntries);
        if (parts.Length != 2 || !int.TryParse(parts[0], out id))
        {
            return false;
        }

        action = parts[1];
        return action is "approve" or "reject" or "suspend" or "activate" or "reactivate" or "terminate";
    }

    private static bool TryGetSlugBeforeSuffix(string path, string prefix, string suffix, out string slug)
    {
        slug = string.Empty;
        if (!path.StartsWith(prefix, StringComparison.Ordinal) || !path.EndsWith(suffix, StringComparison.Ordinal)) return false;

        slug = path[prefix.Length..^suffix.Length];
        return !string.IsNullOrWhiteSpace(slug) && !slug.Contains('/');
    }

    private static string Csv(string? value)
    {
        value ??= string.Empty;
        return "\"" + value.Replace("\"", "\"\"") + "\"";
    }

    private sealed class StoredParityRecord
    {
        public int Id { get; set; }
        public string Kind { get; set; } = string.Empty;
        public string? Name { get; set; }
        public string Status { get; set; } = "active";
        public string PayloadJson { get; set; } = "{}";
        public string? Path { get; set; }
        public string? Method { get; set; }
        public string? Action { get; set; }
        public int? AdminUserId { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? DeletedAt { get; set; }
    }

    private sealed class FederationCreditAgreementRecord
    {
        public int Id { get; set; }
        public int FromTenantId { get; set; }
        public int ToTenantId { get; set; }
        public decimal ExchangeRate { get; set; }
        public decimal? MaxMonthlyCredits { get; set; }
        public string Status { get; set; } = "pending";
        public int? ApprovedByFrom { get; set; }
        public int? ApprovedByTo { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }

    private sealed class SupportReportRecord
    {
        public int Id { get; set; }
        public int TenantId { get; set; }
        public int? UserId { get; set; }
        public int? AssignedUserId { get; set; }
        public string Reference { get; set; } = string.Empty;
        public string Source { get; set; } = "in_app";
        public string Summary { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string Impact { get; set; } = "minor";
        public string Status { get; set; } = "open";
        public string? Module { get; set; }
        public string? Route { get; set; }
        public string? PageUrl { get; set; }
        public string? SentryEventId { get; set; }
        public string? SentryIssueUrl { get; set; }
        public JsonElement? Diagnostics { get; set; }
        public string? UserAgent { get; set; }
        public string? TriageNotes { get; set; }
        public string? TriagedAt { get; set; }
        public string? ResolvedAt { get; set; }
        public string? ClosedAt { get; set; }
        public string? CreatedAt { get; set; }
        public string? UpdatedAt { get; set; }
    }
}
