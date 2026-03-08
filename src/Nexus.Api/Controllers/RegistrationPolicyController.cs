// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

using System.Security.Claims;
using System.Text.Json.Serialization;
using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Nexus.Api.Data;
using Nexus.Api.Entities;
using Nexus.Api.Middleware;
using Nexus.Api.Services.Registration;

namespace Nexus.Api.Controllers;

/// <summary>
/// Registration policy management — both public (for registration UI) and admin (for configuration).
/// </summary>
[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/registration")]
[Route("api/registration")]
public class RegistrationPolicyController : ControllerBase
{
    private readonly NexusDbContext _db;
    private readonly RegistrationOrchestrator _orchestrator;
    private readonly ProviderConfigEncryption _encryption;
    private readonly TenantContext _tenantContext;
    private readonly ILogger<RegistrationPolicyController> _logger;

    public RegistrationPolicyController(
        NexusDbContext db,
        RegistrationOrchestrator orchestrator,
        ProviderConfigEncryption encryption,
        TenantContext tenantContext,
        ILogger<RegistrationPolicyController> logger)
    {
        _db = db;
        _orchestrator = orchestrator;
        _encryption = encryption;
        _tenantContext = tenantContext;
        _logger = logger;
    }

    // ─── PUBLIC ENDPOINTS (for registration UI) ───

    /// <summary>
    /// Get the public registration configuration for a tenant.
    /// Used by frontends to render the correct registration flow.
    /// Does NOT expose provider secrets or internal config.
    /// </summary>
    [HttpGet("config")]
    [AllowAnonymous]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetPublicConfig([FromQuery] string? tenant_slug, [FromQuery] int? tenant_id)
    {
        int tenantId;

        if (_tenantContext.IsResolved && _tenantContext.TenantId.HasValue)
        {
            tenantId = _tenantContext.TenantId.Value;
        }
        else if (!string.IsNullOrEmpty(tenant_slug))
        {
            var tenant = await _db.Tenants.FirstOrDefaultAsync(t => t.Slug == tenant_slug);
            if (tenant == null) return NotFound(new { error = "Tenant not found" });
            tenantId = tenant.Id;
        }
        else if (tenant_id.HasValue)
        {
            tenantId = tenant_id.Value;
        }
        else
        {
            return BadRequest(new { error = "Tenant identifier required (tenant_slug or tenant_id)" });
        }

        var policy = await _orchestrator.GetPolicyAsync(tenantId);

        return Ok(new
        {
            success = true,
            data = new
            {
                mode = policy.Mode.ToString(),
                mode_value = (int)policy.Mode,
                requires_verification = policy.Mode is RegistrationMode.VerifiedIdentity or RegistrationMode.GovernmentId,
                requires_approval = policy.Mode == RegistrationMode.StandardWithApproval
                    || policy.PostVerificationAction == PostVerificationAction.SendToAdminForApproval,
                requires_invite = policy.Mode == RegistrationMode.InviteOnly,
                verification_level = policy.VerificationLevel.ToString(),
                provider_name = policy.Provider == VerificationProvider.Custom
                    ? policy.CustomProviderName
                    : policy.Provider != VerificationProvider.None
                        ? policy.Provider.ToString()
                        : null,
                registration_message = policy.RegistrationMessage
            }
        });
    }

    /// <summary>
    /// Start identity verification for a registered user who is in PendingVerification status.
    /// </summary>
    [HttpPost("verify/start")]
    [Authorize]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> StartVerification()
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid token" });

        var tenantId = _tenantContext.GetTenantIdOrThrow();

        var result = await _orchestrator.StartVerificationAsync(userId.Value, tenantId);

        if (!result.IsSuccess)
            return BadRequest(new { error = result.Error });

        return Ok(new
        {
            success = true,
            data = new
            {
                session_id = result.Session!.Id,
                status = result.Session.Status.ToString(),
                redirect_url = result.ProviderResult!.RedirectUrl,
                sdk_token = result.ProviderResult.SdkToken,
                expires_at = result.Session.ExpiresAt
            }
        });
    }

    /// <summary>
    /// Get the current verification session status for the authenticated user.
    /// </summary>
    [HttpGet("verify/status")]
    [Authorize]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetVerificationStatus()
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid token" });

        var tenantId = _tenantContext.GetTenantIdOrThrow();

        var session = await _orchestrator.GetVerificationSessionAsync(userId.Value, tenantId);

        if (session == null)
            return NotFound(new { error = "No verification session found" });

        return Ok(new
        {
            success = true,
            data = new
            {
                session_id = session.Id,
                status = session.Status.ToString(),
                provider = session.Provider.ToString(),
                level = session.Level.ToString(),
                decision = session.ProviderDecision,
                decision_reason = session.DecisionReason,
                created_at = session.CreatedAt,
                completed_at = session.CompletedAt,
                expires_at = session.ExpiresAt
            }
        });
    }

    /// <summary>
    /// Retry identity verification for a user whose previous attempt failed or expired.
    /// Transitions the user from VerificationFailed back to PendingVerification and creates a new session.
    /// </summary>
    [HttpPost("verify/retry")]
    [Authorize]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> RetryVerification()
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid token" });

        var tenantId = _tenantContext.GetTenantIdOrThrow();

        var result = await _orchestrator.RetryVerificationAsync(userId.Value, tenantId);

        if (!result.IsSuccess)
            return BadRequest(new { error = result.Error });

        return Ok(new
        {
            success = true,
            data = new
            {
                session_id = result.Session!.Id,
                status = result.Session.Status.ToString(),
                redirect_url = result.ProviderResult!.RedirectUrl,
                sdk_token = result.ProviderResult.SdkToken,
                expires_at = result.Session.ExpiresAt
            }
        });
    }

    /// <summary>
    /// Webhook callback endpoint for verification providers.
    /// </summary>
    [HttpPost("webhook/{tenantId:int}")]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimitingExtensions.AuthPolicy)]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Webhook(int tenantId, [FromQuery] string? provider)
    {
        if (!Enum.TryParse<VerificationProvider>(provider, true, out var providerType))
        {
            return BadRequest(new { error = "Invalid provider" });
        }

        // Read raw body for signature verification
        using var reader = new StreamReader(Request.Body);
        var rawBody = await reader.ReadToEndAsync();

        var headers = Request.Headers.ToDictionary(
            h => h.Key,
            h => h.Value.ToString());

        var payload = new WebhookPayload
        {
            RawBody = rawBody,
            Headers = headers
        };

        var success = await _orchestrator.ProcessWebhookAsync(tenantId, providerType, payload);

        if (!success)
            return BadRequest(new { error = "Webhook processing failed" });

        return Ok(new { success = true });
    }

    // ─── ADMIN ENDPOINTS ───

    /// <summary>
    /// Get the full registration policy for the current tenant (admin only).
    /// </summary>
    [HttpGet("admin/policy")]
    [Authorize(Policy = "AdminOnly")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> GetPolicy()
    {
        var tenantId = _tenantContext.GetTenantIdOrThrow();
        var policy = await _orchestrator.GetPolicyAsync(tenantId);

        return Ok(new
        {
            success = true,
            data = new
            {
                id = policy.Id,
                mode = policy.Mode.ToString(),
                mode_value = (int)policy.Mode,
                provider = policy.Provider.ToString(),
                provider_value = (int)policy.Provider,
                verification_level = policy.VerificationLevel.ToString(),
                verification_level_value = (int)policy.VerificationLevel,
                post_verification_action = policy.PostVerificationAction.ToString(),
                post_verification_action_value = (int)policy.PostVerificationAction,
                has_provider_config = !string.IsNullOrEmpty(policy.ProviderConfigEncrypted),
                custom_webhook_url = policy.CustomWebhookUrl,
                custom_provider_name = policy.CustomProviderName,
                registration_message = policy.RegistrationMessage,
                invite_code = policy.InviteCode,
                max_invite_uses = policy.MaxInviteUses,
                invite_uses_count = policy.InviteUsesCount,
                is_active = policy.IsActive,
                updated_at = policy.UpdatedAt,
                updated_by_user_id = policy.UpdatedByUserId
            }
        });
    }

    /// <summary>
    /// Update the registration policy for the current tenant (admin only).
    /// </summary>
    [HttpPut("admin/policy")]
    [Authorize(Policy = "AdminOnly")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> UpdatePolicy([FromBody] UpdateRegistrationPolicyRequest request)
    {
        var tenantId = _tenantContext.GetTenantIdOrThrow();
        var adminUserId = GetUserId();

        var existing = await _db.TenantRegistrationPolicies
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(p => p.TenantId == tenantId && p.IsActive);

        if (existing == null)
        {
            existing = new TenantRegistrationPolicy
            {
                TenantId = tenantId,
                CreatedAt = DateTime.UtcNow
            };
            _db.TenantRegistrationPolicies.Add(existing);
        }

        // Update fields
        if (request.Mode.HasValue)
            existing.Mode = request.Mode.Value;
        if (request.Provider.HasValue)
            existing.Provider = request.Provider.Value;
        if (request.VerificationLevel.HasValue)
            existing.VerificationLevel = request.VerificationLevel.Value;
        if (request.PostVerificationAction.HasValue)
            existing.PostVerificationAction = request.PostVerificationAction.Value;
        if (request.ProviderConfig != null)
            existing.ProviderConfigEncrypted = _encryption.Encrypt(request.ProviderConfig);
        if (request.CustomWebhookUrl != null)
            existing.CustomWebhookUrl = request.CustomWebhookUrl;
        if (request.CustomProviderName != null)
            existing.CustomProviderName = request.CustomProviderName;
        if (request.RegistrationMessage != null)
            existing.RegistrationMessage = request.RegistrationMessage;
        if (request.InviteCode != null)
            existing.InviteCode = request.InviteCode;
        if (request.MaxInviteUses.HasValue)
            existing.MaxInviteUses = request.MaxInviteUses;

        existing.UpdatedAt = DateTime.UtcNow;
        existing.UpdatedByUserId = adminUserId;
        existing.IsActive = true;

        await _db.SaveChangesAsync();

        _logger.LogInformation("Admin {AdminId} updated registration policy for tenant {TenantId}",
            adminUserId, tenantId);

        return Ok(new { success = true, message = "Registration policy updated" });
    }

    /// <summary>
    /// Get users pending admin approval.
    /// </summary>
    [HttpGet("admin/pending")]
    [Authorize(Policy = "AdminOnly")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> GetPendingRegistrations([FromQuery] int page = 1, [FromQuery] int limit = 20)
    {
        var tenantId = _tenantContext.GetTenantIdOrThrow();

        var query = _db.Users
            .IgnoreQueryFilters()
            .Where(u => u.TenantId == tenantId
                     && u.RegistrationStatus == RegistrationStatus.PendingAdminReview)
            .OrderBy(u => u.CreatedAt);

        var total = await query.CountAsync();
        var users = await query
            .Skip((page - 1) * limit)
            .Take(limit)
            .Select(u => new
            {
                id = u.Id,
                email = u.Email,
                first_name = u.FirstName,
                last_name = u.LastName,
                registration_status = u.RegistrationStatus.ToString(),
                created_at = u.CreatedAt
            })
            .ToListAsync();

        return Ok(new
        {
            success = true,
            data = users,
            pagination = new { page, limit, total, pages = (int)Math.Ceiling(total / (double)limit) }
        });
    }

    /// <summary>
    /// Approve a pending user registration (admin only).
    /// </summary>
    [HttpPut("admin/users/{userId:int}/approve")]
    [Authorize(Policy = "AdminOnly")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> ApproveRegistration(int userId)
    {
        var tenantId = _tenantContext.GetTenantIdOrThrow();
        var adminUserId = GetUserId();
        if (adminUserId == null) return Unauthorized();

        var success = await _orchestrator.AdminApproveAsync(userId, tenantId, adminUserId.Value);
        if (!success)
            return BadRequest(new { error = "Cannot approve user. Check registration status." });

        return Ok(new { success = true, message = "User registration approved" });
    }

    /// <summary>
    /// Reject a pending user registration (admin only).
    /// </summary>
    [HttpPut("admin/users/{userId:int}/reject")]
    [Authorize(Policy = "AdminOnly")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> RejectRegistration(int userId, [FromBody] RejectRegistrationRequest? request)
    {
        var tenantId = _tenantContext.GetTenantIdOrThrow();
        var adminUserId = GetUserId();
        if (adminUserId == null) return Unauthorized();

        var success = await _orchestrator.AdminRejectAsync(userId, tenantId, adminUserId.Value, request?.Reason);
        if (!success)
            return BadRequest(new { error = "Cannot reject user. Check registration status." });

        return Ok(new { success = true, message = "User registration rejected" });
    }

    /// <summary>
    /// Get available registration modes and providers (admin reference).
    /// </summary>
    [HttpGet("admin/options")]
    [Authorize(Policy = "AdminOnly")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public IActionResult GetOptions()
    {
        return Ok(new
        {
            success = true,
            data = new
            {
                modes = Enum.GetValues<RegistrationMode>().Select(m => new { value = (int)m, name = m.ToString() }),
                providers = Enum.GetValues<VerificationProvider>().Select(p => new { value = (int)p, name = p.ToString() }),
                verification_levels = Enum.GetValues<VerificationLevel>().Select(l => new { value = (int)l, name = l.ToString() }),
                post_verification_actions = Enum.GetValues<PostVerificationAction>().Select(a => new { value = (int)a, name = a.ToString() })
            }
        });
    }

    #region Helpers

    private int? GetUserId()
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? User.FindFirst("sub")?.Value;
        return int.TryParse(claim, out var id) ? id : null;
    }

    #endregion
}

#region Request Models

public record UpdateRegistrationPolicyRequest
{
    [JsonPropertyName("mode")]
    public RegistrationMode? Mode { get; init; }

    [JsonPropertyName("provider")]
    public VerificationProvider? Provider { get; init; }

    [JsonPropertyName("verification_level")]
    public VerificationLevel? VerificationLevel { get; init; }

    [JsonPropertyName("post_verification_action")]
    public PostVerificationAction? PostVerificationAction { get; init; }

    [JsonPropertyName("provider_config")]
    public string? ProviderConfig { get; init; }

    [JsonPropertyName("custom_webhook_url")]
    public string? CustomWebhookUrl { get; init; }

    [JsonPropertyName("custom_provider_name")]
    public string? CustomProviderName { get; init; }

    [JsonPropertyName("registration_message")]
    public string? RegistrationMessage { get; init; }

    [JsonPropertyName("invite_code")]
    public string? InviteCode { get; init; }

    [JsonPropertyName("max_invite_uses")]
    public int? MaxInviteUses { get; init; }
}

public record RejectRegistrationRequest
{
    [JsonPropertyName("reason")]
    public string? Reason { get; init; }
}

#endregion
