// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Nexus.Api.Data;
using Nexus.Api.Entities;
using Nexus.Api.Services;

namespace Nexus.Api.Controllers;

/// <summary>
/// Federation External API v1 - endpoints callable by partner timebanks/servers.
/// Authenticated via API Key (X-Federation-Key) or Federation JWT.
/// All endpoints are prefixed with /api/v1/federation.
/// </summary>
[ApiController]
[Route("api/v1/federation")]
public class FederationExternalApiController : ControllerBase
{
    private readonly NexusDbContext _db;
    private readonly FederationService _federationService;
    private readonly FederationJwtService _jwtService;
    private readonly FederationApiKeyService _apiKeyService;
    private readonly ILogger<FederationExternalApiController> _logger;

    public FederationExternalApiController(
        NexusDbContext db,
        FederationService federationService,
        FederationJwtService jwtService,
        FederationApiKeyService apiKeyService,
        ILogger<FederationExternalApiController> logger)
    {
        _db = db;
        _federationService = federationService;
        _jwtService = jwtService;
        _apiKeyService = apiKeyService;
        _logger = logger;
    }

    private int? GetFederationTenantId() =>
        HttpContext.Items.TryGetValue("FederationTenantId", out var id) ? (int?)id : null;

    private string GetFederationScopes() =>
        HttpContext.Items.TryGetValue("FederationScopes", out var scopes) ? scopes?.ToString() ?? "" : "";

    private bool HasScope(string scope)
    {
        var scopes = GetFederationScopes().Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        return scopes.Contains(scope, StringComparer.OrdinalIgnoreCase) || scopes.Contains("*");
    }

    /// <summary>
    /// GET /api/v1/federation - API info and endpoint directory (public, no auth required).
    /// </summary>
    [HttpGet]
    public IActionResult GetApiInfo()
    {
        return Ok(new
        {
            name = "Project NEXUS Federation API",
            version = "1.0",
            protocol = "nexus-federation-v1",
            endpoints = new[]
            {
                new { method = "GET", path = "/api/v1/federation", description = "API info (this endpoint)", auth = false },
                new { method = "POST", path = "/api/v1/federation/token", description = "Request federation JWT", auth = true },
                new { method = "GET", path = "/api/v1/federation/timebanks", description = "List partner timebanks", auth = true },
                new { method = "GET", path = "/api/v1/federation/listings", description = "Search shared listings", auth = true },
                new { method = "GET", path = "/api/v1/federation/listings/{id}", description = "Get listing details", auth = true },
                new { method = "GET", path = "/api/v1/federation/members", description = "Search shared members", auth = true },
                new { method = "GET", path = "/api/v1/federation/members/{id}", description = "Get member profile", auth = true },
                new { method = "POST", path = "/api/v1/federation/exchanges", description = "Initiate exchange", auth = true },
                new { method = "GET", path = "/api/v1/federation/exchanges/{id}", description = "Get exchange status", auth = true },
                new { method = "POST", path = "/api/v1/federation/webhooks/test", description = "Test webhook", auth = true }
            }
        });
    }

