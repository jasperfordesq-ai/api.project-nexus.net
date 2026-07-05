// Copyright (c) 2024-2026 Jasper Ford
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

namespace Nexus.Api.Controllers;

[ApiController]
public sealed class LaravelReactUtilityCompatibilityController : ControllerBase
{
    private readonly NexusDbContext _db;
    private readonly TenantContext _tenant;

    public LaravelReactUtilityCompatibilityController(NexusDbContext db, TenantContext tenant)
    {
        _db = db;
        _tenant = tenant;
    }

    [AllowAnonymous]
    [HttpGet("/api/auth/sso/providers")]
    [HttpGet("/api/v2/auth/sso/providers")]
    public async Task<IActionResult> SsoProviders([FromQuery(Name = "tenant_id")] int? tenantId)
    {
        var resolvedTenantId = ResolveTenantId(tenantId);
        if (resolvedTenantId <= 0)
        {
            return Ok(new { success = true, providers = Array.Empty<object>() });
        }

        var providers = await _db.TenantSsoProviders
            .IgnoreQueryFilters()
            .Where(p => p.TenantId == resolvedTenantId && p.IsEnabled)
            .OrderBy(p => p.DisplayName)
            .Select(p => new
            {
                provider_key = p.ProviderKey,
                key = p.ProviderKey,
                display_name = p.DisplayName,
                name = p.DisplayName,
                preset = p.Preset,
                scopes = p.Scopes,
                auto_provision = p.AutoProvision
            })
            .ToListAsync();

        return Ok(new { success = true, providers });
    }

    [AllowAnonymous]
    [HttpGet("/api/auth/sso/{provider}/redirect")]
    [HttpGet("/api/v2/auth/sso/{provider}/redirect")]
    public async Task<IActionResult> SsoRedirect(string provider, [FromQuery(Name = "tenant_id")] int? tenantId)
    {
        var resolvedTenantId = ResolveTenantId(tenantId);
        if (resolvedTenantId <= 0)
        {
            return BadRequest(new { success = false, error = "tenant_required", message = "Tenant is required." });
        }

        var row = await _db.TenantSsoProviders
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(p => p.TenantId == resolvedTenantId && p.IsEnabled && p.ProviderKey == provider);
        if (row == null)
        {
            return BadRequest(new { success = false, error = "sso_redirect_failed", message = "SSO provider is not available." });
        }

        var authorizeBase = row.IssuerUrl.TrimEnd('/') + "/authorize";
        var redirectUri = $"{Request.Scheme}://{Request.Host}/api/v2/auth/sso/callback";
        var query = new Dictionary<string, string?>
        {
            ["client_id"] = row.ClientId,
            ["response_type"] = "code",
            ["scope"] = row.Scopes,
            ["redirect_uri"] = redirectUri,
            ["state"] = $"tenant:{resolvedTenantId}:provider:{provider}"
        };
        var redirectUrl = authorizeBase + "?" + string.Join("&", query.Select(kvp =>
            $"{Uri.EscapeDataString(kvp.Key)}={Uri.EscapeDataString(kvp.Value ?? string.Empty)}"));

        return Ok(new { success = true, redirect_url = redirectUrl, provider });
    }

    [AllowAnonymous]
    [HttpGet("/api/auth/sso/callback")]
    [HttpGet("/api/v2/auth/sso/callback")]
    public IActionResult SsoCallback([FromQuery] string? error = null, [FromQuery] string? code = null, [FromQuery] string? state = null)
    {
        var qs = string.IsNullOrWhiteSpace(error)
            ? $"code={Uri.EscapeDataString(code ?? string.Empty)}&provider=sso"
            : $"error=sso_failed&message={Uri.EscapeDataString(error)}";
        return Redirect("/auth/oauth/callback?" + qs);
    }

    [AllowAnonymous]
    [HttpPost("/api/auth/oauth/exchange")]
    [HttpPost("/api/v2/auth/oauth/exchange")]
    public IActionResult OauthExchange([FromBody] JsonElement body)
    {
        var code = ReadString(body, "code");
        if (string.IsNullOrWhiteSpace(code))
        {
            return BadRequest(new { success = false, error = "invalid_oauth_code", message = "Invalid OAuth callback code." });
        }

        return BadRequest(new { success = false, error = "invalid_oauth_code", message = "Invalid OAuth callback code." });
    }

    [AllowAnonymous]
    [HttpGet("/api/geo/os-places/search")]
    [HttpGet("/api/v2/geo/os-places/search")]
    public async Task<IActionResult> OsPlacesSearch([FromQuery] string? q)
    {
        var tenantId = ResolveTenantId(null);
        var provider = tenantId > 0 ? await GetTenantConfigAsync(tenantId, "geocoding_provider") : null;
        var apiKey = tenantId > 0 ? await GetTenantConfigAsync(tenantId, "os_maps_api_key") : null;
        var enabled = provider == "os_places" && !string.IsNullOrWhiteSpace(apiKey);

        if (!enabled || string.IsNullOrWhiteSpace(q) || q.Trim().Length < 3)
        {
            return Data(new { enabled, results = Array.Empty<object>() });
        }

        return Data(new { enabled = true, results = Array.Empty<object>() });
    }

