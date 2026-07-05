// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Nexus.Api.Data;
using Nexus.Api.Entities;
using Nexus.Api.Extensions;

namespace Nexus.Api.Controllers;

/// <summary>
/// V1.5 member-facing compatibility endpoints.
/// </summary>
[ApiController]
[Route("api")]
[Authorize]
public class MemberParityController : ControllerBase
{
    private readonly NexusDbContext _db;
    private readonly TenantContext _tenantContext;

    public MemberParityController(NexusDbContext db, TenantContext tenantContext)
    {
        _db = db;
        _tenantContext = tenantContext;
    }

    [HttpGet("me/dashboard")]
    public async Task<IActionResult> Dashboard() => Ok(new { data = new { user = await CurrentUser(), listings = await _db.Listings.CountAsync(l => l.UserId == UserId()), groups = await _db.GroupMembers.CountAsync(g => g.UserId == UserId()), unread = await _db.Notifications.CountAsync(n => n.UserId == UserId() && !n.IsRead) } });

    [HttpGet("me/appreciations")]
    public async Task<IActionResult> Appreciations() => Ok(new { data = await _db.Reviews.Where(r => r.TenantId == TenantId() && r.TargetUserId == UserId()).OrderByDescending(r => r.CreatedAt).ToListAsync() });

    [HttpGet("me/data-export/history")]
    [HttpGet("v2/me/data-export/history")]
    public async Task<IActionResult> DataExportHistory() => Ok(new { data = await _db.DataExportRequests.Where(r => r.UserId == UserId()).OrderByDescending(r => r.CreatedAt).ToListAsync() });

    [HttpPost("me/data-export")]
    [HttpPost("v2/me/data-export")]
    public async Task<IActionResult> RequestDataExport()
    {
        var request = new DataExportRequest { TenantId = TenantId(), UserId = UserId(), Status = ExportStatus.Pending };
        _db.DataExportRequests.Add(request);
        await _db.SaveChangesAsync();
        return Ok(new { data = request });
    }

    [HttpGet("me/fadp/consent-history")]
    public async Task<IActionResult> FadpConsentHistory() => Ok(new { data = await _db.ConsentRecords.Where(c => c.UserId == UserId()).OrderByDescending(c => c.CreatedAt).ToListAsync() });

    [HttpPost("me/fadp/consent")]
    public async Task<IActionResult> FadpConsent([FromBody] JsonElement body)
    {
        var granted = Bool(body, "granted") ?? true;
        var record = new ConsentRecord { TenantId = TenantId(), UserId = UserId(), ConsentType = Str(body, "consent_type") ?? "fadp", IsGranted = granted, GrantedAt = granted ? DateTime.UtcNow : null, RevokedAt = granted ? null : DateTime.UtcNow, IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString() };
        _db.ConsentRecords.Add(record);
        await _db.SaveChangesAsync();
        return Ok(new { data = record });
    }

    [HttpGet("me/residency-verification")]
    public IActionResult ResidencyVerification() => Ok(new { data = new { status = "not_started", user_id = UserId() } });

    [HttpPost("me/residency-verification")]
    public IActionResult StartResidencyVerification([FromBody] JsonElement body) => Ok(new { data = new { status = "pending", country = Str(body, "country"), user_id = UserId() } });

    [HttpGet("me/collections")]
    public async Task<IActionResult> Collections() => Ok(new { data = await _db.MarketplaceCollections.Where(c => c.UserId == UserId()).OrderBy(c => c.Name).ToListAsync() });

    [HttpPost("me/collections")]
    public async Task<IActionResult> CreateCollection([FromBody] JsonElement body)
    {
        var collection = new MarketplaceCollection { TenantId = TenantId(), UserId = UserId(), Name = Required(Str(body, "name"), "name"), Description = Str(body, "description"), IsPublic = Bool(body, "is_public") ?? false };
        _db.MarketplaceCollections.Add(collection);
        await _db.SaveChangesAsync();
        return Ok(new { data = collection });
    }

    [HttpPatch("me/collections/{collectionId:int}")]
    public async Task<IActionResult> UpdateCollection(int collectionId, [FromBody] JsonElement body)
    {
        var collection = await _db.MarketplaceCollections.FirstOrDefaultAsync(c => c.Id == collectionId && c.UserId == UserId());
        if (collection == null) return NotFound(new { error = "Collection not found" });
        collection.Name = Str(body, "name") ?? collection.Name;
        collection.Description = Str(body, "description") ?? collection.Description;
        collection.IsPublic = Bool(body, "is_public") ?? collection.IsPublic;
        await _db.SaveChangesAsync();
        return Ok(new { data = collection });
    }

