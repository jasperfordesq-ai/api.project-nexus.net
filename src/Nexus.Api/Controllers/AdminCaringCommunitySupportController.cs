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
[Route("api/admin/caring-community")]
[Authorize(Policy = "AdminOnly")]
public sealed class AdminCaringCommunitySupportController : ControllerBase
{
    private readonly CaringHelpRequestSlaService _sla;
    private readonly CaringSupportRelationshipService _relationships;
    private readonly TenantContext _tenant;

    public AdminCaringCommunitySupportController(
        CaringHelpRequestSlaService sla,
        CaringSupportRelationshipService relationships,
        TenantContext tenant)
    {
        _sla = sla;
        _relationships = relationships;
        _tenant = tenant;
    }

    [HttpGet("sla-dashboard")]
    public async Task<IActionResult> SlaDashboard(CancellationToken ct)
    {
        var tenantId = _tenant.GetTenantIdOrThrow();
        if (!await _sla.IsFeatureEnabledAsync(tenantId, ct))
        {
            return StatusCode(StatusCodes.Status403Forbidden,
                LaravelError("FORBIDDEN", "Caring Community feature is not enabled for this tenant."));
        }

        return Ok(new { data = await _sla.DashboardAsync(tenantId, ct) });
    }

    [HttpGet("support-relationships")]
    public async Task<IActionResult> SupportRelationships([FromQuery] string? status, CancellationToken ct)
    {
        var tenantId = _tenant.GetTenantIdOrThrow();
        if (!await _relationships.IsFeatureEnabledAsync(tenantId, ct))
        {
            return StatusCode(StatusCodes.Status403Forbidden,
                LaravelError("FEATURE_DISABLED", "Service unavailable."));
        }

        return Ok(new { data = await _relationships.ListAsync(tenantId, status, ct) });
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
