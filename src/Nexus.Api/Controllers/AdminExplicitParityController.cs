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
    private const string CompatibilityWritesKey = "admin_explicit.compatibility_writes";
    private const string MemberPremiumConnectAccountKey = "donations.stripe_connect_account_id";
    private const string MemberPremiumDisputesKey = "donations.disputes";

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
    [HttpDelete("/api/v2/admin/jobs/templates/{id}")]
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
    [HttpGet("/api/v2/admin/identity/provider-credentials")]
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
    [HttpGet("/api/v2/admin/reports/{type}/export")]
    [HttpGet("/api/v2/admin/reports/export-types")]
    [HttpGet("/api/v2/admin/reports/municipal-impact")]
    [HttpGet("/api/v2/admin/reports/municipal-impact/templates")]
    [HttpGet("/api/v2/admin/reports/municipal-impact/verification")]
    [HttpGet("/api/v2/admin/residency-verifications")]
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
            "/api/v2/admin/federation/credit-balances" => await GetFederationCreditBalances(),
            "/api/v2/admin/federation/topics" => await GetFederationTopics(),
            "/api/v2/admin/federation/topics/mine" => await GetFederationTopicSubscriptions(),
            "/api/v2/admin/federation/webhooks" => await GetFederationWebhooks(),
            "/api/v2/admin/help/faqs" => await GetFaqs(),
            "/api/v2/admin/jobs/templates" => await GetJobTemplates(),
            "/api/v2/admin/listings/moderation-queue" => await GetListingsModerationQueue(),
            "/api/v2/admin/listings/moderation-stats" => await GetListingsModerationStats(),
            "/api/v2/admin/listings/stats" => await GetListingsStats(),
            "/api/v2/admin/member-premium/finance/annual-receipts" => await GetMemberPremiumAnnualReceiptsCsv(),
            "/api/v2/admin/member-premium/finance/disputes" => await GetMemberPremiumFinanceDisputes(),
            "/api/v2/admin/member-premium/finance/gift-aid-export" => await GetMemberPremiumGiftAidCsv(),
            "/api/v2/admin/member-premium/finance/overview" => await GetMemberPremiumFinanceOverview(),
            "/api/v2/admin/member-premium/settings" => await GetMemberPremiumSettings(),
            "/api/v2/admin/reports/export-types" => GetReportExportTypes(),
            "/api/v2/admin/super/billing/export" => await GetBillingExportCsv(),
            "/api/v2/admin/super/billing/revenue" => await GetBillingRevenue(),
            "/api/v2/admin/super/billing/snapshot" => await GetBillingSnapshot(),
            _ when TryGetLastInt(path, "/api/v2/admin/enterprise/gdpr/breaches/", out var breachId) => await GetGdprBreach(breachId),
            _ when TryGetLastInt(path, "/api/v2/admin/enterprise/gdpr/requests/", out var requestId) => await GetGdprRequest(requestId),
            _ when TryGetSlugBeforeSuffix(path, "/api/v2/admin/enterprise/gdpr/consent-types/", "/users", out var usersSlug) => await GetConsentTypeUsers(usersSlug),
            _ when TryGetSlugBeforeSuffix(path, "/api/v2/admin/enterprise/gdpr/consent-types/", "/export", out var exportSlug) => await GetConsentTypeExport(exportSlug),
            _ when TryGetIntBeforeSuffix(path, "/api/v2/admin/federation/webhooks/", "/logs", out var webhookLogId) => await GetFederationWebhookLogs(webhookLogId),
            _ when TryGetLastInt(path, "/api/v2/admin/events/", out var eventId) => await GetEvent(eventId),
            _ when TryGetLastInt(path, "/api/v2/admin/groups/", out var groupId) => await GetGroup(groupId),
            _ when TryGetLastInt(path, "/api/v2/admin/listings/", out var listingId) => await GetListing(listingId),
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
    public async Task<IActionResult> Patch() => await PersistCompatibilityWrite("patch");

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
    [HttpPost("/api/v2/admin/federation/credit-agreements/{id}/{action}")]
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
            "/api/v2/admin/member-premium/connect/onboarding" => await CreateMemberPremiumConnectOnboarding(),
            _ when TryGetIntBeforeSuffix(path, "/api/v2/admin/federation/webhooks/", "/test", out var webhookId) => await TestFederationWebhook(webhookId),
            _ => await PersistCompatibilityWrite("post")
        };
    }

    [HttpPut("/api/v2/admin/api-partners/{id}")]
    [HttpPut("/api/v2/admin/config/groups")]
    [HttpPut("/api/v2/admin/config/groups/bulk")]
    [HttpPut("/api/v2/admin/config/identity/bulk")]
    [HttpPut("/api/v2/admin/config/jobs/bulk")]
    [HttpPut("/api/v2/admin/config/landing-page")]
    [HttpPut("/api/v2/admin/config/listings")]
    [HttpPut("/api/v2/admin/config/listings/bulk")]
    [HttpPut("/api/v2/admin/config/onboarding")]
    [HttpPut("/api/v2/admin/config/registration-policy")]
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
        var rows = await _db.JobTemplates.AsNoTracking()
            .OrderBy(t => t.Title)
            .Select(t => new { t.Id, t.Title, t.Description, t.Category, t.JobType, t.RequiredSkills, t.IsPublic, t.CreatedAt, t.UpdatedAt })
            .ToListAsync();

        return Ok(new { data = rows, meta = new { total = rows.Count } });
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
}
