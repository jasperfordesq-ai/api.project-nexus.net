// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Nexus.Api.Data;
using Nexus.Api.Extensions;
using Nexus.Api.Services;

namespace Nexus.Api.Controllers;

[ApiController]
[Route("api/admin/marketplace")]
[Route("api/v2/admin/marketplace")]
[Authorize(Policy = "AdminOnly")]
public class AdminMarketplaceController : ControllerBase
{
    private readonly MarketplaceService _marketplace;
    private readonly NexusDbContext _db;

    public AdminMarketplaceController(MarketplaceService marketplace, NexusDbContext db)
    {
        _marketplace = marketplace;
        _db = db;
    }

    [HttpGet("dashboard")]
    public async Task<IActionResult> Dashboard()
    {
        var listings = await _db.MarketplaceListings.CountAsync();
        var pending = await _db.MarketplaceListings.CountAsync(l => l.ModerationStatus == "pending");
        var sellers = await _db.MarketplaceSellerProfiles.CountAsync();
        var orders = await _db.MarketplaceOrders.CountAsync();
        var reports = await _db.MarketplaceReports.CountAsync(r => r.Status != "resolved");
        return Ok(new { data = new { listings, pending, sellers, orders, open_reports = reports } });
    }

    [HttpGet("listings")]
    public async Task<IActionResult> Listings(
        [FromQuery] int page = 1,
        [FromQuery] int limit = 50,
        [FromQuery] string? status = null,
        [FromQuery] string? moderation_status = null,
        [FromQuery] string? q = null)
    {
        page = Math.Max(1, page);
        limit = Math.Clamp(limit, 1, 100);
        var query = _db.MarketplaceListings
            .Include(l => l.User)
            .Include(l => l.Category)
            .Include(l => l.Images)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(status)) query = query.Where(l => l.Status == status);
        if (!string.IsNullOrWhiteSpace(moderation_status)) query = query.Where(l => l.ModerationStatus == moderation_status);
        if (!string.IsNullOrWhiteSpace(q))
        {
            var term = q.Trim().ToLower();
            query = query.Where(l => l.Title.ToLower().Contains(term) || l.Description.ToLower().Contains(term));
        }

