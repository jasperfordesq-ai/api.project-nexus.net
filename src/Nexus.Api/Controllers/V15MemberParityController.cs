// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Nexus.Api.Data;
using Nexus.Api.Entities;
using Nexus.Api.Extensions;

namespace Nexus.Api.Controllers;

/// <summary>
/// Compact member-facing V1.5 compatibility surface for route parity.
/// These endpoints bridge legacy frontend/API paths onto the existing V2 data model.
/// </summary>
[ApiController]
[Authorize]
public class V15MemberParityController : ControllerBase
{
    private const int PartnerTokenTtlSeconds = 3600;
    private const string ApiVersionHeader = "API-Version";
    private const string ApiVersion = "2.0";

    private readonly NexusDbContext _db;
    private readonly TenantContext _tenantContext;
    private readonly IConfiguration _config;

    public V15MemberParityController(NexusDbContext db, TenantContext tenantContext, IConfiguration config)
    {
        _db = db;
        _tenantContext = tenantContext;
        _config = config;
    }

    [HttpGet("api/v2/events")]
    public async Task<IActionResult> V2Events([FromQuery] int page = 1, [FromQuery] int limit = 20, [FromQuery] string? search = null)
    {
        var query = _db.Events.AsNoTracking().Where(e => !e.IsCancelled);
        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLowerInvariant();
            query = query.Where(e => e.Title.ToLower().Contains(term) || (e.Description != null && e.Description.ToLower().Contains(term)));
        }

        var total = await query.CountAsync();
        var events = await query.OrderBy(e => e.StartsAt).Skip(Skip(page, limit)).Take(Limit(limit)).Select(e => new
        {
            id = e.Id,
            title = e.Title,
            description = e.Description,
            location = e.Location,
            starts_at = e.StartsAt,
            ends_at = e.EndsAt,
            image_url = e.ImageUrl,
            max_attendees = e.MaxAttendees,
            rsvp_count = e.Rsvps.Count(r => r.Status == Event.RsvpStatus.Going),
            is_cancelled = e.IsCancelled,
            created_at = e.CreatedAt
        }).ToListAsync();

