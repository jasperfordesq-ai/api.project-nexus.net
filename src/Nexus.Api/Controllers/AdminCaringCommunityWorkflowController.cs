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
public sealed class AdminCaringCommunityWorkflowController : ControllerBase
{
    private readonly CaringCommunityWorkflowService _workflow;
    private readonly TenantContext _tenant;

    public AdminCaringCommunityWorkflowController(
        CaringCommunityWorkflowService workflow,
        TenantContext tenant)
    {
        _workflow = workflow;
        _tenant = tenant;
    }

    [HttpGet("workflow")]
    public async Task<IActionResult> Workflow(CancellationToken ct)
    {
        var tenantId = _tenant.GetTenantIdOrThrow();
        if (!await _workflow.IsFeatureEnabledAsync(tenantId, ct))
        {
            return StatusCode(StatusCodes.Status403Forbidden,
                LaravelError("FEATURE_DISABLED", "Service unavailable."));
        }

        var data = await _workflow.SummaryAsync(tenantId, ct);
        return Ok(new { data });
    }

    [HttpPut("workflow/policy")]
    public async Task<IActionResult> UpdatePolicy([FromBody] Dictionary<string, object?>? request, CancellationToken ct)
    {
        var tenantId = _tenant.GetTenantIdOrThrow();
        if (!await _workflow.IsFeatureEnabledAsync(tenantId, ct))
        {
            return StatusCode(StatusCodes.Status403Forbidden,
                LaravelError("FEATURE_DISABLED", "Service unavailable."));
        }

        var data = await _workflow.UpdatePolicyAsync(tenantId, request, ct);
        return Ok(new { data });
    }

    [HttpPut("workflow/reviews/{id}/assign")]
    public async Task<IActionResult> AssignReview(int id, [FromBody] Dictionary<string, object?>? request, CancellationToken ct)
    {
        var tenantId = _tenant.GetTenantIdOrThrow();
        if (!await _workflow.IsFeatureEnabledAsync(tenantId, ct))
        {
            return StatusCode(StatusCodes.Status403Forbidden,
                LaravelError("FEATURE_DISABLED", "Service unavailable."));
        }

        var review = await _workflow.AssignReviewAsync(tenantId, id, request, ct);
        if (review is null)
        {
            return StatusCode(StatusCodes.Status404NotFound,
                LaravelError("NOT_FOUND", "Review could not be assigned."));
        }

        return Ok(new
        {
            data = new
            {
                review,
                message = "Review assignment updated."
            }
        });
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
