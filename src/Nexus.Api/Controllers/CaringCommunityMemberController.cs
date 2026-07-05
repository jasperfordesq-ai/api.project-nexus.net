// Copyright (c) 2024-2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Nexus.Api.Data;
using Nexus.Api.Extensions;
using Nexus.Api.Services;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Globalization;

namespace Nexus.Api.Controllers;

[ApiController]
[Route("api/caring-community")]
[Authorize]
public sealed class CaringCommunityMemberController : ControllerBase
{
    private readonly CaringSupportRelationshipService _relationships;
    private readonly CaringSafeguardingService _safeguarding;
    private readonly CaringCommunityDataExportService _dataExport;
    private readonly CaringCommunityAhvPensionExportService _ahvPensionExport;
    private readonly CaringCommunityFutureCareFundService _futureCareFund;
    private readonly CaringRegionalPointService _regionalPoints;
    private readonly CaringResearchPartnershipService _research;
    private readonly TenantContext _tenant;

    public CaringCommunityMemberController(
        CaringSupportRelationshipService relationships,
        CaringSafeguardingService safeguarding,
        CaringCommunityDataExportService dataExport,
        CaringCommunityAhvPensionExportService ahvPensionExport,
        CaringCommunityFutureCareFundService futureCareFund,
        CaringRegionalPointService regionalPoints,
        CaringResearchPartnershipService research,
        TenantContext tenant)
    {
        _relationships = relationships;
        _safeguarding = safeguarding;
        _dataExport = dataExport;
        _ahvPensionExport = ahvPensionExport;
        _futureCareFund = futureCareFund;
        _regionalPoints = regionalPoints;
        _research = research;
        _tenant = tenant;
    }

    [HttpGet("my-relationships")]
    public async Task<IActionResult> MyRelationships(CancellationToken ct)
    {
        var guard = await GuardAsync(ct);
        if (guard is not null)
        {
            return guard;
        }

        var userId = User.GetUserId();
        if (userId is null)
        {
            return Unauthorized(LaravelError("AUTH_REQUIRED", "Authentication required."));
        }

        var data = await _relationships.ListForMemberAsync(_tenant.GetTenantIdOrThrow(), userId.Value, ct);
        return Ok(new { data });
    }

    [HttpGet("safeguarding/my-reports")]
    public async Task<IActionResult> SafeguardingMyReports(CancellationToken ct)
    {
        var guard = await GuardAsync(ct);
        if (guard is not null)
        {
            return guard;
        }

        var userId = User.GetUserId();
        if (userId is null)
        {
            return Unauthorized(LaravelError("AUTH_REQUIRED", "Authentication required."));
        }

        var items = await _safeguarding.MyReportsAsync(_tenant.GetTenantIdOrThrow(), userId.Value, ct);
        return Ok(new { data = new { items } });
    }

    [HttpGet("me/data-export")]
    public async Task<IActionResult> MyDataExport(CancellationToken ct)
    {
        var user = await GuardAndUserAsync(ct);
        if (user.Result is not null)
        {
            return user.Result;
        }

        var payload = await _dataExport.BuildAsync(
            _tenant.GetTenantIdOrThrow(),
            user.UserId!.Value,
            ct);

        var json = JsonSerializer.Serialize(payload, new JsonSerializerOptions
        {
            WriteIndented = true
        });
        var fileName = $"my-data-{user.UserId.Value}-{DateTime.UtcNow:yyyy-MM-dd}.json";

        Response.Headers["X-Content-Type-Options"] = "nosniff";
        Response.Headers["Cache-Control"] = "no-store, no-cache, must-revalidate, private";
        Response.Headers["Pragma"] = "no-cache";

        return File(
            Encoding.UTF8.GetBytes(json),
            "application/json; charset=utf-8",
            fileName);
    }

    [HttpGet("my-ahv-pension-export")]
    public async Task<IActionResult> MyAhvPensionExport(
        [FromQuery(Name = "from")] string? fromDate,
        [FromQuery(Name = "to")] string? toDate,
        CancellationToken ct)
    {
        var user = await GuardAndUserAsync(ct);
        if (user.Result is not null)
        {
            return user.Result;
        }

        var data = await _ahvPensionExport.BuildAsync(
            _tenant.GetTenantIdOrThrow(),
            user.UserId!.Value,
            fromDate,
            toDate,
            ct);

        return Ok(new { data });
    }

