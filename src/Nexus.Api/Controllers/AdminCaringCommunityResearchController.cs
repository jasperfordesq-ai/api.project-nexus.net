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
[Route("api/admin/caring-community/research")]
[Authorize(Policy = "AdminOnly")]
public sealed class AdminCaringCommunityResearchController : ControllerBase
{
    private readonly CaringResearchPartnershipService _research;
    private readonly ResearchAgreementTemplateService _templates;
    private readonly TenantContext _tenant;

    public AdminCaringCommunityResearchController(
        CaringResearchPartnershipService research,
        ResearchAgreementTemplateService templates,
        TenantContext tenant)
    {
        _research = research;
        _templates = templates;
        _tenant = tenant;
    }

    [HttpGet("agreement-templates")]
    public async Task<IActionResult> AgreementTemplates(CancellationToken ct)
    {
        var guard = await GuardResearchAsync(ct);
        if (guard is not null)
        {
            return guard;
        }

        return Ok(new
        {
            data = new
            {
                templates = _templates.ListTemplates()
            }
        });
    }

    [HttpGet("partners")]
    public async Task<IActionResult> Partners(CancellationToken ct)
    {
        var guard = await GuardResearchAsync(ct);
        if (guard is not null)
        {
            return guard;
        }

        var partners = await _research.ListPartnersAsync(_tenant.GetTenantIdOrThrow(), ct);
        return Ok(new { data = new { partners } });
    }

    [HttpGet("dataset-exports")]
    public async Task<IActionResult> DatasetExports([FromQuery(Name = "partner_id")] int? partnerId, CancellationToken ct)
    {
        var guard = await GuardResearchAsync(ct);
        if (guard is not null)
        {
            return guard;
        }

        var exports = await _research.ListDatasetExportsAsync(_tenant.GetTenantIdOrThrow(), partnerId, ct);
        return Ok(new { data = new { exports } });
    }

    private async Task<IActionResult?> GuardResearchAsync(CancellationToken ct)
    {
        if (!await _research.IsCaringCommunityEnabledAsync(_tenant.GetTenantIdOrThrow(), ct))
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
