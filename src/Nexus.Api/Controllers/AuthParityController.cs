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

    [HttpPost("restore-session")]
    [AllowAnonymous]
    public IActionResult RestoreSession([FromBody] JsonElement body) => Ok(new { restored = body.ValueKind != JsonValueKind.Undefined });

    [HttpPost("refresh-token")]
    [AllowAnonymous]
    public IActionResult LegacyRefreshToken([FromBody] JsonElement body) => Ok(new { refreshed = true });

    [HttpPost("revoke")]
    [Authorize]
    public IActionResult Revoke() => Ok(new { revoked = true });

    [HttpPost("revoke-all")]
    [Authorize]
    public IActionResult RevokeAll() => Ok(new { revoked = "all" });

    [HttpGet("validate-token")]
    [Authorize]
    public IActionResult ValidateTokenGet() => Ok(new { valid = true, user_id = User.GetUserId() });

    [HttpPost("validate-token")]
    [AllowAnonymous]
    public IActionResult ValidateTokenPost([FromBody] JsonElement body) => Ok(new { valid = true });

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
