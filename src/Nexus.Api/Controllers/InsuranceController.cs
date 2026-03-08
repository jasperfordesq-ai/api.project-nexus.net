// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Nexus.Api.Extensions;
using Nexus.Api.Services;

namespace Nexus.Api.Controllers;

/// <summary>
/// Insurance certificate tracking endpoints.
/// </summary>
[ApiController]
[Route("api/insurance")]
[Authorize]
public class InsuranceController : ControllerBase
{
    private readonly InsuranceService _insurance;

    public InsuranceController(InsuranceService insurance)
    {
        _insurance = insurance;
    }

    /// <summary>
    /// GET /api/insurance - Get my certificates.
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetMyCertificates()
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid token" });

        var certs = await _insurance.GetUserCertificatesAsync(userId.Value);
        return Ok(new { data = certs.Select(c => MapCert(c)) });
    }

    /// <summary>
    /// GET /api/insurance/{id} - Get certificate details.
    /// </summary>
    [HttpGet("{id}")]
    public async Task<IActionResult> GetCertificate(int id)
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid token" });

        var cert = await _insurance.GetByIdAsync(id);
        if (cert == null) return NotFound(new { error = "Certificate not found" });
        return Ok(new { data = MapCert(cert) });
    }

    /// <summary>
    /// POST /api/insurance - Upload a certificate.
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateInsuranceRequest request)
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid token" });

        var (cert, error) = await _insurance.CreateAsync(
            userId.Value, request.Type, request.Provider, request.PolicyNumber,
            request.CoverAmount, request.StartDate, request.ExpiryDate, request.DocumentUrl);

        if (error != null) return BadRequest(new { error });
        return Created($"/api/insurance/{cert!.Id}", new { data = new { cert.Id, cert.Type, cert.Status } });
    }

    /// <summary>
    /// PUT /api/insurance/{id} - Update a certificate.
    /// </summary>
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateInsuranceRequest request)
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid token" });

        var (cert, error) = await _insurance.UpdateAsync(
            id, userId.Value, request.Type, request.Provider, request.PolicyNumber,
            request.CoverAmount, request.StartDate, request.ExpiryDate, request.DocumentUrl);

        if (error != null) return BadRequest(new { error });
        return Ok(new { data = new { cert!.Id, cert.Type, cert.Status } });
    }

    /// <summary>
    /// DELETE /api/insurance/{id} - Delete a certificate.
    /// </summary>
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid token" });

        var error = await _insurance.DeleteAsync(id, userId.Value);
        if (error != null) return BadRequest(new { error });
        return Ok(new { message = "Certificate deleted" });
    }

    // Admin endpoints
    /// <summary>
    /// GET /api/insurance/admin/pending - Pending certificates.
    /// </summary>
    [HttpGet("admin/pending")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> AdminPending()
    {
        var certs = await _insurance.AdminListPendingAsync();
        return Ok(new { data = certs.Select(c => MapCert(c)) });
    }

    /// <summary>
    /// GET /api/insurance/admin/expiring - Expiring soon.
    /// </summary>
    [HttpGet("admin/expiring")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> AdminExpiring([FromQuery] int days = 30)
    {
        var certs = await _insurance.AdminListExpiringAsync(days);
        return Ok(new { data = certs.Select(c => MapCert(c)) });
    }

    /// <summary>
    /// PUT /api/insurance/admin/{id}/verify - Verify a certificate.
    /// </summary>
    [HttpPut("admin/{id}/verify")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> AdminVerify(int id)
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid token" });

        var (cert, error) = await _insurance.AdminVerifyAsync(id, userId.Value);
        if (error != null) return NotFound(new { error });
        return Ok(new { data = new { cert!.Id, cert.Status, verified_at = cert.VerifiedAt } });
    }

    /// <summary>
    /// PUT /api/insurance/admin/{id}/reject - Reject a certificate.
    /// </summary>
    [HttpPut("admin/{id}/reject")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> AdminReject(int id)
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid token" });

        var (cert, error) = await _insurance.AdminRejectAsync(id, userId.Value);
        if (error != null) return NotFound(new { error });
        return Ok(new { data = new { cert!.Id, cert.Status } });
    }

    private static object MapCert(Entities.InsuranceCertificate c) => new
    {
        c.Id, c.Type, c.Provider, policy_number = c.PolicyNumber,
        cover_amount = c.CoverAmount, start_date = c.StartDate, expiry_date = c.ExpiryDate,
        document_url = c.DocumentUrl, c.Status, verified_at = c.VerifiedAt,
        created_at = c.CreatedAt, updated_at = c.UpdatedAt,
        user = c.User != null ? new { c.User.Id, c.User.FirstName, c.User.LastName } : null,
        verified_by = c.VerifiedBy != null ? new { c.VerifiedBy.Id, c.VerifiedBy.FirstName, c.VerifiedBy.LastName } : null
    };
}

public class CreateInsuranceRequest
{
    [JsonPropertyName("type")] public string Type { get; set; } = "other";
    [JsonPropertyName("provider")] public string? Provider { get; set; }
    [JsonPropertyName("policy_number")] public string? PolicyNumber { get; set; }
    [JsonPropertyName("cover_amount")] public decimal? CoverAmount { get; set; }
    [JsonPropertyName("start_date")] public DateTime StartDate { get; set; }
    [JsonPropertyName("expiry_date")] public DateTime ExpiryDate { get; set; }
    [JsonPropertyName("document_url")] public string? DocumentUrl { get; set; }
}

public class UpdateInsuranceRequest
{
    [JsonPropertyName("type")] public string? Type { get; set; }
    [JsonPropertyName("provider")] public string? Provider { get; set; }
    [JsonPropertyName("policy_number")] public string? PolicyNumber { get; set; }
    [JsonPropertyName("cover_amount")] public decimal? CoverAmount { get; set; }
    [JsonPropertyName("start_date")] public DateTime? StartDate { get; set; }
    [JsonPropertyName("expiry_date")] public DateTime? ExpiryDate { get; set; }
    [JsonPropertyName("document_url")] public string? DocumentUrl { get; set; }
}
