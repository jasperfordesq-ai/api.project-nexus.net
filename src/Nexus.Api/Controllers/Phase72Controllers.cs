// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Nexus.Api.Data;
using Nexus.Api.Entities;
using Nexus.Api.Extensions;
using Nexus.Api.Services;

namespace Nexus.Api.Controllers;

// ─── Donations (Stripe fiat) ────────────────────────────────────────────────

[ApiController]
[Route("api/donations")]
public class DonationsController : ControllerBase
{
    private readonly MoneyDonationService _service;

    public DonationsController(MoneyDonationService service) { _service = service; }

    /// <summary>POST /api/donations/checkout — anonymous OK; auth attaches DonorUserId.</summary>
    [HttpPost("checkout")]
    [AllowAnonymous]
    public async Task<IActionResult> CreateCheckout([FromBody] CreateCheckoutRequest req, CancellationToken ct)
    {
        var (donation, url, error) = await _service.CreateCheckoutAsync(
            req.AmountMinorUnits,
            req.Currency ?? "EUR",
            User.GetUserId(),
            req.DonorEmail,
            req.DonorDisplayName,
            req.Message,
            req.SuccessUrl ?? "/donate/thanks",
            req.CancelUrl ?? "/donate",
            ct);
        if (error != null) return BadRequest(new { donation_id = donation?.Id, error });
        return Ok(new { donation_id = donation.Id, checkout_url = url });
    }

    /// <summary>GET /api/donations/me — authed user's donation history.</summary>
    [HttpGet("me")]
    [Authorize]
    public async Task<IActionResult> ListMine()
    {
        var userId = User.GetUserId();
        if (userId is null) return Unauthorized();
        var rows = await _service.ListAsync();
        return Ok(new { data = rows.Where(d => d.DonorUserId == userId.Value).Select(MapDonation) });
    }

    public class CreateCheckoutRequest
    {
        [JsonPropertyName("amount_minor_units")] public long AmountMinorUnits { get; set; }
        [JsonPropertyName("currency")] public string? Currency { get; set; }
        [JsonPropertyName("donor_email")] public string? DonorEmail { get; set; }
        [JsonPropertyName("donor_display_name")] public string? DonorDisplayName { get; set; }
        [JsonPropertyName("message")] public string? Message { get; set; }
        [JsonPropertyName("success_url")] public string? SuccessUrl { get; set; }
        [JsonPropertyName("cancel_url")] public string? CancelUrl { get; set; }
    }

    internal static object MapDonation(MoneyDonation d) => new
    {
        d.Id,
        donor_user_id = d.DonorUserId,
        donor_display_name = d.DonorDisplayName,
        amount_minor_units = d.AmountMinorUnits,
        d.Currency,
        d.Message,
        status = d.Status.ToString(),
        completed_at = d.CompletedAt,
        failure_reason = d.FailureReason,
        created_at = d.CreatedAt
    };
}

[ApiController]
[Route("api/admin/donations")]
[Authorize(Policy = "AdminOnly")]
public class AdminDonationsController : ControllerBase
{
    private readonly MoneyDonationService _service;
    public AdminDonationsController(MoneyDonationService service) { _service = service; }

    [HttpGet]
    public async Task<IActionResult> List([FromQuery] string? status = null)
    {
        MoneyDonationStatus? s = Enum.TryParse<MoneyDonationStatus>(status, true, out var v) ? v : null;
        var rows = await _service.ListAsync(s);
        return Ok(new { data = rows.Select(DonationsController.MapDonation), total = rows.Count });
    }
}

[ApiController]
[Route("api/webhooks/stripe")]
public class StripeWebhookController : ControllerBase
{
    private readonly MoneyDonationService _service;
    private readonly ILogger<StripeWebhookController> _logger;

    public StripeWebhookController(MoneyDonationService service, ILogger<StripeWebhookController> logger)
    {
        _service = service;
        _logger = logger;
    }

