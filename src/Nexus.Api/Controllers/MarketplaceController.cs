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

[ApiController]
[Route("api/marketplace")]
[Route("api/v2/marketplace")]
public class MarketplaceController : ControllerBase
{
    private readonly MarketplaceService _marketplace;
    private readonly NexusDbContext _db;

    public MarketplaceController(MarketplaceService marketplace, NexusDbContext db)
    {
        _marketplace = marketplace;
        _db = db;
    }

    [HttpGet("listings")]
    [AllowAnonymous]
    public async Task<IActionResult> ListListings(
        [FromQuery] int page = 1,
        [FromQuery] int limit = 20,
        [FromQuery] string? q = null,
        [FromQuery] int? category_id = null,
        [FromQuery] string? category = null,
        [FromQuery] string? price_type = null,
        [FromQuery] string? condition = null,
        [FromQuery] string? seller_type = null,
        [FromQuery] string? delivery_method = null,
        [FromQuery] string? status = null,
        [FromQuery] int? user_id = null)
    {
        page = Math.Max(1, page);
        limit = Math.Clamp(limit, 1, 100);
        var currentUserId = User.GetUserId();
        var ownUserId = user_id.HasValue && user_id == currentUserId ? user_id : null;
        var (items, total) = await _marketplace.ListListingsAsync(q, category_id, category, price_type,
            condition, seller_type, delivery_method, status, ownUserId, null, false, false, page, limit);
        return Ok(Paged(items.Select(l => MapListing(l)), page, limit, total));
    }

    [HttpGet("listings/nearby")]
    [AllowAnonymous]
    public async Task<IActionResult> NearbyListings([FromQuery] double? lat = null, [FromQuery] double? lng = null, [FromQuery] double radius = 25)
    {
        var (items, total) = await _marketplace.ListListingsAsync(null, null, null, null, null, null, null, null, null, null, false, false, 1, 100);
        var filtered = items.Where(l => !lat.HasValue || !lng.HasValue || !l.Latitude.HasValue || !l.Longitude.HasValue
            || DistanceKm(lat.Value, lng.Value, l.Latitude.Value, l.Longitude.Value) <= radius).ToList();
        return Ok(new { data = filtered.Select(l => MapListing(l)), meta = new { total = filtered.Count, unfiltered_total = total } });
    }

    [HttpGet("listings/featured")]
    [AllowAnonymous]
    public async Task<IActionResult> FeaturedListings([FromQuery] int limit = 20)
    {
        var (items, total) = await _marketplace.ListListingsAsync(null, null, null, null, null, null, null, null, null, null, true, false, 1, Math.Clamp(limit, 1, 100));
        return Ok(new { data = items.Select(l => MapListing(l)), meta = new { total } });
    }

    [HttpGet("listings/free")]
    [AllowAnonymous]
    public async Task<IActionResult> FreeListings([FromQuery] int limit = 20)
    {
        var (items, total) = await _marketplace.ListListingsAsync(null, null, null, null, null, null, null, null, null, null, false, true, 1, Math.Clamp(limit, 1, 100));
        return Ok(new { data = items.Select(l => MapListing(l)), meta = new { total } });
    }

    [HttpGet("listings/saved")]
    [Authorize]
    public async Task<IActionResult> SavedListings()
    {
        var userId = RequireUserId();
        var listings = await _marketplace.GetSavedListingsAsync(userId);
        return Ok(new { data = listings.Select(l => MapListing(l)), meta = new { total = listings.Count } });
    }

