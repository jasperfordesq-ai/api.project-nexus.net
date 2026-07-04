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

namespace Nexus.Api.Controllers;

[ApiController]
[Route("api/caring-community")]
[Authorize]
public sealed class CaringCommunityMemberController : ControllerBase
{
    private readonly CaringSupportRelationshipService _relationships;
    private readonly CaringSafeguardingService _safeguarding;
    private readonly CaringCommunityDataExportService _dataExport;
    private readonly TenantContext _tenant;

    public CaringCommunityMemberController(
        CaringSupportRelationshipService relationships,
        CaringSafeguardingService safeguarding,
        CaringCommunityDataExportService dataExport,
        TenantContext tenant)
    {
        _relationships = relationships;
        _safeguarding = safeguarding;
        _dataExport = dataExport;
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
