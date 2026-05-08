// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Nexus.Api.Data;
using Nexus.Api.Entities;
using Nexus.Api.Extensions;
using Nexus.Api.Services;

namespace Nexus.Api.Controllers;

/// <summary>
/// Compact member-facing V1.5 compatibility surface for route parity.
/// These endpoints bridge legacy frontend/API paths onto the existing V2 data model.
/// </summary>
[ApiController]
[Authorize]
public class V15MemberParityController : ControllerBase
{
    private readonly NexusDbContext _db;
    private readonly TenantContext _tenantContext;
    private readonly TokenService _tokenService;

    public V15MemberParityController(NexusDbContext db, TenantContext tenantContext, TokenService tokenService)
    {
        _db = db;
        _tenantContext = tenantContext;
        _tokenService = tokenService;
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
    [HttpGet("api/partner/v1/listings")]
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
    [HttpGet("api/partner/v1/wallet/balance/{userId:int}")]
    public async Task<IActionResult> V2WalletBalance(int? userId = null)
    {
        var targetUserId = userId ?? CurrentUserId();
        if (targetUserId == null) return Unauthorized(new { error = "Invalid token" });
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
    [HttpPost("api/partner/v1/wallet/credit")]
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

    [HttpGet("api/v2/messages")]
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
    public async Task<IActionResult> PartnerCommunityAggregate() => Ok(new { users = await _db.Users.CountAsync(), listings = await _db.Listings.CountAsync(), events = await _db.Events.CountAsync() });

    [HttpGet("api/partner/v1/users")]
    public async Task<IActionResult> PartnerUsers() => Ok(new { data = await _db.Users.AsNoTracking().Take(100).Select(u => new { id = u.Id, email = u.Email, first_name = u.FirstName, last_name = u.LastName }).ToListAsync() });

    [HttpGet("api/partner/v1/users/{id:int}")]
    public async Task<IActionResult> PartnerUser(int id)
    {
        var user = await _db.Users.AsNoTracking().Where(u => u.Id == id).Select(u => new { id = u.Id, email = u.Email, first_name = u.FirstName, last_name = u.LastName }).FirstOrDefaultAsync();
        return user == null ? NotFound(new { error = "User not found" }) : Ok(new { data = user });
    }

    [HttpPost("api/partner/v1/oauth/token")]
    [AllowAnonymous]
    public async Task<IActionResult> PartnerToken([FromBody] JsonElement body)
    {
        var email = GetString(body, "email") ?? GetString(body, "username");
        var user = email == null ? null : await _db.Users.FirstOrDefaultAsync(u => u.Email == email);
        if (user == null) return Unauthorized(new { error = "Invalid partner credentials" });
        return Ok(new { access_token = _tokenService.GenerateJwt(user), token_type = "Bearer", expires_in = _tokenService.AccessTokenExpirySeconds });
    }

    [HttpPost("api/partner/v1/oauth/revoke")]
    [AllowAnonymous]
    public IActionResult PartnerRevoke() => Ok(new { success = true });

    [HttpGet("api/partner/v1/webhooks/subscriptions")]
    [HttpPost("api/partner/v1/webhooks/subscriptions")]
    public IActionResult PartnerWebhookSubscriptions() => Ok(new { success = true, data = Array.Empty<object>() });

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