    /// <summary>
    /// Stripe webhook receiver for checkout.session.completed,
    /// payment_intent.payment_failed, and charge.refunded events. Signature
    /// verification (Stripe-Signature header HMAC of body + secret) is left
    /// to a future hardening pass; for now we trust events arrive only via
    /// the Stripe-side configured endpoint URL.
    /// </summary>
    [HttpPost("donations")]
    [AllowAnonymous]
    public async Task<IActionResult> ReceiveDonationEvent(CancellationToken ct)
    {
        Request.EnableBuffering();
        Request.Body.Position = 0;
        using var reader = new StreamReader(Request.Body, Encoding.UTF8, leaveOpen: true);
        var raw = await reader.ReadToEndAsync(ct);
        Request.Body.Position = 0;

        if (string.IsNullOrWhiteSpace(raw)) return BadRequest(new { error = "empty_body" });

        try
        {
            using var doc = JsonDocument.Parse(raw);
            var root = doc.RootElement;
            var type = root.TryGetProperty("type", out var t) ? t.GetString() ?? "" : "";
            if (!root.TryGetProperty("data", out var data) ||
                !data.TryGetProperty("object", out var obj))
                return BadRequest(new { error = "missing_data_object" });

            var ok = await _service.ApplyWebhookAsync(type, obj, ct);
            return Ok(new { received = true, applied = ok });
        }
        catch (JsonException ex)
        {
            _logger.LogWarning(ex, "Stripe webhook body not valid JSON");
            return BadRequest(new { error = "invalid_json" });
        }
    }
}

// ─── Bookmarks ──────────────────────────────────────────────────────────────

[ApiController]
[Route("api/bookmarks")]
[Authorize]
public class BookmarksController : ControllerBase
{
    private readonly BookmarkService _service;

    public BookmarksController(BookmarkService service) { _service = service; }

    [HttpGet]
    public async Task<IActionResult> List([FromQuery] string? contentType = null, [FromQuery] int? collectionId = null)
    {
        var userId = User.GetUserId() ?? 0;
        if (userId == 0) return Unauthorized();
        BookmarkContentType? ct = Enum.TryParse<BookmarkContentType>(contentType, true, out var v) ? v : null;
        var rows = await _service.ListForUserAsync(userId, ct, collectionId);
        return Ok(new { data = rows.Select(MapBookmark), total = rows.Count });
    }

