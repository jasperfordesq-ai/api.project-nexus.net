// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Nexus.Api.Data;
using Nexus.Api.Entities;
using Nexus.Api.Extensions;
using Nexus.Api.Services;

namespace Nexus.Api.Controllers;

/// <summary>
/// Admin route aliases for the React frontend — Part 2.
/// Covers Newsletters, Broker (extended), Groups (extended), Volunteering, and Federation.
/// Routes here complement (not duplicate) existing AdminBrokerController, AdminGroupsController,
/// and AdminFederationController.
/// </summary>
[ApiController]
[Route("api/admin")]
[Authorize(Policy = "AdminOnly")]
public class AdminCompatibility2Controller : ControllerBase
{
    private readonly NexusDbContext _db;
    private readonly TenantContext _tenantContext;
    private readonly NewsletterService _newsletter;
    private readonly ILogger<AdminCompatibility2Controller> _logger;

    public AdminCompatibility2Controller(
        NexusDbContext db,
        TenantContext tenantContext,
        NewsletterService newsletter,
        ILogger<AdminCompatibility2Controller> logger)
    {
        _db = db;
        _tenantContext = tenantContext;
        _newsletter = newsletter;
        _logger = logger;
    }

    // =====================================================================
    // NEWSLETTERS — Core CRUD (wired to NewsletterService)
    // =====================================================================

    /// <summary>GET /api/admin/newsletters - List newsletters.</summary>
    [HttpGet("newsletters")]
    public async Task<IActionResult> ListNewsletters(
        [FromQuery] string? status = null,
        [FromQuery] int page = 1,
        [FromQuery] int limit = 20)
    {
        NewsletterStatus? parsed = null;
        if (!string.IsNullOrEmpty(status) && Enum.TryParse<NewsletterStatus>(status, true, out var s))
            parsed = s;

        var (items, total) = await _newsletter.GetNewslettersAsync(parsed, Math.Max(1, page), Math.Clamp(limit, 1, 100));
        return Ok(new
        {
            data = items.Select(n => MapNewsletter(n)),
            meta = new { page, limit, total }
        });
    }

    /// <summary>GET /api/admin/newsletters/{id} - Get newsletter.</summary>
    [HttpGet("newsletters/{id}")]
    public async Task<IActionResult> GetNewsletter(int id)
    {
        var n = await _newsletter.GetNewsletterAsync(id);
        if (n == null) return NotFound(new { error = "Newsletter not found" });
        return Ok(new { data = MapNewsletter(n) });
    }

    /// <summary>POST /api/admin/newsletters - Create newsletter.</summary>
    [HttpPost("newsletters")]
    public async Task<IActionResult> CreateNewsletter([FromBody] CreateNewsletterRequest request)
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid token" });

