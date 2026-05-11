// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

/*
 * Phase 72 — services for the long-tail subsystem.
 *
 *   - MoneyDonationService    : Stripe Checkout flow + webhook reconciliation.
 *   - BookmarkService         : generic content bookmark + collection mgmt.
 *   - PeerEndorsementService  : "I vouch for this person" flow.
 *   - PresenceService         : heartbeat + online users.
 *
 * Sitemap generation is in SitemapController directly (no service needed —
 * it's just a streaming XML response of public content).
 */

using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Nexus.Api.Data;
using Nexus.Api.Entities;

namespace Nexus.Api.Services;

// ─── MoneyDonationService ────────────────────────────────────────────────────

public class MoneyDonationService
{
    private readonly NexusDbContext _db;
    private readonly TenantContext _tenant;
    private readonly IConfiguration _config;
    private readonly IHttpClientFactory _httpFactory;
    private readonly ILogger<MoneyDonationService> _logger;

    public MoneyDonationService(
        NexusDbContext db,
        TenantContext tenant,
        IConfiguration config,
        IHttpClientFactory httpFactory,
        ILogger<MoneyDonationService> logger)
    {
        _db = db;
        _tenant = tenant;
        _config = config;
        _httpFactory = httpFactory;
        _logger = logger;
    }