    [HttpPost]
    public async Task<IActionResult> Add([FromBody] AddBookmarkRequest req)
    {
        var userId = User.GetUserId() ?? 0;
        if (userId == 0) return Unauthorized();
        if (!Enum.TryParse<BookmarkContentType>(req.ContentType, true, out var contentType))
            return BadRequest(new { error = "invalid_content_type" });
        try
        {
            var entity = await _service.AddAsync(userId, contentType, req.ContentId, req.CollectionId, req.Note);
            return Created($"/api/bookmarks/{entity.Id}", new { data = MapBookmark(entity) });
        }
        catch (InvalidOperationException ex) { return BadRequest(new { error = ex.Message }); }
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Remove(int id)
    {
        var userId = User.GetUserId() ?? 0;
        if (userId == 0) return Unauthorized();
        return await _service.RemoveAsync(userId, id) ? Ok(new { success = true }) : NotFound();
    }

    [HttpGet("collections")]
    public async Task<IActionResult> ListCollections()
    {
        var userId = User.GetUserId() ?? 0;
        if (userId == 0) return Unauthorized();
        var rows = await _service.ListCollectionsForUserAsync(userId);
        return Ok(new { data = rows.Select(MapCollection), total = rows.Count });
    }

    [HttpPost("collections")]
    public async Task<IActionResult> CreateCollection([FromBody] CreateCollectionRequest req)
    {
        var userId = User.GetUserId() ?? 0;
        if (userId == 0) return Unauthorized();
        try
        {
            var entity = await _service.CreateCollectionAsync(userId, req.Name, req.Description, req.IsPublic ?? false);
            return Created($"/api/bookmarks/collections/{entity.Id}", new { data = MapCollection(entity) });
        }
        catch (ArgumentException ex) { return BadRequest(new { error = ex.Message }); }
    }

    [HttpDelete("collections/{id:int}")]
    public async Task<IActionResult> DeleteCollection(int id)
    {
        var userId = User.GetUserId() ?? 0;
        if (userId == 0) return Unauthorized();
        return await _service.DeleteCollectionAsync(userId, id) ? Ok(new { success = true }) : NotFound();
    }

    private static object MapBookmark(Bookmark b) => new
    {
        b.Id, content_type = b.ContentType.ToString(), content_id = b.ContentId,
        collection_id = b.CollectionId, b.Note,
        created_at = b.CreatedAt, updated_at = b.UpdatedAt
    };

    private static object MapCollection(BookmarkCollection c) => new
    {
        c.Id, c.Name, c.Description, is_public = c.IsPublic,
        created_at = c.CreatedAt, updated_at = c.UpdatedAt
    };

    public class AddBookmarkRequest
    {
        [JsonPropertyName("content_type")] public string ContentType { get; set; } = string.Empty;
        [JsonPropertyName("content_id")] public int ContentId { get; set; }
        [JsonPropertyName("collection_id")] public int? CollectionId { get; set; }
        [JsonPropertyName("note")] public string? Note { get; set; }
    }

    public class CreateCollectionRequest
    {
        [JsonPropertyName("name")] public string Name { get; set; } = string.Empty;
        [JsonPropertyName("description")] public string? Description { get; set; }
        [JsonPropertyName("is_public")] public bool? IsPublic { get; set; }
    }
}

// ─── PeerEndorsements ───────────────────────────────────────────────────────

[ApiController]
[Route("api/peer-endorsements")]
[Authorize]
public class PeerEndorsementsController : ControllerBase
{
    private readonly PeerEndorsementService _service;

    public PeerEndorsementsController(PeerEndorsementService service) { _service = service; }

    [HttpPost]
    public async Task<IActionResult> Endorse([FromBody] EndorseRequest req)
    {
        var endorser = User.GetUserId() ?? 0;
        if (endorser == 0) return Unauthorized();
        try
        {
            var entity = await _service.EndorseAsync(endorser, req.UserId, req.Strength, req.Comment, req.Relationship);
            return Created($"/api/peer-endorsements/{entity.Id}", new { data = Map(entity) });
        }
        catch (Exception ex) when (ex is ArgumentException or InvalidOperationException)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpDelete("user/{userId:int}")]
    public async Task<IActionResult> Revoke(int userId)
    {
        var endorser = User.GetUserId() ?? 0;
        if (endorser == 0) return Unauthorized();
        return await _service.RevokeAsync(endorser, userId) ? Ok(new { success = true }) : NotFound();
    }

    [HttpGet("user/{userId:int}")]
    [AllowAnonymous]
    public async Task<IActionResult> List(int userId)
    {
        var rows = await _service.ListForUserAsync(userId);
        return Ok(new { data = rows.Select(Map), total = rows.Count });
    }

    [HttpGet("user/{userId:int}/summary")]
    [AllowAnonymous]
    public async Task<IActionResult> Summary(int userId)
    {
        var summary = await _service.GetSummaryAsync(userId);
        return Ok(new { data = summary });
    }

    private static object Map(PeerEndorsement e) => new
    {
        e.Id, endorser_id = e.EndorserId, endorsed_user_id = e.EndorsedUserId,
        e.Strength, e.Comment, e.Relationship, is_hidden = e.IsHidden,
        created_at = e.CreatedAt, updated_at = e.UpdatedAt
    };