    [Authorize]
    [HttpGet("/api/exchanges/needs-attention-count")]
    [HttpGet("/api/v2/exchanges/needs-attention-count")]
    public async Task<IActionResult> ExchangesNeedsAttention()
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized(new { success = false, error = "Invalid token" });
        var tenantId = _tenant.GetTenantIdOrThrow();

        var rows = await _db.Exchanges
            .IgnoreQueryFilters()
            .Include(e => e.Listing)
            .Where(e => e.TenantId == tenantId &&
                        (e.InitiatorId == userId.Value || e.ListingOwnerId == userId.Value || e.ProviderId == userId.Value || e.ReceiverId == userId.Value) &&
                        (e.Status == ExchangeStatus.Requested || e.Status == ExchangeStatus.Accepted || e.Status == ExchangeStatus.Completed))
            .OrderByDescending(e => e.UpdatedAt ?? e.CreatedAt)
            .Take(5)
            .Select(e => new
            {
                id = e.Id,
                status = e.Status.ToString().ToLowerInvariant(),
                listing_id = e.ListingId,
                listing_title = e.Listing != null ? e.Listing.Title : null,
                created_at = e.CreatedAt,
                updated_at = e.UpdatedAt
            })
            .ToListAsync();

        return Data(new { count = rows.Count, items = rows });
    }

    [Authorize]
    [HttpGet("/api/reviews/given")]
    [HttpGet("/api/v2/reviews/given")]
    public async Task<IActionResult> ReviewsGiven([FromQuery(Name = "per_page")] int perPage = 20)
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized(new { success = false, error = "Invalid token" });
        var tenantId = _tenant.GetTenantIdOrThrow();
        var limit = Math.Clamp(perPage, 1, 100);

        var reviews = await _db.Reviews
            .IgnoreQueryFilters()
            .Include(r => r.TargetUser)
            .Include(r => r.TargetListing)
            .Where(r => r.TenantId == tenantId && r.ReviewerId == userId.Value)
            .OrderByDescending(r => r.CreatedAt)
            .Take(limit + 1)
            .ToListAsync();
        var hasMore = reviews.Count > limit;
        var data = reviews.Take(limit).Select(r => new
        {
            id = r.Id,
            reviewer_id = r.ReviewerId,
            target_user_id = r.TargetUserId,
            target_listing_id = r.TargetListingId,
            target_name = r.TargetUser == null ? null : $"{r.TargetUser.FirstName} {r.TargetUser.LastName}".Trim(),
            listing_title = r.TargetListing?.Title,
            rating = r.Rating,
            comment = r.Comment,
            created_at = r.CreatedAt,
            updated_at = r.UpdatedAt
        }).ToArray();

        return Ok(new
        {
            success = true,
            data,
            meta = new { cursor = hasMore ? data.LastOrDefault()?.id.ToString() : null, per_page = limit, has_more = hasMore }
        });
    }

    [Authorize]
    [HttpGet("/api/goals/{id:int}/insights")]
    [HttpGet("/api/v2/goals/{id:int}/insights")]
    public async Task<IActionResult> GoalInsights(int id)
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized(new { success = false, error = "Invalid token" });
        var goal = await _db.Goals
            .IgnoreQueryFilters()
            .Include(g => g.Milestones)
            .FirstOrDefaultAsync(g => g.Id == id && g.TenantId == _tenant.GetTenantIdOrThrow());

        if (goal == null) return NotFound(new { success = false, code = "RESOURCE_NOT_FOUND", error = "Goal not found." });
        if (goal.UserId != userId.Value) return StatusCode(403, new { success = false, code = "RESOURCE_FORBIDDEN", error = "Goal is private." });

        var targetValue = goal.TargetValue.GetValueOrDefault();
        var progress = targetValue <= 0
            ? 0
            : Math.Round(Math.Min(100, goal.CurrentValue / targetValue * 100), 2);
        var completedMilestones = goal.Milestones.Count(m => m.IsCompleted);
        var milestoneCount = goal.Milestones.Count;

        return Data(new
        {
            goal_id = goal.Id,
            progress_percent = progress,
            current_value = goal.CurrentValue,
            target_value = goal.TargetValue,
            status = goal.Status,
            trend = goal.Status == "completed" ? "complete" : "steady",
            completed_milestones = completedMilestones,
            total_milestones = milestoneCount,
            next_action = milestoneCount == completedMilestones ? "Add a new milestone" : "Complete the next milestone",
            milestones = goal.Milestones.OrderBy(m => m.SortOrder).Select(m => new
            {
                id = m.Id,
                title = m.Title,
                is_completed = m.IsCompleted,
                completed_at = m.CompletedAt
            })
        });
    }

    [Authorize]
    [HttpPost("/api/goals/{id:int}/buddy/nudge")]
    [HttpPost("/api/v2/goals/{id:int}/buddy/nudge")]
    public async Task<IActionResult> GoalBuddyNudge(int id, [FromBody] JsonElement body)
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized(new { success = false, error = "Invalid token" });
        var goal = await _db.Goals.IgnoreQueryFilters().FirstOrDefaultAsync(g => g.Id == id && g.TenantId == _tenant.GetTenantIdOrThrow());
        if (goal == null) return NotFound(new { success = false, code = "RESOURCE_NOT_FOUND", error = "Goal not found." });
        if (goal.UserId != userId.Value) return StatusCode(403, new { success = false, code = "RESOURCE_FORBIDDEN", error = "Goal buddy required." });

        var type = ReadString(body, "type") ?? "encouragement";
        return StatusCode(StatusCodes.Status201Created, new
        {
            success = true,
            data = new
            {
                id = Math.Abs(HashCode.Combine(goal.Id, userId.Value, type, DateTime.UtcNow.Date)),
                goal_id = goal.Id,
                user_id = userId.Value,
                type,
                message = "Buddy nudge recorded.",
                created_at = DateTime.UtcNow
            }
        });
    }

    [Authorize]
    [HttpPost("/api/matches/{sourceType}/{sourceId:int}/dismiss")]
    [HttpPost("/api/v2/matches/{sourceType}/{sourceId:int}/dismiss")]
    public async Task<IActionResult> DismissTypedMatch(string sourceType, int sourceId, [FromBody] JsonElement body)
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized(new { success = false, error = "Invalid token" });
        if (sourceId <= 0) return BadRequest(new { success = false, code = "VALIDATION_ERROR", field = "sourceId", error = "Invalid source id." });

        if (sourceType != "listing" && sourceType != "group")
        {
            return BadRequest(new { success = false, code = "VALIDATION_ERROR", field = "sourceType", error = "Invalid source type." });
        }

        var tenantId = _tenant.GetTenantIdOrThrow();
        if (sourceType == "listing")
        {
            var matches = await _db.Set<MatchResult>()
                .IgnoreQueryFilters()
                .Where(m => m.TenantId == tenantId && m.UserId == userId.Value && m.MatchedListingId == sourceId)
                .ToListAsync();
            foreach (var match in matches)
            {
                match.Status = MatchStatus.Declined;
                match.RespondedAt = DateTime.UtcNow;
                match.UpdatedAt = DateTime.UtcNow;
            }

            if (matches.Count > 0) await _db.SaveChangesAsync();
        }

        return Data(new
        {
            dismissed = true,
            source_type = sourceType,
            source_id = sourceId,
            reason = ReadString(body, "reason") ?? "not_interested"
        });
    }

    [Authorize]
    [HttpPost("/api/messages/{id:int}/request-coordinator")]
    [HttpPost("/api/v2/messages/{id:int}/request-coordinator")]
    public async Task<IActionResult> RequestCoordinator(int id)
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized(new { success = false, error = "Invalid token" });
        var tenantId = _tenant.GetTenantIdOrThrow();
        var targetExists = await _db.Users.IgnoreQueryFilters().AnyAsync(u => u.TenantId == tenantId && u.Id == id);
        if (!targetExists) return NotFound(new { success = false, code = "RESOURCE_NOT_FOUND", error = "User not found." });

        return Data(new
        {
            requested = true,
            recipient_id = id,
            requester_id = userId.Value,
            status = "queued",
            message = "Coordinator assistance requested."
        });
    }

    private int ResolveTenantId(int? tenantId)
    {
        if (tenantId is > 0) return tenantId.Value;
        if (_tenant.IsResolved) return _tenant.GetTenantIdOrThrow();
        return User.GetTenantId() ?? 0;
    }

    private async Task<string?> GetTenantConfigAsync(int tenantId, string key)
    {
        return await _db.TenantConfigs
            .IgnoreQueryFilters()
            .Where(c => c.TenantId == tenantId && (c.Key == key || c.Key == "general." + key))
            .Select(c => c.Value)
            .FirstOrDefaultAsync();
    }

    private IActionResult Data(object data) => Ok(new { success = true, data });

    private static string? ReadString(JsonElement body, string property)
    {
        return body.ValueKind == JsonValueKind.Object &&
               body.TryGetProperty(property, out var value) &&
               value.ValueKind == JsonValueKind.String
            ? value.GetString()
            : null;
    }
}
