// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Nexus.Api.Data;
using Nexus.Api.Extensions;

namespace Nexus.Api.Controllers;

[ApiController]
[Route("api")]
public class MiscParityController : ControllerBase
{
    private readonly NexusDbContext _db;
    private readonly TenantContext _tenantContext;

    public MiscParityController(NexusDbContext db, TenantContext tenantContext)
    {
        _db = db;
        _tenantContext = tenantContext;
    }

    [HttpGet("csrf-token")]
    [AllowAnonymous]
    public IActionResult RootCsrfToken() => Ok(new { csrf_token = Token() });

    [HttpGet("access-log")]
    [Authorize]
    public IActionResult AccessLog() => Ok(new { data = Array.Empty<object>() });

    [HttpGet("achievements")]
    [Authorize]
    public async Task<IActionResult> Achievements() => Ok(new { data = await _db.UserBadges.Where(b => b.UserId == UserId()).ToListAsync() });

    [HttpGet("achievements/progress")]
    [Authorize]
    public IActionResult AchievementProgress() => Ok(new { data = new { completed = 0, total = 0 } });

    [HttpGet("ads/active")]
    [Authorize]
    public IActionResult ActiveAds() => Ok(new { data = Array.Empty<object>() });

    [HttpPost("ads/impression")]
    [Authorize]
    public IActionResult AdImpression([FromBody] JsonElement body) => Ok(new { data = new { id = StableId(body), tracked = true } });

    [HttpPost("ads/impression/{impressionId:int}/click")]
    [Authorize]
    public IActionResult AdClick(int impressionId) => Ok(new { data = new { impression_id = impressionId, clicked = true } });

    [HttpPost("ai/generate/bio")]
    [Authorize]
    public IActionResult GenerateBio([FromBody] JsonElement body) => Ok(new { data = new { bio = $"Community member interested in {Str(body, "interests") ?? "helping others"}." } });

    [HttpPost("ai/generate/listing")]
    [Authorize]
    public IActionResult GenerateListing([FromBody] JsonElement body) => Ok(new { data = new { title = Str(body, "title") ?? "Community listing", description = "Generated listing draft." } });

    [HttpPost("ai/test-provider")]
    [Authorize]
    public IActionResult TestAiProvider() => Ok(new { data = new { ok = true } });

    [HttpPost("app/log")]
    [AllowAnonymous]
    public IActionResult AppLog([FromBody] JsonElement body) => Ok(new { accepted = true });

    [HttpGet("app/version")]
    [AllowAnonymous]
    public IActionResult AppVersion() => Ok(new { version = "2.0", api = "nexus" });

    [HttpPost("appreciations")]
    [Authorize]
    public IActionResult CreateAppreciation([FromBody] JsonElement body) => Ok(new { data = new { id = StableId(body), created = true } });

    [HttpGet("appreciations/most-appreciated")]
    [Authorize]
    public async Task<IActionResult> MostAppreciated() => Ok(new { data = await _db.Reviews.GroupBy(r => r.TargetUserId).Select(g => new { user_id = g.Key, count = g.Count() }).Take(20).ToListAsync() });

    [HttpPost("appreciations/{id:int}/react")]
    [Authorize]
    public IActionResult ReactAppreciation(int id, [FromBody] JsonElement body) => Ok(new { data = new { id, reaction = Str(body, "reaction") ?? "like" } });

    [HttpDelete("appreciations/{id:int}/react")]
    [Authorize]
    public IActionResult DeleteAppreciationReaction(int id) => NoContent();

    [HttpGet("billing/plans")]
    [AllowAnonymous]
    public IActionResult BillingPlans() => Ok(new { data = new[] { new { id = "free", price = 0 }, new { id = "premium", price = 10 } } });

    [HttpGet("bookmark-collections")]
    [Authorize]
    public async Task<IActionResult> BookmarkCollections() => Ok(new { data = await _db.MarketplaceCollections.Where(c => c.UserId == UserId()).ToListAsync() });