    /// <summary>
    /// POST /api/v1/federation/token - Request a federation JWT using API key authentication.
    /// The JWT can then be used for subsequent requests to specific tenants.
    /// </summary>
    [HttpPost("token")]
    public async Task<IActionResult> RequestToken([FromBody] FederationTokenRequest request)
    {
        var tenantId = GetFederationTenantId();
        if (tenantId == null)
            return Unauthorized(new { error = "API key authentication required" });

        // Verify the target tenant exists and has a partnership
        var targetTenant = await _db.Tenants
            .AsNoTracking()
            .FirstOrDefaultAsync(t => t.Id == request.TargetTenantId && t.IsActive);

        if (targetTenant == null)
            return BadRequest(new { error = "Target tenant not found or not active" });

        var sourceTenant = await _db.Tenants
            .AsNoTracking()
            .FirstOrDefaultAsync(t => t.Id == tenantId.Value);

        if (sourceTenant == null)
            return BadRequest(new { error = "Source tenant not found" });

        // Check partnership exists
        var partnership = await _db.Set<FederationPartner>()
            .IgnoreQueryFilters()
            .AnyAsync(fp =>
                fp.Status == PartnerStatus.Active &&
                ((fp.TenantId == tenantId.Value && fp.PartnerTenantId == request.TargetTenantId) ||
                 (fp.TenantId == request.TargetTenantId && fp.PartnerTenantId == tenantId.Value)));

        if (!partnership)
            return BadRequest(new { error = "No active partnership with target tenant" });

        // Filter requested scopes to what the API key allows
        var allowedScopes = request.Scopes?.Where(s => HasScope(s)).ToArray()
            ?? new[] { "listings" };

        if (allowedScopes.Length == 0)
            return Forbid();

        var token = _jwtService.GenerateToken(
            tenantId.Value, sourceTenant.Slug,
            request.TargetTenantId, allowedScopes);

        return Ok(new
        {
            access_token = token,
            token_type = "Bearer",
            expires_in = 300, // 5 minutes
            scopes = allowedScopes
        });
    }

    /// <summary>
    /// GET /api/v1/federation/timebanks - List partner timebanks visible to the caller.
    /// </summary>
    [HttpGet("timebanks")]
    public async Task<IActionResult> ListTimebanks()
    {
        var tenantId = GetFederationTenantId();
        if (tenantId == null)
            return Unauthorized(new { error = "Authentication required" });

        var partners = await _db.Set<FederationPartner>()
            .IgnoreQueryFilters()
            .Where(fp => fp.Status == PartnerStatus.Active &&
                (fp.TenantId == tenantId.Value || fp.PartnerTenantId == tenantId.Value))
            .Include(fp => fp.Tenant)
            .Include(fp => fp.PartnerTenant)
            .AsNoTracking()
            .ToListAsync();

        var timebanks = partners.Select(p =>
        {
            var partnerTenant = p.TenantId == tenantId.Value ? p.PartnerTenant : p.Tenant;
            return new
            {
                id = partnerTenant?.Id,
                name = partnerTenant?.Name,
                slug = partnerTenant?.Slug,
                shared_listings = p.SharedListings,
                shared_events = p.SharedEvents,
                shared_members = p.SharedMembers,
                credit_exchange_rate = p.CreditExchangeRate,
                partnership_since = p.ApprovedAt
            };
        }).DistinctBy(t => t.id);

        return Ok(new { data = timebanks });
    }

    /// <summary>
    /// GET /api/v1/federation/listings - Search shared listings from the target tenant.
    /// </summary>
    [HttpGet("listings")]
    public async Task<IActionResult> SearchListings(
        [FromQuery] int page = 1,
        [FromQuery] int limit = 20,
        [FromQuery] string? search = null,
        [FromQuery] string? type = null)
    {
        var tenantId = GetFederationTenantId();
        if (tenantId == null)
            return Unauthorized(new { error = "Authentication required" });

        if (!HasScope("listings"))
            return Forbid();

        page = Math.Max(1, page);
        limit = Math.Clamp(limit, 1, 100);

        // Find all active partnerships where this tenant can see listings
        var partnerTenantIds = await _db.Set<FederationPartner>()
            .IgnoreQueryFilters()
            .Where(fp => fp.Status == PartnerStatus.Active && fp.SharedListings &&
                (fp.TenantId == tenantId.Value || fp.PartnerTenantId == tenantId.Value))
            .Select(fp => fp.TenantId == tenantId.Value ? fp.PartnerTenantId : fp.TenantId)
            .ToListAsync();

        if (partnerTenantIds.Count == 0)
            return Ok(new { data = Array.Empty<object>(), pagination = new { page, limit, total = 0, pages = 0 } });

        var query = _db.Listings
            .IgnoreQueryFilters()
            .Where(l => partnerTenantIds.Contains(l.TenantId) && l.Status == ListingStatus.Active)
            .Include(l => l.User)
            .AsNoTracking();

        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(l => EF.Functions.ILike(l.Title, $"%{search}%") ||
                                     (l.Description != null && EF.Functions.ILike(l.Description, $"%{search}%")));

        if (!string.IsNullOrWhiteSpace(type))
        {
            if (Enum.TryParse<ListingType>(type, true, out var listingType))
                query = query.Where(l => l.Type == listingType);
        }

        var total = await query.CountAsync();
        var listings = await query
            .OrderByDescending(l => l.CreatedAt)
            .Skip((page - 1) * limit)
            .Take(limit)
            .ToListAsync();

        var data = listings.Select(l => new
        {
            id = l.Id,
            tenant_id = l.TenantId,
            title = l.Title,
            description = l.Description,
            type = l.Type.ToString().ToLowerInvariant(),
            owner = l.User != null ? new
            {
                display_name = $"{l.User.FirstName} {l.User.LastName}"
            } : null,
            created_at = l.CreatedAt
        });

        return Ok(new
        {
            data,
            pagination = new { page, limit, total, pages = (int)Math.Ceiling((double)total / limit) }
        });
    }