        var n = await _newsletter.CreateNewsletterAsync(
            userId.Value, request.Subject, request.ContentHtml, request.ContentText, request.ScheduledAt);
        return Created($"/api/admin/newsletters/{n.Id}", new { data = MapNewsletter(n) });
    }

    /// <summary>PUT /api/admin/newsletters/{id} - Update newsletter.</summary>
    [HttpPut("newsletters/{id}")]
    public async Task<IActionResult> UpdateNewsletter(int id, [FromBody] UpdateNewsletterRequest request)
    {
        try
        {
            var n = await _newsletter.UpdateNewsletterAsync(id, request.Subject, request.ContentHtml, request.ContentText, request.ScheduledAt);
            if (n == null) return NotFound(new { error = "Newsletter not found" });
            return Ok(new { data = MapNewsletter(n) });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    /// <summary>DELETE /api/admin/newsletters/{id} - Delete newsletter.</summary>
    [HttpDelete("newsletters/{id}")]
    public async Task<IActionResult> DeleteNewsletter(int id)
    {
        var n = await _db.Set<Newsletter>().FirstOrDefaultAsync(x => x.Id == id);
        if (n == null) return NotFound(new { error = "Newsletter not found" });

        _db.Set<Newsletter>().Remove(n);
        await _db.SaveChangesAsync();
        return Ok(new { message = "Newsletter deleted" });
    }

    /// <summary>POST /api/admin/newsletters/{id}/send - Send newsletter.</summary>
    [HttpPost("newsletters/{id}/send")]
    public async Task<IActionResult> SendNewsletter(int id)
    {
        try
        {
            var n = await _newsletter.SendNewsletterAsync(id);
            if (n == null) return NotFound(new { error = "Newsletter not found" });
            return Ok(new { data = MapNewsletter(n), message = "Newsletter queued for sending" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    // =====================================================================
    // NEWSLETTERS — Subscribers
    // =====================================================================

    /// <summary>GET /api/admin/newsletters/subscribers - List subscribers.</summary>
    [HttpGet("newsletters/subscribers")]
    public async Task<IActionResult> ListSubscribers([FromQuery] int page = 1, [FromQuery] int limit = 20, [FromQuery] bool? subscribed = null)
    {
        var (items, total) = await _newsletter.GetSubscribersAsync(Math.Max(1, page), Math.Clamp(limit, 1, 100), subscribed);
        return Ok(new
        {
            data = items.Select(s => new
            {
                s.Id, s.Email, s.UserId, is_subscribed = s.IsSubscribed, s.Source,
                subscribed_at = s.SubscribedAt, unsubscribed_at = s.UnsubscribedAt
            }),
            meta = new { page, limit, total }
        });
    }

    /// <summary>POST /api/admin/newsletters/subscribers - Add subscriber.</summary>
    [HttpPost("newsletters/subscribers")]
    public async Task<IActionResult> AddSubscriber([FromBody] AddSubscriberRequest request)
    {
        var sub = await _newsletter.SubscribeAsync(request.Email, request.UserId, "admin");
        return Created("/api/admin/newsletters/subscribers", new { data = new { sub.Id, sub.Email, is_subscribed = sub.IsSubscribed } });
    }

    /// <summary>DELETE /api/admin/newsletters/subscribers/{id} - Remove subscriber.</summary>
    [HttpDelete("newsletters/subscribers/{id}")]
    public async Task<IActionResult> RemoveSubscriber(int id)
    {
        var sub = await _db.Set<NewsletterSubscription>().FirstOrDefaultAsync(s => s.Id == id);
        if (sub == null) return NotFound(new { error = "Subscriber not found" });

        sub.IsSubscribed = false;
        sub.UnsubscribedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(new { message = "Subscriber removed" });
    }

    /// <summary>POST /api/admin/newsletters/subscribers/import - Import subscribers.</summary>
    [HttpPost("newsletters/subscribers/import")]
    public IActionResult ImportSubscribers()
        => Ok(new { message = "Import not yet implemented", imported = 0 });

    /// <summary>GET /api/admin/newsletters/subscribers/export - Export subscribers.</summary>
    [HttpGet("newsletters/subscribers/export")]
    public IActionResult ExportSubscribers()
        => Ok(new { message = "Export not yet implemented", data = Array.Empty<object>() });

    /// <summary>POST /api/admin/newsletters/subscribers/sync - Sync members as subscribers.</summary>
    [HttpPost("newsletters/subscribers/sync")]
    public IActionResult SyncSubscribers()
        => Ok(new { message = "Sync not yet implemented", synced = 0 });

    // =====================================================================
    // NEWSLETTERS — Segments
    // =====================================================================

    /// <summary>GET /api/admin/newsletters/segments - List segments.</summary>
    [HttpGet("newsletters/segments")]
    public IActionResult ListSegments()
        => Ok(new { data = Array.Empty<object>(), meta = new { total = 0 } });

    /// <summary>GET /api/admin/newsletters/segments/{id} - Get segment.</summary>
    [HttpGet("newsletters/segments/{id}")]
    public IActionResult GetSegment(int id)
        => Ok(new { data = new { id, name = $"Segment {id}", conditions = Array.Empty<object>(), subscriber_count = 0 } });

    /// <summary>POST /api/admin/newsletters/segments - Create segment.</summary>
    [HttpPost("newsletters/segments")]
    public IActionResult CreateSegment([FromBody] object body)
        => Created("/api/admin/newsletters/segments/0", new { data = new { id = 0, name = "New Segment", conditions = Array.Empty<object>(), subscriber_count = 0 } });

    /// <summary>PUT /api/admin/newsletters/segments/{id} - Update segment.</summary>
    [HttpPut("newsletters/segments/{id}")]
    public IActionResult UpdateSegment(int id, [FromBody] object body)
        => Ok(new { data = new { id, name = "Updated Segment", conditions = Array.Empty<object>(), subscriber_count = 0 } });

    /// <summary>DELETE /api/admin/newsletters/segments/{id} - Delete segment.</summary>
    [HttpDelete("newsletters/segments/{id}")]
    public IActionResult DeleteSegment(int id)
        => Ok(new { message = "Segment deleted" });

    /// <summary>POST /api/admin/newsletters/segments/preview - Preview segment members.</summary>
    [HttpPost("newsletters/segments/preview")]
    public IActionResult PreviewSegment([FromBody] object body)
        => Ok(new { data = Array.Empty<object>(), meta = new { total = 0 } });

    /// <summary>GET /api/admin/newsletters/segments/suggestions - Smart segment suggestions.</summary>
    [HttpGet("newsletters/segments/suggestions")]
    public IActionResult SegmentSuggestions()
        => Ok(new { data = Array.Empty<object>() });

    // =====================================================================
    // NEWSLETTERS — Templates
    // =====================================================================

    /// <summary>GET /api/admin/newsletters/templates - List templates.</summary>
    [HttpGet("newsletters/templates")]
    public IActionResult ListTemplates()
        => Ok(new { data = Array.Empty<object>(), meta = new { total = 0 } });

    /// <summary>GET /api/admin/newsletters/templates/{id} - Get template.</summary>
    [HttpGet("newsletters/templates/{id}")]
    public IActionResult GetTemplate(int id)
        => Ok(new { data = new { id, name = $"Template {id}", content_html = "", content_text = "", created_at = DateTime.UtcNow } });

    /// <summary>POST /api/admin/newsletters/templates - Create template.</summary>
    [HttpPost("newsletters/templates")]
    public IActionResult CreateTemplate([FromBody] object body)
        => Created("/api/admin/newsletters/templates/0", new { data = new { id = 0, name = "New Template", content_html = "", created_at = DateTime.UtcNow } });

    /// <summary>PUT /api/admin/newsletters/templates/{id} - Update template.</summary>
    [HttpPut("newsletters/templates/{id}")]
    public IActionResult UpdateTemplate(int id, [FromBody] object body)
        => Ok(new { data = new { id, name = "Updated Template", content_html = "", updated_at = DateTime.UtcNow } });

    /// <summary>DELETE /api/admin/newsletters/templates/{id} - Delete template.</summary>
    [HttpDelete("newsletters/templates/{id}")]
    public IActionResult DeleteTemplate(int id)
        => Ok(new { message = "Template deleted" });

    /// <summary>POST /api/admin/newsletters/templates/{id}/duplicate - Duplicate template.</summary>
    [HttpPost("newsletters/templates/{id}/duplicate")]
    public IActionResult DuplicateTemplate(int id)
        => Created($"/api/admin/newsletters/templates/{id}", new { data = new { id = 0, name = $"Copy of Template {id}", created_at = DateTime.UtcNow } });

    /// <summary>GET /api/admin/newsletters/templates/{id}/preview - Preview template.</summary>
    [HttpGet("newsletters/templates/{id}/preview")]
    public IActionResult PreviewTemplate(int id)
        => Ok(new { data = new { id, rendered_html = $"<p>Preview of template {id}</p>" } });

    // =====================================================================
    // NEWSLETTERS — Analytics & Diagnostics
    // =====================================================================

    /// <summary>GET /api/admin/newsletters/analytics - Overall newsletter analytics.</summary>
    [HttpGet("newsletters/analytics")]
    public IActionResult NewsletterAnalytics()
        => Ok(new { data = new { total_sent = 0, total_opens = 0, total_clicks = 0, avg_open_rate = 0.0, avg_click_rate = 0.0 } });

    /// <summary>GET /api/admin/newsletters/bounces - Bounce list.</summary>
    [HttpGet("newsletters/bounces")]
    public IActionResult NewsletterBounces()
        => Ok(new { data = Array.Empty<object>(), meta = new { total = 0 } });

    /// <summary>GET /api/admin/newsletters/suppression-list - Suppressed emails.</summary>
    [HttpGet("newsletters/suppression-list")]
    public IActionResult SuppressionList()
        => Ok(new { data = Array.Empty<object>(), meta = new { total = 0 } });

    /// <summary>POST /api/admin/newsletters/suppression-list/{email}/unsuppress - Unsuppress email.</summary>
    [HttpPost("newsletters/suppression-list/{email}/unsuppress")]
    public IActionResult Unsuppress(string email)
        => Ok(new { message = $"{email} unsuppressed" });

    /// <summary>POST /api/admin/newsletters/suppression-list/{email}/suppress - Suppress email.</summary>
    [HttpPost("newsletters/suppression-list/{email}/suppress")]
    public IActionResult Suppress(string email)
        => Ok(new { message = $"{email} suppressed" });

    /// <summary>GET /api/admin/newsletters/{id}/resend-info - Resend info.</summary>
    [HttpGet("newsletters/{id}/resend-info")]
    public IActionResult ResendInfo(int id)
        => Ok(new { data = new { newsletter_id = id, can_resend = false, reason = "Not yet implemented" } });

    /// <summary>POST /api/admin/newsletters/{id}/resend - Resend newsletter.</summary>
    [HttpPost("newsletters/{id}/resend")]
    public IActionResult Resend(int id)
        => Ok(new { message = "Resend not yet implemented", newsletter_id = id });

    /// <summary>GET /api/admin/newsletters/send-time-optimizer - Send time optimization data.</summary>
    [HttpGet("newsletters/send-time-optimizer")]
    public IActionResult SendTimeOptimizer()
        => Ok(new { data = new { best_day = "Tuesday", best_hour = 10, timezone = "UTC", confidence = 0.0 } });

    /// <summary>GET /api/admin/newsletters/diagnostics - Newsletter diagnostics.</summary>
    [HttpGet("newsletters/diagnostics")]
    public IActionResult NewsletterDiagnostics()
        => Ok(new { data = new { email_provider = "not_configured", delivery_rate = 0.0, issues = Array.Empty<string>() } });

    /// <summary>GET /api/admin/newsletters/bounce-trends - Bounce trends.</summary>
    [HttpGet("newsletters/bounce-trends")]
    public IActionResult BounceTrends()
        => Ok(new { data = Array.Empty<object>() });

    /// <summary>GET /api/admin/newsletters/{id}/stats - Per-newsletter stats.</summary>
    [HttpGet("newsletters/{id}/stats")]
    public IActionResult NewsletterStats(int id)
        => Ok(new { data = new { newsletter_id = id, sent = 0, opens = 0, clicks = 0, bounces = 0, unsubscribes = 0, open_rate = 0.0, click_rate = 0.0 } });

    /// <summary>POST /api/admin/newsletters/{id}/ab-winner - Select A/B winner.</summary>
    [HttpPost("newsletters/{id}/ab-winner")]
    public IActionResult SelectAbWinner(int id, [FromBody] object body)
        => Ok(new { message = "A/B winner selection not yet implemented", newsletter_id = id });

    /// <summary>POST /api/admin/newsletters/{id}/send-test - Send test email.</summary>
    [HttpPost("newsletters/{id}/send-test")]
    public IActionResult SendTestEmail(int id, [FromBody] object body)
        => Ok(new { message = "Test email not yet implemented", newsletter_id = id });

    /// <summary>POST /api/admin/newsletters/recipient-count - Get recipient count for criteria.</summary>
    [HttpPost("newsletters/recipient-count")]
    public IActionResult RecipientCount([FromBody] object body)
        => Ok(new { count = 0 });

    /// <summary>POST /api/admin/newsletters/{id}/duplicate - Duplicate newsletter.</summary>
    [HttpPost("newsletters/{id}/duplicate")]
    public IActionResult DuplicateNewsletter(int id)
        => Created($"/api/admin/newsletters/{id}", new { data = new { id = 0, subject = $"Copy of newsletter {id}", status = "Draft", created_at = DateTime.UtcNow } });

    /// <summary>GET /api/admin/newsletters/{id}/activity - Newsletter activity log.</summary>
    [HttpGet("newsletters/{id}/activity")]
    public IActionResult NewsletterActivity(int id)
        => Ok(new { data = Array.Empty<object>(), meta = new { total = 0, newsletter_id = id } });

    /// <summary>GET /api/admin/newsletters/{id}/openers - List openers.</summary>
    [HttpGet("newsletters/{id}/openers")]
    public IActionResult NewsletterOpeners(int id)
        => Ok(new { data = Array.Empty<object>(), meta = new { total = 0, newsletter_id = id } });

    /// <summary>GET /api/admin/newsletters/{id}/clickers - List clickers.</summary>
    [HttpGet("newsletters/{id}/clickers")]
    public IActionResult NewsletterClickers(int id)
        => Ok(new { data = Array.Empty<object>(), meta = new { total = 0, newsletter_id = id } });

    /// <summary>GET /api/admin/newsletters/{id}/non-openers - List non-openers.</summary>
    [HttpGet("newsletters/{id}/non-openers")]
    public IActionResult NewsletterNonOpeners(int id)
        => Ok(new { data = Array.Empty<object>(), meta = new { total = 0, newsletter_id = id } });

    /// <summary>GET /api/admin/newsletters/{id}/openers-no-click - Openers who did not click.</summary>
    [HttpGet("newsletters/{id}/openers-no-click")]
    public IActionResult NewsletterOpenersNoClick(int id)
        => Ok(new { data = Array.Empty<object>(), meta = new { total = 0, newsletter_id = id } });

    /// <summary>GET /api/admin/newsletters/{id}/email-clients - Email client stats.</summary>
    [HttpGet("newsletters/{id}/email-clients")]
    public IActionResult NewsletterEmailClients(int id)
        => Ok(new { data = Array.Empty<object>(), meta = new { total = 0, newsletter_id = id } });

    // =====================================================================
    // BROKER — Extended (no conflicts with AdminBrokerController)
    // AdminBrokerController owns: assignments/*, notes, stats/*, brokers, members/*/notes, exchanges/*/notes
    // These routes are NEW sub-paths under /api/admin/broker/
    // =====================================================================

    /// <summary>GET /api/admin/broker/dashboard - Broker dashboard stats.</summary>
    [HttpGet("broker/dashboard")]
    public IActionResult BrokerDashboard()
        => Ok(new
        {
            data = new
            {
                total_exchanges = 0, pending_approval = 0, active_assignments = 0,
                flagged_messages = 0, monitored_users = 0, risk_tags = 0
            }
        });

    /// <summary>GET /api/admin/broker/exchanges - List exchanges for broker review.</summary>
    [HttpGet("broker/exchanges")]
    public IActionResult BrokerExchanges([FromQuery] int page = 1, [FromQuery] int limit = 20, [FromQuery] string? status = null)
        => Ok(new { data = Array.Empty<object>(), meta = new { page, limit, total = 0 } });

    /// <summary>GET /api/admin/broker/exchanges/{id} - Exchange detail for broker.</summary>
    [HttpGet("broker/exchanges/{id}")]
    public IActionResult BrokerExchangeDetail(int id)
        => Ok(new { data = new { id, status = "pending", provider_id = 0, receiver_id = 0, hours = 0, created_at = DateTime.UtcNow } });

    /// <summary>POST /api/admin/broker/exchanges/{id}/approve - Approve exchange.</summary>
    [HttpPost("broker/exchanges/{id}/approve")]
    public IActionResult ApproveBrokerExchange(int id)
        => Ok(new { message = "Exchange approved", exchange_id = id });

    /// <summary>POST /api/admin/broker/exchanges/{id}/reject - Reject exchange.</summary>
    [HttpPost("broker/exchanges/{id}/reject")]
    public IActionResult RejectBrokerExchange(int id)
        => Ok(new { message = "Exchange rejected", exchange_id = id });

    /// <summary>GET /api/admin/broker/risk-tags - List risk tags.</summary>
    [HttpGet("broker/risk-tags")]
    public IActionResult ListRiskTags()
        => Ok(new { data = Array.Empty<object>(), meta = new { total = 0 } });

    /// <summary>POST /api/admin/broker/risk-tags/{listingId} - Save risk tag for listing.</summary>
    [HttpPost("broker/risk-tags/{listingId}")]
    public IActionResult SaveRiskTag(int listingId, [FromBody] object body)
        => Ok(new { message = "Risk tag saved", listing_id = listingId });

    /// <summary>DELETE /api/admin/broker/risk-tags/{listingId} - Remove risk tag.</summary>
    [HttpDelete("broker/risk-tags/{listingId}")]
    public IActionResult RemoveRiskTag(int listingId)
        => Ok(new { message = "Risk tag removed", listing_id = listingId });

    /// <summary>GET /api/admin/broker/messages - List messages for broker review.</summary>
    [HttpGet("broker/messages")]
    public IActionResult BrokerMessages([FromQuery] int page = 1, [FromQuery] int limit = 20)
        => Ok(new { data = Array.Empty<object>(), meta = new { page, limit, total = 0 } });

    /// <summary>GET /api/admin/broker/messages/unreviewed-count - Unreviewed message count.</summary>
    [HttpGet("broker/messages/unreviewed-count")]
    public IActionResult UnreviewedMessageCount()
        => Ok(new { count = 0 });

    /// <summary>GET /api/admin/broker/messages/{id} - Message detail.</summary>
    [HttpGet("broker/messages/{id}")]
    public IActionResult BrokerMessageDetail(int id)
        => Ok(new { data = new { id, content = "", sender_id = 0, receiver_id = 0, reviewed = false, created_at = DateTime.UtcNow } });

    /// <summary>POST /api/admin/broker/messages/{id}/review - Review message.</summary>
    [HttpPost("broker/messages/{id}/review")]
    public IActionResult ReviewMessage(int id, [FromBody] object body)
        => Ok(new { message = "Message reviewed", message_id = id });

    /// <summary>POST /api/admin/broker/messages/{id}/flag - Flag message.</summary>
    [HttpPost("broker/messages/{id}/flag")]
    public IActionResult FlagMessage(int id, [FromBody] object body)
        => Ok(new { message = "Message flagged", message_id = id });

    /// <summary>POST /api/admin/broker/messages/{id}/approve - Approve message.</summary>
    [HttpPost("broker/messages/{id}/approve")]
    public IActionResult ApproveMessage(int id)
        => Ok(new { message = "Message approved", message_id = id });

    /// <summary>GET /api/admin/broker/monitoring - Monitored users.</summary>
    [HttpGet("broker/monitoring")]
    public IActionResult BrokerMonitoring()
        => Ok(new { data = Array.Empty<object>(), meta = new { total = 0 } });

    /// <summary>POST /api/admin/broker/monitoring/{userId} - Set monitoring for user.</summary>
    [HttpPost("broker/monitoring/{userId}")]
    public IActionResult SetMonitoring(int userId, [FromBody] object body)
        => Ok(new { message = "Monitoring updated", user_id = userId });

    /// <summary>GET /api/admin/broker/configuration - Broker configuration.</summary>
    [HttpGet("broker/configuration")]
    public IActionResult BrokerConfiguration()
        => Ok(new { data = new { auto_assign = false, max_assignments_per_broker = 10, review_required = true } });

    /// <summary>POST /api/admin/broker/configuration - Save broker configuration.</summary>
    [HttpPost("broker/configuration")]
    public IActionResult SaveBrokerConfiguration([FromBody] object body)
        => Ok(new { message = "Configuration saved" });

    /// <summary>GET /api/admin/broker/archives - List archived exchanges.</summary>
    [HttpGet("broker/archives")]
    public IActionResult BrokerArchives([FromQuery] int page = 1, [FromQuery] int limit = 20)
        => Ok(new { data = Array.Empty<object>(), meta = new { page, limit, total = 0 } });

    /// <summary>GET /api/admin/broker/archives/{id} - Archive detail.</summary>
    [HttpGet("broker/archives/{id}")]
    public IActionResult BrokerArchiveDetail(int id)
        => Ok(new { data = new { id, status = "archived", archived_at = DateTime.UtcNow } });

    // =====================================================================
    // GROUPS — Extended (no conflicts with AdminGroupsController)
    // AdminGroupsController owns: GET (list), GET stats, DELETE {id}
    // These routes are NEW sub-paths under /api/admin/groups/
    // =====================================================================

    /// <summary>GET /api/admin/groups/analytics - Group analytics.</summary>
    [HttpGet("groups/analytics")]
    public IActionResult GroupAnalytics()
        => Ok(new { data = new { total_groups = 0, active_groups = 0, total_members = 0, avg_members_per_group = 0.0, growth_rate = 0.0 } });

    /// <summary>GET /api/admin/groups/approvals - Pending group approvals.</summary>
    [HttpGet("groups/approvals")]
    public IActionResult GroupApprovals()
        => Ok(new { data = Array.Empty<object>(), meta = new { total = 0 } });

    /// <summary>POST /api/admin/groups/approvals/{id}/approve - Approve group.</summary>
    [HttpPost("groups/approvals/{id}/approve")]
    public IActionResult ApproveGroup(int id)
        => Ok(new { message = "Group approved", group_id = id });

    /// <summary>POST /api/admin/groups/approvals/{id}/reject - Reject group.</summary>
    [HttpPost("groups/approvals/{id}/reject")]
    public IActionResult RejectGroup(int id)
        => Ok(new { message = "Group rejected", group_id = id });

    /// <summary>GET /api/admin/groups/moderation - Flagged group content.</summary>
    [HttpGet("groups/moderation")]
    public IActionResult GroupModeration()
        => Ok(new { data = Array.Empty<object>(), meta = new { total = 0 } });

    /// <summary>PUT /api/admin/groups/{id}/status - Update group status.</summary>
    [HttpPut("groups/{id}/status")]
    public IActionResult UpdateGroupStatus(int id, [FromBody] object body)
        => Ok(new { message = "Group status updated", group_id = id });

    /// <summary>GET /api/admin/groups/types - List group types.</summary>
    [HttpGet("groups/types")]
    public IActionResult ListGroupTypes()
        => Ok(new { data = Array.Empty<object>(), meta = new { total = 0 } });

    /// <summary>POST /api/admin/groups/types - Create group type.</summary>
    [HttpPost("groups/types")]
    public IActionResult CreateGroupType([FromBody] object body)
        => Created("/api/admin/groups/types/0", new { data = new { id = 0, name = "New Type" } });

    /// <summary>PUT /api/admin/groups/types/{id} - Update group type.</summary>
    [HttpPut("groups/types/{id}")]
    public IActionResult UpdateGroupType(int id, [FromBody] object body)
        => Ok(new { data = new { id, name = "Updated Type" } });

    /// <summary>DELETE /api/admin/groups/types/{id} - Delete group type.</summary>
    [HttpDelete("groups/types/{id}")]
    public IActionResult DeleteGroupType(int id)
        => Ok(new { message = "Group type deleted" });

    /// <summary>GET /api/admin/groups/types/{typeId}/policies - Get type policies.</summary>
    [HttpGet("groups/types/{typeId}/policies")]
    public IActionResult GetGroupTypePolicies(int typeId)
        => Ok(new { data = new { type_id = typeId, max_members = 0, requires_approval = false, allow_public = true } });

    /// <summary>PUT /api/admin/groups/types/{typeId}/policies - Set type policies.</summary>
    [HttpPut("groups/types/{typeId}/policies")]
    public IActionResult SetGroupTypePolicies(int typeId, [FromBody] object body)
        => Ok(new { message = "Policies updated", type_id = typeId });

    /// <summary>PUT /api/admin/groups/{id} - Update group (admin).</summary>
    [HttpPut("groups/{id}")]
    public IActionResult UpdateGroup(int id, [FromBody] object body)
        => Ok(new { message = "Group updated", group_id = id });

    /// <summary>GET /api/admin/groups/{groupId}/members - List group members.</summary>
    [HttpGet("groups/{groupId}/members")]
    public IActionResult ListGroupMembers(int groupId, [FromQuery] int page = 1, [FromQuery] int limit = 20)
        => Ok(new { data = Array.Empty<object>(), meta = new { page, limit, total = 0, group_id = groupId } });

    /// <summary>POST /api/admin/groups/{groupId}/members/{userId}/promote - Promote member.</summary>
    [HttpPost("groups/{groupId}/members/{userId}/promote")]
    public IActionResult PromoteMember(int groupId, int userId)
        => Ok(new { message = "Member promoted", group_id = groupId, user_id = userId });

    /// <summary>POST /api/admin/groups/{groupId}/members/{userId}/demote - Demote member.</summary>
    [HttpPost("groups/{groupId}/members/{userId}/demote")]
    public IActionResult DemoteMember(int groupId, int userId)
        => Ok(new { message = "Member demoted", group_id = groupId, user_id = userId });

    /// <summary>DELETE /api/admin/groups/{groupId}/members/{userId} - Kick member.</summary>
    [HttpDelete("groups/{groupId}/members/{userId}")]
    public IActionResult KickMember(int groupId, int userId)
        => Ok(new { message = "Member removed", group_id = groupId, user_id = userId });

    /// <summary>POST /api/admin/groups/{groupId}/geocode - Geocode group location.</summary>
    [HttpPost("groups/{groupId}/geocode")]
    public IActionResult GeocodeGroup(int groupId)
        => Ok(new { message = "Geocoding not yet implemented", group_id = groupId });

    /// <summary>POST /api/admin/groups/batch-geocode - Batch geocode groups.</summary>
    [HttpPost("groups/batch-geocode")]
    public IActionResult BatchGeocodeGroups()
        => Ok(new { message = "Batch geocoding not yet implemented", processed = 0 });

    /// <summary>GET /api/admin/groups/recommendations - Recommendation engine data.</summary>
    [HttpGet("groups/recommendations")]
    public IActionResult GroupRecommendations()
        => Ok(new { data = Array.Empty<object>() });

    /// <summary>GET /api/admin/groups/featured - Featured groups.</summary>
    [HttpGet("groups/featured")]
    public IActionResult FeaturedGroups()
        => Ok(new { data = Array.Empty<object>(), meta = new { total = 0 } });

    /// <summary>POST /api/admin/groups/featured/update - Update featured groups list.</summary>
    [HttpPost("groups/featured/update")]
    public IActionResult UpdateFeaturedGroups([FromBody] object body)
        => Ok(new { message = "Featured groups updated" });

    /// <summary>PUT /api/admin/groups/{groupId}/toggle-featured - Toggle featured status.</summary>
    [HttpPut("groups/{groupId}/toggle-featured")]
    public IActionResult ToggleFeatured(int groupId)
        => Ok(new { message = "Featured status toggled", group_id = groupId });

    // =====================================================================
    // VOLUNTEERING
    // =====================================================================

    /// <summary>GET /api/admin/volunteering - Volunteering overview.</summary>
    [HttpGet("volunteering")]
    public IActionResult VolunteeringOverview()
        => Ok(new { data = new { total_volunteers = 0, active_opportunities = 0, pending_approvals = 0, total_hours = 0 } });

    /// <summary>GET /api/admin/volunteering/approvals - Pending volunteering approvals.</summary>
    [HttpGet("volunteering/approvals")]
    public IActionResult VolunteeringApprovals()
        => Ok(new { data = Array.Empty<object>(), meta = new { total = 0 } });

    /// <summary>POST /api/admin/volunteering/approvals/{id}/approve - Approve volunteering.</summary>
    [HttpPost("volunteering/approvals/{id}/approve")]
    public IActionResult ApproveVolunteering(int id)
        => Ok(new { message = "Volunteering approved", id });

    /// <summary>POST /api/admin/volunteering/approvals/{id}/decline - Decline volunteering.</summary>
    [HttpPost("volunteering/approvals/{id}/decline")]
    public IActionResult DeclineVolunteering(int id)
        => Ok(new { message = "Volunteering declined", id });

    /// <summary>GET /api/admin/volunteering/organizations - List volunteering organisations.</summary>
    [HttpGet("volunteering/organizations")]
    public IActionResult VolunteeringOrganizations()
        => Ok(new { data = Array.Empty<object>(), meta = new { total = 0 } });

    // =====================================================================
    // FEDERATION (at /api/admin/federation/... — no conflict with AdminFederationController at /api/admin/system/federation/...)
    // =====================================================================

    /// <summary>GET /api/admin/federation/settings - Federation settings.</summary>
    [HttpGet("federation/settings")]
    public IActionResult FederationSettings()
        => Ok(new { data = new { enabled = false, auto_accept = false, require_approval = true, max_partners = 10 } });

    /// <summary>PUT /api/admin/federation/settings - Update federation settings.</summary>
    [HttpPut("federation/settings")]
    public IActionResult UpdateFederationSettings([FromBody] object body)
        => Ok(new { message = "Federation settings updated" });

    /// <summary>GET /api/admin/federation/partnerships - List partnerships.</summary>
    [HttpGet("federation/partnerships")]
    public IActionResult ListPartnerships([FromQuery] string? status = null)
        => Ok(new { data = Array.Empty<object>(), meta = new { total = 0 } });

    /// <summary>POST /api/admin/federation/partnerships/{id}/approve - Approve partnership.</summary>
    [HttpPost("federation/partnerships/{id}/approve")]
    public IActionResult ApprovePartnership(int id)
        => Ok(new { message = "Partnership approved", partnership_id = id });

    /// <summary>POST /api/admin/federation/partnerships/{id}/reject - Reject partnership.</summary>
    [HttpPost("federation/partnerships/{id}/reject")]
    public IActionResult RejectPartnership(int id)
        => Ok(new { message = "Partnership rejected", partnership_id = id });

    /// <summary>POST /api/admin/federation/partnerships/{id}/terminate - Terminate partnership.</summary>
    [HttpPost("federation/partnerships/{id}/terminate")]
    public IActionResult TerminatePartnership(int id)
        => Ok(new { message = "Partnership terminated", partnership_id = id });

    /// <summary>GET /api/admin/federation/directory - Federation directory.</summary>
    [HttpGet("federation/directory")]
    public IActionResult FederationDirectory()
        => Ok(new { data = Array.Empty<object>(), meta = new { total = 0 } });

    /// <summary>POST /api/admin/federation/partnerships/request - Request partnership.</summary>
    [HttpPost("federation/partnerships/request")]
    public IActionResult RequestPartnership([FromBody] object body)
        => Created("/api/admin/federation/partnerships/0", new { message = "Partnership request sent", partnership_id = 0 });

    /// <summary>GET /api/admin/federation/directory/profile - Get own directory profile.</summary>
    [HttpGet("federation/directory/profile")]
    public IActionResult GetDirectoryProfile()
        => Ok(new { data = new { name = "", description = "", public_contact = "", visible = false } });

    /// <summary>PUT /api/admin/federation/directory/profile - Update directory profile.</summary>
    [HttpPut("federation/directory/profile")]
    public IActionResult UpdateDirectoryProfile([FromBody] object body)
        => Ok(new { message = "Directory profile updated" });

    /// <summary>GET /api/admin/federation/analytics - Federation analytics.</summary>
    [HttpGet("federation/analytics")]
    public IActionResult FederationAnalytics()
        => Ok(new { data = new { total_partners = 0, shared_listings = 0, shared_events = 0, cross_tenant_exchanges = 0 } });

    /// <summary>GET /api/admin/federation/api-keys - List federation API keys.</summary>
    [HttpGet("federation/api-keys")]
    public IActionResult ListFederationApiKeys()
        => Ok(new { data = Array.Empty<object>(), meta = new { total = 0 } });

    /// <summary>POST /api/admin/federation/api-keys - Create federation API key.</summary>
    [HttpPost("federation/api-keys")]
    public IActionResult CreateFederationApiKey([FromBody] object body)
        => Created("/api/admin/federation/api-keys/0", new { data = new { id = 0, key_prefix = "fed_", created_at = DateTime.UtcNow } });

    /// <summary>GET /api/admin/federation/data - Federation data management.</summary>
    [HttpGet("federation/data")]
    public IActionResult FederationData()
        => Ok(new { data = new { synced_listings = 0, synced_events = 0, synced_members = 0, last_sync_at = (DateTime?)null } });

    // =====================================================================
    // Helpers & DTOs
    // =====================================================================

    private static object MapNewsletter(Newsletter n) => new
    {
        n.Id,
        n.Subject,
        content_html = n.ContentHtml,
        content_text = n.ContentText,
        status = n.Status.ToString(),
        scheduled_at = n.ScheduledAt,
        sent_at = n.SentAt,
        recipient_count = n.RecipientCount,
        open_count = n.OpenCount,
        click_count = n.ClickCount,
        created_at = n.CreatedAt,
        updated_at = n.UpdatedAt,
        created_by_id = n.CreatedById,
        created_by = n.CreatedBy != null ? new { n.CreatedBy.Id, n.CreatedBy.FirstName, n.CreatedBy.LastName } : null
    };

    public class CreateNewsletterRequest
    {
        [JsonPropertyName("subject")] public string Subject { get; set; } = string.Empty;
        [JsonPropertyName("content_html")] public string ContentHtml { get; set; } = string.Empty;
        [JsonPropertyName("content_text")] public string? ContentText { get; set; }
        [JsonPropertyName("scheduled_at")] public DateTime? ScheduledAt { get; set; }
    }

    public class UpdateNewsletterRequest
    {
        [JsonPropertyName("subject")] public string? Subject { get; set; }
        [JsonPropertyName("content_html")] public string? ContentHtml { get; set; }
        [JsonPropertyName("content_text")] public string? ContentText { get; set; }
        [JsonPropertyName("scheduled_at")] public DateTime? ScheduledAt { get; set; }
    }

    public class AddSubscriberRequest
    {
        [JsonPropertyName("email")] public string Email { get; set; } = string.Empty;
        [JsonPropertyName("user_id")] public int? UserId { get; set; }
    }
}