    [HttpPost("bookmark-collections")]
    [Authorize]
    public async Task<IActionResult> CreateBookmarkCollection([FromBody] JsonElement body)
    {
        var collection = new Nexus.Api.Entities.MarketplaceCollection { TenantId = TenantId(), UserId = UserId(), Name = Str(body, "name") ?? "Collection" };
        _db.MarketplaceCollections.Add(collection);
        await _db.SaveChangesAsync();
        return Ok(new { data = collection });
    }

    [HttpDelete("bookmark-collections/{id:int}")]
    [Authorize]
    public async Task<IActionResult> DeleteBookmarkCollection(int id)
    {
        var collection = await _db.MarketplaceCollections.FirstOrDefaultAsync(c => c.UserId == UserId() && c.Id == id);
        if (collection != null) _db.MarketplaceCollections.Remove(collection);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpGet("bookmarks")]
    [Authorize]
    public async Task<IActionResult> Bookmarks() => Ok(new { data = await _db.MarketplaceSavedListings.Where(s => s.UserId == UserId()).ToListAsync() });

    [HttpPost("bookmarks")]
    [Authorize]
    public async Task<IActionResult> CreateBookmark([FromBody] JsonElement body)
    {
        var listingId = Int(body, "listing_id") ?? Int(body, "item_id") ?? 0;
        if (listingId > 0 && !await _db.MarketplaceSavedListings.AnyAsync(s => s.UserId == UserId() && s.MarketplaceListingId == listingId))
            _db.MarketplaceSavedListings.Add(new Nexus.Api.Entities.MarketplaceSavedListing { TenantId = TenantId(), UserId = UserId(), MarketplaceListingId = listingId });
        await _db.SaveChangesAsync();
        return Ok(new { saved = true });
    }

    [HttpGet("bookmarks/status")]
    [Authorize]
    public IActionResult BookmarkStatus([FromQuery] int? item_id = null) => Ok(new { data = new { item_id, saved = false } });

    [HttpPost("bookmarks/{id:int}/move")]
    [Authorize]
    public IActionResult MoveBookmark(int id, [FromBody] JsonElement body) => Ok(new { data = new { id, collection_id = Int(body, "collection_id") } });

    [HttpGet("clubs")]
    [Authorize]
    public async Task<IActionResult> Clubs() => Ok(new { data = await _db.Groups.Where(g => g.TenantId == TenantId()).ToListAsync() });

    [HttpGet("community/stats")]
    [AllowAnonymous]
    public async Task<IActionResult> CommunityStats() => Ok(new { data = new { members = await _db.Users.CountAsync(), listings = await _db.Listings.CountAsync(), groups = await _db.Groups.CountAsync() } });

    [HttpGet("config/google-maps")]
    [AllowAnonymous]
    public IActionResult GoogleMapsConfig() => Ok(new { data = new { enabled = false } });

    [HttpGet("cookie-consent/inventory")]
    [AllowAnonymous]
    public IActionResult CookieInventory() => Ok(new { data = Array.Empty<object>() });

    [HttpGet("cookie-consent/check/{key}")]
    [AllowAnonymous]
    public IActionResult CookieConsentCheck(string key) => Ok(new { data = new { key, consented = false } });

    [HttpPut("cookie-consent/{id:int}")]
    [AllowAnonymous]
    public IActionResult UpdateCookieConsent(int id, [FromBody] JsonElement body) => Ok(new { data = new { id, updated = true } });

    [HttpDelete("cookie-consent/{id:int}")]
    [AllowAnonymous]
    public IActionResult DeleteCookieConsent(int id) => NoContent();

    [HttpGet("connections/status/me")]
    [Authorize]
    public IActionResult ConnectionStatusMe() => Ok(new { data = new { connected = true } });

    [HttpGet("connections/suggestions")]
    [Authorize]
    public async Task<IActionResult> ConnectionSuggestions() => Ok(new { data = await _db.Users.Where(u => u.TenantId == TenantId() && u.Id != UserId()).Take(20).ToListAsync() });

    [HttpPost("connections/{id:int}/decline")]
    [Authorize]
    public IActionResult DeclineConnectionCompat(int id) => Ok(new { data = new { id, status = "declined" } });

    [HttpPost("daily-reward/check")]
    [Authorize]
    public IActionResult DailyRewardCheck() => Ok(new { data = new { awarded = false } });

