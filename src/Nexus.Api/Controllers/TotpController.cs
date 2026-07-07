// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

using System.Text;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Nexus.Api.Extensions;
using Nexus.Api.Middleware;
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
    private readonly Data.NexusDbContext _db;
    private readonly TokenService _tokenService;

    public TotpController(TotpService totpService, ILogger<TotpController> logger, Data.NexusDbContext db, TokenService tokenService)
    {
        _totpService = totpService;
        _logger = logger;
        _db = db;
        _tokenService = tokenService;
    }

    /// <summary>True if the calling JWT carries scope=2fa_setup (the limited
    /// token AuthController.Login issues for admins without 2FA).</summary>
    private bool IsSetupScopedRequest() =>
        string.Equals(User.FindFirst("scope")?.Value, "2fa_setup", StringComparison.Ordinal);

    /// <summary>
    /// Get current 2FA status for the authenticated user.
    /// </summary>
    [HttpGet("status")]
    public async Task<IActionResult> GetStatus()
    {
        var userId = User.GetUserId();
        var tenantId = User.GetTenantId();
        if (userId == null || tenantId == null) return Unauthorized(new { error = "Invalid token" });

        var enabled = await _totpService.IsTwoFactorEnabledAsync(userId.Value);
        var backupCodesRemaining = enabled
            ? await _totpService.GetRemainingBackupCodeCountAsync(userId.Value, tenantId.Value)
            : 0;

        return Ok(new
        {
            success = true,
            data = new
            {
                enabled,
                setup_required = false,
                backup_codes_remaining = backupCodesRemaining
            },
            two_factor_enabled = enabled
        });
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
            success = true,
            data = new
            {
                qr_code_url = BuildQrCodeDataUri(qrUri),
                secret,
                backup_codes = Array.Empty<string>()
            },
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

        // If the caller came in via a setup-scoped JWT (admin first-time
        // setup flow), promote them to a full access token now. After this
        // response, the client uses the new access_token everywhere.
        if (IsSetupScopedRequest())
        {
            var fullUser = await _db.Users
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(u => u.Id == userId.Value);
            if (fullUser != null)
            {
                var accessToken = _tokenService.GenerateJwt(fullUser);
                var (refreshToken, refreshTokenHash) = TokenService.GenerateRefreshToken();
                _db.RefreshTokens.Add(new Entities.RefreshToken
                {
                    UserId = fullUser.Id,
                    TenantId = fullUser.TenantId,
                    TokenHash = refreshTokenHash,
                    ExpiresAt = DateTime.UtcNow.AddDays(7),
                });
                fullUser.LastLoginAt = DateTime.UtcNow;
                await _db.SaveChangesAsync();
                _logger.LogInformation("Admin {UserId} completed first-time 2FA setup — full tokens issued.", fullUser.Id);

                return Ok(new
                {
                    success = true,
                    login_complete = true,
                    message = "Two-factor authentication enabled. You are now signed in.",
                    backup_codes = backupCodes,
                    access_token = accessToken,
                    refresh_token = refreshToken,
                    token_type = "Bearer",
                    expires_in = _tokenService.AccessTokenExpirySeconds,
                });
            }
        }

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
    [EnableRateLimiting(RateLimitingExtensions.AuthPolicy)]
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
    [EnableRateLimiting(RateLimitingExtensions.AuthPolicy)]
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

    private static string BuildQrCodeDataUri(string qrUri)
    {
        var escaped = System.Security.SecurityElement.Escape(qrUri) ?? string.Empty;
        var svg = $"""<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320"><rect width="100%" height="100%" fill="#fff"/><text x="20" y="160" font-family="monospace" font-size="10" fill="#111">{escaped}</text></svg>""";
        return "data:image/svg+xml;base64," + Convert.ToBase64String(Encoding.UTF8.GetBytes(svg));
    }
}

// === Request DTOs ===

public class TotpCodeRequest
{
    [JsonPropertyName("code")]
    public string Code { get; set; } = string.Empty;
}