        var total = await query.CountAsync();
        var rows = await query.OrderByDescending(l => l.CreatedAt).Skip((page - 1) * limit).Take(limit).ToListAsync();
        return Ok(new { data = rows, meta = new { page, limit, total } });
    }

    [HttpPost("listings/{id:int}/approve")]
    public async Task<IActionResult> ApproveListing(int id)
    {
        var listing = await _marketplace.ModerateListingAsync(id, User.GetUserId() ?? 0, "approved", null);
        return listing == null ? NotFound(new { error = "Listing not found" }) : Ok(new { data = listing });
    }

    [HttpPost("listings/{id:int}/reject")]
    public async Task<IActionResult> RejectListing(int id, [FromBody] AdminModerationRequest request)
    {
        var listing = await _marketplace.ModerateListingAsync(id, User.GetUserId() ?? 0, "rejected", request.Notes);
        return listing == null ? NotFound(new { error = "Listing not found" }) : Ok(new { data = listing });
    }

    [HttpDelete("listings/{id:int}")]
    public async Task<IActionResult> DeleteListing(int id)
    {
        var listing = await _db.MarketplaceListings.FirstOrDefaultAsync(l => l.Id == id);
        if (listing == null) return NotFound(new { error = "Listing not found" });
        _db.MarketplaceListings.Remove(listing);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("bulk-reject")]
    public async Task<IActionResult> BulkReject([FromBody] AdminBulkModerationRequest request)
    {
        var changed = 0;
        foreach (var id in request.Ids ?? Array.Empty<int>())
        {
            if (await _marketplace.ModerateListingAsync(id, User.GetUserId() ?? 0, "rejected", request.Notes) != null)
                changed++;
        }
        return Ok(new { data = new { changed } });
    }

    [HttpGet("sellers")]
    public async Task<IActionResult> Sellers([FromQuery] int page = 1, [FromQuery] int limit = 50)
    {
        page = Math.Max(1, page);
        limit = Math.Clamp(limit, 1, 100);
        var query = _db.MarketplaceSellerProfiles.Include(p => p.User).AsQueryable();
        var total = await query.CountAsync();
        var rows = await query.OrderByDescending(p => p.CreatedAt).Skip((page - 1) * limit).Take(limit).ToListAsync();
        return Ok(new { data = rows, meta = new { page, limit, total } });
    }

    [HttpPost("sellers/{id:int}/verify")]
    public async Task<IActionResult> VerifySeller(int id)
    {
        var profile = await _marketplace.SetSellerStatusAsync(id, verify: true, suspend: false, reason: null);
        return profile == null ? NotFound(new { error = "Seller not found" }) : Ok(new { data = profile });
    }

    [HttpPost("sellers/{id:int}/suspend")]
    public async Task<IActionResult> SuspendSeller(int id, [FromBody] AdminModerationRequest request)
    {
        var profile = await _marketplace.SetSellerStatusAsync(id, verify: false, suspend: true, reason: request.Notes);
        return profile == null ? NotFound(new { error = "Seller not found" }) : Ok(new { data = profile });
    }

    [HttpGet("reports")]
    public async Task<IActionResult> Reports([FromQuery] string? status = null)
    {
        var query = _db.MarketplaceReports.AsQueryable();
        if (!string.IsNullOrWhiteSpace(status)) query = query.Where(r => r.Status == status);
        var rows = await query.OrderByDescending(r => r.CreatedAt).ToListAsync();
        return Ok(new { data = rows, meta = new { total = rows.Count } });
    }

    [HttpPost("reports/{id:int}/acknowledge")]
    public async Task<IActionResult> AcknowledgeReport(int id)
    {
        var report = await _db.MarketplaceReports.FirstOrDefaultAsync(r => r.Id == id);
        if (report == null) return NotFound(new { error = "Report not found" });
        report.Status = "acknowledged";
        report.AcknowledgedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(new { data = report });
    }

    [HttpPut("reports/{id:int}/resolve")]
    public async Task<IActionResult> ResolveReport(int id, [FromBody] AdminModerationRequest request)
    {
        var report = await _db.MarketplaceReports.FirstOrDefaultAsync(r => r.Id == id);
        if (report == null) return NotFound(new { error = "Report not found" });
        report.Status = "resolved";
        report.ResolutionNotes = request.Notes;
        report.ResolvedByUserId = User.GetUserId();
        report.ResolvedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(new { data = report });
    }

    [HttpGet("transparency")]
    public async Task<IActionResult> Transparency()
    {
        var reports = await _db.MarketplaceReports.CountAsync();
        var resolved = await _db.MarketplaceReports.CountAsync(r => r.Status == "resolved");
        var rejected = await _db.MarketplaceListings.CountAsync(l => l.ModerationStatus == "rejected");
        return Ok(new { data = new { reports, resolved, rejected_listings = rejected } });
    }

    [HttpGet("listings/{id:int}/reports")]
    public async Task<IActionResult> ListingReports(int id)
    {
        var rows = await _db.MarketplaceReports.Where(r => r.MarketplaceListingId == id).OrderByDescending(r => r.CreatedAt).ToListAsync();
        return Ok(new { data = rows, meta = new { total = rows.Count } });
    }

    [HttpGet("coupons")]
    public async Task<IActionResult> Coupons()
    {
        var rows = await _db.MerchantCoupons.OrderByDescending(c => c.CreatedAt).ToListAsync();
        return Ok(new { data = rows, meta = new { total = rows.Count } });
    }

    [HttpPost("coupons/{id:int}/suspend")]
    public async Task<IActionResult> SuspendCoupon(int id)
    {
        var coupon = await _db.MerchantCoupons.FirstOrDefaultAsync(c => c.Id == id);
        if (coupon == null) return NotFound(new { error = "Coupon not found" });
        coupon.IsActive = false;
        await _db.SaveChangesAsync();
        return Ok(new { data = coupon });
    }

    [HttpDelete("coupons/{id:int}")]
    public async Task<IActionResult> DeleteCoupon(int id)
    {
        var coupon = await _db.MerchantCoupons.FirstOrDefaultAsync(c => c.Id == id);
        if (coupon == null) return NotFound(new { error = "Coupon not found" });
        _db.MerchantCoupons.Remove(coupon);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}

public record AdminModerationRequest(string? Notes);
public record AdminBulkModerationRequest(int[]? Ids, string? Notes);
