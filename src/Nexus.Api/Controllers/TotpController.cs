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
/// TOTP two-factor authentication management.
/// Endpoints for setting up, verifying, and disabling TOTP 2FA.
/// </summary>
[ApiController]
[Route("api/auth/2fa")]
[Authorize]
public class TotpController : ControllerBase
{
    private readonly TotpService _totpService;
    private readonly ILogger<TotpController> _logger;

    public TotpController(TotpService totpService, ILogger<TotpController> logger)
    {
        _totpService = totpService;
        _logger = logger;
    }

    /// <summary>
    /// Get current 2FA status for the authenticated user.
    /// </summary>
    [HttpGet("status")]
    public async Task<IActionResult> GetStatus()
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid token" });

        var enabled = await _totpService.IsTwoFactorEnabledAsync(userId.Value);

        return Ok(new { two_factor_enabled = enabled });
    }

    /// <summary>
    /// Initiate TOTP setup. Returns secret and QR code URI.
    /// User must verify with a code before 2FA is activated.
    /// </summary>
    [HttpPost("setup")]
    public async Task<IActionResult> Setup()
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid token" });

        var (secret, qrUri, error) = await _totpService.GenerateSetupAsync(userId.Value);

        if (error != null)
            return BadRequest(new { error });

        return Ok(new
        {
            secret,
            qr_uri = qrUri,
            message = "Scan the QR code with your authenticator app, then verify with a code."
        });
    }

    /// <summary>
    /// Verify setup code and enable 2FA. Returns backup codes (shown only once).
    /// </summary>
    [HttpPost("verify-setup")]
    public async Task<IActionResult> VerifySetup([FromBody] TotpCodeRequest request)
    {
        var userId = User.GetUserId();
        var tenantId = User.GetTenantId();
        if (userId == null || tenantId == null) return Unauthorized(new { error = "Invalid token" });

        if (string.IsNullOrWhiteSpace(request.Code))
            return BadRequest(new { error = "Verification code is required" });

        var (success, backupCodes, error) = await _totpService.VerifyAndEnableAsync(userId.Value, tenantId.Value, request.Code.Trim());

        if (!success)
            return BadRequest(new { error });

        return Ok(new
        {
            success = true,
            message = "Two-factor authentication enabled. Save your backup codes securely.",
            backup_codes = backupCodes
        });
    }

    /// <summary>
    /// Verify a TOTP code during login (called after password verification).
    /// </summary>
    [HttpPost("verify")]
    public async Task<IActionResult> Verify([FromBody] TotpCodeRequest request)
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid token" });

        if (string.IsNullOrWhiteSpace(request.Code))
            return BadRequest(new { error = "Verification code is required" });

        var (valid, error) = await _totpService.ValidateLoginCodeAsync(userId.Value, request.Code.Trim());

        if (!valid)
            return BadRequest(new { error });

        return Ok(new { success = true, message = "Two-factor code verified" });
    }

    /// <summary>
    /// Disable 2FA. Requires a valid TOTP code.
    /// </summary>
    [HttpPost("disable")]
    public async Task<IActionResult> Disable([FromBody] TotpCodeRequest request)
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid token" });

        if (string.IsNullOrWhiteSpace(request.Code))
            return BadRequest(new { error = "Verification code is required" });

        var (success, error) = await _totpService.DisableAsync(userId.Value, request.Code.Trim());

        if (!success)
            return BadRequest(new { error });

        return Ok(new { success = true, message = "Two-factor authentication disabled" });
    }
    /// <summary>
    /// Verify a backup code during login (alternative to TOTP code).
    /// </summary>
    [HttpPost("verify-backup")]
    public async Task<IActionResult> VerifyBackup([FromBody] TotpCodeRequest request)
    {
        var userId = User.GetUserId();
        var tenantId = User.GetTenantId();
        if (userId == null || tenantId == null) return Unauthorized(new { error = "Invalid token" });

        if (string.IsNullOrWhiteSpace(request.Code))
            return BadRequest(new { error = "Backup code is required" });

        var (valid, error) = await _totpService.ValidateBackupCodeAsync(userId.Value, tenantId.Value, request.Code.Trim());

        if (!valid)
            return BadRequest(new { error });

        return Ok(new { success = true, message = "Backup code verified" });
    }

    /// <summary>
    /// Regenerate backup codes. Invalidates all existing codes.
    /// Requires a valid TOTP code for security.
    /// </summary>
    [HttpPost("backup-codes/regenerate")]
    public async Task<IActionResult> RegenerateBackupCodes([FromBody] TotpCodeRequest request)
    {
        var userId = User.GetUserId();
        var tenantId = User.GetTenantId();
        if (userId == null || tenantId == null) return Unauthorized(new { error = "Invalid token" });

        if (string.IsNullOrWhiteSpace(request.Code))
            return BadRequest(new { error = "TOTP code is required to regenerate backup codes" });

        // Verify TOTP code first
        var (valid, verifyError) = await _totpService.ValidateLoginCodeAsync(userId.Value, request.Code.Trim());
        if (!valid)
            return BadRequest(new { error = verifyError });

        var (codes, error) = await _totpService.GenerateBackupCodesAsync(userId.Value, tenantId.Value);

        if (codes == null)
            return BadRequest(new { error });

        return Ok(new
        {
            success = true,
            message = "Backup codes regenerated. Save these securely — they replace all previous codes.",
            backup_codes = codes
        });
    }

    /// <summary>
    /// Get count of remaining unused backup codes.
    /// </summary>
    [HttpGet("backup-codes/count")]
    public async Task<IActionResult> GetBackupCodeCount()
    {
        var userId = User.GetUserId();
        var tenantId = User.GetTenantId();
        if (userId == null || tenantId == null) return Unauthorized(new { error = "Invalid token" });

        var count = await _totpService.GetRemainingBackupCodeCountAsync(userId.Value, tenantId.Value);

        return Ok(new { remaining_codes = count });
    }
}

// === Request DTOs ===

public class TotpCodeRequest
{
    [JsonPropertyName("code")]
    public string Code { get; set; } = string.Empty;
}
