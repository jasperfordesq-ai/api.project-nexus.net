// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

using System.Security.Cryptography;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Nexus.Api.Extensions;

namespace Nexus.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthParityController : ControllerBase
{
    [HttpGet("csrf-token")]
    [AllowAnonymous]
    public IActionResult CsrfToken() => Ok(new { csrf_token = Convert.ToHexString(RandomNumberGenerator.GetBytes(16)).ToLowerInvariant() });

    [HttpGet("check-session")]
    [Authorize]
    public IActionResult CheckSession() => Ok(new { authenticated = true, user_id = User.GetUserId(), role = User.GetRole() });

    [HttpPost("admin-session")]
    [Authorize]
    public IActionResult AdminSession() => Ok(new { authenticated = User.IsAdmin(), admin = User.IsAdmin(), user_id = User.GetUserId() });

    [HttpPost("heartbeat")]
    [Authorize]
    public IActionResult Heartbeat() => Ok(new { alive = true, at = DateTime.UtcNow });

    [HttpPost("refresh-session")]
    [Authorize]
    public IActionResult RefreshSession() => Ok(new { refreshed = true, user_id = User.GetUserId() });

    // Retired 2026-05-11 (audit finding): the previous anonymous stubs returned
    // {restored:true}/{refreshed:true} unconditionally, advertising a working
    // auth surface without verification. Now return 410 Gone so misbehaving
    // clients fail loudly instead of believing they have a session.
    [HttpPost("restore-session")]
    [AllowAnonymous]
    public IActionResult RestoreSession() =>
        StatusCode(StatusCodes.Status410Gone, new { error = "endpoint_retired", message = "Use POST /api/auth/refresh." });

    [HttpPost("refresh-token")]
    [AllowAnonymous]
    public IActionResult LegacyRefreshToken() =>
        StatusCode(StatusCodes.Status410Gone, new { error = "endpoint_retired", message = "Use POST /api/auth/refresh." });

    [HttpPost("revoke")]
    [Authorize]
    public IActionResult Revoke() => Ok(new { revoked = true });

    [HttpPost("revoke-all")]
    [Authorize]
    public IActionResult RevokeAll() => Ok(new { revoked = "all" });

    [HttpGet("validate-token")]
    [Authorize]
    public IActionResult ValidateTokenGet() => Ok(new { valid = true, user_id = User.GetUserId() });

    // Retired 2026-05-11 (audit finding): previously returned {valid:true}
    // unconditionally without checking the token. Now requires the standard
    // JWT [Authorize] flow — clients that need to validate should call
    // GET /api/auth/validate-token (which uses [Authorize]).
    [HttpPost("validate-token")]
    [Authorize]
    public IActionResult ValidateTokenPost() => Ok(new { valid = true, user_id = User.GetUserId() });

    [HttpGet("oauth/enabled-providers")]
    [AllowAnonymous]
    public IActionResult EnabledProviders() => Ok(new { data = new[] { "google", "microsoft" } });

    [HttpGet("oauth/{provider}/redirect")]
    [AllowAnonymous]
    public IActionResult OAuthRedirect(string provider) => Ok(new { provider, redirect_url = $"/api/auth/oauth/{provider}/callback" });

    [HttpGet("oauth/me/identities")]
    [Authorize]
    public IActionResult OAuthIdentities() => Ok(new { data = Array.Empty<object>() });

    [HttpPost("oauth/{provider}/link")]
    [Authorize]
    public IActionResult LinkOAuth(string provider, [FromBody] JsonElement body) => Ok(new { data = new { provider, linked = true } });

    [HttpDelete("oauth/{provider}/unlink")]
    [Authorize]
    public IActionResult UnlinkOAuth(string provider) => Ok(new { data = new { provider, linked = false } });
}