    [HttpGet("daily-reward/status")]
    [Authorize]
    public IActionResult DailyRewardStatus() => Ok(new { data = new { available = true } });

    [HttpGet("docs")]
    [AllowAnonymous]
    public IActionResult Docs() => Ok(new { data = new { openapi = "/api/docs/openapi.json" } });

    [HttpGet("docs/openapi.json")]
    [AllowAnonymous]
    public IActionResult OpenApiJson() => Ok(new { openapi = "3.0.0", info = new { title = "Project NEXUS API", version = "2.0" } });

    [HttpGet("docs/openapi.yaml")]
    [AllowAnonymous]
    public IActionResult OpenApiYaml() => Content("openapi: 3.0.0\ninfo:\n  title: Project NEXUS API\n  version: '2.0'\n", "application/yaml", Encoding.UTF8);

    [HttpPost("donations/payment-intent")]
    [Authorize]
    public IActionResult DonationPaymentIntent([FromBody] JsonElement body) => Ok(new { data = new { client_secret = "mock_secret", amount = Decimal(body, "amount") ?? 0 } });

    [HttpGet("donations/{id:int}/receipt")]
    [Authorize]
    public IActionResult DonationReceipt(int id) => File(Encoding.UTF8.GetBytes($"Donation receipt {id}"), "text/plain", $"donation-{id}.txt");

    [HttpPost("gdpr/consent")]
    [Authorize]
    public IActionResult GdprConsent([FromBody] JsonElement body) => Ok(new { data = new { consent = true } });

    [HttpPost("gdpr/delete-account")]
    [Authorize]
    public IActionResult GdprDeleteAccount() => Ok(new { data = new { queued = true } });

    [HttpPost("gdpr/request")]
    [Authorize]
    public IActionResult GdprRequest([FromBody] JsonElement body) => Ok(new { data = new { id = StableId(body), status = "pending" } });

    [HttpGet("gamification/badges/{id:int}")]
    [Authorize]
    public async Task<IActionResult> GamificationBadge(int id) => Ok(new { data = await _db.Badges.FirstOrDefaultAsync(b => b.Id == id) });

    [HttpGet("gamification/challenges")]
    [Authorize]
    public async Task<IActionResult> GamificationChallenges() => Ok(new { data = await _db.Challenges.Where(c => c.TenantId == TenantId()).Take(50).ToListAsync() });

    [HttpGet("gamification/community-dashboard")]
    [Authorize]
    public async Task<IActionResult> GamificationCommunityDashboard() => Ok(new { data = new { members = await _db.Users.CountAsync(u => u.TenantId == TenantId()), xp = await _db.Users.Where(u => u.TenantId == TenantId()).SumAsync(u => u.TotalXp) } });

    [HttpGet("gamification/engagement-history")]
    [Authorize]
    public async Task<IActionResult> GamificationEngagementHistory() => Ok(new { data = await _db.XpLogs.Where(x => x.UserId == UserId()).OrderByDescending(x => x.CreatedAt).Take(50).ToListAsync() });

    [HttpGet("gamification/member-spotlight")]
    [Authorize]
    public async Task<IActionResult> GamificationMemberSpotlight() => Ok(new { data = await _db.Users.Where(u => u.TenantId == TenantId()).OrderByDescending(u => u.TotalXp).Select(u => new { u.Id, u.FirstName, u.LastName, u.TotalXp }).FirstOrDefaultAsync() });

    [HttpGet("gamification/personal-journey")]
    [Authorize]
    public async Task<IActionResult> GamificationPersonalJourney() => Ok(new { data = await _db.XpLogs.Where(x => x.UserId == UserId()).OrderBy(x => x.CreatedAt).ToListAsync() });

    [HttpGet("gamification/share")]
    [Authorize]
    public IActionResult GamificationShare() => Ok(new { data = new { url = $"/members/{UserId()}/achievements" } });

    [HttpPost("gamification/showcase")]
    [Authorize]
    public IActionResult GamificationShowcase([FromBody] JsonElement body) => Ok(new { data = new { showcased = true } });

    [HttpGet("gamification/showcased")]
    [Authorize]
    public IActionResult GamificationShowcased() => Ok(new { data = Array.Empty<object>() });

