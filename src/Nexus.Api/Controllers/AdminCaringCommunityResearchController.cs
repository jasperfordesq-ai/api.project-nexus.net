// Copyright (c) 2024-2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Nexus.Api.Data;
using Nexus.Api.Services;
using System.Text.Json;

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

    [HttpPost("agreement-templates/{key}/render")]
    public async Task<IActionResult> RenderAgreementTemplate(string key, [FromBody] Dictionary<string, object?>? request, CancellationToken ct)
    {
        var guard = await GuardResearchAsync(ct);
        if (guard is not null)
        {
            return guard;
        }

        try
        {
            return Ok(new
            {
                data = _templates.Render(key, ExtractTemplateValues(request))
            });
        }
        catch (ArgumentException ex)
        {
            return StatusCode(StatusCodes.Status404NotFound,
                LaravelError("TEMPLATE_NOT_FOUND", ex.Message));
        }
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

    private static IReadOnlyDictionary<string, string> ExtractTemplateValues(Dictionary<string, object?>? request)
    {
        if (request is null || !request.TryGetValue("values", out var values) || values is null)
        {
            return new Dictionary<string, string>();
        }

        if (values is JsonElement json)
        {
            return ExtractTemplateValues(json);
        }

        if (values is not IDictionary<string, object?> dictionary)
        {
            return new Dictionary<string, string>();
        }

        return dictionary
            .Select(item => (item.Key, Value: CoerceScalar(item.Value)))
            .Where(item => item.Value is not null)
            .ToDictionary(item => item.Key, item => item.Value!);
    }

    private static IReadOnlyDictionary<string, string> ExtractTemplateValues(JsonElement values)
    {
        if (values.ValueKind != JsonValueKind.Object)
        {
            return new Dictionary<string, string>();
        }

        var result = new Dictionary<string, string>();
        foreach (var property in values.EnumerateObject())
        {
            var value = CoerceScalar(property.Value);
            if (value is not null)
            {
                result[property.Name] = value;
            }
        }

        return result;
    }

    private static string? CoerceScalar(object? value)
    {
        return value switch
        {
            null => null,
            JsonElement json => CoerceScalar(json),
            string text => text,
            bool flag => flag ? "true" : "false",
            byte or sbyte or short or ushort or int or uint or long or ulong or float or double or decimal => Convert.ToString(value, System.Globalization.CultureInfo.InvariantCulture),
            _ => null
        };
    }

    private static string? CoerceScalar(JsonElement value)
    {
        return value.ValueKind switch
        {
            JsonValueKind.String => value.GetString(),
            JsonValueKind.Number => value.GetRawText(),
            JsonValueKind.True => "true",
            JsonValueKind.False => "false",
            _ => null
        };
    }
}
