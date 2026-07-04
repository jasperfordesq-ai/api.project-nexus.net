// Copyright (c) 2024-2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Nexus.Api.Data;
using Nexus.Api.Services;

namespace Nexus.Api.Controllers;

[ApiController]
[Route("api/admin/caring-community/safeguarding")]
[Authorize(Policy = "AdminOnly")]
public sealed class AdminCaringCommunitySafeguardingController : ControllerBase
{
    private readonly CaringSafeguardingService _safeguarding;
    private readonly TenantContext _tenant;

    public AdminCaringCommunitySafeguardingController(
        CaringSafeguardingService safeguarding,
        TenantContext tenant)
    {
        _safeguarding = safeguarding;
        _tenant = tenant;
    }

    [HttpGet("dashboard")]
    public async Task<IActionResult> Dashboard(CancellationToken ct)
    {
        var guard = await GuardAsync(ct);
        if (guard is not null)
        {
            return guard;
        }

        var data = await _safeguarding.DashboardSummaryAsync(_tenant.GetTenantIdOrThrow(), ct);
        return Ok(new { data });
    }

    [HttpGet("reports")]
    public async Task<IActionResult> Reports(
        [FromQuery] string? status,
        [FromQuery] string? severity,
        CancellationToken ct)
    {
        var guard = await GuardAsync(ct);
        if (guard is not null)
        {
            return guard;
        }

        var items = await _safeguarding.ListReportsAsync(_tenant.GetTenantIdOrThrow(), status, severity, ct);
        return Ok(new { data = new { items } });
    }

    [HttpGet("reports/{id:long}")]
    public async Task<IActionResult> Report(long id, CancellationToken ct)
    {
        var guard = await GuardAsync(ct);
        if (guard is not null)
        {
            return guard;
        }

        var data = await _safeguarding.ReportDetailAsync(_tenant.GetTenantIdOrThrow(), id, ct);
        if (data is null)
        {
            return StatusCode(StatusCodes.Status404NotFound, LaravelError("NOT_FOUND", "Not found."));
        }

        return Ok(new { data });
    }

    private async Task<IActionResult?> GuardAsync(CancellationToken ct)
    {
        if (!await _safeguarding.IsCaringCommunityEnabledAsync(_tenant.GetTenantIdOrThrow(), ct))
        {
            return StatusCode(StatusCodes.Status403Forbidden,
                LaravelError("FEATURE_DISABLED", "Service unavailable."));
        }

        return null;
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