    [HttpGet("gamification/summary")]
    [Authorize]
    public async Task<IActionResult> GamificationSummary() => Ok(new { data = await _db.Users.Where(u => u.Id == UserId()).Select(u => new { u.TotalXp, u.Level }).FirstOrDefaultAsync() });

    [HttpGet("goals/{id:int}/history/summary")]
    [Authorize]
    public IActionResult GoalHistorySummary(int id) => Ok(new { data = new { goal_id = id, updates = 0 } });

    [HttpGet("goals/{id:int}/checkins")]
    [Authorize]
    public IActionResult GoalCheckins(int id) => Ok(new { data = Array.Empty<object>() });

    [HttpGet("goals/{id:int}/reminder")]
    [Authorize]
    public IActionResult GoalReminder(int id) => Ok(new { data = new { goal_id = id, enabled = false } });

    [HttpPost("goals/templates")]
    [Authorize]
    public IActionResult GoalTemplates([FromBody] JsonElement body) => Ok(new { data = new { id = StableId(body), created = true } });

    [HttpGet("group-chatrooms/{id:int}/messages")]
    [Authorize]
    public IActionResult GroupChatroomMessages(int id) => Ok(new { data = Array.Empty<object>() });

    [HttpPost("group-chatrooms/{id:int}/messages")]
    [Authorize]
    public IActionResult CreateGroupChatroomMessage(int id, [FromBody] JsonElement body) => Ok(new { data = new { id = StableId(body), chatroom_id = id, content = Str(body, "content") } });

    [HttpDelete("group-chatrooms/{id:int}")]
    [Authorize]
    public IActionResult DeleteGroupChatroom(int id) => NoContent();

    [HttpDelete("group-chatroom-messages/{id:int}")]
    [Authorize]
    public IActionResult DeleteGroupChatroomMessage(int id) => NoContent();

    [HttpGet("group-collections")]
    [Authorize]
    public async Task<IActionResult> GroupCollections() => Ok(new { data = await _db.Groups.Where(g => g.TenantId == TenantId()).Take(20).ToListAsync() });

    [HttpGet("group-collections/{id:int}")]
    [Authorize]
    public async Task<IActionResult> GroupCollection(int id) => Ok(new { data = await _db.Groups.FirstOrDefaultAsync(g => g.TenantId == TenantId() && g.Id == id) });

    [HttpGet("group-tags")]
    [Authorize]
    public IActionResult GroupTags() => Ok(new { data = Array.Empty<string>() });

    [HttpGet("group-tags/popular")]
    [Authorize]
    public IActionResult PopularGroupTags() => Ok(new { data = Array.Empty<string>() });

    [HttpGet("group-tags/suggest")]
    [Authorize]
    public IActionResult SuggestGroupTags() => Ok(new { data = Array.Empty<string>() });

    [HttpGet("group-templates")]
    [Authorize]
    public IActionResult GroupTemplates() => Ok(new { data = Array.Empty<object>() });

    [HttpPost("help/feedback")]
    [AllowAnonymous]
    public IActionResult HelpFeedback([FromBody] JsonElement body) => Ok(new { data = new { received = true } });

    [HttpPost("ideation-categories")]
    [Authorize]
    public IActionResult CreateIdeationCategory([FromBody] JsonElement body) => Ok(new { data = new { id = StableId(body), name = Str(body, "name") } });

    [HttpPut("ideation-categories/{id:int}")]
    [Authorize]
    public IActionResult UpdateIdeationCategory(int id, [FromBody] JsonElement body) => Ok(new { data = new { id, name = Str(body, "name") } });

    [HttpDelete("ideation-categories/{id:int}")]
    [Authorize]
    public IActionResult DeleteIdeationCategory(int id) => NoContent();

    [HttpPost("ideation-challenges")]
    [Authorize]
    public IActionResult CreateIdeationChallenge([FromBody] JsonElement body) => Ok(new { data = new { id = StableId(body), title = Str(body, "title") } });

    [HttpPost("ideation-campaigns")]
    [Authorize]
    public IActionResult CreateIdeationCampaign([FromBody] JsonElement body) => Ok(new { data = new { id = StableId(body), title = Str(body, "title") ?? "Campaign", status = "draft" } });