    /// <summary>
    /// GET /api/v1/federation/listings/{id} - Get a specific listing by ID.
    /// </summary>
    [HttpGet("listings/{id:int}")]
    public async Task<IActionResult> GetListing(int id)
    {
        var tenantId = GetFederationTenantId();
        if (tenantId == null)
            return Unauthorized(new { error = "Authentication required" });

        if (!HasScope("listings"))
            return Forbid();

        // Find partner tenant IDs
        var partnerTenantIds = await _db.Set<FederationPartner>()
            .IgnoreQueryFilters()
            .Where(fp => fp.Status == PartnerStatus.Active && fp.SharedListings &&
                (fp.TenantId == tenantId.Value || fp.PartnerTenantId == tenantId.Value))
            .Select(fp => fp.TenantId == tenantId.Value ? fp.PartnerTenantId : fp.TenantId)
            .ToListAsync();

        var listing = await _db.Listings
            .IgnoreQueryFilters()
            .Include(l => l.User)
            .Include(l => l.Category)
            .AsNoTracking()
            .FirstOrDefaultAsync(l => l.Id == id && partnerTenantIds.Contains(l.TenantId) && l.Status == ListingStatus.Active);

        if (listing == null)
            return NotFound(new { error = "Listing not found or not accessible" });

        return Ok(new
        {
            id = listing.Id,
            tenant_id = listing.TenantId,
            title = listing.Title,
            description = listing.Description,
            type = listing.Type.ToString().ToLowerInvariant(),
            category = listing.Category?.Name,
            estimated_hours = listing.EstimatedHours,
            owner = listing.User != null ? new
            {
                display_name = $"{listing.User.FirstName} {listing.User.LastName}",
                id = listing.User.Id
            } : null,
            created_at = listing.CreatedAt
        });
    }

    /// <summary>
    /// GET /api/v1/federation/members - Search shared members from partner tenants.
    /// </summary>
    [HttpGet("members")]
    public async Task<IActionResult> SearchMembers(
        [FromQuery] int page = 1,
        [FromQuery] int limit = 20,
        [FromQuery] string? search = null)
    {
        var tenantId = GetFederationTenantId();
        if (tenantId == null)
            return Unauthorized(new { error = "Authentication required" });

        if (!HasScope("members"))
            return Forbid();

        page = Math.Max(1, page);
        limit = Math.Clamp(limit, 1, 50);

        // Find partner tenants with member sharing
        var partnerTenantIds = await _db.Set<FederationPartner>()
            .IgnoreQueryFilters()
            .Where(fp => fp.Status == PartnerStatus.Active && fp.SharedMembers &&
                (fp.TenantId == tenantId.Value || fp.PartnerTenantId == tenantId.Value))
            .Select(fp => fp.TenantId == tenantId.Value ? fp.PartnerTenantId : fp.TenantId)
            .ToListAsync();

        if (partnerTenantIds.Count == 0)
            return Ok(new { data = Array.Empty<object>(), pagination = new { page, limit, total = 0, pages = 0 } });

        // Also check user-level opt-in
        var optedInUserIds = await _db.Set<FederationUserSetting>()
            .IgnoreQueryFilters()
            .Where(s => partnerTenantIds.Contains(s.TenantId) && s.FederationOptIn && s.ProfileVisible)
            .Select(s => s.UserId)
            .ToListAsync();

        var query = _db.Users
            .IgnoreQueryFilters()
            .Where(u => partnerTenantIds.Contains(u.TenantId) && u.IsActive && optedInUserIds.Contains(u.Id))
            .AsNoTracking();

        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(u => EF.Functions.ILike(u.FirstName, $"%{search}%") ||
                                     EF.Functions.ILike(u.LastName, $"%{search}%"));

        var total = await query.CountAsync();
        var members = await query
            .OrderBy(u => u.LastName).ThenBy(u => u.FirstName)
            .Skip((page - 1) * limit)
            .Take(limit)
            .ToListAsync();

        var data = members.Select(u => new
        {
            id = u.Id,
            tenant_id = u.TenantId,
            display_name = $"{u.FirstName} {u.LastName}"
        });

        return Ok(new
        {
            data,
            pagination = new { page, limit, total, pages = (int)Math.Ceiling((double)total / limit) }
        });
    }