    [HttpGet("listings/export-csv")]
    [Authorize]
    public async Task<IActionResult> ExportListingsCsv()
    {
        var userId = RequireUserId();
        var (items, _) = await _marketplace.ListListingsAsync(null, null, null, null, null, null, null, null, userId, null, false, false, 1, 1000);
        var rows = new[] { "id,title,status,price,price_type,created_at" }
            .Concat(items.Select(l => $"{l.Id},\"{l.Title.Replace("\"", "\"\"")}\",{l.Status},{l.Price},{l.PriceType},{l.CreatedAt:O}"));
        return File(System.Text.Encoding.UTF8.GetBytes(string.Join("\n", rows)), "text/csv", "marketplace-listings.csv");
    }

    [HttpPost("listings/import-csv")]
    [Authorize]
    public IActionResult ImportListingsCsv()
        => Ok(new { data = new { imported = 0, skipped = 0 }, message = "CSV import accepted; use the listing create endpoint for validated imports." });

    [HttpPost("listings/bulk-action")]
    [Authorize]
    public async Task<IActionResult> BulkAction([FromBody] BulkActionRequest request)
    {
        var userId = RequireUserId();
        var isAdmin = User.IsAdmin();
        var changed = 0;
        foreach (var id in request.Ids ?? Array.Empty<int>())
        {
            if (request.Action == "delete" && await _marketplace.DeleteListingAsync(id, userId, isAdmin) == null)
                changed++;
            if ((request.Action == "activate" || request.Action == "draft")
                && (await _marketplace.UpdateListingAsync(id, userId, isAdmin, new MarketplaceListingInput(null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, request.Action == "activate" ? "active" : "draft", null))).Listing != null)
                changed++;
        }
        return Ok(new { data = new { changed } });
    }

    [HttpGet("listings/{id:int}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetListing(int id)
    {
        var listing = await _marketplace.GetListingAsync(id, incrementView: true);
        return listing == null ? NotFound(new { error = "Listing not found" }) : Ok(new { data = MapListing(listing, detailed: true) });
    }

    [HttpPost("listings")]
    [Authorize]
    public async Task<IActionResult> CreateListing([FromBody] MarketplaceListingInput request)
    {
        var userId = RequireUserId();
        var (listing, error) = await _marketplace.CreateListingAsync(userId, request);
        if (error != null) return BadRequest(new { error });
        return Created($"/api/marketplace/listings/{listing!.Id}", new { data = MapListing(listing, detailed: true) });
    }

    [HttpPut("listings/{id:int}")]
    [Authorize]
    public async Task<IActionResult> UpdateListing(int id, [FromBody] MarketplaceListingInput request)
    {
        var (listing, error) = await _marketplace.UpdateListingAsync(id, RequireUserId(), User.IsAdmin(), request);
        if (error == "Listing not found") return NotFound(new { error });
        if (error != null) return StatusCode(403, new { error });
        return Ok(new { data = MapListing(listing!, detailed: true) });
    }

    [HttpDelete("listings/{id:int}")]
    [Authorize]
    public async Task<IActionResult> DeleteListing(int id)
    {
        var error = await _marketplace.DeleteListingAsync(id, RequireUserId(), User.IsAdmin());
        if (error == "Listing not found") return NotFound(new { error });
        if (error != null) return StatusCode(403, new { error });
        return NoContent();
    }

    [HttpPost("listings/{id:int}/images")]
    [Authorize]
    public async Task<IActionResult> AddImage(int id, [FromBody] ImageRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Url)) return BadRequest(new { error = "Image URL is required" });
        var image = await _marketplace.AddImageAsync(id, RequireUserId(), User.IsAdmin(), request.Url, request.AltText);
        return image == null ? NotFound(new { error = "Listing not found" }) : Created($"/api/marketplace/listings/{id}/images/{image.Id}", new { data = image });
    }

    [HttpPut("listings/{id:int}/images/reorder")]
    [Authorize]
    public async Task<IActionResult> ReorderImages(int id, [FromBody] ReorderImagesRequest request)
        => await _marketplace.ReorderImagesAsync(id, RequireUserId(), User.IsAdmin(), request.ImageIds ?? Array.Empty<int>())
            ? Ok(new { data = new { id } })
            : NotFound(new { error = "Listing not found" });

    [HttpDelete("listings/{id:int}/images/{imageId:int}")]
    [Authorize]
    public async Task<IActionResult> DeleteImage(int id, int imageId)
        => await _marketplace.DeleteImageAsync(id, imageId, RequireUserId(), User.IsAdmin())
            ? NoContent()
            : NotFound(new { error = "Image not found" });

    [HttpPost("listings/{id:int}/video")]
    [Authorize]
    public async Task<IActionResult> SetVideo(int id, [FromBody] VideoRequest request)
    {
        var (listing, error) = await _marketplace.UpdateListingAsync(id, RequireUserId(), User.IsAdmin(), new MarketplaceListingInput(null, null, null, null, null, null, null, null, null, null, null, new() { ["video_url"] = request.Url ?? string.Empty }, null, null, null, null, null, null, null, null, null));
        if (listing != null) listing.VideoUrl = request.Url;
        await _db.SaveChangesAsync();
        return error == null ? Ok(new { data = MapListing(listing!, true) }) : NotFound(new { error });
    }

    [HttpDelete("listings/{id:int}/video")]
    [Authorize]
    public async Task<IActionResult> DeleteVideo(int id)
    {
        var listing = await _db.MarketplaceListings.FirstOrDefaultAsync(l => l.Id == id);
        if (listing == null) return NotFound(new { error = "Listing not found" });
        if (listing.UserId != RequireUserId() && !User.IsAdmin()) return StatusCode(403, new { error = "Forbidden" });
        listing.VideoUrl = null;
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("listings/{id:int}/renew")]
    [Authorize]
    public async Task<IActionResult> RenewListing(int id)
    {
        var listing = await _db.MarketplaceListings.FirstOrDefaultAsync(l => l.Id == id);
        if (listing == null) return NotFound(new { error = "Listing not found" });
        if (listing.UserId != RequireUserId() && !User.IsAdmin()) return StatusCode(403, new { error = "Forbidden" });
        listing.RenewedAt = DateTime.UtcNow;
        listing.RenewalCount++;
        listing.ExpiresAt = DateTime.UtcNow.AddDays(30);
        await _db.SaveChangesAsync();
        return Ok(new { data = MapListing(listing) });
    }

    [HttpGet("listings/{id:int}/analytics")]
    [Authorize]
    public async Task<IActionResult> ListingAnalytics(int id)
    {
        var listing = await _marketplace.GetListingAsync(id);
        if (listing == null) return NotFound(new { error = "Listing not found" });
        if (listing.UserId != RequireUserId() && !User.IsAdmin()) return StatusCode(403, new { error = "Forbidden" });
        return Ok(new { data = new { listing.Id, listing.ViewsCount, listing.SavesCount, listing.ContactsCount, offers = listing.Offers.Count } });
    }

    [HttpPost("listings/generate-description")]
    [Authorize]
    public IActionResult GenerateDescription([FromBody] GenerateDescriptionRequest request)
        => Ok(new { data = new { description = $"A clear community marketplace listing for {request.Title ?? "this item"}. Include condition, pickup details, and what makes it useful." } });

    [HttpPost("listings/{id:int}/save")]
    [Authorize]
    public async Task<IActionResult> SaveListing(int id)
        => await _marketplace.SaveListingAsync(id, RequireUserId()) ? Ok(new { data = new { saved = true } }) : NotFound(new { error = "Listing not found" });

    [HttpDelete("listings/{id:int}/save")]
    [Authorize]
    public async Task<IActionResult> UnsaveListing(int id)
        => await _marketplace.UnsaveListingAsync(id, RequireUserId()) ? NoContent() : NotFound(new { error = "Listing not found" });

    [HttpPost("listings/{id:int}/offers")]
    [Authorize]
    public async Task<IActionResult> CreateOffer(int id, [FromBody] OfferRequest request)
    {
        var offer = await _marketplace.CreateOfferAsync(id, RequireUserId(), request.Amount, request.TimeCreditAmount, request.Message);
        return offer == null ? BadRequest(new { error = "Offer could not be created" }) : Created($"/api/marketplace/offers/{offer.Id}", new { data = offer });
    }

    [HttpGet("listings/{id:int}/offers")]
    [Authorize]
    public async Task<IActionResult> ListingOffers(int id)
    {
        var userId = RequireUserId();
        var listing = await _db.MarketplaceListings.FirstOrDefaultAsync(l => l.Id == id);
        if (listing == null) return NotFound(new { error = "Listing not found" });
        if (listing.UserId != userId && !User.IsAdmin()) return StatusCode(403, new { error = "Forbidden" });
        var offers = await _db.MarketplaceOffers.Where(o => o.MarketplaceListingId == id).OrderByDescending(o => o.CreatedAt).ToListAsync();
        return Ok(new { data = offers, meta = new { total = offers.Count } });
    }

    [HttpPut("offers/{id:int}/accept")]
    [Authorize]
    public Task<IActionResult> AcceptOffer(int id) => OfferStatus(id, "accepted");

    [HttpPut("offers/{id:int}/decline")]
    [Authorize]
    public Task<IActionResult> DeclineOffer(int id) => OfferStatus(id, "declined");

    [HttpPut("offers/{id:int}/counter")]
    [Authorize]
    public async Task<IActionResult> CounterOffer(int id, [FromBody] OfferRequest request)
    {
        var offer = await _marketplace.SetOfferStatusAsync(id, RequireUserId(), User.IsAdmin(), "countered", request.Amount, request.Message);
        return offer == null ? NotFound(new { error = "Offer not found" }) : Ok(new { data = offer });
    }

    [HttpPut("offers/{id:int}/accept-counter")]
    [Authorize]
    public Task<IActionResult> AcceptCounterOffer(int id) => OfferStatus(id, "counter_accepted");

    [HttpDelete("offers/{id:int}")]
    [Authorize]
    public async Task<IActionResult> DeleteOffer(int id)
    {
        var userId = RequireUserId();
        var offer = await _db.MarketplaceOffers.FirstOrDefaultAsync(o => o.Id == id);
        if (offer == null) return NotFound(new { error = "Offer not found" });
        if (offer.BuyerUserId != userId && offer.SellerUserId != userId && !User.IsAdmin()) return StatusCode(403, new { error = "Forbidden" });
        _db.MarketplaceOffers.Remove(offer);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpGet("my-offers/sent")]
    [Authorize]
    public async Task<IActionResult> SentOffers()
    {
        var userId = RequireUserId();
        var offers = await _db.MarketplaceOffers.Where(o => o.BuyerUserId == userId).OrderByDescending(o => o.CreatedAt).ToListAsync();
        return Ok(new { data = offers, meta = new { total = offers.Count } });
    }

    [HttpGet("my-offers/received")]
    [Authorize]
    public async Task<IActionResult> ReceivedOffers()
    {
        var userId = RequireUserId();
        var offers = await _db.MarketplaceOffers.Where(o => o.SellerUserId == userId).OrderByDescending(o => o.CreatedAt).ToListAsync();
        return Ok(new { data = offers, meta = new { total = offers.Count } });
    }

    [HttpPost("seller/profile")]
    [Authorize]
    public async Task<IActionResult> UpsertSellerProfile([FromBody] SellerProfileRequest request)
    {
        var profile = await _marketplace.GetOrCreateSellerProfileAsync(RequireUserId(), request.DisplayName);
        if (request.Bio != null) profile.Bio = request.Bio;
        if (request.SellerType != null) profile.SellerType = request.SellerType;
        profile.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(new { data = profile });
    }

    [HttpGet("seller/dashboard")]
    [Authorize]
    public async Task<IActionResult> SellerDashboard()
    {
        var userId = RequireUserId();
        var profile = await _marketplace.GetOrCreateSellerProfileAsync(userId);
        var listings = await _db.MarketplaceListings.CountAsync(l => l.UserId == userId);
        var orders = await _db.MarketplaceOrders.CountAsync(o => o.SellerUserId == userId);
        var offers = await _db.MarketplaceOffers.CountAsync(o => o.SellerUserId == userId && o.Status == "pending");
        return Ok(new { data = new { profile, listings, orders, pending_offers = offers } });
    }

    [HttpGet("seller/onboard/status")]
    [Authorize]
    public async Task<IActionResult> SellerOnboardStatus()
    {
        var profile = await _db.MarketplaceSellerProfiles.FirstOrDefaultAsync(p => p.UserId == RequireUserId());
        return Ok(new { data = new { onboarded = profile != null, profile } });
    }

    [HttpPost("orders")]
    [Authorize]
    public async Task<IActionResult> CreateOrder([FromBody] CreateOrderRequest request)
    {
        var order = await _marketplace.CreateOrderAsync(request.ListingId, RequireUserId(), request.Quantity <= 0 ? 1 : request.Quantity, request.DeliveryMethod, request.ShippingAddress);
        return order == null ? BadRequest(new { error = "Order could not be created" }) : Created($"/api/marketplace/orders/{order.Id}", new { data = order });
    }

    [HttpGet("orders/purchases")]
    [Authorize]
    public async Task<IActionResult> Purchases()
    {
        var userId = RequireUserId();
        var orders = await _db.MarketplaceOrders.Include(o => o.Listing).Where(o => o.BuyerUserId == userId).OrderByDescending(o => o.CreatedAt).ToListAsync();
        return Ok(new { data = orders, meta = new { total = orders.Count } });
    }

    [HttpGet("orders/sales")]
    [Authorize]
    public async Task<IActionResult> Sales()
    {
        var userId = RequireUserId();
        var orders = await _db.MarketplaceOrders.Include(o => o.Listing).Where(o => o.SellerUserId == userId).OrderByDescending(o => o.CreatedAt).ToListAsync();
        return Ok(new { data = orders, meta = new { total = orders.Count } });
    }

    [HttpGet("orders/{id:int}")]
    [Authorize]
    public async Task<IActionResult> GetOrder(int id)
    {
        var userId = RequireUserId();
        var order = await _db.MarketplaceOrders.Include(o => o.Listing).FirstOrDefaultAsync(o => o.Id == id);
        if (order == null) return NotFound(new { error = "Order not found" });
        if (order.BuyerUserId != userId && order.SellerUserId != userId && !User.IsAdmin()) return StatusCode(403, new { error = "Forbidden" });
        return Ok(new { data = order });
    }

    [HttpPut("orders/{id:int}/ship")]
    [Authorize]
    public async Task<IActionResult> ShipOrder(int id, [FromBody] ShipOrderRequest request)
        => await OrderStatus(id, "shipped", request.TrackingNumber);

    [HttpPut("orders/{id:int}/confirm-delivery")]
    [Authorize]
    public Task<IActionResult> ConfirmDelivery(int id) => OrderStatus(id, "delivered");

    [HttpPut("orders/{id:int}/cancel")]
    [Authorize]
    public Task<IActionResult> CancelOrder(int id) => OrderStatus(id, "cancelled");

    [HttpPost("orders/{id:int}/rate")]
    [Authorize]
    public async Task<IActionResult> RateOrder(int id, [FromBody] RateOrderRequest request)
    {
        var order = await _db.MarketplaceOrders.FirstOrDefaultAsync(o => o.Id == id);
        if (order == null) return NotFound(new { error = "Order not found" });
        var rating = new MarketplaceSellerRating
        {
            MarketplaceOrderId = id,
            BuyerUserId = RequireUserId(),
            SellerUserId = order.SellerUserId,
            Rating = Math.Clamp(request.Rating, 1, 5),
            Comment = request.Comment
        };
        _db.MarketplaceSellerRatings.Add(rating);
        await _db.SaveChangesAsync();
        return Created($"/api/marketplace/orders/{id}/ratings", new { data = rating });
    }

    [HttpGet("orders/{id:int}/ratings")]
    [Authorize]
    public async Task<IActionResult> OrderRatings(int id)
    {
        var ratings = await _db.MarketplaceSellerRatings.Where(r => r.MarketplaceOrderId == id).ToListAsync();
        return Ok(new { data = ratings, meta = new { total = ratings.Count } });
    }

    [HttpPost("orders/{id:int}/dispute")]
    [Authorize]
    public async Task<IActionResult> DisputeOrder(int id, [FromBody] ReportRequest request)
    {
        var order = await _db.MarketplaceOrders.FirstOrDefaultAsync(o => o.Id == id);
        if (order == null) return NotFound(new { error = "Order not found" });
        var report = await _marketplace.ReportListingAsync(order.MarketplaceListingId, RequireUserId(), request.Reason ?? "order_dispute", request.Details);
        return Created($"/api/marketplace/reports/{report.Id}", new { data = report });
    }

    [HttpPost("payments/create-intent")]
    [Authorize]
    public IActionResult CreatePaymentIntent([FromBody] PaymentRequest request)
        => Ok(new { data = new { id = $"local_pi_{Guid.NewGuid():N}", status = "requires_confirmation", request.Amount, request.Currency } });

    [HttpPost("payments/confirm")]
    [Authorize]
    public IActionResult ConfirmPayment([FromBody] PaymentConfirmRequest request)
        => Ok(new { data = new { id = request.PaymentId, status = "confirmed" } });

    [HttpGet("payments/{id}/status")]
    [Authorize]
    public IActionResult PaymentStatus(string id)
        => Ok(new { data = new { id, status = "confirmed" } });

    [HttpGet("seller/payouts")]
    [Authorize]
    public IActionResult SellerPayouts() => Ok(new { data = Array.Empty<object>(), meta = new { total = 0 } });

    [HttpGet("seller/balance")]
    [Authorize]
    public IActionResult SellerBalance() => Ok(new { data = new { available = 0, pending = 0, currency = "EUR" } });

    [HttpPost("seller/onboard")]
    [Authorize]
    public async Task<IActionResult> SellerOnboard([FromBody] SellerProfileRequest request)
    {
        var profile = await _marketplace.GetOrCreateSellerProfileAsync(RequireUserId(), request.DisplayName);
        return Ok(new { data = new { profile, onboarding_url = (string?)null, status = "local" } });
    }

    [HttpGet("saved-searches")]
    [Authorize]
    public async Task<IActionResult> SavedSearches()
    {
        var userId = RequireUserId();
        var rows = await _db.MarketplaceSavedSearches.Where(s => s.UserId == userId).OrderByDescending(s => s.CreatedAt).ToListAsync();
        return Ok(new { data = rows, meta = new { total = rows.Count } });
    }

    [HttpPost("saved-searches")]
    [Authorize]
    public async Task<IActionResult> CreateSavedSearch([FromBody] SavedSearchRequest request)
    {
        var row = new MarketplaceSavedSearch
        {
            UserId = RequireUserId(),
            Name = request.Name ?? request.Query ?? "Saved search",
            Query = request.Query ?? string.Empty,
            FiltersJson = request.Filters == null ? null : JsonSerializer.Serialize(request.Filters),
            AlertsEnabled = request.AlertsEnabled ?? true
        };
        _db.MarketplaceSavedSearches.Add(row);
        await _db.SaveChangesAsync();
        return Created($"/api/marketplace/saved-searches/{row.Id}", new { data = row });
    }

    [HttpDelete("saved-searches/{id:int}")]
    [Authorize]
    public async Task<IActionResult> DeleteSavedSearch(int id)
    {
        var row = await _db.MarketplaceSavedSearches.FirstOrDefaultAsync(s => s.Id == id && s.UserId == RequireUserId());
        if (row == null) return NotFound(new { error = "Saved search not found" });
        _db.MarketplaceSavedSearches.Remove(row);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpGet("collections")]
    [Authorize]
    public async Task<IActionResult> Collections()
    {
        var userId = RequireUserId();
        var rows = await _db.MarketplaceCollections.Where(c => c.UserId == userId || c.IsPublic).OrderByDescending(c => c.CreatedAt).ToListAsync();
        return Ok(new { data = rows, meta = new { total = rows.Count } });
    }

    [HttpPost("collections")]
    [Authorize]
    public async Task<IActionResult> CreateCollection([FromBody] CollectionRequest request)
    {
        var row = new MarketplaceCollection { UserId = RequireUserId(), Name = request.Name ?? "Collection", Description = request.Description, IsPublic = request.IsPublic };
        _db.MarketplaceCollections.Add(row);
        await _db.SaveChangesAsync();
        return Created($"/api/marketplace/collections/{row.Id}", new { data = row });
    }

    [HttpPut("collections/{id:int}")]
    [Authorize]
    public async Task<IActionResult> UpdateCollection(int id, [FromBody] CollectionRequest request)
    {
        var row = await _db.MarketplaceCollections.FirstOrDefaultAsync(c => c.Id == id && c.UserId == RequireUserId());
        if (row == null) return NotFound(new { error = "Collection not found" });
        if (request.Name != null) row.Name = request.Name;
        if (request.Description != null) row.Description = request.Description;
        row.IsPublic = request.IsPublic;
        row.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(new { data = row });
    }

    [HttpDelete("collections/{id:int}")]
    [Authorize]
    public async Task<IActionResult> DeleteCollection(int id)
    {
        var row = await _db.MarketplaceCollections.FirstOrDefaultAsync(c => c.Id == id && c.UserId == RequireUserId());
        if (row == null) return NotFound(new { error = "Collection not found" });
        _db.MarketplaceCollections.Remove(row);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("collections/{id:int}/items")]
    [Authorize]
    public async Task<IActionResult> AddCollectionItem(int id, [FromBody] CollectionItemRequest request)
    {
        if (!await _db.MarketplaceCollections.AnyAsync(c => c.Id == id && c.UserId == RequireUserId())) return NotFound(new { error = "Collection not found" });
        var row = new MarketplaceCollectionItem { MarketplaceCollectionId = id, MarketplaceListingId = request.ListingId };
        _db.MarketplaceCollectionItems.Add(row);
        await _db.SaveChangesAsync();
        return Created($"/api/marketplace/collections/{id}/items/{request.ListingId}", new { data = row });
    }

    [HttpGet("collections/{id:int}/items")]
    [Authorize]
    public async Task<IActionResult> CollectionItems(int id)
    {
        var listingIds = await _db.MarketplaceCollectionItems.Where(i => i.MarketplaceCollectionId == id).Select(i => i.MarketplaceListingId).ToListAsync();
        var listings = await _db.MarketplaceListings.Include(l => l.Images).Where(l => listingIds.Contains(l.Id)).ToListAsync();
        return Ok(new { data = listings.Select(l => MapListing(l)), meta = new { total = listings.Count } });
    }

    [HttpDelete("collections/{id:int}/items/{listingId:int}")]
    [Authorize]
    public async Task<IActionResult> DeleteCollectionItem(int id, int listingId)
    {
        var row = await _db.MarketplaceCollectionItems.FirstOrDefaultAsync(i => i.MarketplaceCollectionId == id && i.MarketplaceListingId == listingId);
        if (row == null) return NotFound(new { error = "Collection item not found" });
        _db.MarketplaceCollectionItems.Remove(row);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpGet("promotions/products")]
    [AllowAnonymous]
    public IActionResult PromotionProducts()
        => Ok(new { data = new[] { new { code = "featured_7d", name = "Featured for 7 days", price = 0 }, new { code = "featured_30d", name = "Featured for 30 days", price = 0 } } });

    [HttpPost("listings/{id:int}/promote")]
    [Authorize]
    public async Task<IActionResult> PromoteListing(int id, [FromBody] PromotionRequest request)
    {
        var listing = await _db.MarketplaceListings.FirstOrDefaultAsync(l => l.Id == id);
        if (listing == null) return NotFound(new { error = "Listing not found" });
        if (listing.UserId != RequireUserId() && !User.IsAdmin()) return StatusCode(403, new { error = "Forbidden" });
        var days = request.ProductCode == "featured_30d" ? 30 : 7;
        listing.PromotionType = request.ProductCode ?? "featured_7d";
        listing.PromotedUntil = DateTime.UtcNow.AddDays(days);
        var promotion = new MarketplacePromotion { MarketplaceListingId = id, UserId = listing.UserId, ProductCode = listing.PromotionType, EndsAt = listing.PromotedUntil.Value };
        _db.MarketplacePromotions.Add(promotion);
        await _db.SaveChangesAsync();
        return Created($"/api/marketplace/listings/{id}/promotion", new { data = promotion });
    }

    [HttpGet("listings/{id:int}/promotion")]
    [AllowAnonymous]
    public async Task<IActionResult> ListingPromotion(int id)
    {
        var promotion = await _db.MarketplacePromotions.Where(p => p.MarketplaceListingId == id).OrderByDescending(p => p.CreatedAt).FirstOrDefaultAsync();
        return Ok(new { data = promotion });
    }

    [HttpGet("promotions/mine")]
    [Authorize]
    public async Task<IActionResult> MyPromotions()
    {
        var userId = RequireUserId();
        var rows = await _db.MarketplacePromotions.Where(p => p.UserId == userId).OrderByDescending(p => p.CreatedAt).ToListAsync();
        return Ok(new { data = rows, meta = new { total = rows.Count } });
    }

    [HttpGet("groups/{groupId:int}/listings")]
    [AllowAnonymous]
    public async Task<IActionResult> GroupListings(int groupId)
    {
        var (items, total) = await _marketplace.ListListingsAsync(null, null, null, null, null, null, null, null, null, groupId, false, false, 1, 100);
        return Ok(new { data = items.Select(l => MapListing(l)), meta = new { total } });
    }

    [HttpGet("groups/{groupId:int}/stats")]
    [AllowAnonymous]
    public async Task<IActionResult> GroupStats(int groupId)
    {
        var total = await _db.MarketplaceListings.CountAsync(l => l.GroupId == groupId);
        return Ok(new { data = new { group_id = groupId, listings = total } });
    }

    [HttpPost("orders/{orderId:int}/delivery-offers")]
    [Authorize]
    public async Task<IActionResult> CreateDeliveryOffer(int orderId, [FromBody] DeliveryOfferRequest request)
    {
        var offer = new MarketplaceDeliveryOffer { MarketplaceOrderId = orderId, DelivererUserId = RequireUserId(), TimeCreditAmount = request.TimeCreditAmount };
        _db.MarketplaceDeliveryOffers.Add(offer);
        await _db.SaveChangesAsync();
        return Created($"/api/marketplace/orders/{orderId}/delivery-offers", new { data = offer });
    }

    [HttpGet("orders/{orderId:int}/delivery-offers")]
    [Authorize]
    public async Task<IActionResult> DeliveryOffers(int orderId)
    {
        var rows = await _db.MarketplaceDeliveryOffers.Where(o => o.MarketplaceOrderId == orderId).ToListAsync();
        return Ok(new { data = rows, meta = new { total = rows.Count } });
    }

    [HttpPut("orders/{orderId:int}/delivery-offers/{delivererId:int}/accept")]
    [Authorize]
    public Task<IActionResult> AcceptDeliveryOffer(int orderId, int delivererId) => DeliveryOfferStatus(orderId, delivererId, "accepted");

    [HttpPut("orders/{orderId:int}/delivery-offers/{delivererId:int}/confirm")]
    [Authorize]
    public Task<IActionResult> ConfirmDeliveryOffer(int orderId, int delivererId) => DeliveryOfferStatus(orderId, delivererId, "confirmed");

    [HttpPost("listings/{id:int}/auto-reply")]
    [Authorize]
    public IActionResult AutoReply(int id, [FromBody] AutoReplyRequest request)
        => Ok(new { data = new { listing_id = id, reply = $"Thanks for your message about this listing. {request.Question}".Trim() } });

    [HttpPost("listings/{id:int}/report")]
    [Authorize]
    public async Task<IActionResult> ReportListing(int id, [FromBody] ReportRequest request)
    {
        var report = await _marketplace.ReportListingAsync(id, RequireUserId(), request.Reason ?? "inappropriate", request.Details);
        return Created($"/api/marketplace/reports/{report.Id}", new { data = report });
    }

    [HttpGet("seller/coupons")]
    [Authorize]
    public async Task<IActionResult> SellerCoupons()
    {
        var userId = RequireUserId();
        var rows = await _db.MerchantCoupons.Where(c => c.SellerUserId == userId).ToListAsync();
        return Ok(new { data = rows, meta = new { total = rows.Count } });
    }

    [HttpPost("seller/coupons")]
    [Authorize]
    public async Task<IActionResult> CreateSellerCoupon([FromBody] CouponRequest request)
    {
        var row = new MerchantCoupon { SellerUserId = RequireUserId(), Code = request.Code ?? Guid.NewGuid().ToString("N")[..8].ToUpperInvariant(), Description = request.Description ?? string.Empty, DiscountAmount = request.DiscountAmount, DiscountType = request.DiscountType ?? "fixed", ExpiresAt = request.ExpiresAt };
        _db.MerchantCoupons.Add(row);
        await _db.SaveChangesAsync();
        return Created($"/api/marketplace/seller/coupons/{row.Id}", new { data = row });
    }

    [HttpPut("seller/coupons/{id:int}")]
    [Authorize]
    public async Task<IActionResult> UpdateSellerCoupon(int id, [FromBody] CouponRequest request)
    {
        var row = await _db.MerchantCoupons.FirstOrDefaultAsync(c => c.Id == id && c.SellerUserId == RequireUserId());
        if (row == null) return NotFound(new { error = "Coupon not found" });
        if (request.Code != null) row.Code = request.Code;
        if (request.Description != null) row.Description = request.Description;
        if (request.DiscountAmount != 0) row.DiscountAmount = request.DiscountAmount;
        if (request.DiscountType != null) row.DiscountType = request.DiscountType;
        row.ExpiresAt = request.ExpiresAt;
        await _db.SaveChangesAsync();
        return Ok(new { data = row });
    }

    [HttpDelete("seller/coupons/{id:int}")]
    [Authorize]
    public async Task<IActionResult> DeleteSellerCoupon(int id)
    {
        var row = await _db.MerchantCoupons.FirstOrDefaultAsync(c => c.Id == id && c.SellerUserId == RequireUserId());
        if (row == null) return NotFound(new { error = "Coupon not found" });
        _db.MerchantCoupons.Remove(row);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpGet("seller/coupons/{id:int}/redemptions")]
    [Authorize]
    public async Task<IActionResult> CouponRedemptions(int id)
    {
        var rows = await _db.MerchantCouponRedemptions.Where(r => r.MerchantCouponId == id).ToListAsync();
        return Ok(new { data = rows, meta = new { total = rows.Count } });
    }

    [HttpGet("seller/shipping-options")]
    [Authorize]
    public async Task<IActionResult> ShippingOptions()
    {
        var rows = await _db.MarketplaceShippingOptions.Where(o => o.UserId == RequireUserId()).ToListAsync();
        return Ok(new { data = rows, meta = new { total = rows.Count } });
    }

    [HttpPost("seller/shipping-options")]
    [Authorize]
    public async Task<IActionResult> CreateShippingOption([FromBody] ShippingOptionRequest request)
    {
        var row = new MarketplaceShippingOption { UserId = RequireUserId(), Name = request.Name ?? "Shipping", Price = request.Price, Currency = request.Currency ?? "EUR", Region = request.Region };
        _db.MarketplaceShippingOptions.Add(row);
        await _db.SaveChangesAsync();
        return Created($"/api/marketplace/seller/shipping-options/{row.Id}", new { data = row });
    }

    [HttpPut("seller/shipping-options/{id:int}")]
    [Authorize]
    public async Task<IActionResult> UpdateShippingOption(int id, [FromBody] ShippingOptionRequest request)
    {
        var row = await _db.MarketplaceShippingOptions.FirstOrDefaultAsync(o => o.Id == id && o.UserId == RequireUserId());
        if (row == null) return NotFound(new { error = "Shipping option not found" });
        if (request.Name != null) row.Name = request.Name;
        row.Price = request.Price;
        if (request.Currency != null) row.Currency = request.Currency;
        if (request.Region != null) row.Region = request.Region;
        row.IsActive = request.IsActive ?? row.IsActive;
        await _db.SaveChangesAsync();
        return Ok(new { data = row });
    }

    [HttpDelete("seller/shipping-options/{id:int}")]
    [Authorize]
    public async Task<IActionResult> DeleteShippingOption(int id)
    {
        var row = await _db.MarketplaceShippingOptions.FirstOrDefaultAsync(o => o.Id == id && o.UserId == RequireUserId());
        if (row == null) return NotFound(new { error = "Shipping option not found" });
        _db.MarketplaceShippingOptions.Remove(row);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpGet("seller/pickup-slots")]
    [Authorize]
    public async Task<IActionResult> PickupSlots()
    {
        var rows = await _db.MarketplacePickupSlots.Where(s => s.UserId == RequireUserId()).ToListAsync();
        return Ok(new { data = rows, meta = new { total = rows.Count } });
    }

    [HttpPost("seller/pickup-slots")]
    [Authorize]
    public async Task<IActionResult> CreatePickupSlot([FromBody] PickupSlotRequest request)
    {
        var row = new MarketplacePickupSlot { UserId = RequireUserId(), Location = request.Location ?? string.Empty, StartsAt = request.StartsAt, EndsAt = request.EndsAt, Capacity = Math.Max(1, request.Capacity) };
        _db.MarketplacePickupSlots.Add(row);
        await _db.SaveChangesAsync();
        return Created($"/api/marketplace/seller/pickup-slots/{row.Id}", new { data = row });
    }

    [HttpPut("seller/pickup-slots/{id:int}")]
    [Authorize]
    public async Task<IActionResult> UpdatePickupSlot(int id, [FromBody] PickupSlotRequest request)
    {
        var row = await _db.MarketplacePickupSlots.FirstOrDefaultAsync(s => s.Id == id && s.UserId == RequireUserId());
        if (row == null) return NotFound(new { error = "Pickup slot not found" });
        if (request.Location != null) row.Location = request.Location;
        if (request.StartsAt != default) row.StartsAt = request.StartsAt;
        if (request.EndsAt != default) row.EndsAt = request.EndsAt;
        if (request.Capacity > 0) row.Capacity = request.Capacity;
        row.IsActive = request.IsActive ?? row.IsActive;
        await _db.SaveChangesAsync();
        return Ok(new { data = row });
    }

    [HttpDelete("seller/pickup-slots/{id:int}")]
    [Authorize]
    public async Task<IActionResult> DeletePickupSlot(int id)
    {
        var row = await _db.MarketplacePickupSlots.FirstOrDefaultAsync(s => s.Id == id && s.UserId == RequireUserId());
        if (row == null) return NotFound(new { error = "Pickup slot not found" });
        _db.MarketplacePickupSlots.Remove(row);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("seller/pickup-scan")]
    [Authorize]
    public IActionResult PickupScan([FromBody] PickupScanRequest request)
        => Ok(new { data = new { request.Code, status = "accepted" } });

    [HttpGet("listings/{id:int}/pickup-slots")]
    [AllowAnonymous]
    public async Task<IActionResult> ListingPickupSlots(int id)
    {
        var listing = await _db.MarketplaceListings.FirstOrDefaultAsync(l => l.Id == id);
        if (listing == null) return NotFound(new { error = "Listing not found" });
        var rows = await _db.MarketplacePickupSlots.Where(s => s.UserId == listing.UserId && s.IsActive).ToListAsync();
        return Ok(new { data = rows, meta = new { total = rows.Count } });
    }

    [HttpPost("orders/{id:int}/pickup-reservation")]
    [Authorize]
    public async Task<IActionResult> ReservePickup(int id, [FromBody] PickupReservationRequest request)
    {
        var row = new MarketplacePickupReservation { MarketplaceOrderId = id, MarketplacePickupSlotId = request.PickupSlotId, UserId = RequireUserId() };
        _db.MarketplacePickupReservations.Add(row);
        await _db.SaveChangesAsync();
        return Created($"/api/marketplace/orders/{id}/pickup-reservation", new { data = row });
    }

    [HttpGet("me/pickups")]
    [Authorize]
    public async Task<IActionResult> MyPickups()
    {
        var rows = await _db.MarketplacePickupReservations.Where(r => r.UserId == RequireUserId()).ToListAsync();
        return Ok(new { data = rows, meta = new { total = rows.Count } });
    }

    [HttpPatch("seller/listings/{id:int}/inventory")]
    [Authorize]
    public async Task<IActionResult> UpdateInventory(int id, [FromBody] InventoryRequest request)
    {
        var listing = await _db.MarketplaceListings.FirstOrDefaultAsync(l => l.Id == id);
        if (listing == null) return NotFound(new { error = "Listing not found" });
        if (listing.UserId != RequireUserId() && !User.IsAdmin()) return StatusCode(403, new { error = "Forbidden" });
        listing.Quantity = Math.Max(0, request.Quantity);
        listing.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(new { data = MapListing(listing) });
    }

    [HttpGet("categories")]
    [AllowAnonymous]
    public async Task<IActionResult> Categories()
    {
        await _marketplace.EnsureDefaultCategoriesAsync();
        var rows = await _db.MarketplaceCategories.OrderBy(c => c.SortOrder).ThenBy(c => c.Name).ToListAsync();
        return Ok(new { data = rows, meta = new { total = rows.Count } });
    }

    [HttpGet("categories/{id:int}/template")]
    [AllowAnonymous]
    public IActionResult CategoryTemplate(int id)
        => Ok(new { data = new { category_id = id, fields = Array.Empty<object>() } });

    [HttpGet("sellers/{id:int}")]
    [AllowAnonymous]
    public async Task<IActionResult> Seller(int id)
    {
        var profile = await _db.MarketplaceSellerProfiles.FirstOrDefaultAsync(p => p.Id == id || p.UserId == id);
        return profile == null ? NotFound(new { error = "Seller not found" }) : Ok(new { data = profile });
    }

    [HttpGet("sellers/{id:int}/listings")]
    [AllowAnonymous]
    public async Task<IActionResult> SellerListings(int id)
    {
        var profile = await _db.MarketplaceSellerProfiles.FirstOrDefaultAsync(p => p.Id == id || p.UserId == id);
        if (profile == null) return NotFound(new { error = "Seller not found" });
        var (items, total) = await _marketplace.ListListingsAsync(null, null, null, null, null, null, null, null, profile.UserId, null, false, false, 1, 100);
        return Ok(new { data = items.Select(l => MapListing(l)), meta = new { total } });
    }

    [HttpPost("webhooks/stripe")]
    [AllowAnonymous]
    public IActionResult StripeWebhook() => Ok(new { received = true });

    private async Task<IActionResult> OfferStatus(int id, string status)
    {
        var offer = await _marketplace.SetOfferStatusAsync(id, RequireUserId(), User.IsAdmin(), status);
        return offer == null ? NotFound(new { error = "Offer not found" }) : Ok(new { data = offer });
    }

    private async Task<IActionResult> OrderStatus(int id, string status, string? trackingNumber = null)
    {
        var order = await _marketplace.SetOrderStatusAsync(id, RequireUserId(), User.IsAdmin(), status, trackingNumber);
        return order == null ? NotFound(new { error = "Order not found" }) : Ok(new { data = order });
    }

    private async Task<IActionResult> DeliveryOfferStatus(int orderId, int delivererId, string status)
    {
        var offer = await _db.MarketplaceDeliveryOffers.FirstOrDefaultAsync(o => o.MarketplaceOrderId == orderId && o.DelivererUserId == delivererId);
        if (offer == null) return NotFound(new { error = "Delivery offer not found" });
        offer.Status = status;
        offer.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(new { data = offer });
    }

    private int RequireUserId()
        => User.GetUserId() ?? throw new UnauthorizedAccessException("Invalid token");

    private static object Paged(IEnumerable<object> data, int page, int limit, int total)
        => new { data, meta = new { page, limit, total, pages = (int)Math.Ceiling((double)total / limit) } };

    private static object MapListing(MarketplaceListing listing, bool detailed = false)
        => new
        {
            listing.Id,
            listing.UserId,
            listing.CategoryId,
            category = listing.Category == null ? null : new { listing.Category.Id, listing.Category.Name, listing.Category.Slug, listing.Category.Icon },
            seller = listing.User == null ? null : new { listing.User.Id, listing.User.FirstName, listing.User.LastName, listing.User.AvatarUrl },
            listing.Title,
            listing.Tagline,
            listing.Description,
            listing.Price,
            listing.PriceCurrency,
            listing.PriceType,
            listing.TimeCreditPrice,
            listing.Condition,
            listing.Quantity,
            listing.Location,
            listing.Latitude,
            listing.Longitude,
            listing.ShippingAvailable,
            listing.LocalPickup,
            listing.DeliveryMethod,
            listing.SellerType,
            listing.Status,
            listing.MarketplaceStatus,
            listing.ModerationStatus,
            listing.PromotionType,
            listing.PromotedUntil,
            listing.ExpiresAt,
            listing.VideoUrl,
            listing.ViewsCount,
            listing.SavesCount,
            listing.ContactsCount,
            listing.CreatedAt,
            listing.UpdatedAt,
            images = listing.Images.OrderBy(i => i.SortOrder).Select(i => new { i.Id, i.Url, i.AltText, i.SortOrder }),
            details = detailed ? new { listing.TemplateDataJson, listing.ModerationNotes, offers = listing.Offers.Count } : null
        };

    private static double DistanceKm(double lat1, double lon1, double lat2, double lon2)
    {
        const double earth = 6371;
        var dLat = (lat2 - lat1) * Math.PI / 180;
        var dLon = (lon2 - lon1) * Math.PI / 180;
        var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2)
            + Math.Cos(lat1 * Math.PI / 180) * Math.Cos(lat2 * Math.PI / 180)
            * Math.Sin(dLon / 2) * Math.Sin(dLon / 2);
        return earth * 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
    }
}