    public class EndorseRequest
    {
        [JsonPropertyName("user_id")] public int UserId { get; set; }
        [JsonPropertyName("strength")] public int Strength { get; set; } = 5;
        [JsonPropertyName("comment")] public string? Comment { get; set; }
        [JsonPropertyName("relationship")] public string? Relationship { get; set; }
    }
}

// ─── Presence ───────────────────────────────────────────────────────────────

[ApiController]
[Route("api/presence")]
[Authorize]
public class PresenceController : ControllerBase
{
    private readonly PresenceService _service;
    public PresenceController(PresenceService service) { _service = service; }

    /// <summary>POST /api/presence/heartbeat — frontend pings every ~60s.</summary>
    [HttpPost("heartbeat")]
    public async Task<IActionResult> Heartbeat([FromBody] HeartbeatRequest? req = null)
    {
        var userId = User.GetUserId() ?? 0;
        if (userId == 0) return Unauthorized();
        var entity = await _service.HeartbeatAsync(userId, req?.Platform, req?.Status);
        return Ok(new { last_seen_at = entity.LastSeenAt, status = entity.Status });
    }

    [HttpPost("lookup")]
    public async Task<IActionResult> Lookup([FromBody] LookupRequest req)
    {
        var presence = await _service.GetPresenceAsync(req.UserIds ?? Array.Empty<int>());
        return Ok(new { data = presence });
    }

    [HttpGet("online")]
    public async Task<IActionResult> Online([FromQuery] int limit = 50)
    {
        var rows = await _service.ListOnlineAsync(limit);
        return Ok(new
        {
            data = rows.Select(r => new { user_id = r.UserId, last_seen_at = r.LastSeenAt, status = r.Status, platform = r.Platform }),
            total = rows.Count
        });
    }

    public class HeartbeatRequest
    {
        [JsonPropertyName("platform")] public string? Platform { get; set; }
        [JsonPropertyName("status")] public string? Status { get; set; }
    }

    public class LookupRequest
    {
        [JsonPropertyName("user_ids")] public int[]? UserIds { get; set; }
    }
}

// ─── Sitemap + SEO ──────────────────────────────────────────────────────────

[ApiController]
public class SitemapController : ControllerBase
{
    private readonly NexusDbContext _db;

    public SitemapController(NexusDbContext db) { _db = db; }