    [HttpDelete("me/collections/{collectionId:int}")]
    public async Task<IActionResult> DeleteCollection(int collectionId)
    {
        var collection = await _db.MarketplaceCollections.FirstOrDefaultAsync(c => c.Id == collectionId && c.UserId == UserId());
        if (collection != null) _db.MarketplaceCollections.Remove(collection);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpGet("me/collections/{collectionId:int}/items")]
    public async Task<IActionResult> CollectionItems(int collectionId) => Ok(new { data = await _db.MarketplaceCollectionItems.Where(i => i.MarketplaceCollectionId == collectionId && i.TenantId == TenantId()).ToListAsync() });

    [HttpPost("me/saved-items")]
    public async Task<IActionResult> SaveItem([FromBody] JsonElement body)
    {
        var listingId = Int(body, "listing_id") ?? Int(body, "item_id") ?? 0;
        if (listingId <= 0) return BadRequest(new { error = "listing_id is required" });
        if (!await _db.MarketplaceSavedListings.AnyAsync(s => s.UserId == UserId() && s.MarketplaceListingId == listingId))
            _db.MarketplaceSavedListings.Add(new MarketplaceSavedListing { TenantId = TenantId(), UserId = UserId(), MarketplaceListingId = listingId });
        await _db.SaveChangesAsync();
        return Ok(new { success = true });
    }

    [HttpDelete("me/saved-items")]
    public async Task<IActionResult> ClearSavedItems()
    {
        var items = await _db.MarketplaceSavedListings.Where(s => s.UserId == UserId()).ToListAsync();
        _db.MarketplaceSavedListings.RemoveRange(items);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("me/saved-items/{itemId:int}")]
    public async Task<IActionResult> DeleteSavedItem(int itemId)
    {
        var item = await _db.MarketplaceSavedListings.FirstOrDefaultAsync(s => s.UserId == UserId() && (s.Id == itemId || s.MarketplaceListingId == itemId));
        if (item != null) _db.MarketplaceSavedListings.Remove(item);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpGet("me/saved-items/check")]
    public async Task<IActionResult> CheckSavedItem([FromQuery] int item_id, [FromQuery] int? listing_id = null)
    {
        var id = listing_id ?? item_id;
        return Ok(new { data = new { item_id = id, saved = await _db.MarketplaceSavedListings.AnyAsync(s => s.UserId == UserId() && s.MarketplaceListingId == id) } });
    }

    [HttpPost("me/saved-items/check-bulk")]
    public async Task<IActionResult> CheckSavedBulk([FromBody] int[] ids)
    {
        var saved = await _db.MarketplaceSavedListings.Where(s => s.UserId == UserId() && ids.Contains(s.MarketplaceListingId)).Select(s => s.MarketplaceListingId).ToListAsync();
        return Ok(new { data = ids.ToDictionary(id => id, id => saved.Contains(id)) });
    }

    [HttpGet("me/ad-campaigns")]
    public IActionResult AdCampaigns() => Ok(new { data = Array.Empty<object>() });

    [HttpPost("me/ad-campaigns")]
    public IActionResult CreateAdCampaign([FromBody] JsonElement body) => Ok(new { data = new { id = StableId(body), status = "draft", name = Str(body, "name") ?? "Campaign" } });

    [HttpPost("me/ad-campaigns/{campaignId:int}/creatives")]
    public IActionResult AddAdCreative(int campaignId, [FromBody] JsonElement body) => Ok(new { data = new { id = StableId(body), campaign_id = campaignId, status = "uploaded" } });

    [HttpGet("me/ad-campaigns/{campaignId:int}/stats")]
    public IActionResult AdCampaignStats(int campaignId) => Ok(new { data = new { campaign_id = campaignId, impressions = 0, clicks = 0 } });

    [HttpGet("me/push-campaigns")]
    public IActionResult PushCampaigns() => Ok(new { data = Array.Empty<object>() });

    [HttpPost("me/push-campaigns")]
    public IActionResult CreatePushCampaign([FromBody] JsonElement body) => Ok(new { data = new { id = StableId(body), status = "draft", title = Str(body, "title") } });

    [HttpPut("me/push-campaigns/{campaignId:int}")]
    public IActionResult UpdatePushCampaign(int campaignId, [FromBody] JsonElement body) => Ok(new { data = new { id = campaignId, status = "draft", title = Str(body, "title") } });

    [HttpDelete("me/push-campaigns/{campaignId:int}")]
    public IActionResult DeletePushCampaign(int campaignId) => NoContent();

    [HttpPost("me/push-campaigns/{campaignId:int}/submit")]
    public IActionResult SubmitPushCampaign(int campaignId) => Ok(new { data = new { id = campaignId, status = "submitted" } });

    [HttpPost("me/push-campaigns/estimate-audience")]
    public async Task<IActionResult> EstimateAudience() => Ok(new { data = new { estimated_recipients = await _db.Users.CountAsync(u => u.TenantId == TenantId() && u.IsActive) } });