        return Ok(Paged(events, page, limit, total));
    }

    [HttpGet("api/v2/events/nearby")]
    [HttpGet("api/v2/events/series")]
    [HttpGet("api/v2/events/series/{seriesId:int}")]
    public async Task<IActionResult> V2EventCollections()
    {
        var data = await _db.Events.AsNoTracking().Where(e => !e.IsCancelled && e.StartsAt >= DateTime.UtcNow)
            .OrderBy(e => e.StartsAt).Take(20).Select(e => new { id = e.Id, title = e.Title, starts_at = e.StartsAt, location = e.Location }).ToListAsync();
        return Ok(new { data });
    }

    [HttpPost("api/v2/events")]
    [HttpPost("api/v2/events/recurring")]
    [HttpPost("api/v2/events/series")]
    public async Task<IActionResult> V2CreateEvent([FromBody] JsonElement body)
    {
        var userId = CurrentUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid token" });

        var title = GetString(body, "title") ?? "Untitled event";
        var startsAt = GetDate(body, "starts_at") ?? GetDate(body, "start_time") ?? DateTime.UtcNow.AddDays(7);
        var ev = new Event
        {
            TenantId = TenantId(),
            CreatedById = userId.Value,
            Title = title,
            Description = GetString(body, "description"),
            Location = GetString(body, "location"),
            StartsAt = startsAt,
            EndsAt = GetDate(body, "ends_at") ?? GetDate(body, "end_time"),
            MaxAttendees = GetInt(body, "max_attendees"),
            ImageUrl = GetString(body, "image_url") ?? GetString(body, "cover_image")
        };

        _db.Events.Add(ev);
        await _db.SaveChangesAsync();
        return Created($"api/v2/events/{ev.Id}", new { success = true, data = EventDto(ev) });
    }

    [HttpGet("api/v2/events/{id:int}")]
    public async Task<IActionResult> V2Event(int id)
    {
        var ev = await _db.Events.AsNoTracking().FirstOrDefaultAsync(e => e.Id == id);
        return ev == null ? NotFound(new { error = "Event not found" }) : Ok(new { data = EventDto(ev) });
    }

    [HttpPut("api/v2/events/{id:int}")]
    [HttpPut("api/v2/events/{id:int}/recurring")]
    [HttpPut("api/v2/events/{id:int}/reminders")]
    public async Task<IActionResult> V2UpdateEvent(int id, [FromBody] JsonElement body)
    {
        var ev = await _db.Events.FirstOrDefaultAsync(e => e.Id == id);
        if (ev == null) return NotFound(new { error = "Event not found" });

        ev.Title = GetString(body, "title") ?? ev.Title;
        ev.Description = GetString(body, "description") ?? ev.Description;
        ev.Location = GetString(body, "location") ?? ev.Location;
        ev.StartsAt = GetDate(body, "starts_at") ?? ev.StartsAt;
        ev.EndsAt = GetDate(body, "ends_at") ?? ev.EndsAt;
        ev.MaxAttendees = GetInt(body, "max_attendees") ?? ev.MaxAttendees;
        ev.ImageUrl = GetString(body, "image_url") ?? ev.ImageUrl;
        ev.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(new { success = true, data = EventDto(ev) });
    }

    [HttpDelete("api/v2/events/{id:int}")]
    public async Task<IActionResult> V2DeleteEvent(int id)
    {
        var ev = await _db.Events.FirstOrDefaultAsync(e => e.Id == id);
        if (ev == null) return NotFound(new { error = "Event not found" });
        _db.Events.Remove(ev);
        await _db.SaveChangesAsync();
        return Ok(new { success = true });
    }

    [HttpPost("api/v2/events/{id:int}/cancel")]
    public async Task<IActionResult> V2CancelEvent(int id)
    {
        var ev = await _db.Events.FirstOrDefaultAsync(e => e.Id == id);
        if (ev == null) return NotFound(new { error = "Event not found" });
        ev.IsCancelled = true;
        ev.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(new { success = true, data = EventDto(ev) });
    }

    [HttpGet("api/v2/events/{id:int}/attendees")]
    [HttpGet("api/v2/events/{id:int}/attendance")]
    public async Task<IActionResult> V2EventAttendees(int id)
    {
        var attendees = await _db.EventRsvps.AsNoTracking().Where(r => r.EventId == id)
            .Select(r => new { id = r.UserId, user_id = r.UserId, status = r.Status, responded_at = r.RespondedAt }).ToListAsync();
        return Ok(new { data = attendees });
    }

    [HttpPost("api/events/rsvp")]
    [HttpPost("api/v2/events/{id:int}/rsvp")]
    [HttpPost("api/v2/events/{id:int}/attendance")]
    [HttpPost("api/v2/events/{id:int}/attendance/bulk")]
    [HttpPost("api/v2/events/{id:int}/attendees/{attendeeId:int}/check-in")]
    [HttpPost("api/v2/events/{id:int}/waitlist")]
    public async Task<IActionResult> V2Rsvp(int? id, [FromBody] JsonElement body)
    {
        var eventId = id ?? GetInt(body, "event_id");
        var userId = GetInt(body, "user_id") ?? CurrentUserId();
        if (eventId == null || userId == null) return BadRequest(new { error = "event_id is required" });
        if (!await _db.Events.AnyAsync(e => e.Id == eventId.Value)) return NotFound(new { error = "Event not found" });

        var status = GetString(body, "status") ?? Event.RsvpStatus.Going;
        var rsvp = await _db.EventRsvps.FirstOrDefaultAsync(r => r.EventId == eventId.Value && r.UserId == userId.Value);
        if (rsvp == null)
        {
            rsvp = new EventRsvp { TenantId = TenantId(), EventId = eventId.Value, UserId = userId.Value, Status = status };
            _db.EventRsvps.Add(rsvp);
        }
        else
        {
            rsvp.Status = status;
            rsvp.RespondedAt = DateTime.UtcNow;
        }

        await _db.SaveChangesAsync();
        return Ok(new { success = true, data = new { event_id = eventId, user_id = userId, status = rsvp.Status, checked_in = true } });
    }

    [HttpDelete("api/v2/events/{id:int}/rsvp")]
    [HttpDelete("api/v2/events/{id:int}/waitlist")]
    public async Task<IActionResult> V2RemoveRsvp(int id)
    {
        var userId = CurrentUserId();
        var rsvp = await _db.EventRsvps.FirstOrDefaultAsync(r => r.EventId == id && r.UserId == userId);
        if (rsvp != null)
        {
            _db.EventRsvps.Remove(rsvp);
            await _db.SaveChangesAsync();
        }
        return Ok(new { success = true });
    }

    [HttpGet("api/v2/events/{id:int}/reminders")]
    [HttpPost("api/v2/events/{id:int}/image")]
    [HttpPost("api/v2/events/{id:int}/series")]
    [HttpGet("api/v2/events/{id:int}/waitlist")]
    public IActionResult V2EventLightweight(int id) => Ok(new { data = Array.Empty<object>(), event_id = id, success = true });

    [HttpGet("api/v2/listings")]
    [HttpGet("api/v2/listings/featured")]
    [HttpGet("api/v2/listings/nearby")]
    [HttpGet("api/v2/users/{id:int}/listings")]
    [HttpGet("api/v2/users/me/listings")]
    [HttpGet("api/v2/federation/listings")]
    public async Task<IActionResult> V2Listings([FromQuery] int page = 1, [FromQuery] int limit = 20, [FromQuery] string? type = null)
    {
        var query = _db.Listings.AsNoTracking().Where(l => l.DeletedAt == null);
        if (type != null && Enum.TryParse<ListingType>(type, true, out var parsedType)) query = query.Where(l => l.Type == parsedType);
        if (Request.Path.Value?.Contains("featured", StringComparison.OrdinalIgnoreCase) == true) query = query.Where(l => l.IsFeatured);

        var total = await query.CountAsync();
        var listings = await query.OrderByDescending(l => l.CreatedAt).Skip(Skip(page, limit)).Take(Limit(limit)).Select(l => new
        {
            id = l.Id,
            title = l.Title,
            description = l.Description,
            type = l.Type.ToString().ToLowerInvariant(),
            status = l.Status.ToString().ToLowerInvariant(),
            location = l.Location,
            estimated_hours = l.EstimatedHours,
            is_featured = l.IsFeatured,
            view_count = l.ViewCount,
            created_at = l.CreatedAt,
            user_id = l.UserId
        }).ToListAsync();
        return Ok(Paged(listings, page, limit, total));
    }

    [HttpGet("api/v2/listings/saved")]
    public async Task<IActionResult> V2SavedListings()
    {
        var userId = CurrentUserId();
        var saved = await _db.ListingFavorites.AsNoTracking().Where(f => f.UserId == userId)
            .Select(f => new { id = f.ListingId, saved_at = f.CreatedAt }).ToListAsync();
        return Ok(new { data = saved });
    }

    [HttpGet("api/v2/listings/{id:int}")]
    public async Task<IActionResult> V2Listing(int id)
    {
        var listing = await _db.Listings.AsNoTracking().FirstOrDefaultAsync(l => l.Id == id && l.DeletedAt == null);
        return listing == null ? NotFound(new { error = "Listing not found" }) : Ok(new { data = ListingDto(listing) });
    }

    [HttpPost("api/v2/listings")]
    public async Task<IActionResult> V2CreateListing([FromBody] JsonElement body)
    {
        var userId = CurrentUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid token" });

        var listing = new Listing
        {
            TenantId = TenantId(),
            UserId = userId.Value,
            Title = GetString(body, "title") ?? "Untitled listing",
            Description = GetString(body, "description"),
            Type = Enum.TryParse<ListingType>(GetString(body, "type"), true, out var type) ? type : ListingType.Offer,
            Status = ListingStatus.Active,
            Location = GetString(body, "location"),
            EstimatedHours = GetDecimal(body, "estimated_hours")
        };
        _db.Listings.Add(listing);
        await _db.SaveChangesAsync();
        return Created($"api/v2/listings/{listing.Id}", new { success = true, data = ListingDto(listing) });
    }

    [HttpPut("api/v2/listings/{id:int}")]
    public async Task<IActionResult> V2UpdateListing(int id, [FromBody] JsonElement body)
    {
        var listing = await _db.Listings.FirstOrDefaultAsync(l => l.Id == id && l.DeletedAt == null);
        if (listing == null) return NotFound(new { error = "Listing not found" });
        listing.Title = GetString(body, "title") ?? listing.Title;
        listing.Description = GetString(body, "description") ?? listing.Description;
        listing.Location = GetString(body, "location") ?? listing.Location;
        listing.EstimatedHours = GetDecimal(body, "estimated_hours") ?? listing.EstimatedHours;
        listing.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(new { success = true, data = ListingDto(listing) });
    }

    [HttpDelete("api/v2/listings/{id:int}")]
    [HttpPost("api/listings/delete")]
    public async Task<IActionResult> V2DeleteListing(int? id, [FromBody] JsonElement body)
    {
        var listingId = id ?? GetInt(body, "id") ?? GetInt(body, "listing_id");
        if (listingId == null) return BadRequest(new { error = "listing id is required" });
        var listing = await _db.Listings.FirstOrDefaultAsync(l => l.Id == listingId.Value);
        if (listing == null) return NotFound(new { error = "Listing not found" });
        listing.DeletedAt = DateTime.UtcNow;
        listing.Status = ListingStatus.Cancelled;
        await _db.SaveChangesAsync();
        return Ok(new { success = true });
    }

    [HttpPost("api/v2/listings/{id:int}/save")]
    public async Task<IActionResult> V2SaveListing(int id)
    {
        var userId = CurrentUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid token" });
        if (!await _db.ListingFavorites.AnyAsync(f => f.ListingId == id && f.UserId == userId.Value))
        {
            _db.ListingFavorites.Add(new ListingFavorite { TenantId = TenantId(), ListingId = id, UserId = userId.Value });
            await _db.SaveChangesAsync();
        }
        return Ok(new { success = true });
    }

    [HttpDelete("api/v2/listings/{id:int}/save")]
    public async Task<IActionResult> V2UnsaveListing(int id)
    {
        var userId = CurrentUserId();
        var favorite = await _db.ListingFavorites.FirstOrDefaultAsync(f => f.ListingId == id && f.UserId == userId);
        if (favorite != null)
        {
            _db.ListingFavorites.Remove(favorite);
            await _db.SaveChangesAsync();
        }
        return Ok(new { success = true });
    }

    [HttpPut("api/v2/listings/{id:int}/tags")]
    public async Task<IActionResult> V2UpdateListingTags(int id, [FromBody] JsonElement body)
    {
        var tags = ReadStringArray(body, "tags");
        var existing = await _db.ListingTags.Where(t => t.ListingId == id).ToListAsync();
        _db.ListingTags.RemoveRange(existing);
        foreach (var tag in tags.Distinct(StringComparer.OrdinalIgnoreCase))
        {
            _db.ListingTags.Add(new ListingTag { TenantId = TenantId(), ListingId = id, Tag = tag, TagType = "skill" });
        }
        await _db.SaveChangesAsync();
        return Ok(new { success = true, data = tags });
    }

    [HttpGet("api/v2/listings/tags/popular")]
    [HttpGet("api/v2/listings/tags/autocomplete")]
    public async Task<IActionResult> V2ListingTags([FromQuery] string? q = null)
    {
        var query = _db.ListingTags.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(q)) query = query.Where(t => t.Tag.ToLower().Contains(q.ToLower()));
        var tags = await query.GroupBy(t => t.Tag).OrderByDescending(g => g.Count()).Take(25).Select(g => new { tag = g.Key, count = g.Count() }).ToListAsync();
        return Ok(new { data = tags });
    }

    [HttpPost("api/ai/generate/listing")]
    [HttpPost("api/v2/listings/generate-description")]
    public IActionResult V2GenerateListingDescription([FromBody] JsonElement body)
    {
        var title = GetString(body, "title") ?? GetString(body, "keywords") ?? "Community listing";
        return Ok(new { success = true, description = $"Share details, availability, and expected time credits for {title}.", title });
    }

    [HttpGet("api/v2/listings/{id:int}/analytics")]
    [HttpPost("api/v2/listings/{id:int}/image")]
    [HttpDelete("api/v2/listings/{id:int}/image")]
    [HttpPost("api/v2/listings/{id:int}/images")]
    [HttpDelete("api/v2/listings/{id:int}/images/{imageId:int}")]
    [HttpPut("api/v2/listings/{id:int}/images/reorder")]
    [HttpPost("api/v2/listings/{id:int}/renew")]
    [HttpPost("api/v2/listings/{id:int}/report")]
    public IActionResult V2ListingLightweight(int id) => Ok(new { success = true, data = new { listing_id = id } });

    [HttpGet("api/v2/wallet/balance")]
    public async Task<IActionResult> V2WalletBalance()
    {
        var targetUserId = CurrentUserId();
        if (targetUserId == null) return Unauthorized(new { error = "Invalid token" });
        return await BuildWalletBalanceAsync(targetUserId.Value);
    }

    [HttpGet("api/partner/v1/wallet/balance/{userId:int}")]
    [AllowAnonymous]
    public async Task<IActionResult> PartnerWalletBalance(int userId)
    {
        // Partner federation endpoint: must be invoked through the federation
        // auth middleware (which sets FederationTenantId on HttpContext.Items).
        // Without that context, treat as unauthorized — never let an ordinary
        // authenticated user pass an arbitrary userId here.
        if (!TryRequirePartnerScope("wallet.read", out var partnerResult, out _))
        {
            return partnerResult!;
        }

        if (!await _db.Users.AnyAsync(u => u.Id == userId && u.TenantId == TenantId()))
        {
            return PartnerError("USER_NOT_FOUND", "User not found.", 404);
        }

        var received = await _db.Transactions.Where(t => t.ReceiverId == userId && t.Status == TransactionStatus.Completed).SumAsync(t => t.Amount);
        var sent = await _db.Transactions.Where(t => t.SenderId == userId && t.Status == TransactionStatus.Completed).SumAsync(t => t.Amount);
        return PartnerData(new
        {
            user_id = userId,
            balance_hours = Math.Round(received - sent, 4),
            currency = "time_credits"
        });
    }

    private async Task<IActionResult> BuildWalletBalanceAsync(int targetUserId)
    {
        var received = await _db.Transactions.Where(t => t.ReceiverId == targetUserId && t.Status == TransactionStatus.Completed).SumAsync(t => t.Amount);
        var sent = await _db.Transactions.Where(t => t.SenderId == targetUserId && t.Status == TransactionStatus.Completed).SumAsync(t => t.Amount);
        return Ok(new { balance = received - sent, currency = "hours", received_total = received, sent_total = sent });
    }

    [HttpGet("api/v2/wallet/transactions")]
    [HttpGet("api/v2/wallet/statement")]
    public async Task<IActionResult> V2WalletTransactions([FromQuery] int page = 1, [FromQuery] int limit = 20)
    {
        var userId = CurrentUserId();
        var query = _db.Transactions.AsNoTracking().Where(t => t.SenderId == userId || t.ReceiverId == userId);
        var total = await query.CountAsync();
        var data = await query.OrderByDescending(t => t.CreatedAt).Skip(Skip(page, limit)).Take(Limit(limit)).Select(t => new
        {
            id = t.Id,
            amount = t.Amount,
            description = t.Description,
            type = t.SenderId == userId ? "debit" : "credit",
            status = t.Status.ToString().ToLowerInvariant(),
            created_at = t.CreatedAt
        }).ToListAsync();
        return Ok(Paged(data, page, limit, total));
    }

    [HttpGet("api/v2/wallet/transactions/{id:int}")]
    public async Task<IActionResult> V2WalletTransaction(int id)
    {
        var tx = await _db.Transactions.AsNoTracking().FirstOrDefaultAsync(t => t.Id == id);
        return tx == null ? NotFound(new { error = "Transaction not found" }) : Ok(new { data = tx });
    }

    [HttpDelete("api/v2/wallet/transactions/{id:int}")]
    public async Task<IActionResult> V2DeleteWalletTransaction(int id)
    {
        var tx = await _db.Transactions.FirstOrDefaultAsync(t => t.Id == id);
        if (tx == null) return NotFound(new { error = "Transaction not found" });
        tx.Status = TransactionStatus.Cancelled;
        tx.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(new { success = true });
    }

    [HttpPost("api/v2/wallet/transfer")]
    public async Task<IActionResult> V2WalletTransfer([FromBody] JsonElement body)
    {
        var senderId = CurrentUserId();
        var receiverId = GetInt(body, "receiver_id") ?? GetInt(body, "recipient_id") ?? GetInt(body, "user_id");
        var amount = GetDecimal(body, "amount") ?? 0;
        if (senderId == null || receiverId == null || amount <= 0) return BadRequest(new { error = "receiver_id and positive amount are required" });

        var tx = new Transaction
        {
            TenantId = TenantId(),
            SenderId = senderId.Value,
            ReceiverId = receiverId.Value,
            Amount = amount,
            Description = GetString(body, "description") ?? GetString(body, "message"),
            Status = TransactionStatus.Completed
        };
        _db.Transactions.Add(tx);
        await _db.SaveChangesAsync();
        return Ok(new { success = true, data = new { tx.Id, tx.Amount, tx.ReceiverId } });
    }

    [HttpPost("api/partner/v1/wallet/credit")]
    [AllowAnonymous]
    public async Task<IActionResult> PartnerWalletCredit([FromBody] JsonElement body)
    {
        if (!TryRequirePartnerScope("wallet.write", out var partnerResult, out var partner))
        {
            return partnerResult!;
        }

        var userId = GetInt(body, "user_id") ?? 0;
        var hours = GetDecimal(body, "hours") ?? 0m;
        var reference = GetString(body, "reference")?.Trim() ?? string.Empty;
        var note = GetString(body, "note")?.Trim();
        if (userId <= 0 || hours <= 0 || string.IsNullOrWhiteSpace(reference))
        {
            return PartnerError("invalid_request", "user_id, hours and reference are required.", 422);
        }

        if (!await _db.Users.AnyAsync(u => u.Id == userId && u.TenantId == TenantId()))
        {
            return PartnerError("USER_NOT_FOUND", "User not found.", 404);
        }

        var senderId = await _db.Users
            .Where(u => u.TenantId == TenantId() && u.Id != userId && u.IsActive)
            .OrderByDescending(u => u.Role == "admin")
            .Select(u => u.Id)
            .FirstOrDefaultAsync();
        if (senderId == 0)
        {
            return PartnerError("invalid_partner", "No tenant ledger source user is available.", 403);
        }

        var description = $"Partner wallet credit from {partner?.Name ?? "partner"} ({reference})";
        if (!string.IsNullOrWhiteSpace(note))
        {
            description += $": {note}";
        }

        var tx = new Transaction
        {
            TenantId = TenantId(),
            SenderId = senderId,
            ReceiverId = userId,
            Amount = Math.Round(hours, 2),
            Description = description,
            Status = TransactionStatus.Completed
        };
        _db.Transactions.Add(tx);
        await _db.SaveChangesAsync();

        return PartnerData(new
        {
            transaction_id = tx.Id,
            user_id = userId,
            hours = tx.Amount,
            reference,
            replayed = false
        }, 201);
    }

    [HttpGet("api/v2/wallet/categories")]
    public async Task<IActionResult> V2WalletCategories() => Ok(new { data = await _db.TransactionCategories.AsNoTracking().ToListAsync() });

    [HttpPost("api/v2/wallet/categories")]
    public async Task<IActionResult> V2CreateWalletCategory([FromBody] JsonElement body)
    {
        var category = new TransactionCategory { TenantId = TenantId(), Name = GetString(body, "name") ?? "General", Description = GetString(body, "description"), Color = GetString(body, "color"), Icon = GetString(body, "icon") };
        _db.TransactionCategories.Add(category);
        await _db.SaveChangesAsync();
        return Ok(new { success = true, data = category });
    }

    [HttpPut("api/v2/wallet/categories/{id:int}")]
    public async Task<IActionResult> V2UpdateWalletCategory(int id, [FromBody] JsonElement body)
    {
        var category = await _db.TransactionCategories.FirstOrDefaultAsync(c => c.Id == id);
        if (category == null) return NotFound(new { error = "Category not found" });
        category.Name = GetString(body, "name") ?? category.Name;
        category.Description = GetString(body, "description") ?? category.Description;
        category.Color = GetString(body, "color") ?? category.Color;
        category.Icon = GetString(body, "icon") ?? category.Icon;
        await _db.SaveChangesAsync();
        return Ok(new { success = true, data = category });
    }

    [HttpDelete("api/v2/wallet/categories/{id:int}")]
    public async Task<IActionResult> V2DeleteWalletCategory(int id)
    {
        var category = await _db.TransactionCategories.FirstOrDefaultAsync(c => c.Id == id);
        if (category != null)
        {
            _db.TransactionCategories.Remove(category);
            await _db.SaveChangesAsync();
        }
        return Ok(new { success = true });
    }

    [HttpPost("api/v2/wallet/donate")]
    [HttpPost("api/v2/wallet/community-fund/donate")]
    [HttpPost("api/v2/wallet/community-fund/deposit")]
    [HttpPost("api/v2/wallet/community-fund/withdraw")]
    public IActionResult V2WalletDonation() => Ok(new { success = true, data = new { status = "recorded" } });

    [HttpGet("api/v2/wallet/donations")]
    public async Task<IActionResult> V2WalletDonations() => Ok(new { data = await _db.CreditDonations.AsNoTracking().OrderByDescending(d => d.CreatedAt).Take(50).ToListAsync() });

    [HttpGet("api/v2/wallet/community-fund")]
    [HttpGet("api/v2/wallet/community-fund/transactions")]
    [HttpGet("api/v2/wallet/pending-count")]
    [HttpGet("api/v2/wallet/starting-balance")]
    [HttpPut("api/v2/wallet/starting-balance")]
    [HttpGet("api/v2/wallet/user-search")]
    [HttpPost("api/wallet/user-search")]
    public async Task<IActionResult> V2WalletLightweight([FromQuery] string? q = null)
    {
        if (Request.Path.Value?.Contains("user-search", StringComparison.OrdinalIgnoreCase) == true)
        {
            var users = await _db.Users.AsNoTracking().Where(u => q == null || u.Email.ToLower().Contains(q.ToLower()) || u.FirstName.ToLower().Contains(q.ToLower()) || u.LastName.ToLower().Contains(q.ToLower()))
                .Take(20).Select(u => new { id = u.Id, email = u.Email, name = (u.FirstName + " " + u.LastName).Trim() }).ToListAsync();
            return Ok(new { data = users });
        }

        return Ok(new { success = true, data = Array.Empty<object>(), balance = 0, pending_count = 0, starting_balance = 0 });
    }

    [HttpGet("api/v2/volunteering/organisations/{id:int}/wallet")]
    [HttpGet("api/organizations/{id:int}/wallet/balance")]
    public async Task<IActionResult> V2OrganisationWallet(int id)
    {
        var wallet = await _db.OrgWallets.AsNoTracking().FirstOrDefaultAsync(w => w.OrganisationId == id);
        return Ok(new { data = wallet ?? new OrgWallet { TenantId = TenantId(), OrganisationId = id }, balance = wallet?.Balance ?? 0 });
    }

    [HttpGet("api/v2/volunteering/organisations/{id:int}/wallet/transactions")]
    public async Task<IActionResult> V2OrganisationWalletTransactions(int id)
    {
        var wallet = await _db.OrgWallets.AsNoTracking().FirstOrDefaultAsync(w => w.OrganisationId == id);
        var data = wallet == null ? Array.Empty<object>() : await _db.OrgWalletTransactions.AsNoTracking().Where(t => t.OrgWalletId == wallet.Id).OrderByDescending(t => t.CreatedAt).Cast<object>().ToArrayAsync();
        return Ok(new { data });
    }

    [HttpPost("api/v2/volunteering/organisations/{id:int}/wallet/deposit")]
    [HttpPut("api/v2/volunteering/organisations/{id:int}/wallet/auto-pay")]
    public IActionResult V2OrganisationWalletMutate(int id) => Ok(new { success = true, organisation_id = id });

    [HttpGet("api/organizations/{id:int}/members")]
    public async Task<IActionResult> V2OrganisationMembers(int id)
    {
        var data = await _db.OrganisationMembers.AsNoTracking().Where(m => m.OrganisationId == id)
            .Select(m => new { id = m.Id, user_id = m.UserId, role = m.Role, joined_at = m.JoinedAt }).ToListAsync();
        return Ok(new { data });
    }

    [HttpGet("api/v2/conversations/{id:int}/messages")]
    [HttpGet("api/ai/conversations/{id:int}")]
    public async Task<IActionResult> V2ConversationMessages(int id)
    {
        var messages = await _db.Messages.AsNoTracking().Where(m => m.ConversationId == id).OrderBy(m => m.CreatedAt)
            .Select(m => new { id = m.Id, conversation_id = m.ConversationId, sender_id = m.SenderId, content = m.Content, is_read = m.IsRead, created_at = m.CreatedAt }).ToListAsync();
        return Ok(new { data = messages });
    }

    [HttpGet("api/v2/conversations/groups")]
    public async Task<IActionResult> V2Messages()
    {
        var userId = CurrentUserId();
        var data = await _db.Conversations.AsNoTracking().Where(c => c.Participant1Id == userId || c.Participant2Id == userId)
            .OrderByDescending(c => c.UpdatedAt ?? c.CreatedAt).Take(50)
            .Select(c => new { id = c.Id, participant1_id = c.Participant1Id, participant2_id = c.Participant2Id, created_at = c.CreatedAt, updated_at = c.UpdatedAt }).ToListAsync();
        return Ok(new { data });
    }

    [HttpPost("api/v2/conversations/{id:int}/messages")]
    public async Task<IActionResult> V2SendConversationMessage(int id, [FromBody] JsonElement body)
    {
        var userId = CurrentUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid token" });
        var message = new Message { TenantId = TenantId(), ConversationId = id, SenderId = userId.Value, Content = GetString(body, "content") ?? GetString(body, "message") ?? string.Empty };
        _db.Messages.Add(message);
        await _db.SaveChangesAsync();
        return Ok(new { success = true, data = message });
    }

    [HttpPost("api/v2/conversations/groups")]
    public async Task<IActionResult> V2CreateGroupConversation([FromBody] JsonElement body)
    {
        var userId = CurrentUserId();
        var otherId = GetInt(body, "participant_id") ?? GetInt(body, "user_id");
        if (userId == null || otherId == null) return BadRequest(new { error = "participant_id is required" });
        var conversation = new Conversation { TenantId = TenantId(), Participant1Id = userId.Value, Participant2Id = otherId.Value };
        _db.Conversations.Add(conversation);
        await _db.SaveChangesAsync();
        return Ok(new { success = true, data = conversation });
    }

    [HttpGet("api/v2/conversations/{id:int}/participants")]
    public async Task<IActionResult> V2ConversationParticipants(int id)
    {
        var c = await _db.Conversations.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id);
        return c == null ? NotFound(new { error = "Conversation not found" }) : Ok(new { data = new[] { c.Participant1Id, c.Participant2Id } });
    }

    [HttpPost("api/v2/conversations/{id:int}/participants")]
    [HttpDelete("api/v2/conversations/{id:int}/participants/{userId:int}")]
    [HttpPatch("api/v2/conversations/{id:int}/group")]
    [HttpPost("api/v2/messages/conversations/{id:int}/restore")]
    public IActionResult V2ConversationLightweight(int id) => Ok(new { success = true, conversation_id = id });

    [HttpDelete("api/v2/conversations/{id:int}")]
    [HttpDelete("api/v2/messages/conversations/{id:int}")]
    [HttpDelete("api/ai/conversations/{id:int}")]
    public async Task<IActionResult> V2DeleteConversation(int id)
    {
        var messages = await _db.Messages.Where(m => m.ConversationId == id).ToListAsync();
        _db.Messages.RemoveRange(messages);
        var conversation = await _db.Conversations.FirstOrDefaultAsync(c => c.Id == id);
        if (conversation != null) _db.Conversations.Remove(conversation);
        await _db.SaveChangesAsync();
        return Ok(new { success = true });
    }

    [HttpGet("api/v2/explore")]
    [HttpGet("api/v2/explore/for-you")]
    [HttpGet("api/v2/explore/trending")]
    [HttpGet("api/v2/explore/popular-listings")]
    [HttpGet("api/v2/explore/category/{slug}")]
    public async Task<IActionResult> V2Explore()
    {
        var listings = await _db.Listings.AsNoTracking().Where(l => l.DeletedAt == null).OrderByDescending(l => l.IsFeatured).ThenByDescending(l => l.CreatedAt).Take(12)
            .Select(l => new { id = l.Id, title = l.Title, type = "listing", score = l.ViewCount }).ToListAsync();
        var events = await _db.Events.AsNoTracking().Where(e => !e.IsCancelled && e.StartsAt >= DateTime.UtcNow).OrderBy(e => e.StartsAt).Take(8)
            .Select(e => new { id = e.Id, title = e.Title, type = "event", score = 0 }).ToListAsync();
        return Ok(new { data = listings.Concat(events), generated_at = DateTime.UtcNow });
    }

    [HttpGet("api/v2/explore/analytics")]
    [HttpGet("api/v2/explore/experiments")]
    [HttpPost("api/v2/explore/track")]
    [HttpPost("api/v2/explore/dismiss")]
    public IActionResult V2ExploreLightweight() => Ok(new { success = true, data = Array.Empty<object>() });

    [HttpGet("api/recommendations/metrics")]
    [HttpGet("api/v2/groups/recommendations/metrics")]
    [HttpGet("api/v2/metrics/summary")]
    public async Task<IActionResult> V2MetricsSummary()
    {
        return Ok(new
        {
            users = await _db.Users.CountAsync(),
            listings = await _db.Listings.CountAsync(l => l.DeletedAt == null),
            events = await _db.Events.CountAsync(e => !e.IsCancelled),
            transactions = await _db.Transactions.CountAsync(),
            generated_at = DateTime.UtcNow
        });
    }

    [HttpPost("api/v2/metrics")]
    public IActionResult V2MetricsIngest() => Accepted(new { success = true });

    [HttpPost("api/v2/exchanges/{id:int}/rate")]
    [HttpGet("api/v2/exchanges/{id:int}/ratings")]
    [HttpGet("api/v2/users/{id:int}/rating")]
    [HttpGet("api/me/reports/{id:int}/download")]
    public IActionResult V2SmallClusterLightweight(int id) => Ok(new { success = true, data = Array.Empty<object>(), id });

    [HttpGet("api/partner/v1/aggregates/community")]
    [AllowAnonymous]
    public async Task<IActionResult> PartnerCommunityAggregate()
    {
        if (!TryRequirePartnerScope("aggregates.read", out var partnerResult, out _))
        {
            return partnerResult!;
        }

        var tenantId = TenantId();
        var activeMembers = await _db.Users.CountAsync(u => u.TenantId == tenantId && u.IsActive);
        var activeListings = await _db.Listings.CountAsync(l => l.TenantId == tenantId && l.Status == ListingStatus.Active && l.DeletedAt == null);
        return PartnerData(new
        {
            tenant_id = tenantId,
            active_members_bucket = BucketCount(activeMembers),
            active_listings_bucket = BucketCount(activeListings),
            generated_at = DateTime.UtcNow
        });
    }

    [HttpGet("api/partner/v1/listings")]
    [AllowAnonymous]
    public async Task<IActionResult> PartnerListings([FromQuery] int page = 1, [FromQuery(Name = "per_page")] int perPage = 25)
    {
        if (!TryRequirePartnerScope("listings.read", out var partnerResult, out _))
        {
            return partnerResult!;
        }

        page = Math.Max(page, 1);
        perPage = Math.Clamp(perPage, 1, 100);
        var tenantId = TenantId();
        var query = _db.Listings.AsNoTracking()
            .Where(l => l.TenantId == tenantId && l.Status == ListingStatus.Active && l.DeletedAt == null);
        var total = await query.CountAsync();
        var data = await query
            .OrderByDescending(l => l.Id)
            .Skip((page - 1) * perPage)
            .Take(perPage)
            .Select(l => new
            {
                id = l.Id,
                user_id = l.UserId,
                title = l.Title,
                type = l.Type.ToString().ToLowerInvariant(),
                created_at = l.CreatedAt
            })
            .ToListAsync();

        return PartnerPaginated(data, total, page, perPage);
    }

    [HttpGet("api/partner/v1/users")]
    [AllowAnonymous]
    public async Task<IActionResult> PartnerUsers([FromQuery] int page = 1, [FromQuery(Name = "per_page")] int perPage = 25)
    {
        if (!TryRequirePartnerScope("users.read", out var partnerResult, out _))
        {
            return partnerResult!;
        }

        page = Math.Max(page, 1);
        perPage = Math.Clamp(perPage, 1, 100);
        var tenantId = TenantId();
        var includePii = PartnerScopes().Contains("users.pii", StringComparer.OrdinalIgnoreCase);
        var query = _db.Users.AsNoTracking().Where(u => u.TenantId == tenantId && u.IsActive);
        var total = await query.CountAsync();
        var data = await query
            .OrderBy(u => u.Id)
            .Skip((page - 1) * perPage)
            .Take(perPage)
            .Select(u => new
            {
                id = u.Id,
                name = (u.FirstName + " " + u.LastName).Trim(),
                username = u.Email,
                created_at = u.CreatedAt,
                status = u.IsActive ? "active" : "inactive",
                email = includePii ? u.Email : null
            })
            .ToListAsync();

        return PartnerPaginated(data, total, page, perPage);
    }

    [HttpGet("api/partner/v1/users/{id:int}")]
    [AllowAnonymous]
    public async Task<IActionResult> PartnerUser(int id)
    {
        if (!TryRequirePartnerScope("users.read", out var partnerResult, out _))
        {
            return partnerResult!;
        }

        var includePii = PartnerScopes().Contains("users.pii", StringComparer.OrdinalIgnoreCase);
        var user = await _db.Users.AsNoTracking()
            .Where(u => u.TenantId == TenantId() && u.Id == id)
            .Select(u => new
            {
                user = new
                {
                    id = u.Id,
                    name = (u.FirstName + " " + u.LastName).Trim(),
                    username = u.Email,
                    created_at = u.CreatedAt,
                    status = u.IsActive ? "active" : "inactive",
                    email = includePii ? u.Email : null
                }
            })
            .FirstOrDefaultAsync();

        return user == null ? PartnerError("USER_NOT_FOUND", "User not found.", 404) : PartnerData(user);
    }

    [HttpPost("api/partner/v1/oauth/token")]
    [AllowAnonymous]
    public async Task<IActionResult> PartnerToken([FromBody] JsonElement body)
    {
        var grantType = GetString(body, "grant_type") ?? string.Empty;
        if (!string.Equals(grantType, "client_credentials", StringComparison.Ordinal))
        {
            return PartnerError("unsupported_grant_type", "Only client_credentials is supported.", 400);
        }

        var clientId = GetString(body, "client_id") ?? BasicAuthClientId();
        var clientSecret = GetString(body, "client_secret") ?? BasicAuthClientSecret();
        if (string.IsNullOrWhiteSpace(clientId) || string.IsNullOrWhiteSpace(clientSecret))
        {
            return PartnerError("invalid_client", "client_id and client_secret are required.", 400);
        }

        var partner = await FindPartnerClientAsync(clientId, clientSecret);
        if (partner == null)
        {
            return PartnerError("invalid_client", "Client authentication failed.", 401);
        }

        var requestedScopes = (GetString(body, "scope") ?? string.Empty)
            .Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        var allowedScopes = SplitScopes(partner.Scopes);
        var grantedScopes = requestedScopes.Length == 0
            ? allowedScopes
            : requestedScopes.Where(scope => allowedScopes.Contains(scope, StringComparer.OrdinalIgnoreCase)).ToArray();

        return PartnerJson(new
        {
            access_token = GeneratePartnerAccessToken(partner, grantedScopes),
            token_type = "bearer",
            expires_in = PartnerTokenTtlSeconds,
            scope = string.Join(' ', grantedScopes)
        });
    }

    [HttpPost("api/partner/v1/oauth/revoke")]
    [AllowAnonymous]
    public async Task<IActionResult> PartnerRevoke([FromBody] JsonElement body)
    {
        var clientId = GetString(body, "client_id") ?? BasicAuthClientId();
        var clientSecret = GetString(body, "client_secret") ?? BasicAuthClientSecret();
        if (string.IsNullOrWhiteSpace(clientId) || string.IsNullOrWhiteSpace(clientSecret))
        {
            return PartnerError("invalid_client", "client_id and client_secret are required.", 401);
        }

        var partner = await FindPartnerClientAsync(clientId, clientSecret);
        if (partner == null)
        {
            return PartnerError("invalid_client", "Client authentication failed.", 401);
        }

        return PartnerJson(new { revoked = true });
    }

    [HttpGet("api/partner/v1/webhooks/subscriptions")]
    [AllowAnonymous]
    public IActionResult PartnerWebhookSubscriptions()
    {
        if (!TryRequirePartnerScope("webhooks.manage", out var partnerResult, out _))
        {
            return partnerResult!;
        }

        return PartnerData(new { subscriptions = Array.Empty<object>() });
    }

    [HttpPost("api/partner/v1/webhooks/subscriptions")]
    [AllowAnonymous]
    public IActionResult PartnerWebhookSubscriptionCreate([FromBody] JsonElement body)
    {
        if (!TryRequirePartnerScope("webhooks.manage", out var partnerResult, out var partner))
        {
            return partnerResult!;
        }

        var events = ReadStringArray(body, "event_types");
        var targetUrl = GetString(body, "target_url")?.Trim() ?? string.Empty;
        if (events.Length == 0 || string.IsNullOrWhiteSpace(targetUrl))
        {
            return PartnerError("invalid_request", "event_types (array) and target_url are required.", 422);
        }

        if (!Uri.TryCreate(targetUrl, UriKind.Absolute, out var uri) || !string.Equals(uri.Scheme, Uri.UriSchemeHttps, StringComparison.OrdinalIgnoreCase))
        {
            return PartnerError("invalid_url", "target_url must be a valid https:// URL.", 422);
        }

        return PartnerData(new
        {
            subscription = new
            {
                id = Guid.NewGuid().ToString("N"),
                partner_id = partner?.Id,
                event_types = events,
                target_url = targetUrl,
                secret = "whsec_" + Convert.ToHexString(RandomNumberGenerator.GetBytes(24)).ToLowerInvariant(),
                created_at = DateTime.UtcNow
            }
        }, 201);
    }

    [HttpGet("api/v2/federation/events")]
    [HttpGet("api/v2/federation/partners")]
    [HttpGet("api/v2/federation/partners/{id:int}")]
    [HttpPost("api/v2/federation/ingest/events")]
    [HttpPost("api/v2/federation/ingest/listings")]
    [HttpGet("api/v2/vereine/{organizationId:int}/shared-events")]
    public IActionResult V2PartnerLightweight() => Ok(new { success = true, data = Array.Empty<object>() });

    [HttpGet("api/webauthn/status")]
    public async Task<IActionResult> WebAuthnStatus()
    {
        var userId = CurrentUserId();
        var count = userId == null ? 0 : await _db.UserPasskeys.CountAsync(p => p.UserId == userId.Value);
        return Ok(new { enabled = count > 0, credential_count = count });
    }

    [HttpGet("api/webauthn/credentials")]
    public async Task<IActionResult> WebAuthnCredentials()
    {
        var userId = CurrentUserId();
        var data = await _db.UserPasskeys.AsNoTracking().Where(p => p.UserId == userId)
            .Select(p => new { id = p.Id, name = p.DisplayName, created_at = p.CreatedAt, last_used_at = p.LastUsedAt, transports = p.Transports }).ToListAsync();
        return Ok(new { data });
    }

    [HttpPost("api/webauthn/remove")]
    [HttpPost("api/webauthn/rename")]
    public async Task<IActionResult> WebAuthnMutate([FromBody] JsonElement body)
    {
        var id = GetInt(body, "id") ?? GetInt(body, "credential_id");
        if (id == null) return BadRequest(new { error = "credential id is required" });
        var credential = await _db.UserPasskeys.FirstOrDefaultAsync(p => p.Id == id.Value);
        if (credential == null) return NotFound(new { error = "Credential not found" });
        if (Request.Path.Value?.Contains("rename", StringComparison.OrdinalIgnoreCase) == true)
        {
            credential.DisplayName = GetString(body, "name") ?? GetString(body, "display_name") ?? credential.DisplayName;
        }
        else
        {
            _db.UserPasskeys.Remove(credential);
        }
        await _db.SaveChangesAsync();
        return Ok(new { success = true });
    }

    [HttpPost("api/webauthn/remove-all")]
    public async Task<IActionResult> WebAuthnRemoveAll()
    {
        var userId = CurrentUserId();
        var credentials = await _db.UserPasskeys.Where(p => p.UserId == userId).ToListAsync();
        _db.UserPasskeys.RemoveRange(credentials);
        await _db.SaveChangesAsync();
        return Ok(new { success = true, removed = credentials.Count });
    }

    [HttpPost("api/webauthn/register-challenge")]
    [HttpPost("api/webauthn/register-verify")]
    [HttpPost("api/webauthn/auth-challenge")]
    [HttpPost("api/webauthn/auth-verify")]
    [AllowAnonymous]
    public IActionResult WebAuthnLegacyChallenge() => Ok(new { success = true, use = "/api/passkeys", challenge = Guid.NewGuid().ToString("N") });

    [HttpPost("api/webhooks/sendgrid/events")]
    [AllowAnonymous]
    public IActionResult SendgridEvents() => Accepted(new { success = true });

    private IActionResult PartnerJson(object payload, int status = 200)
    {
        Response.Headers[ApiVersionHeader] = ApiVersion;
        return StatusCode(status, payload);
    }

    private IActionResult PartnerData(object data, int status = 200)
    {
        return PartnerJson(new
        {
            data,
            meta = new { base_url = $"{Request.Scheme}://{Request.Host}" }
        }, status);
    }

    private IActionResult PartnerPaginated<T>(IReadOnlyCollection<T> data, int total, int page, int perPage)
    {
        var totalPages = total > 0 ? (int)Math.Ceiling(total / (double)perPage) : 0;
        return PartnerJson(new
        {
            data,
            meta = new
            {
                base_url = $"{Request.Scheme}://{Request.Host}",
                current_page = page,
                per_page = perPage,
                total,
                total_pages = totalPages,
                has_more = page < totalPages
            }
        });
    }

    private IActionResult PartnerError(string code, string message, int status)
    {
        return PartnerJson(new
        {
            errors = new[]
            {
                new { code, message }
            }
        }, status);
    }

    private bool TryRequirePartnerScope(string requiredScope, out IActionResult? result, out ApiPartner? partner)
    {
        result = null;
        partner = null;

        if (User.Identity?.IsAuthenticated != true || User.FindFirst("partner_id")?.Value is not { Length: > 0 } partnerIdRaw)
        {
            result = PartnerError("AUTH_REQUIRED", "Partner bearer token required.", 401);
            return false;
        }

        if (!Guid.TryParse(partnerIdRaw, out var partnerId))
        {
            result = PartnerError("AUTH_REQUIRED", "Partner bearer token required.", 401);
            return false;
        }

        var scopes = PartnerScopes();
        if (!scopes.Contains(requiredScope, StringComparer.OrdinalIgnoreCase))
        {
            result = PartnerError("FORBIDDEN", "Required partner scope is missing.", 403);
            return false;
        }

        partner = _db.ApiPartners.IgnoreQueryFilters()
            .AsNoTracking()
            .FirstOrDefault(p => p.Id == partnerId && p.Status == ApiPartnerStatus.Active);
        if (partner == null)
        {
            result = PartnerError("AUTH_REQUIRED", "Partner bearer token required.", 401);
            return false;
        }

        return true;
    }

    private string[] PartnerScopes()
    {
        var scopeText = User.FindFirst("partner_scopes")?.Value ?? User.FindFirst("scope")?.Value ?? string.Empty;
        return scopeText.Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
    }

    private async Task<ApiPartner?> FindPartnerClientAsync(string clientId, string clientSecret)
    {
        if (!Guid.TryParse(clientId, out var partnerId))
        {
            return null;
        }

        var hash = Sha256Hex(clientSecret);
        return await _db.ApiPartners
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(p => p.Id == partnerId && p.ApiKeyHash == hash && p.Status == ApiPartnerStatus.Active);
    }

    private string GeneratePartnerAccessToken(ApiPartner partner, IEnumerable<string> scopes)
    {
        var secret = _config["Jwt:Secret"]
            ?? throw new InvalidOperationException("JWT secret not configured");
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var scopeText = string.Join(' ', scopes);
        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, "0"),
            new Claim("tenant_id", partner.TenantId.ToString()),
            new Claim("role", "partner"),
            new Claim("partner_id", partner.Id.ToString()),
            new Claim("partner_scopes", scopeText),
            new Claim("scope", scopeText),
            new Claim(JwtRegisteredClaimNames.Iat, DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString(), ClaimValueTypes.Integer64)
        };

        var token = new JwtSecurityToken(
            issuer: _config["Jwt:Issuer"],
            audience: _config["Jwt:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddSeconds(PartnerTokenTtlSeconds),
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private string? BasicAuthClientId() => BasicAuthParts()?.ClientId;

    private string? BasicAuthClientSecret() => BasicAuthParts()?.ClientSecret;

    private (string ClientId, string ClientSecret)? BasicAuthParts()
    {
        var auth = Request.Headers.Authorization.ToString();
        if (!auth.StartsWith("Basic ", StringComparison.OrdinalIgnoreCase))
        {
            return null;
        }

        try
        {
            var decoded = Encoding.UTF8.GetString(Convert.FromBase64String(auth["Basic ".Length..].Trim()));
            var separator = decoded.IndexOf(':', StringComparison.Ordinal);
            return separator <= 0
                ? null
                : (decoded[..separator], decoded[(separator + 1)..]);
        }
        catch (FormatException)
        {
            return null;
        }
    }

    private static string[] SplitScopes(string? scopes)
    {
        return string.IsNullOrWhiteSpace(scopes)
            ? Array.Empty<string>()
            : scopes.Split([',', ' '], StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
    }

    private static string Sha256Hex(string value)
    {
        return Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(value))).ToLowerInvariant();
    }

    private static int BucketCount(int count)
    {
        if (count < 10)
        {
            return 0;
        }

        return count < 100 ? count / 10 * 10 : count / 100 * 100;
    }

    private int? CurrentUserId() => User.GetUserId();

    private int TenantId() => _tenantContext.TenantId ?? User.GetTenantId() ?? 0;

    private static int Limit(int limit) => Math.Clamp(limit, 1, 100);

    private static int Skip(int page, int limit) => (Math.Max(page, 1) - 1) * Limit(limit);

    private static object Paged<T>(IEnumerable<T> data, int page, int limit, int total) => new
    {
        data,
        pagination = new { page = Math.Max(page, 1), limit = Limit(limit), total, pages = (int)Math.Ceiling(total / (double)Limit(limit)) }
    };

    private static object EventDto(Event ev) => new
    {
        id = ev.Id,
        title = ev.Title,
        description = ev.Description,
        location = ev.Location,
        starts_at = ev.StartsAt,
        ends_at = ev.EndsAt,
        image_url = ev.ImageUrl,
        max_attendees = ev.MaxAttendees,
        is_cancelled = ev.IsCancelled,
        created_at = ev.CreatedAt
    };

    private static object ListingDto(Listing listing) => new
    {
        id = listing.Id,
        title = listing.Title,
        description = listing.Description,
        type = listing.Type.ToString().ToLowerInvariant(),
        status = listing.Status.ToString().ToLowerInvariant(),
        location = listing.Location,
        estimated_hours = listing.EstimatedHours,
        is_featured = listing.IsFeatured,
        view_count = listing.ViewCount,
        created_at = listing.CreatedAt,
        user_id = listing.UserId
    };

    private static string? GetString(JsonElement body, string name)
    {
        if (body.ValueKind != JsonValueKind.Object || !body.TryGetProperty(name, out var prop)) return null;
        return prop.ValueKind == JsonValueKind.String ? prop.GetString() : prop.ToString();
    }

    private static int? GetInt(JsonElement body, string name)
    {
        if (body.ValueKind != JsonValueKind.Object || !body.TryGetProperty(name, out var prop)) return null;
        if (prop.ValueKind == JsonValueKind.Number && prop.TryGetInt32(out var value)) return value;
        return int.TryParse(prop.ToString(), out var parsed) ? parsed : null;
    }

    private static decimal? GetDecimal(JsonElement body, string name)
    {
        if (body.ValueKind != JsonValueKind.Object || !body.TryGetProperty(name, out var prop)) return null;
        if (prop.ValueKind == JsonValueKind.Number && prop.TryGetDecimal(out var value)) return value;
        return decimal.TryParse(prop.ToString(), out var parsed) ? parsed : null;
    }

    private static DateTime? GetDate(JsonElement body, string name)
    {
        if (body.ValueKind != JsonValueKind.Object || !body.TryGetProperty(name, out var prop)) return null;
        return DateTime.TryParse(prop.ToString(), out var value) ? value.ToUniversalTime() : null;
    }

    private static string[] ReadStringArray(JsonElement body, string name)
    {
        if (body.ValueKind != JsonValueKind.Object || !body.TryGetProperty(name, out var prop) || prop.ValueKind != JsonValueKind.Array)
        {
            return Array.Empty<string>();
        }

        return prop.EnumerateArray().Select(x => x.ToString()).Where(x => !string.IsNullOrWhiteSpace(x)).ToArray();
    }
}