    [HttpPost("ideation-campaigns/{id:int}/challenges")]
    [Authorize]
    public IActionResult CreateIdeationCampaignChallenge(int id, [FromBody] JsonElement body) => Ok(new { data = new { id = StableId(body), campaign_id = id, title = Str(body, "title") ?? "Challenge" } });

    [HttpDelete("ideation-campaigns/{id:int}/challenges/{challengeId:int}")]
    [Authorize]
    public IActionResult DeleteIdeationCampaignChallenge(int id, int challengeId) => NoContent();

    [HttpGet("ideation-ideas/{id:int}/comments")]
    [Authorize]
    public IActionResult IdeationIdeaComments(int id) => Ok(new { data = Array.Empty<object>(), idea_id = id });

    [HttpGet("ideation-ideas/{id:int}/media")]
    [Authorize]
    public IActionResult IdeationIdeaMedia(int id) => Ok(new { data = Array.Empty<object>(), idea_id = id });

    [HttpGet("ideation-challenges/{id:int}/ideas")]
    [Authorize]
    public IActionResult IdeationChallengeIdeas(int id) => Ok(new { data = Array.Empty<object>() });

    [HttpGet("ideation-challenges/{id:int}/team-links")]
    [Authorize]
    public IActionResult IdeationChallengeTeamLinks(int id) => Ok(new { data = Array.Empty<object>() });

    [HttpPut("ideation-challenges/{id:int}/outcome")]
    [Authorize]
    public IActionResult UpdateIdeationChallengeOutcome(int id, [FromBody] JsonElement body) => Ok(new { data = new { id, outcome = Str(body, "outcome") } });

    [HttpDelete("ideation-media/{id:int}")]
    [Authorize]
    public IActionResult DeleteIdeationMedia(int id) => NoContent();

    [HttpGet("ideation-tags")]
    [Authorize]
    public IActionResult IdeationTags() => Ok(new { data = Array.Empty<object>() });

    [HttpPost("ideation-tags")]
    [Authorize]
    public IActionResult CreateIdeationTag([FromBody] JsonElement body) => Ok(new { data = new { id = StableId(body), name = Str(body, "name") } });

    [HttpDelete("ideation-tags/{id:int}")]
    [Authorize]
    public IActionResult DeleteIdeationTag(int id) => NoContent();

    [HttpPost("ideation-templates")]
    [Authorize]
    public IActionResult CreateIdeationTemplate([FromBody] JsonElement body) => Ok(new { data = new { id = StableId(body), title = Str(body, "title") } });

    [HttpGet("ideation-templates/{id:int}")]
    [Authorize]
    public IActionResult IdeationTemplate(int id) => Ok(new { data = new { id } });

    [HttpPut("ideation-templates/{id:int}")]
    [Authorize]
    public IActionResult UpdateIdeationTemplate(int id, [FromBody] JsonElement body) => Ok(new { data = new { id, title = Str(body, "title") } });

    [HttpDelete("ideation-templates/{id:int}")]
    [Authorize]
    public IActionResult DeleteIdeationTemplate(int id) => NoContent();

    [HttpGet("identity/status")]
    [Authorize]
    public IActionResult IdentityStatus() => Ok(new { data = new { status = "not_started" } });

    [HttpPost("identity/start")]
    [Authorize]
    public IActionResult IdentityStart([FromBody] JsonElement body) => Ok(new { data = new { status = "pending" } });

    [HttpPost("identity/save-dob")]
    [Authorize]
    public IActionResult IdentitySaveDob([FromBody] JsonElement body) => Ok(new { data = new { saved = true } });

    [HttpPost("identity/create-payment")]
    [Authorize]
    public IActionResult IdentityCreatePayment([FromBody] JsonElement body) => Ok(new { data = new { client_secret = "mock_secret" } });

    [HttpPost("kb")]
    [Authorize]
    public IActionResult CreateKb([FromBody] JsonElement body) => Ok(new { data = new { id = StableId(body), title = Str(body, "title") } });

    [HttpPut("kb/{id:int}")]
    [Authorize]
    public IActionResult UpdateKb(int id, [FromBody] JsonElement body) => Ok(new { data = new { id, title = Str(body, "title") } });