    [HttpGet("my-future-care-fund")]
    public async Task<IActionResult> MyFutureCareFund(CancellationToken ct)
    {
        var user = await GuardAndUserAsync(ct);
        if (user.Result is not null)
        {
            return user.Result;
        }

        var data = await _futureCareFund.SummaryAsync(
            _tenant.GetTenantIdOrThrow(),
            user.UserId!.Value,
            ct);

        return Ok(new { data });
    }

    [HttpGet("regional-points/summary")]
    public async Task<IActionResult> RegionalPointsSummary(CancellationToken ct)
    {
        var user = await GuardAndUserAsync(ct);
        if (user.Result is not null)
        {
            return user.Result;
        }

        try
        {
            var data = await _regionalPoints.MemberSummaryAsync(
                _tenant.GetTenantIdOrThrow(),
                user.UserId!.Value,
                ct);

            return Ok(new { data });
        }
        catch (RegionalPointFeatureDisabledException ex)
        {
            return StatusCode(StatusCodes.Status403Forbidden,
                LaravelError("FEATURE_DISABLED", ex.Message));
        }
    }

    [HttpGet("regional-points/history")]
    public async Task<IActionResult> RegionalPointsHistory(
        [FromQuery] int? limit,
        CancellationToken ct)
    {
        var user = await GuardAndUserAsync(ct);
        if (user.Result is not null)
        {
            return user.Result;
        }

        try
        {
            var items = await _regionalPoints.MemberHistoryAsync(
                _tenant.GetTenantIdOrThrow(),
                user.UserId!.Value,
                limit,
                ct);

            return Ok(new { data = new { items } });
        }
        catch (RegionalPointFeatureDisabledException ex)
        {
            return StatusCode(StatusCodes.Status403Forbidden,
                LaravelError("FEATURE_DISABLED", ex.Message));
        }
    }

    [HttpGet("regional-points/marketplace/quote")]
    public async Task<IActionResult> RegionalPointsMarketplaceQuote(
        [FromQuery(Name = "seller_id")] int sellerId,
        [FromQuery(Name = "listing_id")] int? listingId,
        [FromQuery(Name = "order_total_chf")] decimal orderTotalChf,
        CancellationToken ct)
    {
        var user = await GuardAndUserAsync(ct);
        if (user.Result is not null)
        {
            return user.Result;
        }

        if (sellerId <= 0)
        {
            return StatusCode(StatusCodes.Status422UnprocessableEntity,
                LaravelError("VALIDATION_ERROR", "Validation failed.", "seller_id"));
        }

        if (orderTotalChf <= 0m)
        {
            return StatusCode(StatusCodes.Status422UnprocessableEntity,
                LaravelError("VALIDATION_ERROR", "Validation failed.", "order_total_chf"));
        }

        var data = await _regionalPoints.CalculateMarketplaceDiscountAsync(
            _tenant.GetTenantIdOrThrow(),
            user.UserId!.Value,
            sellerId,
            listingId,
            orderTotalChf,
            ct);

        return Ok(new { data });
    }