    /// <summary>
    /// GET /api/v1/federation/members/{id} - Get a specific member profile.
    /// </summary>
    [HttpGet("members/{id:int}")]
    public async Task<IActionResult> GetMember(int id)
    {
        var tenantId = GetFederationTenantId();
        if (tenantId == null)
            return Unauthorized(new { error = "Authentication required" });

        if (!HasScope("members"))
            return Forbid();

        var partnerTenantIds = await _db.Set<FederationPartner>()
            .IgnoreQueryFilters()
            .Where(fp => fp.Status == PartnerStatus.Active && fp.SharedMembers &&
                (fp.TenantId == tenantId.Value || fp.PartnerTenantId == tenantId.Value))
            .Select(fp => fp.TenantId == tenantId.Value ? fp.PartnerTenantId : fp.TenantId)
            .ToListAsync();

        // Check user opt-in
        var isOptedIn = await _db.Set<FederationUserSetting>()
            .IgnoreQueryFilters()
            .AnyAsync(s => s.UserId == id && s.FederationOptIn && s.ProfileVisible);

        if (!isOptedIn)
            return NotFound(new { error = "Member not found or not visible" });

        var user = await _db.Users
            .IgnoreQueryFilters()
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == id && partnerTenantIds.Contains(u.TenantId) && u.IsActive);

        if (user == null)
            return NotFound(new { error = "Member not found or not accessible" });

