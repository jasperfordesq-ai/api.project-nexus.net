// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace Nexus.Api.Middleware;

/// <summary>
/// Global authorization filter that hard-blocks every endpoint except the
/// 2FA setup endpoints when the calling JWT carries `scope=2fa_setup`.
///
/// AuthController.Login issues this scope when an admin user without 2FA
/// authenticates. The user therefore lands on a short-lived token that
/// ONLY authorizes them to:
///   - GET  /api/auth/2fa/status
///   - POST /api/auth/2fa/setup
///   - POST /api/auth/2fa/verify-setup
///   - POST /api/auth/logout
///
/// Any other request returns 403 with `requires_2fa_setup: true` so the
/// frontend can route them back to the setup flow.
/// </summary>
public class TwoFactorSetupGate : IAsyncAuthorizationFilter
{
    public Task OnAuthorizationAsync(AuthorizationFilterContext context)
    {
        // Anonymous endpoints (login, register, forgot-password, contact,
        // webhooks, health) don't see this filter via a populated identity —
        // their User is null/anonymous, so the scope claim is absent.
        var scope = context.HttpContext.User?.FindFirst("scope")?.Value;
        if (scope != "2fa_setup")
        {
            return Task.CompletedTask;
        }

        var path = context.HttpContext.Request.Path.Value ?? string.Empty;
        // Allow-list: anything under /api/auth/2fa/ (setup flow itself) plus
        // logout (so the user can bail out) and refresh (so the access token
        // can be rolled).
        if (path.StartsWith("/api/auth/2fa/", StringComparison.OrdinalIgnoreCase) ||
            path.Equals("/api/auth/logout", StringComparison.OrdinalIgnoreCase) ||
            path.Equals("/api/auth/refresh", StringComparison.OrdinalIgnoreCase))
        {
            return Task.CompletedTask;
        }

        context.Result = new ObjectResult(new
        {
            error = "Two-factor authentication is required for administrator accounts. Please complete 2FA setup to continue.",
            error_code = "AUTH_2FA_SETUP_REQUIRED",
            requires_2fa_setup = true,
        })
        {
            StatusCode = StatusCodes.Status403Forbidden,
        };
        return Task.CompletedTask;
    }
}