    [HttpPost("regional-points/marketplace/redeem")]
    public async Task<IActionResult> RegionalPointsMarketplaceRedeem(
        [FromBody] JsonElement payload,
        CancellationToken ct)
    {
        var user = await GuardAndUserAsync(ct);
        if (user.Result is not null)
        {
            return user.Result;
        }

        var sellerId = ReadInt(payload, "seller_id");
        if (sellerId <= 0)
        {
            return StatusCode(StatusCodes.Status422UnprocessableEntity,
                LaravelError("VALIDATION_ERROR", "Validation failed.", "seller_id"));
        }

        try
        {
            var result = await _regionalPoints.RedeemForMarketplaceDiscountAsync(
                _tenant.GetTenantIdOrThrow(),
                user.UserId!.Value,
                sellerId,
                ReadNullableInt(payload, "listing_id"),
                ReadDecimal(payload, "points_to_use"),
                ReadDecimal(payload, "order_total_chf"),
                ct);

            return StatusCode(StatusCodes.Status201Created, new { data = result with { Success = true } });
        }
        catch (RegionalPointValidationException ex)
        {
            return StatusCode(StatusCodes.Status422UnprocessableEntity,
                LaravelError("VALIDATION_ERROR", ex.Message));
        }
        catch (RegionalPointFeatureDisabledException ex)
        {
            return StatusCode(StatusCodes.Status403Forbidden,
                LaravelError("FEATURE_DISABLED", ex.Message));
        }
        catch (RegionalPointOperationException ex)
        {
            var code = ex.Message.Contains("not enough", StringComparison.OrdinalIgnoreCase)
                ? "INSUFFICIENT_REGIONAL_POINTS"
                : "REGIONAL_POINTS_REDEMPTION_FAILED";
            return StatusCode(StatusCodes.Status422UnprocessableEntity,
                LaravelError(code, ex.Message));
        }
    }

    [HttpGet("research/consent")]
    public async Task<IActionResult> ResearchConsent(CancellationToken ct)
    {
        var user = await GuardAndUserAsync(ct);
        if (user.Result is not null)
        {
            return user.Result;
        }

        var data = await _research.GetConsentAsync(
            _tenant.GetTenantIdOrThrow(),
            user.UserId!.Value,
            ct);

        return Ok(new { data });
    }

    [HttpPut("research/consent")]
    public async Task<IActionResult> UpdateResearchConsent(
        [FromBody] ResearchConsentRequest? request,
        CancellationToken ct)
    {
        var user = await GuardAndUserAsync(ct);
        if (user.Result is not null)
        {
            return user.Result;
        }

        try
        {
            var data = await _research.RecordConsentAsync(
                _tenant.GetTenantIdOrThrow(),
                user.UserId!.Value,
                request?.ConsentStatus ?? string.Empty,
                request?.Notes,
                ct);

            return Ok(new { data });
        }
        catch (CaringResearchValidationException ex)
        {
            return StatusCode(StatusCodes.Status422UnprocessableEntity,
                LaravelError("VALIDATION_ERROR", ex.Message, "consent_status"));
        }
    }

    [HttpPost("my-relationships/{id:int}/pause")]
    public async Task<IActionResult> PauseRelationship(
        int id,
        [FromBody] RelationshipLifecycleRequest? request,
        CancellationToken ct)
    {
        var user = await GuardAndUserAsync(ct);
        if (user.Result is not null)
        {
            return user.Result;
        }

        var result = await _relationships.PauseRelationshipAsync(
            _tenant.GetTenantIdOrThrow(),
            user.UserId!.Value,
            id,
            request?.ResumeAt,
            ct);

        return LifecycleResponse(result);
    }

    [HttpPost("my-relationships/{id:int}/end")]
    public async Task<IActionResult> EndRelationship(
        int id,
        [FromBody] RelationshipLifecycleRequest? request,
        CancellationToken ct)
    {
        _ = request;

        var user = await GuardAndUserAsync(ct);
        if (user.Result is not null)
        {
            return user.Result;
        }

        var result = await _relationships.EndRelationshipAsync(
            _tenant.GetTenantIdOrThrow(),
            user.UserId!.Value,
            id,
            ct);

        return LifecycleResponse(result);
    }

    [HttpPost("my-relationships/{id:int}/resume")]
    public async Task<IActionResult> ResumeRelationship(
        int id,
        [FromBody] RelationshipLifecycleRequest? request,
        CancellationToken ct)
    {
        _ = request;

        var user = await GuardAndUserAsync(ct);
        if (user.Result is not null)
        {
            return user.Result;
        }

        var result = await _relationships.ResumeRelationshipAsync(
            _tenant.GetTenantIdOrThrow(),
            user.UserId!.Value,
            id,
            ct);

        return LifecycleResponse(result);
    }