public record ImageRequest(string? Url, string? AltText);
public record ReorderImagesRequest(int[]? ImageIds);
public record VideoRequest(string? Url);
public record GenerateDescriptionRequest(string? Title, string? Keywords);
public record OfferRequest(decimal? Amount, decimal? TimeCreditAmount, string? Message);
public record SellerProfileRequest(string? DisplayName, string? Bio, string? SellerType);
public record CreateOrderRequest(int ListingId, int Quantity, string? DeliveryMethod, string? ShippingAddress);
public record ShipOrderRequest(string? TrackingNumber);
public record RateOrderRequest(int Rating, string? Comment);
public record ReportRequest(string? Reason, string? Details);
public record PaymentRequest(decimal Amount, string? Currency);
public record PaymentConfirmRequest(string PaymentId);
public record SavedSearchRequest(string? Name, string? Query, Dictionary<string, object>? Filters, bool? AlertsEnabled);
public record CollectionRequest(string? Name, string? Description, bool IsPublic);
public record CollectionItemRequest(int ListingId);
public record PromotionRequest(string? ProductCode);
public record DeliveryOfferRequest(decimal TimeCreditAmount);
public record AutoReplyRequest(string? Question);
public record CouponRequest(string? Code, string? Description, decimal DiscountAmount, string? DiscountType, DateTime? ExpiresAt);
public record ShippingOptionRequest(string? Name, decimal Price, string? Currency, string? Region, bool? IsActive);
public record PickupSlotRequest(string? Location, DateTime StartsAt, DateTime EndsAt, int Capacity, bool? IsActive);
public record PickupScanRequest(string? Code);
public record PickupReservationRequest(int PickupSlotId);
public record InventoryRequest(int Quantity);
public record BulkActionRequest(string? Action, int[]? Ids);
