// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

using System.Security.Claims;
using System.Security.Cryptography;
using Asp.Versioning;
using Fido2NetLib;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Nexus.Api.Data;
using Nexus.Api.Middleware;
using Nexus.Api.Services;

namespace Nexus.Api.Controllers;

/// <summary>
/// WebAuthn/Passkey endpoints for passwordless authentication.
/// Supports registration (adding passkeys to existing accounts) and
/// authentication (signing in with passkeys).
/// </summary>
[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/passkeys")]
[Route("api/passkeys")] // Backward compatibility
public class PasskeysController : ControllerBase
{
    private readonly PasskeyService _passkeyService;
    private readonly NexusDbContext _db;
    private readonly TokenService _tokenService;
    private readonly IMemoryCache _cache;
    private readonly ILogger<PasskeysController> _logger;

    // Challenge TTL: 5 minutes (standard WebAuthn recommendation)
    private static readonly TimeSpan ChallengeTtl = TimeSpan.FromMinutes(5);

    public PasskeysController(
        PasskeyService passkeyService,
        NexusDbContext db,
        TokenService tokenService,
        IMemoryCache cache,
        ILogger<PasskeysController> logger)
    {
        _passkeyService = passkeyService;
        _db = db;
        _tokenService = tokenService;
        _cache = cache;
        _logger = logger;
    }

    // =========================================================================
    // REGISTRATION (requires authentication - user adds passkey to their account)
    // =========================================================================

    /// <summary>
    /// Begin passkey registration. Returns WebAuthn creation options.
    /// The client passes these to navigator.credentials.create().
    /// </summary>
    [HttpPost("register/begin")]
    [Authorize]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> BeginRegistration()
    {
        var user = await GetCurrentUserAsync();
        if (user == null) return Unauthorized(new { error = "User not found" });

        try
        {
            var options = await _passkeyService.BeginRegistrationAsync(user);

            // Store options by user ID (registration requires auth so this is safe)
            var cacheKey = $"passkey:reg:{user.Id}:{user.TenantId}";
            _cache.Set(cacheKey, options, ChallengeTtl);

            return Ok(options);
        }
        catch (InvalidOperationException ex) when (ex.Message.Contains("Maximum"))
        {
            return Conflict(new { error = ex.Message });
        }
    }

    /// <summary>
    /// Complete passkey registration. Verifies the authenticator response and stores the credential.
    /// </summary>
    [HttpPost("register/finish")]
    [Authorize]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> FinishRegistration([FromBody] PasskeyRegistrationFinishRequest request)
    {
        var user = await GetCurrentUserAsync();
        if (user == null) return Unauthorized(new { error = "User not found" });

        // Retrieve stored options (keyed by user ID since registration requires auth)
        var cacheKey = $"passkey:reg:{user.Id}:{user.TenantId}";
        var options = _cache.Get<CredentialCreateOptions>(cacheKey);

        if (options == null)
        {
            return BadRequest(new { error = "Registration session expired or not started. Call begin first." });
        }

        // Remove from cache (single use)
        _cache.Remove(cacheKey);

        try
        {
            var passkey = await _passkeyService.FinishRegistrationAsync(
                options, request.AttestationResponse, user, request.DisplayName);

            return Ok(new
            {
                success = true,
                passkey = new
                {
                    id = passkey.Id,
                    display_name = passkey.DisplayName,
                    created_at = passkey.CreatedAt,
                    is_discoverable = passkey.IsDiscoverable,
                    transports = passkey.Transports
                }
            });
        }
        catch (Fido2VerificationException ex)
        {
            _logger.LogWarning("Passkey registration verification failed for user {UserId}: {Error}",
                user.Id, ex.Message);
            return BadRequest(new { error = "Passkey verification failed", details = ex.Message });
        }
    }

    // =========================================================================
    // AUTHENTICATION (public - used to sign in)
    // =========================================================================

    /// <summary>
    /// Begin passkey authentication. Returns WebAuthn assertion options.
    /// The client passes these to navigator.credentials.get().
    /// Can be called with or without tenant/email for different flows:
    /// - No params: conditional UI / autofill (empty allowCredentials, discoverable only)
    /// - With tenant_slug + email: user-specific (allowCredentials scoped to user)
    /// - With tenant_slug only: tenant-wide discoverable credentials
    /// </summary>
    [HttpPost("authenticate/begin")]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimitingExtensions.AuthPolicy)]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> BeginAuthentication([FromBody] PasskeyAuthBeginRequest? request)
    {
        int? tenantId = null;
        string? email = request?.Email;

        // Resolve tenant if provided
        if (!string.IsNullOrEmpty(request?.TenantSlug))
        {
            var tenant = await _db.Tenants.FirstOrDefaultAsync(t => t.Slug == request.TenantSlug);
            if (tenant != null) tenantId = tenant.Id;
        }
        else if (request?.TenantId.HasValue == true)
        {
            tenantId = request.TenantId;
        }

        var options = await _passkeyService.BeginAuthenticationAsync(tenantId, email);

        // Store options by a session ID for retrieval in finish
        var sessionId = Convert.ToBase64String(RandomNumberGenerator.GetBytes(32));
        var cacheKey = $"passkey:auth:{sessionId}";
        _cache.Set(cacheKey, options, ChallengeTtl);

        // Return options + session ID
        return Ok(new
        {
            options,
            session_id = sessionId
        });
    }

    /// <summary>
    /// Complete passkey authentication. Verifies the assertion and returns JWT tokens.
    /// </summary>
    [HttpPost("authenticate/finish")]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimitingExtensions.AuthPolicy)]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> FinishAuthentication([FromBody] PasskeyAuthFinishRequest request)
    {
        if (string.IsNullOrEmpty(request.SessionId))
        {
            return BadRequest(new { error = "session_id is required" });
        }

        // Retrieve stored assertion options
        var cacheKey = $"passkey:auth:{request.SessionId}";
        var options = _cache.Get<AssertionOptions>(cacheKey);

        if (options == null)
        {
            return BadRequest(new { error = "Authentication session expired or not started" });
        }

        // Remove from cache (single use)
        _cache.Remove(cacheKey);

        try
        {
            var user = await _passkeyService.FinishAuthenticationAsync(options, request.AssertionResponse);

            // Resolve tenant for response
            var tenant = await _db.Tenants.FindAsync(user.TenantId);

            // Generate JWT (same as password login)
            var accessToken = _tokenService.GenerateJwt(user);
            var (refreshToken, refreshTokenHash) = TokenService.GenerateRefreshToken();

            // Store refresh token
            var refreshTokenEntity = new Entities.RefreshToken
            {
                TenantId = user.TenantId,
                UserId = user.Id,
                TokenHash = refreshTokenHash,
                ExpiresAt = DateTime.UtcNow.AddDays(7),
                ClientType = "passkey",
                CreatedByIp = HttpContext.Connection.RemoteIpAddress?.ToString()
            };
            _db.RefreshTokens.Add(refreshTokenEntity);
            await _db.SaveChangesAsync();

            return Ok(new
            {
                success = true,
                access_token = accessToken,
                refresh_token = refreshToken,
                token_type = "Bearer",
                expires_in = _tokenService.AccessTokenExpirySeconds,
                user = new
                {
                    id = user.Id,
                    email = user.Email,
                    first_name = user.FirstName,
                    last_name = user.LastName,
                    role = user.Role,
                    tenant_id = user.TenantId,
                    tenant_slug = tenant?.Slug
                }
            });
        }
        catch (Fido2VerificationException ex)
        {
            _logger.LogWarning("Passkey authentication verification failed: {Error}", ex.Message);
            return Unauthorized(new { error = "Passkey verification failed" });
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning("Passkey authentication failed: {Error}", ex.Message);
            return Unauthorized(new { error = ex.Message });
        }
    }

    // =========================================================================
    // MANAGEMENT (requires authentication)
    // =========================================================================

    /// <summary>
    /// List all passkeys for the current user.
    /// </summary>
    [HttpGet]
    [Authorize]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> ListPasskeys()
    {
        var (userId, tenantId) = GetUserContext();
        if (userId == 0) return Unauthorized(new { error = "Invalid token" });

        var passkeys = await _passkeyService.GetUserPasskeysAsync(userId, tenantId);

        return Ok(new
        {
            passkeys = passkeys.Select(p => new
            {
                id = p.Id,
                display_name = p.DisplayName,
                created_at = p.CreatedAt,
                last_used_at = p.LastUsedAt,
                is_discoverable = p.IsDiscoverable,
                transports = p.Transports
            })
        });
    }

    /// <summary>
    /// Delete a passkey.
    /// </summary>
    [HttpDelete("{id}")]
    [Authorize]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeletePasskey(int id)
    {
        var (userId, tenantId) = GetUserContext();
        if (userId == 0) return Unauthorized(new { error = "Invalid token" });

        var deleted = await _passkeyService.DeletePasskeyAsync(id, userId, tenantId);
        if (!deleted) return NotFound(new { error = "Passkey not found" });

        return Ok(new { success = true, message = "Passkey deleted" });
    }

    /// <summary>
    /// Rename a passkey.
    /// </summary>
    [HttpPut("{id}")]
    [Authorize]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> RenamePasskey(int id, [FromBody] RenamePasskeyRequest request)
    {
        var (userId, tenantId) = GetUserContext();
        if (userId == 0) return Unauthorized(new { error = "Invalid token" });

        if (string.IsNullOrWhiteSpace(request.DisplayName))
        {
            return BadRequest(new { error = "display_name is required" });
        }

        var renamed = await _passkeyService.RenamePasskeyAsync(id, userId, tenantId, request.DisplayName.Trim());
        if (!renamed) return NotFound(new { error = "Passkey not found" });

        return Ok(new { success = true });
    }

    // =========================================================================
    // Private helpers
    // =========================================================================

    private async Task<Entities.User?> GetCurrentUserAsync()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? User.FindFirst("sub")?.Value;
        var tenantIdClaim = User.FindFirst("tenant_id")?.Value;

        if (!int.TryParse(userIdClaim, out var userId) || !int.TryParse(tenantIdClaim, out var tenantId))
            return null;

        return await _db.Users
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(u => u.Id == userId && u.TenantId == tenantId && u.IsActive);
    }

    private (int userId, int tenantId) GetUserContext()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? User.FindFirst("sub")?.Value;
        var tenantIdClaim = User.FindFirst("tenant_id")?.Value;

        if (int.TryParse(userIdClaim, out var userId) && int.TryParse(tenantIdClaim, out var tenantId))
            return (userId, tenantId);

        return (0, 0);
    }

}