    [HttpDelete("kb/{id:int}")]
    [Authorize]
    public IActionResult DeleteKb(int id) => NoContent();

    [HttpGet("kb/slug/{slug}")]
    [AllowAnonymous]
    public IActionResult KbBySlug(string slug) => Ok(new { data = new { slug, title = slug } });

    [HttpPost("kb/{id:int}/attachments")]
    [Authorize]
    public IActionResult KbAttachment(int id, [FromBody] JsonElement body) => Ok(new { data = new { id = StableId(body), article_id = id } });

    [HttpGet("kb/{id:int}/attachments/{attachmentId:int}/download")]
    [Authorize]
    public IActionResult KbAttachmentDownload(int id, int attachmentId) => File(Encoding.UTF8.GetBytes($"Attachment {attachmentId}"), "text/plain", $"kb-{id}-{attachmentId}.txt");

    [HttpDelete("kb/{id:int}/attachments/{attachmentId:int}")]
    [Authorize]
    public IActionResult DeleteKbAttachment(int id, int attachmentId) => NoContent();

    [HttpGet("laravel/health")]
    [AllowAnonymous]
    public IActionResult LaravelHealth() => Ok(new { ok = true, compatibility = "v1.5" });

    [HttpGet("leaderboard")]
    [Authorize]
    public async Task<IActionResult> Leaderboard() => Ok(new { data = await _db.Users.Where(u => u.TenantId == TenantId()).OrderByDescending(u => u.TotalXp).Take(50).Select(u => new { u.Id, u.FirstName, u.LastName, u.TotalXp }).ToListAsync() });

    [HttpGet("leaderboard/widget")]
    [Authorize]
    public Task<IActionResult> LeaderboardWidget() => Leaderboard();

    [HttpPost("legal/accept")]
    [Authorize]
    public IActionResult LegalAccept([FromBody] JsonElement body) => Ok(new { accepted = true });

    [HttpPost("legal/accept-all")]
    [Authorize]
    public IActionResult LegalAcceptAll() => Ok(new { accepted = "all" });

    [HttpGet("legal/status")]
    [Authorize]
    public IActionResult LegalStatus() => Ok(new { data = new { accepted = true } });

    [HttpPost("link-preview")]
    [Authorize]
    public IActionResult LinkPreview([FromBody] JsonElement body) => Ok(new { data = new { url = Str(body, "url"), title = Str(body, "url") ?? "Preview", description = string.Empty } });

    [HttpGet("newsletter/click/{id}")]
    [AllowAnonymous]
    public IActionResult NewsletterClick(string id) => Redirect("/");

    [HttpGet("newsletter/pixel/{id}")]
    [AllowAnonymous]
    public IActionResult NewsletterPixel(string id) => File(Convert.FromBase64String("R0lGODlhAQABAAAAACw="), "image/gif");

    [HttpGet("newsletter/unsubscribe")]
    [AllowAnonymous]
    public IActionResult NewsletterUnsubscribe() => Ok(new { unsubscribed = true });

    [HttpGet("nexus-score")]
    [Authorize]
    public IActionResult NexusScore() => Ok(new { data = new { score = 500 } });

    [HttpGet("onboarding/config")]
    [Authorize]
    public IActionResult OnboardingConfig() => Ok(new { data = new { steps = Array.Empty<object>() } });

    [HttpGet("onboarding/status")]
    [Authorize]
    public IActionResult OnboardingStatus() => Ok(new { data = new { complete = false } });

    [HttpGet("onboarding/safeguarding-options")]
    [Authorize]
    public IActionResult SafeguardingOptions() => Ok(new { data = Array.Empty<object>() });

    [HttpPost("onboarding/safeguarding")]
    [Authorize]
    public IActionResult SaveSafeguarding([FromBody] JsonElement body) => Ok(new { data = new { saved = true } });

    [HttpGet("organizations/{id:int}/members")]
    [Authorize]
    public IActionResult OrganizationMembers(int id) => Ok(new { data = Array.Empty<object>() });

    [HttpGet("organizations/{id:int}/wallet/balance")]
    [Authorize]
    public IActionResult OrganizationWalletBalance(int id) => Ok(new { data = new { organisation_id = id, balance = 0 } });