    /// <summary>
    /// Create a Stripe Checkout Session for a one-off donation, persist a
    /// Pending MoneyDonation row, and return the Stripe redirect URL.
    /// </summary>
    public async Task<(MoneyDonation Donation, string? CheckoutUrl, string? Error)> CreateCheckoutAsync(
        long amountMinorUnits, string currency, int? donorUserId, string? donorEmail, string? donorDisplayName,
        string? message, string successUrl, string cancelUrl, CancellationToken ct = default)
    {
        if (amountMinorUnits <= 0) return (null!, null, "amount_must_be_positive");
        if (string.IsNullOrWhiteSpace(currency) || currency.Length != 3) return (null!, null, "currency_invalid");
        if (donorUserId == null && string.IsNullOrWhiteSpace(donorEmail))
            return (null!, null, "donor_email_required_for_anonymous");

        var donation = new MoneyDonation
        {
            TenantId = _tenant.GetTenantIdOrThrow(),
            DonorUserId = donorUserId,
            DonorEmail = donorEmail,
            DonorDisplayName = donorDisplayName,
            AmountMinorUnits = amountMinorUnits,
            Currency = currency.ToUpperInvariant(),
            Message = message,
            Status = MoneyDonationStatus.Pending,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        _db.MoneyDonations.Add(donation);
        await _db.SaveChangesAsync(ct);

        var apiKey = _config["Stripe:SecretKey"];
        if (string.IsNullOrWhiteSpace(apiKey))
        {
            // Stripe not configured — keep the Pending row so admins can see
            // the intent but signal the missing key clearly.
            donation.FailureReason = "stripe_secret_key_missing";
            await _db.SaveChangesAsync(ct);
            return (donation, null, "stripe_secret_key_missing");
        }

        // POST application/x-www-form-urlencoded to Stripe Checkout.
        // Using line_items[0][...] form keys per Stripe's REST convention.
        var form = new List<KeyValuePair<string, string>>
        {
            new("mode", "payment"),
            new("success_url", successUrl),
            new("cancel_url", cancelUrl),
            new("client_reference_id", donation.Id.ToString()),
            new("line_items[0][price_data][currency]", donation.Currency.ToLowerInvariant()),
            new("line_items[0][price_data][product_data][name]", "Donation"),
            new("line_items[0][price_data][unit_amount]", donation.AmountMinorUnits.ToString()),
            new("line_items[0][quantity]", "1"),
            new("metadata[donation_id]", donation.Id.ToString()),
            new("metadata[tenant_id]", donation.TenantId.ToString())
        };
        if (!string.IsNullOrWhiteSpace(donorEmail))
            form.Add(new("customer_email", donorEmail));

        var client = _httpFactory.CreateClient("NexusStripe");
        using var req = new HttpRequestMessage(HttpMethod.Post, "https://api.stripe.com/v1/checkout/sessions")
        {
            Content = new FormUrlEncodedContent(form)
        };
        req.Headers.TryAddWithoutValidation("Authorization", $"Bearer {apiKey}");

        try
        {
            using var resp = await client.SendAsync(req, ct);
            var body = await resp.Content.ReadAsStringAsync(ct);
            using var doc = JsonDocument.Parse(body);
            if (!resp.IsSuccessStatusCode)
            {
                donation.FailureReason = $"stripe_http_{(int)resp.StatusCode}";
                await _db.SaveChangesAsync(ct);
                return (donation, null, donation.FailureReason);
            }

            var sessionId = doc.RootElement.TryGetProperty("id", out var id) ? id.GetString() : null;
            var url = doc.RootElement.TryGetProperty("url", out var u) ? u.GetString() : null;
            donation.StripeCheckoutSessionId = sessionId;
            donation.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync(ct);
            return (donation, url, null);
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException or JsonException)
        {
            _logger.LogWarning(ex, "Stripe checkout creation failed for donation {Id}", donation.Id);
            donation.FailureReason = "stripe_send_failed";
            await _db.SaveChangesAsync(ct);
            return (donation, null, donation.FailureReason);
        }
    }

    /// <summary>
    /// Idempotently apply a Stripe webhook event to the matching donation row.
    /// Caller is responsible for verifying the webhook signature; this method
    /// only mutates state.
    /// </summary>
    public async Task<bool> ApplyWebhookAsync(string eventType, JsonElement dataObject, CancellationToken ct = default)
    {
        // Stripe events of interest:
        //   checkout.session.completed   → Pending → Succeeded (payment_intent populated)
        //   payment_intent.payment_failed → Pending → Failed
        //   charge.refunded               → Succeeded → Refunded

        string? eventObjectId = dataObject.TryGetProperty("id", out var idEl) ? idEl.GetString() : null;
        string? paymentIntent = dataObject.TryGetProperty("payment_intent", out var piEl) ? piEl.GetString() : null;
        string? clientReferenceId = dataObject.TryGetProperty("client_reference_id", out var cr) ? cr.GetString() : null;

        // For payment_intent.* events the data.object.id IS the payment intent.
        // For checkout.session.* events the data.object.id is the session id and
        // data.object.payment_intent (if present) is the related PI.
        bool eventIsPaymentIntent = eventType.StartsWith("payment_intent.", StringComparison.Ordinal);
        string? sessionId = eventIsPaymentIntent ? null : eventObjectId;
        if (eventIsPaymentIntent && paymentIntent == null) paymentIntent = eventObjectId;

        MoneyDonation? donation = null;
        if (clientReferenceId != null && int.TryParse(clientReferenceId, out var donationId))
        {
            donation = await _db.MoneyDonations.IgnoreQueryFilters().FirstOrDefaultAsync(d => d.Id == donationId, ct);
        }
        if (donation == null && sessionId != null)
        {
            donation = await _db.MoneyDonations.IgnoreQueryFilters()
                .FirstOrDefaultAsync(d => d.StripeCheckoutSessionId == sessionId, ct);
        }
        if (donation == null && paymentIntent != null)
        {
            donation = await _db.MoneyDonations.IgnoreQueryFilters()
                .FirstOrDefaultAsync(d => d.StripePaymentIntentId == paymentIntent, ct);
        }
        if (donation == null) return false;

        switch (eventType)
        {
            case "checkout.session.completed":
                if (donation.Status == MoneyDonationStatus.Pending)
                {
                    donation.Status = MoneyDonationStatus.Succeeded;
                    donation.StripePaymentIntentId = paymentIntent ?? donation.StripePaymentIntentId;
                    donation.CompletedAt = DateTime.UtcNow;
                }
                break;
            case "payment_intent.payment_failed":
                if (donation.Status == MoneyDonationStatus.Pending)
                {
                    donation.Status = MoneyDonationStatus.Failed;
                    donation.FailureReason = dataObject.TryGetProperty("last_payment_error", out var le) &&
                        le.TryGetProperty("message", out var lem) ? lem.GetString() : "stripe_payment_failed";
                }
                break;
            case "charge.refunded":
                if (donation.Status == MoneyDonationStatus.Succeeded)
                    donation.Status = MoneyDonationStatus.Refunded;
                break;
        }
        donation.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
        return true;
    }

    public Task<List<MoneyDonation>> ListAsync(MoneyDonationStatus? status = null) =>
        (status.HasValue
            ? _db.MoneyDonations.Where(d => d.Status == status.Value)
            : _db.MoneyDonations)
        .OrderByDescending(d => d.CreatedAt).Take(200).ToListAsync();
}

// ─── BookmarkService ────────────────────────────────────────────────────────

public class BookmarkService
{
    private readonly NexusDbContext _db;
    private readonly TenantContext _tenant;