// =========================================================================
// Request models
// =========================================================================

public record PasskeyRegistrationFinishRequest
{
    [System.Text.Json.Serialization.JsonPropertyName("attestation_response")]
    public AuthenticatorAttestationRawResponse AttestationResponse { get; init; } = null!;

    [System.Text.Json.Serialization.JsonPropertyName("display_name")]
    public string? DisplayName { get; init; }
}

public record PasskeyAuthBeginRequest
{
    [System.Text.Json.Serialization.JsonPropertyName("tenant_slug")]
    public string? TenantSlug { get; init; }

    [System.Text.Json.Serialization.JsonPropertyName("tenant_id")]
    public int? TenantId { get; init; }

    [System.Text.Json.Serialization.JsonPropertyName("email")]
    public string? Email { get; init; }
}

public record PasskeyAuthFinishRequest
{
    [System.Text.Json.Serialization.JsonPropertyName("session_id")]
    public string SessionId { get; init; } = string.Empty;

    [System.Text.Json.Serialization.JsonPropertyName("assertion_response")]
    public AuthenticatorAssertionRawResponse AssertionResponse { get; init; } = null!;
}

public record RenamePasskeyRequest
{
    [System.Text.Json.Serialization.JsonPropertyName("display_name")]
    public string DisplayName { get; init; } = string.Empty;
}