    [HttpPost("pilot-inquiry")]
    [AllowAnonymous]
    public IActionResult PilotInquiry([FromBody] JsonElement body) => Ok(new { data = new { received = true } });

    [HttpPut("polls/{id:int}")]
    [Authorize]
    public IActionResult UpdatePoll(int id, [FromBody] JsonElement body) => Ok(new { data = new { id, title = Str(body, "title") } });

    [HttpGet("polls/{id:int}/export")]
    [Authorize]
    public IActionResult ExportPoll(int id) => File(Encoding.UTF8.GetBytes($"poll_id\n{id}\n"), "text/csv", $"poll-{id}.csv");

    [HttpPost("polls/vote")]
    [Authorize]
    public IActionResult LegacyPollVote([FromBody] JsonElement body) => Ok(new { data = new { voted = true } });

    [HttpPost("pusher/auth")]
    [Authorize]
    public IActionResult PusherAuthPost([FromBody] JsonElement body) => Ok(new { auth = "mock:pusher" });

    [HttpGet("pusher/auth")]
    [Authorize]
    public IActionResult PusherAuthGet() => Ok(new { auth = "mock:pusher" });

    [HttpGet("pusher/config")]
    [AllowAnonymous]
    public IActionResult PusherConfig() => Ok(new { data = new { enabled = false } });

    [HttpPost("reactions")]
    [Authorize]
    public IActionResult CreateReaction([FromBody] JsonElement body) => Ok(new { data = new { id = StableId(body), reaction = Str(body, "reaction") ?? "like" } });

    [HttpGet("comments/{id:int}/reactions")]
    [Authorize]
    public IActionResult CommentReactions(int id) => Ok(new { data = Array.Empty<object>(), comment_id = id });

    [HttpGet("recommendations/groups")]
    [Authorize]
    public async Task<IActionResult> RecommendedGroups() => Ok(new { data = await _db.Groups.Where(g => g.TenantId == TenantId()).Take(20).ToListAsync() });

    [HttpGet("recommendations/similar/{id:int}")]
    [Authorize]
    public IActionResult SimilarRecommendations(int id) => Ok(new { data = Array.Empty<object>(), source_id = id });

    [HttpPost("recommendations/track")]
    [Authorize]
    public IActionResult TrackRecommendation([FromBody] JsonElement body) => Ok(new { data = new { tracked = true } });

    [HttpGet("reactions/{type}/{id:int}")]
    [Authorize]
    public IActionResult Reactions(string type, int id) => Ok(new { data = Array.Empty<object>(), type, id });

    [HttpGet("reactions/{type}/{id:int}/users/{reaction}")]
    [Authorize]
    public IActionResult ReactionUsers(string type, int id, string reaction) => Ok(new { data = Array.Empty<object>() });

    [HttpGet("resources/{id:int}/download")]
    [Authorize]
    public IActionResult ResourceDownload(int id) => File(Encoding.UTF8.GetBytes($"Resource {id}"), "text/plain", $"resource-{id}.txt");

    [HttpPost("reviews")]
    [Authorize]
    public IActionResult CreateReviewCompat([FromBody] JsonElement body) => Ok(new { data = new { id = StableId(body), created = true } });

    [HttpGet("reviews/user/{userId:int}/stats")]
    [Authorize]
    public async Task<IActionResult> ReviewUserStats(int userId)
    {
        var reviews = await _db.Reviews.Where(r => r.TargetUserId == userId).ToListAsync();
        return Ok(new { data = new { count = reviews.Count, average = reviews.Count == 0 ? 0 : Math.Round(reviews.Average(r => r.Rating), 2) } });
    }

    [HttpGet("safeguarding/my-preferences")]
    [Authorize]
    public IActionResult SafeguardingPreferences() => Ok(new { data = new { enabled = false } });

    [HttpPost("safeguarding/revoke")]
    [Authorize]
    public IActionResult RevokeSafeguarding() => Ok(new { data = new { revoked = true } });

    [HttpPost("search/saved/{id:int}/run")]
    [Authorize]
    public IActionResult RunSavedSearch(int id) => Ok(new { data = Array.Empty<object>(), saved_search_id = id });