    public BookmarkService(NexusDbContext db, TenantContext tenant)
    {
        _db = db;
        _tenant = tenant;
    }

    public async Task<Bookmark> AddAsync(int userId, BookmarkContentType contentType, int contentId, int? collectionId, string? note)
    {
        // Validate collection ownership if specified.
        if (collectionId.HasValue)
        {
            var owned = await _db.BookmarkCollections.AnyAsync(c => c.Id == collectionId.Value && c.UserId == userId);
            if (!owned) throw new InvalidOperationException("collection_not_owned");
        }
        var existing = await _db.Bookmarks.FirstOrDefaultAsync(b =>
            b.UserId == userId && b.ContentType == contentType && b.ContentId == contentId);
        if (existing != null)
        {
            existing.CollectionId = collectionId;
            existing.Note = note;
            existing.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
            return existing;
        }
        var entity = new Bookmark
        {
            TenantId = _tenant.GetTenantIdOrThrow(),
            UserId = userId,
            ContentType = contentType,
            ContentId = contentId,
            CollectionId = collectionId,
            Note = note,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        _db.Bookmarks.Add(entity);
        await _db.SaveChangesAsync();
        return entity;
    }

    public async Task<bool> RemoveAsync(int userId, int bookmarkId)
    {
        var entity = await _db.Bookmarks.FirstOrDefaultAsync(b => b.Id == bookmarkId && b.UserId == userId);
        if (entity == null) return false;
        _db.Bookmarks.Remove(entity);
        await _db.SaveChangesAsync();
        return true;
    }

    public Task<List<Bookmark>> ListForUserAsync(int userId, BookmarkContentType? contentType = null, int? collectionId = null)
    {
        var q = _db.Bookmarks.Where(b => b.UserId == userId);
        if (contentType.HasValue) q = q.Where(b => b.ContentType == contentType.Value);
        if (collectionId.HasValue) q = q.Where(b => b.CollectionId == collectionId.Value);
        return q.OrderByDescending(b => b.CreatedAt).ToListAsync();
    }

    public async Task<BookmarkCollection> CreateCollectionAsync(int userId, string name, string? description, bool isPublic)
    {
        if (string.IsNullOrWhiteSpace(name)) throw new ArgumentException("name_required", nameof(name));
        var entity = new BookmarkCollection
        {
            TenantId = _tenant.GetTenantIdOrThrow(),
            UserId = userId,
            Name = name,
            Description = description,
            IsPublic = isPublic,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        _db.BookmarkCollections.Add(entity);
        await _db.SaveChangesAsync();
        return entity;
    }

    public Task<List<BookmarkCollection>> ListCollectionsForUserAsync(int userId) =>
        _db.BookmarkCollections.Where(c => c.UserId == userId).OrderBy(c => c.Name).ToListAsync();

    public async Task<bool> DeleteCollectionAsync(int userId, int collectionId)
    {
        var entity = await _db.BookmarkCollections.FirstOrDefaultAsync(c => c.Id == collectionId && c.UserId == userId);
        if (entity == null) return false;
        // Bookmarks are cascaded to null Collection by EF config (DeleteBehavior.SetNull).
        _db.BookmarkCollections.Remove(entity);
        await _db.SaveChangesAsync();
        return true;
    }
}

// ─── PeerEndorsementService ─────────────────────────────────────────────────

public class PeerEndorsementService
{
    private readonly NexusDbContext _db;
    private readonly TenantContext _tenant;

    public PeerEndorsementService(NexusDbContext db, TenantContext tenant)
    {
        _db = db;
        _tenant = tenant;
    }

    public async Task<PeerEndorsement> EndorseAsync(int endorserId, int endorsedUserId, int strength, string? comment, string? relationship)
    {
        if (endorserId == endorsedUserId) throw new InvalidOperationException("cannot_endorse_self");
        if (strength < 1 || strength > 5) throw new ArgumentException("strength_must_be_1_to_5", nameof(strength));

        var existing = await _db.PeerEndorsements.FirstOrDefaultAsync(e =>
            e.EndorserId == endorserId && e.EndorsedUserId == endorsedUserId);
        if (existing != null)
        {
            existing.Strength = strength;
            existing.Comment = comment;
            existing.Relationship = relationship;
            existing.IsHidden = false;
            existing.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
            return existing;
        }
        var entity = new PeerEndorsement
        {
            TenantId = _tenant.GetTenantIdOrThrow(),
            EndorserId = endorserId,
            EndorsedUserId = endorsedUserId,
            Strength = strength,
            Comment = comment,
            Relationship = relationship,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        _db.PeerEndorsements.Add(entity);
        await _db.SaveChangesAsync();
        return entity;
    }

    public async Task<bool> RevokeAsync(int endorserId, int endorsedUserId)
    {
        var entity = await _db.PeerEndorsements.FirstOrDefaultAsync(e =>
            e.EndorserId == endorserId && e.EndorsedUserId == endorsedUserId);
        if (entity == null) return false;
        _db.PeerEndorsements.Remove(entity);
        await _db.SaveChangesAsync();
        return true;
    }

    public Task<List<PeerEndorsement>> ListForUserAsync(int endorsedUserId) =>
        _db.PeerEndorsements
            .Where(e => e.EndorsedUserId == endorsedUserId && !e.IsHidden)
            .OrderByDescending(e => e.CreatedAt).ToListAsync();

    public async Task<EndorsementSummary> GetSummaryAsync(int endorsedUserId)
    {
        var rows = await _db.PeerEndorsements
            .Where(e => e.EndorsedUserId == endorsedUserId && !e.IsHidden)
            .Select(e => new { e.Strength, e.Relationship }).ToListAsync();
        return new EndorsementSummary
        {
            Count = rows.Count,
            AverageStrength = rows.Count > 0 ? rows.Average(r => (double)r.Strength) : 0,
            ByRelationship = rows
                .Where(r => !string.IsNullOrWhiteSpace(r.Relationship))
                .GroupBy(r => r.Relationship!)
                .ToDictionary(g => g.Key, g => g.Count())
        };
    }
}

public class EndorsementSummary
{
    public int Count { get; set; }
    public double AverageStrength { get; set; }
    public Dictionary<string, int> ByRelationship { get; set; } = new();
}

// ─── PresenceService ────────────────────────────────────────────────────────

public class PresenceService
{
    private readonly NexusDbContext _db;
    private readonly TenantContext _tenant;

    private static readonly TimeSpan OnlineWindow = TimeSpan.FromMinutes(5);

    public PresenceService(NexusDbContext db, TenantContext tenant)
    {
        _db = db;
        _tenant = tenant;
    }

    /// <summary>Heartbeat from the client. Idempotent upsert.</summary>
    public async Task<UserPresence> HeartbeatAsync(int userId, string? platform, string? status)
    {
        var existing = await _db.UserPresences.FirstOrDefaultAsync(p => p.UserId == userId);
        var now = DateTime.UtcNow;
        if (existing != null)
        {
            existing.LastSeenAt = now;
            if (!string.IsNullOrWhiteSpace(platform)) existing.Platform = platform;
            if (!string.IsNullOrWhiteSpace(status)) existing.Status = status;
            existing.UpdatedAt = now;
            await _db.SaveChangesAsync();
            return existing;
        }
        var entity = new UserPresence
        {
            TenantId = _tenant.GetTenantIdOrThrow(),
            UserId = userId,
            LastSeenAt = now,
            Platform = platform,
            Status = string.IsNullOrWhiteSpace(status) ? "online" : status!,
            CreatedAt = now,
            UpdatedAt = now
        };
        _db.UserPresences.Add(entity);
        await _db.SaveChangesAsync();
        return entity;
    }

    /// <summary>Bulk presence lookup. Honours each user's "invisible" status.</summary>
    public async Task<Dictionary<int, string>> GetPresenceAsync(IEnumerable<int> userIds)
    {
        var ids = userIds.ToList();
        var cutoff = DateTime.UtcNow - OnlineWindow;
        var rows = await _db.UserPresences.Where(p => ids.Contains(p.UserId)).ToListAsync();
        var result = new Dictionary<int, string>();
        foreach (var row in rows)
        {
            if (row.Status == "invisible") { result[row.UserId] = "offline"; continue; }
            result[row.UserId] = row.LastSeenAt > cutoff ? row.Status : "offline";
        }
        // Users with no row → offline.
        foreach (var id in ids) if (!result.ContainsKey(id)) result[id] = "offline";
        return result;
    }

    public async Task<List<UserPresence>> ListOnlineAsync(int limit = 50)
    {
        var cutoff = DateTime.UtcNow - OnlineWindow;
        return await _db.UserPresences
            .Where(p => p.LastSeenAt > cutoff && p.Status != "invisible")
            .OrderByDescending(p => p.LastSeenAt)
            .Take(Math.Clamp(limit, 1, 200))
            .ToListAsync();
    }
}