    private async Task<IActionResult?> GuardAsync(CancellationToken ct)
    {
        if (!await _relationships.IsFeatureEnabledAsync(_tenant.GetTenantIdOrThrow(), ct))
        {
            return StatusCode(StatusCodes.Status403Forbidden,
                LaravelError("FEATURE_DISABLED", "Service unavailable."));
        }

        return null;
    }

    private async Task<(IActionResult? Result, int? UserId)> GuardAndUserAsync(CancellationToken ct)
    {
        var guard = await GuardAsync(ct);
        if (guard is not null)
        {
            return (guard, null);
        }

        var userId = User.GetUserId();
        if (userId is null)
        {
            return (Unauthorized(LaravelError("AUTH_REQUIRED", "Authentication required.")), null);
        }

        return (null, userId.Value);
    }

    private static int ReadInt(JsonElement payload, string name)
    {
        return payload.ValueKind == JsonValueKind.Object
            && payload.TryGetProperty(name, out var value)
            ? ReadIntValue(value)
            : 0;
    }

    private static int? ReadNullableInt(JsonElement payload, string name)
    {
        if (payload.ValueKind != JsonValueKind.Object
            || !payload.TryGetProperty(name, out var value)
            || value.ValueKind is JsonValueKind.Null or JsonValueKind.Undefined)
        {
            return null;
        }

        if (value.ValueKind == JsonValueKind.String && string.IsNullOrWhiteSpace(value.GetString()))
        {
            return null;
        }

        var parsed = ReadIntValue(value);
        return parsed > 0 ? parsed : null;
    }

    private static decimal ReadDecimal(JsonElement payload, string name)
    {
        return payload.ValueKind == JsonValueKind.Object
            && payload.TryGetProperty(name, out var value)
            ? ReadDecimalValue(value)
            : 0m;
    }

    private static int ReadIntValue(JsonElement value)
    {
        return value.ValueKind switch
        {
            JsonValueKind.Number when value.TryGetInt32(out var parsed) => parsed,
            JsonValueKind.String when int.TryParse(value.GetString(), NumberStyles.Integer, CultureInfo.InvariantCulture, out var parsed) => parsed,
            _ => 0
        };
    }

    private static decimal ReadDecimalValue(JsonElement value)
    {
        return value.ValueKind switch
        {
            JsonValueKind.Number when value.TryGetDecimal(out var parsed) => parsed,
            JsonValueKind.String when decimal.TryParse(value.GetString(), NumberStyles.Number, CultureInfo.InvariantCulture, out var parsed) => parsed,
            _ => 0m
        };
    }

    private IActionResult LifecycleResponse(RelationshipLifecycleResult result)
    {
        if (result.Succeeded)
        {
            return Ok(new { data = new { success = true, status = result.Status } });
        }

        var statusCode = result.ErrorCode switch
        {
            "NOT_FOUND" => StatusCodes.Status404NotFound,
            "INVALID_STATE" => StatusCodes.Status422UnprocessableEntity,
            "VALIDATION_ERROR" => StatusCodes.Status422UnprocessableEntity,
            _ => StatusCodes.Status500InternalServerError
        };

        return StatusCode(statusCode, LaravelError(
            result.ErrorCode ?? "SERVER_ERROR",
            result.ErrorCode switch
            {
                "NOT_FOUND" => "Not found.",
                "INVALID_STATE" => "Relationship cannot be changed from its current state.",
                "VALIDATION_ERROR" => "Validation failed.",
                _ => "Server error."
            },
            result.ErrorField));
    }

    private static object LaravelError(string code, string message, string? field = null)
    {
        var error = new Dictionary<string, object?>
        {
            ["code"] = code,
            ["message"] = message
        };
        if (field is not null)
        {
            error["field"] = field;
        }

        return new { errors = new[] { error } };
    }
}

public sealed class RelationshipLifecycleRequest
{
    [JsonPropertyName("reason")]
    public string? Reason { get; set; }

    [JsonPropertyName("resume_at")]
    public string? ResumeAt { get; set; }
}

public sealed class ResearchConsentRequest
{
    [JsonPropertyName("consent_status")]
    public string? ConsentStatus { get; set; }

    [JsonPropertyName("notes")]
    public string? Notes { get; set; }
}