    [HttpGet("search/trending")]
    [Authorize]
    public IActionResult TrendingSearch() => Ok(new { data = Array.Empty<string>() });

    [HttpGet("seo/metadata/{slug}")]
    [AllowAnonymous]
    public IActionResult SeoMetadata(string slug) => Ok(new { data = new { slug, title = slug } });

    [HttpGet("seo/redirects")]
    [AllowAnonymous]
    public IActionResult SeoRedirects() => Ok(new { data = Array.Empty<object>() });

    [HttpPost("shares")]
    [Authorize]
    public IActionResult CreateShare([FromBody] JsonElement body) => Ok(new { data = new { id = StableId(body), shared = true } });

    [HttpDelete("shares")]
    [Authorize]
    public IActionResult DeleteShare([FromBody] JsonElement body) => NoContent();

    [HttpPost("shop/purchase")]
    [Authorize]
    public IActionResult ShopPurchase([FromBody] JsonElement body) => Ok(new { data = new { id = StableId(body), status = "purchased" } });

    [HttpPost("skills/categories")]
    [Authorize]
    public IActionResult CreateSkillCategory([FromBody] JsonElement body) => Ok(new { data = new { id = StableId(body), name = Str(body, "name") ?? "Category" } });

    [HttpPut("skills/categories/{id:int}")]
    [Authorize]
    public IActionResult UpdateSkillCategory(int id, [FromBody] JsonElement body) => Ok(new { data = new { id, name = Str(body, "name") ?? "Category" } });

    [HttpDelete("skills/categories/{id:int}")]
    [Authorize]
    public IActionResult DeleteSkillCategory(int id) => NoContent();

    [HttpGet("streaks")]
    [Authorize]
    public IActionResult Streaks() => Ok(new { data = new { current = 0 } });

    [HttpGet("team-tasks/{id:int}")]
    [Authorize]
    public IActionResult TeamTask(int id) => Ok(new { data = new { id, status = "open" } });

    [HttpGet("totp/status")]
    [Authorize]
    public IActionResult TotpStatus() => Ok(new { enabled = false });

    [HttpPost("totp/verify")]
    [Authorize]
    public IActionResult TotpVerify([FromBody] JsonElement body) => Ok(new { verified = true });

    [HttpPost("ugc-translate")]
    [Authorize]
    public IActionResult UgcTranslate([FromBody] JsonElement body) => Ok(new { data = new { translated_text = Str(body, "text") ?? string.Empty } });

    [HttpGet("vol_opportunities")]
    [Authorize]
    public async Task<IActionResult> LegacyVolOpportunities() => Ok(new { data = await _db.VolunteerOpportunities.Take(50).ToListAsync() });

    [HttpPost("group-exchanges/{id:int}/complete")]
    [Authorize]
    public IActionResult CompleteGroupExchange(int id) => Ok(new { data = new { id, status = "completed" } });

    [HttpPost("webhooks/identity/{provider}")]
    [AllowAnonymous]
    public IActionResult IdentityWebhook(string provider, [FromBody] JsonElement body) => Ok(new { provider, received = true });

    [HttpPost("webhooks/sendgrid/events")]
    [AllowAnonymous]
    public IActionResult SendgridEvents([FromBody] JsonElement body) => Ok(new { received = true });

    [HttpPost("webhooks/stripe")]
    [AllowAnonymous]
    public IActionResult StripeWebhook([FromBody] JsonElement body) => Ok(new { received = true });

    private int TenantId() => _tenantContext.TenantId ?? 0;
    private int UserId() => User.GetUserId() ?? 0;
    private static string Token() => Convert.ToHexString(RandomNumberGenerator.GetBytes(16)).ToLowerInvariant();
    private static string? Str(JsonElement e, string name) => e.ValueKind == JsonValueKind.Object && e.TryGetProperty(name, out var v) && v.ValueKind != JsonValueKind.Null ? v.ToString() : null;
    private static int? Int(JsonElement e, string name) => int.TryParse(Str(e, name), out var value) ? value : null;
    private static decimal? Decimal(JsonElement e, string name) => decimal.TryParse(Str(e, name), out var value) ? value : null;
    private static int StableId(JsonElement body) => Math.Abs(HashCode.Combine(body.GetRawText()));
}