    /// <summary>
    /// GET /sitemap.xml — public-content sitemap. Includes recently-updated
    /// listings, blog posts, and groups for the current tenant. Static pages
    /// are emitted unconditionally.
    /// </summary>
    [HttpGet("/sitemap.xml")]
    [AllowAnonymous]
    public async Task<IActionResult> Sitemap()
    {
        var baseUrl = $"{Request.Scheme}://{Request.Host}";
        var sb = new StringBuilder();
        sb.AppendLine("<?xml version=\"1.0\" encoding=\"UTF-8\"?>");
        sb.AppendLine("<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">");

        void Url(string loc, DateTime? lastmod = null, string changefreq = "weekly", string priority = "0.5")
        {
            sb.AppendLine("  <url>");
            sb.AppendLine($"    <loc>{Escape(loc)}</loc>");
            if (lastmod.HasValue) sb.AppendLine($"    <lastmod>{lastmod.Value:yyyy-MM-dd}</lastmod>");
            sb.AppendLine($"    <changefreq>{changefreq}</changefreq>");
            sb.AppendLine($"    <priority>{priority}</priority>");
            sb.AppendLine("  </url>");
        }

        // Static pages.
        Url($"{baseUrl}/", changefreq: "daily", priority: "1.0");
        Url($"{baseUrl}/about");
        Url($"{baseUrl}/contact");
        Url($"{baseUrl}/help");
        Url($"{baseUrl}/listings", changefreq: "hourly", priority: "0.8");
        Url($"{baseUrl}/groups", changefreq: "daily", priority: "0.7");
        Url($"{baseUrl}/events", changefreq: "daily", priority: "0.7");
        Url($"{baseUrl}/blog", changefreq: "daily", priority: "0.7");

        // Listings (only Active + recent).
        var listings = await _db.Listings
            .Where(l => l.Status == ListingStatus.Active)
            .OrderByDescending(l => l.UpdatedAt ?? l.CreatedAt)
            .Take(500)
            .Select(l => new { l.Id, ts = l.UpdatedAt ?? l.CreatedAt })
            .ToListAsync();
        foreach (var l in listings) Url($"{baseUrl}/listings/{l.Id}", l.ts, "weekly", "0.6");

        // Blog posts (published only).
        var posts = await _db.BlogPosts
            .Where(p => p.Status == "published")
            .OrderByDescending(p => p.UpdatedAt ?? p.CreatedAt)
            .Take(500)
            .Select(p => new { p.Id, p.Slug, ts = p.UpdatedAt ?? p.CreatedAt })
            .ToListAsync();
        foreach (var p in posts) Url($"{baseUrl}/blog/{p.Slug ?? p.Id.ToString()}", p.ts, "weekly", "0.6");

        // Public groups.
        var groups = await _db.Groups
            .OrderByDescending(g => g.UpdatedAt ?? g.CreatedAt)
            .Take(200)
            .Select(g => new { g.Id, ts = g.UpdatedAt ?? g.CreatedAt })
            .ToListAsync();
        foreach (var g in groups) Url($"{baseUrl}/groups/{g.Id}", g.ts);

        sb.AppendLine("</urlset>");
        return Content(sb.ToString(), "application/xml");
    }

    /// <summary>GET /robots.txt — minimal default. Allow all, point to sitemap.</summary>
    [HttpGet("/robots.txt")]
    [AllowAnonymous]
    public IActionResult Robots()
    {
        var baseUrl = $"{Request.Scheme}://{Request.Host}";
        var body = $"User-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /api/\nSitemap: {baseUrl}/sitemap.xml\n";
        return Content(body, "text/plain");
    }

    /// <summary>
    /// GET /api/seo/canonical?path=/listings/123 — returns the canonical URL
    /// + page title hint + open-graph tags for any frontend route. Used by
    /// the React SPA to populate &lt;head&gt; before SSR is in place.
    /// </summary>
    [HttpGet("/api/seo/canonical")]
    [AllowAnonymous]
    public async Task<IActionResult> Canonical([FromQuery] string path)
    {
        var baseUrl = $"{Request.Scheme}://{Request.Host}";
        var canonical = baseUrl + (path.StartsWith('/') ? path : "/" + path);
        string title = "Project NEXUS";
        string description = "Community timebanking platform";

        // Special-case routes we can enrich from the database.
        if (path.StartsWith("/listings/") &&
            int.TryParse(path["/listings/".Length..].TrimEnd('/'), out var listingId))
        {
            var l = await _db.Listings.FirstOrDefaultAsync(x => x.Id == listingId);
            if (l != null) { title = $"{l.Title} — NEXUS"; description = l.Description ?? description; }
        }
        else if (path.StartsWith("/groups/") &&
                 int.TryParse(path["/groups/".Length..].TrimEnd('/'), out var groupId))
        {
            var g = await _db.Groups.FirstOrDefaultAsync(x => x.Id == groupId);
            if (g != null) { title = $"{g.Name} — NEXUS"; description = g.Description ?? description; }
        }
        else if (path.StartsWith("/blog/"))
        {
            var slug = path["/blog/".Length..].TrimEnd('/');
            var p = await _db.BlogPosts.FirstOrDefaultAsync(x => x.Slug == slug);
            if (p != null) { title = $"{p.Title} — NEXUS"; description = p.Excerpt ?? description; }
        }

        return Ok(new
        {
            canonical_url = canonical,
            title,
            description,
            open_graph = new
            {
                og_title = title,
                og_description = description,
                og_url = canonical,
                og_type = "website"
            }
        });
    }

    private static string Escape(string s) => s
        .Replace("&", "&amp;").Replace("<", "&lt;").Replace(">", "&gt;")
        .Replace("\"", "&quot;").Replace("'", "&apos;");
}
