// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Nexus.Api.Entities;
using Nexus.Api.Extensions;
using Nexus.Api.Services.Provisioning;

namespace Nexus.Api.Controllers;

/// <summary>
/// Admin endpoints for the new-tenant provisioning queue.
/// </summary>
[ApiController]
[Route("api/admin/provisioning/requests")]
[Authorize(Policy = "AdminOnly")]
public class AdminProvisioningController : ControllerBase
{
    private readonly ProvisioningRequestService _service;

    public AdminProvisioningController(ProvisioningRequestService service)
    {
        _service = service;
    }

    [HttpGet]
    public async Task<IActionResult> List(
        [FromQuery] string? status,
        [FromQuery(Name = "page")] int page = 1,
        [FromQuery(Name = "page_size")] int pageSize = 50,
        CancellationToken ct = default)
    {
        var rows = await _service.ListAsync(status, page, pageSize, ct);
        return Ok(new { data = rows.Select(Project), page, page_size = pageSize });
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> Get(Guid id, CancellationToken ct)
    {
        var req = await _service.GetAsync(id, ct);
        return req == null ? NotFound() : Ok(Project(req));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateProvisioningRequestDto dto, CancellationToken ct)
    {
        try
        {
            var req = await _service.CreateAsync(dto, tenantIdOverride: null, ct);
            return CreatedAtAction(nameof(Get), new { id = req.Id }, Project(req));
        }
        catch (InvalidOperationException ex) { return BadRequest(new { error = ex.Message }); }
    }

    [HttpPost("{id:guid}/approve")]
    public async Task<IActionResult> Approve(Guid id, CancellationToken ct)
    {
        var userId = User.GetUserId() ?? 0;
        try { return Ok(Project(await _service.ApproveAsync(id, userId, ct))); }
        catch (KeyNotFoundException) { return NotFound(); }
        catch (InvalidOperationException ex) { return BadRequest(new { error = ex.Message }); }
    }

    [HttpPost("{id:guid}/reject")]
    public async Task<IActionResult> Reject(Guid id, [FromBody] ReasonBody body, CancellationToken ct)
    {
        var userId = User.GetUserId() ?? 0;
        try { return Ok(Project(await _service.RejectAsync(id, userId, body?.Reason ?? "", ct))); }
        catch (KeyNotFoundException) { return NotFound(); }
        catch (InvalidOperationException ex) { return BadRequest(new { error = ex.Message }); }
    }

    [HttpPost("{id:guid}/mark-provisioning")]
    public async Task<IActionResult> MarkProvisioning(Guid id, CancellationToken ct)
    {
        try { return Ok(Project(await _service.MarkProvisioningAsync(id, ct))); }
        catch (KeyNotFoundException) { return NotFound(); }
        catch (InvalidOperationException ex) { return BadRequest(new { error = ex.Message }); }
    }

    [HttpPost("{id:guid}/mark-ready")]
    public async Task<IActionResult> MarkReady(Guid id, [FromBody] MarkReadyBody body, CancellationToken ct)
    {
        if (body == null || body.CreatedTenantId <= 0)
            return BadRequest(new { error = "created_tenant_id required" });
        try { return Ok(Project(await _service.MarkReadyAsync(id, body.CreatedTenantId, ct))); }
        catch (KeyNotFoundException) { return NotFound(); }
        catch (InvalidOperationException ex) { return BadRequest(new { error = ex.Message }); }
    }

    [HttpPost("{id:guid}/mark-failed")]
    public async Task<IActionResult> MarkFailed(Guid id, [FromBody] ReasonBody body, CancellationToken ct)
    {
        try { return Ok(Project(await _service.MarkFailedAsync(id, body?.Reason ?? "", ct))); }
        catch (KeyNotFoundException) { return NotFound(); }
        catch (InvalidOperationException ex) { return BadRequest(new { error = ex.Message }); }
    }

    [HttpPost("{id:guid}/retry")]
    public async Task<IActionResult> Retry(Guid id, CancellationToken ct)
    {
        try { return Ok(Project(await _service.RetryAsync(id, ct))); }
        catch (KeyNotFoundException) { return NotFound(); }
        catch (InvalidOperationException ex) { return BadRequest(new { error = ex.Message }); }
    }

    internal static object Project(ProvisioningRequest r) => new
    {
        id = r.Id,
        tenant_id = r.TenantId,
        org_name = r.OrgName,
        requested_subdomain = r.RequestedSubdomain,
        contact_name = r.ContactName,
        contact_email = r.ContactEmail,
        contact_phone = r.ContactPhone,
        plan = r.Plan,
        country = r.Country,
        notes = r.Notes,
        status = r.Status.ToString().ToLowerInvariant(),
        requested_at = r.RequestedAt,
        approved_at = r.ApprovedAt,
        provisioned_at = r.ProvisionedAt,
        failed_at = r.FailedAt,
        approved_by = r.ApprovedBy,
        provisioned_by = r.ProvisionedBy,
        failure_reason = r.FailureReason,
        created_tenant_id = r.CreatedTenantId,
        created_at = r.CreatedAt,
        updated_at = r.UpdatedAt
    };

    public class ReasonBody
    {
        [JsonPropertyName("reason")] public string? Reason { get; set; }
    }

    public class MarkReadyBody
    {
        [JsonPropertyName("created_tenant_id")] public int CreatedTenantId { get; set; }
    }
}

/// <summary>
/// Public submission endpoint for new-tenant provisioning requests.
/// Anonymous (no JWT) so prospective tenants can self-serve via the marketing site.
/// Should be rate-limited at the gateway / nginx layer.
/// </summary>
[ApiController]
[Route("api/provisioning/requests")]
[AllowAnonymous]
public class PublicProvisioningController : ControllerBase
{
    private readonly ProvisioningRequestService _service;

    public PublicProvisioningController(ProvisioningRequestService service)
    {
        _service = service;
    }

    [HttpPost]
    public async Task<IActionResult> Submit([FromBody] CreateProvisioningRequestDto dto, CancellationToken ct)
    {
        try
        {
            // Public submissions default to the platform tenant (id=1).
            // The full provisioning workflow runs in admin context.
            var req = await _service.CreateAsync(dto, tenantIdOverride: 1, ct);
            return Accepted(new { id = req.Id, status = "pending" });
        }
        catch (InvalidOperationException ex) { return BadRequest(new { error = ex.Message }); }
    }
}