    [HttpGet("me/reports")]
    public IActionResult Reports() => Ok(new { data = Array.Empty<object>() });

    [HttpGet("me/reports/{reportId:int}/download")]
    public IActionResult DownloadReport(int reportId) => File(Encoding.UTF8.GetBytes($"Report {reportId}"), "text/plain", $"report-{reportId}.txt");

    [HttpGet("me/verein-dues")]
    public IActionResult VereinDues() => Ok(new { data = Array.Empty<object>() });

    [HttpGet("me/verein-dues/{dueId:int}")]
    public IActionResult VereinDue(int dueId) => Ok(new { data = new { id = dueId, status = "unpaid" } });

    [HttpPost("me/verein-dues/{dueId:int}/pay")]
    public IActionResult PayVereinDue(int dueId) => Ok(new { data = new { id = dueId, status = "paid" } });

    [HttpGet("me/verein-invitations")]
    public IActionResult VereinInvitations() => Ok(new { data = Array.Empty<object>() });

    [HttpPost("me/verein-invitations/{invitationId:int}/respond")]
    public IActionResult RespondVereinInvitation(int invitationId, [FromBody] JsonElement body) => Ok(new { data = new { id = invitationId, response = Str(body, "response") ?? "accepted" } });

    [HttpGet("member-premium/tiers")]
    [AllowAnonymous]
    public IActionResult PremiumTiers() => Ok(new { data = new[] { new { id = "free", price = 0 }, new { id = "supporter", price = 5 } } });

    [HttpGet("member-premium/me")]
    public IActionResult PremiumMe() => Ok(new { data = new { user_id = UserId(), tier = "free", status = "active" } });

    [HttpPost("member-premium/checkout")]
    public IActionResult PremiumCheckout([FromBody] JsonElement body) => Ok(new { data = new { checkout_url = "/billing/checkout/mock", tier = Str(body, "tier") ?? "supporter" } });

    [HttpPost("member-premium/billing-portal")]
    public IActionResult BillingPortal() => Ok(new { data = new { url = "/billing/portal/mock" } });

    [HttpPost("member-premium/cancel")]
    public IActionResult CancelPremium() => Ok(new { data = new { status = "cancelled" } });

    [HttpPost("members/{memberId:int}/peer-endorse")]
    public IActionResult PeerEndorse(int memberId, [FromBody] JsonElement body) => Ok(new { data = new { member_id = memberId, skill = Str(body, "skill"), endorsed = true } });

    [HttpGet("members/availability/available")]
    public async Task<IActionResult> AvailableMembers() => Ok(new { data = await _db.Users.Where(u => u.TenantId == TenantId() && u.IsActive).Take(50).Select(u => new { u.Id, u.FirstName, u.LastName }).ToListAsync() });

    [HttpGet("members/availability/compatible")]
    public Task<IActionResult> CompatibleMembers() => AvailableMembers();

    [HttpGet("members/nearby")]
    public Task<IActionResult> NearbyMembers() => AvailableMembers();

    [HttpGet("members/suggested")]
    public Task<IActionResult> SuggestedMembers() => AvailableMembers();

    [HttpGet("mentions/me")]
    public async Task<IActionResult> MyMentions() => Ok(new { data = await _db.Notifications.Where(n => n.UserId == UserId() && n.Type.Contains("mention")).ToListAsync() });

    [HttpGet("mentions/search")]
    public async Task<IActionResult> MentionSearch([FromQuery] string? q = null)
    {
        var users = await _db.Users.Where(u => u.TenantId == TenantId() && (q == null || u.FirstName.Contains(q) || u.LastName.Contains(q) || u.Email.Contains(q))).Take(20).Select(u => new { u.Id, label = u.FirstName + " " + u.LastName, u.Email }).ToListAsync();
        return Ok(new { data = users });
    }

    [HttpGet("menus/config")]
    [AllowAnonymous]
    public IActionResult MenuConfig() => Ok(new { data = new { locale = "en", cache = true } });

    [HttpGet("menus/{slug}")]
    [AllowAnonymous]
    public IActionResult Menu(string slug) => Ok(new { data = new { slug, items = Array.Empty<object>() } });

    [HttpPost("menus/clear-cache")]
    public IActionResult ClearMenuCache() => Ok(new { success = true });

    [HttpGet("merchant-onboarding/status")]
    public async Task<IActionResult> MerchantOnboardingStatus()
    {
        var profile = await _db.MarketplaceSellerProfiles.FirstOrDefaultAsync(p => p.UserId == UserId());
        return Ok(new { data = new { status = profile == null ? "not_started" : "complete", seller_profile_id = profile?.Id } });
    }