        return Ok(new
        {
            id = user.Id,
            tenant_id = user.TenantId,
            display_name = $"{user.FirstName} {user.LastName}",
            created_at = user.CreatedAt
        });
    }

    /// <summary>
    /// POST /api/v1/federation/exchanges - Initiate a cross-tenant exchange via the external API.
    /// </summary>
    [HttpPost("exchanges")]
    public async Task<IActionResult> InitiateExchange([FromBody] ExternalExchangeRequest request)
    {
        var tenantId = GetFederationTenantId();
        if (tenantId == null)
            return Unauthorized(new { error = "Authentication required" });

        if (!HasScope("exchanges"))
            return Forbid();

        if (request.AgreedHours <= 0)
            return BadRequest(new { error = "Agreed hours must be greater than zero" });

        // Verify the listing belongs to a partner tenant
        var listing = await _db.Listings
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(l => l.Id == request.ListingId && l.Status == ListingStatus.Active);

        if (listing == null)
            return NotFound(new { error = "Listing not found" });

        // Check partnership
        var partnership = await _db.Set<FederationPartner>()
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(fp => fp.Status == PartnerStatus.Active &&
                ((fp.TenantId == tenantId.Value && fp.PartnerTenantId == listing.TenantId) ||
                 (fp.TenantId == listing.TenantId && fp.PartnerTenantId == tenantId.Value)));

        if (partnership == null)
            return BadRequest(new { error = "No active partnership with listing's tenant" });

        // Create the federated exchange record
        var exchange = new FederatedExchange
        {
            TenantId = listing.TenantId,
            PartnerTenantId = tenantId.Value,
            LocalUserId = listing.UserId,
            RemoteUserDisplayName = request.RequesterDisplayName ?? "Federation User",
            RemoteUserId = request.RequesterUserId,
            SourceListingId = listing.Id,
            Status = ExchangeStatus.Requested,
            AgreedHours = request.AgreedHours,
            CreditExchangeRate = partnership.CreditExchangeRate,
            Notes = request.Notes,
            CreatedAt = DateTime.UtcNow
        };

        _db.Set<FederatedExchange>().Add(exchange);

        _db.Set<FederationAuditLog>().Add(new FederationAuditLog
        {
            TenantId = listing.TenantId,
            PartnerTenantId = tenantId.Value,
            Action = "exchange.initiated.external",
            EntityType = "FederatedExchange",
            Details = System.Text.Json.JsonSerializer.Serialize(new
            {
                listing_id = listing.Id,
                requester = request.RequesterDisplayName,
                agreed_hours = request.AgreedHours
            }),
            CreatedAt = DateTime.UtcNow
        });

        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetExchange), new { id = exchange.Id }, new
        {
            id = exchange.Id,
            status = exchange.Status.ToString().ToLowerInvariant(),
            listing_id = listing.Id,
            agreed_hours = exchange.AgreedHours,
            credit_exchange_rate = exchange.CreditExchangeRate,
            created_at = exchange.CreatedAt
        });
    }

    /// <summary>
    /// GET /api/v1/federation/exchanges/{id} - Get exchange status.
    /// </summary>
    [HttpGet("exchanges/{id:int}")]
    public async Task<IActionResult> GetExchange(int id)
    {
        var tenantId = GetFederationTenantId();
        if (tenantId == null)
            return Unauthorized(new { error = "Authentication required" });

        if (!HasScope("exchanges"))
            return Forbid();

        var exchange = await _db.Set<FederatedExchange>()
            .IgnoreQueryFilters()
            .AsNoTracking()
            .FirstOrDefaultAsync(e => e.Id == id &&
                (e.TenantId == tenantId.Value || e.PartnerTenantId == tenantId.Value));

        if (exchange == null)
            return NotFound(new { error = "Exchange not found" });

        return Ok(new
        {
            id = exchange.Id,
            tenant_id = exchange.TenantId,
            partner_tenant_id = exchange.PartnerTenantId,
            status = exchange.Status.ToString().ToLowerInvariant(),
            source_listing_id = exchange.SourceListingId,
            agreed_hours = exchange.AgreedHours,
            actual_hours = exchange.ActualHours,
            credit_exchange_rate = exchange.CreditExchangeRate,
            completed_at = exchange.CompletedAt,
            created_at = exchange.CreatedAt
        });
    }

    /// <summary>
    /// POST /api/v1/federation/webhooks/test - Test webhook connectivity.
    /// </summary>
    [HttpPost("webhooks/test")]
    public IActionResult TestWebhook()
    {
        var tenantId = GetFederationTenantId();
        if (tenantId == null)
            return Unauthorized(new { error = "Authentication required" });

        return Ok(new
        {
            success = true,
            message = "Webhook test successful",
            tenant_id = tenantId.Value,
            timestamp = DateTime.UtcNow
        });
    }
}

#region External API Request DTOs

public class FederationTokenRequest
{
    [JsonPropertyName("target_tenant_id")]
    public int TargetTenantId { get; set; }

    [JsonPropertyName("scopes")]
    public string[]? Scopes { get; set; }
}

public class ExternalExchangeRequest
{
    [JsonPropertyName("listing_id")]
    public int ListingId { get; set; }

    [JsonPropertyName("agreed_hours")]
    public decimal AgreedHours { get; set; }

    [JsonPropertyName("requester_display_name")]
    public string? RequesterDisplayName { get; set; }

    [JsonPropertyName("requester_user_id")]
    public int? RequesterUserId { get; set; }

    [JsonPropertyName("notes")]
    public string? Notes { get; set; }
}

#endregion