    [HttpPost("merchant-onboarding/step-1")]
    public Task<IActionResult> MerchantOnboardingStep1([FromBody] JsonElement body) => UpsertMerchant(body, 1);

    [HttpPost("merchant-onboarding/step-2")]
    public Task<IActionResult> MerchantOnboardingStep2([FromBody] JsonElement body) => UpsertMerchant(body, 2);

    [HttpPost("merchant-onboarding/step-3")]
    public Task<IActionResult> MerchantOnboardingStep3([FromBody] JsonElement body) => UpsertMerchant(body, 3);

    [HttpPost("merchant-onboarding/complete")]
    public Task<IActionResult> MerchantOnboardingComplete([FromBody] JsonElement body) => UpsertMerchant(body, 4);

    [HttpPut("messages/{messageId:int}")]
    public async Task<IActionResult> UpdateMessage(int messageId, [FromBody] JsonElement body)
    {
        var message = await _db.Messages.FirstOrDefaultAsync(m => m.Id == messageId);
        if (message == null) return NotFound(new { error = "Message not found" });
        message.Content = Str(body, "content") ?? Str(body, "message") ?? message.Content;
        await _db.SaveChangesAsync();
        return Ok(new { data = message });
    }

    [HttpPost("messages/{messageId:int}/reactions")]
    public IActionResult MessageReactions(int messageId, [FromBody] JsonElement body) => Ok(new { data = new { message_id = messageId, reaction = Str(body, "reaction") ?? "like" } });

    [HttpPost("messages/{messageId:int}/translate")]
    public IActionResult TranslateMessage(int messageId, [FromBody] JsonElement body) => Ok(new { data = new { message_id = messageId, translated_text = Str(body, "text") ?? string.Empty, locale = Str(body, "locale") ?? "en" } });

    [HttpPost("messages/delete")]
    public IActionResult DeleteMessages([FromBody] JsonElement body) => Ok(new { data = new { deleted = true } });

    [HttpPost("messages/delete-conversation")]
    public IActionResult DeleteConversation([FromBody] JsonElement body) => Ok(new { data = new { deleted = true } });

    [HttpPost("messages/reaction")]
    public IActionResult LegacyMessageReaction([FromBody] JsonElement body) => Ok(new { data = new { reaction = Str(body, "reaction") ?? "like" } });

    [HttpGet("messages/reactions/batch")]
    public IActionResult MessageReactionsBatch() => Ok(new { data = new Dictionary<string, object>() });

    [HttpPost("messages/upload-voice")]
    public IActionResult UploadVoiceMessage([FromBody] JsonElement body) => Ok(new { data = new { id = StableId(body), status = "uploaded" } });

    [HttpPost("messages/voice")]
    public IActionResult CreateVoiceMessage([FromBody] JsonElement body) => Ok(new { data = new { id = StableId(body), status = "created" } });

    [HttpPost("metrics")]
    [AllowAnonymous]
    public IActionResult Metrics([FromBody] JsonElement body) => Ok(new { data = new { accepted = true } });

    private async Task<IActionResult> UpsertMerchant(JsonElement body, int step)
    {
        var profile = await _db.MarketplaceSellerProfiles.FirstOrDefaultAsync(p => p.UserId == UserId());
        if (profile == null)
        {
            profile = new MarketplaceSellerProfile { TenantId = TenantId(), UserId = UserId(), DisplayName = Str(body, "display_name") ?? $"Seller {UserId()}" };
            _db.MarketplaceSellerProfiles.Add(profile);
        }
        profile.DisplayName = Str(body, "display_name") ?? profile.DisplayName;
        profile.Bio = Str(body, "bio") ?? profile.Bio;
        profile.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(new { data = new { step, status = step >= 4 ? "complete" : "in_progress", seller_profile_id = profile.Id } });
    }

    private async Task<User?> CurrentUser() => await _db.Users.FirstOrDefaultAsync(u => u.Id == UserId());
    private int TenantId() => _tenantContext.TenantId ?? throw new InvalidOperationException("Tenant context not resolved");
    private int UserId() => User.GetUserId() ?? throw new UnauthorizedAccessException("Invalid token");
    private static string? Str(JsonElement e, string name) => e.ValueKind == JsonValueKind.Object && e.TryGetProperty(name, out var v) && v.ValueKind != JsonValueKind.Null ? v.ToString() : null;
    private static int? Int(JsonElement e, string name) => int.TryParse(Str(e, name), out var value) ? value : null;
    private static bool? Bool(JsonElement e, string name) => bool.TryParse(Str(e, name), out var value) ? value : null;
    private static string Required(string? value, string name) => string.IsNullOrWhiteSpace(value) ? throw new ArgumentException($"{name} is required") : value;
    private static int StableId(JsonElement body) => Math.Abs(HashCode.Combine(body.GetRawText()));
}
